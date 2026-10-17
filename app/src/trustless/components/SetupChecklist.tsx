import {
	connectWallet,
	fundAccount,
	stellarNetwork,
} from "@stellar-scaffold/app-lib"
import { useState } from "react"
import { useCavosState } from "../../cavos/context"
import { useNotification } from "../../hooks/useNotification"
import { useWallet } from "../../hooks/useWallet"
import { errorMessage } from "../../lib/errors"
import { isTrustlessWorkConfigured, USDC_BALANCE_KEY } from "../config"
import styles from "../escrow.module.css"
import { addUsdcTrustline, swapXlmForUsdc } from "../usdc"

/**
 * Everything a brand-new user needs before touching an escrow, in order:
 * wallet → test XLM → USDC trustline → test USDC → Trustless Work API key.
 */
export const SetupChecklist = () => {
	const { address, balances, updateBalances, signTransaction } = useWallet()
	const cavos = useCavosState()
	const { addNotification } = useNotification()
	const [busy, setBusy] = useState<string | null>(null)

	const xlm = balances.xlm?.balance
	const usdc = balances[USDC_BALANCE_KEY]?.balance
	const isTestnet = stellarNetwork === "TESTNET"

	const act = async (label: string, fn: () => Promise<unknown>) => {
		setBusy(label)
		try {
			await fn()
			await updateBalances()
			addNotification(`${label} ✓`, "success")
		} catch (e) {
			addNotification(`${label} failed: ${errorMessage(e)}`, "error")
		} finally {
			setBusy(null)
		}
	}

	const steps = [
		{
			done: Boolean(address),
			label: cavos
				? "Entrá con correo o Google (te creamos la cuenta) o usá una wallet en Testnet"
				: "Conectá una wallet de Stellar en Testnet (Freighter anda bien)",
			action: !address && (
				<>
					{cavos && <button onClick={cavos.signIn}>Entrar</button>}
					<button onClick={() => void connectWallet()}>
						{cavos ? "Usar una wallet" : "Conectar"}
					</button>
				</>
			),
		},
		{
			done: Boolean(xlm),
			label: `Cargar XLM de prueba para las comisiones${xlm ? ` · ${xlm} XLM` : ""}`,
			action: address && !xlm && isTestnet && (
				<button
					disabled={!!busy}
					onClick={() =>
						void act("Fund with Friendbot", async () => {
							const r = await fundAccount(address)
							if (!r.ok) throw new Error(r.message)
						})
					}
				>
					Friendbot
				</button>
			),
		},
		{
			done: usdc !== undefined,
			label: "Agregar trustline de USDC (para poder retener USDC)",
			action: address && xlm && usdc === undefined && (
				<button
					disabled={!!busy}
					onClick={() =>
						void act("Add USDC trustline", () =>
							addUsdcTrustline(address, signTransaction),
						)
					}
				>
					Agregar trustline
				</button>
			),
		},
		{
			done: usdc !== undefined && Number(usdc.replace(/,/g, "")) > 0,
			label: `Conseguir USDC de prueba${usdc !== undefined ? ` · ${usdc} USDC` : ""}`,
			action: address && usdc !== undefined && isTestnet && (
				<>
					<button
						disabled={!!busy}
						onClick={() =>
							void act("Swap 100 XLM → USDC", () =>
								swapXlmForUsdc(address, signTransaction, "100"),
							)
						}
					>
						Swap 100 XLM → USDC
					</button>
					<a href="https://faucet.circle.com" target="_blank" rel="noreferrer">
						o faucet de Circle
					</a>
				</>
			),
		},
		{
			done: isTrustlessWorkConfigured,
			label:
				"Clave de Trustless Work en app/.env (PUBLIC_TRUSTLESS_WORK_API_KEY)",
			action: !isTrustlessWorkConfigured && (
				<a
					href="https://dapp.trustlesswork.com"
					target="_blank"
					rel="noreferrer"
				>
					Pedir una clave
				</a>
			),
		},
	]

	const allDone = steps.every((s) => s.done)

	return (
		<details className={`card ${styles.checklist}`} open={!allDone}>
			<summary>
				<strong>Preparar cuenta</strong>{" "}
				{allDone
					? "lista para retener USDC"
					: `(${steps.filter((s) => s.done).length}/${steps.length})`}
			</summary>
			<ol>
				{steps.map((s) => (
					<li key={s.label} className={s.done ? styles.done : undefined}>
						<span>{s.done ? "✅" : "⬜️"}</span>
						<span className={styles.stepLabel}>{s.label}</span>
						{!s.done && s.action}
					</li>
				))}
			</ol>
			{busy && <p className={styles.muted}>{busy}… confirmá en la wallet</p>}
		</details>
	)
}
