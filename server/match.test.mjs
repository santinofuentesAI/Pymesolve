import test from "node:test"
import assert from "node:assert/strict"
import { findTwins, suggestGroups, summarize, tokens } from "./match.mjs"

test("gemelos: mismo rubro, texto parecido, no mezclar", async (t) => {
	const soda = {
		id: 1,
		title: "Video de 20 segundos del plato del día",
		category: "videos",
		body: "Queremos un video corto del casado para subir a redes. Hoy filmamos con el celu y se ve oscuro.",
	}
	const pulperia = {
		id: 2,
		title: "Un video corto para redes",
		category: "videos",
		body: "Pedimos un ritual de 20 segundos para filmar lo que llega fresco y subirlo a redes.",
	}
	const salon = {
		id: 3,
		title: "Video corto del trabajo del día",
		category: "videos",
		body: "Queremos un video de 20 segundos para redes con el antes y el después.",
	}
	const web = {
		id: 4,
		title: "Página con WhatsApp y horarios",
		category: "web",
		body: "Queremos una página simple con el número de WhatsApp, el horario y el mapa del local.",
	}
	const videoConPool = {
		id: 5,
		title: "Video corto para redes de pulpería",
		category: "videos",
		body: "Video de 20 segundos para redes del barrio.",
		poolId: 1,
	}
	const drone = {
		id: 6,
		title: "Drone del volcán",
		category: "videos",
		body: "Tomas aéreas panorámicas en la cumbre del cráter con vuelo profesional.",
	}

	await t.test(
		"tres videos casi iguales devuelven 2 gemelos, categoría videos y score >= 0.12",
		() => {
			const candidateList = [soda, pulperia, salon]
			const twins = findTwins(candidateList, soda, { excludeId: soda.id })
			assert.equal(twins.length, 2)
			for (const twin of twins) {
				assert.equal(twin.category, "videos")
				assert.ok(twin.score >= 0.12)
			}
			assert.deepEqual(
				twins.map((t) => t.id).sort(),
				[2, 3],
			)
		},
	)

	await t.test("un problema web en la lista no aparece", () => {
		const candidateList = [pulperia, web]
		const twins = findTwins(candidateList, soda, { excludeId: soda.id })
		assert.equal(twins.some((t) => t.category === "web" || t.id === web.id), false)
	})

	await t.test("un video con poolId no aparece", () => {
		const candidateList = [videoConPool]
		const twins = findTwins(candidateList, soda, { excludeId: soda.id })
		assert.equal(twins.length, 0)
	})

	await t.test("excludeId del propio seed no se incluye", () => {
		const candidateList = [soda, pulperia]
		const twins = findTwins(candidateList, soda, { excludeId: soda.id })
		assert.equal(twins.some((t) => t.id === soda.id), false)
		assert.equal(twins.length, 1)
		assert.equal(twins[0].id, pulperia.id)
	})

	await t.test(
		'dos videos que no se parecen ("video del casado" vs "drone del volcán") devuelven 0 gemelos',
		() => {
			const candidateList = [drone]
			const twins = findTwins(candidateList, soda, { excludeId: soda.id })
			assert.equal(twins.length, 0)
		},
	)
})

