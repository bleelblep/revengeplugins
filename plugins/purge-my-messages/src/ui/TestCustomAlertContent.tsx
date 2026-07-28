import { ReactNative } from "@vendetta/metro/common";

const { View, Text, StyleSheet } = ReactNative;

/**
 * Deliberately trivial: this only exists to answer one question -- does showCustomAlert
 * render at all on this build, or does it hit the same "FluxContainer(Alert) is undefined"
 * failure showInputAlert does? Triggered from a harmless secondary button on the first
 * (confirmed-safe) alert so a crash here can't happen mid-search/delete.
 */
export default function TestCustomAlertContent() {
    return <View style={st.box}>
        <Text style={st.text}>showCustomAlert rendered successfully.</Text>
        <Text style={st.hint}>(back button / tap outside to dismiss)</Text>
    </View>;
}

const st = StyleSheet.create({
    box: { backgroundColor: "#2b2d31", borderRadius: 12, padding: 20, margin: 24 },
    text: { color: "#dbdee1", fontSize: 15, fontWeight: "600", marginBottom: 6 },
    hint: { color: "#949ba4", fontSize: 12 },
});
