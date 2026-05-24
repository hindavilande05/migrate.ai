"""
agent.py — the agentic migration loop.

Yields Server-Sent Events (SSE) as JSON strings.
Each event has: { type, step, message, data? }

Steps:
  1  ingest        — read files from ZIP
  2  detect        — language detection result
  3  pattern_scan  — detect Spring patterns per file
  4  plan          — build migration plan (shown to user)
  5  codegen       — generate Go code per file (RAG-grounded)
  6  self_review   — check for source-language anti-patterns
  7  test_gen      — write _test.go for each file
  8  risk_flags    — flag anything uncertain
  9  notes         — write migration notes
  10 done          — final output bundle
"""

import json
import zipfile
import os
from pathlib import Path
from dotenv import load_dotenv
#import anthropic
from rag import retrieve
from groq import Groq

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))     # GROQ_API_KEY is in the .env file
MODEL = "claude-sonnet-4-20250514"

def _emit(type_: str, step: int, message: str, data: dict | None = None) -> str:
    payload = {"type": type_, "step": step, "message": message}
    if data:
        payload["data"] = data
    return f"data: {json.dumps(payload)}\n\n"


def _read_zip_files(zip_path: str, java_files: list[str]) -> dict[str, str]:
    """Returns { filename: source_code } for all .java files."""
    sources = {}
    with zipfile.ZipFile(zip_path, "r") as zf:
        for name in java_files:
            try:
                sources[name] = zf.read(name).decode("utf-8", errors="ignore")
            except Exception:
                pass
    return sources


def _call_claude(system: str, user: str) -> str:
    """Non-streaming Claude call — returns full text response."""
    resp = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return resp.content[0].text

def _call_llm(system: str, user: str) -> str:
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": system
            },
            {
                "role": "user",
                "content": user
            }
        ],
        temperature=0.2,
        max_tokens=800,
    )

    return response.choices[0].message.content



def _rag_context(query: str) -> str:
    chunks = retrieve(query, n=4)
    if not chunks:
        return ""
    parts = [f"[{c['title']}]\n{c['text']}" for c in chunks]
    return "Relevant Go patterns from knowledge base:\n\n" + "\n\n---\n\n".join(parts)


# ─── Step 3: pattern scan ────────────────────────────────────────────────────

SPRING_PATTERNS = [
    "@Transactional",
    "@Async",
    "@Service",
    "@Repository",
    "@RestController",
    "@Autowired",
    "@Component",
    "CompletableFuture",
    "ApplicationEvent",
    "@Aspect",
    "Optional<",
    "Stream<",
]


def _scan_patterns(source: str) -> list[str]:
    found = []
    for p in SPRING_PATTERNS:
        if p in source:
            found.append(p)
    return found


# ─── Step 5: code generation ─────────────────────────────────────────────────

def _generate_go(filename: str, java_source: str, patterns: list[str]) -> str:
    rag_ctx = _rag_context(f"Java Spring Boot {', '.join(patterns) or 'general'} to Go migration")

    system = """You are an expert Go developer specialising in migrating Java Spring Boot code to idiomatic Go.
You produce clean, production-ready Go code. You NEVER carry over Java/Spring idioms.
Rules:
- No global state, no service locator
- Constructor functions (NewXxx) instead of Spring DI
- net/http or Gin for HTTP handlers
- database/sql for DB access
- Explicit error returns everywhere
- Goroutines + channels / WaitGroup for concurrency
- Return ONLY the Go source code, no explanation, no markdown fences."""

    user = f"""{rag_ctx}

Migrate this Java Spring Boot file to idiomatic Go.
Original filename: {filename}

Java source:
{java_source}

Detected Spring patterns: {', '.join(patterns) if patterns else 'none'}

Output only the Go source code."""

    return _call_llm(system, user) 


# ─── Step 6: self-review ─────────────────────────────────────────────────────

ANTI_PATTERNS = [
    "interface{}",          # excessive use of empty interface
    "reflect.",             # runtime reflection
    "panic(",               # panic instead of error return
    "log.Fatal",            # fatal in library code
    "global",               # global variable names
    "getInstance",          # singleton / service locator
]


def _self_review(go_code: str) -> list[str]:
    found = []
    for ap in ANTI_PATTERNS:
        if ap in go_code:
            found.append(ap)
    return found


