import test from "node:test"
import assert from "node:assert/strict"
import {
	encargoBriefFallback,
	gemmaReady,
	twinSummaryFallback,
	pymeBulletsFallback,
	oficioBulletsFallback,
} from "./gemma.mjs"

test("plantillas Gemma sin Ollama ni HTTP", async (t) => {
	await t.test(
		"twinSummaryFallback con videos menciona 3 comercios y un solo encargo",
		() => {
			const text = twinSummaryFallback(
				"videos",
				["Soda El Casado", "Pulpería Doña Lidi", "Salón Nidia"],
				3,
			)
			assert.match(text, /3 comercios/i)
			assert.match(text, /un solo encargo/i)
		},
	)

	await t.test('twinSummaryFallback con web habla de página o WhatsApp', () => {
		const text = twinSummaryFallback("web", ["A"], 1)
		assert.match(text, /página|whatsapp/i)
	})

	await t.test(
		"pymeBulletsFallback de la soda dice hora, plato y Drive",
		() => {
			const bullets = pymeBulletsFallback(
				{
					title: "Video de 20 segundos del plato del día",
					category: "videos",
					body: "El lunes a las 6:30, casado en plato blanco.",
				},
				{ id: "pyme-soda", name: "Soda El Casado", neighborhood: "Desamparados" },
			)
			assert.ok(bullets.length >= 4)
			const combined = bullets.join(" ")
			assert.match(combined, /6:30|ventana/i)
			assert.match(combined, /casado/i)
			assert.match(combined, /Drive/i)
			assert.doesNotMatch(combined, /si el vecino/i)
		},
	)

	await t.test(
		"pymeBulletsFallback sin semilla usa el pedido y el barrio",
		() => {
			const bullets = pymeBulletsFallback(
				{
					title: "Página con WhatsApp",
					category: "web",
					body: "Una página con el número y el horario.",
				},
				{ id: "pyme-nueva", name: "Soda Nueva", neighborhood: "Hatillo" },
			)
			assert.ok(bullets.length >= 3)
			const combined = bullets.join(" ")
			assert.match(combined, /lunes/i)
			assert.match(combined, /Hatillo|WhatsApp|página/i)
		},
	)

	await t.test(
		"oficioBulletsFallback verified usa bio y el oficio concreto",
		() => {
			const bullets = oficioBulletsFallback({
				name: "Melissa Soto",
				trade: "fotos",
				verified: 1,
				bio: "Fotos del plato y el local.",
			})
			assert.equal(bullets.length, 3)
			assert.match(bullets.join(" "), /Fotos del plato/i)
			assert.match(bullets.join(" "), /fotos/i)
		},
	)

	await t.test(
		"oficioBulletsFallback con verified: 0 dice en revisión y que no toma encargos",
		() => {
			const bullets = oficioBulletsFallback({
				name: "Andrés Mora",
				trade: "web",
				verified: 0,
			})
			const combined = bullets.join(" ")
			assert.match(combined, /en revisión/i)
			assert.match(combined, /no toma encargos/i)
		},
	)

	await t.test(
		"encargoBriefFallback de 3 videos nombra a las tres y el pedido de cada una",
		() => {
			const brief = encargoBriefFallback([
				{
					pymeName: "Soda El Casado",
					neighborhood: "Desamparados",
					title: "Video de 20 segundos del plato del día",
					category: "videos",
					body: "Queremos un video corto del casado para subir a redes.",
				},
				{
					pymeName: "Pulpería Doña Lidi",
					neighborhood: "Hatillo",
					title: "Un video corto para redes",
					category: "videos",
					body: "Pedimos un ritual de 20 segundos para filmar lo que llega fresco.",
				},
				{
					pymeName: "Salón Nidia",
					neighborhood: "San Pedro",
					title: "Video corto del trabajo del día",
					category: "videos",
					body: "Queremos un video de 20 segundos para Instagram con el antes y el después.",
				},
			])
			assert.match(brief.lede, /3 comercios/i)
			assert.match(brief.lede, /Casado/i)
			assert.equal(brief.puntos.length, 3)
			assert.match(brief.puntos[0], /Soda El Casado/)
			assert.match(brief.puntos[0], /casado/i)
			assert.match(brief.puntos[1], /Doña Lidi/)
			assert.match(brief.puntos[2], /Nidia/)
			assert.match(brief.puntos[2], /Instagram/i)
		},
	)

	await t.test(
		"oficioBulletsFallback con verified: 1 nombra a Karla y NO dice en revisión",
		() => {
			const bullets = oficioBulletsFallback({
				name: "Karla Quesada",
				trade: "videos",
				verified: 1,
			})
			const combined = bullets.join(" ")
			assert.match(combined, /Karla/i)
			assert.doesNotMatch(combined, /en revisión/i)
		},
	)

	await t.test("gemmaReady sin Ollama devuelve ok: false y el modelo", async () => {
		const status = await gemmaReady()
		assert.deepEqual(status, {
			ok: false,
			model: process.env.PYMESOLVE_MODEL ?? "gemma4:e2b",
		})
	})
})

