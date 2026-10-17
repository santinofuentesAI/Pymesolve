import test from "node:test"
import assert from "node:assert/strict"
import { db } from "./db.mjs"
import { ftsQuery, listProblems, problemRow } from "./problems.mjs"

test("motor de búsqueda contra sqlite sin HTTP", async (t) => {
	await t.test('"video" -> exactamente 1, coincide con /video/i', () => {
		const results = listProblems({ q: "video" })
		assert.equal(results.length, 1)
		assert.match(results[0].title, /video/i)
	})

	await t.test('"Desamparados" -> 1, Soda El Casado', () => {
		const results = listProblems({ q: "Desamparados" })
		assert.equal(results.length, 1)
		assert.equal(results[0].pymeName, "Soda El Casado")
	})

	await t.test('"zzzznoexiste" -> 0', () => {
		const results = listProblems({ q: "zzzznoexiste" })
		assert.equal(results.length, 0)
	})

	await t.test('"" -> lista (no es el buscador; trae todos los problemas)', () => {
		const results = listProblems({ q: "" })
		assert.ok(results.length > 1)
	})

	await t.test('caracteres raros ("video)") no tiran error', () => {
		assert.doesNotThrow(() => {
			const results = listProblems({ q: "video)" })
			assert.ok(Array.isArray(results))
		})
	})
})

test("ftsQuery: la frase del buscador, no sqlite", async (t) => {
	await t.test('ftsQuery("video") === \'"video"*\'', () => {
		assert.equal(ftsQuery("video"), '"video"*')
	})

	await t.test('ftsQuery("Desamparados") === \'"desamparados"*\'', () => {
		assert.equal(ftsQuery("Desamparados"), '"desamparados"*')
	})

	await t.test('ftsQuery("video whatsapp") === \'"video"* OR "whatsapp"*\'', () => {
		assert.equal(ftsQuery("video whatsapp"), '"video"* OR "whatsapp"*')
	})

	await t.test('ftsQuery("") === null', () => {
		assert.equal(ftsQuery(""), null)
	})

	await t.test('ftsQuery("a") === null', () => {
		assert.equal(ftsQuery("a"), null)
	})

	await t.test('ftsQuery("video)") === \'"video"*\'', () => {
		assert.equal(ftsQuery("video)"), '"video"*')
	})

	await t.test('ftsQuery("video de") === \'"video"*\'', () => {
		assert.equal(ftsQuery("video de"), '"video"*')
	})

	await t.test('ftsQuery("el video") === \'"video"*\'', () => {
		assert.equal(ftsQuery("el video"), '"video"*')
	})

	await t.test('ftsQuery("de") === null', () => {
		assert.equal(ftsQuery("de"), null)
	})
})

test("problemRow: snake_case de sqlite -> camelCase del frente", async (t) => {
	await t.test("mapea row de la soda con pool_id 1, chain_id null, 10 USDC", () => {
		const raw = {
			id: 1,
			pyme_id: "pyme-soda",
			pyme_name: "Soda El Casado",
			neighborhood: "Desamparados",
			title: "Video de 20 segundos del plato del día",
			category: "videos",
			body: "Queremos un video corto del casado para redes.",
			amount_usdc: 10,
			chain_id: null,
			pool_id: 1,
			created_at: "2026-10-15T23:40:28.712Z",
		}
		const mapped = problemRow(raw)

		assert.equal(mapped.id, 1)
		assert.equal(mapped.pymeId, "pyme-soda")
		assert.equal(mapped.pymeName, "Soda El Casado")
		assert.equal(mapped.neighborhood, "Desamparados")
		assert.equal(mapped.title, "Video de 20 segundos del plato del día")
		assert.equal(mapped.category, "videos")
		assert.equal(mapped.body, "Queremos un video corto del casado para redes.")
		assert.equal(mapped.amountUsdc, 10)
		assert.equal(mapped.chainId, null)
		assert.equal(mapped.poolId, 1)
		assert.equal(mapped.createdAt, "2026-10-15T23:40:28.712Z")
	})

	await t.test("chain_id: 7 -> chainId === 7", () => {
		const mapped = problemRow({ chain_id: 7 })
		assert.equal(mapped.chainId, 7)
	})

	await t.test("pool_id: null -> poolId === null", () => {
		const mapped = problemRow({ pool_id: null })
		assert.equal(mapped.poolId, null)
	})
})

test("node:sqlite: .all([x]) no tira named parameter 0", () => {
	const row = db.prepare("SELECT ? AS n").all(["ok"])
	assert.equal(row[0].n, "ok")
	const two = db.prepare("SELECT ? AS a, ? AS b").all(["uno", "dos"])
	assert.equal(two[0].a, "uno")
	assert.equal(two[0].b, "dos")
	const scalar = db.prepare("SELECT ? AS n").all("ok")
	assert.equal(scalar[0].n, "ok")
})


