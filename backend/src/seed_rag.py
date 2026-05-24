"""
seed_rag.py — run this once to populate ChromaDB with Go knowledge.
Usage: python src/seed_rag.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from rag import seed_knowledge_base

if __name__ == "__main__":
    print("Seeding ChromaDB with Go patterns knowledge base...")
    seed_knowledge_base()
    print("Done. You can now start the server with: python src/main.py")
