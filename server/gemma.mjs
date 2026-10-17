import { pymes } from "./seed.mjs"

const OLLAMA = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434"
const MODEL = process.env.PYMESOLVE_MODEL ?? "gemma4:e2b"

function parseJson(text) {
	if (!text) return null
	try {
		return JSON.parse(text)
	} catch {
		const m = text.match(/\{[\s\S]*\}/)
		if (!m) return null
		try {
			return JSON.parse(m[0])
		} catch {
			return null
		}
	}
}

export async function askGemma(prompt) {
	try {
		const res = await fetch(`${OLLAMA}/api/chat`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				model: MODEL,
				stream: false,
				format: "json",
				messages: [
					{
						role: "system",
						content:
							"Hablás en español de mostrador, Costa Rica. Frases cortas. Sin jerga técnica. Respondé solo JSON.",
					},
					{ role: "user", content: prompt },
				],
			}),
			signal: AbortSignal.timeout(12_000),
		})
		if (!res.ok) return null
		const data = await res.json()
		return parseJson(data?.message?.content ?? "")
	} catch {
		return null
	}
}

export async function gemmaReady() {
	try {
		const res = await fetch(`${OLLAMA}/api/tags`, {
			signal: AbortSignal.timeout(1500),
		})
		if (!res.ok) return { ok: false, model: MODEL }
		const data = await res.json()
		const names = (data.models ?? []).map((m) => m.name ?? "")
		return {
			ok: names.some((n) => n === MODEL || n.startsWith(`${MODEL}:`) || n.startsWith("gemma4")),
			model: MODEL,
		}
	} catch {
		return { ok: false, model: MODEL }
	}
}

export function twinSummaryFallback(category, names, n) {
	const lista = names.join(", ")
	if (category === "videos") {
		return `${n} comercios piden lo mismo: un video corto para redes. En vez de pagar tres veces, juntan un solo encargo. ${lista}.`
	}
	if (category === "web") {
		return `${n} comercios piden lo mismo: una página con WhatsApp y horarios. Un solo sitio, los datos de cada uno.`
	}
	if (category === "marca") {
		return `${n} oficios quieren un criterio de marca sin una agencia. Color, letra y cómo se firma.`
	}
	return `${n} comercios del mismo rubro describieron el mismo hueco.`
}

const OFICIO_HACE = {
	web: "páginas simples con WhatsApp y horario",
	video: "videos cortos para redes",
	videos: "videos cortos para redes",
	marca: "color, letra y cómo se firma el local",
	fotos: "fotos del plato, el local y el antes-después",
	libros: "planilla y el libro del negocio",
	electricidad: "tomas, letreros y luz del local",
	whatsapp: "el catálogo y el primer mensaje de WhatsApp",
	cañerias: "cañerías y tanques, visita al local",
	redes: "publicaciones semanales mientras vos atendés",
	pintura: "pintar el local y dejarlo listo para abrir",
	rotulos: "el letrero y el menú de la pared",
	menu: "el menú con precios y foto del plato",
}

export function pymeBulletsFallback(problem, user) {
	const seeded = pymes.find((p) => p.id === user?.id)
	if (Array.isArray(seeded?.monday) && seeded.monday.length >= 3) {
		return seeded.monday
	}
	const title = problem?.title ?? "su pedido"
	const body = String(problem?.body ?? "").trim()
	const donde = user?.neighborhood || "el barrio"
	const nombre = user?.name || "el local"
	const cat = problem?.category ?? ""
	if (cat === "videos") {
		return [
			`El lunes, en ${donde}, filmar ${nombre} de día: 20 segundos, el producto en primer plano, luz de puerta no de bombillo.`,
			body || `El pedido: ${title}.`,
			`Al final, el nombre "${nombre}" en una sola línea. Mismo encuadre para repetirlo mañana.`,
			"Entregar el recorte y un Drive. El comercio pulsa grabar; no edita en el celu.",
		]
	}
	if (cat === "web") {
		return [
			`El lunes, una sola página para ${nombre} en ${donde}: WhatsApp, de cuándo a cuándo, y dónde queda.`,
			body || `El pedido: ${title}.`,
			`Un botón que abre WhatsApp con un mensaje listo. Sin menú de diez secciones.`,
			"El comercio pone número y horario; el oficio arma el molde.",
		]
	}
	if (cat === "marca") {
		return [
			`El lunes, para ${nombre} en ${donde}: un color, una letra y cómo se escribe el nombre.`,
			body || `El pedido: ${title}.`,
			"Tres archivos: el nombre en negro, el nombre en color, y una muestra en el empaque o el letrero.",
			`Que se vea de ${donde}, no de plantilla.`,
		]
	}
	return [
		`El lunes, en ${donde}, un paso concreto para ${nombre}: ${title}.`,
		body || `El hueco es este: ${title}.`,
		"Entregar algo que se use ese día, no una propuesta.",
	]
}

export function encargoBriefFallback(problems = []) {
	const list = Array.isArray(problems) ? problems : []
	const n = list.length
	if (n === 0) {
		return {
			lede: "Todavía no hay pedidos en este encargo.",
			puntos: [],
		}
	}
	const names = list.map((p) => p.pymeName).filter(Boolean)
	const listed = names.join(", ")
	const cat = list[0]?.category ?? ""
	let lede = `${n} comercios (${listed}) juntaron un solo encargo. El oficio entrega una vez; cada quien pone lo suyo.`
	if (cat === "videos") {
		lede = `${n} comercios (${listed}) quieren el mismo trabajo: un video corto para redes, de unos 20 segundos, que se pueda copiar cambiando el nombre del local. El oficio entrega un formato único. Cada comercio pone su plato, su corte o lo que llega fresco.`
	} else if (cat === "web") {
		lede = `${n} comercios (${listed}) quieren una página simple con WhatsApp, horario y dónde quedan. Un solo sitio; cada uno pone sus datos.`
	} else if (cat === "marca") {
		lede = `${n} comercios (${listed}) quieren color, letra y cómo se firma el local, sin una agencia. Un criterio sirve para bolsa, etiqueta o puerta.`
	}
	const puntos = list.map((p) => {
		const donde = p.neighborhood ? ` en ${p.neighborhood}` : ""
		const pedido = String(p.body || p.title || "").trim()
		return `${p.pymeName}${donde} pide: ${pedido}`
	})
	return { lede, puntos }
}

export function oficioBulletsFallback(user) {
	if (!user?.verified) {
		return [
			"Esta persona todavía está en revisión.",
			"La mesa mira el enlace que mandó.",
			"Hasta que la mesa diga que sí, no toma encargos.",
		]
	}
	const hace = OFICIO_HACE[user.trade] ?? user.trade
	return [
		user.bio || `${user.name} se dedica a ${hace}.`,
		`Se dedica a ${hace}.`,
		"Cobra la meta del barrio, no una factura por local.",
	]
}
