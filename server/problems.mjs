import { db } from "./db.mjs"

export function problemRow(row) {
	return {
		id: row.id,
		pymeId: row.pyme_id,
		pymeName: row.pyme_name,
		neighborhood: row.neighborhood,
		title: row.title,
		category: row.category,
		body: row.body,
		amountUsdc: row.amount_usdc,
		chainId: row.chain_id,
		poolId: row.pool_id,
		createdAt: row.created_at,
	}
}

const STOP = new Set([
	"de",
	"del",
	"el",
	"la",
	"un",
	"una",
	"en",
	"al",
	"lo",
	"se",
	"te",
	"me",
	"mi",
	"su",
	"es",
	"ha",
	"ya",
	"no",
	"si",
	"le",
	"da",
	"va",
	"para",
	"con",
	"por",
	"los",
	"las",
])

export function ftsQuery(raw) {
	const words = String(raw)
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.split(/[^a-z0-9]+/i)
		.map((w) => w.trim())
		.filter((w) => w.length > 1 && !STOP.has(w))
	if (words.length === 0) return null
	return words.map((w) => `"${w}"*`).join(" OR ")
}

export function listProblems({ q, category } = {}) {
	const needle = String(q ?? "").trim()
	if (needle) {
		const match = ftsQuery(needle)
		if (match) {
			try {
				const stmt = db.prepare(
					`SELECT p.*, u.name AS pyme_name, u.neighborhood
					 FROM problems_fts f
					 JOIN problems p ON p.id = f.rowid
					 JOIN users u ON u.id = p.pyme_id
					 WHERE problems_fts MATCH ?
					 ${category ? "AND p.category = ?" : ""}
					 ORDER BY bm25(problems_fts)
					 LIMIT 1`,
				)
				const ranked = category ? stmt.all(match, category) : stmt.all(match)
				if (ranked.length > 0) return ranked.map(problemRow)
			} catch {
				/* la frase no es una búsqueda válida */
			}
		}
		const like = `%${needle.replace(/[%_]/g, "")}%`
		const stmt = db.prepare(
			`SELECT p.*, u.name AS pyme_name, u.neighborhood
			 FROM problems p JOIN users u ON u.id = p.pyme_id
			 WHERE (
			 	p.title LIKE ? OR p.body LIKE ? OR p.category LIKE ?
			 	OR u.neighborhood LIKE ? OR u.name LIKE ?
			 )
			 ${category ? "AND p.category = ?" : ""}
			 LIMIT 1`,
		)
		const loose = category
			? stmt.all(like, like, like, like, like, category)
			: stmt.all(like, like, like, like, like)
		return loose.map(problemRow)
	}
	const rows = category
		? db
				.prepare(
					`SELECT p.*, u.name AS pyme_name, u.neighborhood
					 FROM problems p JOIN users u ON u.id = p.pyme_id
					 WHERE p.category = ? ORDER BY p.id`,
				)
				.all(category)
		: db
				.prepare(
					`SELECT p.*, u.name AS pyme_name, u.neighborhood
					 FROM problems p JOIN users u ON u.id = p.pyme_id
					 ORDER BY p.id`,
				)
				.all()
	return rows.map(problemRow)
}
