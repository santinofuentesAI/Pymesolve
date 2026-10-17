import { fondos } from "@stellar-scaffold/app-lib/clients"
import type { Jar } from "fondos"
import type { SignTransactionFn } from "../cavos/context"
import type { JarName } from "./api"

export const STROOP = 10_000_000

type Simulated = {
	result: {
		isErr?: () => boolean
		unwrapErr?: () => { message?: string }
		unwrap?: () => unknown
	}
	signAndSend: (opts: { signTransaction: SignTransactionFn }) => Promise<unknown>
}

export function usdcToStroops(whole: number): bigint {
	if (!Number.isInteger(whole) || whole < 1 || whole > 200) {
		throw new Error("El monto tiene que estar entre 1 y 200 USDC.")
	}
	return BigInt(whole) * BigInt(STROOP)
}

export function stroopsToUsdc(raw: bigint | number | string): number {
	const value = typeof raw === "bigint" ? raw : BigInt(raw)
	return Number(value / BigInt(STROOP))
}

export function chainJar(jar: JarName): Jar {
	switch (jar) {
		case "sacos":
			return { tag: "Sacos", values: undefined as void }
		case "flete":
			return { tag: "Flete", values: undefined as void }
		case "adelanto":
			return { tag: "Adelanto", values: undefined as void }
		default: {
			const unknown: never = jar
			return unknown
		}
	}
}

function errText(tx: Simulated): string | null {
	if (!tx.result.isErr?.()) return null
	return tx.result.unwrapErr?.().message || "La red rechazó la operación."
}

export async function firmar(tx: Simulated, signTransaction: SignTransactionFn) {
	const message = errText(tx)
	if (message) throw new Error(message)
	await tx.signAndSend({ signTransaction })
}

export async function leerFondo(address?: string) {
	const abiertaTx = await fondos.abierta()
	const abierta = Boolean(abiertaTx.result)
	const [sacosTx, fleteTx, adelantoTx, saldoTx, apartadoTx] = await Promise.all([
		fondos.jar_de({ jar: chainJar("sacos") }),
		fondos.jar_de({ jar: chainJar("flete") }),
		fondos.jar_de({ jar: chainJar("adelanto") }),
		fondos.saldo(),
		fondos.apartado(),
	])
	const base = {
		abierta,
		sacos: stroopsToUsdc(sacosTx.result),
		flete: stroopsToUsdc(fleteTx.result),
		adelanto: stroopsToUsdc(adelantoTx.result),
		saldo: stroopsToUsdc(saldoTx.result),
		apartado: stroopsToUsdc(apartadoTx.result),
		asiento: "",
		tesorera: "",
		deuda: 0,
		esSocio: false,
	}
	if (!abierta) return base
	const [asientoTx, tesoreraTx] = await Promise.all([fondos.asiento(), fondos.tesorera()])
	base.asiento = String(asientoTx.result)
	base.tesorera = String(tesoreraTx.result)
	if (!address) return base
	const [deudaTx, socioTx] = await Promise.all([
		fondos.deuda_de({ socio: address }),
		fondos.es_socio({ socio: address }),
	])
	base.deuda = stroopsToUsdc(deudaTx.result)
	base.esSocio = Boolean(socioTx.result)
	return base
}

export async function poner(
	address: string,
	signTransaction: SignTransactionFn,
	jar: JarName,
	whole: number,
) {
	const tx = await fondos.poner(
		{ socio: address, jar: chainJar(jar), amount: usdcToStroops(whole) },
		{ publicKey: address },
	)
	await firmar(tx as Simulated, signTransaction)
}

export async function pedir(
	address: string,
	signTransaction: SignTransactionFn,
	jar: "sacos" | "flete",
	whole: number,
	destino: string,
) {
	const tx = await fondos.pedir(
		{
			socio: address,
			jar: chainJar(jar),
			amount: usdcToStroops(whole),
			destino,
		},
		{ publicKey: address },
	)
	const simulated = tx as Simulated
	const message = errText(simulated)
	if (message) throw new Error(message)
	const id = Number(simulated.result.unwrap?.())
	await simulated.signAndSend({ signTransaction })
	return id
}

export async function ver(
	address: string,
	signTransaction: SignTransactionFn,
	lineId: number,
) {
	const tx = await fondos.vi(
		{ testigo: address, line_id: lineId },
		{ publicKey: address },
	)
	await firmar(tx as Simulated, signTransaction)
}

export async function devolver(
	address: string,
	signTransaction: SignTransactionFn,
	lineId: number,
) {
	const tx = await fondos.devolver(
		{ socio: address, line_id: lineId },
		{ publicKey: address },
	)
	await firmar(tx as Simulated, signTransaction)
}

export async function tomarAdelanto(
	address: string,
	signTransaction: SignTransactionFn,
	whole: number,
) {
	const tx = await fondos.adelanto(
		{ socio: address, amount: usdcToStroops(whole) },
		{ publicKey: address },
	)
	await firmar(tx as Simulated, signTransaction)
}

export async function abrirFondo(
	address: string,
	signTransaction: SignTransactionFn,
	asiento: string,
) {
	const tx = await fondos.abrir(
		{ tesorera: address, asiento },
		{ publicKey: address },
	)
	await firmar(tx as Simulated, signTransaction)
}

export async function unirse(
	address: string,
	signTransaction: SignTransactionFn,
) {
	const tx = await fondos.unirse({ socio: address }, { publicKey: address })
	await firmar(tx as Simulated, signTransaction)
}
