import { React, ReactNative } from "@vendetta/metro/common";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { RecentDm, dmUnreadState, mostRecentDm, subscribeDmChanges } from "../../lib/dms";
import { barBackground, iconActive, iconInactive, mentionBadge, selectedPill, unreadDot } from "../theme";

const { Pressable, View, Image, Text } = ReactNative;

const ChatIcon = getAssetIDByName("ChatIcon") ?? getAssetIDByName("ic_message");

const SIZE = 28;

function avatarUrl(recipient: RecentDm["recipientAvatar"]): string | undefined {
    if (!recipient?.avatar) return undefined;
    const ext = recipient.avatar.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${recipient.id}/${recipient.avatar}.${ext}?size=64`;
}

/**
 * Stock Discord's Home button shows the most recent DM conversation's avatar (with unread
 * state) rather than a static icon -- this replicates that instead of the plain chat bubble
 * the bar used before. Falls back to the chat bubble for group DMs (no single avatar to show)
 * or when there's no DM history at all.
 */
export default function DmIcon({ selected, onPress }: { selected: boolean; onPress: () => void }) {
    const [, bump] = React.useReducer((n: number) => n + 1, 0);
    React.useEffect(() => subscribeDmChanges(bump), []);

    const recent = mostRecentDm();
    const url = recent?.type === 1 ? avatarUrl(recent.recipientAvatar) : undefined;
    const { hasUnread, mentionCount } = recent ? dmUnreadState(recent.channelId) : { hasUnread: false, mentionCount: 0 };

    return <Pressable onPress={onPress} style={{ height: 48, alignItems: "center", justifyContent: "center" }}>
        {selected
            ? <View style={{ position: "absolute", left: 0, top: 14, width: 4, height: 20, borderRadius: 2, backgroundColor: selectedPill() }} />
            : null}

        {url
            ? <Image source={{ uri: url }} style={{ width: SIZE, height: SIZE, borderRadius: SIZE / 2 }} />
            : <Image source={ChatIcon} style={{ width: SIZE, height: SIZE, tintColor: selected ? iconActive() : iconInactive() }} />}

        {mentionCount > 0
            ? <View style={[st.pillOutline, { backgroundColor: barBackground() }]}>
                <View style={[st.pill, { backgroundColor: mentionBadge() }]}>
                    <Text style={st.pillText}>{mentionCount > 99 ? "99+" : String(mentionCount)}</Text>
                </View>
            </View>
            : hasUnread
                ? <View style={[st.dotOutline, { backgroundColor: barBackground() }]}>
                    <View style={[st.dot, { backgroundColor: unreadDot() }]} />
                </View>
                : null}
    </Pressable>;
}

const st = {
    pillOutline: {
        position: "absolute" as const, bottom: 4, right: 8,
        minWidth: 20, minHeight: 20, borderRadius: 10,
        alignItems: "center" as const, justifyContent: "center" as const,
    },
    pill: {
        minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4,
        alignItems: "center" as const, justifyContent: "center" as const,
    },
    pillText: { color: "#fff", fontSize: 9, fontWeight: "700" as const, lineHeight: 16 },
    dotOutline: {
        position: "absolute" as const, bottom: 6, right: 10,
        width: 12, height: 12, borderRadius: 6,
        alignItems: "center" as const, justifyContent: "center" as const,
    },
    dot: { width: 8, height: 8, borderRadius: 4 },
};
