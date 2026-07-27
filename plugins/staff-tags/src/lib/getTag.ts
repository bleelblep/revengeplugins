import { findByProps, findByStoreName } from "@vendetta/metro";
import { chroma, constants, i18n } from "@vendetta/metro/common";
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

// Discord 337.x moved to hashed intl keys, so every one of these lookups now returns
// undefined. Keep the list for older builds, but drop the misses -- an array holding
// undefined makes `.includes(undefined)` return true, which inverted every guard in
// this plugin and silently killed all tags.
export const BUILT_IN_TAGS: string[] = [
    "AI_TAG",
    "BOT_TAG_BOT",
    "BOT_TAG_SERVER",
    "SYSTEM_DM_TAG_SYSTEM",
    "GUILD_AUTOMOD_USER_BADGE_TEXT",
    "REMIXING_TAG"
].map(key => i18n?.Messages?.[key]).filter(text => typeof text === "string" && text.length > 0)

// Locale-independent replacement for `BUILT_IN_TAGS.includes(getBotLabel(type))`.
// We only care *whether* Discord maps this type to a real tag, not what it's called,
// so the answer survives both translation and the hashed-key migration.
export function isBuiltInTag(type: unknown): boolean {
    if (typeof type !== "number") return false

    const label = TagModule?.getBotLabel?.(type)
    if (typeof label === "string" && label.length > 0) return true

    return BUILT_IN_TAGS.includes(label)
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

            let roleColor = storage.useRoleColor ? GuildMemberStore?.getMember?.(guild?.id, user.id)?.colorString : undefined
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
