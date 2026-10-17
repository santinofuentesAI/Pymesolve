// DeFiesta — tokens and the Mario Party dice block (read-only store).
import { RoundedBox, Text } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import * as THREE from "three"
import { BOARD } from "../board"
import { PLAYER_COLORS, useGameStore, type Player } from "../store"
import {
	DICE_IMPACT_MS,
	DICE_LIFT,
	DICE_ROLL_MS,
	DICE_SPIN_UNTIL_MS,
	TOKEN_BASE_Y,
	rollJump,
	smoothstep,
	syncRoll,
} from "./constants"

const TOKEN_OFFSET_RADIUS = 0.45
const TOKEN_LERP = 0.15
const HOP_DISTANCE = 0.1
const DICE_SIZE = 0.9

type Face = 1 | 2 | 3 | 4 | 5 | 6

interface DiceFace {
	n: Face
	position: [number, number, number]
	rotation: [number, number, number]
}

const FACE_OFFSET = DICE_SIZE / 2 + 0.02

const DICE_FACES: DiceFace[] = [
	{ n: 1, position: [0, FACE_OFFSET, 0], rotation: [-Math.PI / 2, 0, 0] },
	{ n: 6, position: [0, -FACE_OFFSET, 0], rotation: [Math.PI / 2, 0, 0] },
	{ n: 2, position: [FACE_OFFSET, 0, 0], rotation: [0, Math.PI / 2, 0] },
	{ n: 5, position: [-FACE_OFFSET, 0, 0], rotation: [0, -Math.PI / 2, 0] },
	{ n: 3, position: [0, 0, FACE_OFFSET], rotation: [0, 0, 0] },
	{ n: 4, position: [0, 0, -FACE_OFFSET], rotation: [0, Math.PI, 0] },
]

function asFace(n: number): Face {
	if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5 || n === 6) return n
	return 1
}

/** Group rotation that parks this face on top, readable from +Z. */
function settleQuaternion(rotation: [number, number, number]): THREE.Quaternion {
	const text = new THREE.Object3D()
	text.rotation.set(rotation[0], rotation[1], rotation[2])
	const n = new THREE.Vector3(0, 0, 1).applyQuaternion(text.quaternion).normalize()
	const u = new THREE.Vector3(0, 1, 0).applyQuaternion(text.quaternion).normalize()
	const right = new THREE.Vector3().crossVectors(u, n).normalize()
	const local = new THREE.Matrix4().makeBasis(right, u, n)
	const target = new THREE.Matrix4().makeBasis(
		new THREE.Vector3(1, 0, 0),
		new THREE.Vector3(0, 0, -1),
		new THREE.Vector3(0, 1, 0),
	)
	target.multiply(local.invert())
	return new THREE.Quaternion().setFromRotationMatrix(target)
}

const SETTLE = new Map<Face, THREE.Quaternion>(
	DICE_FACES.map((face) => [face.n, settleQuaternion(face.rotation)]),
)

/** Corner offset so up to 4 tokens on one space never overlap. */
export function cornerOffset(playerIndex: number): { x: number; z: number } {
	const angle = Math.PI / 4 + (playerIndex % 4) * (Math.PI / 2)
	return {
		x: Math.cos(angle) * TOKEN_OFFSET_RADIUS,
		z: Math.sin(angle) * TOKEN_OFFSET_RADIUS,
	}
}

function lerpFactor(delta: number): number {
	return 1 - Math.pow(1 - TOKEN_LERP, delta * 60)
}

function tokenSpot(player: Player, index: number): { x: number; z: number } {
	const space = BOARD[player.position] ?? BOARD[0]
	const offset = cornerOffset(index)
	return {
		x: (space?.x ?? 0) + offset.x,
		z: (space?.z ?? 0) + offset.z,
	}
}

function Token({
	player,
	index,
	isCurrent,
}: {
	player: Player
	index: number
	isCurrent: boolean
}) {
	const groupRef = useRef<THREE.Group>(null)
	const bodyRef = useRef<THREE.Group>(null)
	const ringRef = useRef<THREE.Mesh>(null)
	const markerRef = useRef<THREE.Mesh>(null)
	const placed = useRef(false)
	const phase = useGameStore((s) => s.match?.phase)

	const color =
		player.color || PLAYER_COLORS[index % PLAYER_COLORS.length] || "#ffffff"
	const spot = tokenSpot(player, index)

	useFrame((state, delta) => {
		const group = groupRef.current
		if (!group) return
		const clock = syncRoll(phase, performance.now())
		const elapsed = isCurrent ? clock.elapsed : null
		const arc = rollJump(elapsed)

		if (!placed.current) {
			group.position.set(spot.x, TOKEN_BASE_Y, spot.z)
			placed.current = true
		}

		const k = lerpFactor(delta)
		const dx = spot.x - group.position.x
		const dz = spot.z - group.position.z
		const hopping = Math.hypot(dx, dz) > HOP_DISTANCE
		group.position.x += dx * k
		group.position.z += dz * k

		const t = state.clock.elapsedTime
		if (isCurrent && elapsed !== null && !hopping) {
			group.position.y = TOKEN_BASE_Y + arc
		} else {
			const targetY = hopping
				? TOKEN_BASE_Y + Math.abs(Math.sin(t * 12)) * 0.55
				: TOKEN_BASE_Y
			group.position.y += (targetY - group.position.y) * Math.min(1, k * 1.6)
		}

		const body = bodyRef.current
		if (body) {
			const jumping = arc > 0
			const lean =
				elapsed !== null ? Math.min(1, Math.max(0, (elapsed - 400) / 500)) : 0
			body.rotation.x = jumping ? Math.sin(lean * Math.PI) * -0.55 : 0
			const pulse = isCurrent && !jumping ? 1.12 + Math.sin(t * 5) * 0.04 : 1
			const stretch = jumping ? 1.12 + Math.sin(lean * Math.PI) * 0.12 : pulse
			body.scale.set(isCurrent ? 1.12 : 1, stretch, isCurrent ? 1.12 : 1)
		}
		const ring = ringRef.current
		if (ring) {
			ring.rotation.z = t * 1.4
		}
		const marker = markerRef.current
		if (marker) {
			marker.position.y = 0.85 + Math.sin(t * 4) * 0.06
			marker.rotation.y = t * 2
		}
	})

	return (
		<group ref={groupRef}>
			<group ref={bodyRef}>
				<mesh>
					<capsuleGeometry args={[0.2, 0.28, 6, 10]} />
					<meshStandardMaterial
						color={color}
						emissive={color}
						emissiveIntensity={isCurrent ? 0.75 : 0.35}
						roughness={0.38}
						metalness={0.2}
					/>
				</mesh>
			</group>
			{isCurrent ? (
				<>
					<mesh
						ref={ringRef}
						position={[0, -0.32, 0]}
						rotation={[-Math.PI / 2, 0, 0]}
					>
						<torusGeometry args={[0.38, 0.035, 6, 20]} />
						<meshStandardMaterial
							color={color}
							emissive={color}
							emissiveIntensity={0.9}
							roughness={0.35}
						/>
					</mesh>
					<mesh ref={markerRef} position={[0, 0.85, 0]} rotation={[Math.PI, 0, 0]}>
						<coneGeometry args={[0.14, 0.26, 4]} />
						<meshStandardMaterial
							color={color}
							emissive={color}
							emissiveIntensity={0.8}
							roughness={0.4}
						/>
					</mesh>
				</>
			) : null}
		</group>
	)
}

