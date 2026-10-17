import { connectWallet, profileModal, shortAddress } from "@stellar-scaffold/app-lib"
import { useCavosState } from "../cavos/context"
import { useWallet } from "../hooks/useWallet"
import { USDC_BALANCE_KEY } from "../trustless/config"

export const WalletButton = () => {
	const { address, connector, isPending, balances, disconnect } = useWallet()
	const cavos = useCavosState()
	const usdc = balances[USDC_BALANCE_KEY]?.balance

	if (!address && cavos?.needsDeviceApproval) {
		return (
			<div className="wallet-connected">
				<button type="button" onClick={() => void cavos.approveDevice()}>
					Desbloquear con passkey
				</button>
				<button type="button" onClick={cavos.signOut}>
					Salir
				</button>
			</div>
		)
	}

	if (!address) {
		return (
			<div className="wallet-connected">
				{cavos ? (
					<button
						type="button"
						className="wallet-primary"
						onClick={() => cavos.signIn()}
						disabled={cavos.isLoading || isPending}
						title="Correo o Google: te arma una cuenta Stellar (Cavos)"
					>
						{cavos.isLoading || isPending ? "Entrando…" : "Entrar"}
					</button>
				) : null}
				<button
					type="button"
					className={cavos ? undefined : "wallet-primary"}
					onClick={() => void connectWallet()}
					disabled={isPending}
					title="Freighter, xBull, Lobstr… (red Stellar)"
				>
					{isPending ? "Conectando…" : "Usar una wallet"}
				</button>
			</div>
		)
	}

	return (
		<div className="wallet-connected" style={{ opacity: isPending ? 0.6 : 1 }}>
			<span className="wallet-balance">{usdc ?? "0"} USDC</span>
			{connector === "cavos" ? (
				<>
					<span className="wallet-balance" title={address}>
						{cavos?.email ?? shortAddress(address)}
					</span>
					<button type="button" onClick={() => void disconnect()}>
						Salir
					</button>
				</>
			) : (
				<button
					type="button"
					className="wallet-profile"
					onClick={() => void profileModal()}
				>
					{shortAddress(address)}
				</button>
			)}
		</div>
	)
}
