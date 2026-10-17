export function maskLabel(kind, isMe, isAdmin, name) {
	if (isAdmin || isMe) return name
	if (kind === "dev") return "Un oficio"
	if (kind === "admin") return "La mesa"
	return "Un comercio"
}

export function maskLedgerRow(row, actor) {
	const isAdmin = actor.role === "admin"
	const isMe = Boolean(actor.id) && row.actor_id === actor.id
	const label = maskLabel(row.kind, isMe, isAdmin, row.actor_name)
	let body = String(row.body ?? "")
	if (!isAdmin && !isMe && row.actor_name) {
		body = body.split(row.actor_name).join(label)
	}
	return {
		at: row.at,
		actor_name: isMe ? row.actor_name : label,
		body,
		mine: isMe,
	}
}
