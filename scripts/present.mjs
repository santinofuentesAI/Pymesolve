// Arranque de presentación. Levanta la mesa (8787) y Vite (5173)
// solo si no responden. Un proceso que ya da 200 no se toca: Cavos
// vuelve a http://localhost:5173 y ese puerto tiene que seguir vivo.
import { spawn } from "node:child_process"
import { lookup } from "node:dns/promises"
import { closeSync, openSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const logPath = "/tmp/pymesolve-present.log"

async function httpStatus(url) {
	const ctrl = new AbortController()
	const timer = setTimeout(() => ctrl.abort(), 2500)
	try {
		const res = await fetch(url, { signal: ctrl.signal, redirect: "manual" })
		return res.status
	} catch {
		return 0
	} finally {
		clearTimeout(timer)
	}
}

function sleep(ms) {
	return new Promise((resolveSleep) => setTimeout(resolveSleep, ms))
}

async function viteUrls() {
	const urls = ["http://127.0.0.1:5173/", "http://localhost:5173/"]
	try {
		const addrs = await lookup("localhost", { all: true })
		if (addrs.some((addr) => addr.address === "::1")) {
			urls.push("http://[::1]:5173/")
		}
	} catch {
		// localhost sigue en la lista.
	}
	return urls
}

async function probe(urls) {
	const rows = []
	for (const url of urls) rows.push([url, await httpStatus(url)])
	return rows
}

function startDetached(args, cwd, extraEnv = {}) {
	const logFd = openSync(logPath, "a")
	const child = spawn(process.execPath, args, {
		cwd,
		detached: true,
		stdio: ["ignore", logFd, logFd],
		env: { ...process.env, ...extraEnv },
	})
	child.unref()
	closeSync(logFd)
	return child.pid
}

async function waitFor(label, urls, ok) {
	const deadline = Date.now() + 25_000
	let last = []
	while (Date.now() < deadline) {
		last = await probe(urls)
		if (ok(last)) return last
		await sleep(400)
	}
	console.error(`${label} no llegó a tiempo.`)
	for (const [url, code] of last) console.error(`  ${url} → ${code || "sin conexión"}`)
	console.error(`Log: ${logPath}`)
	process.exit(1)
}

const mesaUrl = "http://127.0.0.1:8787/api/health"
let mesa = await httpStatus(mesaUrl)
if (mesa === 0) {
	await sleep(600)
	mesa = await httpStatus(mesaUrl)
}
if (mesa === 200) {
	console.log("Mesa ya responde 200 en http://127.0.0.1:8787/api/health. No la toco.")
} else if (mesa !== 0) {
	console.log(`Mesa ocupa el 8787 (HTTP ${mesa}). No la mato.`)
} else {
	const pid = startDetached([resolve(root, "server/index.mjs")], root)
	console.log(`Mesa no respondía. La levanté (pid ${pid}).`)
	await waitFor("Mesa", [mesaUrl], (rows) => rows.every(([, code]) => code === 200))
	console.log("Mesa en 200.")
}

const urls = await viteUrls()
let vite = await probe(urls)
const viteOk = (rows) => rows.every(([, code]) => code === 200)
const viteAny = (rows) => rows.some(([, code]) => code === 200)
if (!viteOk(vite) && vite.every(([, code]) => code === 0)) {
	await sleep(600)
	vite = await probe(urls)
}
if (viteOk(vite)) {
	console.log("Vite ya responde 200 en 5173. No lo toco.")
	for (const [url, code] of vite) console.log(`  ${code} ${url}`)
} else if (viteAny(vite)) {
	console.log("Vite ya responde en 5173. No lo reinicio.")
	for (const [url, code] of vite) console.log(`  ${code || "sin conexión"} ${url}`)
} else {
	const viteBin = resolve(root, "node_modules/vite/bin/vite.js")
	const pid = startDetached(
		[viteBin, "--host", "--port", "5173", "--strictPort"],
		resolve(root, "app"),
		{ PYMESOLVE_PRESENT: "1" },
	)
	console.log(`Vite no respondía. Lo levanté en el puerto 5173 (pid ${pid}).`)
	const ready = await waitFor("Vite", urls, viteOk)
	for (const [url, code] of ready) console.log(`  ${code} ${url}`)
}

console.log("Demo: http://localhost:5173")

if (process.argv.includes("--hold")) {
	console.log("Vigilo 5173 y 8787. Si uno cae, lo levanto. No mato uno que ya responde.")
	for (;;) {
		await sleep(3000)
		const mesaNow = await httpStatus(mesaUrl)
		if (mesaNow === 0) {
			const pid = startDetached([resolve(root, "server/index.mjs")], root)
			console.log(`Mesa caída. La levanté (pid ${pid}).`)
		}
		const viteNow = await probe(await viteUrls())
		if (viteNow.every(([, code]) => code === 0)) {
			const viteBin = resolve(root, "node_modules/vite/bin/vite.js")
			const pid = startDetached(
				[viteBin, "--host", "--port", "5173", "--strictPort"],
				resolve(root, "app"),
				{ PYMESOLVE_PRESENT: "1" },
			)
			console.log(`Vite caído. Lo levanté sin recarga en caliente (pid ${pid}).`)
		}
	}
}
