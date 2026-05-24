# MigrateAI — Phase 1

Java Spring Boot → Go migration tool powered by Claude + ChromaDB (RAG).

## Project Structure

```
migrate-ai/
├── backend/                  # Python FastAPI server
│   ├── src/
│   │   ├── main.py           # FastAPI app + routes
│   │   ├── agent.py          # Agentic migration loop (10 steps)
│   │   ├── rag.py            # ChromaDB setup + retrieval
│   │   └── detector.py       # ZIP language detection
│   ├── knowledge/            # Go pattern docs for RAG
│   │   ├── go_patterns.md
│   │   ├── spring_to_go.md
│   │   └── go_testing.md
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/                 # React + Vite UI
    ├── src/
    │   ├── App.jsx
    │   ├── components/
    │   │   ├── UploadZone.jsx
    │   │   ├── AgentFeed.jsx
    │   │   ├── MigrationPlan.jsx
    │   │   ├── OutputFiles.jsx
    │   │   └── RiskFlags.jsx
    │   └── main.jsx
    ├── index.html
    └── package.json
```

## Prerequisites

- Python 3.11+
- Node.js 18+
- An Anthropic API key

## Setup & Run

### 1. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env → add your ANTHROPIC_API_KEY
python src/seed_rag.py          # seed ChromaDB with Go knowledge
python src/main.py              # starts on http://localhost:8000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev                     # starts on http://localhost:5173
```

Open http://localhost:5173, upload a Java Spring Boot ZIP, watch the magic.