def _fix_antipatterns(filename: str, go_code: str, issues: list[str]) -> str:
    rag_ctx = _rag_context("idiomatic Go error handling and dependency injection")
    system = """You are an expert Go code reviewer. Fix the anti-patterns listed and return ONLY the corrected Go source code."""
    user = f"""{rag_ctx}

This Go file has anti-patterns that should be fixed: {', '.join(issues)}

File: {filename}
{go_code}

Return only the corrected Go source code."""
    return _call_llm(system, user) 


# ─── Step 7: test generation ─────────────────────────────────────────────────

def _generate_tests(filename: str, go_code: str) -> str:
    rag_ctx = _rag_context("Go table-driven tests, testify, mock interfaces")
    go_test_filename = filename.replace(".java", "_test.go").split("/")[-1]

    system = """You are a Go testing expert. Write table-driven _test.go files.
Rules:
- Use []struct{name, input, expected, wantErr} table tests
- Use t.Run() subtests
- Define interfaces for all external deps (DB, HTTP)
- Mock structs implementing those interfaces — no third-party libraries
- Cover happy path, error path, edge cases
- t.Parallel() on stateless tests
- Return ONLY the Go test source code, no explanation."""

    user = f"""{rag_ctx}

Write a complete _test.go file for this Go code.
Test file name: {go_test_filename}

Go source:
{go_code}

Return only the Go test source code."""

    return _call_llm(system, user) 


# ─── Step 8: risk flags ──────────────────────────────────────────────────────

def _risk_flags(filename: str, java_source: str, patterns: list[str]) -> dict | None:
    risky = []
    if "@Aspect" in patterns:
        risky.append("AOP / @Aspect — translated to middleware wrappers; verify cross-cutting behaviour is preserved")
    if "CompletableFuture" in patterns:
        risky.append("CompletableFuture — converted to goroutines; review error propagation in async chains")
    if "Optional<" in patterns:
        risky.append("Java Optional<T> — replaced with (value, bool) tuple; confirm nil semantics match")
    if any("reflect" in java_source.lower() for _ in [1]):
        risky.append("Java reflection detected — replaced with explicit code; human review required")

    if not risky:
        return None
    return {"file": filename, "flags": risky}


# ─── Main async generator ────────────────────────────────────────────────────

