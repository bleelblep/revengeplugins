// Minimal pub-sub feeding ProgressContent.tsx, which is passed as JSX into
// showConfirmationAlert's `content` prop (see confirmAndPurge.ts). That's the whole trick:
// showConfirmationAlert itself is confirmed to render on this build, and content can be any
// JSX element, so a small reactive component living inside it updates live without needing
// any of the custom-mount machinery that crashed before.

export interface ProgressInfo {
    label: string;
    found?: number;
    total?: number;
    done?: number;
    failed?: number;
}

let current: ProgressInfo = { label: "" };
const listeners = new Set<(p: ProgressInfo) => void>();

export function setProgress(info: ProgressInfo) {
    current = info;
    listeners.forEach(fn => fn(current));
}

export function getProgress(): ProgressInfo {
    return current;
}

export function subscribeProgress(fn: (p: ProgressInfo) => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
}
