import styles from "../styles.module.css"

export function OnChainNote({ children }: { children: string }) {
	return <p className={styles.note}>{children}</p>
}
