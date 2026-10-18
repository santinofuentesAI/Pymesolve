import { mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { DatabaseSync } from "node:sqlite"
import { adminUser, oficios, pymes } from "./seed.mjs"

const root = dirname(fileURLToPath(import.meta.url))
mkdirSync(root, { recursive: true })
export const dbPath = join(root, "pymesolve.sqlite")

export const db = new DatabaseSync(dbPath)
patchSqliteBinds(db)
db.exec("PRAGMA journal_mode = WAL")
db.exec("PRAGMA foreign_keys = ON")

/** node:sqlite treats an array as named params (`'0'`, `'1'`). Spread it. */
function patchSqliteBinds(database) {
	const prepare = database.prepare.bind(database)
	database.prepare = (sql) => {
		const stmt = prepare(sql)
		const all = stmt.all.bind(stmt)
		const get = stmt.get.bind(stmt)
		const run = stmt.run.bind(stmt)
		stmt.all = (...params) => all(...spreadBinds(params))
		stmt.get = (...params) => get(...spreadBinds(params))
		stmt.run = (...params) => run(...spreadBinds(params))
		return stmt
	}
}

function spreadBinds(params) {
	if (params.length === 1 && Array.isArray(params[0])) return params[0]
	return params
}

db.exec(`
CREATE TABLE IF NOT EXISTS users (
	id TEXT PRIMARY KEY,
	kind TEXT NOT NULL,
	name TEXT NOT NULL,
	trade TEXT NOT NULL,
	bio TEXT NOT NULL DEFAULT '',
	neighborhood TEXT NOT NULL DEFAULT '',
	verified INTEGER NOT NULL DEFAULT 0,
	wallet TEXT,
	github TEXT,
	drive TEXT,
	social TEXT,
	linkedin TEXT,
	demo INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS proofs (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id TEXT NOT NULL,
	kind TEXT NOT NULL,
	url TEXT NOT NULL,
	note TEXT NOT NULL DEFAULT '',
	status TEXT NOT NULL DEFAULT 'pendiente',
	created_at TEXT NOT NULL DEFAULT '',
	FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS problems (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	pyme_id TEXT NOT NULL,
	title TEXT NOT NULL,
	category TEXT NOT NULL,
	body TEXT NOT NULL,
	amount_usdc REAL NOT NULL,
	chain_id INTEGER,
	pool_id INTEGER,
	created_at TEXT NOT NULL,
	FOREIGN KEY (pyme_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS pools (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	title TEXT NOT NULL,
	category TEXT NOT NULL,
	summary TEXT NOT NULL,
	status TEXT NOT NULL,
	chain_id INTEGER,
	escrow TEXT,
	dev_id TEXT,
	committed_usdc REAL NOT NULL DEFAULT 0,
	letter TEXT,
	letter_hash TEXT,
	created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS pool_members (
	pool_id INTEGER NOT NULL,
	pyme_id TEXT NOT NULL,
	joined INTEGER NOT NULL DEFAULT 0,
	amount_usdc REAL NOT NULL,
	funded INTEGER NOT NULL DEFAULT 0,
	vote INTEGER,
	PRIMARY KEY (pool_id, pyme_id)
);
CREATE TABLE IF NOT EXISTS messages (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	pool_id INTEGER NOT NULL,
	actor_id TEXT NOT NULL,
	role TEXT NOT NULL,
	kind TEXT NOT NULL DEFAULT 'chat',
	body TEXT NOT NULL,
	created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS summons (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	pool_id INTEGER NOT NULL,
	caller_id TEXT NOT NULL,
	reason TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'open',
	created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS briefs (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	summon_id INTEGER NOT NULL,
	body TEXT NOT NULL,
	suggested_dev REAL NOT NULL,
	suggested_refund REAL NOT NULL,
	created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS deliveries (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	pool_id INTEGER NOT NULL,
	kind TEXT NOT NULL,
	url TEXT NOT NULL,
	explanation TEXT NOT NULL,
	created_at TEXT NOT NULL
);
CREATE VIRTUAL TABLE IF NOT EXISTS problems_fts USING fts5(
	title, category, body, content='problems', content_rowid='id'
);
CREATE TABLE IF NOT EXISTS ecos (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	pool_id INTEGER NOT NULL,
	pyme_id TEXT NOT NULL,
	note TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL,
	UNIQUE (pool_id, pyme_id)
);
CREATE TABLE IF NOT EXISTS card_copy (
	key TEXT PRIMARY KEY,
	bullets TEXT NOT NULL,
	created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS interests (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	actor_id TEXT NOT NULL,
	target_id TEXT NOT NULL,
	kind TEXT NOT NULL,
	created_at TEXT NOT NULL,
	UNIQUE (actor_id, target_id, kind)
);
CREATE TABLE IF NOT EXISTS dms (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	low_id TEXT NOT NULL,
	high_id TEXT NOT NULL,
	created_at TEXT NOT NULL,
	UNIQUE (low_id, high_id)
);
CREATE TABLE IF NOT EXISTS dm_messages (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	dm_id INTEGER NOT NULL,
	actor_id TEXT NOT NULL,
	body TEXT NOT NULL,
	created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS offers (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	pool_id INTEGER NOT NULL,
	actor_id TEXT NOT NULL,
	role TEXT NOT NULL,
	amount_usdc REAL NOT NULL,
	status TEXT NOT NULL DEFAULT 'open',
	note TEXT NOT NULL DEFAULT '',
	created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS molde_signups (
	pool_id INTEGER NOT NULL,
	actor_id TEXT NOT NULL,
	created_at TEXT NOT NULL,
	UNIQUE (pool_id, actor_id)
);
`)

const count = db.prepare("SELECT COUNT(*) AS n FROM users").get().n
if (count === 0) seed()

function insertDev(row, now) {
	db.prepare(
		`INSERT INTO users (id, kind, name, trade, bio, neighborhood, verified, github, drive, social, linkedin, demo)
		 VALUES (?, 'dev', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
	).run(
		row.id,
		row.name,
		row.trade,
		row.bio,
		row.neighborhood,
		row.verified,
		row.github || null,
		row.drive || null,
		row.social || null,
		row.linkedin || null,
	)
	const proofs = [
		row.github ? ["github", `https://github.com/${row.github}`] : null,
		row.drive ? ["drive", row.drive] : null,
		row.social ? ["portfolio", row.social] : null,
		row.linkedin ? ["linkedin", row.linkedin] : null,
	].filter(Boolean)
	for (const [kind, url] of proofs) {
		db.prepare(
			`INSERT INTO proofs (user_id, kind, url, note, status, created_at)
			 VALUES (?, ?, ?, ?, ?, ?)`,
		).run(
			row.id,
			kind,
			url,
			row.verified ? "La mesa ya lo miró." : "Esperando a la mesa.",
			row.verified ? "aprobado" : "pendiente",
			now,
		)
	}
}

function seed() {
	const now = new Date().toISOString()
	const insertUser = db.prepare(
		`INSERT INTO users (id, kind, name, trade, bio, neighborhood, verified, github, drive, social, linkedin, demo)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
	)
	const insertProblem = db.prepare(
		`INSERT INTO problems (pyme_id, title, category, body, amount_usdc, created_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
	)
	const insertFts = db.prepare(
		`INSERT INTO problems_fts (rowid, title, category, body) VALUES (?, ?, ?, ?)`,
	)

	insertUser.run(
		adminUser.id,
		"admin",
		adminUser.name,
		adminUser.trade,
		adminUser.bio,
		adminUser.neighborhood,
		1,
		null,
		null,
		null,
		null,
	)
	for (const oficio of oficios) insertDev(oficio, now)

	const videoIds = []
	for (const pyme of pymes) {
		insertUser.run(
			pyme.id,
			"pyme",
			pyme.name,
			pyme.trade,
			pyme.bio,
			pyme.neighborhood,
			1,
			null,
			null,
			null,
			null,
		)
		const info = insertProblem.run(
			pyme.id,
			pyme.problem.title,
			pyme.problem.category,
			pyme.problem.body,
			pyme.problem.amountUsdc,
			now,
		)
		const pid = Number(info.lastInsertRowid)
		insertFts.run(
			pid,
			pyme.problem.title,
			pyme.problem.category,
			pyme.problem.body,
		)
		if (pyme.problem.category === "videos") {
			videoIds.push({ pid, pymeId: pyme.id, amount: pyme.problem.amountUsdc })
		}
	}

	if (videoIds.length >= 3) {
		const trio = videoIds.slice(0, 3)
		const summary =
			"3 comercios piden lo mismo: un video corto para redes. En vez de pagar tres veces, juntan un solo encargo."
		const pool = db
			.prepare(
				`INSERT INTO pools (title, category, summary, status, committed_usdc, created_at)
				 VALUES (?, 'videos', ?, 'Open', 30, ?)`,
			)
			.run("Video de 20 segundos del plato del día", summary, now)
		const poolId = Number(pool.lastInsertRowid)
		for (const v of trio) {
			db.prepare("UPDATE problems SET pool_id = ? WHERE id = ?").run(
				poolId,
				v.pid,
			)
			db.prepare(
				`INSERT INTO pool_members (pool_id, pyme_id, joined, amount_usdc) VALUES (?, ?, 1, ?)`,
			).run(poolId, v.pymeId, v.amount)
		}
		db.prepare(
			`INSERT INTO messages (pool_id, actor_id, role, kind, body, created_at)
			 VALUES (?, 'pyme-soda', 'pyme', 'system', ?, ?)`,
		).run(poolId, "Soda El Casado se sumó con 10 USDC.", now)
		db.prepare(
			`INSERT INTO messages (pool_id, actor_id, role, kind, body, created_at)
			 VALUES (?, 'pyme-pulperia', 'pyme', 'system', ?, ?)`,
		).run(poolId, "Pulpería Doña Lidi se sumó con 10 USDC.", now)
		db.prepare(
			`INSERT INTO messages (pool_id, actor_id, role, kind, body, created_at)
			 VALUES (?, 'pyme-salon', 'pyme', 'system', ?, ?)`,
		).run(poolId, "Salón Nidia se sumó con 10 USDC. Meta: 30 USDC.", now)
	}
	ensureDemoLikes(now)
	ensureDemoMolde(now)
}

ensureSeedPeople()

function upsertDev(row, now) {
	const exists = db.prepare("SELECT id FROM users WHERE id = ?").get(row.id)
	if (!exists) {
		insertDev(row, now)
		return
	}
	db.prepare(
		`UPDATE users SET name=?, trade=?, bio=?, neighborhood=?, github=?, drive=?, social=?, linkedin=?
		 WHERE id=? AND demo=1`,
	).run(
		row.name,
		row.trade,
		row.bio,
		row.neighborhood,
		row.github || null,
		row.drive || null,
		row.social || null,
		row.linkedin || null,
		row.id,
	)
	if (row.drive) {
		const proof = db
			.prepare("SELECT id FROM proofs WHERE user_id = ? AND kind = 'drive'")
			.get(row.id)
		if (proof) {
			db.prepare("UPDATE proofs SET url = ? WHERE id = ?").run(
				row.drive,
				proof.id,
			)
		}
	}
	db.prepare("DELETE FROM card_copy WHERE key LIKE ?").run(`user:${row.id}:%`)
}

function insertPyme(pyme, now) {
	db.prepare(
		`INSERT INTO users (id, kind, name, trade, bio, neighborhood, verified, github, drive, social, linkedin, demo)
		 VALUES (?, 'pyme', ?, ?, ?, ?, 1, NULL, NULL, NULL, NULL, 1)`,
	).run(pyme.id, pyme.name, pyme.trade, pyme.bio, pyme.neighborhood)
	const info = db
		.prepare(
			`INSERT INTO problems (pyme_id, title, category, body, amount_usdc, created_at)
			 VALUES (?, ?, ?, ?, ?, ?)`,
		)
		.run(
			pyme.id,
			pyme.problem.title,
			pyme.problem.category,
			pyme.problem.body,
			pyme.problem.amountUsdc,
			now,
		)
	const pid = Number(info.lastInsertRowid)
	db.prepare(
		`INSERT INTO problems_fts (rowid, title, category, body) VALUES (?, ?, ?, ?)`,
	).run(pid, pyme.problem.title, pyme.problem.category, pyme.problem.body)
}

function upsertPyme(pyme, now) {
	const exists = db.prepare("SELECT id FROM users WHERE id = ?").get(pyme.id)
	if (!exists) {
		insertPyme(pyme, now)
		return
	}
	db.prepare(
		`UPDATE users SET name=?, trade=?, bio=?, neighborhood=? WHERE id=? AND demo=1`,
	).run(pyme.name, pyme.trade, pyme.bio, pyme.neighborhood, pyme.id)
	const problem = db
		.prepare("SELECT id FROM problems WHERE pyme_id = ? ORDER BY id LIMIT 1")
		.get(pyme.id)
	if (problem) {
		db.prepare(
			`UPDATE problems SET title=?, category=?, body=?, amount_usdc=? WHERE id=?`,
		).run(
			pyme.problem.title,
			pyme.problem.category,
			pyme.problem.body,
			pyme.problem.amountUsdc,
			problem.id,
		)
		try {
			db.prepare("DELETE FROM problems_fts WHERE rowid = ?").run(problem.id)
		} catch {
			/* fts virtual */
		}
		try {
			db.prepare(
				`INSERT INTO problems_fts (rowid, title, category, body) VALUES (?, ?, ?, ?)`,
			).run(
				problem.id,
				pyme.problem.title,
				pyme.problem.category,
				pyme.problem.body,
			)
		} catch {
			/* already there */
		}
	}
	db.prepare("DELETE FROM card_copy WHERE key LIKE ?").run(`user:${pyme.id}:%`)
}

function ensureDemoLikes(now) {
	const likes = ["dev-karla", "dev-andres", "dev-elena"]
	const insert = db.prepare(
		`INSERT OR IGNORE INTO interests (actor_id, target_id, kind, created_at)
		 VALUES ('pyme-soda', ?, 'dev', ?)`,
	)
	for (const id of likes) {
		const person = db.prepare("SELECT id FROM users WHERE id = ?").get(id)
		if (person) insert.run(id, now)
	}
}

function ensureDemoMolde(now) {
	const title = "Video de 20 segundos, listo para copiar"
	const letter =
		"El lunes: plato blanco contra la ventana, 20 segundos, el nombre del local al final. Mismo encuadre para copiarlo al día siguiente. El oficio deja el ritual; el comercio pulsa grabar."
	const karla = db.prepare("SELECT id FROM users WHERE id = 'dev-karla'").get()
	if (!karla) return
	let row = db
		.prepare("SELECT id FROM pools WHERE title = ? AND dev_id = 'dev-karla'")
		.get(title)
	if (!row) {
		const info = db
			.prepare(
				`INSERT INTO pools (title, category, summary, status, dev_id, committed_usdc, letter, created_at)
				 VALUES (?, 'videos', ?, 'Released', 'dev-karla', 30, ?, ?)`,
			)
			.run(
				title,
				"Karla ya lo hizo una vez. El próximo grupo no empieza de cero: se suma y ella lo cobra de nuevo.",
				letter,
				now,
			)
		row = { id: Number(info.lastInsertRowid) }
	}
	const taller = db
		.prepare("SELECT id FROM users WHERE id = 'pyme-taller'")
		.get()
	if (taller) {
		db.prepare(
			`INSERT OR IGNORE INTO molde_signups (pool_id, actor_id, created_at) VALUES (?, 'pyme-taller', ?)`,
		).run(row.id, now)
	}
}

function ensureSeedPeople() {
	const now = nowIso()
	for (const oficio of oficios) upsertDev(oficio, now)
	for (const pyme of pymes) upsertPyme(pyme, now)
	ensureDemoLikes(now)
	ensureDemoMolde(now)
}

const WIPE = [
	"dm_messages",
	"dms",
	"molde_signups",
	"interests",
	"offers",
	"card_copy",
	"ecos",
	"deliveries",
	"briefs",
	"summons",
	"messages",
	"pool_members",
	"pools",
	"problems_fts",
	"problems",
	"proofs",
	"users",
]

export function resetDemo() {
	db.exec("PRAGMA foreign_keys = OFF")
	for (const table of WIPE) {
		try {
			db.exec(`DELETE FROM ${table}`)
		} catch {
			/* virtual or missing */
		}
	}
	try {
		db.exec("DELETE FROM sqlite_sequence")
	} catch {
		/* no autoincrement yet */
	}
	db.exec("PRAGMA foreign_keys = ON")
	seed()
	return { ok: true, pymes: pymes.length, oficios: oficios.length }
}

export function nowIso() {
	return new Date().toISOString()
}
