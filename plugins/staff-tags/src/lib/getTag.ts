import { findByProps, findByStoreName } from "@vendetta/metro";
import { chroma, constants } from "@vendetta/metro/common";
import { storage } from "@vendetta/plugin";
import { rawColors } from "@vendetta/ui";

// Permissions
const Permissions = constants?.Permissions ?? {}

// Discord 337.x split the permission helpers: `computePermissions` / `canEveryoneRole`
// are gone, replaced by `computePermissionsForMember`. The old code destructured the
// finder result directly, so once the module stopped resolving this threw at import
// time and the plugin could not be enabled at all. Never destructure a finder.
const PermissionUtils = findByProps("computePermissionsForMember")
    ?? findByProps("computePermissions", "canEveryoneRole")
    ?? findByProps("computePermissions")

const computePermissions = PermissionUtils?.computePermissionsForMember
    ?? PermissionUtils?.computePermissions

const GuildMemberStore = findByStoreName("GuildMemberStore")
const TagModule = findByProps("getBotLabel")

// This plugin used to build a list of built-in tag names from i18n.Messages and compare
// tag text against it. Do not reintroduce that: on this client `metro.common.i18n` is a
// lazy getter that *throws* ("bunny.metro.byProps(Messages) is undefined"), and optional
// chaining does not protect against a throwing getter. Touching it at module scope threw
// during import, which is why the plugin could not be enabled at all.
//
// Ask Discord whether a tag type maps to a label instead. No i18n, locale-independent,
// and unaffected by the hashed-key migration.
export function isBuiltInTag(type: unknown): boolean {
    if (typeof type !== "number") return false

    try {
        const label = TagModule?.getBotLabel?.(type)
        return typeof label === "string" && label.length > 0
    } catch {
        return false
    }
}

interface Tag {
    text: string
    textColor?: any
    backgroundColor?: any
    verified?: boolean | ((guild, channel, user) => boolean)
    condition?: (guild, channel, user) => boolean
    permissions?: string[]
}

const tags: Tag[] = [
    {
        text: "WEBHOOK",
        condition: (guild, channel, user) => user.isNonUserBot?.() ?? false
    },
    {
        text: "OWNER",
        //backgroundColor: rawColors.ORANGE_345,
        condition: (guild, channel, user) => guild?.ownerId === user.id
    },
    {
        text: "ADMIN",
        //backgroundColor: rawColors.RED_560,
        permissions: ["ADMINISTRATOR"]
    },
    {
        text: "STAFF",
        //backgroundColor: rawColors.GREEN_345,
        permissions: ["MANAGE_GUILD", "MANAGE_CHANNELS", "MANAGE_ROLES", "MANAGE_WEBHOOKS"]
    },
    {
        text: "MOD",
        //backgroundColor: rawColors.BLUE_345,
        permissions: ["MANAGE_MESSAGES", "KICK_MEMBERS", "BAN_MEMBERS"]
    },
    {
        text: "VC Mod",
        //backgroundColor: "#059669#",
        permissions: ["MOVE_MEMBERS", "MUTE_MEMBERS", "DEAFEN_MEMBERS"]
    },
    {
        text: "Chat Mod",
        //backgroundColor: "#7C3AED",
        permissions: ["MODERATE_MEMBERS"]
    }
]

// The replacement helper's argument order isn't documented anywhere, so try the known
// call shapes once and remember whichever one answers. -1 means "none of them work",
// in which case we skip permission tags rather than throwing on every render.
const callShapes = [
    (guild, channel, user) => computePermissions({ user, context: guild, overwrites: channel?.permissionOverwrites }),
    (guild, channel, user) => computePermissions({ user, context: guild, overwrites: channel?.permissionOverwrites, checkElevated: false }),
    (guild, channel, user) => computePermissions(user, guild, channel),
    (guild, channel, user) => computePermissions(guild, channel, user)
]
let workingShape: number | undefined

function computePermissionsInt(guild, channel, user): bigint | undefined {
    if (typeof computePermissions !== "function") return undefined

    const candidates = workingShape === undefined
        ? callShapes.keys()
        : workingShape === -1 ? [] : [workingShape]

    for (const index of candidates) {
        try {
            const result = callShapes[index](guild, channel, user)
            if (typeof result === "bigint" || typeof result === "number") {
                workingShape = index
                return BigInt(result)
            }
        } catch { /* wrong shape, try the next one */ }
    }

    if (workingShape === undefined) workingShape = -1
    return undefined
}

export default function getTag(guild, channel, user) {
    if (!user) return

    let permissions
    if (guild) {
        const permissionsInt = computePermissionsInt(guild, channel, user)

        if (permissionsInt !== undefined) {
            permissions = Object.entries(Permissions)
                .map(([permission, permissionInt]: [string, bigint]) =>
                    permissionsInt & BigInt(permissionInt as any) ? permission : "")
                .filter(Boolean)
        }
    }

    for (const tag of tags) {
        if (tag.condition?.(guild, channel, user) ||
            (!user.bot && tag.permissions?.some(perm => permissions?.includes(perm)))) {

            let roleColor = storage?.useRoleColor ? GuildMemberStore?.getMember?.(guild?.id, user.id)?.colorString : undefined
            let backgroundColor = roleColor ? roleColor : tag.backgroundColor ?? rawColors?.BRAND_500 ?? "#5865F2"
            let textColor = (roleColor || !tag.textColor)
                ? (chroma(backgroundColor).get('lab.l') < 70 ? rawColors?.WHITE_500 ?? "#FFFFFF" : rawColors?.BLACK_500 ?? "#000000")
                : tag.textColor

            return {
                ...tag,
                textColor,
                backgroundColor,
                verified: typeof tag.verified === "function" ? tag.verified(guild, channel, user) : tag.verified ?? false,
                condition: undefined,
                permissions: undefined
            }
        }
    }
}
