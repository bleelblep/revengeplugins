import patchGuildsBar from "./patches/guildsBar";
import patchSortedGuilds, { refresh } from "./patches/sortedGuilds";
import Settings from "./ui/pages/Settings";

let patches: (() => void)[] = [];

const apply = (name: string, patch: () => () => void) => {
    try {
        patches.push(patch());
    } catch (error) {
        console.error(`[HideServersV2] failed to apply ${name}:`, error);
    }
};

export default {
    onLoad: () => {
        // Two layers: the store filter keeps derived data consistent, and the GuildsBar
        // swap is what actually removes the icon from the bar.
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
