import { findByProps, findByStoreName } from "@vendetta/metro";
import { React, ReactNative } from "@vendetta/metro/common";
import { subscribeDmChanges, unreadDmChannels } from "../../lib/dms";
import { store as sortedGuildStore } from "../../patches/sortedGuilds";
import { BAR_WIDTH } from "../layout";
import { barBackground, separator } from "../theme";
import DmIcon from "./DmIcon";
import FolderRow from "./FolderRow";
import GuildRow, { useSelectedGuildId } from "./GuildRow";
import UnreadDmRow from "./UnreadDmRow";

const { ScrollView, View, StatusBar, Platform } = ReactNative;

const ChannelActions = findByProps("selectPrivateChannel");
const SelectedChannelStore = findByStoreName("SelectedChannelStore");
const Haptic = findByProps("triggerHapticFeedback", "HapticFeedbackTypes");
const Routes = findByProps("ME");
const ME = Routes?.ME ?? "/channels/@me";
const SafeArea = findByProps("useSafeAreaInsets");

// Re-exported from ui/layout so the rows and the bar can't drift out of sync.
// Discord's own bottom tab bar ("You"/home/etc) is a separate fixed-height UI element, not
// part of the safe-area inset -- the inset only covers the gesture-nav pill below it. This bar
// renders as an overlay on top of that whole screen, so without reserving space for both, the
// last rows end up drawn underneath the tab bar instead of stopping above it.
const TAB_BAR_HEIGHT = 140;

// GuildsBar normally sits inside the app's own safe-area-aware scaffolding; replacing it
// wholesale drops that, so the DM button renders flush against the status bar instead of
// below it. Vendetta's SafeAreaView (@vendetta/ui/components) is RN core's version under the
// hood, which is iOS-only -- it's a no-op on Android -- so Android needs StatusBar.currentHeight
// added explicitly.
function topInset(): number {
    if (Platform.OS === "android") return StatusBar?.currentHeight ?? 24;
    return 0; // iOS: real inset is handled by the SafeAreaView wrapper below.
}

/** react-native-safe-area-context's hook, if this build bundles it; 0 if not. */
function useBottomSafeInset(): number {
    try {
        if (typeof SafeArea?.useSafeAreaInsets === "function") {
            const insets = SafeArea.useSafeAreaInsets();
            if (typeof insets?.bottom === "number") return insets.bottom;
        }
    } catch { /* ignore */ }
    return 0;
}

function useSelectedChannelId(): string | null {
    const [id, setId] = React.useState<string | null>(() => {
        try { return SelectedChannelStore?.getChannelId?.() ?? null } catch { return null }
    });

    React.useEffect(() => {
        if (!SelectedChannelStore?.addChangeListener) return;
        const onChange = () => {
            try { setId(SelectedChannelStore.getChannelId?.() ?? null) } catch { /* ignore */ }
        };
        SelectedChannelStore.addChangeListener(onChange);
        return () => SelectedChannelStore.removeChangeListener?.(onChange);
    }, []);

    return id;
}

/**
 * Open the DM list, the way stock's Home button does.
 *
 * The previous version called getLastSelectedChannelId() with no argument -- that returns the
 * *currently* selected channel, which is a guild channel whenever you're sitting in a server,
 * and handing a guild channel to selectPrivateChannel() dumped you on an unrelated screen.
 * Passing null instead clears the private-channel selection, which is what lands on the DM
 * list rather than any one conversation.
 */
function openDms() {
    Haptic?.triggerHapticFeedback?.(Haptic.HapticFeedbackTypes.SOFT);
    try {
        ChannelActions?.selectPrivateChannel?.(null);
    } catch { /* ignore */ }
}

/**
 * Non-virtualized stand-in for Discord's GuildsBar. It maps `getGuildsTree().root.children`
 * straight into plain rows -- SortedGuildStore.getGuildsTree is already patched (see
 * ../../patches/sortedGuilds) to drop hidden guilds, so there is nothing here for a hidden
 * id to leave a slot in. That absence is the fix: a FastList reserves geometry for every item
 * in its data array including ones that render null, a plain array map does not.
 */
export default function CustomGuildsBar() {
    const [, bump] = React.useReducer((n: number) => n + 1, 0);

    React.useEffect(() => {
        const store = sortedGuildStore();
        if (!store?.addChangeListener) return;
        const onChange = () => bump();
        store.addChangeListener(onChange);
        return () => store.removeChangeListener?.(onChange);
    }, []);

    const [, bumpDms] = React.useReducer((n: number) => n + 1, 0);
    React.useEffect(() => subscribeDmChanges(bumpDms), []);

    const selectedId = useSelectedGuildId();
    const selectedChannelId = useSelectedChannelId();
    const inDms = selectedId == null || selectedId === ME;
    const bottomPadding = TAB_BAR_HEIGHT + useBottomSafeInset();

    let children: any[] = [];
    try { children = sortedGuildStore()?.getGuildsTree?.()?.root?.children ?? [] } catch { /* ignore */ }

    const unread = unreadDmChannels();

    return <View style={{ width: BAR_WIDTH, backgroundColor: barBackground(), paddingTop: topInset() }}>
        <DmIcon selected={inDms} onPress={openDms} />

        {/* Rows are each a full BAR_WIDTH with their icon centred, so nothing needs to paint
            outside its own bounds and no overflow handling is required here. */}
        <ScrollView contentContainerStyle={{ alignItems: "center", paddingBottom: bottomPadding }} showsVerticalScrollIndicator={false}>
            {unread.map(dm =>
                <View key={dm.channelId} style={{ marginBottom: 10 }}>
                    <UnreadDmRow dm={dm} selected={dm.channelId === selectedChannelId} />
                </View>
            )}

            <View style={{ height: 2, width: 32, marginBottom: 10, backgroundColor: separator(), borderRadius: 1 }} />

            {children.map((node: any, index: number) => {
                if (!node) return null;
                // Never Math.random() here -- a fresh key each render makes React tear the
                // row down and rebuild it (reloading its image) on every re-render.
                const key = node.id ?? `node-${index}`;
                return <View key={key} style={{ marginBottom: 10 }}>
                    {node.type === "folder"
                        ? <FolderRow node={node} />
                        : node.id != null
                            ? <GuildRow id={String(node.id)} selected={String(node.id) === selectedId} />
                            : null}
                </View>;
            })}
        </ScrollView>
    </View>;
}
