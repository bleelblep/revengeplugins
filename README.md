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
