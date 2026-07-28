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

## Hide Servers
Locally hide servers from your server list. Settings mirror the server bar — same order, your
folders, real server icons — with a switch per server.

Rewritten from scratch; the original by [nexpid](https://github.com/nexpid) is no longer
available in source form.

> https://bleelblep.github.io/revengeplugins/hide-servers/

<details>
  <summary>Known issue</summary>

  A hidden server leaves an **empty space** in the bar, and tapping a server can **jump the
  bar's scroll position**. Reloading Discord clears it until the next change; there is a
  Reload button in the plugin's settings.

  The cause: nothing that feeds the bar can be intercepted on this build.

  - `GuildsBar` takes a single `enableHome` prop and builds its rows internally from hooks.
  - Its helpers (`getGuildBarNeighbors`, `getGuildsBarGuildAccessibilityActions`) are local to
    that bundle module, not exported.
  - `SortedGuildStore` is not the bar's source — filtering it verifiably works (88 → 87 ids,
    `root.children` 55 → 54) yet the bar is unchanged, even across a reload.
  - Overriding FastList's `itemSize` to collapse the row had no effect either.

  So the only available lever is `GuildsBarGuild` itself, and a row component can only render
  nothing — its slot stays in FastList's geometry. Hiding works; the gap is cosmetic.

</details>

## Hide Servers v2 (experimental)
Same idea as Hide Servers, different technique: instead of patching individual
`GuildsBarGuild` rows, this swaps `GuildsBar`'s own module export and filters the element
tree it returns before it reaches FastList — aiming to avoid the gap/scroll-jump above by
never handing FastList the hidden guilds in the first place, rather than nulling their slot
after the fact.

> https://bleelblep.github.io/revengeplugins/hide-servers-v2/

<details>
  <summary>How it differs from v1, and its risk</summary>

  Inspired by how [ServerDrawer](https://github.com/kmmiio99o/vd-plugins/blob/main/plugins/ServerDrawer/src/patches/hideGuildsBar.tsx)
  resolves and replaces `GuildsBar` wholesale (for a different purpose — it hides the bar
  entirely in favour of a drawer). Here the original `GuildsBar` function is still called, so
  its hooks and behaviour are untouched; only its returned element tree is walked afterward,
  and array-valued props with list-shaped keys (`data`, `items`, `children`, `ids`, `guilds`,
  `nodes`) are filtered for hidden guild ids.

  **Not yet verified against a live client.** The prop-name guesses may not match anything
  `GuildsBar` actually returns, in which case this silently no-ops and the bar renders
  untouched — same degrade-safe behaviour as any resolve failure elsewhere in this repo. If
  it doesn't visually hide anything, fall back to the original Hide Servers plugin above.

</details>

<details>
  <summary>Notes for anyone extending this</summary>

  - `GuildsBar` and `GuildsBarGuild` resolve **only** via `findByTypeNameAll`. `findByName` and
    `findByDisplayName` both return nothing. `FastList` is the opposite — `findByName(_, false)`
    finds it, `findByTypeNameAll` returns none.
  - Suppress a render with `instead`, not `after`: an `after` callback returning `null` is read
    as "no change" and the original element renders anyway.
  - Store values are **class instances**. Never object-spread them — that drops the prototype
    and its methods, which crashed `getGuildBarNeighbors` with "undefined is not a function".
  - `Object.keys` on these stores returns only Flux internals; real methods come through a
    proxy. Absence from an enumeration proves nothing — test by direct access.
  - The build transpiles `const` in `for...of` to `var`, so closures created in a loop share
    the final iteration's bindings. Install patches from a standalone function.

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
