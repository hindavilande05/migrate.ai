import { useEffect, useRef } from 'react'

const STEP_LABELS = {
  1: 'Ingest files',
  2: 'Detect language',
  3: 'Scan patterns',
  4: 'Build plan',
  5: 'Generate Go code',
  6: 'Self-review',
  7: 'Write tests',
  8: 'Risk audit',
  9: 'Migration notes',
  10: 'Complete',
}

const TYPE_STYLE = {
  step:       { icon: '◌', color: 'var(--accent2)' },
  step_done:  { icon: '●', color: 'var(--success)' },
  file_ready: { icon: '▸', color: 'var(--accent)' },
  info:       { icon: '↻', color: 'var(--warn)' },
  error:      { icon: '✕', color: 'var(--danger)' },
  done:       { icon: '★', color: 'var(--accent)' },
}

export default function AgentFeed({ events, running }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events])

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>Agent activity</span>
        {running && <span style={styles.pulse}>live</span>}
      </div>

      <div style={styles.feed}>
        {events.length === 0 && (
          <div style={styles.empty}>Waiting for agent to start…</div>
        )}

        {events.map((evt, i) => {
          const ts = TYPE_STYLE[evt.type] || { icon: '·', color: 'var(--muted)' }
          const stepLabel = STEP_LABELS[evt.step] || `Step ${evt.step}`
          return (
            <div key={i} style={styles.event}>
              <span style={{ ...styles.icon, color: ts.color }}>{ts.icon}</span>
              <div style={styles.eventBody}>
                <div style={styles.eventMeta}>
                  <span style={{ ...styles.stepBadge, color: ts.color }}>
                    {stepLabel}
                  </span>
                  {evt.type === 'file_ready' && evt.data?.filename && (
                    <span style={styles.fileBadge}>{evt.data.filename}</span>
                  )}
                </div>
                <div style={styles.eventMsg}>{evt.message}</div>

                {/* Show signals for detection step */}
                {evt.type === 'step_done' && evt.step === 2 && evt.data?.signals && (
                  <div style={styles.signals}>
                    {evt.data.signals.map((s, si) => (
                      <div key={si} style={styles.signal}>→ {s}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {running && (
          <div style={styles.event}>
            <span style={{ ...styles.icon, color: 'var(--muted)' }}>…</span>
            <div style={{ ...styles.eventMsg, color: 'var(--muted)' }}>Processing…</div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}

const styles = {
  wrapper: { display: 'flex', flexDirection: 'column', height: '100%' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 20px 12px',
    borderBottom: '1px solid var(--border)',
    marginBottom: 4,
  },
  headerTitle: { fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' },
  pulse: {
    fontSize: 10, padding: '2px 7px', borderRadius: 99,
    background: 'rgba(110,231,183,0.15)', color: 'var(--accent)',
    fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
    animation: 'none',
  },
  feed: { flex: 1, overflowY: 'auto', padding: '8px 0' },
  empty: { padding: '12px 20px', color: 'var(--muted)', fontSize: 13 },
  event: {
    display: 'flex', gap: 10, padding: '7px 20px',
    borderBottom: '1px solid rgba(46,51,80,0.4)',
  },
  icon: { fontSize: 14, flexShrink: 0, marginTop: 2, width: 14, textAlign: 'center' },
  eventBody: { flex: 1, minWidth: 0 },
  eventMeta: { display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2, flexWrap: 'wrap' },
  stepBadge: { fontSize: 11, fontWeight: 500, fontFamily: 'var(--mono)' },
  fileBadge: {
    fontSize: 10, padding: '1px 6px', borderRadius: 3,
    background: 'var(--bg3)', border: '1px solid var(--border)',
    color: 'var(--muted)', fontFamily: 'var(--mono)', maxWidth: 180,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  eventMsg: { fontSize: 13, color: 'var(--text)', lineHeight: 1.5 },
  signals: { marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 },
  signal: { fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)' },
}
