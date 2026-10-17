import test from "node:test"
import assert from "node:assert/strict"

const BASE = "http://127.0.0.1:8787"

test("POST /api/reset vuelve a sembrar los de ejemplo", async (t) => {
	let health
	try {
		health = await fetch(`${BASE}/api/health`)
	} catch {
		t.skip("mesa no está en 8787")
		return
	}
	if (!health.ok) {
		t.skip("mesa no responde")
		return
	}
	const res = await fetch(`${BASE}/api/reset`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: "{}",
	})
	assert.equal(res.status, 200)
	const out = await res.json()
	assert.equal(out.ok, true)
	assert.ok(out.pymes >= 8)
	assert.ok(out.oficios >= 8)
	const soda = await fetch(`${BASE}/api/users/pyme-soda`).then((r) => r.json())
	assert.equal(soda.name, "Soda El Casado")
	assert.match(soda.bio, /Casado/i)
	assert.match(soda.pedido?.body ?? "", /6:30|casado/i)
	assert.ok((soda.bullets ?? []).length >= 3)
	assert.match((soda.bullets ?? []).join(" "), /ventana|6:30|Drive/i)
	const karla = await fetch(`${BASE}/api/users/dev-karla`).then((r) => r.json())
	assert.match(karla.bio, /20 segundos/i)
	const vicky = await fetch(`${BASE}/api/users/dev-viki`).then((r) => r.json())
	assert.equal(vicky.name, "Vicky Rojas")
})
