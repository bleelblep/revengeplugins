import patchGuildMenu from "./patches/guildMenu";

let unpatch: (() => void) | undefined;

export default {
    onLoad: () => {
        try {
            unpatch = patchGuildMenu();
        } catch (error) {
            console.error("[PurgeMyMessages] failed to apply guildMenu patch:", error);
        }
    },
    onUnload: () => {
        try { unpatch?.() } catch { /* already gone */ }
        unpatch = undefined;
    },
};
