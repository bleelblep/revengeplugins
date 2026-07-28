import { findByTypeNameAll } from "@vendetta/metro";
import { instead } from "@vendetta/patcher";
import { React } from "@vendetta/metro/common";
import { instant, isEmpty } from "../lib/hidden";
import CustomGuildsBar from "../ui/components/CustomGuildsBar";
import { registerIntercept, unregisterIntercept } from "./createElementIntercept";

// Nulling individual GuildsBarGuild rows (the original approach in ../../hide-servers) leaves
// the row in FastList's virtualized geometry -- the bar keeps a phantom slot and tapping a
// server jumps the scroll position, because FastList still reserves layout for every entry
// in its data array, blank or not. There is no prop or override that removes an item from
// that geometry short of it never being in the array FastList sees.
//
// So this patches the bar itself, not its rows: when anything is hidden, swap GuildsBar for a
// plain, non-virtualized render (see ui/components/CustomGuildsBar) built from
// SortedGuildStore.getGuildsTree(), which patches/sortedGuilds.ts already filters. A hidden
// guild is simply absent from that array -- nothing reserves a slot for it, so there is no
// gap and no scroll jump. When nothing is hidden, the real GuildsBar renders untouched.
//
// GuildsBar resolves the same way GuildsBarGuild does: findByTypeNameAll locates it by
// matching the inner function's name wherever it's embedded (e.g. inside a memo wrapper),
// which is why findByName/findByDisplayName miss it (documented in the original plugin).
export default function patchGuildsBar(): () => void {
    const patches: (() => void)[] = [];

    let bars: any[] = [];
    try {
        bars = findByTypeNameAll("GuildsBar") ?? [];
    } catch {
        return () => {};
    }

    for (const bar of bars) {
        if (!bar) continue;

        const original = bar.type;

        try {
            patches.push(instead("type", bar, (args: any[], callOriginal: any) => {
                if (isEmpty() || !instant()) return callOriginal.apply(bar, args);
                return React.createElement(CustomGuildsBar, null);
            }));
        } catch {
            continue;
        }

        // Belt-and-suspenders: if a closure captured `original` before this patch applied and
        // constructs it directly via React.createElement, catch it there too. See
        // createElementIntercept.ts for why `instead` alone isn't guaranteed to cover that.
        if (typeof original === "function") {
            try {
                const fallback = (props: any) =>
                    (isEmpty() || !instant())
                        ? React.createElement(original, props)
                        : React.createElement(CustomGuildsBar, null);

                registerIntercept(original, fallback);
                patches.push(() => unregisterIntercept(original));
            } catch { /* the instead() patch above still covers the common path */ }
        }
    }

    return () => patches.forEach(unpatch => { try { unpatch() } catch { /* already gone */ } });
}
