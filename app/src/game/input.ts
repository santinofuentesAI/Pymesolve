// DeFiesta — unified input: gamepad (standard mapping) + keyboard.
// Screens subscribe with useInput(handler). Only mounted screens react, so
// conditionally render one screen at a time to avoid double handling.
import { useEffect, useRef, useSyncExternalStore } from "react"

export type InputAction =
	| "up"
	| "down"
	| "left"
	| "right"
	| "confirm"
	| "back"
	| "pause"

type Listener = (action: InputAction) => void

const listeners = new Set<Listener>()
let started = false
let rafId = 0

let prevButtons: boolean[] = []
let prevDir = { up: false, down: false, left: false, right: false }

// --- gamepad connection as an external store (for a "controller connected" hint)
let connected = false
const connListeners = new Set<() => void>()
function setConnected(v: boolean) {
	if (v !== connected) {
		connected = v
		connListeners.forEach((f) => f())
	}
}

function emit(action: InputAction) {
	listeners.forEach((l) => l(action))
}

const KEY_MAP: Record<string, InputAction> = {
	ArrowUp: "up",
	ArrowDown: "down",
	ArrowLeft: "left",
	ArrowRight: "right",
	w: "up",
	s: "down",
	a: "left",
	d: "right",
	W: "up",
	S: "down",
	A: "left",
	D: "right",
	" ": "confirm",
	Enter: "confirm",
	Escape: "back",
	Backspace: "back",
	p: "pause",
	P: "pause",
}

function onKey(e: KeyboardEvent) {
	const action = KEY_MAP[e.key]
	if (action) {
		e.preventDefault()
		emit(action)
	}
}

function poll() {
	const pads = navigator.getGamepads ? navigator.getGamepads() : []
	let any = false
	for (const gp of pads) {
		if (!gp) continue
		any = true
		const buttons = gp.buttons.map((b) => b.pressed)
		const edge = (i: number, action: InputAction) => {
			if (buttons[i] && !prevButtons[i]) emit(action)
		}
		edge(0, "confirm") // A / cross
		edge(1, "back") // B / circle
		edge(9, "pause") // start
		edge(12, "up")
		edge(13, "down")
		edge(14, "left")
		edge(15, "right")

		const ax = gp.axes[0] ?? 0
		const ay = gp.axes[1] ?? 0
		const th = 0.5
		const dir = { up: ay < -th, down: ay > th, left: ax < -th, right: ax > th }
		if (dir.up && !prevDir.up) emit("up")
		if (dir.down && !prevDir.down) emit("down")
		if (dir.left && !prevDir.left) emit("left")
		if (dir.right && !prevDir.right) emit("right")

		prevButtons = buttons
		prevDir = dir
		break // only the first connected pad drives the UI
	}
	setConnected(any)
	rafId = requestAnimationFrame(poll)
}

function start() {
	if (started || typeof window === "undefined") return
	started = true
	window.addEventListener("keydown", onKey)
	rafId = requestAnimationFrame(poll)
}

export function onInput(listener: Listener): () => void {
	listeners.add(listener)
	start()
	return () => {
		listeners.delete(listener)
	}
}

/** Subscribe a handler to input actions while `enabled`. */
export function useInput(handler: Listener, enabled = true) {
	const ref = useRef(handler)
	ref.current = handler
	useEffect(() => {
		if (!enabled) return
		return onInput((action) => ref.current(action))
	}, [enabled])
}

/** Whether at least one gamepad is currently connected. */
export function useGamepadConnected(): boolean {
	return useSyncExternalStore(
		(cb) => {
			connListeners.add(cb)
			start()
			return () => connListeners.delete(cb)
		},
		() => connected,
		() => false,
	)
}

// silence unused warning if tree-shaken builds complain
void rafId
