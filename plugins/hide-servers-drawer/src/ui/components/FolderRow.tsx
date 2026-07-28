import { findByProps, findByStoreName } from "@vendetta/metro";
import { React, ReactNative } from "@vendetta/metro/common";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";
import { setFolderHidden } from "../../lib/hidden";
import { refresh as refreshSortedGuilds } from "../../patches/sortedGuilds";
import { folderTint } from "../theme";
import ContextMenu from "./ContextMenu";
import GuildRow, { useSelectedGuildId } from "./GuildRow";
import GuildIcon from "./GuildIcon";

const { Pressable, View, Image } = ReactNative;

const GuildActions = findByProps("toggleGuildFolderExpand");
const ExpandedGuildFolderStore = findByStoreName("ExpandedGuildFolderStore");
const GuildStore = findByStoreName("GuildStore");
const Haptic = findByProps("triggerHapticFeedback", "HapticFeedbackTypes");

const ICON = 48;
const MINI = 16;
const FOLDER_ASSET = getAssetIDByName("FolderIcon") ?? getAssetIDByName("ic_folder");

const POS = [
    { top: 6, left: 6 }, { top: 6, right: 6 },
    { bottom: 6, left: 6 }, { bottom: 6, right: 6 },
];

function useFolderExpanded(folderId: string | number): boolean {
    const [open, setOpen] = React.useState(() => {
        try {
            const folders = ExpandedGuildFolderStore?.getExpandedFolders?.();
            return folders instanceof Set ? folders.has(folderId) : false;
        } catch { return false }
    });

    React.useEffect(() => {
        if (!ExpandedGuildFolderStore?.addChangeListener) return;
        const onChange = () => {
            try {
                const folders = ExpandedGuildFolderStore.getExpandedFolders?.();
                setOpen(folders instanceof Set ? folders.has(folderId) : false);
            } catch { /* ignore */ }
        };
        ExpandedGuildFolderStore.addChangeListener(onChange);
        return () => ExpandedGuildFolderStore.removeChangeListener?.(onChange);
    }, [folderId]);

    return open;
}

/** node: { type: "folder", id, name, color, children: [{ id, ... }] } from SortedGuildStore.getGuildsTree(). */
export default function FolderRow({ node }: { node: any }) {
    const open = useFolderExpanded(node.id);
    const selectedId = useSelectedGuildId();
    const children: any[] = Array.isArray(node.children) ? node.children : [];
    const tint = folderTint(node.color);
    const [menuOpen, setMenuOpen] = React.useState(false);

    const toggle = () => { try { GuildActions?.toggleGuildFolderExpand?.(node.id) } catch { /* ignore */ } };

    // No stock equivalent to borrow, so no native-action-sheet attempt here (unlike
    // GuildRow) -- straight to the fallback modal. A hidden folder disappears from the bar
    // entirely (same as a hidden guild), so it can only be unhidden from Settings, not
    // re-found here to toggle back off.
    const openMenu = React.useCallback(() => {
        Haptic?.triggerHapticFeedback?.(Haptic.HapticFeedbackTypes.IMPACT_MEDIUM);
        setMenuOpen(true);
    }, []);

    const hideFolder = () => {
        setFolderHidden(node.id, true);
        refreshSortedGuilds();
        showToast(`Hid folder "${node.name ?? "Folder"}"`);
    };

    const menu = <ContextMenu
        visible={menuOpen}
        title={node.name || "Folder"}
        items={[{ label: "Hide folder", danger: true, action: hideFolder }]}
        onClose={() => setMenuOpen(false)}
    />;

    if (open) {
        // Discord groups an expanded folder's rows inside a rounded, tinted backdrop rather
        // than leaving them floating loose in the list -- without it an open folder is
        // visually indistinguishable from a run of ungrouped servers.
        // No horizontal padding: child GuildRows are a full bar-width each (so their
        // left-edge pill can sit inside their own bounds -- see ui/layout.ts), and padding
        // here would push them wider than the bar.
        return <View style={{
            alignItems: "center",
            backgroundColor: `${tint}33`,
            borderRadius: 20,
            paddingVertical: 10,
        }}>
            <Pressable onPress={toggle} onLongPress={openMenu} delayLongPress={450} style={{ marginBottom: children.length ? 10 : 0 }}>
                <View style={{
                    width: ICON, height: ICON, borderRadius: 16,
                    alignItems: "center", justifyContent: "center",
                    backgroundColor: tint,
                }}>
                    <Image source={FOLDER_ASSET} style={{ width: 24, height: 24, tintColor: "#fff" }} />
                </View>
            </Pressable>
            {children.map((child, i) =>
                <View key={child.id} style={{ marginBottom: i === children.length - 1 ? 0 : 10 }}>
                    <GuildRow id={String(child.id)} selected={String(child.id) === selectedId} />
                </View>
            )}
            {menu}
        </View>;
    }

    return <>
        <Pressable onPress={toggle} onLongPress={openMenu} delayLongPress={450}>
            <View style={{ width: ICON, height: ICON }}>
                <View style={{
                    width: ICON, height: ICON, borderRadius: 16, overflow: "hidden",
                    backgroundColor: tint,
                }}>
                    {children.slice(0, 4).map((child, i) => {
                        let guild: any;
                        try { guild = GuildStore?.getGuild?.(String(child.id)) } catch { /* ignore */ }
                        if (!guild) return null;
                        return <View key={child.id} style={{ position: "absolute", width: MINI, height: MINI, borderRadius: 8, overflow: "hidden", ...POS[i] }}>
                            <GuildIcon guild={guild} size={MINI} radius={8} />
                        </View>;
                    })}
                </View>
            </View>
        </Pressable>
        {menu}
    </>;
}
