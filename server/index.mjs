import { createServer } from "node:http"
import { db, nowIso, resetDemo } from "./db.mjs"
import { handleFondoAsync } from "./fondo.mjs"
import { writeBrief } from "./brief.mjs"
import { findTwins, suggestGroups, summarize } from "./match.mjs"
import {
	askGemma,
	encargoBriefFallback,
	gemmaReady,
	oficioBulletsFallback,
	pymeBulletsFallback,
	twinSummaryFallback,
} from "./gemma.mjs"
import { maskLedgerRow } from "./ledger.mjs"
import { ftsQuery, listProblems, problemRow } from "./problems.mjs"

export { ftsQuery, listProblems, problemRow }

const PORT = Number(process.env.ENCOMUN_PORT ?? 8787)

function send(res, status, body) {
	const json = JSON.stringify(body)
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"access-control-allow-origin": "*",
		"access-control-allow-headers": "content-type, x-actor-id, x-role",
		"access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
	})
	res.end(json)
}

function empty(res) {
	res.writeHead(204, {
		"access-control-allow-origin": "*",
		"access-control-allow-headers": "content-type, x-actor-id, x-role",
		"access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
	})
	res.end()
}

async function readBody(req) {
	const chunks = []
	for await (const c of req) chunks.push(c)
	if (!chunks.length) return {}
	return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")
}

function actorOf(req) {
	return {
		id: req.headers["x-actor-id"] || "",
		role: req.headers["x-role"] || "",
	}
}

function unaOracion(text) {
	const clean = String(text ?? "")
		.replace(/\s+/g, " ")
		.trim()
	if (!clean) return "Todavía no se presentó."
	const cut = clean.search(/[.!?]/)
	const line = cut === -1 ? clean : clean.slice(0, cut + 1)
	if (line.length <= 160) return line
	return `${line.slice(0, 157).trimEnd()}…`
}

function poolMembers(poolId) {
	return db
		.prepare(
			`SELECT m.*, u.name, u.neighborhood, u.trade
			 FROM pool_members m JOIN users u ON u.id = m.pyme_id
			 WHERE m.pool_id = ?`,
		)
		.all(poolId)
}

function poolDetail(id) {
	const pool = db.prepare("SELECT * FROM pools WHERE id = ?").get(id)
	if (!pool) return null
	const members = poolMembers(id)
	const problems = db
		.prepare(
			`SELECT p.*, u.name AS pyme_name, u.neighborhood
			 FROM problems p JOIN users u ON u.id = p.pyme_id
			 WHERE p.pool_id = ?`,
		)
		.all(id)
		.map(problemRow)
	const deliveries = db
		.prepare("SELECT * FROM deliveries WHERE pool_id = ? ORDER BY id")
		.all(id)
	const summon = db
		.prepare(
			"SELECT * FROM summons WHERE pool_id = ? ORDER BY id DESC LIMIT 1",
		)
		.get(id)
	const dev = pool.dev_id
		? db.prepare("SELECT * FROM users WHERE id = ?").get(pool.dev_id)
		: null
	const offers = db
		.prepare(
			`SELECT o.*, u.name AS actor_name
			 FROM offers o JOIN users u ON u.id = o.actor_id
			 WHERE o.pool_id = ? ORDER BY o.id DESC`,
		)
		.all(id)
	return { ...pool, members, problems, deliveries, summon, dev, offers }
}

async function briefForPool(pool) {
	const problems = pool?.problems ?? []
	if (problems.length === 0) return { ...encargoBriefFallback([]), ia: false }
	const key = `pool:${pool.id}:brief`
	const cached = db.prepare("SELECT bullets FROM card_copy WHERE key = ?").get(key)
	if (cached) {
		try {
			const parsed = JSON.parse(cached.bullets)
			if (parsed?.lede) return parsed
		} catch {
			/* fall through */
		}
	}
	const lines = problems
		.map(
			(p) =>
				`${p.pymeName} (${p.neighborhood}): ${p.title}. ${p.body} (${p.amountUsdc} USDC)`,
		)
		.join("\n")
	const packed = await askGemma(
		`JSON {"lede":"2 a 4 oraciones","puntos":["..."]}. Estos comercios juntaron UN encargo. Decí exactamente qué hay que entregar el lunes, qué es igual para todos y qué cambia por comercio. Un punto por comercio, con el nombre. Español de mostrador. Sin jerga.\n${lines}`,
	)
	const fallback = encargoBriefFallback(problems)
	const puntos = Array.isArray(packed?.puntos)
		? packed.puntos.map((p) => String(p)).filter(Boolean).slice(0, problems.length)
		: []
	const brief = {
		lede: packed?.lede ? String(packed.lede) : fallback.lede,
		puntos: puntos.length > 0 ? puntos : fallback.puntos,
		ia: Boolean(packed?.lede),
	}
	db.prepare(
		"INSERT OR REPLACE INTO card_copy (key, bullets, created_at) VALUES (?, ?, ?)",
	).run(key, JSON.stringify(brief), nowIso())
	return brief
}

