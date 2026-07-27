import { findByProps } from "@vendetta/metro";
import { ReactNative } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";

// Discord moved the legacy Form* components into design/void/ and replaced them with
// TableRow. This file is imported by index.ts, so a failed lookup here throws before
// onLoad ever runs -- which the client reports as a plugin that cannot be enabled.
// Resolve whatever this build ships, and never destructure a finder result.
const Table = findByProps("TableRowGroup", "TableSwitchRow")
    ?? findByProps("TableSwitchRow")
const Forms = findByProps("FormSection", "FormSwitchRow")
    ?? findByProps("FormSwitchRow")

const Section = Table?.TableRowGroup ?? Forms?.FormSection
const SwitchRow = Table?.TableSwitchRow ?? Forms?.FormSwitchRow

const { ScrollView, Text } = ReactNative

export default function Settings() {
    useProxy(storage)

    if (!Section || !SwitchRow) {
        return <ScrollView style={{ flex: 1, padding: 16 }}>
            <Text style={{ color: "#f5f5f5" }}>
                Settings are unavailable on this Discord build, but the plugin itself is
                still running. Role-colour backgrounds are {storage.useRoleColor ? "on" : "off"}.
            </Text>
        </ScrollView>
    }

    return <ScrollView style={{ flex: 1 }}>
        <Section title="Tag style">
            <SwitchRow
                label="Use top role color for tag backgrounds"
                value={storage.useRoleColor}
                onValueChange={(v: boolean) => {
                    storage.useRoleColor = v;
                }}
            />
        </Section>
    </ScrollView>
}
