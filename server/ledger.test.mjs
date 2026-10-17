import test from "node:test"
import assert from "node:assert/strict"
import { maskLabel, maskLedgerRow } from "./ledger.mjs"

test("Libro: nombres de otros se tapan si no sos la mesa", async (t) => {
	const row = {
		at: "2026-10-17",
		actor_id: "pyme-soda",
		actor_name: "Soda El Casado",
		kind: "pyme",
		body: "Soda El Casado se sumó con 10 USDC.",
	}

	await t.test("mesa ve el nombre", () => {
		const out = maskLedgerRow(row, { id: "admin-mesa", role: "admin" })
		assert.equal(out.actor_name, "Soda El Casado")
		assert.match(out.body, /Soda El Casado/)
	})

	await t.test("otra pyme ve Un comercio", () => {
		const out = maskLedgerRow(row, { id: "pyme-salon", role: "pyme" })
		assert.equal(out.actor_name, "Un comercio")
		assert.match(out.body, /Un comercio se sumó/)
		assert.doesNotMatch(out.body, /Soda El Casado/)
	})

	await t.test("usuario ve Un comercio", () => {
		const out = maskLedgerRow(row, { id: "dev-karla", role: "dev" })
		assert.equal(out.actor_name, "Un comercio")
	})

	await t.test("vos ves tu nombre", () => {
		const out = maskLedgerRow(row, { id: "pyme-soda", role: "pyme" })
		assert.equal(out.actor_name, "Soda El Casado")
		assert.equal(out.mine, true)
		assert.match(out.body, /Soda El Casado/)
	})

	await t.test("oficio ajeno es Un oficio", () => {
		assert.equal(maskLabel("dev", false, false, "Karla"), "Un oficio")
	})
})
