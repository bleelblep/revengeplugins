/**
 * Pull a guild id out of a component's props.
 *
 * The prop naming used by GuildsBarGuild isn't documented, so accept any plausible shape.
 * Shared between the row patch and the FastList size patch so both agree on what counts as
 * a given row's server.
 */
export function guildIdOf(props: any): string | undefined {
    const candidate =
        props?.guildId ??
        props?.guild?.id ??
        props?.id ??
        props?.node?.id ??
        props?.item?.id ??
        props?.item?.guildId;

    return candidate == null ? undefined : String(candidate);
}
