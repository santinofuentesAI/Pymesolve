const STOP = new Set(
	"el la los las un una unos unas de del al y o a en que se su sus para con por un no hoy ya le les lo como más mas".split(
		" ",
	),
)

export function tokens(text) {
	return (text || "")
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.split(/[^a-z0-9áéíóúñü]+/i)
		.map((w) => w.trim())
		.filter((w) => w.length > 3 && !STOP.has(w))
}

function jaccard(a, b) {
	const A = new Set(a)
	const B = new Set(b)
	let inter = 0
	for (const x of A) if (B.has(x)) inter++
	const union = A.size + B.size - inter
	return union === 0 ? 0 : inter / union
}

/**
 * Gemelos: problemas del mismo rubro que dicen casi lo mismo.
 * En Upwork cada pyme pagaría un trabajo aparte; acá se junta el dinero.
 */
export function findTwins(problems, target, { excludeId } = {}) {
	const t = tokens(`${target.title} ${target.body} ${target.category}`)
	return problems
		.filter((p) => p.id !== excludeId && !p.pool_id && !p.poolId)
		.filter((p) => p.category === target.category)
		.map((p) => ({
			...p,
			score: jaccard(t, tokens(`${p.title} ${p.body} ${p.category}`)),
		}))
		.filter((p) => p.score >= 0.12)
		.sort((a, b) => b.score - a.score)
}

export function suggestGroups(problems) {
	const open = problems.filter((p) => !p.pool_id)
	const byCat = new Map()
	for (const p of open) {
		const list = byCat.get(p.category) ?? []
		list.push(p)
		byCat.set(p.category, list)
	}
	const groups = []
	for (const [category, list] of byCat) {
		if (list.length < 2) continue
		const used = new Set()
		for (const seed of list) {
			if (used.has(seed.id)) continue
			const twins = findTwins(list, seed, { excludeId: seed.id }).filter(
				(t) => !used.has(t.id),
			)
			if (twins.length === 0) continue
			const members = [seed, ...twins.slice(0, 2)]
			for (const m of members) used.add(m.id)
			groups.push({
				category,
				problemIds: members.map((m) => m.id),
				names: members.map((m) => m.pyme_name ?? m.title),
				amountUsdc: members.reduce((s, m) => s + Number(m.amount_usdc), 0),
				summary: summarize(category, members),
			})
		}
	}
	return groups
}

export function summarize(category, members) {
	const n = members.length
	const names = members.map((m) => m.pyme_name || "una pyme").join(", ")
	if (category === "videos") {
		return `${n} comercios piden lo mismo: un video corto para redes. En vez de pagar tres veces, juntan un solo encargo.`
	}
	if (category === "web") {
		return `${n} pymes (${names}) necesitan una página o un turno simple. Un solo trabajo les sirve a todas.`
	}
	if (category === "marca") {
		return `${n} oficios (${names}) quieren verse serios sin una agencia. Un criterio de marca alcanza para las tres.`
	}
	return `${n} pymes del rubro ${category} describieron el mismo hueco. ${names}.`
}
