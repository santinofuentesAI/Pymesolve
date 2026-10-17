// DeFiesta — the street IS the board. Slabs sit on the asphalt.
import { RoundedBox, Text } from "@react-three/drei"
import { useEffect, useMemo } from "react"
import * as THREE from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { BOARD, SPACE_META, type Space } from "../board"
import { TILE_H, TILE_TOP, TILE_Y, neonAt, orientedBox } from "./constants"

const STREET_W = 1.76
const SLAB = 1.44

function useAsphalt(): THREE.BufferGeometry | null {
	const geometry = useMemo(() => {
		const parts: THREE.BufferGeometry[] = []
		for (let i = 0; i < BOARD.length; i++) {
			const from = BOARD[i]
			const to = BOARD[(i + 1) % BOARD.length]
			if (!from || !to) continue
			const dx = to.x - from.x
			const dz = to.z - from.z
			const length = Math.hypot(dx, dz)
			const angle = Math.atan2(dx, dz)
			const mid = new THREE.Vector3((from.x + to.x) / 2, 0, (from.z + to.z) / 2)
			// Stop short of the corner so the node square can sit there without z-fighting.
			const span = Math.max(0.2, length - STREET_W)
			parts.push(orientedBox(STREET_W, 0.08, span, 0, 0.04, angle, mid))
			parts.push(
				orientedBox(
					STREET_W,
					0.08,
					STREET_W,
					0,
					0.041,
					0,
					new THREE.Vector3(from.x, 0, from.z),
				),
			)
		}
		if (parts.length === 0) return null
		const merged = mergeGeometries(parts, false)
		for (const part of parts) part.dispose()
		return merged
	}, [])

	useEffect(() => {
		return () => geometry?.dispose()
	}, [geometry])

	return geometry
}

function Tile({ space }: { space: Space }) {
	const meta = SPACE_META[space.type]
	return (
		<group position={[space.x, 0, space.z]}>
			<RoundedBox
				args={[SLAB, TILE_H, SLAB]}
				radius={0.05}
				smoothness={2}
				position={[0, TILE_Y, 0]}
			>
				<meshStandardMaterial
					color={meta.color}
					emissive={meta.color}
					emissiveIntensity={0.55}
					roughness={0.42}
					metalness={0.12}
				/>
			</RoundedBox>
			<Text
				position={[0, TILE_TOP + 0.03, 0]}
				rotation={[-0.95, 0, 0]}
				fontSize={0.26}
				color="#ffffff"
				outlineWidth={0.016}
				outlineColor="#140814"
				anchorX="center"
				anchorY="middle"
				fontWeight="bold"
			>
				{meta.label}
			</Text>
		</group>
	)
}

function StreetEdge({ from, to, index }: { from: Space; to: Space; index: number }) {
	const dx = to.x - from.x
	const dz = to.z - from.z
	const length = Math.hypot(dx, dz)
	const color = SPACE_META[from.type].color
	const angle = Math.atan2(dx, dz)
	return (
		<group position={[(from.x + to.x) / 2, 0, (from.z + to.z) / 2]} rotation={[0, angle, 0]}>
			<mesh position={[-0.84, 0.09, 0]}>
				<boxGeometry args={[0.1, 0.1, length]} />
				<meshStandardMaterial color="#3c3e4a" roughness={0.75} />
			</mesh>
			<mesh position={[0.84, 0.09, 0]}>
				<boxGeometry args={[0.1, 0.1, length]} />
				<meshStandardMaterial color="#3c3e4a" roughness={0.75} />
			</mesh>
			<mesh position={[-0.84, 0.15, 0]}>
				<boxGeometry args={[0.045, 0.03, length]} />
				<meshStandardMaterial
					color={color}
					emissive={color}
					emissiveIntensity={0.55}
					roughness={0.4}
				/>
			</mesh>
			<mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
				<coneGeometry args={[0.14, 0.32, 3]} />
				<meshStandardMaterial
					color="#ffe14a"
					emissive="#ffe14a"
					emissiveIntensity={index % 2 === 0 ? 0.55 : 0.35}
					roughness={0.4}
				/>
			</mesh>
		</group>
	)
}

