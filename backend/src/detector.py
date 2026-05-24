"""
detector.py — inspects a ZIP file and decides if it's Java Spring Boot or unknown.
Returns a dict with: language, confidence, signals_found, files (list of paths).
"""

import zipfile
import os
from pathlib import Path


def detect_language(zip_path: str) -> dict:
    signals = []
    java_files = []
    has_spring_annotation = False
    all_files = []

    try:
        with zipfile.ZipFile(zip_path, "r") as zf:
            names = zf.namelist()
            all_files = [n for n in names if not n.endswith("/")]

            for name in names:
                base = Path(name).name
                suffix = Path(name).suffix.lower()

                # Strong Java Spring Boot signals
                if base in ("pom.xml", "build.gradle", "build.gradle.kts"):
                    signals.append(f"Found {base}")

                if suffix == ".java":
                    java_files.append(name)
                    try:
                        content = zf.read(name).decode("utf-8", errors="ignore")
                        if any(
                            ann in content
                            for ann in [
                                "@SpringBootApplication",
                                "@RestController",
                                "@Service",
                                "@Repository",
                                "@Component",
                                "@Transactional",
                                "@Autowired",
                            ]
                        ):
                            has_spring_annotation = True
                    except Exception:
                        pass

    except zipfile.BadZipFile:
        return {
            "language": "unknown",
            "confidence": "none",
            "signals": ["Not a valid ZIP file"],
            "files": [],
            "java_files": [],
        }

    if java_files:
        signals.append(f"Found {len(java_files)} .java file(s)")
    if has_spring_annotation:
        signals.append("Found Spring Boot annotations (@SpringBootApplication etc.)")

    # Determine result
    is_spring = any("pom.xml" in s or "build.gradle" in s for s in signals) or (
        java_files and has_spring_annotation
    )

    if is_spring:
        return {
            "language": "java_spring_boot",
            "confidence": "high" if len(signals) >= 2 else "medium",
            "signals": signals,
            "files": all_files,
            "java_files": java_files,
        }

    return {
        "language": "unknown",
        "confidence": "none",
        "signals": signals or ["No recognisable Java Spring Boot signals found"],
        "files": all_files,
        "java_files": java_files,
    }