async function bulletsFor(user) {
	const key = `user:${user.id}:${user.verified}`
	const cached = db.prepare("SELECT bullets FROM card_copy WHERE key = ?").get(key)
	if (cached) {
		try {
			return JSON.parse(cached.bullets)
		} catch {
			/* fall through */
		}
	}
	const problem = db
		.prepare(
			"SELECT title, body, category FROM problems WHERE pyme_id = ? ORDER BY id DESC LIMIT 1",
		)
		.get(user.id)
	const done = db
		.prepare(
			"SELECT title FROM pools WHERE dev_id = ? AND status IN ('Released','Resolved')",
		)
		.all(user.id)
		.map((p) => p.title)
	const packed = await askGemma(
		user.kind === "dev"
			? `Tres viñetas JSON {"bullets":["","",""]} sobre este oficio. Nombre ${user.name}. Oficio ${user.trade}. Bio ${user.bio}. Verificado ${user.verified}. Trabajos: ${done.join(", ") || "ninguno"}. Concreto: qué entrega, a quién, el lunes.`
			: `JSON {"bullets":["","","",""]}. Cuatro pasos del LUNES, concretos, para este comercio. Dónde se para, a qué hora, qué se filma o qué se pone en la página, qué texto, qué no hacer. Nombre ${user.name} en ${user.neighborhood}. Pedido: ${problem?.title ?? ""} ${problem?.body ?? ""}. Bio: ${user.bio}. Sin "si el vecino". Sin agencia. Sin abstracciones.`,
	)
	const bullets =
		Array.isArray(packed?.bullets) && packed.bullets.length >= 3
			? packed.bullets.slice(0, 5).map((b) => String(b))
			: user.kind === "dev"
				? oficioBulletsFallback(user)
				: pymeBulletsFallback(problem, user)
	db.prepare(
		"INSERT OR REPLACE INTO card_copy (key, bullets, created_at) VALUES (?, ?, ?)",
	).run(key, JSON.stringify(bullets), nowIso())
	return bullets
}

function messagesFor(poolId) {
	return db
		.prepare(
			`SELECT m.*, u.name AS actor_name
			 FROM messages m JOIN users u ON u.id = m.actor_id
			 WHERE m.pool_id = ? ORDER BY m.id`,
		)
		.all(poolId)
}

function adminCanReadChat(poolId) {
	const row = db
		.prepare(
			"SELECT id FROM summons WHERE pool_id = ? AND status = 'open' LIMIT 1",
		)
		.get(poolId)
	return Boolean(row)
}

function createPoolFromProblems(problemIds, summary, actorId = "") {
	const problems = problemIds.map((id) =>
		db
			.prepare(
				`SELECT p.*, u.name AS pyme_name FROM problems p
				 JOIN users u ON u.id = p.pyme_id WHERE p.id = ?`,
			)
			.get(id),
	)
	if (problems.some((p) => !p)) return { error: "No está ese problema.", status: 404 }
	if (problems.some((p) => p.pool_id)) {
		return { error: "Uno de esos problemas ya está en un encargo.", status: 409 }
	}
	const cats = new Set(problems.map((p) => p.category))
	if (cats.size !== 1) {
		return { error: "Solo se juntan problemas del mismo rubro.", status: 400 }
	}
	const category = problems[0].category
	const title = problems[0].title
	const committed = problems.reduce((s, p) => s + Number(p.amount_usdc), 0)
	const text = summary || summarize(category, problems)
	const info = db
		.prepare(
			`INSERT INTO pools (title, category, summary, status, committed_usdc, created_at)
			 VALUES (?, ?, ?, 'Proposed', ?, ?)`,
		)
		.run(title, category, text, committed, nowIso())
	const poolId = Number(info.lastInsertRowid)
	const byPyme = new Map()
	for (const p of problems) {
		db.prepare("UPDATE problems SET pool_id = ? WHERE id = ?").run(poolId, p.id)
		const prev = byPyme.get(p.pyme_id) ?? 0
		byPyme.set(p.pyme_id, prev + Number(p.amount_usdc))
	}
	for (const [pymeId, amount] of byPyme) {
		const joined = pymeId === actorId ? 1 : 0
		db.prepare(
			`INSERT INTO pool_members (pool_id, pyme_id, joined, amount_usdc) VALUES (?, ?, ?, ?)`,
		).run(poolId, pymeId, joined, amount)
	}
	return { pool: poolDetail(poolId) }
}

