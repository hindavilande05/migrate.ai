export default function RiskFlags({ risks }) {
  if (!risks || risks.length === 0) return null

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <span style={styles.icon}>⚑</span>
        <span style={styles.title}>Risk flags</span>
        <span style={styles.badge}>{risks.reduce((n, r) => n + r.flags.length, 0)}</span>
      </div>
      <div style={styles.body}>
        {risks.map((risk, i) => (
          <div key={i} style={styles.block}>
            <div style={styles.file}>{risk.file.split('/').pop()}</div>
            {risk.flags.map((flag, fi) => (
              <div key={fi} style={styles.flag}>
                <span style={styles.flagIcon}>!</span>
                <span style={styles.flagText}>{flag}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  wrapper: {
    background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.25)',
    borderRadius: 8, overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 14px', borderBottom: '1px solid rgba(251,191,36,0.2)',
  },
  icon: { color: 'var(--warn)', fontSize: 14 },
  title: { fontWeight: 600, fontSize: 13, flex: 1 },
  badge: {
    fontSize: 11, padding: '1px 7px', borderRadius: 99,
    background: 'rgba(251,191,36,0.2)', color: 'var(--warn)',
    fontWeight: 600,
  },
  body: { padding: 12, display: 'flex', flexDirection: 'column', gap: 10 },
  block: { display: 'flex', flexDirection: 'column', gap: 4 },
  file: { fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--warn)', marginBottom: 2 },
  flag: { display: 'flex', gap: 8, alignItems: 'flex-start' },
  flagIcon: { color: 'var(--warn)', flexShrink: 0, fontWeight: 700, marginTop: 1 },
  flagText: { fontSize: 13, color: 'var(--text)', lineHeight: 1.5 },
}
