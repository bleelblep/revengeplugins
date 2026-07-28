import { storage } from "@vendetta/plugin";

// Small, separate from hidden.ts on purpose -- these are display preferences, not part of
// what's hidden, and don't need the module-level Set/load()/persist() machinery hidden.ts
// uses to survive vendetta.plugin being unreliable on some clients (a single boolean flag
// doesn't have that problem: reading storage.staticIcons directly is safe either way).

export function staticIcons(): boolean {
    try {
        return !!storage.staticIcons;
    } catch {
        return false;
    }
}

export function setStaticIcons(value: boolean) {
    try { storage.staticIcons = value } catch { /* session-only, still works until restart */ }
}
