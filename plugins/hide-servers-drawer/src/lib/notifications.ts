import { findByStoreName } from "@vendetta/metro";

const UserGuildSettingsStore = findByStoreName("UserGuildSettingsStore");

/** Exposed so callers can subscribe to mute/notification-level changes and re-render. */
export function settingsStore() {
    return UserGuildSettingsStore;
}

// Discord's per-guild message_notifications level (stable across the client and the gateway
// USER_GUILD_SETTINGS payload): 0 = all messages, 1 = only @mentions, 2 = nothing, 3 = inherit
// the account default. Not exposed as a typed enum anywhere reachable from here, so the
// numbers are inlined.
const ONLY_MENTIONS = 1;
const NO_MESSAGES = 2;

export interface GuildNotificationState {
    /** Guild-wide mute, independent of the message_notifications level. */
    muted: boolean;
    /** message_notifications === ONLY_MENTIONS. */
    onlyMentions: boolean;
    /** message_notifications === NO_MESSAGES: nothing should show, mentions included. */
    suppressed: boolean;
}

const DEFAULT_STATE: GuildNotificationState = { muted: false, onlyMentions: false, suppressed: false };

/**
 * Best-effort: the store is queried through several possible accessors because only
 * `isMuted` is a name this codebase can confirm without a live client to probe (the devtools
 * eval bridge wasn't reachable while writing this). Any lookup that throws or comes back
 * undefined falls through to "notifications are unrestricted" rather than hiding badges the
 * user didn't ask to hide.
 */
export function guildNotificationState(guildId: string): GuildNotificationState {
    if (!UserGuildSettingsStore) return DEFAULT_STATE;

    let muted = false;
    try { muted = !!UserGuildSettingsStore.isMuted?.(guildId) } catch { /* ignore */ }

    let level: number | undefined;
    try {
        if (typeof UserGuildSettingsStore.getMessageNotifications === "function") {
            level = UserGuildSettingsStore.getMessageNotifications(guildId);
        } else {
            const settings =
                UserGuildSettingsStore.getUserGuildSettings?.(guildId) ??
                UserGuildSettingsStore.getSettingsForGuild?.(guildId) ??
                UserGuildSettingsStore.getGuildSettings?.(guildId);
            level = settings?.message_notifications ?? settings?.messageNotifications;
        }
    } catch { /* ignore */ }

    return {
        muted,
        onlyMentions: level === ONLY_MENTIONS,
        suppressed: level === NO_MESSAGES,
    };
}
