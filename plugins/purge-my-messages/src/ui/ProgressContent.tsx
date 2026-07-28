import { React, ReactNative } from "@vendetta/metro/common";
import { getProgress, subscribeProgress } from "./progressStore";

const { View, Text, ActivityIndicator, StyleSheet } = ReactNative;

/** Passed as `content` to showConfirmationAlert -- see progressStore.ts for why this works. */
export default function ProgressContent() {
    const [info, setInfo] = React.useState(() => getProgress());
    React.useEffect(() => subscribeProgress(setInfo), []);

    return <View style={st.row}>
        <ActivityIndicator style={st.spinner} />
        <Text style={st.text}>{info.label}</Text>
    </View>;
}

const st = StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
    spinner: { marginRight: 10 },
    text: { color: "#dbdee1", fontSize: 14, flexShrink: 1 },
});
