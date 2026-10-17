import { useSyncExternalStore } from "react"

const THEME_KEY = "encomun-tema"
const MOTION_KEY = "encomun-movimiento"

export type ThemeName = "cosecha" | "campo" | "noche"
export type MotionName = "tocar" | "quieto"

type Prefs = { theme: ThemeName; motion: MotionName }

const SERVER: Prefs = { theme: "cosecha", motion: "tocar" }
const listeners = new Set<() => void>()
let snapshot: Prefs = SERVER

function themeOf(value: string | null): ThemeName {
	switch (value) {
		case "campo":
		case "noche":
		case "cosecha":
			return value
		default:
			return "cosecha"
	}
}

function pull(): Prefs {
	return {
		theme: themeOf(localStorage.getItem(THEME_KEY)),
		motion: localStorage.getItem(MOTION_KEY) === "quieto" ? "quieto" : "tocar",
	}
}

function read(): Prefs {
	const next = pull()
	if (next.theme === snapshot.theme && next.motion === snapshot.motion) return snapshot
	snapshot = next
	return snapshot
}

function publish(next: Prefs) {
	snapshot = next
	for (const listener of listeners) listener()
}

export function setTheme(theme: ThemeName) {
	localStorage.setItem(THEME_KEY, theme)
	publish({ ...read(), theme })
}

export function setMotion(motion: MotionName) {
	localStorage.setItem(MOTION_KEY, motion)
	publish({ ...read(), motion })
}

export function usePrefs(): Prefs {
	return useSyncExternalStore(
		(cb) => {
			listeners.add(cb)
			return () => listeners.delete(cb)
		},
		read,
		() => SERVER,
	)
}
