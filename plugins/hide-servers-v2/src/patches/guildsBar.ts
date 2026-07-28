import { find } from "@vendetta/metro";
import { React } from "@vendetta/metro/common";
import { guildIdOf } from "../lib/guildId";
import { instant, isEmpty, isHidden } from "../lib/hidden";

// Only descend into array-valued props whose key looks list-shaped. Guessed against
// FastList's typical `data` prop plus common alternatives -- not verified on a real
// device, so this may simply match nothing and no-op safely (see the try/catch below).
const LISTY_KEY = /data|items|children|ids|guilds|nodes/i;

function isPlainObject(value: any): boolean {
    if (!value || typeof value !== "object") return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

function isElement(value: any): boolean {
    return !!value && typeof value === "object" && "type" in value && "props" in value && "$$typeof" in value;
}

function resolveId(item: any): string | undefined {
    if (item == null) return undefined;
    if (typeof item === "string") return item;
    if (typeof item !== "object") return undefined;
    return guildIdOf(item.props ?? item);
}

function stripArray(arr: any[], seen: Set<any>): any[] {
    let changed = false;
    const next: any[] = [];

    for (const item of arr) {
        const id = resolveId(item);
        if (id && isHidden(id)) { changed = true; continue; }

        const filtered = stripHidden(item, seen);
        if (filtered !== item) changed = true;
        next.push(filtered);
    }

    return changed ? next : arr;
}

function stripObject(obj: Record<string, any>, seen: Set<any>): Record<string, any> {
    let changed = false;
    const next: Record<string, any> = {};

    for (const key of Object.keys(obj)) {
        const value = obj[key];
        if (Array.isArray(value) && LISTY_KEY.test(key)) {
            const filtered = stripArray(value, seen);
            next[key] = filtered;
            if (filtered !== value) changed = true;
        } else {
            next[key] = value;
        }
    }

    return changed ? next : obj;
}

/**
 * Walk what GuildsBar renders and drop anything that resolves to a hidden guild id --
 * a raw id in a list-data array, a tree node, or a row element's props. Only plain
 * objects and React elements are ever rebuilt; class instances (Flux stores etc.) are
 * left completely alone -- object-spreading those drops their prototype and crashes,
 * same landmine documented in sortedGuilds.ts's clone().
 */
function stripHidden(node: any, seen: Set<any>): any {
    if (node == null || typeof node !== "object") return node;
    if (seen.has(node)) return node;
    seen.add(node);

    if (Array.isArray(node)) return stripArray(node, seen);

    if (isElement(node)) {
        const props = node.props;
        if (!isPlainObject(props)) return node;
        const nextProps = stripObject(props, seen);
        return nextProps === props ? node : React.cloneElement(node, nextProps);
    }

    if (isPlainObject(node)) return stripObject(node, seen);

    return node;
}

/**
 * Resolve the GuildsBar module itself, not a rendered instance -- findByTypeNameAll (what
 * v1 uses to patch individual rows) only returns component references, not something whose
 * `default` export can be swapped. This match strategy is the same one ServerDrawer uses to
 * replace GuildsBar outright:
 * https://github.com/kmmiio99o/vd-plugins/blob/main/plugins/ServerDrawer/src/patches/hideGuildsBar.tsx
 */
function findGuildsBar(): any {
    let mod = find((m: any) => {
        try { return m?.default?.type?.name === "GuildsBar"; } catch { return false; }
    });
    if (mod?.default) return mod;

    mod = find((m: any) => {
        try { return m?.default?.displayName === "GuildsBar"; } catch { return false; }
    });
    if (mod?.default) return mod;

    return null;
}

/** GuildsBar's export is usually memo/forwardRef-wrapped, not a bare function -- unwrap it. */
function asCallable(component: any): ((...args: any[]) => any) | undefined {
    if (typeof component === "function") return component;
    if (component && typeof component === "object") {
        if (typeof component.type === "function") return component.type;
        if (typeof component.render === "function") return component.render;
    }
    return undefined;
}

/**
 * v1 (see ../../hide-servers) can only null out individual GuildsBarGuild rows once
 * FastList has already reserved a slot for each one -- that leaves a gap and can jump the
 * bar's scroll position. This swaps GuildsBar's own module export instead, so the row list
 * fed to FastList never contains the hidden guilds in the first place: the original
 * component is still called (so its hooks/behaviour are untouched), and only its returned
 * element tree is filtered before it reaches the renderer.
 *
 * Experimental: the prop-name guesses in LISTY_KEY haven't been checked against a live
 * build. If they don't match anything, or GuildsBar's export shape doesn't fit
 * asCallable's assumptions, this degrades to rendering the bar completely untouched rather
 * than crashing it -- see isEmpty()/instant() below and the try/catch.
 */
export default function patchGuildsBar() {
    const mod = findGuildsBar();
    if (!mod?.default) return () => {};

    const orig = mod.default;
    const call = asCallable(orig);
    if (!call) return () => {};

    function FilteredGuildsBar(...args: any[]) {
        const element = call.apply(null, args);
        if (isEmpty() || !instant()) return element;

        try {
            return stripHidden(element, new Set());
        } catch {
            return element;
        }
    }

    FilteredGuildsBar.displayName = "GuildsBar";
    mod.default = FilteredGuildsBar;

    return () => { mod.default = orig; };
}
