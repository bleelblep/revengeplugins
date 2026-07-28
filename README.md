# revenge/bunny/kettu plugins

Vendetta plugins maintained to work with current Discord stable on its successors
[Revenge](https://github.com/revenge-mod/revenge-bundle) and [Kettu](https://github.com/C0C0B01/Kettu).
Credit goes to the original plugin devs for their respective work.

Forked from [shipwr3ckd/revengeplugin](https://github.com/shipwr3ckd/revengeplugin) by シグマ siguma (CC0-1.0).

Tested against **Discord 337.10** on **RevengeXposed 1.4.10**.

# How to install?
Copy the plugin URL below and paste it into your Discord client's Plugins page.

# Plugins

## Staff Tags
Shows extra tags for staff members — OWNER, ADMIN, STAFF, MOD, VC Mod, Chat Mod, WEBHOOK.

> https://bleelblep.github.io/revengeplugins/staff-tags/

<h3>
<details>
  <summary>Preview</summary>
  <p>
    <img src="./images/staff-tags.png" width="300" />
  </p>
</details>
</h3>

<details>
  <summary>Fixes applied for Discord 337.x</summary>

  - `metro.common.i18n` is a lazy getter that **throws** on this client
    (`bunny.metro.byProps(Messages) is undefined`). The plugin read `i18n.Messages` at
    module scope to build a list of built-in tag names, so importing it threw and the
    plugin could never be enabled. Optional chaining does not help — the getter throws
    rather than returning undefined. Built-in tags are now detected via `getBotLabel`,
    which needs no localised strings.
  - Permission helper is resolved across old and new names without destructuring the
    finder result.
  - Every patch guards its target module, so a moved module disables one surface instead
    of the whole plugin.
  - `DisplayName` and `HeaderName` no longer exist on this build, so profile and chat
    header tags are currently inactive. Chat messages and member-list rows work.

</details>

## Custom Timestamps
Customize the format of timestamps in chat — calendar, relative, ISO 8601, or a custom
[moment](https://momentjs.com/docs/#/displaying/format/) format string.

Originally by [Fiery](https://github.com/fierdetta/custom-timestamps).

> https://bleelblep.github.io/revengeplugins/custom-timestamps/

<details>
  <summary>Fixes applied for Discord 337.x</summary>

  - `message.timestamp` used to be a moment instance and the plugin called `.calendar()`
    on it directly. It is a plain string now, so every moment method was undefined —
    which threw from inside `RowManager.generate` and crashed the whole chat view.
    Timestamps are coerced through `moment()`, which handles strings, numbers, Dates and
    existing moments alike.
  - Both `generate` hooks are wrapped: they run on the chat render path, so anything
    escaping them takes the entire ChatView down rather than just breaking timestamps.
  - The `after` hook destructured `{ message }` from a return value that can be
    undefined — a second latent crash.
  - The settings text field resolved the input component as the module's `default`
    export. It is a named `InputView` export now, so the Custom option rendered nothing.

</details>

## Hide Servers (Drawer Fix)
Locally hide servers — or entire folders — from your server list, without the scroll-jump
bug earlier versions had. Settings mirror the server bar — same order, your folders, real
server icons — with a switch per server and per folder.

Supersedes the earlier Hide Servers / Hide Servers v2 plugins below (their source stays in
this repo's history; the install URLs are gone).

> https://bleelblep.github.io/revengeplugins/hide-servers-drawer/

<details>
  <summary>How it actually fixes the scroll-jump bug</summary>

  Both earlier attempts patched individual `GuildsBarGuild` rows to render nothing. That
  hides the icon, but the row's slot stays in `FastList`'s virtualized geometry — the bar
  keeps a phantom gap, and tapping a server can jump the scroll position. There's no prop or
  override that removes an item from that geometry short of it never being in the array
  `FastList` sees in the first place.

  So this patches the bar itself, not its rows: while anything is hidden, `GuildsBar` is
  swapped for a plain, non-virtualized render built from `SortedGuildStore.getGuildsTree()`
  (already filtered). A hidden guild is simply absent from that array — nothing reserves a
  slot for it, so there's no gap and no jump. When nothing is hidden, the real `GuildsBar`
  renders untouched.

  Trade-off: while the custom bar is active, native drag-to-reorder isn't available. Turn off
  "Hide servers in the bar" (or unhide everything) to get it back.

</details>

<details>
  <summary>Credit: kmmiio99o/vd-plugins (ServerDrawer)</summary>

  The core insight above — and the fix for it — came from studying
  [ServerDrawer](https://github.com/kmmiio99o/vd-plugins/tree/main/plugins/ServerDrawer),
  which sidesteps `GuildsBar`'s `FastList` entirely for a different purpose (a drawer instead
  of the sidebar). A few pieces are carried over directly:

  - `patches/createElementIntercept.ts` is a close port of ServerDrawer's file of the same
    name (global `React.createElement` interception as a fallback for cached component
    references) and is licensed **GPL-3.0** here as a result — the one GPL file in this
    otherwise CC0-1.0 repo. Full details, license text, and attribution:
    [`plugins/hide-servers-drawer/NOTICE.md`](./plugins/hide-servers-drawer/NOTICE.md).
  - The "replace the whole bar instead of patching rows" strategy, and locating
    `getGuildsBarGuildMenuItems` / `showSimpleActionSheet` for a real (not reimplemented)
    long-press menu, are independent implementations after the same approach — no code
    copied, credited as a courtesy.

</details>

<details>
  <summary>Notes for anyone extending this</summary>

  - `GuildsBar` and `GuildsBarGuild` resolve **only** via `findByTypeNameAll`. `findByName` and
    `findByDisplayName` both return nothing.
  - Suppress a render with `instead`, not `after`: an `after` callback returning `null` is read
    as "no change" and the original element renders anyway.
  - Store values are **class instances**. Never object-spread them — that drops the prototype
    and its methods, which crashed `getGuildBarNeighbors` with "undefined is not a function".
  - The build transpiles `const` in `for...of` to `var`, so closures created in a loop share
    the final iteration's bindings. Install patches from a standalone function.
  - Discord's semantic color tokens were fully renamed at some point (`BACKGROUND_TERTIARY` →
    `BACKGROUND_BASE_LOWEST`, `TEXT_NORMAL` → `TEXT_DEFAULT`, etc). Background/surface/text
    tokens resolve through `@vendetta/ui`'s `semanticColors` + a `resolveSemanticColor(theme,
    descriptor)` call (needed for custom JSON themes to apply), not the flat `colors` map —
    see `plugins/hide-servers-drawer/src/ui/theme.ts`.
  - `GuildActions.move`/`moveById` exist (found via `findByProps("toggleGuildFolderExpand")`)
    but this build's Hermes bytecode strips parameter names, so their call signature is
    unverified — drag-to-reorder was deliberately left out rather than guess against a live
    guild list.

</details>

# Themes

Paste into your client's **Themes** page (not Plugins).

## Purple Galaxy
Originally by [VodkaXMartini](https://github.com/VodkaXMartini/VendettaTheme).

> https://bleelblep.github.io/revengeplugins/themes/PurpleGalaxy.json

<details>
  <summary>Fixes applied for Discord 337.x</summary>

  Discord renamed most of its semantic colour tokens, so **37 of the theme's 52 keys were
  dead** and simply ignored — the theme was barely applying. A theme can't crash the way a
  plugin does; unrecognised keys are silently skipped, so it just looked washed out.

  - Remapped 33 renamed keys, e.g. `BACKGROUND_PRIMARY`/`SECONDARY`/`TERTIARY` →
    `BACKGROUND_BASE_LOWER`/`LOWEST`/`LOW`, `TEXT_NORMAL` → `TEXT_DEFAULT`, and
    `INTERACTIVE_NORMAL`, which Discord split into `INTERACTIVE_TEXT_DEFAULT` **and**
    `ICON_DEFAULT`.
  - Filled 24 keys the theme never defined. This is what made forum and thread cards grey:
    the theme sets `CARD_SECONDARY_BG`, but Discord reads
    `CARD_SECONDARY_BACKGROUND_DEFAULT`. Unset keys fall back to Discord's default grey,
    and the theme's text colours were never meant to sit on grey.
  - Base surfaces are assigned by measured brightness rather than by old key name, so
    elevation reads correctly. The author's later `BG_BASE_*` keys had flattened three
    distinct purples into one; the richer original set is kept.
  - Trimmed a stray-whitespace hex value (`"#44429e  "`) that likely failed to parse.

  Every added key was verified against the client's 357 live semantic colours, and every
  value derives from a colour already in the theme. Legacy key names are kept — they are
  ignored here and keep the theme working on older clients.

  Recognised keys: **72/109**, up from 15/52.

  Not addressed: the four `SCROLLBAR_*` keys have no mobile equivalent, and the
  `background` (remote GIF at `alpha: 5`), `fonts` and `plus` blocks are untouched.

</details>

# Development

```sh
npm install
npm run build          # build all plugins into dist/
node serve.mjs --watch # build, then serve dist/ over LAN for on-device testing

npm i ws --no-save     # devtools.mjs only; kept out of package.json so the
node devtools.mjs      # CI lockfile stays in sync
```

`serve.mjs` prints a LAN install URL you can paste straight into the client, and rebuilds
on change. Note that console output is **not** forwarded over Revenge's debug websocket on
this build — `serve.mjs` exposes a `POST /collect` endpoint so a plugin can report
diagnostics directly instead.
