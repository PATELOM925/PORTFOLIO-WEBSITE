import styles from "./TtcPulse.module.css";

export function Panel({ title, note, action, children, wide }: { title: string; note?: string; action?: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <section className={`${styles.panel} ${wide ? styles.wide : ""}`}>
      <div className={styles.panelHead}>
        <h2>{title}</h2>
        {note ? <span>{note}</span> : null}
        {action ? (
          <button type="button" className={styles.open} onClick={action} aria-label={`Open ${title}`}>
            Open
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function Kpis({ items }: { items: ([string, string] | [string, string, string])[] }) {
  return (
    <div className={styles.kpis}>
      {items.map(([value, label, tip]) => (
        <div key={label} className={styles.kpi} data-tip={tip} tabIndex={tip ? 0 : undefined}>
          <b>{value}</b>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
