import { findByProps, findByStoreName } from "@vendetta/metro";
import { React, ReactNative } from "@vendetta/metro/common";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { store as sortedGuildStore } from "../../patches/sortedGuilds";
import { barBackground, iconActive, iconInactive, selectedPill, separator } from "../theme";
import FolderRow from "./FolderRow";
import GuildRow, { useSelectedGuildId } from "./GuildRow";

const { ScrollView, View, Pressable, Image, StatusBar, Platform } = ReactNative;

const ChannelActions = findByProps("selectPrivateChannel");
const SelectedChannelStore = findByStoreName("SelectedChannelStore");
const Haptic = findByProps("triggerHapticFeedback", "HapticFeedbackTypes");
const Routes = findByProps("ME");
const ME = Routes?.ME ?? "/channels/@me";
const ChatIcon = getAssetIDByName("ChatIcon") ?? getAssetIDByName("ic_message");
const SafeArea = findByProps("useSafeAreaInsets");

const BAR_WIDTH = 72;
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

function openDms() {
    Haptic?.triggerHapticFeedback?.(Haptic.HapticFeedbackTypes.SOFT);
    try {
        const lastChannelId = SelectedChannelStore?.getLastSelectedChannelId?.();
        ChannelActions?.selectPrivateChannel?.(lastChannelId);
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

    const selectedId = useSelectedGuildId();
    const inDms = selectedId == null || selectedId === ME;
    const bottomPadding = TAB_BAR_HEIGHT + useBottomSafeInset();

    let children: any[] = [];
    try { children = sortedGuildStore()?.getGuildsTree?.()?.root?.children ?? [] } catch { /* ignore */ }

    return <View style={{ width: BAR_WIDTH, backgroundColor: barBackground(), paddingTop: topInset() }}>
        <Pressable onPress={openDms} style={{ height: 48, alignItems: "center", justifyContent: "center" }}>
            {inDms
                ? <View style={{ position: "absolute", left: 0, top: 14, width: 4, height: 20, borderRadius: 2, backgroundColor: selectedPill() }} />
                : null}
            <Image source={ChatIcon} style={{ width: 28, height: 28, tintColor: inDms ? iconActive() : iconInactive() }} />
        </Pressable>

        <View style={{ height: 2, marginHorizontal: 16, marginVertical: 8, backgroundColor: separator(), borderRadius: 1 }} />

        <ScrollView contentContainerStyle={{ alignItems: "center", paddingBottom: bottomPadding }} showsVerticalScrollIndicator={false}>
            {children.map((node: any) => {
                if (!node) return null;
                const key = node.id ?? Math.random();
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
