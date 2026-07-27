import { storage } from "@vendetta/plugin";
import patchChat from "./patches/chat";
import patchDetails from "./patches/details";
import patchName from "./patches/name";
import patchTag from "./patches/tag";
import Settings from "./ui/pages/Settings";

let patches = [];

// Apply each surface independently. Previously one bad patch threw straight out of
// onLoad, which the client reports as "plugin failed to start" -- so a single moved
// Discord module made the entire plugin impossible to enable.
const apply = (name: string, patch: () => () => void) => {
    try {
        patches.push(patch())
    } catch (error) {
        console.error(`[StaffTags] failed to apply ${name} patch:`, error)
    }
}

export default {
    onLoad: () => {
        // storage comes from vendetta.plugin, which isn't always populated on this
        // client -- don't let a missing default abort the whole load.
        try { storage.useRoleColor ??= false } catch { /* no persisted storage */ }
        apply("chat", patchChat)
        apply("tag", patchTag)
        apply("name", patchName)
        apply("details", patchDetails)
    },
    onUnload: () => {
        patches.forEach(unpatch => { try { unpatch?.() } catch { /* already gone */ } })
        patches = []
    },
    settings: Settings
}
