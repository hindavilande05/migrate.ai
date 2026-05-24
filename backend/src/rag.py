"""
rag.py — ChromaDB (local, free, zero-config) for Go pattern retrieval.

Two public functions:
  seed_knowledge_base()  — call once at startup to populate ChromaDB
  retrieve(query, n)     — returns top-n relevant Go pattern chunks
"""

import os
import chromadb
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma_db")
KNOWLEDGE_DIR = Path(__file__).parent.parent / "knowledge"
COLLECTION_NAME = "go_patterns"

_client = None
_collection = None


def _get_collection():
    global _client, _collection
    if _collection is not None:
        return _collection
    _client = chromadb.PersistentClient(path=CHROMA_PATH)
    _collection = _client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=DefaultEmbeddingFunction(),
    )
    return _collection


def seed_knowledge_base():
    """
    Reads all .md files from the knowledge/ directory,
    chunks them by section (## headings), and upserts into ChromaDB.
    Safe to call multiple times — uses upsert so no duplicates.
    """
    collection = _get_collection()
    docs, ids, metas = [], [], []

    for md_file in KNOWLEDGE_DIR.glob("*.md"):
        text = md_file.read_text(encoding="utf-8")
        chunks = _split_by_section(text, source=md_file.name)
        for chunk in chunks:
            docs.append(chunk["text"])
            ids.append(chunk["id"])
            metas.append({"source": chunk["source"], "title": chunk["title"]})

    if docs:
        collection.upsert(documents=docs, ids=ids, metadatas=metas)
        print(f"[RAG] Seeded {len(docs)} chunks from {KNOWLEDGE_DIR}")
    else:
        print("[RAG] No knowledge files found — add .md files to backend/knowledge/")


def retrieve(query: str, n: int = 4) -> list[dict]:
    """
    Query ChromaDB for the top-n relevant Go pattern chunks.
    Returns list of { text, source, title } dicts.
    """
    collection = _get_collection()
    if collection.count() == 0:
        return []

    results = collection.query(query_texts=[query], n_results=min(n, collection.count()))
    output = []
    for i, doc in enumerate(results["documents"][0]):
        meta = results["metadatas"][0][i]
        output.append({"text": doc, "source": meta.get("source", ""), "title": meta.get("title", "")})
    return output


def _split_by_section(text: str, source: str) -> list[dict]:
    """Split markdown by ## headings into chunks."""
    chunks = []
    current_title = "intro"
    current_lines = []

    for line in text.splitlines():
        if line.startswith("## "):
            if current_lines:
                body = "\n".join(current_lines).strip()
                if body:
                    chunk_id = f"{source}::{current_title}".replace(" ", "_")[:80]
                    chunks.append({"id": chunk_id, "text": body, "source": source, "title": current_title})
            current_title = line.lstrip("# ").strip()
            current_lines = []
        else:
            current_lines.append(line)

    if current_lines:
        body = "\n".join(current_lines).strip()
        if body:
            chunk_id = f"{source}::{current_title}".replace(" ", "_")[:80]
            chunks.append({"id": chunk_id, "text": body, "source": source, "title": current_title})

    return chunks
