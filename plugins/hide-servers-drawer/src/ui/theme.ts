import { findByProps, findByStoreName } from "@vendetta/metro";
import { semanticColors } from "@vendetta/ui";

// Two separate color systems are in play here, same as ServerDrawer's ContextMenuModal.tsx
// had to deal with:
//   - a flat `colors` map (WHITE, brand/status colors, INTERACTIVE_*) that's already resolved
//     and theme-reactive to read directly.
//   - the newer per-theme "semantic color" system (surface/background/text/border tokens)
//     exported as raw descriptors via @vendetta/ui's `semanticColors`, which only turn into an
//     actual color through colorResolver.resolveSemanticColor(activeTheme, descriptor).
// BACKGROUND_TERTIARY and friends live in the second system. Reading them off the flat
// `colors` map the way the first version of this file did just misses (undefined) and falls
// through to the hardcoded fallback every time, which is why the bar's background wasn't
// following a custom theme -- it was never reading anything live to begin with.
const colorModule = findByProps("colors", "unsafe_rawColors");
const colors: Record<string, any> | undefined = colorModule?.colors;
const colorResolver = colorModule?.internal ?? colorModule?.meta;
const ThemeStore = findByStoreName("ThemeStore");

export function token(name: string, fallback: string): string {
    try {
        const descriptor = (semanticColors as any)?.[name];
        if (descriptor != null && typeof colorResolver?.resolveSemanticColor === "function") {
            const resolved = colorResolver.resolveSemanticColor(ThemeStore?.theme, descriptor);
            if (typeof resolved === "string") return resolved;
        }
    } catch { /* fall through to the flat map */ }

    try {
        const flat = colors?.[name];
        if (typeof flat === "string") return flat;
    } catch { /* fall through to the hardcoded fallback */ }

    return fallback;
}

// All names below are confirmed live against this build's actual semanticColors export
// (round 12's diagnostic dumped all 357 keys) -- the previous version guessed at older-era
// token names (BACKGROUND_TERTIARY, INTERACTIVE_NORMAL, TEXT_NORMAL, BRAND_500, ...) that
// don't exist in this build's redesigned color system at all, so every one of them was
// silently missing and falling straight through to the hardcoded fallback -- theme-following
// in name only. BACKGROUND_ACCENT and STATUS_DANGER turned out to already be correct.
//
// barBackground/separator don't have an exact "guild bar" surface/border token in the
// confirmed list (MOBILE_GUILDBAR_ICON_* exists but is icon-scoped, not the bar itself), so
// these two are still a best-effort structural guess (lowest elevation surface, subtle
// border) rather than a confirmed exact match -- worth another look if they're off.
export const barBackground = () => token("BACKGROUND_BASE_LOWEST", "#1e1f22");
export const separator = () => token("BORDER_SUBTLE", "#2b2d31");
export const selectedPill = () => token("WHITE", "#ffffff");
export const iconInactive = () => token("MOBILE_GUILDBAR_ICON_DEFAULT", "#949ba4");
export const iconActive = () => token("WHITE", "#ffffff");
export const mentionBadge = () => token("STATUS_DANGER", "#ed4245");
export const unreadDot = () => token("WHITE", "#ffffff");
export const folderTint = (color?: number | null) => {
    if (color == null) return token("BACKGROUND_BRAND", "#5865f2");
    return `#${(color >>> 0).toString(16).padStart(6, "0").slice(-6)}`;
};

// Only used by ContextMenu.tsx, the fallback path for when the native action sheet (see
// lib/guildMenu.ts) isn't available -- kept theme-aware for the same reason as everything
// else here, but expect it to be reached rarely.
export const sheetBackground = () => token("MOBILE_ACTIONSHEET_BACKGROUND", "#2b2d31");
export const sheetBackdrop = () => "rgba(0,0,0,0.55)"; // not a semantic token on any build seen so far
export const textMuted = () => token("TEXT_MUTED", "#949ba4");
export const textNormal = () => token("TEXT_DEFAULT", "#dbdee1");
export const dangerText = () => token("STATUS_DANGER", "#f23f42");
export const pressedOverlay = () => token("TABLEROW_BACKGROUND_PRESSED", "#35373c");
export const avatarFallback = () => token("BACKGROUND_ACCENT", "#4e5058");
