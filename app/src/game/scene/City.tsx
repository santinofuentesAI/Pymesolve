// DeFiesta — blocks between the streets: low and mid buildings, market stalls.
import { Text } from "@react-three/drei"
import { useEffect, useMemo } from "react"
import * as THREE from "three"
import { generateCity, type Building, type SignData, type Stall } from "./cityData"
import { neonAt } from "./constants"

const CITY = generateCity()
const WINDOW_TILE = 4
const WINDOW_CELLS = 8
const WINDOW_PX = 128

/** Plaster colors, one per neon accent, so the blocks aren't all black glass. */
const BODY = ["#2a1830", "#142833", "#221838", "#321820", "#162033"]

function bodyAt(index: number): string {
	return BODY[index] ?? "#1a1a24"
}

function makeWindowTexture(): THREE.CanvasTexture {
	const canvas = document.createElement("canvas")
	canvas.width = WINDOW_PX
	canvas.height = WINDOW_PX
	const ctx = canvas.getContext("2d")
	if (ctx) {
		const cell = WINDOW_PX / WINDOW_CELLS
		ctx.fillStyle = "#000"
		ctx.fillRect(0, 0, WINDOW_PX, WINDOW_PX)
		let seed = 12345
		const rand = () => {
			seed = (seed * 1664525 + 1013904223) % 4294967296
			return seed / 4294967296
		}
		for (let cx = 0; cx < WINDOW_CELLS; cx++) {
			for (let cy = 0; cy < WINDOW_CELLS; cy++) {
				if (rand() > 0.62) continue
				const v = Math.floor(150 + rand() * 105)
				ctx.fillStyle = `rgb(${v},${v},${v})`
				ctx.fillRect(cx * cell + 4, cy * cell + 3, cell - 8, cell - 6)
			}
		}
	}
	const texture = new THREE.CanvasTexture(canvas)
	texture.wrapS = THREE.RepeatWrapping
	texture.wrapT = THREE.RepeatWrapping
	texture.colorSpace = THREE.SRGBColorSpace
	texture.anisotropy = 4
	texture.needsUpdate = true
	return texture
}

function facadeBox(b: Building): THREE.BufferGeometry {
	const geometry = new THREE.BoxGeometry(b.w, b.h, b.d)
	const uv = geometry.getAttribute("uv")
	const offsetU = b.cellU / WINDOW_CELLS
	const offsetV = b.cellV / WINDOW_CELLS
	for (let v = 0; v < uv.count; v++) {
		const face = Math.floor(v / 4)
		if (face === 2 || face === 3) {
			uv.setXY(v, 0.02, 0.02)
			continue
		}
		const across = face < 2 ? b.d : b.w
		uv.setXY(
			v,
			(uv.getX(v) * across) / WINDOW_TILE + offsetU,
			(uv.getY(v) * b.h) / WINDOW_TILE + offsetV,
		)
	}
	geometry.translate(b.x, b.h / 2, b.z)
	return geometry
}

function BuildingMesh({
	building,
	texture,
}: {
	building: Building
	texture: THREE.CanvasTexture
}) {
	const geometry = useMemo(() => facadeBox(building), [building])
	useEffect(() => {
		return () => geometry.dispose()
	}, [geometry])
	const neon = neonAt(building.color)
	return (
		<group>
			<mesh geometry={geometry}>
				<meshStandardMaterial
					color={bodyAt(building.color)}
					roughness={0.62}
					metalness={0.16}
					emissive={neon}
					emissiveMap={texture}
					emissiveIntensity={0.72}
				/>
			</mesh>
			<mesh position={[building.x, building.h + 0.06, building.z]}>
				<boxGeometry args={[building.w + 0.08, 0.1, building.d + 0.08]} />
				<meshStandardMaterial
					color={neon}
					emissive={neon}
					emissiveIntensity={0.85}
					roughness={0.4}
					metalness={0.2}
				/>
			</mesh>
			<mesh
				position={[
					building.x,
					Math.min(1.15, building.h * 0.45),
					building.z + building.d / 2 + 0.03,
				]}
			>
				<boxGeometry args={[building.w * 0.7, 0.1, 0.04]} />
				<meshStandardMaterial
					color={neon}
					emissive={neon}
					emissiveIntensity={0.7}
					roughness={0.35}
				/>
			</mesh>
			{building.h >= 6.5 ? (
				<mesh position={[building.x + building.w * 0.28, building.h + 0.55, building.z]}>
					<boxGeometry args={[0.08, 0.85, 0.08]} />
					<meshStandardMaterial color="#c9d0dc" metalness={0.7} roughness={0.3} />
				</mesh>
			) : null}
		</group>
	)
}

function Sign({ data }: { data: SignData }) {
	return (
		<group position={[data.x, data.y, data.z]} rotation={[0, data.yaw, 0]}>
			<mesh>
				<boxGeometry args={[data.width + 0.12, data.height + 0.12, 0.08]} />
				<meshStandardMaterial
					color={data.color}
					emissive={data.color}
					emissiveIntensity={0.9}
					roughness={0.35}
				/>
			</mesh>
			<mesh position={[0, 0, 0.05]}>
				<boxGeometry args={[data.width, data.height, 0.06]} />
				<meshStandardMaterial color="#140814" roughness={0.7} />
			</mesh>
			<Text
				position={[0, 0, 0.1]}
				fontSize={data.fontSize}
				color={data.color}
				outlineWidth={0.012}
				outlineColor="#140814"
				anchorX="center"
				anchorY="middle"
				fontWeight="bold"
			>
				{data.text}
			</Text>
		</group>
	)
}

function MarketStall({ stall }: { stall: Stall }) {
	const color = neonAt(stall.color)
	return (
		<group position={[stall.x, 0, stall.z]} rotation={[0, stall.yaw, 0]}>
			<mesh position={[0, 0.32, 0]}>
				<boxGeometry args={[0.72, 0.64, 0.46]} />
				<meshStandardMaterial color="#241c28" roughness={0.7} />
			</mesh>
			<mesh position={[0, 0.7, 0.02]} rotation={[0.2, 0, 0]}>
				<boxGeometry args={[0.92, 0.07, 0.62]} />
				<meshStandardMaterial
					color={color}
					emissive={color}
					emissiveIntensity={0.75}
					roughness={0.4}
				/>
			</mesh>
			<mesh position={[0, 0.58, 0.24]}>
				<boxGeometry args={[0.6, 0.08, 0.04]} />
				<meshStandardMaterial color="#f2efe6" roughness={0.6} />
			</mesh>
		</group>
	)
}

function Ground() {
	return (
		<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
			<planeGeometry args={[36, 28]} />
			<meshStandardMaterial color="#14141c" roughness={0.94} metalness={0.04} />
		</mesh>
	)
}

export default function City() {
	const texture = useMemo(makeWindowTexture, [])
	useEffect(() => {
		return () => texture.dispose()
	}, [texture])

	return (
		<group>
			<Ground />
			{CITY.buildings.map((building) => (
				<BuildingMesh
					key={`${building.x}-${building.z}`}
					building={building}
					texture={texture}
				/>
			))}
			{CITY.signs.map((sign) => (
				<Sign key={sign.text} data={sign} />
			))}
			{CITY.stalls.map((stall) => (
				<MarketStall key={`${stall.x}-${stall.z}`} stall={stall} />
			))}
		</group>
	)
}
