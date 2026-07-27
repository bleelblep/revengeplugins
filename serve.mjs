// Local dev server for Revenge/Vendetta plugins.
//
//   node serve.mjs            build once, then serve dist/ on :8087
//   node serve.mjs --watch    rebuild automatically when plugin sources change
//   node serve.mjs --port 9000
//
// Install a plugin in the client by pasting the printed URL (trailing slash matters).

import { createServer } from "http";
import { spawn } from "child_process";
import { readFile, stat, appendFile } from "fs/promises";
import { watch } from "fs";
import { join, extname, normalize } from "path";
import { fileURLToPath } from "url";
import { networkInterfaces } from "os";

const args = process.argv.slice(2);
const port = Number(args[args.indexOf("--port") + 1]) || 8087;
const shouldWatch = args.includes("--watch");

// fileURLToPath, not .pathname -- the latter leaves %20 in paths containing spaces.
const DIST = fileURLToPath(new URL("./dist/", import.meta.url));
const COLLECT_LOG = fileURLToPath(new URL("./collected.log", import.meta.url));

const TYPES = {
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json; charset=utf-8",
};

function build() {
    return new Promise((resolve) => {
        const child = spawn(process.execPath, ["build.mjs"], { stdio: "inherit" });
        child.on("exit", (code) => resolve(code === 0));
    });
}

const server = createServer(async (req, res) => {
    // The client fetches these cross-origin, so CORS is mandatory -- without it the
    // install silently fails with an unhelpful error.
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    // Never let the client cache a build we are actively iterating on.
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

    if (req.method === "OPTIONS") return res.writeHead(204).end();

    // Console output isn't forwarded over the debug websocket on RevengeXposed, so
    // plugins POST their diagnostics here instead. The phone can already reach this
    // server, which makes it the most reliable channel available.
    if (req.method === "POST" && req.url.startsWith("/collect")) {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
            const stamp = new Date().toISOString();
            console.log(`\n===== COLLECTED ${stamp} =====\n${body}\n===== END =====\n`);
            await appendFile(COLLECT_LOG, `\n===== ${stamp} =====\n${body}\n`);
            res.writeHead(200).end("ok");
        });
        return;
    }

    const rel = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname))
        .replace(/^([/\\]|\.\.)+/, "");
    const path = join(DIST, rel);

    try {
        if ((await stat(path)).isDirectory()) {
            res.writeHead(404).end("Directory -- request manifest.json or index.js inside it");
            console.log(`  404  ${req.url}  (directory)`);
            return;
        }

        const body = await readFile(path);
        res.writeHead(200, { "Content-Type": TYPES[extname(path)] ?? "application/octet-stream" });
        res.end(body);
        console.log(`  200  ${req.url}  (${body.length} bytes)`);
    } catch {
        res.writeHead(404).end("Not found");
        console.log(`  404  ${req.url}`);
    }
});

// Skip virtual adapters -- the phone can't reach VMware/VirtualBox/WSL networks.
const lanIp = Object.entries(networkInterfaces())
    .filter(([name]) => !/vmware|virtualbox|vethernet|wsl|loopback/i.test(name))
    .flatMap(([, addrs]) => addrs ?? [])
    .find((a) => a.family === "IPv4" && !a.internal)?.address;

console.log("Building...");
if (!await build()) {
    console.error("Build failed -- fix the error above and rerun.");
    process.exit(1);
}

server.listen(port, "0.0.0.0", () => {
    console.log(`\nServing ${DIST} on port ${port}`);
    console.log(`\n  Install URL:  http://${lanIp ?? "localhost"}:${port}/staff-tags/`);
    console.log(`  (phone and PC must share a network; allow node through the firewall)\n`);
});

if (shouldWatch) {
    let timer;
    watch(new URL("./plugins/", import.meta.url), { recursive: true }, (_, file) => {
        if (!file || /[\\/]node_modules[\\/]/.test(file)) return;
        clearTimeout(timer);
        timer = setTimeout(async () => {
            console.log(`\nChanged: ${file} -- rebuilding`);
            await build();
            console.log("Rebuilt. Reload the plugin in the client.\n");
        }, 250);
    });
    console.log("Watching plugins/ for changes.\n");
}
