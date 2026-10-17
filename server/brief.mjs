/** Expediente determinista para el asistente. Sin API key; el jurado lo ve siempre. */

export function writeBrief({ pool, members, delivery, messages, summon, problems }) {
	const names = members.map((m) => m.name).join(", ")
	const committed = Number(pool.committed_usdc)
	const letter = pool.letter?.trim() || ""
	const lastDelivery = delivery
	const claim = summon.reason.trim()
	const caller = members.find((m) => m.id === summon.caller_id)?.name ?? "Una pyme"
	const devReplies = messages.filter(
		(m) => m.role === "dev" && new Date(m.created_at) >= new Date(summon.created_at),
	)
	const reply = devReplies.at(-1)?.body ?? "El dev todavía no contestó el reclamo."

	const suggestedDev = round2(committed * (2 / 3))
	const suggestedRefund = round2(committed - suggestedDev)
	const each = members.length ? round2(suggestedRefund / members.length) : 0

	const body = [
		`Encargo #${pool.id}: ${pool.title}.`,
		`Pymes: ${names}. Juntaron ${fmt(committed)} USDC, cada una con su moneda nominada.`,
		problems?.length
			? `Lo que pidieron: ${problems.map((p) => `${p.pyme_name}: «${p.title}»`).join(" · ")}`
			: "",
		lastDelivery
			? `El dev entregó ${lastDelivery.kind === "plan" ? "un plan" : "la carpeta"} en ${lastDelivery.url}. Dijo: «${clip(lastDelivery.explanation)}».`
			: "Todavía no hay carpeta de entrega.",
		letter
			? `Carta al mostrador (sello ${pool.letter_hash?.slice(0, 8) ?? "—"}): «${clip(letter)}».`
			: "No hay carta al mostrador sellada.",
		`${caller} pidió pagar menos: «${clip(claim)}».`,
		`El dev: «${clip(reply)}».`,
		`Borrador de mesa (no es el veredicto): ${fmt(suggestedDev)} USDC al dev. Vuelven ${fmt(suggestedRefund)} USDC a las pymes (${fmt(each)} a cada una). El asistente puede cambiar los montos. La IA no firma.`,
	]
		.filter(Boolean)
		.join("\n\n")

	return { body, suggestedDev, suggestedRefund }
}

function clip(s, n = 280) {
	const t = (s || "").replace(/\s+/g, " ").trim()
	return t.length > n ? `${t.slice(0, n)}…` : t
}

function fmt(n) {
	return Number(n).toLocaleString("es-AR", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	})
}

function round2(n) {
	return Math.round(n * 100) / 100
}
