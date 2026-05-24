"""
main.py — FastAPI application.

Routes:
  POST /migrate   — upload ZIP, returns SSE stream of agent events
  GET  /health    — health check
"""

import os
import uuid
import asyncio
from pathlib import Path
from dotenv import load_dotenv

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import aiofiles

from detector import detect_language
from agent import run_migration
from rag import seed_knowledge_base

load_dotenv()

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="MigrateAI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    print("[startup] Seeding RAG knowledge base...")
    seed_knowledge_base()
    print("[startup] Ready.")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/migrate")
async def migrate(file: UploadFile = File(...)):
    # Validate
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are accepted")

    # Save upload
    job_id = str(uuid.uuid4())
    zip_path = UPLOAD_DIR / f"{job_id}.zip"

    async with aiofiles.open(zip_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    # Detect language
    detection = detect_language(str(zip_path))
    if detection["language"] != "java_spring_boot":
        zip_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=422,
            detail=f"Could not detect Java Spring Boot project. Signals found: {detection['signals']}",
        )

    async def event_stream():
        try:
            async for event in run_migration(str(zip_path), detection):
                yield event
                await asyncio.sleep(0)  # allow other coroutines to run
        finally:
            zip_path.unlink(missing_ok=True)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
