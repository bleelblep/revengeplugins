import { findByProps, findByStoreName } from "@vendetta/metro";
import { React, ReactNative } from "@vendetta/metro/common";
import { showToast } from "@vendetta/ui/toasts";
import { setHidden } from "../../lib/hidden";
import { MenuItem, openNativeActionSheet, stockMenuItems } from "../../lib/guildMenu";
import { refresh as refreshSortedGuilds } from "../../patches/sortedGuilds";
import { BAR_WIDTH, ICON_SIZE } from "../layout";
import { useGuildIndicator } from "../useGuildIndicator";
import Badge from "./Badge";
import ContextMenu from "./ContextMenu";
import GuildIcon from "./GuildIcon";
import MorphIcon from "./MorphIcon";
import Pill from "./Pill";

const { Pressable, View } = ReactNative;

const GuildStore = findByStoreName("GuildStore");
// The *selected* guild id lives on SelectedGuildStore, not GuildStore -- GuildStore only
// holds guild data (getGuild/getGuilds). An earlier version called GuildStore.getGuildId(),
// which simply doesn't exist there, so the hook always returned null: no server ever counted
// as selected (no pill, no shape morph), and the DM button's `selectedId == null` check made
// it look permanently selected instead.
const SelectedGuildStore = findByStoreName("SelectedGuildStore");
const SelectedChannelStore = findByStoreName("SelectedChannelStore");
const Haptic = findByProps("triggerHapticFeedback", "HapticFeedbackTypes");
const Routing = findByProps("transitionToGuild");

const SIZE = ICON_SIZE;

/** Prefer SelectedGuildStore; fall back to GuildStore in case a build exposes it there. */
function readSelectedGuildId(): string | null {
    for (const store of [SelectedGuildStore, GuildStore]) {
        try {
            const value = store?.getGuildId?.();
            if (value != null) return String(value);
        } catch { /* try the next store */ }
    }
    return null;
}

/**
 * Deliberately reads the store fresh on every render rather than caching the id in state.
 *
 * Caching it meant the value only ever refreshed when SelectedGuildStore/GuildStore fired a
 * change event -- so if the selected-guild store doesn't emit on a plain guild switch (or
 * didn't resolve at all), the id went stale and the previously-selected row kept rendering
 * its pill forever. The subscriptions below now only exist to *trigger* a re-render; the
 * value itself always comes from a live read, so a missed event can at worst delay the
 * update to the next render, never leave it permanently wrong.
 *
 * SelectedChannelStore is in the subscription list because selecting a guild always changes
 * the selected channel too -- it's the one store guaranteed to emit on every switch.
 */
export function useSelectedGuildId(): string | null {
    const [, bump] = React.useReducer((n: number) => n + 1, 0);

    React.useEffect(() => {
        const stores = [SelectedGuildStore, GuildStore, SelectedChannelStore]
            .filter(s => s?.addChangeListener);
        if (!stores.length) return;

        const onChange = () => bump();
        stores.forEach(s => s.addChangeListener(onChange));
        return () => stores.forEach(s => s.removeChangeListener?.(onChange));
    }, []);

    return readSelectedGuildId();
}

/**
 * Memoised: the bar re-renders on every ChannelStore/ReadStateStore emit (which fire
 * constantly while navigating in and out of DMs), and without this every guild row rebuilt
 * and reloaded its icon each time -- visible as a flash across the bar on DM<->server
 * switches. Rows still update themselves on their own state, since useGuildIndicator
 * subscribes internally.
 */
function GuildRow({ id, selected, onNavigated }: {
    id: string;
    selected: boolean;
    onNavigated?: () => void;
}) {
    const [menuOpen, setMenuOpen] = React.useState(false);

    const guild = React.useMemo(() => {
        try { return GuildStore?.getGuild?.(id) } catch { return undefined }
    }, [id]);

    const navigate = React.useCallback(() => {
        Haptic?.triggerHapticFeedback?.(Haptic.HapticFeedbackTypes.SOFT);
        // Deliberately no second argument: passing null explicitly selects *no* channel, so
        // the chat area renders empty for a frame before Discord resolves the guild's
        // remembered/default channel -- visible as a flash on every switch. Omitting it lets
        // Discord pick the destination itself, the way tapping a stock guild icon does.
        try { Routing?.transitionToGuild?.(id) } catch { /* ignore */ }
        onNavigated?.();
    }, [id, onNavigated]);

    // The stock long-press menu, plus one addition of our own: everything else in this list
    // came from getGuildsBarGuildMenuItems(id), the same function GuildsBarGuild itself uses.
    const items: MenuItem[] = React.useMemo(() => [
        ...stockMenuItems(id),
        {
            label: "Hide server", danger: true, action: () => {
                setHidden(id, true);
                refreshSortedGuilds();
                showToast(`Hid ${guild?.name ?? "server"}`);
            },
        },
    ], [id, guild?.name]);

    const openMenu = React.useCallback(() => {
        Haptic?.triggerHapticFeedback?.(Haptic.HapticFeedbackTypes.IMPACT_MEDIUM);
        // Prefer Discord's own action sheet -- identical chrome, no reimplementation to keep
        // in sync. Only fall back to the custom modal if that call isn't available/throws.
        if (!openNativeActionSheet(guild?.name ?? "Server", items)) setMenuOpen(true);
    }, [guild?.name, items]);

    // Same source as Badge's own corner badge, so the pill and badge never disagree (e.g. a
    // muted guild suppresses both, not just one).
    const { mentionCount, showDot } = useGuildIndicator(id);
    const hasActivity = mentionCount > 0 || showDot;

    if (!guild) return null;

    return <>
        <Pressable onPress={navigate} onLongPress={openMenu} delayLongPress={450}>
            {/* Full bar-width row with the icon centred, so the left-edge pill can live at
                left: 0 inside it rather than painting outside its parent -- see ui/layout.ts. */}
            <View style={{ width: BAR_WIDTH, height: SIZE, alignItems: "center", justifyContent: "center" }}>
                <Pill rowHeight={SIZE} selected={selected} />
                <View style={{ width: SIZE, height: SIZE }}>
                    {/* radius 0 on the icon itself: MorphIcon clips it to the animated shape. */}
                    <MorphIcon size={SIZE} selected={selected}>
                        <GuildIcon guild={guild} size={SIZE} radius={0} />
                    </MorphIcon>
                    {/* Sibling, not a child -- MorphIcon clips its children, which would cut
                        the badge off at the icon's edge. */}
                    <Badge guildId={id} />
                </View>
            </View>
        </Pressable>
        <ContextMenu
            visible={menuOpen}
            title={guild.name ?? "Server"}
            items={items}
            onClose={() => setMenuOpen(false)}
        />
    </>;
}

export default React.memo(GuildRow);
