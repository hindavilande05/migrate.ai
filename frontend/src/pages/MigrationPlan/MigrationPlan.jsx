import { useState } from 'react'

export default function MigrationPlan({ plan }) {
  const [open, setOpen] = useState(true)

  return (
    <div style={styles.wrapper}>
      <button style={styles.toggle} onClick={() => setOpen(o => !o)}>
        <span style={styles.toggleLabel}>Migration plan</span>
        <span style={styles.toggleCount}>{plan.length} file{plan.length !== 1 ? 's' : ''}</span>
        <span style={styles.toggleArrow}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={styles.body}>
          {plan.map((item, i) => (
            <div key={i} style={styles.fileCard}>
              <div style={styles.filename}>{item.file.split('/').pop()}</div>

              {item.patterns_found.length > 0 && (
                <div style={styles.row}>
                  <span style={styles.label}>Patterns</span>
                  <div style={styles.tags}>
                    {item.patterns_found.map((p, pi) => (
                      <span key={pi} style={styles.tag}>{p}</span>
                    ))}
                  </div>
                </div>
              )}

              <div style={styles.row}>
                <span style={styles.label}>Go approach</span>
                <span style={styles.value}>{item.go_approach}</span>
              </div>

              <div style={styles.row}>
                <span style={styles.label}>Concurrency</span>
                <span style={styles.value}>{item.concurrency}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  wrapper: {
    background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: 8, overflow: 'hidden',
  },
  toggle: {
    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
    padding: '12px 16px', background: 'none', border: 'none',
    color: 'var(--text)', cursor: 'pointer', textAlign: 'left',
  },
  toggleLabel: { fontWeight: 600, fontSize: 13, flex: 1 },
  toggleCount: {
    fontSize: 11, padding: '2px 7px', borderRadius: 99,
    background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--muted)',
  },
  toggleArrow: { color: 'var(--muted)', fontSize: 11 },
  body: { borderTop: '1px solid var(--border)', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 },
  fileCard: {
    background: 'var(--bg3)', borderRadius: 6, padding: '10px 12px',
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  filename: { fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent)', fontWeight: 500 },
  row: { display: 'flex', gap: 8, alignItems: 'flex-start' },
  label: { fontSize: 11, color: 'var(--muted)', minWidth: 90, paddingTop: 1, flexShrink: 0 },
  value: { fontSize: 12, color: 'var(--text)', lineHeight: 1.5 },
  tags: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  tag: {
    fontSize: 11, padding: '1px 6px', borderRadius: 3,
    background: 'rgba(129,140,248,0.12)', border: '1px solid rgba(129,140,248,0.3)',
    color: 'var(--accent2)', fontFamily: 'var(--mono)',
  },
}
