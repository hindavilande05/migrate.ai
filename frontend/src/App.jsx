import { useState, useCallback } from 'react'
import UploadZone from './components/UploadZone/UploadZone.jsx'
import AgentFeed from './components/AgentFeed/AgentFeed.jsx'
import MigrationPlan from './pages/MigrationPlan/MigrationPlan.jsx'
import OutputFiles from './pages/OutputFiles/OutputFiles.jsx'
import RiskFlags from './pages/RiskFlags/RiskFlags.jsx'

const BACKEND = '' // proxied by Vite to localhost:8000

export default function App() {
  const [phase, setPhase] = useState('idle') // idle | running | done | error
  const [events, setEvents] = useState([])
  const [plan, setPlan] = useState(null)
  const [output, setOutput] = useState(null) // final done payload
  const [errorMsg, setErrorMsg] = useState('')

  const addEvent = useCallback((evt) => {
    setEvents(prev => [...prev, evt])
  }, [])

  const handleUpload = useCallback(async (file) => {
    setPhase('running')
    setEvents([])
    setPlan(null)
    setOutput(null)
    setErrorMsg('')

    const formData = new FormData()
    formData.append('file', file)

    let response
    try {
      response = await fetch(`${BACKEND}/migrate`, {
        method: 'POST',
        body: formData,
      })
    } catch (e) {
      setPhase('error')
      setErrorMsg('Cannot reach backend. Is it running on port 8000?')
      return
    }

    if (!response.ok) {
      const detail = await response.json().catch(() => ({ detail: 'Unknown error' }))
      setPhase('error')
      setErrorMsg(detail.detail || `HTTP ${response.status}`)
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() // keep incomplete line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        try {
          const evt = JSON.parse(line.slice(6))
          addEvent(evt)

          if (evt.type === 'step_done' && evt.step === 4 && evt.data?.plan) {
            setPlan(evt.data.plan)
          }
          if (evt.type === 'done') {
            setOutput(evt.data)
            setPhase('done')
          }
          if (evt.type === 'error') {
            setPhase('error')
            setErrorMsg(evt.message)
          }
        } catch {
          // malformed JSON — skip
        }
      }
    }

    if (phase === 'running') setPhase('done')
  }, [phase, addEvent])

  const reset = () => {
    setPhase('idle')
    setEvents([])
    setPlan(null)
    setOutput(null)
    setErrorMsg('')
  }

  return (
    <div style={styles.root}>
      <Header />

      {phase === 'idle' && (
        <UploadZone onUpload={handleUpload} />
      )}

      {phase === 'error' && (
        <ErrorPanel message={errorMsg} onReset={reset} />
      )}

      {(phase === 'running' || phase === 'done') && (
        <div style={styles.workspace}>
          {/* Left: live agent feed */}
          <div style={styles.leftCol}>
            <AgentFeed events={events} running={phase === 'running'} />
          </div>

          {/* Right: plan + outputs */}
          <div style={styles.rightCol}>
            {plan && <MigrationPlan plan={plan} />}
            {output && (
              <>
                <RiskFlags risks={output.risk_flags} />
                <OutputFiles
                  migrated={output.migrated_files}
                  tests={output.test_files}
                  notes={output.notes}
                />
              </>
            )}
            {phase === 'done' && (
              <button style={styles.resetBtn} onClick={reset}>
                ↩ Migrate another project
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Header() {
  return (
    <header style={styles.header}>
      <div style={styles.logo}>
        <span style={styles.logoIcon}>⟶</span>
        <span style={styles.logoText}>MigrateAI</span>
        <span style={styles.logoBadge}>Java → Go</span>
      </div>
      <span style={styles.logoSub}>Phase 1 · Powered by LLM + ChromaDB</span>
    </header>
  )
}

function ErrorPanel({ message, onReset }) {
  return (
    <div style={styles.errorPanel}>
      <div style={styles.errorIcon}>⚠</div>
      <div style={styles.errorMsg}>{message}</div>
      <button style={styles.resetBtn} onClick={onReset}>Try again</button>
    </div>
  )
}

const styles = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '16px 32px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'var(--bg2)',
  },
  logo: { display: 'flex', alignItems: 'center', gap: 10 },
  logoIcon: { fontSize: 22, color: 'var(--accent)', fontWeight: 700 },
  logoText: { fontSize: 18, fontWeight: 600, letterSpacing: '-0.3px' },
  logoBadge: {
    background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 4, padding: '2px 8px', fontSize: 11,
    color: 'var(--accent2)', fontFamily: 'var(--mono)',
  },
  logoSub: { fontSize: 12, color: 'var(--muted)' },
  workspace: {
    display: 'flex', flex: 1, overflow: 'hidden', gap: 0,
  },
  leftCol: {
    width: 380, minWidth: 380, borderRight: '1px solid var(--border)',
    overflowY: 'auto', padding: '20px 0',
  },
  rightCol: {
    flex: 1, overflowY: 'auto', padding: '20px 24px',
    display: 'flex', flexDirection: 'column', gap: 20,
  },
  errorPanel: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', flex: 1, gap: 12, padding: 40,
  },
  errorIcon: { fontSize: 36, color: 'var(--danger)' },
  errorMsg: { color: 'var(--danger)', maxWidth: 480, textAlign: 'center', lineHeight: 1.7 },
  resetBtn: {
    marginTop: 8, padding: '8px 20px',
    background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 6, color: 'var(--text)', fontSize: 13,
    cursor: 'pointer', alignSelf: 'flex-start',
  },
}
