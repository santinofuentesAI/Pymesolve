import { useSyncExternalStore } from "react"

const THEME_KEY = "pymesolve-tema"
const MODE_KEY = "pymesolve-modo"

export type ThemeName = "papel" | "campo" | "noche"
export type AppMode = "inicio" | "dopamina"

type Prefs = { theme: ThemeName; appMode: AppMode }

const SERVER: Prefs = { theme: "papel", appMode: "inicio" }
const listeners = new Set<() => void>()
let snapshot: Prefs = SERVER

function themeOf(value: string | null): ThemeName {
	switch (value) {
		case "campo":
		case "noche":
		case "papel":
			return value
		default:
			return "papel"
	}
}

function modeOf(value: string | null): AppMode {
	return value === "dopamina" ? "dopamina" : "inicio"
}

function pull(): Prefs {
	return {
		theme: themeOf(localStorage.getItem(THEME_KEY)),
		appMode: modeOf(localStorage.getItem(MODE_KEY)),
	}
}

function read(): Prefs {
	const next = pull()
	if (next.theme === snapshot.theme && next.appMode === snapshot.appMode) {
		return snapshot
	}
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

export function setAppMode(appMode: AppMode) {
	localStorage.setItem(MODE_KEY, appMode)
	publish({ ...read(), appMode })
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
