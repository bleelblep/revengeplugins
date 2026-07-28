import { findByProps } from "@vendetta/metro";
import { React, ReactNative } from "@vendetta/metro/common";
import { UnreadDm } from "../../lib/dms";
import { avatarFallback, barBackground, mentionBadge, unreadDot } from "../theme";

const { Pressable, View, Image, Text } = ReactNative;

const ChannelActions = findByProps("selectPrivateChannel");
const Haptic = findByProps("triggerHapticFeedback", "HapticFeedbackTypes");

const SIZE = 48;
const MINI = 16;

// Same layout FolderRow.tsx uses for its multi-guild collage cover.
const POS = [
    { top: 6, left: 6 }, { top: 6, right: 6 },
    { bottom: 6, left: 6 }, { bottom: 6, right: 6 },
];

function acronym(name: string): string {
    return String(name ?? "")
        .replace(/\w+/g, word => word[0] ?? "")
        .replace(/\s/g, "")
        .slice(0, 2)
        .toUpperCase();
}

function MiniAvatar({ member }: { member: { url?: string; username: string } }) {
    if (member.url) {
        return <Image source={{ uri: member.url }} style={{ width: MINI, height: MINI, borderRadius: MINI / 2 }} />;
    }
    return <View style={{
        width: MINI, height: MINI, borderRadius: MINI / 2,
        backgroundColor: avatarFallback(), alignItems: "center", justifyContent: "center",
    }}>
        <Text style={{ color: "#fff", fontSize: 8, fontWeight: "600" }}>{acronym(member.username)}</Text>
    </View>;
}

/** Same shape/size as GuildRow, one per unread DM/group-DM -- see lib/dms.ts. */
export default function UnreadDmRow({ dm }: { dm: UnreadDm }) {
    const navigate = React.useCallback(() => {
        Haptic?.triggerHapticFeedback?.(Haptic.HapticFeedbackTypes.SOFT);
        try { ChannelActions?.selectPrivateChannel?.(dm.channelId) } catch { /* ignore */ }
    }, [dm.channelId]);

    return <Pressable onPress={navigate}>
        <View style={{ width: SIZE, height: SIZE }}>
            {dm.avatarUrl
                ? <Image source={{ uri: dm.avatarUrl }} style={{ width: SIZE, height: SIZE, borderRadius: SIZE / 2 }} />
                : dm.memberAvatars?.length
                    ? <View style={{ width: SIZE, height: SIZE, borderRadius: SIZE / 2, overflow: "hidden", backgroundColor: avatarFallback() }}>
                        {dm.memberAvatars.map((member, i) =>
                            <View key={member.id} style={{ position: "absolute", ...POS[i] }}>
                                <MiniAvatar member={member} />
                            </View>
                        )}
                    </View>
                    : <View style={{
                        width: SIZE, height: SIZE, borderRadius: SIZE / 2,
                        backgroundColor: avatarFallback(), alignItems: "center", justifyContent: "center",
                    }}>
                        <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>{acronym(dm.name)}</Text>
                    </View>}

            {dm.mentionCount > 0
                ? <View style={[st.pillOutline, { backgroundColor: barBackground() }]}>
                    <View style={[st.pill, { backgroundColor: mentionBadge() }]}>
                        <Text style={st.pillText}>{dm.mentionCount > 99 ? "99+" : String(dm.mentionCount)}</Text>
                    </View>
                </View>
                : dm.hasUnread
                    ? <View style={[st.dotOutline, { backgroundColor: barBackground() }]}>
                        <View style={[st.dot, { backgroundColor: unreadDot() }]} />
                    </View>
                    : null}
        </View>
    </Pressable>;
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