const server = createServer(async (req, res) => {
	try {
		if (req.method === "OPTIONS") return empty(res)
		const url = new URL(req.url ?? "/", "http://127.0.0.1")
		const path = url.pathname
		const actor = actorOf(req)

		if (path === "/api/health") return send(res, 200, { ok: true })

		if (path === "/api/reset" && req.method === "POST") {
			return send(res, 200, resetDemo())
		}

		if (await handleFondoAsync(req, res, path, actor, send, readBody)) return

		if (path === "/api/pymes" && req.method === "GET") {
			const rows = db
				.prepare("SELECT * FROM users WHERE kind = 'pyme' ORDER BY name")
				.all()
			return send(res, 200, rows)
		}

		if (path === "/api/devs" && req.method === "GET") {
			const rows = db
				.prepare("SELECT * FROM users WHERE kind = 'dev' ORDER BY name")
				.all()
			return send(res, 200, rows)
		}

		if (path === "/api/problems" && req.method === "GET") {
			return send(
				res,
				200,
				listProblems({
					q: url.searchParams.get("q") ?? "",
					category: url.searchParams.get("category") ?? "",
				}),
			)
		}

		if (path === "/api/twins" && req.method === "GET") {
			const title = url.searchParams.get("title") ?? ""
			const body = url.searchParams.get("body") ?? ""
			const category = url.searchParams.get("category") ?? ""
			const excludeId = Number(url.searchParams.get("excludeId") ?? 0) || undefined
			const twins = findTwins(listProblems({ category }), { title, body, category }, { excludeId }).slice(0, 3)
			const names = twins.map((t) => t.pymeName)
			const amountUsdc = twins.reduce((s, t) => s + Number(t.amountUsdc), 0)
			let summary = twinSummaryFallback(category, names, twins.length || 1)
			if (twins.length > 0) {
				const packed = await askGemma(
					`JSON {"summary":"..."}. ${twins.length} comercios piden lo mismo en ${category}: ${twins.map((t) => t.title).join("; ")}. Decilo en cristiano, una o dos oraciones. Empieza con el número de comercios.`,
				)
				if (packed?.summary) summary = String(packed.summary)
			}
			return send(res, 200, { twins, summary, amountUsdc })
		}

		if (path === "/api/gemma" && req.method === "GET") {
			return send(res, 200, await gemmaReady())
		}

		const userMatch = path.match(/^\/api\/users\/([^/]+)$/)
		if (userMatch && req.method === "GET") {
			const row = db.prepare("SELECT * FROM users WHERE id = ?").get(decodeURIComponent(userMatch[1]))
			if (!row) return send(res, 404, { error: "No está esa persona." })
			const pedido =
				row.kind === "pyme"
					? db
							.prepare(
								"SELECT title, body, category FROM problems WHERE pyme_id = ? ORDER BY id DESC LIMIT 1",
							)
							.get(row.id)
					: null
			return send(res, 200, {
				...row,
				bullets: await bulletsFor(row),
				pedido: pedido
					? {
							title: pedido.title,
							body: pedido.body,
							category: pedido.category,
						}
					: undefined,
			})
		}

		if (path === "/api/profile" && req.method === "POST") {
			const body = await readBody(req)
			const kind = body.kind === "dev" ? "dev" : "pyme"
			const id = String(body.id ?? actor.id ?? `${kind}-${Date.now()}`)
			db.prepare(
				`INSERT INTO users (id, kind, name, trade, bio, neighborhood, verified, github, drive, social, linkedin, demo)
				 VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 0)
				 ON CONFLICT(id) DO UPDATE SET
				   name=excluded.name, trade=excluded.trade, bio=excluded.bio,
				   neighborhood=excluded.neighborhood, github=excluded.github,
				   drive=excluded.drive, social=excluded.social, linkedin=excluded.linkedin`,
			).run(
				id,
				kind,
				body.name,
				body.trade ?? "",
				body.bio ?? "",
				body.neighborhood ?? "",
				body.github ?? null,
				body.drive ?? null,
				body.social ?? null,
				body.linkedin ?? null,
			)
			if (kind === "dev") {
				const proofs = [
					body.github ? ["github", /^https?:/.test(body.github) ? body.github : `https://github.com/${body.github}`] : null,
					body.drive ? ["drive", body.drive] : null,
					body.social ? ["portfolio", body.social] : null,
					body.linkedin ? [/fiverr/i.test(body.linkedin) ? "fiverr" : "linkedin", body.linkedin] : null,
				].filter(Boolean)
				for (const [kindProof, url] of proofs) {
					const exists = db
						.prepare("SELECT id FROM proofs WHERE user_id = ? AND url = ?")
						.get(id, url)
					if (!exists) {
						db.prepare(
							`INSERT INTO proofs (user_id, kind, url, note, status, created_at)
							 VALUES (?, ?, ?, 'Esperando a la mesa.', 'pendiente', ?)`,
						).run(id, kindProof, url, nowIso())
					}
				}
			}
			db.prepare("DELETE FROM card_copy WHERE key LIKE ?").run(`user:${id}:%`)
			return send(res, 201, db.prepare("SELECT * FROM users WHERE id = ?").get(id))
		}

		if (path === "/api/cards" && req.method === "GET") {
			const kind = url.searchParams.get("kind") === "dev" ? "dev" : "pyme"
			const rows = db.prepare("SELECT * FROM users WHERE kind = ? ORDER BY name").all(kind)
			const cards = []
			for (const row of rows) {
				const pedido =
					row.kind === "pyme"
						? db
								.prepare(
									"SELECT title, body, category FROM problems WHERE pyme_id = ? ORDER BY id DESC LIMIT 1",
								)
								.get(row.id)
						: null
				cards.push({
					...row,
					bullets:
						row.kind === "dev"
							? oficioBulletsFallback(row)
							: pymeBulletsFallback(pedido, row),
					pedido: pedido
						? {
								title: pedido.title,
								body: pedido.body,
								category: pedido.category,
							}
						: undefined,
				})
			}
			return send(res, 200, { cards })
		}

		if (path === "/api/interests" && req.method === "GET") {
			if (!actor.id) return send(res, 200, [])
			const rows = db
				.prepare(
					`SELECT u.id, u.name, u.kind, u.bio, u.trade, u.neighborhood
					 FROM interests i JOIN users u ON u.id = i.target_id
					 WHERE i.actor_id = ?
					 ORDER BY i.id DESC`,
				)
				.all(actor.id)
			return send(
				res,
				200,
				rows.map((row) => ({
					id: row.id,
					name: row.name,
					kind: row.kind,
					trade: row.trade,
					neighborhood: row.neighborhood,
					line: unaOracion(row.bio),
				})),
			)
		}

		if (path === "/api/dms" && req.method === "POST") {
			const body = await readBody(req)
			const target = String(body.targetId ?? "")
			if (!actor.id || !target || target === actor.id) {
				return send(res, 400, { error: "Elegí a quién le escribís." })
			}
			const liked = db
				.prepare(
					"SELECT 1 AS ok FROM interests WHERE actor_id = ? AND target_id = ?",
				)
				.get(actor.id, target)
			const likedBack = db
				.prepare(
					"SELECT 1 AS ok FROM interests WHERE actor_id = ? AND target_id = ?",
				)
				.get(target, actor.id)
			if (!liked && !likedBack) {
				return send(res, 403, { error: "Primero marcá Me sirve." })
			}
			const low = actor.id < target ? actor.id : target
			const high = actor.id < target ? target : actor.id
			db.prepare(
				`INSERT INTO dms (low_id, high_id, created_at) VALUES (?, ?, ?)
				 ON CONFLICT(low_id, high_id) DO NOTHING`,
			).run(low, high, nowIso())
			const row = db
				.prepare("SELECT id FROM dms WHERE low_id = ? AND high_id = ?")
				.get(low, high)
			return send(res, 200, { id: row.id })
		}

		const dmMatch = path.match(/^\/api\/dms\/(\d+)\/messages$/)
		if (dmMatch) {
			const dmId = Number(dmMatch[1])
			const dm = db.prepare("SELECT * FROM dms WHERE id = ?").get(dmId)
			if (!dm) return send(res, 404, { error: "No está ese chat." })
			if (actor.id !== dm.low_id && actor.id !== dm.high_id) {
				return send(res, 403, { error: "Ese chat no es tuyo." })
			}
			if (req.method === "GET") {
				const rows = db
					.prepare(
						`SELECT m.id, m.actor_id, u.name AS actor_name, u.kind AS role, m.body, m.created_at
						 FROM dm_messages m JOIN users u ON u.id = m.actor_id
						 WHERE m.dm_id = ?
						 ORDER BY m.id`,
					)
					.all(dmId)
				return send(res, 200, rows)
			}
			if (req.method === "POST") {
				const body = await readBody(req)
				const text = String(body.body ?? "").trim()
				if (!text) return send(res, 400, { error: "Escribí algo." })
				db.prepare(
					`INSERT INTO dm_messages (dm_id, actor_id, body, created_at)
					 VALUES (?, ?, ?, ?)`,
				).run(dmId, actor.id, text.slice(0, 500), nowIso())
				const rows = db
					.prepare(
						`SELECT m.id, m.actor_id, u.name AS actor_name, u.kind AS role, m.body, m.created_at
						 FROM dm_messages m JOIN users u ON u.id = m.actor_id
						 WHERE m.dm_id = ?
						 ORDER BY m.id`,
					)
					.all(dmId)
				return send(res, 201, rows)
			}
		}

		if (path === "/api/interests" && req.method === "POST") {
			const body = await readBody(req)
			if (!actor.id) return send(res, 401, { error: "Elegí quién sos en Ajustes." })
			try {
				db.prepare(
					`INSERT INTO interests (actor_id, target_id, kind, created_at) VALUES (?, ?, ?, ?)`,
				).run(actor.id, String(body.targetId), body.kind === "dev" ? "dev" : "pyme", nowIso())
			} catch {
				/* already saved */
			}
			return send(res, 201, { ok: true })
		}

		if (path === "/api/ledger" && req.method === "GET") {
			const rows = db
				.prepare(
					`SELECT m.created_at AS at, m.actor_id, u.name AS actor_name, u.kind, m.body
					 FROM messages m JOIN users u ON u.id = m.actor_id
					 ORDER BY m.id DESC LIMIT 40`,
				)
				.all()
			return send(
				res,
				200,
				rows.map((row) => maskLedgerRow(row, actor)),
			)
		}

		if (path === "/api/groups" && req.method === "GET") {
			const problems = db
				.prepare(
					`SELECT p.*, u.name AS pyme_name FROM problems p
					 JOIN users u ON u.id = p.pyme_id`,
				)
				.all()
			return send(res, 200, suggestGroups(problems))
		}

		if (path === "/api/problems" && req.method === "POST") {
			const body = await readBody(req)
			if (!actor.id) return send(res, 401, { error: "Elegí una pyme en Ajustes." })
			const info = db
				.prepare(
					`INSERT INTO problems (pyme_id, title, category, body, amount_usdc, created_at)
					 VALUES (?, ?, ?, ?, ?, ?)`,
				)
				.run(
					actor.id,
					String(body.title ?? "").slice(0, 80),
					String(body.category ?? "").slice(0, 40),
					String(body.body ?? ""),
					Number(body.amountUsdc ?? 10),
					nowIso(),
				)
			const id = Number(info.lastInsertRowid)
			db.prepare(
				`INSERT INTO problems_fts (rowid, title, category, body) VALUES (?, ?, ?, ?)`,
			).run(id, body.title, body.category, body.body)
			if (body.chainId != null) {
				db.prepare("UPDATE problems SET chain_id = ? WHERE id = ?").run(
					body.chainId,
					id,
				)
			}
			return send(res, 201, problemRow(
				db.prepare(
					`SELECT p.*, u.name AS pyme_name, u.neighborhood
					 FROM problems p JOIN users u ON u.id = p.pyme_id WHERE p.id = ?`,
				).get(id),
			))
		}

		if (path === "/api/pools" && req.method === "GET") {
			const rows = db.prepare("SELECT * FROM pools ORDER BY id DESC").all()
			return send(
				res,
				200,
				rows.map((p) => ({ ...p, members: poolMembers(p.id) })),
			)
		}

		if (path === "/api/moldes" && req.method === "GET") {
			const mine = url.searchParams.get("mine") === "1"
			const rows = db
				.prepare(
					`SELECT p.id, p.title, p.category, p.summary, p.letter, p.dev_id, p.committed_usdc,
					        u.name AS dev_name
					 FROM pools p JOIN users u ON u.id = p.dev_id
					 WHERE p.status = 'Released' AND p.letter IS NOT NULL
					   AND (? = '' OR p.dev_id = ?)
					 ORDER BY p.id DESC`,
				)
				.all(mine ? actor.id : "", mine ? actor.id : "")
			return send(
				res,
				200,
				rows.map((row) => ({
					id: row.id,
					title: row.title,
					category: row.category,
					summary: row.summary,
					letter: row.letter,
					devId: row.dev_id,
					devName: row.dev_name,
					shareUsdc: 10,
					soloUsdc: row.committed_usdc,
					waiting: db
						.prepare("SELECT COUNT(*) AS n FROM molde_signups WHERE pool_id = ?")
						.get(row.id).n,
					joined: Boolean(
						actor.id &&
							db
								.prepare(
									"SELECT 1 AS ok FROM molde_signups WHERE pool_id = ? AND actor_id = ?",
								)
								.get(row.id, actor.id),
					),
				})),
			)
		}

		const moldeJoin = path.match(/^\/api\/moldes\/(\d+)\/sumar$/)
		if (moldeJoin && req.method === "POST") {
			if (actor.role !== "pyme" || !actor.id) {
				return send(res, 403, { error: "Solo un comercio se suma a un molde." })
			}
			const id = Number(moldeJoin[1])
			const molde = db
				.prepare(
					"SELECT id FROM pools WHERE id = ? AND status = 'Released' AND letter IS NOT NULL",
				)
				.get(id)
			if (!molde) return send(res, 404, { error: "Ese molde no está." })
			db.prepare(
				`INSERT OR IGNORE INTO molde_signups (pool_id, actor_id, created_at) VALUES (?, ?, ?)`,
			).run(id, actor.id, nowIso())
			const waiting = db
				.prepare("SELECT COUNT(*) AS n FROM molde_signups WHERE pool_id = ?")
				.get(id).n
			return send(res, 200, { ok: true, waiting })
		}

		if (path === "/api/recipes" && req.method === "GET") {
			const rows = db
				.prepare(
					`SELECT * FROM pools WHERE status IN ('Released', 'Resolved') AND letter IS NOT NULL
					 ORDER BY id DESC`,
				)
				.all()
			return send(
				res,
				200,
				rows.map((p) => ({
					...p,
					members: poolMembers(p.id),
					deliveries: db
						.prepare("SELECT * FROM deliveries WHERE pool_id = ?")
						.all(p.id),
					ecos: db
						.prepare(
							`SELECT e.*, u.name AS pyme_name FROM ecos e
							 JOIN users u ON u.id = e.pyme_id WHERE e.pool_id = ?`,
						)
						.all(p.id),
				})),
			)
		}

		const ecoMatch = path.match(/^\/api\/recipes\/(\d+)\/eco$/)
		if (ecoMatch && req.method === "POST") {
			const id = Number(ecoMatch[1])
			if (actor.role !== "pyme" || !actor.id) {
				return send(res, 403, { error: "Solo un comercio puede dejar un eco." })
			}
			const body = await readBody(req)
			try {
				db.prepare(
					`INSERT INTO ecos (pool_id, pyme_id, note, created_at) VALUES (?, ?, ?, ?)`,
				).run(id, actor.id, String(body.note ?? "Lo usamos en el local."), nowIso())
			} catch {
				return send(res, 409, { error: "Este comercio ya dejó su eco." })
			}
			return send(res, 201, { ok: true })
		}

		if (path === "/api/pools" && req.method === "POST") {
			const body = await readBody(req)
			const created = createPoolFromProblems(body.problemIds ?? [], body.summary, actor.id)
			if (created.error) return send(res, created.status, { error: created.error })
			return send(res, 201, created.pool)
		}

		const poolMatch = path.match(/^\/api\/pools\/(\d+)$/)
		if (poolMatch && req.method === "GET") {
			const pool = poolDetail(Number(poolMatch[1]))
			if (!pool) return send(res, 404, { error: "No está ese encargo." })
			return send(res, 200, { ...pool, brief: await briefForPool(pool) })
		}

		if (poolMatch && req.method === "PATCH") {
			const id = Number(poolMatch[1])
			const body = await readBody(req)
			const allowed = [
				"status",
				"chain_id",
				"escrow",
				"dev_id",
				"letter",
				"letter_hash",
				"committed_usdc",
			]
			for (const key of allowed) {
				const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
				if (body[camel] !== undefined || body[key] !== undefined) {
					db.prepare(`UPDATE pools SET ${key} = ? WHERE id = ?`).run(
						body[camel] ?? body[key],
						id,
					)
				}
			}
			return send(res, 200, poolDetail(id))
		}

		const joinMatch = path.match(/^\/api\/pools\/(\d+)\/join$/)
		if (joinMatch && req.method === "POST") {
			const id = Number(joinMatch[1])
			if (!actor.id) return send(res, 401, { error: "Elegí una pyme en Ajustes." })
			const member = db
				.prepare("SELECT * FROM pool_members WHERE pool_id = ? AND pyme_id = ?")
				.get(id, actor.id)
			if (!member) return send(res, 403, { error: "Este encargo no es de tu comercio." })
			db.prepare(
				"UPDATE pool_members SET joined = 1 WHERE pool_id = ? AND pyme_id = ?",
			).run(id, actor.id)
			const pending = db
				.prepare(
					"SELECT COUNT(*) AS n FROM pool_members WHERE pool_id = ? AND joined = 0",
				)
				.get(id).n
			if (pending === 0) {
				db.prepare("UPDATE pools SET status = 'Open' WHERE id = ? AND status = 'Proposed'").run(id)
			}
			db.prepare(
				`INSERT INTO messages (pool_id, actor_id, role, kind, body, created_at)
				 VALUES (?, ?, 'pyme', 'system', ?, ?)`,
			).run(id, actor.id, "Confirmó que entra. Su parte ya cuenta.", nowIso())
			return send(res, 200, poolDetail(id))
		}

		const claimMatch = path.match(/^\/api\/pools\/(\d+)\/claim$/)
		if (claimMatch && req.method === "POST") {
			const id = Number(claimMatch[1])
			const body = await readBody(req)
			if (actor.role !== "dev") return send(res, 403, { error: "Solo un dev verificado toma encargos." })
			const dev = db.prepare("SELECT * FROM users WHERE id = ?").get(actor.id)
			if (!dev?.verified) {
				return send(res, 403, { error: "La mesa todavía no te verificó." })
			}
			if (body.wallet) {
				db.prepare("UPDATE users SET wallet = ? WHERE id = ?").run(
					body.wallet,
					actor.id,
				)
			}
			const took = db.prepare(
				"UPDATE pools SET dev_id = ?, status = 'Claimed' WHERE id = ? AND status = 'Open'",
			).run(actor.id, id)
			if (took.changes > 0) {
				db.prepare(
					`INSERT INTO messages (pool_id, actor_id, role, kind, body, created_at)
					 VALUES (?, ?, 'dev', 'system', ?, ?)`,
				).run(id, actor.id, `${dev.name} tomó el trabajo. Se abre el chat.`, nowIso())
			}
			return send(res, 200, poolDetail(id))
		}

		const msgMatch = path.match(/^\/api\/pools\/(\d+)\/messages$/)
		if (msgMatch && req.method === "GET") {
			const id = Number(msgMatch[1])
			if (actor.role === "admin" && !adminCanReadChat(id)) {
				return send(res, 403, {
					error: "El asistente solo ve los chats donde lo llamaron.",
				})
			}
			return send(res, 200, messagesFor(id))
		}

		if (msgMatch && req.method === "POST") {
			const id = Number(msgMatch[1])
			const body = await readBody(req)
			if (actor.role === "admin" && !adminCanReadChat(id)) {
				return send(res, 403, { error: "No te llamaron a este encargo." })
			}
			db.prepare(
				`INSERT INTO messages (pool_id, actor_id, role, kind, body, created_at)
				 VALUES (?, ?, ?, 'chat', ?, ?)`,
			).run(id, actor.id, actor.role || "pyme", String(body.body ?? "").slice(0, 2000), nowIso())
			return send(res, 201, messagesFor(id))
		}

		const deliverMatch = path.match(/^\/api\/pools\/(\d+)\/deliver$/)
		if (deliverMatch && req.method === "POST") {
			const id = Number(deliverMatch[1])
			const body = await readBody(req)
			db.prepare(
				`INSERT INTO deliveries (pool_id, kind, url, explanation, created_at)
				 VALUES (?, ?, ?, ?, ?)`,
			).run(
				id,
				body.kind === "plan" ? "plan" : "delivery",
				String(body.url ?? ""),
				String(body.explanation ?? ""),
				nowIso(),
			)
			if (body.letter) {
				db.prepare("UPDATE pools SET letter = ?, letter_hash = ? WHERE id = ?").run(
					body.letter,
					body.letterHash ?? "",
					id,
				)
			}
			if (body.kind !== "plan") {
				db.prepare(
					"UPDATE pools SET status = 'Funded' WHERE id = ? AND status IN ('Funded','EscrowReady','Claimed')",
				).run(id)
			}
			return send(res, 201, poolDetail(id))
		}

		const fundMatch = path.match(/^\/api\/pools\/(\d+)\/fund$/)
		if (fundMatch && req.method === "POST") {
			const id = Number(fundMatch[1])
			db.prepare(
				"UPDATE pool_members SET funded = 1 WHERE pool_id = ? AND pyme_id = ?",
			).run(id, actor.id)
			const left = db
				.prepare(
					"SELECT COUNT(*) AS n FROM pool_members WHERE pool_id = ? AND funded = 0",
				)
				.get(id).n
			if (left === 0) {
				db.prepare("UPDATE pools SET status = 'Funded' WHERE id = ?").run(id)
			} else {
				db.prepare("UPDATE pools SET status = 'EscrowReady' WHERE id = ? AND status = 'Claimed'").run(id)
			}
			return send(res, 200, poolDetail(id))
		}

		const voteMatch = path.match(/^\/api\/pools\/(\d+)\/vote$/)
		if (voteMatch && req.method === "POST") {
			const id = Number(voteMatch[1])
			const body = await readBody(req)
			db.prepare(
				"UPDATE pool_members SET vote = ? WHERE pool_id = ? AND pyme_id = ?",
			).run(body.accept ? 1 : 0, id, actor.id)
			const members = poolMembers(id)
			const yes = members.filter((m) => m.vote === 1).length
			if (yes * 2 > members.length) {
				db.prepare("UPDATE pools SET status = 'Delivered' WHERE id = ?").run(id)
			}
			return send(res, 200, poolDetail(id))
		}

		const summonMatch = path.match(/^\/api\/pools\/(\d+)\/summon$/)
		if (summonMatch && req.method === "POST") {
			const id = Number(summonMatch[1])
			const body = await readBody(req)
			const reason = String(body.reason ?? "").trim()
			if (!reason) return send(res, 400, { error: "Escribí por qué querés pagar menos." })
			const info = db
				.prepare(
					`INSERT INTO summons (pool_id, caller_id, reason, status, created_at)
					 VALUES (?, ?, ?, 'open', ?)`,
				)
				.run(id, actor.id, reason, nowIso())
			db.prepare(
				`INSERT INTO messages (pool_id, actor_id, role, kind, body, created_at)
				 VALUES (?, ?, 'pyme', 'system', ?, ?)`,
			).run(
				id,
				actor.id,
				`Llamó a la mesa: «${reason}». La mesa entra solo a este chat.`,
				nowIso(),
			)
			const summonId = Number(info.lastInsertRowid)
			const pool = poolDetail(id)
			const brief = writeBrief({
				pool,
				members: pool.members,
				delivery: pool.deliveries.at(-1),
				messages: messagesFor(id),
				summon: { ...body, caller_id: actor.id, reason, created_at: nowIso() },
				problems: pool.problems,
			})
			db.prepare(
				`INSERT INTO briefs (summon_id, body, suggested_dev, suggested_refund, created_at)
				 VALUES (?, ?, ?, ?, ?)`,
			).run(summonId, brief.body, brief.suggestedDev, brief.suggestedRefund, nowIso())
			return send(res, 201, { summonId, pool: poolDetail(id), brief })
		}

		if (path === "/api/summons" && req.method === "GET") {
			if (actor.role !== "admin") {
				return send(res, 403, { error: "Solo el asistente ve esta bandeja." })
			}
			const rows = db
				.prepare(
					`SELECT s.*, p.title, p.committed_usdc, u.name AS caller_name
					 FROM summons s
					 JOIN pools p ON p.id = s.pool_id
					 JOIN users u ON u.id = s.caller_id
					 WHERE s.status = 'open'
					 ORDER BY s.id DESC`,
				)
				.all()
			return send(res, 200, rows)
		}

		const oneSummon = path.match(/^\/api\/summons\/(\d+)$/)
		if (oneSummon && req.method === "GET") {
			if (actor.role !== "admin") return send(res, 403, { error: "Solo el asistente." })
			const id = Number(oneSummon[1])
			const summon = db.prepare("SELECT * FROM summons WHERE id = ?").get(id)
			if (!summon) return send(res, 404, { error: "No está esa llamada." })
			const brief = db
				.prepare(
					"SELECT * FROM briefs WHERE summon_id = ? ORDER BY id DESC LIMIT 1",
				)
				.get(id)
			return send(res, 200, {
				summon,
				brief,
				pool: poolDetail(summon.pool_id),
				messages: messagesFor(summon.pool_id),
			})
		}

		const verdict = path.match(/^\/api\/summons\/(\d+)\/verdict$/)
		if (verdict && req.method === "POST") {
			if (actor.role !== "admin") return send(res, 403, { error: "Solo el asistente firma." })
			const id = Number(verdict[1])
			const body = await readBody(req)
			const summon = db.prepare("SELECT * FROM summons WHERE id = ?").get(id)
			if (!summon) return send(res, 404, { error: "No está esa llamada." })
			db.prepare("UPDATE summons SET status = 'sentenciado' WHERE id = ?").run(id)
			db.prepare("UPDATE pools SET status = 'Resolved' WHERE id = ?").run(summon.pool_id)
			db.prepare(
				`INSERT INTO messages (pool_id, actor_id, role, kind, body, created_at)
				 VALUES (?, ?, 'admin', 'system', ?, ?)`,
			).run(
				summon.pool_id,
				actor.id,
				`Veredicto: se paga ${body.devAmount} USDC al dev. Vuelven ${body.refundAmount} USDC a las pymes.`,
				nowIso(),
			)
			return send(res, 200, poolDetail(summon.pool_id))
		}

		if (path === "/api/devs" && req.method === "POST") {
			const body = await readBody(req)
			const id = String(body.id ?? `dev-${Date.now()}`)
			db.prepare(
				`INSERT INTO users (id, kind, name, trade, bio, neighborhood, verified, github, drive, social, demo)
				 VALUES (?, 'dev', ?, ?, ?, ?, 0, ?, ?, ?, 0)
				 ON CONFLICT(id) DO UPDATE SET
				   name=excluded.name, trade=excluded.trade, bio=excluded.bio,
				   github=excluded.github, drive=excluded.drive, social=excluded.social`,
			).run(
				id,
				body.name,
				body.trade,
				body.bio ?? "",
				body.neighborhood ?? "",
				body.github ?? null,
				body.drive ?? null,
				body.social ?? null,
			)
			if (body.github) {
				db.prepare(
					`INSERT INTO proofs (user_id, kind, url, note, status) VALUES (?, 'github', ?, '', 'pendiente')`,
				).run(id, `https://github.com/${body.github}`)
			}
			if (body.drive) {
				db.prepare(
					`INSERT INTO proofs (user_id, kind, url, note, status) VALUES (?, 'drive', ?, '', 'pendiente')`,
				).run(id, body.drive)
			}
			if (body.social) {
				db.prepare(
					`INSERT INTO proofs (user_id, kind, url, note, status) VALUES (?, 'social', ?, '', 'pendiente')`,
				).run(id, body.social)
			}
			return send(res, 201, db.prepare("SELECT * FROM users WHERE id = ?").get(id))
		}

		if (path === "/api/altas" && req.method === "GET") {
			const pending = db
				.prepare(
					`SELECT pr.*, u.name, u.kind, u.trade FROM proofs pr
					 JOIN users u ON u.id = pr.user_id
					 WHERE pr.status = 'pendiente' ORDER BY pr.id`,
				)
				.all()
			return send(res, 200, pending)
		}

		const verify = path.match(/^\/api\/proofs\/(\d+)$/)
		if (verify && req.method === "PATCH") {
			if (actor.role !== "admin") return send(res, 403, { error: "Solo la mesa." })
			const body = await readBody(req)
			const id = Number(verify[1])
			const proof = db.prepare("SELECT * FROM proofs WHERE id = ?").get(id)
			if (!proof) return send(res, 404, { error: "No está esa prueba." })
			db.prepare("UPDATE proofs SET status = ? WHERE id = ?").run(
				body.status === "aprobado" ? "aprobado" : "rechazado",
				id,
			)
			if (body.status === "aprobado") {
				db.prepare("UPDATE users SET verified = 1 WHERE id = ?").run(proof.user_id)
			}
			return send(res, 200, { ok: true })
		}

		const gh = path.match(/^\/api\/github\/([^/]+)$/)
		if (gh && req.method === "GET") {
			const user = decodeURIComponent(gh[1])
			const [profile, repos] = await Promise.all([
				fetch(`https://api.github.com/users/${user}`, {
					headers: { "user-agent": "encomun" },
				}),
				fetch(`https://api.github.com/users/${user}/repos?per_page=5&sort=updated`, {
					headers: { "user-agent": "encomun" },
				}),
			])
			if (!profile.ok) {
				return send(res, 404, { error: "Ese GitHub no existe o no es público." })
			}
			const p = await profile.json()
			const r = repos.ok ? await repos.json() : []
			return send(res, 200, {
				login: p.login,
				name: p.name,
				publicRepos: p.public_repos,
				createdAt: p.created_at,
				htmlUrl: p.html_url,
				repos: (Array.isArray(r) ? r : []).map((x) => ({
					name: x.name,
					htmlUrl: x.html_url,
					updatedAt: x.updated_at,
				})),
			})
		}

		const offerList = path.match(/^\/api\/pools\/(\d+)\/offers$/)
		if (offerList && req.method === "GET") {
			const id = Number(offerList[1])
			const rows = db
				.prepare(
					`SELECT o.*, u.name AS actor_name
					 FROM offers o JOIN users u ON u.id = o.actor_id
					 WHERE o.pool_id = ? ORDER BY o.id DESC`,
				)
				.all(id)
			return send(res, 200, rows)
		}
		if (offerList && req.method === "POST") {
			const id = Number(offerList[1])
			const body = await readBody(req)
			const amount = Number(body.amountUsdc)
			if (!actor.id) return send(res, 401, { error: "Elegí quién sos en Ajustes." })
			if (!Number.isInteger(amount) || amount < 1 || amount > 200) {
				return send(res, 400, { error: "El monto va de 1 a 200 USDC." })
			}
			const pool = db.prepare("SELECT * FROM pools WHERE id = ?").get(id)
			if (!pool) return send(res, 404, { error: "No está ese encargo." })
			if (["Funded", "Delivered", "Released", "Resolved", "Cancelled"].includes(pool.status)) {
				return send(res, 409, { error: "El retén ya tiene plata. El monto queda quieto." })
			}
			db.prepare(
				`INSERT INTO offers (pool_id, actor_id, role, amount_usdc, status, note, created_at)
				 VALUES (?, ?, ?, ?, 'open', ?, ?)`,
			).run(id, actor.id, actor.role || "pyme", amount, String(body.note ?? ""), nowIso())
			db.prepare(
				`INSERT INTO messages (pool_id, actor_id, role, kind, body, created_at)
				 VALUES (?, ?, ?, 'system', ?, ?)`,
			).run(
				id,
				actor.id,
				actor.role || "pyme",
				`Propuso otro monto: ${amount} USDC.`,
				nowIso(),
			)
			return send(res, 201, poolDetail(id).offers)
		}
		const acceptOffer = path.match(/^\/api\/pools\/(\d+)\/offers\/(\d+)\/accept$/)
		if (acceptOffer && req.method === "POST") {
			const poolId = Number(acceptOffer[1])
			const offerId = Number(acceptOffer[2])
			const offer = db.prepare("SELECT * FROM offers WHERE id = ? AND pool_id = ?").get(offerId, poolId)
			if (!offer) return send(res, 404, { error: "No está esa propuesta." })
			if (offer.actor_id === actor.id) {
				return send(res, 403, { error: "La otra parte tiene que aceptar." })
			}
			db.prepare("UPDATE offers SET status = 'accepted' WHERE id = ?").run(offerId)
			db.prepare("UPDATE offers SET status = 'rejected' WHERE pool_id = ? AND status = 'open'").run(poolId)
			if (offer.role === "pyme") {
				db.prepare(
					"UPDATE pool_members SET amount_usdc = ? WHERE pool_id = ? AND pyme_id = ?",
				).run(offer.amount_usdc, poolId, offer.actor_id)
			} else if (actor.role === "pyme") {
				db.prepare(
					"UPDATE pool_members SET amount_usdc = ? WHERE pool_id = ? AND pyme_id = ?",
				).run(offer.amount_usdc, poolId, actor.id)
			}
			const committed = db
				.prepare("SELECT SUM(amount_usdc) AS n FROM pool_members WHERE pool_id = ?")
				.get(poolId).n
			db.prepare("UPDATE pools SET committed_usdc = ? WHERE id = ?").run(committed, poolId)
			db.prepare(
				`INSERT INTO messages (pool_id, actor_id, role, kind, body, created_at)
				 VALUES (?, ?, ?, 'system', ?, ?)`,
			).run(
				poolId,
				actor.id,
				actor.role || "pyme",
				`Aceptó ${offer.amount_usdc} USDC. La meta ahora es ${committed} USDC.`,
				nowIso(),
			)
			return send(res, 200, poolDetail(poolId))
		}

		return send(res, 404, { error: "No está esa ruta." })
	} catch (err) {
		console.error(err)
		return send(res, 500, { error: err instanceof Error ? err.message : "Falló el servidor." })
	}
})

server.listen(PORT, "127.0.0.1", () => {
	console.log(`PymeSolve mesa local en http://127.0.0.1:${PORT}`)
})
