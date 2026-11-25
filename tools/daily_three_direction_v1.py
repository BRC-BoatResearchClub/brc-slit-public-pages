# -*- coding: utf-8 -*-
"""BRC exhibition slit daily 3-direction publication coordinator.
--preflight: read-only checks; --run: explicit publishing (two-step).
Never creates/modifies Windows tasks; never changes original research or BRC app.
"""
from __future__ import annotations
import argparse
import ast
import base64
from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
from urllib.request import Request, urlopen

VERSION = "BRC_SLIT_THREE_DIRECTION_DAILY_V1"
REPO = "BRC-BoatResearchClub/brc-slit-public-pages"
ROOT = (Path.home() / "Downloads" / "BRCdatabase" / "data_bunseki" /
        "展示スリット評価_再調査" / "07_個人GitHubPages公開")
PUBLISHER = ROOT / "publish.py"
PIN_PUBLISHER_SHA12 = "ee06593b467c"
REAR_COMMIT = "49c93d0c4de8ac8e1f6d1d27f2963fe3ab3e3739"
REAR_BLOB_SHA1 = "855df50e94ac3c96dd30629a93e203c23c122c87"
REAR_URL = ("https://raw.githubusercontent.com/" + REPO + "/" +
            REAR_COMMIT + "/tools/rear_join_publish_v1.py")
JST = timezone(timedelta(hours=9))

def log(key, value):
    print(str(key) + "=" + str(value), flush=True)

def need(ok, reason):
    if not ok:
        raise RuntimeError(reason)

def sha12(data):
    return hashlib.sha256(data).hexdigest()[:12]

def git_blob_sha(data):
    return hashlib.sha1(b"blob " + str(len(data)).encode("ascii") + b"\0" + data).hexdigest()

def command(*args, stdin=None, timeout=150):
    p = subprocess.run(args, input=stdin, capture_output=True, text=True,
                       encoding="utf-8", errors="replace", timeout=timeout)
    return p

def github_cli():
    exe = shutil.which("gh")
    if not exe:
        possible = Path("C:/Program Files/GitHub CLI/gh.exe")
        exe = str(possible) if possible.is_file() else None
    need(exe is not None, "GITHUB_CLI_NOT_FOUND")
    return exe

def github_api(path):
    # Read-only; keep contents in memory and do not emit response/credentials.
    p = command(github_cli(), "api", "repos/" + REPO + "/contents/" +
                path + "?ref=main", timeout=50)
    need(p.returncode == 0, "GITHUB_READ_FAILED_" + path.replace("/", "_"))
    obj = json.loads(p.stdout)
    need(obj.get("type") == "file" and obj.get("encoding") == "base64",
         "GITHUB_FILE_UNEXPECTED_" + path.replace("/", "_"))
    return base64.b64decode(obj["content"]), obj["sha"]

def check_local_publisher():
    need(PUBLISHER.is_file(), "LOCAL_PUBLISHER_MISSING")
    raw = PUBLISHER.read_bytes()
    need(sha12(raw) == PIN_PUBLISHER_SHA12, "PUBLISHER_CHANGED_SAFE_STOP")
    program = ast.parse(raw.decode("utf-8-sig"))
    functions = {x.name: x for x in program.body
                 if isinstance(x, (ast.FunctionDef, ast.AsyncFunctionDef))}
    need(all(x in functions for x in ("main", "build_snapshot", "put_file")),
         "PUBLISHER_FUNCTIONS_CHANGED_SAFE_STOP")
    # Guarantee calls in pinned source still exist; this is NOT a proof of what
    # the publisher will do, only an additional guard with the source hash.
    calls = [x for x in ast.walk(functions["main"]) if isinstance(x, ast.Call)]
    put_names = []
    for x in calls:
        f = x.func
        if isinstance(f, ast.Name) and f.id == "put_file" and x.args:
            arg = x.args[0]
            put_names.append(arg.value if isinstance(arg, ast.Constant) else None)
    need(put_names == ["index.html", "data.json"],
         "PUBLISHER_TARGETS_CHANGED_SAFE_STOP")
    log("PUBLISHER_SHA12", sha12(raw))
    log("PUBLISHER_TARGETS", ",".join(put_names))
    return raw

