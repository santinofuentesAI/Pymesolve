import { fundAccount, type MappedBalances } from "@stellar-scaffold/app-lib"
import { type SignTransactionFn } from "../cavos/context"
import { USDC_BALANCE_KEY } from "../trustless/config"
import { addUsdcTrustline, swapXlmForUsdc } from "../trustless/usdc"

export function monto(balance: string | undefined): number {
	if (!balance) return 0
	const n = Number(balance.replace(/[^\d.-]/g, ""))
	return Number.isFinite(n) ? n : 0
}

function yaEstaba(message: string) {
	return /already exist/i.test(message)
}

export async function cargarPlataDePrueba(
	address: string,
	sign: SignTransactionFn,
	balances: MappedBalances,
	onNote?: (text: string) => void,
) {
	if (!balances.xlm?.balance) {
		onNote?.("Abriendo la cuenta de prueba…")
		const result = await fundAccount(address)
		if (!result.ok && !yaEstaba(result.message)) {
			throw new Error("No se pudo cargar la cuenta de prueba.")
		}
	}
	if (balances[USDC_BALANCE_KEY]?.balance === undefined) {
		onNote?.("Habilitando los dólares de prueba…")
		await addUsdcTrustline(address, sign)
	}
	onNote?.("Cambiando a dólares de prueba…")
	await swapXlmForUsdc(address, sign, "100")
}
