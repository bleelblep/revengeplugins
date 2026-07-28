import { find, findByStoreName } from "@vendetta/metro";
import { after } from "@vendetta/patcher";
import { cancelPurge, confirmAndPurge, isPurging } from "../ui/confirmAndPurge";

/**
 * Appends one item to the real per-guild long-press menu (getGuildsBarGuildMenuItems, same
 * lookup hide-servers-drawer uses) rather than building a custom menu -- the native menu
 * already renders wherever GuildsBarGuild's long-press opens it, native chrome included.
 */
export default function patchGuildMenu(): () => void {
    const mod = find((m: any) => m?.default?.name === "getGuildsBarGuildMenuItems");
    if (!mod?.default) return () => {};

    const GuildStore = findByStoreName("GuildStore");

    return after("default", mod, (args: any[], ret: any) => {
        const guildId = args?.[0];
        if (!guildId || !Array.isArray(ret)) return ret;

        let guildName = "this server";
        try { guildName = GuildStore?.getGuild?.(String(guildId))?.name ?? guildName } catch { /* ignore */ }

        const id = String(guildId);
        const item = isPurging(id)
            ? { label: "Cancel purge", action: () => cancelPurge(id) }
            // "destructive" matches the field name ServerDrawer's own menu-item handling
            // reads for red text (item.variant === "destructive"); this build's native
            // renderer wasn't independently confirmed to honor it, so if it doesn't show
            // red, that's the thing to re-probe.
            : { label: "Delete my messages", variant: "destructive", action: () => confirmAndPurge(id, guildName) };

        return [...ret, item];
    });
}
