// Carrera: quien llega primero a la meta. El avance sale del store (act).
import { Billboard, Text } from "@react-three/drei"
import { Canvas, useFrame } from "@react-three/fiber"
import { Suspense, useMemo, useRef } from "react"
import * as THREE from "three"
import { useGameStore } from "../../store"

const LANES = [-2.25, -0.75, 0.75, 2.25]
const TRACK_END = 34

function Runner({
	lane,
	progress,
	color,
	name,
}: {
	lane: number
	progress: number
	color: string
	name: string
}) {
	const group = useRef<THREE.Group>(null)
	const left = useRef<THREE.Mesh>(null)
	const right = useRef<THREE.Mesh>(null)
	const goal = useRef(new THREE.Vector3(LANES[lane] ?? 0, 0, 0))

	useFrame(({ clock }) => {
		const g = group.current
		if (!g) return
		const z = (progress / 100) * TRACK_END
		goal.current.set(LANES[lane] ?? 0, 0, z)
		g.position.lerp(goal.current, 0.18)
		const run = progress > 0 && progress < 100 ? 14 : 2
		const swing = Math.sin(clock.elapsedTime * run + lane) * 0.7
		if (left.current) left.current.rotation.x = swing
		if (right.current) right.current.rotation.x = -swing
		g.position.y = progress >= 100 ? 0.15 : Math.abs(Math.sin(clock.elapsedTime * run)) * 0.08
	})

	return (
		<group ref={group} position={[LANES[lane] ?? 0, 0, 0]}>
			<mesh position={[0, 0.72, 0]} castShadow>
				<capsuleGeometry args={[0.26, 0.46, 4, 8]} />
				<meshStandardMaterial color={color} roughness={0.4} />
			</mesh>
			<mesh position={[0, 1.22, 0]} castShadow>
				<sphereGeometry args={[0.2, 16, 16]} />
				<meshStandardMaterial color="#f3d2b3" roughness={0.6} />
			</mesh>
			<mesh ref={left} position={[-0.32, 0.78, 0]} castShadow>
				<boxGeometry args={[0.12, 0.42, 0.12]} />
				<meshStandardMaterial color={color} />
			</mesh>
			<mesh ref={right} position={[0.32, 0.78, 0]} castShadow>
				<boxGeometry args={[0.12, 0.42, 0.12]} />
				<meshStandardMaterial color={color} />
			</mesh>
			<mesh position={[0, 1.22, 0.16]} castShadow>
				<sphereGeometry args={[0.08, 10, 10]} />
				<meshStandardMaterial color="#2a241c" />
			</mesh>
			<Billboard position={[0, 1.7, 0]}>
				<Text fontSize={0.28} color="#1a140c" anchorX="center" anchorY="middle">
					{name}
				</Text>
			</Billboard>
		</group>
	)
}

function FollowLead() {
	const scores = useGameStore((s) => s.mini?.scores)
	const lead = useMemo(() => new THREE.Vector3(), [])
	const look = useMemo(() => new THREE.Vector3(), [])

	useFrame((state) => {
		const best = scores?.reduce((max, score) => Math.max(max, score), 0) ?? 0
		const z = (best / 100) * TRACK_END
		lead.set(0, 8.2, z - 20)
		look.set(0, 0.9, z)
		state.camera.position.lerp(lead, 0.08)
		state.camera.lookAt(look)
	})

	return null
}

function Track() {
	const checkers = []
	for (let i = 0; i < 8; i++) {
		checkers.push(
			<mesh
				key={i}
				position={[-1.6 + (i % 4) * 0.8, 0.06, TRACK_END + Math.floor(i / 4) * 0.8]}
				receiveShadow
			>
				<boxGeometry args={[0.8, 0.08, 0.8]} />
				<meshStandardMaterial color={i % 2 === 0 ? "#f4efe4" : "#1a140c"} />
			</mesh>,
		)
	}

	return (
		<group>
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 16]} receiveShadow>
				<planeGeometry args={[18, 48]} />
				<meshStandardMaterial color="#7dbe6a" />
			</mesh>
			<mesh position={[0, 0.02, 16]} receiveShadow>
				<boxGeometry args={[6.2, 0.08, 36]} />
				<meshStandardMaterial color="#d7c4a3" />
			</mesh>
			{LANES.map((x) => (
				<mesh key={x} position={[x, 0.08, 16]}>
					<boxGeometry args={[0.06, 0.02, 34]} />
					<meshStandardMaterial color="#f4efe4" />
				</mesh>
			))}
			{[-3.15, 3.15].map((x) =>
				Array.from({ length: 18 }, (_, i) => (
					<mesh key={`${x}-${i}`} position={[x, 0.12, i * 2]} receiveShadow>
						<boxGeometry args={[0.28, 0.16, 1.7]} />
						<meshStandardMaterial color={i % 2 === 0 ? "#ff4d6d" : "#f4efe4"} />
					</mesh>
				)),
			)}
			{checkers}
			<Billboard position={[0, 1.6, TRACK_END + 1.2]}>
				<Text fontSize={0.7} color="#ff4d6d" anchorX="center">
					META
				</Text>
			</Billboard>
			{[-4.2, 4.2].map((x) =>
				[4, 12, 20, 28].map((z) => (
					<mesh key={`${x}-${z}`} position={[x, 0.9, z]} castShadow>
						<boxGeometry args={[0.35, 1.8, 0.35]} />
						<meshStandardMaterial color={x < 0 ? "#ffd24d" : "#4db5ff"} />
					</mesh>
				)),
			)}
		</group>
	)
}

export default function RaceArena() {
	const players = useGameStore((s) => s.match?.players ?? [])
	const scores = useGameStore((s) => s.mini?.scores ?? [0, 0, 0, 0])

	return (
		<Canvas
			shadows
			className="mini-canvas"
			camera={{ position: [0, 5, -8], fov: 42 }}
			style={{ position: "absolute", inset: 0 }}
			gl={{ preserveDrawingBuffer: true, antialias: true }}
		>
			<color attach="background" args={["#8ec8ef"]} />
			<fog attach="fog" args={["#8ec8ef", 18, 42]} />
			<ambientLight intensity={0.65} />
			<directionalLight
				position={[6, 12, 4]}
				intensity={1.35}
				castShadow
				shadow-mapSize-width={1024}
				shadow-mapSize-height={1024}
			/>
			<Suspense fallback={null}>
				<FollowLead />
				<Track />
				{players.map((player, seat) => (
					<Runner
						key={player.id}
						lane={seat}
						progress={scores[seat] ?? 0}
						color={player.color}
						name={player.name}
					/>
				))}
			</Suspense>
		</Canvas>
	)
}
