import { find, findByProps } from "@vendetta/metro";

// Confirmed live against this build (see plugins/_diag, round 11): getGuildsBarGuildMenuItems
// is a default export findable only by its inner function name (findByName/findByDisplayName
// miss it, same story as GuildsBar/GuildsBarGuild), takes a guildId, and returns the real
// stock long-press menu -- on this build just Mark As Read / Notifications / More Options,
// each shaped { IconComponent, label, action }.
let menuItemsFn: ((guildId: string) => any[]) | undefined;

function resolveMenuItemsFn() {
    if (menuItemsFn !== undefined) return menuItemsFn;
    try {
        menuItemsFn = find((m: any) => m?.default?.name === "getGuildsBarGuildMenuItems")?.default;
    } catch {
        menuItemsFn = undefined;
    }
    return menuItemsFn;
}

// Also confirmed live: showSimpleActionSheet exists (arity 1). Its exact payload shape
// wasn't verified by a live call, only its presence -- this is the field this codebase's own
// diagnostic history flags as the fragile kind of guess (see the original guildsBar.ts's
// "old plugin's fragile lookups" section). If it renders wrong, that's the thing to re-probe.
const showSimpleActionSheet = findByProps("showSimpleActionSheet")?.showSimpleActionSheet;

export interface MenuItem {
    label: string;
    danger?: boolean;
    action: () => void;
}

/** Real per-guild stock menu items. Empty array if the lookup fails on this build. */
export function stockMenuItems(guildId: string): MenuItem[] {
    const fn = resolveMenuItemsFn();
    if (!fn) return [];

    try {
        const raw = fn(guildId) ?? [];
        if (!Array.isArray(raw)) return [];

        return raw
            .filter((item: any) => item && typeof item.action === "function" && item.label)
            .map((item: any) => ({
                label: String(item.label),
                // Real stock items never carry this, but third-party plugins that also
                // append to this same shared array (e.g. purge-my-messages) might mark
                // their own item destructive -- preserve it instead of silently dropping
                // it, or their "danger" styling never survives the trip through here.
                danger: !!(item.danger || item.variant === "destructive" || item.isDestructive),
                action: () => item.action(),
            }));
    } catch {
        return [];
    }
}

/**
 * Try Discord's own action sheet for pixel-identical chrome (colors, animation, safe-area,
 * theme -- all native, custom JSON themes included, since it's the same component the app
 * uses everywhere else). Returns true only if the call completed without throwing; there is
 * no signal available here for "opened but rendered wrong", so a bad guess at the payload
 * shape needs to be caught by eye, not by this return value.
 */
export function openNativeActionSheet(title: string, items: MenuItem[]): boolean {
    if (typeof showSimpleActionSheet !== "function" || !items.length) return false;

    try {
        showSimpleActionSheet({
            key: "HideServersDrawerGuildMenu",
            header: { title },
            options: items.map(item => ({
                label: item.label,
                isDestructive: !!item.danger,
                onPress: item.action,
            })),
        });
        return true;
    } catch {
        return false;
    }
}
