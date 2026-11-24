# -*- coding: utf-8 -*-
"""BRC V28 source preflight: strictly read-only, no network or GitHub writes."""
import csv
import hashlib
import io
import os
import sys
import zipfile
from pathlib import Path

NAMES = {"races_k.csv", "boats_k.csv"}
MAX_ZIPS = 32
MAX_FILES = 30

def output(key, value):
    print(f"{key}={value}")

def header_info(raw):
    for coding in ("utf-8-sig", "cp932", "utf-8", "shift_jis"):
        try:
            sample = raw.decode(coding, errors="strict")
            break
        except UnicodeError:
            continue
    else:
        return "UNKNOWN", "DECODE_ERROR"
    first_line = next((line for line in sample.splitlines() if line.strip()), "")
    if not first_line:
        return coding, "EMPTY"
    try:
        dialect = csv.Sniffer().sniff(sample[:8192], delimiters=",\t;")
        values = next(csv.reader([first_line], dialect=dialect))
    except csv.Error:
        values = next(csv.reader([first_line]))
    clean = []
    for value in values[:42]:
        value = value.lstrip("\ufeff").replace("\t", " ").replace("\r", " ")
        clean.append(value[:60])
    return coding, "|".join(clean)

def show_file(label, name, length, sample):
    encoding, header = header_info(sample)
    output(label + "_NAME", name)
    output(label + "_BYTES", length)
    output(label + "_ENCODING", encoding)
    output(label + "_COLUMNS", header)

def inspect_directory(root, found, errors):
    if not root.is_dir():
        return
    # BRCdirectory only; skip unrelated Downloads subtrees.
    for parent, folders, filenames in os.walk(root):
        folders[:] = [f for f in folders
                      if not f.startswith(".")
                      and f.lower() not in {"node_modules", ".git", "__pycache__"}]
        for filename in filenames:
            if filename.lower() not in NAMES:
                continue
            candidate = Path(parent) / filename
            if len(found) >= MAX_FILES:
                return
            try:
                with candidate.open("rb") as handle:
                    sample = handle.read(16384)
                found.append((candidate, candidate.stat().st_size, sample))
            except OSError as exc:
                errors.append(type(exc).__name__)

def inspect_zips(downloads, found, errors):
    if not downloads.is_dir():
        return
    archives = sorted(
        (p for p in downloads.iterdir() if p.is_file() and p.suffix.lower() == ".zip"),
        key=lambda p: p.stat().st_mtime,
        reverse=True
    )[:MAX_ZIPS]
    for path in archives:
        if len(found) >= MAX_FILES:
            break
        try:
            with zipfile.ZipFile(path, "r") as archive:
                for item in archive.infolist():
                    if item.is_dir() or Path(item.filename).name.lower() not in NAMES:
                        continue
                    with archive.open(item, "r") as stream:
                        sample = stream.read(16384)
                    found.append((path.name + "::" + Path(item.filename).name, item.file_size, sample))
                    if len(found) >= MAX_FILES:
                        break
        except (OSError, zipfile.BadZipFile, RuntimeError, ValueError) as exc:
            errors.append(type(exc).__name__)

def main():
    output("REPORT", "BRC_V28_SOURCE_PREFLIGHT_V1")
    for key in ("READ_ONLY", "FILE_WRITE", "GITHUB_WRITE", "DB_WRITE",
                "KV_WRITE", "DEPLOY", "TASK_CHANGE", "NETWORK", "ZIP_EXTRACTION",
                "SOURCE_EXECUTION", "SECRET_OUTPUT", "FULL_PATH_OUTPUT"):
        output(key, "YES" if key == "READ_ONLY" else "NO")
    home = Path.home()
    downloads = home / "Downloads"
    found, errors = [], []
    roots = [downloads / "BRCdatabase", downloads / "BRC_MOBILE_ORIGINAL_STAGE"]
    for root in roots:
        inspect_directory(root, found, errors)
    inspect_zips(downloads, found, errors)

    output("SOURCE_CANDIDATES", len(found))
    output("READ_ERRORS", len(errors))
    shown = {"races_k.csv": 0, "boats_k.csv": 0}
    for location, length, sample in found:
        base = (Path(location.split("::")[-1]) if isinstance(location, str)
                else location).name.lower()
        if base not in shown:
            continue
        shown[base] += 1
        if shown[base] > 4:
            continue
        prefix = "RACES" if base == "races_k.csv" else "BOATS"
        label = prefix + "_" + str(shown[base])
        if isinstance(location, str):
            alias = "ZIP:" + location.split("::", 1)[0]
        else:
            alias = "CSV:" + "/".join(location.parts[-3:-1])
        show_file(label, alias, length, sample)
    output("RACES_CANDIDATES", shown["races_k.csv"])
    output("BOATS_CANDIDATES", shown["boats_k.csv"])
    if shown["races_k.csv"] and shown["boats_k.csv"]:
        output("STATUS", "HEADERS_READY_NO_DATA_CHANGE")
    else:
        output("STATUS", "SOURCE_NOT_FOUND_NO_DATA_CHANGE")
    output("NEXT", "REVIEW_HEADERS_BEFORE_UPDATER_BUILD")
    print("=== END ===")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        output("STATUS", "SAFE_ERROR")
        output("ERROR_TYPE", type(exc).__name__)
        print("=== END ===")
        sys.exit(1)