test("grupos: suggestGroups junta hasta tres del mismo rubro", async (t) => {
	const soda = {
		id: 1,
		title: "Video de 20 segundos del plato del día",
		category: "videos",
		body: "Queremos un video corto del casado para subir a redes. Hoy filmamos con el celu y se ve oscuro.",
		amount_usdc: 10,
	}
	const pulperia = {
		id: 2,
		title: "Un video corto para redes",
		category: "videos",
		body: "Pedimos un ritual de 20 segundos para filmar lo que llega fresco y subirlo a redes.",
		amount_usdc: 10,
	}
	const salon = {
		id: 3,
		title: "Video corto del trabajo del día",
		category: "videos",
		body: "Queremos un video de 20 segundos para redes con el antes y el después.",
		amount_usdc: 10,
	}
	const webTaller = {
		id: 4,
		title: "Página con WhatsApp y horarios",
		category: "web",
		body: "Queremos una página simple con WhatsApp, de cuándo a cuándo y dónde queda el taller.",
		amount_usdc: 15,
	}
	const webMecanica = {
		id: 5,
		title: "Una página con el WhatsApp y los horarios",
		category: "web",
		body: "Pedimos un solo sitio con el número, el horario y el mapa.",
		amount_usdc: 15,
	}

	await t.test(
		"tres videos parecidos y dos web parecidos arman un grupo videos de 3 y un grupo web de 2 sin mezclar rubros",
		() => {
			const groups = suggestGroups([soda, pulperia, salon, webTaller, webMecanica])
			const videoGroup = groups.find((g) => g.category === "videos")
			const webGroup = groups.find((g) => g.category === "web")

			assert.ok(videoGroup, "debe existir el grupo de videos")
			assert.equal(videoGroup.problemIds.length, 3)
			assert.deepEqual(videoGroup.problemIds.sort(), [1, 2, 3])

			assert.ok(webGroup, "debe existir el grupo web")
			assert.equal(webGroup.problemIds.length, 2)
			assert.deepEqual(webGroup.problemIds.sort(), [4, 5])

			for (const group of groups) {
				assert.ok(group.category === "videos" || group.category === "web")
			}
		},
	)

	await t.test("si los tres videos ya tienen pool_id: 1, no sale grupo de videos", () => {
		const videosConPool = [
			{ ...soda, pool_id: 1 },
			{ ...pulperia, pool_id: 1 },
			{ ...salon, pool_id: 1 },
		]
		const groups = suggestGroups(videosConPool)
		const videoGroup = groups.find((g) => g.category === "videos")
		assert.equal(videoGroup, undefined)
	})

	await t.test("un video solo, sin parecido, no arma grupo", () => {
		const videoSolo = {
			id: 10,
			title: "Video solitario de tortugas",
			category: "videos",
			body: "Filmación de tortugas en arrecife sin coincidencia.",
			amount_usdc: 10,
		}
		const groups = suggestGroups([videoSolo])
		assert.equal(groups.length, 0)
	})
})

test("tokens: acentos, cortas y stopwords", async (t) => {
	await t.test(
		'"Video de 20 segundos del plato del día" incluye "video" y "plato"; no incluye "de", "del", "el"',
		() => {
			const res = tokens("Video de 20 segundos del plato del día")
			assert.ok(res.includes("video"))
			assert.ok(res.includes("plato"))
			assert.equal(res.includes("de"), false)
			assert.equal(res.includes("del"), false)
			assert.equal(res.includes("el"), false)
		},
	)

	await t.test('"Desamparados" sobrevive (más de 3 letras)', () => {
		const res = tokens("Desamparados")
		assert.deepEqual(res, ["desamparados"])
	})

	await t.test('"un la de" da array vacío (todo stopword o corto)', () => {
		const res = tokens("un la de")
		assert.deepEqual(res, [])
	})

	await t.test(
		'"Qué cambió" y "que cambio" dan el mismo token "cambio" (acentos)',
		() => {
			const a = tokens("Qué cambió")
			const b = tokens("que cambio")
			assert.deepEqual(a, ["cambio"])
			assert.deepEqual(b, ["cambio"])
			assert.deepEqual(a, b)
		},
	)

	await t.test(
		'palabras de 3 letras o menos ("hoy", "red", "web") no entran; "redes" sí',
		() => {
			const res = tokens("redes red web hoy")
			assert.ok(res.includes("redes"))
			assert.equal(res.includes("red"), false)
			assert.equal(res.includes("web"), false)
			assert.equal(res.includes("hoy"), false)
		},
	)
})

test("summarize: el texto del grupo, sin Gemma", async (t) => {
	await t.test(
		"videos: menciona 3, video y un solo encargo",
		() => {
			const res = summarize("videos", [
				{ pyme_name: "Soda El Casado" },
				{ pyme_name: "Pulpería Doña Lidi" },
				{ pyme_name: "Salón Nidia" },
			])
			assert.match(res, /3/i)
			assert.match(res, /video/i)
			assert.match(res, /un solo encargo/i)
		},
	)

	await t.test(
		"web: menciona 2, página o WhatsApp/turno, y los nombres",
		() => {
			const res = summarize("web", [
				{ pyme_name: "Taller Don Chepe" },
				{ pyme_name: "Mecánica La Cima" },
			])
			assert.match(res, /2/i)
			assert.match(res, /página|whatsapp|turno/i)
			assert.match(res, /Taller Don Chepe/i)
			assert.match(res, /Mecánica La Cima/i)
		},
	)

	await t.test(
		"marca: menciona marca y 3",
		() => {
			const res = summarize("marca", [
				{ pyme_name: "A" },
				{ pyme_name: "B" },
				{ pyme_name: "C" },
			])
			assert.match(res, /marca/i)
			assert.match(res, /3/i)
		},
	)

	await t.test(
		"otro: menciona X y 1",
		() => {
			const res = summarize("otro", [{ pyme_name: "X" }])
			assert.match(res, /X/i)
			assert.match(res, /1/i)
		},
	)
})



