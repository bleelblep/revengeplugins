import { storage } from "@vendetta/plugin";
import patchRowManager from "./patches/rowManager";
import Settings from "./ui/pages/Settings";

let patches = [];

export default {
    onLoad: () => {
        // storage comes from vendetta.plugin, which isn't always populated on this
        // client -- don't let a missing default abort the whole load.
        try {
            storage.selected ??= "calendar"
            storage.customFormat ??= "dddd, MMMM Do YYYY, h:mm:ss a"
        } catch { /* no persisted storage */ }

        try {
            patches.push(patchRowManager())
        } catch (error) {
            console.error("[CustomTimestamps] failed to patch RowManager:", error)
        }
    },
    onUnload: () => {
        patches.forEach(p => { try { p?.() } catch { /* already gone */ } })
        patches = []
    },
    settings: Settings,
}
