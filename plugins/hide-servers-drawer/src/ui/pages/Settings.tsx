import { findByProps, findByStoreName } from "@vendetta/metro";
import { React, ReactNative } from "@vendetta/metro/common";
import { showConfirmationAlert } from "@vendetta/ui/alerts";
import { clearHidden, hiddenFolderIds, hiddenIds, instant, isFolderHidden, isHidden, setFolderHidden, setHidden, setInstant } from "../../lib/hidden";
import { setStaticIcons, staticIcons } from "../../lib/prefs";
import { canReload, reloadDiscord } from "../../lib/reload";
import { refresh, store, unfiltered } from "../../patches/sortedGuilds";
import GuildIcon from "../components/GuildIcon";
import { textMuted, textNormal } from "../theme";

// Resolve UI pieces without destructuring -- an undefined module here throws at import
// time, before onLoad exists, which the client reports as a plugin that won't enable.
const Table = findByProps("TableRowGroup", "TableSwitchRow");
const Forms = findByProps("FormSection", "FormSwitchRow");

const Section = Table?.TableRowGroup ?? Forms?.FormSection;
const SwitchRow = Table?.TableSwitchRow ?? Forms?.FormSwitchRow;
const Row = Table?.TableRow ?? Forms?.FormRow;

const GuildStore = findByStoreName("GuildStore");

const { ScrollView, Text, View } = ReactNative;

type Guild = { id: string; name: string; icon?: string };
type Group = { title: string; guilds: Guild[]; folderId?: string | number };

function guildById(id: string): Guild | undefined {
    try {
        const guild = GuildStore?.getGuild?.(id);
        if (guild) return { id: guild.id, name: guild.name ?? "Unnamed", icon: guild.icon };
    } catch { /* fall through */ }
    return undefined;
}

/**
 * Build the list in the same order the server bar shows it, folders included.
 *
 * Read through `unfiltered` so hidden servers still appear here -- otherwise hiding one
 * would remove it from this page and there would be no way to bring it back.
 */
function groups(): Group[] {
    const out: Group[] = [];
    let loose: Guild[] = [];

    const flush = () => {
        if (loose.length) { out.push({ title: "Servers", guilds: loose }); loose = []; }
    };

    let children: any[] | undefined;
    try {
        children = unfiltered(() => store()?.getGuildsTree?.())?.root?.children;
    } catch { /* fall back below */ }

    if (Array.isArray(children)) {
        for (const node of children) {
            if (node?.type === "folder") {
                const guilds = (node.children ?? [])
                    .map((child: any) => guildById(String(child?.id)))
                    .filter(Boolean) as Guild[];

                if (!guilds.length) continue;

                flush();
                out.push({ title: node.name || "Folder", guilds, folderId: node.id });
            } else if (node?.id != null) {
                const guild = guildById(String(node.id));
                if (guild) loose.push(guild);
            }
        }

        flush();
        if (out.length) return out;
    }

    // Fallback: the tree was unavailable, so list everything alphabetically.
    let all: Record<string, any> = {};
    try { all = GuildStore?.getGuilds?.() ?? {} } catch { /* none */ }

    const guilds = Object.values(all)
        .filter((g: any) => g?.id)
        .map((g: any) => ({ id: g.id, name: g.name ?? "Unnamed", icon: g.icon }))
        .sort((a, b) => a.name.localeCompare(b.name));

    return guilds.length ? [{ title: "Servers", guilds }] : [];
}

export default function Settings() {
    // The switches are controlled by isHidden(), so the page has to re-render itself
    // after a toggle or the switch springs straight back to its old position.
    const [, bump] = React.useReducer((n: number) => n + 1, 0);

    const list = groups();
    const hidden = hiddenIds();
    const hiddenFolders = hiddenFolderIds();
    const hiddenCount = hidden.length + hiddenFolders.length;

    if (!Section || !SwitchRow) {
        return <ScrollView style={{ flex: 1, padding: 16 }}>
            <Text style={{ color: textNormal() }}>
                Settings are unavailable on this Discord build. {hidden.length} server(s) and {hiddenFolders.length} folder(s) hidden.
            </Text>
        </ScrollView>;
    }

    const confirmReload = () => showConfirmationAlert({
        title: "Reload Discord?",
        content: "Discord will close and reopen. Anything unsent will be lost.",
        confirmText: "Reload",
        cancelText: "Cancel",
        onConfirm: () => reloadDiscord(),
    });

    return <ScrollView style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
            <Text style={{ color: textMuted(), fontSize: 12, lineHeight: 16 }}>
                Hiding is local to this device and never leaves Discord. While anything is
                hidden, the server bar is replaced with a plain rebuilt version so there's no
                empty gap and no scroll jump -- the trade-off is that drag-to-reorder isn't
                available in that state. Turn off "Hide servers in the bar" (or unhide
                everything) to get the untouched native bar back, reorder included.
            </Text>
        </View>

        <Section title="Display">
            <SwitchRow
                label="Disable animated server icons"
                subLabel="Show the still frame of animated (GIF) server icons instead."
                value={staticIcons()}
                onValueChange={(v: boolean) => { setStaticIcons(v); refresh(); bump() }}
            />
        </Section>

        {(hiddenCount > 0 || canReload()) && Row
            ? <Section title="Hidden">
                {hiddenCount > 0
                    ? <Row
                        label={`${hidden.length} server${hidden.length === 1 ? "" : "s"}, ${hiddenFolders.length} folder${hiddenFolders.length === 1 ? "" : "s"} hidden`}
                        subLabel="Tap to show all again"
                        onPress={() => { clearHidden(); refresh(); bump() }}
                    />
                    : null}
                {canReload()
                    ? <Row
                        label="Reload Discord"
                        subLabel="Apply changes everywhere"
                        onPress={confirmReload}
                    />
                    : null}
                <SwitchRow
                    label="Hide servers in the bar"
                    subLabel="Turn off to leave the server bar completely untouched."
                    value={instant()}
                    onValueChange={(v: boolean) => { setInstant(v); refresh(); bump() }}
                />
            </Section>
            : null}

        {list.length === 0
            ? <View style={{ padding: 16 }}>
                <Text style={{ color: textNormal() }}>No servers found.</Text>
            </View>
            : list.map((group, index) =>
                <Section key={`${group.title}-${index}`} title={group.title}>
                    {group.folderId != null
                        ? <SwitchRow
                            label={`Hide entire "${group.title}" folder`}
                            subLabel="Overrides the per-server switches below while it's hidden."
                            value={isFolderHidden(group.folderId)}
                            onValueChange={(v: boolean) => {
                                setFolderHidden(group.folderId!, v);
                                refresh();
                                bump();
                            }}
                        />
                        : null}
                    {group.guilds.map(guild =>
                        <SwitchRow
                            key={guild.id}
                            label={guild.name}
                            // `icon` is the TableRow prop, `leading` the Form* one --
                            // whichever component resolved will use its own and ignore the other.
                            icon={<GuildIcon guild={guild} />}
                            leading={<GuildIcon guild={guild} />}
                            value={isHidden(guild.id)}
                            onValueChange={(v: boolean) => {
                                setHidden(guild.id, v);
                                refresh();
                                bump();
                            }}
                        />
                    )}
                </Section>
            )}
    </ScrollView>;
}
