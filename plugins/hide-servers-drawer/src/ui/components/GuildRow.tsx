import { findByProps, findByStoreName } from "@vendetta/metro";
import { React, ReactNative } from "@vendetta/metro/common";
import { showToast } from "@vendetta/ui/toasts";
import { setHidden } from "../../lib/hidden";
import { MenuItem, openNativeActionSheet, stockMenuItems } from "../../lib/guildMenu";
import { refresh as refreshSortedGuilds } from "../../patches/sortedGuilds";
import { selectedPill } from "../theme";
import Badge from "./Badge";
import ContextMenu from "./ContextMenu";
import GuildIcon from "./GuildIcon";

const { Pressable, View } = ReactNative;

const GuildStore = findByStoreName("GuildStore");
const Haptic = findByProps("triggerHapticFeedback", "HapticFeedbackTypes");
const Routing = findByProps("transitionToGuild");

const SIZE = 48;

export function useSelectedGuildId(): string | null {
    const [id, setId] = React.useState<string | null>(() => {
        try { return GuildStore?.getGuildId?.() ?? null } catch { return null }
    });

    React.useEffect(() => {
        if (!GuildStore?.addChangeListener) return;
        const onChange = () => {
            try { setId(GuildStore.getGuildId?.() ?? null) } catch { /* ignore */ }
        };
        GuildStore.addChangeListener(onChange);
        return () => GuildStore.removeChangeListener?.(onChange);
    }, []);

    return id;
}

export default function GuildRow({ id, selected, onNavigated }: {
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
        try { Routing?.transitionToGuild?.(id, null) } catch { /* ignore */ }
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

    if (!guild) return null;

    return <>
        <Pressable onPress={navigate} onLongPress={openMenu} delayLongPress={450}>
            <View style={{ width: SIZE, height: SIZE }}>
                {selected
                    ? <View style={{
                        position: "absolute", left: -12, top: SIZE / 2 - 10,
                        width: 4, height: 20, borderRadius: 2, backgroundColor: selectedPill(),
                    }} />
                    : null}
                <GuildIcon guild={guild} size={SIZE} radius={16} />
                <Badge guildId={id} />
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