export function Tokens() {
	const players = useGameStore((s) => s.match?.players)
	const current = useGameStore((s) => s.match?.current)
	if (!players) return null
	return (
		<>
			{players.map((player, index) => (
				<Token
					key={player.id}
					player={player}
					index={index}
					isCurrent={index === current}
				/>
			))}
		</>
	)
}

function diceHop(elapsed: number): number {
	const t = (elapsed - DICE_IMPACT_MS) / 320
	if (t <= 0 || t >= 1) return 0
	return Math.sin(t * Math.PI) * 0.42
}

export function Dice() {
	const groupRef = useRef<THREE.Group>(null)
	const phase = useGameStore((s) => s.match?.phase)
	const dice = useGameStore((s) => s.match?.dice ?? null)
	const players = useGameStore((s) => s.match?.players)
	const current = useGameStore((s) => s.match?.current ?? 0)
	const quat = useRef(new THREE.Quaternion())
	const gen = useRef(-1)
	const spinAxis = useMemo(
		() => new THREE.Vector3(0.45, 0.85, 0.28).normalize(),
		[],
	)
	const tmp = useMemo(() => new THREE.Quaternion(), [])

	const player = players?.[current]
	const spot = player ? tokenSpot(player, current) : { x: 0, z: 0 }
	const face = asFace(dice ?? 1)
	const settled = SETTLE.get(face) ?? SETTLE.get(1)

	useFrame((_, delta) => {
		const group = groupRef.current
		if (!group || !settled) return
		const clock = syncRoll(phase, performance.now())
		if (clock.generation !== gen.current) {
			gen.current = clock.generation
			quat.current.identity()
		}
		const show = clock.elapsed !== null || clock.linger
		group.visible = show
		if (!show) return

		if (clock.elapsed === null) {
			quat.current.copy(settled)
			group.quaternion.copy(quat.current)
			group.position.set(spot.x, TOKEN_BASE_Y + DICE_LIFT, spot.z)
			return
		}

		const elapsed = clock.elapsed
		group.position.set(spot.x, TOKEN_BASE_Y + DICE_LIFT + diceHop(elapsed), spot.z)

		let rate = 0.35
		if (elapsed >= DICE_IMPACT_MS && elapsed < DICE_SPIN_UNTIL_MS) {
			rate = 16
		} else if (elapsed >= DICE_SPIN_UNTIL_MS) {
			const u = smoothstep(
				(elapsed - DICE_SPIN_UNTIL_MS) / (DICE_ROLL_MS - DICE_SPIN_UNTIL_MS),
			)
			rate = (1 - u) * (1 - u) * 9
			tmp.setFromAxisAngle(spinAxis, rate * delta)
			quat.current.multiply(tmp)
			quat.current.slerp(settled, Math.min(1, 0.1 + u * 0.8))
			if (u > 0.86) quat.current.copy(settled)
			group.quaternion.copy(quat.current)
			return
		}

		tmp.setFromAxisAngle(spinAxis, rate * delta)
		quat.current.multiply(tmp)
		group.quaternion.copy(quat.current)
	})

	if (!players) return null

	return (
		<group ref={groupRef} position={[spot.x, TOKEN_BASE_Y + DICE_LIFT, spot.z]} visible={false}>
			<RoundedBox args={[DICE_SIZE, DICE_SIZE, DICE_SIZE]} radius={0.12} smoothness={3}>
				<meshStandardMaterial
					color="#f4f7ff"
					emissive="#9ec9ff"
					emissiveIntensity={0.28}
					roughness={0.32}
					metalness={0.08}
				/>
			</RoundedBox>
			{DICE_FACES.map((item) => (
				<Text
					key={item.n}
					position={item.position}
					rotation={item.rotation}
					fontSize={0.4}
					color="#241433"
					anchorX="center"
					anchorY="middle"
					fontWeight="bold"
				>
					{String(item.n)}
				</Text>
			))}
		</group>
	)
}
