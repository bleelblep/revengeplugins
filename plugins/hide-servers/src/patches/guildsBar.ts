import { findByTypeNameAll } from "@vendetta/metro";
import { instead } from "@vendetta/patcher";
import { guildIdOf } from "../lib/guildId";
import { instant, isEmpty, isHidden } from "../lib/hidden";

// Filtering SortedGuildStore provably works (88 -> 87 ids, even across a reload) but the
// rendered bar never changes, so GuildsBar builds its rows somewhere else. Patch the row
// component instead: a hidden server renders nothing.
//
// GuildsBar/GuildsBarGuild resolve only via findByTypeNameAll -- findByName and
// findByDisplayName both miss them.
//
// Known limitation: rendering null leaves the row in FastList's geometry, so the bar keeps a
// phantom slot and tapping a server can jump the scroll position. There is no way to remove
// the row itself -- GuildsBar takes a single `enableHome` prop and builds its rows internally
// from hooks, its helpers (getGuildBarNeighbors, getGuildsBarGuildAccessibilityActions) are
// local to that bundle module rather than exported, and overriding FastList's itemSize to
// collapse the row had no effect either.
export default function patchGuildsBar() {
    const patches: (() => void)[] = [];

    let rows: any[] = [];
    try {
        rows = findByTypeNameAll("GuildsBarGuild") ?? [];
    } catch {
        return () => {};
    }

    for (const row of rows) {
        if (!row) continue;

        try {
            // `instead`, not `after`: an after-callback returning null is treated as
            // "no change" and the original element renders anyway. instead replaces the
            // component function, so returning null really does render nothing.
            patches.push(instead("type", row, (args: any[], original: any) => {
                const props = args?.[0];

                if (isEmpty() || !instant()) return original.apply(row, args);

                const id = guildIdOf(props);
                if (!id || !isHidden(id)) return original.apply(row, args);

                return null;
            }));
        } catch { /* leave this row unpatched */ }
    }

    return () => patches.forEach(unpatch => { try { unpatch() } catch { /* already gone */ } });
}
