import { useState } from 'react'

export default function OutputFiles({ migrated, tests, notes }) {
  const [tab, setTab] = useState('go')
  const [selectedFile, setSelectedFile] = useState(null)

  const goFiles = Object.entries(migrated || {})
  const testFiles = Object.entries(tests || {})

  // auto-select first file when tab changes
  const filesForTab = tab === 'go' ? goFiles : tab === 'tests' ? testFiles : []

  const displayCode = tab === 'notes'
    ? notes
    : (selectedFile !== null ? filesForTab[selectedFile]?.[1] : filesForTab[0]?.[1]) || ''

  const displayName = tab === 'notes'
    ? 'MIGRATION_NOTES.md'
    : filesForTab[selectedFile ?? 0]?.[0] || ''

  const copy = () => {
    navigator.clipboard.writeText(displayCode).catch(() => {})
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.tabs}>
        {[
          { id: 'go',    label: `Go files (${goFiles.length})` },
          { id: 'tests', label: `Tests (${testFiles.length})` },
          { id: 'notes', label: 'Migration notes' },
        ].map(t => (
          <button
            key={t.id}
            style={{ ...styles.tab, ...(tab === t.id ? styles.tabActive : {}) }}
            onClick={() => { setTab(t.id); setSelectedFile(null) }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={styles.body}>
        {/* File list sidebar (for go + tests tabs) */}
        {tab !== 'notes' && filesForTab.length > 0 && (
          <div style={styles.fileList}>
            {filesForTab.map(([name], i) => (
              <button
                key={i}
                style={{
                  ...styles.fileBtn,
                  ...((selectedFile ?? 0) === i ? styles.fileBtnActive : {}),
                }}
                onClick={() => setSelectedFile(i)}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        {/* Code panel */}
        <div style={styles.codePanel}>
          {displayCode ? (
            <>
              <div style={styles.codeHeader}>
                <span style={styles.codeName}>{displayName}</span>
                <button style={styles.copyBtn} onClick={copy}>Copy</button>
              </div>
              <pre style={styles.pre}>{displayCode}</pre>
            </>
          ) : (
            <div style={styles.empty}>No output yet</div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  wrapper: {
    background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column',
    minHeight: 400,
  },
  tabs: {
    display: 'flex', borderBottom: '1px solid var(--border)',
    background: 'var(--bg)',
  },
  tab: {
    padding: '10px 16px', background: 'none', border: 'none',
    color: 'var(--muted)', fontSize: 13, cursor: 'pointer',
    borderBottom: '2px solid transparent',
  },
  tabActive: {
    color: 'var(--text)', borderBottomColor: 'var(--accent2)',
  },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  fileList: {
    width: 200, borderRight: '1px solid var(--border)',
    overflowY: 'auto', padding: '8px 0',
    background: 'var(--bg)',
  },
  fileBtn: {
    width: '100%', padding: '7px 12px', background: 'none', border: 'none',
    color: 'var(--muted)', fontSize: 11, fontFamily: 'var(--mono)',
    cursor: 'pointer', textAlign: 'left', borderLeft: '2px solid transparent',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    display: 'block',
  },
  fileBtnActive: {
    color: 'var(--accent)', borderLeftColor: 'var(--accent)',
    background: 'rgba(110,231,183,0.06)',
  },
  codePanel: { flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' },
  codeHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 14px', borderBottom: '1px solid var(--border)',
    background: 'var(--bg)', flexShrink: 0,
  },
  codeName: { fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' },
  copyBtn: {
    padding: '3px 10px', background: 'var(--bg3)',
    border: '1px solid var(--border)', borderRadius: 4,
    color: 'var(--muted)', fontSize: 11, cursor: 'pointer',
  },
  pre: {
    flex: 1, padding: '16px', margin: 0, fontSize: 12,
    fontFamily: 'var(--mono)', color: 'var(--text)',
    lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
    overflowX: 'auto',
  },
  empty: { padding: 24, color: 'var(--muted)', fontSize: 13 },
}
