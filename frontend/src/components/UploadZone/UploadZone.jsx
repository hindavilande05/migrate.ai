import { useState, useRef } from 'react'

export default function UploadZone({ onUpload }) {
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const inputRef = useRef(null)

  const handleFile = (file) => {
    if (!file) return
    if (!file.name.endsWith('.zip')) {
      alert('Please upload a .zip file containing your Java Spring Boot project.')
      return
    }
    setFileName(file.name)
    onUpload(file)
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.title}>Migrate Java Spring Boot → Go</div>
        <div style={styles.subtitle}>
          Upload a ZIP of your Spring Boot project. The agent will detect patterns,
          generate idiomatic Go, write tests, and flag risks — all in real time.
        </div>

        <div
          style={{ ...styles.dropzone, ...(dragging ? styles.dropzoneActive : {}) }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".zip"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
          <div style={styles.dropIcon}>⬆</div>
          <div style={styles.dropPrimary}>
            {fileName || 'Drop your ZIP here or click to browse'}
          </div>
          <div style={styles.dropHint}>Accepts .zip — Java Spring Boot projects only</div>
        </div>

        <div style={styles.checklist}>
          {[
            'Auto-detects Spring Boot patterns (pom.xml, @SpringBootApplication…)',
            'RAG-grounded Go code generation via ChromaDB',
            'Self-review loop catches Java idioms in generated Go',
            'Table-driven _test.go for every migrated file',
            'Risk flags for patterns requiring human review',
          ].map((item, i) => (
            <div key={i} style={styles.checkItem}>
              <span style={styles.checkMark}>✓</span>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const styles = {
  wrapper: {
    flex: 1, display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: 40,
  },
  card: {
    background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: 12, padding: 40, maxWidth: 600, width: '100%',
  },
  title: {
    fontSize: 24, fontWeight: 600, marginBottom: 8,
    letterSpacing: '-0.4px',
  },
  subtitle: {
    color: 'var(--muted)', lineHeight: 1.7, marginBottom: 28, fontSize: 14,
  },
  dropzone: {
    border: '2px dashed var(--border)', borderRadius: 10,
    padding: '36px 24px', textAlign: 'center', cursor: 'pointer',
    transition: 'all 0.15s ease', marginBottom: 28,
    background: 'var(--bg)',
  },
  dropzoneActive: {
    borderColor: 'var(--accent)', background: 'rgba(110,231,183,0.05)',
  },
  dropIcon: { fontSize: 28, marginBottom: 10, color: 'var(--accent)' },
  dropPrimary: { fontWeight: 500, marginBottom: 6 },
  dropHint: { fontSize: 12, color: 'var(--muted)' },
  checklist: { display: 'flex', flexDirection: 'column', gap: 8 },
  checkItem: {
    display: 'flex', gap: 10, alignItems: 'flex-start',
    fontSize: 13, color: 'var(--muted)',
  },
  checkMark: { color: 'var(--success)', flexShrink: 0, marginTop: 1 },
}
