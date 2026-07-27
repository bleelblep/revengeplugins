import { findByName, findByStoreName } from "@vendetta/metro";
import { ReactNative, chroma } from "@vendetta/metro/common";
import { after } from "@vendetta/patcher";
import getTag from "../lib/getTag";

const getTagProperties = findByName("getTagProperties", false)
const GuildStore = findByStoreName("GuildStore")
const ChannelStore = findByStoreName("ChannelStore")

export default () => after("default", getTagProperties, ([{ message }], ret) => {
    // A message that already carries a tag (bot, system, automod...) has non-empty
    // tagText, so leaving those alone no longer needs the localised name list.
    if (!ret?.tagText) {
        const channel = ChannelStore.getChannel(message.channel_id)
        const guild = GuildStore.getGuild(channel?.guild_id)

        const tag = getTag(guild, channel, message.author)

        if (tag) {
            return {
                ...ret,
                tagText: tag.text,
                tagTextColor: tag.textColor ? ReactNative.processColor(chroma(tag.textColor).hex()) : undefined,
                tagBackgroundColor: tag.backgroundColor ? ReactNative.processColor(chroma(tag.backgroundColor).hex()) : undefined,
                tagVerified: tag.verified,
                tagType: undefined
            }
        }
    }
})
