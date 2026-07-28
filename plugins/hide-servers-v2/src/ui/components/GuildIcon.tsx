import { ReactNative } from "@vendetta/metro/common";

const { Image, Text, View } = ReactNative;

const SIZE = 36;

/** Discord's fallback for a server with no icon: first letter of each word. */
function acronym(name: string): string {
    return String(name ?? "")
        .replace(/'s /g, " ")
        .replace(/\w+/g, word => word[0] ?? "")
        .replace(/\s/g, "")
        .slice(0, 3)
        .toUpperCase();
}

function iconUrl(guild: any): string | undefined {
    if (!guild?.icon) return undefined;

    // Animated icons are prefixed a_ and need .gif.
    const ext = String(guild.icon).startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${ext}?size=64`;
}

export default function GuildIcon({ guild }: { guild: any }) {
    const url = iconUrl(guild);

    if (url) {
        return <Image
            source={{ uri: url }}
            style={{ width: SIZE, height: SIZE, borderRadius: SIZE / 2 }}
        />;
    }

    return <View
        style={{
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            backgroundColor: "#4E5058",
            alignItems: "center",
            justifyContent: "center",
        }}
    >
        <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "600" }}>
            {acronym(guild?.name)}
        </Text>
    </View>;
}
