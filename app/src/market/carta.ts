import { Buffer } from "buffer"

const JARGON = [
	"kubernetes",
	"refactor",
	"async",
	"middleware",
	"pipeline",
	"boilerplate",
	"endpoint",
	"schema",
]

export type Carta = {
	changed: string
	where: string
	monday: string
}

export function cartaText(c: Carta): string {
	return [
		`Qué cambió: ${c.changed.trim()}`,
		`Dónde vive: ${c.where.trim()}`,
		`El lunes, hacé esto: ${c.monday.trim()}`,
	].join("\n")
}

export function cartaIssues(c: Carta): string[] {
	const issues: string[] = []
	const text = cartaText(c)
	if (c.changed.trim().length < 40) {
		issues.push(
			"Contá qué cambió como se lo dirías a quien atiende el mostrador.",
		)
	}
	if (!/^https?:\/\//i.test(c.where.trim())) {
		issues.push("La carpeta tiene que ser un link (Drive o repositorio).")
	}
	if (c.monday.trim().length < 20) {
		issues.push("Falta el paso del lunes: una sola acción concreta.")
	}
	const found = JARGON.filter((w) => text.toLowerCase().includes(w))
	if (found.length) {
		issues.push(
			`Sacá estas palabras: ${found.join(", ")}. Acá se habla en claro.`,
		)
	}
	return issues
}

export async function hashCarta(text: string): Promise<string> {
	const data = new TextEncoder().encode(text)
	const copy = data.buffer.slice(
		data.byteOffset,
		data.byteOffset + data.byteLength,
	) as ArrayBuffer
	const buf = await crypto.subtle.digest("SHA-256", copy)
	return [...new Uint8Array(buf)]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")
}

export function hashBytes(hex: string): Buffer {
	const clean = hex.replace(/^0x/, "")
	const bytes = new Uint8Array(clean.length / 2)
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16)
	}
	return Buffer.from(bytes)
}

export function parseCarta(text: string): Carta {
	const grab = (label: string) => {
		const m = text.match(new RegExp(`${label}:\\s*(.+)`, "i"))
		return m?.[1]?.trim() ?? ""
	}
	return {
		changed: grab("Qué cambió"),
		where: grab("Dónde vive"),
		monday: grab("El lunes, hacé esto"),
	}
}

/** 0 a 10: qué tan leíble es para alguien atrás del mostrador. */
export function claridad(text: string): number {
	const words = text.trim().split(/\s+/).filter(Boolean)
	if (words.length < 12) return 3
	const long = words.filter((w) => w.length > 12).length
	const jargon = JARGON.filter((w) => text.toLowerCase().includes(w)).length
	const hasMonday = /lunes|ahora|abrí|entra|carpeta|link/i.test(text)
	let score = 9
	score -= Math.min(4, jargon * 2)
	score -= Math.min(3, Math.floor(long / 4))
	if (!hasMonday) score -= 2
	if (words.length > 180) score -= 1
	return Math.max(1, Math.min(10, score))
}