async def run_migration(zip_path: str, detection: dict):
    """
    Async generator that yields SSE strings.
    Call like: async for event in run_migration(path, detection): ...
    """

    # Step 1 — Ingest
    yield _emit("step", 1, "Reading files from ZIP...")
    java_files = detection["java_files"]
    all_files = detection["files"]
    sources = _read_zip_files(zip_path, java_files)
    yield _emit("step_done", 1, f"Ingested {len(sources)} Java source files", {
        "file_count": len(sources),
        "all_files": all_files[:50],  # cap for UI
    })

    if not sources:
        yield _emit("error", 1, "No .java files found in ZIP. Aborting.")
        return

    # Step 2 — Detection result (already done, just surface it)
    yield _emit("step", 2, "Language detection complete")
    yield _emit("step_done", 2, f"Detected: Java Spring Boot ({detection['confidence']} confidence)", {
        "language": detection["language"],
        "signals": detection["signals"],
    })

    # Step 3 — Pattern scan
    yield _emit("step", 3, "Scanning for Spring Boot patterns...")
    pattern_report = {}
    for fname, src in sources.items():
        found = _scan_patterns(src)
        pattern_report[fname] = found
    yield _emit("step_done", 3, "Pattern scan complete", {"patterns": pattern_report})

    # Step 4 — Migration plan
    yield _emit("step", 4, "Building migration plan...")
    plan_items = []
    for fname, patterns in pattern_report.items():
        plan_items.append({
            "file": fname,
            "patterns_found": patterns,
            "go_approach": _summarise_approach(patterns),
            "concurrency": _concurrency_decision(patterns, sources.get(fname, "")),
        })
    yield _emit("step_done", 4, "Migration plan ready — review before proceeding", {"plan": plan_items})

    # Step 5+6 — Code generation + self-review per file
    migrated_files = {}
    for fname, src in sources.items():
        patterns = pattern_report.get(fname, [])
        short = fname.split("/")[-1]

        yield _emit("step", 5, f"Generating Go code for {short}...")
        go_code = _generate_go(fname, src, patterns)

        # Self-review
        yield _emit("step", 6, f"Self-reviewing {short}...")
        issues = _self_review(go_code)
        if issues:
            yield _emit("info", 6, f"Anti-patterns detected in {short}: {', '.join(issues)} — re-attempting...")
            go_code = _fix_antipatterns(fname, go_code, issues)

        go_filename = _to_go_filename(fname)
        migrated_files[go_filename] = go_code
        yield _emit("file_ready", 5, f"Migrated {short}", {"filename": go_filename, "code": go_code})

    # Step 7 — Test generation
    test_files = {}
    for go_fname, go_code in migrated_files.items():
        yield _emit("step", 7, f"Writing tests for {go_fname}...")
        test_code = _generate_tests(go_fname, go_code)
        test_fname = go_fname.replace(".go", "_test.go")
        test_files[test_fname] = test_code
        yield _emit("file_ready", 7, f"Tests written for {go_fname}", {"filename": test_fname, "code": test_code})

    # Step 8 — Risk flags
    yield _emit("step", 8, "Auditing for risk flags...")
    all_risks = []
    for fname, src in sources.items():
        patterns = pattern_report.get(fname, [])
        risk = _risk_flags(fname, src, patterns)
        if risk:
            all_risks.append(risk)
    yield _emit("step_done", 8, f"Risk audit complete — {len(all_risks)} flag(s) raised", {"risks": all_risks})

    # Step 9 — Migration notes
    yield _emit("step", 9, "Writing migration notes...")
    notes = _build_notes(plan_items, all_risks)
    yield _emit("step_done", 9, "Migration notes written", {"notes": notes})

    # Step 10 — Done
    yield _emit("done", 10, "Migration complete", {
        "migrated_files": migrated_files,
        "test_files": test_files,
        "risk_flags": all_risks,
        "notes": notes,
        "plan": plan_items,
    })


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _to_go_filename(java_path: str) -> str:
    name = java_path.split("/")[-1].replace(".java", ".go")
    # CamelCase → snake_case
    import re
    s = re.sub(r"(?<!^)(?=[A-Z])", "_", name).lower()
    return s


def _summarise_approach(patterns: list[str]) -> str:
    notes = []
    mapping = {
        "@Transactional": "db.BeginTx + defer Rollback + Commit",
        "@Service": "Go interface + struct + NewXxx constructor",
        "@Repository": "Go interface + struct + database/sql",
        "@RestController": "net/http handler or Gin route",
        "@Autowired": "Constructor injection — no DI container",
        "@Async": "goroutine + WaitGroup or errgroup",
        "CompletableFuture": "goroutine + channel for result",
        "@Aspect": "Go middleware function / decorator wrapper",
        "Optional<": "(value, bool) or (value, error) return tuple",
        "Stream<": "Explicit for-loop with slice operations",
    }
    for p in patterns:
        if p in mapping:
            notes.append(f"{p} → {mapping[p]}")
    return "; ".join(notes) if notes else "Standard struct + interface pattern"


def _concurrency_decision(patterns: list[str], source: str) -> str:
    if "@Async" in patterns or "CompletableFuture" in patterns:
        return "goroutines + errgroup.Group (parallel tasks with error aggregation)"
    if "ExecutorService" in source or "ThreadPool" in source:
        return "Worker pool — fixed goroutines + buffered channel"
    if "synchronized" in source:
        return "sync.Mutex for shared mutable state"
    return "No concurrency added — sequential code in original"


def _build_notes(plan_items: list[dict], risks: list[dict]) -> str:
    lines = ["# Migration Notes\n"]
    for item in plan_items:
        lines.append(f"## {item['file'].split('/')[-1]}")
        lines.append(f"- Patterns: {', '.join(item['patterns_found']) or 'none'}")
        lines.append(f"- Approach: {item['go_approach']}")
        lines.append(f"- Concurrency: {item['concurrency']}\n")
    if risks:
        lines.append("## Risk Flags")
        for r in risks:
            for flag in r["flags"]:
                lines.append(f"- [{r['file'].split('/')[-1]}] {flag}")
    return "\n".join(lines)
