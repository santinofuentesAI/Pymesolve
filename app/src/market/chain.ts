import { pools } from "@stellar-scaffold/app-lib/clients"
import { hashBytes } from "./carta"

export const STROOPS = 10_000_000

export function toStroops(usdc: number): bigint {
	return BigInt(Math.round(usdc * STROOPS))
}

export function fromStroops(stroops: bigint | number | string): number {
	return Number(stroops) / STROOPS
}

type SignTx = (
	xdr: string,
	opts?: { address?: string; networkPassphrase?: string },
) => Promise<{ signedTxXdr: string }>

async function send<T>(
	built: {
		result: {
			isErr: () => boolean
			unwrapErr: () => { message: string }
			unwrap: () => T
		}
		signAndSend: (opts: { signTransaction: SignTx }) => Promise<unknown>
	},
	signTransaction: SignTx,
): Promise<T> {
	if (built.result.isErr()) throw new Error(built.result.unwrapErr().message)
	await built.signAndSend({ signTransaction })
	return built.result.unwrap()
}

export async function chainPostProblem(
	address: string,
	signTransaction: SignTx,
	input: { title: string; category: string; amountUsdc: number },
) {
	const tx = await pools.post_problem(
		{
			pyme: address,
			title: input.title,
			category: input.category,
			amount: toStroops(input.amountUsdc),
		},
		{ publicKey: address },
	)
	return send(tx, signTransaction)
}

export async function chainProposeFromPyme(
	address: string,
	signTransaction: SignTx,
	ids: number[],
) {
	const tx = await pools.propose_from_pyme(
		{ pyme: address, ids },
		{ publicKey: address },
	)
	return send(tx, signTransaction)
}

export async function chainJoin(
	address: string,
	signTransaction: SignTx,
	poolId: number,
) {
	const tx = await pools.join_pool(
		{ pyme: address, pool_id: poolId },
		{ publicKey: address },
	)
	return send(tx, signTransaction)
}

export async function chainClaim(
	address: string,
	signTransaction: SignTx,
	poolId: number,
) {
	const tx = await pools.claim(
		{ dev: address, pool_id: poolId },
		{ publicKey: address },
	)
	return send(tx, signTransaction)
}

export async function chainSetEscrow(
	address: string,
	signTransaction: SignTx,
	poolId: number,
	escrow: string,
) {
	const tx = await pools.set_escrow(
		{ caller: address, pool_id: poolId, escrow },
		{ publicKey: address },
	)
	return send(tx, signTransaction)
}

export async function chainMarkFunded(
	address: string,
	signTransaction: SignTx,
	poolId: number,
) {
	const tx = await pools.mark_funded(
		{ pyme: address, pool_id: poolId },
		{ publicKey: address },
	)
	return send(tx, signTransaction)
}

export async function chainVote(
	address: string,
	signTransaction: SignTx,
	poolId: number,
	accept: boolean,
) {
	const tx = await pools.vote_delivery(
		{ pyme: address, pool_id: poolId, accept },
		{ publicKey: address },
	)
	return send(tx, signTransaction)
}

export async function chainSetEvidence(
	address: string,
	signTransaction: SignTx,
	poolId: number,
	hex: string,
) {
	const tx = await pools.set_evidence(
		{
			dev: address,
			pool_id: poolId,
			evidence_hash: hashBytes(hex),
		},
		{ publicKey: address },
	)
	return send(tx, signTransaction)
}

export async function chainMarkDisputed(
	address: string,
	signTransaction: SignTx,
	poolId: number,
) {
	const tx = await pools.mark_disputed(
		{ admin: address, pool_id: poolId },
		{ publicKey: address },
	)
	return send(tx, signTransaction)
}

export async function chainMarkReleased(
	address: string,
	signTransaction: SignTx,
	poolId: number,
) {
	const tx = await pools.mark_released(
		{ admin: address, pool_id: poolId },
		{ publicKey: address },
	)
	return send(tx, signTransaction)
}

export async function chainReviseAmount(
	address: string,
	signTransaction: SignTx,
	poolId: number,
	amountUsdc: number,
) {
	const tx = await pools.revise_amount(
		{
			pyme: address,
			pool_id: poolId,
			amount: toStroops(amountUsdc),
		},
		{ publicKey: address },
	)
	return send(tx, signTransaction)
}

export async function chainMarkResolved(
	address: string,
	signTransaction: SignTx,
	poolId: number,
	devAmountUsdc: number,
) {
	const tx = await pools.mark_resolved(
		{
			admin: address,
			pool_id: poolId,
			dev_amount: toStroops(devAmountUsdc),
		},
		{ publicKey: address },
	)
	return send(tx, signTransaction)
}
