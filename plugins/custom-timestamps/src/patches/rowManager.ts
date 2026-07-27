import { findByName } from "@vendetta/metro";
import { moment } from "@vendetta/metro/common";
import { after, before } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import renderTimestamp from "../lib/renderTimestamp";

const RowManager = findByName("RowManager")

// This runs inside RowManager.generate, i.e. on the chat render path. Anything that
// escapes here crashes the entire ChatView, so the whole body is guarded.
const patchRowManagerBefore = () => before("generate", RowManager.prototype, ([row]) => {
    try {
        if (row?.rowType === 1) {
            if (storage?.separateMessages) row.isFirst = true
            if (row.message?.timestamp) {
                row.message.__customTimestamp = renderTimestamp(row.message.timestamp)
            }
        } else if (row?.rowType === "day" && typeof row.text === "string") {
            row.text = renderTimestamp(moment(row.text, "LL"))
        }
    } catch (error) {
        console.error("[CustomTimestamps] generate hook failed:", error)
    }
})

const patchRowManagerAfter = () => after("generate", RowManager.prototype, ([row], ret) => {
    try {
        if (row?.rowType !== 1) return

        const message = ret?.message
        if (message &&
            row.message?.__customTimestamp &&
            message.state === "SENT" &&
            message.timestamp) message.timestamp = row.message.__customTimestamp
    } catch (error) {
        console.error("[CustomTimestamps] generate return hook failed:", error)
    }
})

export default function patchRowManager() {
    const patches = new Array<Function>;

    // Patching a prototype that didn't resolve throws out of onLoad, which the client
    // reports as a plugin that won't start.
    if (!RowManager?.prototype?.generate) {
        console.error("[CustomTimestamps] RowManager.prototype.generate not found")
        return () => {}
    }

    patches.push(patchRowManagerBefore())
    patches.push(patchRowManagerAfter())

    return () => patches.forEach(p => p());
}
