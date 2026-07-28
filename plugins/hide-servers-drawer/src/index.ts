import { patchCreateElement } from "./patches/createElementIntercept";
import patchGuildsBar from "./patches/guildsBar";
import patchSortedGuilds, { refresh } from "./patches/sortedGuilds";
import Settings from "./ui/pages/Settings";

let patches: (() => void)[] = [];

const apply = (name: string, patch: () => () => void) => {
    try {
        patches.push(patch());
    } catch (error) {
        console.error(`[HideServersDrawer] failed to apply ${name}:`, error);
    }
};

export default {
    onLoad: () => {
        // Order doesn't matter for correctness (registerIntercept just writes to a map that
        // the patched React.createElement reads lazily), but enabling the intercept mechanism
        // before anything registers against it keeps the sequence readable.
        try { patchCreateElement(patches) } catch (error) { console.error("[HideServersDrawer] failed to apply createElement intercept:", error) }

        // Two layers: the store filter keeps derived data consistent (used by the custom bar
        // and by anything else that reads SortedGuildStore), and the guildsBar patch is what
        // actually swaps in the non-virtualized bar when something is hidden.
        apply("sortedGuilds", patchSortedGuilds);
        apply("guildsBar", patchGuildsBar);
        refresh();
    },
    onUnload: () => {
        patches.forEach(unpatch => { try { unpatch?.() } catch { /* already gone */ } });
        patches = [];
        refresh();
    },
    settings: Settings,
};
