import { React } from "@vendetta/metro/common";
import { showConfirmationAlert } from "@vendetta/ui/alerts";
import { showToast } from "@vendetta/ui/toasts";
import { FoundMessage, currentUserId, describeError } from "../lib/api";
import { CancelToken, DeleteState, searchAllMyMessages, startDelete } from "../lib/purge";
import ProgressContent from "./ProgressContent";
import { setProgress } from "./progressStore";

/** Cancel callback for whatever phase (search or delete) is currently running per guild. */
const active = new Map<string, () => void>();

export function isPurging(guildId: string): boolean {
    return active.has(guildId);
}

export function cancelPurge(guildId: string) {
    active.get(guildId)?.();
    showToast("Cancelling...");
}

const PREVIEW_LIMIT = 25;

/**
 * showConfirmationAlert, not showInputAlert/showCustomAlert -- on this Discord build,
 * showConfirmationAlert renders fine but showInputAlert crashes (Revenge's own Alert wrapper
 * fails to resolve for it specifically). Its `content` prop takes any JSX, though, so the
 * "searching"/"deleting" steps pass a small live-updating spinner component (ProgressContent)
 * instead of static text -- same confirmed-working primitive, no custom modal/mount point
 * needed. There's no API to close an alert from code once shown, so each async step just
 * fires the next showConfirmationAlert when it's ready rather than trying to replace the
 * current one in place.
 */
export function confirmAndPurge(guildId: string, guildName: string) {
    const authorId = currentUserId();
    if (!authorId) {
        showToast("Could not determine your user id -- aborting.");
        return;
    }

    if (active.has(guildId)) {
        showToast("A purge is already running here.");
        return;
    }

    showConfirmationAlert({
        title: `Search your messages in "${guildName}"?`,
        content: "This only searches for now -- nothing is deleted yet. You'll see a preview and a separate confirmation before anything is removed.",
        confirmText: "Search",
        cancelText: "Cancel",
        onConfirm: () => runSearch(guildId, guildName, authorId),
    });
}

function runSearch(guildId: string, guildName: string, authorId: string) {
    const token: CancelToken = { cancelled: false };
    active.set(guildId, () => { token.cancelled = true });

    setProgress({ label: `Searching "${guildName}"...` });
    showConfirmationAlert({
        title: "Searching",
        content: React.createElement(ProgressContent),
        confirmText: "Cancel search",
        onConfirm: () => { token.cancelled = true },
    });

    searchAllMyMessages(
        guildId,
        authorId,
        found => setProgress({ label: `Searching "${guildName}"... ${found} found so far` }),
        token,
    )
        .then(messages => {
            active.delete(guildId);
            if (token.cancelled) return;
            showPreview(guildId, guildName, messages);
        })
        .catch(error => {
            active.delete(guildId);
            showConfirmationAlert({
                title: "Search failed",
                content: describeError(error),
                confirmText: "OK",
            });
        });
}

function showPreview(guildId: string, guildName: string, messages: FoundMessage[]) {
    if (messages.length === 0) {
        showConfirmationAlert({
            title: "Nothing found",
            content: `No messages from you found in "${guildName}".`,
            confirmText: "OK",
        });
        return;
    }

    const shown = messages.slice(0, PREVIEW_LIMIT);
    const remainder = messages.length - shown.length;
    const lines = shown.map(m => `• ${m.preview}`);
    if (remainder > 0) lines.push(`...and ${remainder} more`);

    showConfirmationAlert({
        title: `Found ${messages.length} message${messages.length === 1 ? "" : "s"}`,
        content: lines,
        confirmText: `Delete ${messages.length === 1 ? "it" : "all"}`,
        confirmColor: "red" as any,
        cancelText: "Cancel",
        onConfirm: () => confirmDelete(guildId, guildName, messages),
    });
}

function confirmDelete(guildId: string, guildName: string, messages: FoundMessage[]) {
    showConfirmationAlert({
        title: "Are you sure?",
        content: `This permanently deletes ${messages.length} message${messages.length === 1 ? "" : "s"} in "${guildName}". This is the last confirmation.`,
        confirmText: `Delete ${messages.length}`,
        confirmColor: "red" as any,
        cancelText: "Cancel",
        onConfirm: () => runDelete(guildId, guildName, messages),
    });
}

function runDelete(guildId: string, guildName: string, messages: FoundMessage[]) {
    setProgress({ label: `Deleting in "${guildName}"... 0/${messages.length}` });
    showConfirmationAlert({
        title: "Deleting",
        content: React.createElement(ProgressContent),
        confirmText: "Cancel",
        onConfirm: () => handle.cancel(),
    });

    const handle = startDelete(messages, (state: DeleteState) => {
        if (state.status === "deleting") {
            setProgress({ label: `Deleting in "${guildName}"... ${state.deleted}/${state.total}${state.failed ? ` (${state.failed} failed)` : ""}` });
            return;
        }

        active.delete(guildId);
        showConfirmationAlert({
            title: state.status === "done" ? "Done" : "Cancelled",
            content: state.status === "done"
                ? `Deleted ${state.deleted} of ${state.total} in "${guildName}"${state.failed ? `, ${state.failed} failed` : ""}.`
                : `Cancelled after deleting ${state.deleted} of ${state.total} in "${guildName}".`,
            confirmText: "OK",
        });
    });

    active.set(guildId, () => handle.cancel());
}
