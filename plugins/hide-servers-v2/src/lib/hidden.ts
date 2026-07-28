import { storage } from "@vendetta/plugin";

// A module-level Set is the source of truth. Storage is only a persistence mirror:
// vendetta.plugin isn't reliably populated on every client, and mutating a nested object
// inside the storage proxy doesn't reliably notify useProxy -- which left the settings
// switches snapping back to off because nothing re-rendered.
const ids = new Set<string>();
let loaded = false;

function load() {
    if (loaded) return;
    loaded = true;

    try {
        const saved = storage.hidden;
        if (saved && typeof saved === "object") {
            for (const id of Object.keys(saved)) ids.add(id);
        }
    } catch { /* no persisted storage on this client */ }
}

function persist() {
    try {
        // Assign a whole new object rather than mutating in place -- a top-level set is
        // what the storage proxy actually watches.
        const out: Record<string, true> = {};
        for (const id of ids) out[id] = true;
        storage.hidden = out;
    } catch { /* session-only, still works until restart */ }
}

export function isHidden(guildId: string): boolean {
    load();
    return ids.has(guildId);
}

/**
 * Suppress hidden servers in the bar by blanking the row component.
 *
 * On by default, because it is the only thing that actually hides anything -- filtering
 * SortedGuildStore has no effect on the bar even after a reload. The cost is that the row
 * stays in FastList's geometry, leaving a gap and jumping the scroll position when a server
 * is tapped. Turn it off to get an untouched bar and no hiding.
 */
export function instant(): boolean {
    try {
        storage.instant ??= true;
        return !!storage.instant;
    } catch {
        return true;
    }
}

export function setInstant(value: boolean) {
    try { storage.instant = value } catch { /* session default stays */ }
}

export function hiddenIds(): string[] {
    load();
    return [...ids];
}

export function setHidden(guildId: string, hidden: boolean) {
    load();
    if (hidden) ids.add(guildId);
    else ids.delete(guildId);
    persist();
}

export function clearHidden() {
    load();
    ids.clear();
    persist();
}

/** True when nothing is hidden, so the patches can skip work entirely. */
export function isEmpty(): boolean {
    load();
    return ids.size === 0;
}
