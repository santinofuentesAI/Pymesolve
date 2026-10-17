import {
	useApproveMilestone,
	useChangeMilestoneStatus,
	useFundEscrow,
	useInitializeEscrow,
	useReleaseFunds,
	useResolveDispute,
	useStartDispute,
} from "@trustless-work/escrow"
import { platformOr, USDC } from "../trustless/config"
import { useEscrowTx } from "../trustless/useEscrowTx"
import { splitMilestones } from "./money"

export const PLAN_USDC = 6
export const DELIVERY_USDC = 24

export function usePoolEscrow() {
	const { run, pending } = useEscrowTx()
	const { deployEscrow } = useInitializeEscrow()
	const { fundEscrow } = useFundEscrow()
	const { changeMilestoneStatus } = useChangeMilestoneStatus()
	const { approveMilestone } = useApproveMilestone()
	const { releaseFunds } = useReleaseFunds()
	const { startDispute } = useStartDispute()
	const { resolveDispute } = useResolveDispute()

	const deploy = (
		me: string,
		dev: string,
		pool: {
			id: number
			title: string
			summary: string
			committed_usdc: number
		},
	) => {
		const { plan, delivery } = splitMilestones(pool.committed_usdc)
		return run("Abrir retén de USDC", () =>
			deployEscrow(
				{
					signer: me,
					engagementId: `pool-${pool.id}`,
					title: pool.title,
					description: pool.summary,
					platformFee: 1,
					trustline: { address: USDC.address, symbol: USDC.symbol },
					roles: {
						approver: platformOr(me),
						releaseSigner: platformOr(me),
						serviceProvider: dev,
						disputeResolver: platformOr(me),
						platformAddress: platformOr(me),
					},
					milestones: [
						{
							description:
								"Plan claro de qué se va a hacer, en lenguaje de mostrador",
							amount: plan,
							receiver: dev,
						},
						{
							description:
								"Entrega (repo o Drive) y carta al mostrador para quien no programa",
							amount: delivery,
							receiver: dev,
						},
					],
				},
				"multi-release",
			),
		)
	}

	const fund = (me: string, contractId: string, amount: number) =>
		run("Aportar USDC al retén", () =>
			fundEscrow({ contractId, amount, signer: me }, "multi-release"),
		)

	const markDone = (
		me: string,
		contractId: string,
		index: "0" | "1",
		evidence: string,
	) =>
		run("Dejar evidencia en el hito", () =>
			changeMilestoneStatus(
				{
					contractId,
					milestoneIndex: index,
					newStatus: index === "0" ? "plan_listo" : "entregado",
					newEvidence: evidence,
					serviceProvider: me,
				},
				"multi-release",
			),
		)

	const approve = (me: string, contractId: string, index: "0" | "1") =>
		run("Aprobar hito", () =>
			approveMilestone(
				{ contractId, milestoneIndex: index, approver: me },
				"multi-release",
			),
		)

	const release = (me: string, contractId: string, index: "0" | "1") =>
		run("Liberar hito", () =>
			releaseFunds(
				{ contractId, milestoneIndex: index, releaseSigner: me },
				"multi-release",
			),
		)

	const openDispute = (me: string, contractId: string, index: "0" | "1") =>
		run("Abrir disputa", () =>
			startDispute(
				{ contractId, milestoneIndex: index, signer: me },
				"multi-release",
			),
		)

	const resolve = (
		me: string,
		contractId: string,
		index: "0" | "1",
		dev: string,
		pymes: string[],
		devAmount: number,
		refundAmount: number,
	) => {
		const each =
			pymes.length > 0
				? Math.round((refundAmount / pymes.length) * 100) / 100
				: 0
		const distributions = [
			{ address: dev, amount: devAmount },
			...pymes.map((pymeAddr) => ({ address: pymeAddr, amount: each })),
		].filter((d) => d.amount > 0)
		if (distributions.length === 0) {
			throw new Error("El veredicto no puede quedar en cero.")
		}
		return run("Firmar veredicto", () =>
			resolveDispute(
				{
					contractId,
					milestoneIndex: index,
					disputeResolver: me,
					distributions: distributions as unknown as [
						{ address: string; amount: number },
					],
				},
				"multi-release",
			),
		)
	}

	return {
		pending,
		deploy,
		fund,
		markDone,
		approve,
		release,
		openDispute,
		resolve,
	}
}
