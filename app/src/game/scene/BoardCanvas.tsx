// DeFiesta — 3D scene. Read-only: it only visualizes the game store.
import { Canvas, useFrame } from "@react-three/fiber"
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing"
import { useMemo, useRef } from "react"
import * as THREE from "three"
import { BOARD } from "../board"
import { useGameStore } from "../store"
import City from "./City"
import {
	BG_COLOR,
	CAMERA_POSITION,
	CAMERA_TARGET,
	CLOSE_OFFSET,
	FOG_COLOR,
	HEAD_LIFT,
	TOKEN_BASE_Y,
	cameraCloseWeight,
	rollJump,
	syncRoll,
} from "./constants"
import { Dice, Tokens, cornerOffset } from "./Pieces"
import Track from "./Track"

function CameraRig() {
	const phase = useGameStore((s) => s.match?.phase)
	const players = useGameStore((s) => s.match?.players)
	const current = useGameStore((s) => s.match?.current ?? 0)
	const look = useRef(
		new THREE.Vector3(CAMERA_TARGET[0], CAMERA_TARGET[1], CAMERA_TARGET[2]),
	)
	const overview = useMemo(() => new THREE.Vector3(...CAMERA_POSITION), [])
	const overviewLook = useMemo(
		() => new THREE.Vector3(CAMERA_TARGET[0], CAMERA_TARGET[1], CAMERA_TARGET[2]),
		[],
	)
	const closePos = useMemo(() => new THREE.Vector3(), [])
	const closeLook = useMemo(() => new THREE.Vector3(), [])

	useFrame((state) => {
		const clock = syncRoll(phase, performance.now())
		const weight = cameraCloseWeight(clock.elapsed)
		const player = players?.[current]
		const space = player ? (BOARD[player.position] ?? BOARD[0]) : undefined
		const offset = cornerOffset(current)
		const px = (space?.x ?? 0) + offset.x
		const pz = (space?.z ?? 0) + offset.z
		const jump = rollJump(clock.elapsed)

		closePos.set(
			px + CLOSE_OFFSET[0],
			TOKEN_BASE_Y + CLOSE_OFFSET[1],
			pz + CLOSE_OFFSET[2],
		)
		closeLook.set(px, TOKEN_BASE_Y + HEAD_LIFT + jump, pz)

		const sway = (1 - weight) * Math.sin(state.clock.elapsedTime * 0.18) * 0.08
		state.camera.position.lerpVectors(overview, closePos, weight)
		state.camera.position.x += sway
		look.current.lerpVectors(overviewLook, closeLook, weight)
		state.camera.lookAt(look.current)
	})

	return null
}

function Lights() {
	return (
		<>
			<ambientLight color="#c4c8e6" intensity={0.62} />
			<directionalLight color="#fff4e2" position={[7, 16, 9]} intensity={1.25} />
		</>
	)
}

function Scene() {
	return (
		<>
			<color attach="background" args={[BG_COLOR]} />
			<fogExp2 attach="fog" args={[FOG_COLOR, 0.012]} />
			<Lights />
			<CameraRig />
			<City />
			<Track />
			<Tokens />
			<Dice />
			<EffectComposer multisampling={4}>
				<Bloom
					intensity={0.35}
					luminanceThreshold={0.85}
					luminanceSmoothing={0.3}
					mipmapBlur
				/>
				<Vignette eskil={false} offset={0.15} darkness={0.45} />
			</EffectComposer>
		</>
	)
}

export default function BoardCanvas() {
	return (
		<Canvas
			style={{ width: "100%", height: "100%" }}
			camera={{ position: CAMERA_POSITION, fov: 50, near: 0.1, far: 220 }}
			gl={{ antialias: false, powerPreference: "high-performance" }}
			dpr={[1, 1.75]}
			onCreated={({ camera }) =>
				camera.lookAt(CAMERA_TARGET[0], CAMERA_TARGET[1], CAMERA_TARGET[2])
			}
		>
			<Scene />
		</Canvas>
	)
}
