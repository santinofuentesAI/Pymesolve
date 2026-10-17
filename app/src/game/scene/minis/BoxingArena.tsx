// Ring de cuatro. Cada golpe (impulse) lanza al peleador hacia quien más vida tiene.
import { Billboard, Text } from "@react-three/drei"
import { Canvas, useFrame } from "@react-three/fiber"
import { Suspense, useRef } from "react"
import * as THREE from "three"
import { useGameStore } from "../../store"

const CORNERS: [number, number][] = [
	[-2.2, -2.2],
	[2.2, -2.2],
	[-2.2, 2.2],
	[2.2, 2.2],
]

function targetOf(scores: number[], seat: number): [number, number] {
	let best = -1
	let highest = 0
	scores.forEach((health, index) => {
		if (index !== seat && health > highest) {
			highest = health
			best = index
		}
	})
	const corner = CORNERS[best] ?? [0, 0]
	return corner
}

function Fighter({
	seat,
	color,
	name,
	health,
	impulse,
	scores,
}: {
	seat: number
	color: string
	name: string
	health: number
	impulse: number
	scores: number[]
}) {
	const group = useRef<THREE.Group>(null)
	const glove = useRef<THREE.Group>(null)
	const home = CORNERS[seat] ?? [0, 0]
	const prev = useRef(impulse)
	const lunge = useRef(0)
	const aim = useRef(new THREE.Vector3(home[0], 0, home[1]))

	useFrame((_, dt) => {
		const g = group.current
		if (!g) return
		if (impulse !== prev.current) {
			prev.current = impulse
			lunge.current = 1
		}
		lunge.current = Math.max(0, lunge.current - dt * 2.4)
		const [tx, tz] = health > 0 ? targetOf(scores, seat) : home
		aim.current.set(
			THREE.MathUtils.lerp(home[0] ?? 0, tx * 0.35, lunge.current),
			health > 0 ? 0 : -0.45,
			THREE.MathUtils.lerp(home[1] ?? 0, tz * 0.35, lunge.current),
		)
		g.position.lerp(aim.current, 0.25)
		if (health > 0) g.lookAt(tx, 0.8, tz)
		else g.rotation.z = 1.2
		if (glove.current) {
			glove.current.position.z = 0.35 + lunge.current * 0.55
		}
	})

	return (
		<group ref={group} position={[home[0] ?? 0, 0, home[1] ?? 0]}>
			<mesh position={[0, 0.85, 0]} castShadow>
				<capsuleGeometry args={[0.28, 0.5, 4, 8]} />
				<meshStandardMaterial color={color} roughness={0.45} />
			</mesh>
			<mesh position={[0, 1.4, 0]} castShadow>
				<sphereGeometry args={[0.22, 16, 16]} />
				<meshStandardMaterial color="#f3d2b3" roughness={0.55} />
			</mesh>
			<group ref={glove} position={[0.15, 0.95, 0.35]}>
				<mesh castShadow>
					<sphereGeometry args={[0.16, 12, 12]} />
					<meshStandardMaterial color="#f4efe4" roughness={0.35} />
				</mesh>
			</group>
			<mesh position={[-0.28, 0.9, 0.1]} castShadow>
				<sphereGeometry args={[0.12, 10, 10]} />
				<meshStandardMaterial color="#f4efe4" />
			</mesh>
			<Billboard position={[0, 2.15, 0]}>
				<Text fontSize={0.22} color="#f4efe4" anchorX="center">
					{name}
				</Text>
			</Billboard>
		</group>
	)
}

function Ropes() {
	const sides: [number, number, number, number][] = [
		[0, 0, 2.8, 0],
		[0, 0, -2.8, 0],
		[2.8, 0, 0, Math.PI / 2],
		[-2.8, 0, 0, Math.PI / 2],
	]
	return (
		<group>
			{sides.map(([x, , z, rot], index) =>
				[0.45, 0.9, 1.35].map((y) => (
					<mesh key={`${index}-${y}`} position={[x, y, z]} rotation={[0, rot, 0]}>
						<boxGeometry args={[5.6, 0.06, 0.06]} />
						<meshStandardMaterial color="#ff4d6d" />
					</mesh>
				)),
			)}
			{[
				[-2.8, -2.8],
				[2.8, -2.8],
				[-2.8, 2.8],
				[2.8, 2.8],
			].map(([x, z]) => (
				<mesh key={`${x}-${z}`} position={[x ?? 0, 0.9, z ?? 0]} castShadow>
					<cylinderGeometry args={[0.1, 0.1, 1.9, 8]} />
					<meshStandardMaterial color="#f4efe4" />
				</mesh>
			))}
		</group>
	)
}

export default function BoxingArena() {
	const players = useGameStore((s) => s.match?.players ?? [])
	const scores = useGameStore((s) => s.mini?.scores ?? [100, 100, 100, 100])
	const impulse = useGameStore((s) => s.mini?.impulse ?? [0, 0, 0, 0])

	return (
		<Canvas
			shadows
			camera={{ position: [0, 7.2, 9.4], fov: 42 }}
			style={{ position: "absolute", inset: 0 }}
			gl={{ preserveDrawingBuffer: true, antialias: true }}
		>
			<color attach="background" args={["#140e12"]} />
			<ambientLight intensity={0.28} />
			<spotLight
				position={[0, 10, 2]}
				angle={0.55}
				penumbra={0.45}
				intensity={80}
				castShadow
				color="#ffe6c2"
			/>
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
				<circleGeometry args={[3.15, 32]} />
				<meshStandardMaterial color="#c9a27a" roughness={0.8} />
			</mesh>
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
				<circleGeometry args={[7, 32]} />
				<meshStandardMaterial color="#1c1418" />
			</mesh>
			<Suspense fallback={null}>
				<Ropes />
				<Billboard position={[0, 3.2, -3.4]}>
					<Text fontSize={0.45} color="#ffd24d" anchorX="center">
						RING
					</Text>
				</Billboard>
				{players.map((player, seat) => (
					<Fighter
						key={player.id}
						seat={seat}
						color={player.color}
						name={player.name}
						health={scores[seat] ?? 0}
						impulse={impulse[seat] ?? 0}
						scores={scores}
					/>
				))}
			</Suspense>
		</Canvas>
	)
}