def check_remote_layout():
    local = (ROOT / "index.html")
    need(local.is_file(), "PC_INDEX_MISSING")
    remote, remote_blob = github_api("index.html")
    need(git_blob_sha(local.read_bytes()) == remote_blob, "PC_VS_GITHUB_INDEX_MISMATCH")
    for marker in (b"rear-data.json", b"data.json", b"history.html"):
        need(marker in remote, "PRODUCTION_LAYOUT_MARKER_MISSING")
    log("PC_GITHUB_INDEX", "MATCH")
    log("PRODUCTION_THREE_DIRECTION", "PRESENT")

def check_rear_source():
    try:
        req = Request(REAR_URL, headers={"User-Agent": "BRC-Daily-Preflight/1"})
        with urlopen(req, timeout=35) as response:
            need(response.status == 200, "REAR_SCRIPT_FETCH_HTTP_ERROR")
            payload = response.read(1000000)
    except Exception as exc:
        raise RuntimeError("REAR_SCRIPT_FETCH_FAILED_" + type(exc).__name__)
    need(git_blob_sha(payload) == REAR_BLOB_SHA1, "REAR_SOURCE_HASH_MISMATCH")
    need(b"BRC_PERSONAL_REAR_JOIN_V1" in payload and
         b"REAR_RESEARCH_SHA_MISMATCH" in payload and
         b"PUBLISHED_REG_VS_OFFICIAL_B_MISMATCH" in payload,
         "REAR_SCRIPT_SECURITY_MARKER_MISSING")
    ast.parse(payload.decode("utf-8-sig"))
    log("REAR_SOURCE_PIN", "PASS")
    return payload

def check_b_api(day):
    url = "http://127.0.0.1:61229/api/bprogram?date=" + day
    try:
        with urlopen(url, timeout=30) as response:
            need(response.status == 200, "B_API_HTTP_ERROR")
            raw = response.read(25000001)
        need(0 < len(raw) < 25000000, "B_API_SIZE_UNEXPECTED")
        obj = json.loads(raw.decode("utf-8-sig"))
        need(isinstance(obj, (dict, list)), "B_API_FORMAT_UNEXPECTED")
    except Exception as exc:
        raise RuntimeError("B_API_FAILED_" + type(exc).__name__)
    log("B_API_HTTP", 200)
    log("B_API_BYTES", len(raw))
    # HTTP 200 does NOT prove all racecards are complete.
    log("B_RACE_COMPLETENESS", "NOT_PROVEN_BY_HTTP")
    return obj

def check_public_date(day):
    d_raw, _ = github_api("data.json")
    d = json.loads(d_raw.decode("utf-8"))
    need(d.get("version") == 1 and isinstance(d.get("items"), list),
         "PUBLIC_DATA_SCHEMA_INVALID")
    log("FRONT_PUBLIC_DATE", d.get("date", "UNKNOWN"))
    log("FRONT_PUBLIC_ROWS", len(d["items"]))
    try:
        r_raw, _ = github_api("rear-data.json")
        r = json.loads(r_raw.decode("utf-8"))
        need(r.get("version") == 1 and isinstance(r.get("items"), list),
             "REAR_PUBLIC_DATA_SCHEMA_INVALID")
        log("REAR_PUBLIC_DATE", r.get("date", "UNKNOWN"))
        log("REAR_PUBLIC_ROWS", len(r["items"]))
        same = d.get("date") == r.get("date") == day
        log("THREE_DIRECTION_DATES_MATCH_TODAY", "YES" if same else "NO")
    except Exception as exc:
        log("REAR_PUBLIC_READ", "FAILED_" + type(exc).__name__)
        same = False
    return d, same