function Lamp({
	position,
	colorIndex,
}: {
	position: [number, number, number]
	colorIndex: number
}) {
	const color = neonAt(colorIndex)
	return (
		<group position={position}>
			<mesh position={[0, 0.75, 0]}>
				<cylinderGeometry args={[0.045, 0.06, 1.5, 6]} />
				<meshStandardMaterial color="#2c2e3a" metalness={0.55} roughness={0.4} />
			</mesh>
			<mesh position={[0, 1.55, 0]}>
				<sphereGeometry args={[0.11, 10, 8]} />
				<meshStandardMaterial
					color={color}
					emissive={color}
					emissiveIntensity={0.9}
					roughness={0.3}
				/>
			</mesh>
			<pointLight
				color={color}
				position={[0, 1.6, 0]}
				intensity={8}
				distance={13}
				decay={2}
			/>
		</group>
	)
}

function Bear({ position, yaw }: { position: [number, number, number]; yaw: number }) {
	return (
		<group position={position} rotation={[0, yaw, 0]} scale={0.72}>
			<mesh position={[0, 0.42, 0]}>
				<sphereGeometry args={[0.34, 8, 6]} />
				<meshStandardMaterial color="#7a4b2c" roughness={0.75} />
			</mesh>
			<mesh position={[0, 0.88, 0.04]}>
				<sphereGeometry args={[0.24, 8, 6]} />
				<meshStandardMaterial color="#7a4b2c" roughness={0.75} />
			</mesh>
			<mesh position={[-0.16, 1.1, 0.02]}>
				<sphereGeometry args={[0.09, 6, 5]} />
				<meshStandardMaterial color="#6b3f26" roughness={0.7} />
			</mesh>
			<mesh position={[0.16, 1.1, 0.02]}>
				<sphereGeometry args={[0.09, 6, 5]} />
				<meshStandardMaterial color="#6b3f26" roughness={0.7} />
			</mesh>
			<mesh position={[0, 0.82, 0.22]}>
				<sphereGeometry args={[0.1, 6, 5]} />
				<meshStandardMaterial color="#e4c4a0" roughness={0.6} />
			</mesh>
			<mesh position={[0, 0.84, 0.3]}>
				<sphereGeometry args={[0.04, 6, 5]} />
				<meshStandardMaterial color="#1c120c" roughness={0.5} />
			</mesh>
			<mesh position={[-0.08, 0.9, 0.24]}>
				<sphereGeometry args={[0.025, 6, 4]} />
				<meshStandardMaterial color="#1c120c" />
			</mesh>
			<mesh position={[0.08, 0.9, 0.24]}>
				<sphereGeometry args={[0.025, 6, 4]} />
				<meshStandardMaterial color="#1c120c" />
			</mesh>
		</group>
	)
}

function Rocket({ position, yaw }: { position: [number, number, number]; yaw: number }) {
	return (
		<group position={position} rotation={[0, yaw, 0]} scale={0.85}>
			<mesh position={[0, 0.48, 0]}>
				<cylinderGeometry args={[0.12, 0.14, 0.62, 8]} />
				<meshStandardMaterial color="#e7eef8" roughness={0.4} metalness={0.25} />
			</mesh>
			<mesh position={[0, 0.92, 0]}>
				<coneGeometry args={[0.12, 0.32, 8]} />
				<meshStandardMaterial
					color="#ff4d6d"
					emissive="#ff4d6d"
					emissiveIntensity={0.45}
					roughness={0.4}
				/>
			</mesh>
			<mesh position={[0, 0.55, 0.1]}>
				<sphereGeometry args={[0.05, 8, 6]} />
				<meshStandardMaterial
					color="#7fd7ff"
					emissive="#7fd7ff"
					emissiveIntensity={0.6}
					roughness={0.2}
				/>
			</mesh>
			<mesh position={[0.14, 0.28, 0]} rotation={[0, 0, 0.4]}>
				<boxGeometry args={[0.14, 0.16, 0.04]} />
				<meshStandardMaterial color="#38e0c4" roughness={0.45} />
			</mesh>
			<mesh position={[-0.14, 0.28, 0]} rotation={[0, 0, -0.4]}>
				<boxGeometry args={[0.14, 0.16, 0.04]} />
				<meshStandardMaterial color="#38e0c4" roughness={0.45} />
			</mesh>
			<mesh position={[0, 0.12, 0]}>
				<coneGeometry args={[0.07, 0.18, 6]} />
				<meshStandardMaterial
					color="#ffb15a"
					emissive="#ffb15a"
					emissiveIntensity={0.85}
					roughness={0.4}
				/>
			</mesh>
		</group>
	)
}

