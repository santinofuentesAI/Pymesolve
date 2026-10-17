import { useSyncExternalStore } from "react"

const ACTOR_KEY = "encomun-actor"

type Mode = { actorId: string }

const listeners = new Set<() => void>()
const SERVER: Mode = { actorId: "socio-elena" }
let snapshot: Mode = SERVER

function pull(): Mode {
	return { actorId: localStorage.getItem(ACTOR_KEY) ?? "socio-elena" }
}

function read(): Mode {
	const next = pull()
	if (next.actorId === snapshot.actorId) return snapshot
	snapshot = next
	return snapshot
}

export function setActor(actorId: string) {
	localStorage.setItem(ACTOR_KEY, actorId)
	snapshot = { actorId }
	for (const listener of listeners) listener()
}

export function useActor(): Mode {
	return useSyncExternalStore(
		(cb) => {
			listeners.add(cb)
			return () => listeners.delete(cb)
		},
		read,
		() => SERVER,
	)
}

export function actorHeaders(): Record<string, string> {
	return { "x-role": "socio", "x-actor-id": read().actorId }
}