def process_label(output):
    # Whitelist only known BRC status/count keys. Avoid printing paths, tokens,
    # unpublished player data, probabilities, or raw error tracebacks.
    selected = []
    keep = ("STATUS=", "DATE=", "RACES_", "VENUES=", "CANDIDATES=",
            "INCOMPLETE=", "PUBLISHED_", "GITHUB_", "REAR_", "BRC_",
            "TARGET_", "SOURCE_", "FRESH_", "INDEX_", "DATA_", "DAILY_")
    for line in output.splitlines():
        z = line.strip()
        if not z or len(z) > 220 or "=" not in z:
            continue
        if any(w in z.upper() for w in (
            "TOKEN", "PASSWORD", "SECRET", "AUTHORIZATION", "BEARER",
            "GHU_", "GHP_", "PRIVATE_KEY", "ACCESS_KEY"
        )):
            continue
        if z.startswith(keep):
            selected.append(z)
    return selected[-55:]

def run_stage(title, args, timeout):
    log("STAGE", title)
    proc = command(sys.executable, "-B", "-X", "utf8", *args, timeout=timeout)
    for line in process_label(proc.stdout + "\n" + proc.stderr):
        print(title + "_" + line, flush=True)
    log(title + "_EXIT", proc.returncode)
    need(proc.returncode == 0, title + "_EXECUTION_FAILED")

def orchestrate(mode):
    day = datetime.now(JST).date().isoformat()
    log("VERSION", VERSION)
    log("MODE", mode.upper())
    log("JST_DATE", day)
    log("BRC_PRODUCTION_APP_CHANGED", "NO")
    log("ORIGINAL_RESEARCH_CHANGED", "NO")
    log("WINDOWS_TASK_CHANGE", "NO")
    log("FILE_WRITE", "NO" if mode == "preflight" else "GITHUB_INDEX_DATA_REAR_ONLY")
    check_local_publisher()
    check_remote_layout()
    rear_script = check_rear_source()
    check_b_api(day)
    existing, complete = check_public_date(day)
    if mode == "preflight":
        # Deliberately do not run publisher --check-only or --self-test:
        # source may have side effects not proved by this static preflight.
        log("PUBLISHER_EXECUTED", "NO")
        log("GITHUB_WRITE", "NO")
        log("STATUS", "PREFLIGHT_READY_MANUAL_PUBLISH_NOT_EXECUTED")
        return
    # Explicit --run only: validate all sources before invoking any publisher.
    # The existing publisher itself gates source and upload errors.
    # A new day must first be published by that pinned source.
    need(existing.get("date", "") <= day, "REMOTE_DAILY_DATE_IN_FUTURE")
    run_stage("PUBLISH_CHECK", [str(PUBLISHER), "--date", day, "--check-only"], 180)
    run_stage("PUBLISH_FRONT", [str(PUBLISHER), "--date", day], 300)
    fresh, _ = check_public_date(day)
    need(fresh.get("date") == day, "FRONT_DATE_NOT_TODAY_SAFE_STOP")
    need(fresh.get("races_incomplete") == 0, "FRONT_RACES_INCOMPLETE_SAFE_STOP")
    need(int(fresh.get("races_scanned") or 0) > 0 and len(fresh.get("items", [])) > 0,
         "FRONT_RACES_OR_CANDIDATES_EMPTY")
    # Bridge is temporary only; no added folder in the research or publish tree.
    with tempfile.TemporaryDirectory(prefix="brc_rear_stage_") as temporary:
        bridge = Path(temporary) / "rear_join_publish_v1.py"
        bridge.write_bytes(rear_script)
        run_stage("REAR_CHECK", [str(bridge), "--check-only"], 300)
        run_stage("REAR_PUBLISH", [str(bridge), "--publish"], 300)
    final_front, same = check_public_date(day)
    need(same and final_front.get("date") == day, "THREE_DIRECTION_READBACK_FAILED")
    check_remote_layout()
    log("GITHUB_WRITE", "DAILY_INDEX_AND_3_DIRECTION_DATA_ONLY")
    log("STATUS", "THREE_DIRECTION_DAILY_PUBLISH_VERIFIED")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--preflight", action="store_true")
    group.add_argument("--run", action="store_true")
    args = parser.parse_args()
    try:
        orchestrate("preflight" if args.preflight else "run")
    except Exception as exc:
        log("STATUS", "SAFE_STOP")
        log("REASON", str(exc)[:160])
        sys.exit(2)
    finally:
        print("=== END ===", flush=True)
