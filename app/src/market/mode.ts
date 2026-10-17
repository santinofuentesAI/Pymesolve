import { useSyncExternalStore } from "react"
import { type Role } from "./types"

const ROLE_KEY = "pymesolve-role"
const ACTOR_KEY = "pymesolve-actor"

type Mode = { role: Role; actorId: string }

const listeners = new Set<() => void>()

const SERVER_SNAPSHOT: Mode = {
	role: "pyme",
	actorId: "pyme-soda",
}

let snapshot: Mode = SERVER_SNAPSHOT

function roleOf(value: string | null): Role {
	switch (value) {
		case "dev":
		case "admin":
		case "pyme":
			return value
		default:
			return "pyme"
	}
}

function pull(): Mode {
	return {
		role: roleOf(localStorage.getItem(ROLE_KEY)),
		actorId: localStorage.getItem(ACTOR_KEY) ?? "pyme-soda",
	}
}

function same(a: Mode, b: Mode) {
	return a.role === b.role && a.actorId === b.actorId
}

function read(): Mode {
	const next = pull()
	if (same(snapshot, next)) return snapshot
	snapshot = next
	return snapshot
}

function emit() {
	snapshot = pull()
	for (const l of listeners) l()
}

export function resetSession() {
	localStorage.setItem(ROLE_KEY, "pyme")
	localStorage.setItem(ACTOR_KEY, "pyme-soda")
	emit()
}

export function setMode(next: Partial<Mode>) {
	const cur = read()
	if (next.role) localStorage.setItem(ROLE_KEY, next.role)
	if (next.actorId) localStorage.setItem(ACTOR_KEY, next.actorId)
	if (next.role === "admin") localStorage.setItem(ACTOR_KEY, "admin-mesa")
	if (next.role === "dev" && (next.actorId == null || cur.actorId.startsWith("pyme-"))) {
		localStorage.setItem(ACTOR_KEY, "dev-karla")
	}
	if (next.role === "pyme" && (next.actorId == null || cur.actorId.startsWith("dev-"))) {
		localStorage.setItem(ACTOR_KEY, "pyme-soda")
	}
	emit()
}

export function useMode(): Mode {
	return useSyncExternalStore(
		(cb) => {
			listeners.add(cb)
			return () => listeners.delete(cb)
		},
		read,
		() => SERVER_SNAPSHOT,
	)
}

export function modeHeaders(): Record<string, string> {
	const { role, actorId } = read()
	return { "x-role": role, "x-actor-id": actorId }
}
