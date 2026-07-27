import { findByName, findByProps, findByStoreName } from "@vendetta/metro";
import { after } from "@vendetta/patcher";
import { findInReactTree } from "@vendetta/utils";
import getTag, { isBuiltInTag } from "../lib/getTag";

const DisplayName = findByName("DisplayName", false);
const HeaderName = findByName("HeaderName", false);

const TagModule = findByProps("getBotLabel");

const GuildStore = findByStoreName("GuildStore");
const ChannelStore = findByStoreName("ChannelStore");

export default () => {
    const patches = []

    patches.push(after("default", HeaderName, ([{ channelId }], ret) => {
        ret.props.channelId = channelId
    }))

    patches.push(after("default", DisplayName, ([{ guildId, channelId, user }], ret) => {
        const tagComponent = findInReactTree(ret, (c) => c?.type?.Types)
        if (!tagComponent || !isBuiltInTag(tagComponent.props.type)) {
            const guild = GuildStore.getGuild(guildId)
            const channel = ChannelStore.getChannel(channelId)
            const tag = getTag(guild, channel, user)

            if (tag) {
                if (tagComponent) {
                    tagComponent.props = {
                        type: 0,
                        ...tag
                    }
                } else {
                    const row = findInReactTree(ret, (c) => c?.props?.style?.flexDirection === "row")
                    if (!row || !Array.isArray(row.props.children)) return

                    row.props.children.push(
                        <TagModule.default
                            style={{ marginLeft: 0 }}
                            type={0}
                            text={tag.text}
                            textColor={tag.textColor}
                            backgroundColor={tag.backgroundColor}
                            verified={tag.verified}
                        />
                    )
                }
            }
        }
    }))

    return () => patches.forEach((unpatch) => unpatch())
}