/** Few gags, parked in the lots beside bear/bull tiles so the street stays clear. */
function Gags() {
	return (
		<>
			<Bear position={[-0.35, 0, 2.85]} yaw={0.4} />
			<Bear position={[-6.35, 0, -2.75]} yaw={1} />
			<Rocket position={[2.35, 0, 5.55]} yaw={0.2} />
			<Rocket position={[-5.7, 0, 1.55]} yaw={-0.5} />
			<Rocket position={[8.6, 0, -5.5]} yaw={0.8} />
		</>
	)
}

function StarPlaza() {
	return (
		<group position={[0, 0, 0]}>
			<mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
				<circleGeometry args={[1.05, 6]} />
				<meshStandardMaterial color="#221c18" roughness={0.8} />
			</mesh>
			<mesh position={[0, 0.16, 0]}>
				<cylinderGeometry args={[0.72, 0.82, 0.14, 6]} />
				<meshStandardMaterial color="#3a3224" roughness={0.55} metalness={0.25} />
			</mesh>
			<mesh position={[0, 0.72, 0]} rotation={[0, Math.PI / 4, 0]}>
				<octahedronGeometry args={[0.42, 0]} />
				<meshStandardMaterial
					color="#ffd24d"
					emissive="#ffd24d"
					emissiveIntensity={1.05}
					roughness={0.28}
					metalness={0.45}
				/>
			</mesh>
			<pointLight
				color="#ffd24d"
				position={[0, 1.7, 0]}
				intensity={8}
				distance={11}
				decay={2}
			/>
			<Text
				position={[0, 1.35, 0]}
				fontSize={0.22}
				color="#ffd24d"
				outlineWidth={0.012}
				outlineColor="#140814"
				anchorX="center"
				anchorY="middle"
			>
				STAR
			</Text>
			<mesh position={[0.58, 0.14, 0.28]}>
				<boxGeometry args={[0.18, 0.18, 0.18]} />
				<meshStandardMaterial color="#8a5a32" roughness={0.8} />
			</mesh>
			<mesh position={[-0.5, 0.12, -0.22]}>
				<boxGeometry args={[0.16, 0.16, 0.16]} />
				<meshStandardMaterial color="#6a4630" roughness={0.8} />
			</mesh>
		</group>
	)
}

export default function Track() {
	const asphalt = useAsphalt()
	return (
		<group>
			{asphalt ? (
				<mesh geometry={asphalt}>
					<meshStandardMaterial color="#1a1b22" roughness={0.92} metalness={0.05} />
				</mesh>
			) : null}
			{BOARD.map((space, index) => {
				const next = BOARD[(space.index + 1) % BOARD.length]
				return next ? (
					<StreetEdge key={`edge-${space.index}`} from={space} to={next} index={index} />
				) : null
			})}
			{BOARD.map((space) => (
				<Tile key={space.index} space={space} />
			))}
			<StarPlaza />
			<Gags />
			<Lamp position={[0, 0, 5.2]} colorIndex={0} />
			<Lamp position={[0, 0, -5.2]} colorIndex={2} />
			<Lamp position={[-8.55, 0, 0]} colorIndex={1} />
			<Lamp position={[8.45, 0, -1.5]} colorIndex={4} />
		</group>
	)
}
