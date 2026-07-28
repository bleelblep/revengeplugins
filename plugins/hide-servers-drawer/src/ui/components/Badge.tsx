import { findByStoreName } from "@vendetta/metro";
import { React, ReactNative } from "@vendetta/metro/common";
import { guildNotificationState, settingsStore } from "../../lib/notifications";
import { barBackground, mentionBadge, unreadDot } from "../theme";

const { View, Text } = ReactNative;

const GuildReadStateStore = findByStoreName("GuildReadStateStore");

/**
 * Mention-count pill, or a plain unread dot when there are no mentions -- but only ever what
 * the guild's own notification setting allows: a fully-muted or "only @mentions" guild never
 * shows the plain dot for ordinary unread messages, and "nothing" suppresses the badge
 * entirely, mentions included. Mirrors Discord's own server-icon badge rules, not just the
 * raw read-state flags (which don't know about mute/notification level on their own).
 */
export default function Badge({ guildId }: { guildId: string }) {
    const [, bump] = React.useReducer((n: number) => n + 1, 0);

    React.useEffect(() => {
        const stores = [GuildReadStateStore, settingsStore()].filter(s => s?.addChangeListener);
        if (!stores.length) return;
        const onChange = () => bump();
        stores.forEach(s => s.addChangeListener(onChange));
        return () => stores.forEach(s => s.removeChangeListener?.(onChange));
    }, []);

    let mentionCount = 0;
    let hasUnread = false;
    try { mentionCount = GuildReadStateStore?.getMentionCount?.(guildId) ?? 0 } catch { /* ignore */ }
    try { hasUnread = GuildReadStateStore?.hasUnread?.(guildId) ?? false } catch { /* ignore */ }

    const { muted, onlyMentions, suppressed } = guildNotificationState(guildId);

    // Resolved per render, not module-level -- the user can switch themes without reloading.
    const outlineColor = barBackground();

    if (suppressed) return null;

    if (mentionCount > 0) {
        return <View style={[st.pillOutline, { backgroundColor: outlineColor }]}>
            <View style={[st.pill, { backgroundColor: mentionBadge() }]}>
                <Text style={st.pillText}>{mentionCount > 99 ? "99+" : String(mentionCount)}</Text>
            </View>
        </View>;
    }

    if (hasUnread && !muted && !onlyMentions) {
        return <View style={[st.dotOutline, { backgroundColor: outlineColor }]}>
            <View style={[st.dot, { backgroundColor: unreadDot() }]} />
        </View>;
    }

    return null;
}

const st = {
    pillOutline: {
        position: "absolute" as const, bottom: -3, right: -3,
        minWidth: 23, minHeight: 23, borderRadius: 12,
        alignItems: "center" as const, justifyContent: "center" as const,
    },
    pill: {
        minWidth: 19, height: 19, borderRadius: 9, paddingHorizontal: 5,
        alignItems: "center" as const, justifyContent: "center" as const,
    },
    pillText: { color: "#fff", fontSize: 10, fontWeight: "700" as const, lineHeight: 19 },
    dotOutline: {
        position: "absolute" as const, bottom: -2, right: -2,
        width: 14, height: 14, borderRadius: 7,
        alignItems: "center" as const, justifyContent: "center" as const,
    },
    dot: { width: 10, height: 10, borderRadius: 5 },
};
