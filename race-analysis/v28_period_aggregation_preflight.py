# -*- coding: utf-8 -*-
"""BRC V28: read-only crosscheck for all/2026/trailing-1y racer aggregates."""
import csv
import datetime as dt
import os
import sys
from collections import defaultdict
from pathlib import Path

PERIODS = {
    "ALL": ("2015-07-25", "2026-11-16"),
    "Y2026": ("2026-01-01", "2026-11-16"),
    "LAST1Y": ("2025-11-17", "2026-11-16"),
}
EXPECTED_BASE = {
    "ALL": 621138,
    "LAST1Y": 55940,
}
EXPECTED_LAST1Y_BOATS = 335062
MAX_RACES = 1000000
MAX_BOATS = 7000000


def emit(key, value):
    print("{}={}".format(key, value))


def discover(root):
    matches = {"races_k.csv": [], "boats_k.csv": []}
    if not root.is_dir():
        raise RuntimeError("SOURCE_DIRECTORY_MISSING")
    for parent, dirs, files in os.walk(root):
        dirs[:] = [x for x in dirs if x.lower() not in
                   (".git", "__pycache__", "node_modules")]
        for name in files:
            key = name.lower()
            if key in matches:
                matches[key].append(Path(parent) / name)
    for key, paths in matches.items():
        emit(key.upper() + "_COUNT", len(paths))
        if len(paths) != 1:
            raise RuntimeError("SOURCE_NOT_UNIQUE")
    return matches["races_k.csv"][0], matches["boats_k.csv"][0]


def normal_date(text):
    value = (text or "").strip().replace("-", "").replace("/", "")
    if len(value) != 8 or not value.isascii() or not value.isdigit():
        raise ValueError("INVALID_DATE")
    return dt.date(int(value[:4]), int(value[4:6]),
                   int(value[6:8])).isoformat()


def read_races(path):
    races = {}
    counts = {p: 0 for p in PERIODS}
    latest = ""
    earliest = "9999-12-31"
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        rows = csv.DictReader(file)
        if not {"rid", "date", "venue"}.issubset(rows.fieldnames or []):
            raise RuntimeError("RACES_HEADER_MISMATCH")
        for row in rows:
            rid = (row["rid"] or "").strip()
            if not rid or rid in races:
                raise RuntimeError("RACE_ID_MISSING_OR_DUPLICATE")
            date = normal_date(row["date"])
            v = int(row["venue"])
            if not 1 <= v <= 24:
                raise RuntimeError("VENUE_RANGE_INVALID")
            mask = 0
            for i, (_, (first, last)) in enumerate(PERIODS.items()):
                if first <= date <= last:
                    mask |= 1 << i
                    counts[list(PERIODS)[i]] += 1
            races[rid] = (v, mask)
            earliest = min(earliest, date)
            latest = max(latest, date)
            if len(races) > MAX_RACES:
                raise RuntimeError("RACE_LIMIT_EXCEEDED")
    emit("SOURCE_RACE_FIRST_DATE", earliest)
    emit("SOURCE_RACE_LAST_DATE", latest)
    emit("SOURCE_RACE_ROWS", len(races))
    if latest != "2026-11-16":
        raise RuntimeError("DATE_CUTOFF_CHANGED_REVIEW_REQUIRED")
    if any(counts[p] != n for p, n in EXPECTED_BASE.items()):
        raise RuntimeError("RACE_COUNT_CHANGED_REVIEW_REQUIRED")
    return races, counts


def aggregate(boats_path, races):
    # Each key contains a player, entered course and (for local stats) venue.
    national = {p: defaultdict(lambda: [0, 0, 0, 0]) for p in PERIODS}
    local = {p: defaultdict(lambda: [0, 0, 0, 0]) for p in PERIODS}
    totals = {p: 0 for p in PERIODS}
    matched = 0
    with boats_path.open("r", encoding="utf-8-sig", newline="") as file:
        rows = csv.DictReader(file)
        if not {"rid", "toban", "course", "chaku"}.issubset(rows.fieldnames or []):
            raise RuntimeError("BOATS_HEADER_MISMATCH")
        for row in rows:
            rid = (row["rid"] or "").strip()
            race = races.get(rid)
            if race is None:
                raise RuntimeError("UNMATCHED_RID")
            venue, mask = race
            pid = int(row["toban"])
            course = int(row["course"])
            rank = int(row["chaku"])
            if not (1 <= pid <= 99999 and 1 <= course <= 6 and 0 <= rank <= 6):
                raise RuntimeError("INVALID_ENTRY")
            matched += 1
            for i, period in enumerate(PERIODS):
                if mask & (1 << i):
                    n = national[period][(pid, course)]
                    l = local[period][(venue, pid, course)]
                    n[0] += 1
                    l[0] += 1
                    if rank in (1, 2, 3):
                        n[rank] += 1
                        l[rank] += 1
                    totals[period] += 1
            if matched > MAX_BOATS:
                raise RuntimeError("BOATS_LIMIT_EXCEEDED")
    if matched != 3720107:
        raise RuntimeError("TOTAL_ENTRIES_CHANGED_REVIEW_REQUIRED")
    if totals["LAST1Y"] != EXPECTED_LAST1Y_BOATS:
        raise RuntimeError("LAST1Y_ENTRIES_CHANGED_REVIEW_REQUIRED")
    return matched, national, local, totals


def main():
    print("=== BRC V28 PERIOD AGGREGATION PREFLIGHT V1 ===")
    for flag in ("FILE_WRITE", "GITHUB_WRITE", "DB_WRITE", "KV_WRITE",
                 "DEPLOY", "TASK_CHANGE", "NETWORK", "SECRET_OUTPUT",
                 "FULL_PATH_OUTPUT"):
        emit(flag, "NO")
    emit("READ_ONLY", "YES")
    race_file, boat_file = discover(
        Path.home() / "Downloads" / "BRCdatabase")
    races, race_counts = read_races(race_file)
    matched, national, local, totals = aggregate(boat_file, races)
    emit("BOAT_MATCHED_RID", matched)
    for period in PERIODS:
        pname = period + "_"
        emit(pname + "RACES", race_counts[period])
        emit(pname + "ENTRIES", totals[period])
        emit(pname + "PLAYERS", len({x[0] for x in national[period]}))
        emit(pname + "NATIONAL_COURSE_ROWS", len(national[period]))
        emit(pname + "VENUE_PLAYER_COURSE_ROWS", len(local[period]))
        n_total = sum(v[0] for v in national[period].values())
        l_total = sum(v[0] for v in local[period].values())
        valid = n_total == l_total == totals[period]
        emit(pname + "RECONCILE", "PASS" if valid else "FAIL")
        if not valid:
            raise RuntimeError("PERIOD_SUM_MISMATCH_" + period)
    if len({x[0] for x in national["LAST1Y"]}) != 1658:
        raise RuntimeError("LAST1Y_PLAYER_COUNT_CHANGED")
    if len(local["LAST1Y"]) != 135243:
        raise RuntimeError("LAST1Y_VENUE_PLAYER_COURSE_COUNT_CHANGED")
    emit("STATUS", "PERIOD_AGGREGATION_PASS")
    emit("NEXT", "V28_PERIOD_DATA_BUILD_SEPARATE")
    print("=== END ===")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        emit("STATUS", "SAFE_STOP_NO_CHANGE")
        emit("ERROR_TYPE", type(exc).__name__)
        emit("ERROR", str(exc)[:120].replace("\n", " "))
        print("=== END ===")
        sys.exit(2)
