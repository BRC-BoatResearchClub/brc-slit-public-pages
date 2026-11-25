# -*- coding: utf-8 -*-
"""BRC: build verified personal rear-candidate data for existing preview-v3.html.
Only remote file written: brc-slit-public-pages/rear-data.json.
Never execute the original research engine or modify BRC application files.
"""
from __future__ import annotations
import argparse, base64, csv, hashlib, json, re, shutil, subprocess, sys
from pathlib import Path
from datetime import datetime, timedelta, timezone
from urllib.request import urlopen
from urllib.parse import urlencode

OWNER, REPO = "BRC-BoatResearchClub", "brc-slit-public-pages"
FULL = OWNER + "/" + REPO
VENUES = "桐生 戸田 江戸川 平和島 多摩川 浜名湖 蒲郡 常滑 津 三国 びわこ 住之江 尼崎 鳴門 丸亀 児島 宮島 徳山 下関 若松 芦屋 福岡 唐津 大村".split()
STUDY = Path.home() / "Downloads" / "BRCdatabase" / "data_bunseki" / "展示スリット評価_再調査"
REAR = STUDY / "08_選手個人3方向統合" / "選手_後艇_再計算.csv"
COND = {"1": "①展示差≥0.10秒", "2": "②展示差＋ST順位差≥0.5"}
VN = ("venue", "venue_name", "venueName", "venue_code", "venueCode", "stadium", "jcd", "場名", "会場", "会場名", "場コード")
RN = ("race", "race_no", "raceNo", "race_number", "raceNumber", "rno", "レース番号", "レース")
IDN = ("reg", "regno", "reg_no", "regNo", "registration", "registration_no", "registrationNumber", "racer_id", "racerId", "player_id", "playerId", "toban", "登番", "登録番号")
LANE = ("boat_no", "boatNo", "boat_number", "boatNumber", "boat", "lane", "entry_no", "entryNo", "frame", "waku", "teiban", "枠番", "艇番", "course")
NAM = ("name", "player_name", "playerName", "racer_name", "racerName", "氏名", "選手名", "名前", "full_name")
NEST = ("player", "racer", "athlete", "racerInfo", "playerInfo", "選手")

def log(k, v): print(str(k) + "=" + str(v), flush=True)
def need(x, msg):
    if not x: raise RuntimeError(msg)
def field(obj, keys):
    if isinstance(obj, dict):
        for k in keys:
            if k in obj and obj[k] is not None and obj[k] != "": return obj[k]
    return None
def to_venue(value):
    if isinstance(value, dict):
        return next((v for k in ("name", "venue", "venue_name", "code", "id") if (v := to_venue(value.get(k))) is not None), None)
    s = str(value).strip()
    if s in VENUES: return s
    if s.isdigit() and 1 <= int(s) <= 24: return VENUES[int(s)-1]
    return None
def to_race(value):
    m = re.fullmatch(r"(?:R|RACE)?\s*0?(\d{1,2})\s*R?", str(value).strip(), re.I)
    if m and 1 <= int(m.group(1)) <= 12: return int(m.group(1))
    return None
def getreg(obj):
    raw = field(obj, IDN)
    if raw is None: raw = field(field(obj, NEST), IDN)
    if raw is None: return None
    s = str(raw).strip()
    return s if re.fullmatch(r"\d{3,5}", s) else None
def getname(obj):
    n = field(obj, NAM)
    if n is None:
        inner = field(obj, NEST)
        n = field(inner, NAM) if isinstance(inner, dict) else inner if isinstance(inner, str) else None
    return re.sub(r"[\s\u3000]+", "", str(n)) if isinstance(n, str) else ""
def getlane(obj):
    c = to_race(field(obj, LANE))
    return c if c is not None and c <= 6 else None
def six(value):
    if isinstance(value, list):
        if len(value) != 6 or not all(isinstance(p, dict) for p in value): return None
        pairs = list(enumerate(value, 1))
    elif isinstance(value, dict):
        if len(value) != 6: return None
        pairs = []
        for key, obj in value.items():
            c = to_race(key)
            if not c or c > 6 or not isinstance(obj, dict): return None
            pairs.append((c, obj))
    else: return None
    out = {}
    for lane, obj in pairs:
        reg, c = getreg(obj), getlane(obj) or lane
        if reg is None or c in out or c not in range(1,7): return None
        out[c] = (reg, getname(obj))
    if len(out) != 6 or len({p[0] for p in out.values()}) != 6: return None
    return out

def parse_rosters(root):
    found, flat, conflicts = {}, {}, set()
    def put(v, r, data):
        if not v or not r or not data: return
        key = (v, r)
        if key in found and any(found[key][i][0] != data[i][0] for i in range(1,7)):
            conflicts.add(key)
        else: found.setdefault(key, data)
    def walk(obj, venue=None, race=None, depth=0):
        if depth > 17: return
        if isinstance(obj, dict):
            v = to_venue(field(obj, VN)) or venue
            r = to_race(field(obj, RN)) or race
            if v and r:
                put(v, r, six(obj))
                reg, lane = getreg(obj), getlane(obj)
                if reg and lane:
                    key = (v,r)
                    parts = flat.setdefault(key, {})
                    if lane in parts and parts[lane][0] != reg: conflicts.add(key)
                    parts[lane] = (reg, getname(obj))
            for key, child in obj.items():
                vv, rr = v, r
                if vv is None and isinstance(child, (dict, list)): vv = to_venue(key)
                if vv and rr is None and isinstance(child, (dict, list)): rr = to_race(key)
                if vv and rr: put(vv, rr, six(child))
                walk(child, vv, rr, depth+1)
        elif isinstance(obj, list):
            if venue and race: put(venue, race, six(obj))
            for item in obj: walk(item, venue, race, depth+1)
    walk(root)
    for (v,r), parts in flat.items():
        if len(parts) == 6 and len({p[0] for p in parts.values()}) == 6: put(v,r,parts)
    return found, conflicts

def cmd(*args, input_text=None, can404=False):
    exe = shutil.which("gh")
    if not exe:
        pf = Path("C:/Program Files/GitHub CLI/gh.exe")
        exe = str(pf) if pf.is_file() else None
    need(exe, "GH_CLI_NOT_INSTALLED")
    p = subprocess.run([exe, *args], input=input_text, text=True, encoding="utf-8",
                       errors="replace", capture_output=True, timeout=120)
    if p.returncode:
        if can404 and ("404" in p.stderr or "Not Found" in p.stderr): return None
        raise RuntimeError("GH_COMMAND_FAILED_" + str(p.returncode))
    return p.stdout

def remote(path):
    x = cmd("api", "repos/" + FULL + "/contents/" + path + "?ref=main", can404=True)
    if x is None: return None
    doc = json.loads(x)
    need(doc.get("encoding") == "base64" and doc.get("type") == "file",
         "PUBLIC_FILE_RESPONSE_UNEXPECTED")
    return base64.b64decode(doc["content"]), doc["sha"]

def rear_research():
    need(REAR.is_file(), "REAR_RESEARCH_CSV_NOT_FOUND")
    raw = REAR.read_bytes()
    sha12 = hashlib.sha256(raw).hexdigest()[:12]
    need(sha12 == "5d49d771d54d", "REAR_RESEARCH_SHA_MISMATCH")
    result, nconds = {}, {"1":0,"2":0}
    with REAR.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        need(set(("登録番号", "役割", "対象進入コース", "条件", "1着通常%", "1着該当%", "1着増減pt", "条件該当N")).issubset(set(reader.fieldnames or [])),
             "REAR_RESEARCH_COLUMNS_CHANGED")
        for row in reader:
            need(row["役割"] == "後艇", "REAR_RESEARCH_ROLE_INVALID")
            cond = next((c for c, name in COND.items() if row["条件"] == name), None)
            if cond is None: continue
            trigger = int(row["対象進入コース"])
            need(2 <= trigger <= 5, "REAR_TRIGGER_INVALID")
            reg = row["登録番号"].strip()
            key = (reg, trigger, cond)
            need(key not in result, "REAR_RESEARCH_DUPLICATE")
            vals = [float(row[k]) for k in ("1着通常%", "1着該当%", "1着増減pt")]
            n = int(row["条件該当N"])
            need(n > 0 and abs(vals[1]-vals[0]-vals[2]) < 0.004, "REAR_RESEARCH_METRICS_INVALID")
            result[key] = (vals,n)
            nconds[cond] += 1
    need(len(result) >= 14000, "REAR_RESEARCH_ROWS_TOO_FEW")
    log("REAR_RESEARCH_SHA12", sha12)
    log("REAR_RESEARCH_KEYS", len(result))
    log("REAR_CONDITION_1_KEYS", nconds["1"])
    log("REAR_CONDITION_2_KEYS", nconds["2"])
    return result

def lineup(day):
    url = "http://127.0.0.1:61229/api/bprogram?" + urlencode({"date":day})
    try:
        with urlopen(url, timeout=35) as r:
            need(r.status == 200, "LOCAL_B_HTTP_ERROR")
            raw = r.read(25000000)
        data = json.loads(raw.decode("utf-8-sig"))
    except Exception as e:
        raise RuntimeError("LOCAL_B_PROGRAM_NOT_ACCESSIBLE_" + type(e).__name__)
    found, conflicts = parse_rosters(data)
    log("OFFICIAL_B_RACES_PARSED", len(found))
    log("OFFICIAL_B_ROSTER_CONFLICTS", len(conflicts))
    if not found:
        if isinstance(data,dict): log("B_API_TOP_KEYS", ",".join(str(k)[:40] for k in list(data)[:15]))
        raise RuntimeError("OFFICIAL_B_FORMAT_NOT_RECOGNIZED")
    need(not conflicts, "OFFICIAL_B_HAS_DUPLICATE_CONFLICTS")
    return found

def make_rear(d, rosters, historic):
    pairs, used_races = set(), set()
    for r in d["items"]:
        v, race, lane, peer = r["venue"], int(r["race"]), int(r["course"]), int(r["front_course"])
        b = rosters.get((v,race))
        need(b is not None, "OFFICIAL_B_MISSING_PUBLISHED_RACE")
        used_races.add((v,race))
        need(1 <= lane <= 6 and 1 <= peer <= 6, "PUBLISHED_COURSE_INVALID")
        need(b[lane][0] == str(r["reg"]) and b[peer][0] == str(r["front_reg"]),
             "PUBLISHED_REG_VS_OFFICIAL_B_MISMATCH")
        trigger = peer if r["side"] == "front" else lane
        need(2 <= trigger <= 6 and r["condition"] in COND, "PUBLISHED_TRIGGER_INVALID")
        pairs.add((v,race,trigger,r["condition"]))
    output, nohistory, endcourse = [], 0, 0
    for v,race,t,c in sorted(pairs):
        if t == 6:
            endcourse += 1
            continue
        reg,name = rosters[(v,race)][t+1]
        stats = historic.get((reg,t,c))
        if stats is None:
            nohistory += 1
            continue
        vals,n = stats
        if abs(vals[2]) < 15-1e-8: continue
        need(bool(name), "OFFICIAL_B_REAR_PLAYER_NAME_MISSING")
        output.append({"venue":v,"race":race,"trigger_course":t,"course":t+1,
                       "condition":c,"player":name,"reg":reg,"normal":vals[0],
                       "matched":vals[1],"delta":vals[2],"n":n})
    need(len(output) > 0, "NO_MATCHING_REAR_DELTA15")
    need(len(output) <= len(pairs), "REAR_DUPLICATE_ROWS")
    log("PUBLISHED_PLAYER_CROSSCHECK", len(d["items"]))
    log("PUBLISHED_RACES_CROSSCHECKED", len(used_races))
    log("TRIGGER_CONDITION_PAIRS", len(pairs))
    log("PAIRS_AT_COURSE_6", endcourse)
    log("REAR_NO_HISTORICAL_SAMPLE", nohistory)
    log("REAR_PUBLISHED_ROWS", len(output))
    log("REAR_DEFAULT_N10_ROWS", sum(x["n"] >= 10 for x in output))
    return {"version":1,"date":d["date"],"source":"BRC_PERSONAL_REAR_VERIFIED_V1",
            "condition2":"ST_NOT_VERIFIED_FOR_TODAY",
            "items":output}

def main():
    a = argparse.ArgumentParser()
    a.add_argument("--self-test",action="store_true")
    a.add_argument("--check-only",action="store_true")
    a.add_argument("--publish",action="store_true")
    opts=a.parse_args()
    log("VERSION", "BRC_PERSONAL_REAR_JOIN_V1")
    log("BRC_APP_WRITE","NO")
    log("HISTORY_INDEX_WRITE","NO")
    log("ORIGINAL_DATA_WRITE","NO")
    log("TASK_CHANGE","NO")
    if opts.self_test:
        mock={"venues":[{"venue":"多摩川","races":[{"race":2,"boats":[{"boat":i,"reg":str(4000+i),"name":"TEST"} for i in range(1,7)]}]}]}
        got,conflicts=parse_rosters(mock)
        need(not conflicts and got[("多摩川",2)][3][0]=="4003","SELF_TEST_FAILED")
        log("SELF_TEST","PASS")
        log("STATUS","SELF_TEST_PASS")
        return
    need(opts.check_only != opts.publish, "ACTION_REQUIRED")
    info=json.loads(cmd("repo","view",FULL,"--json","nameWithOwner,isPrivate,defaultBranchRef"))
    need(info.get("nameWithOwner","").lower()==FULL.lower()
         and info.get("isPrivate") is False
         and (info.get("defaultBranchRef") or {}).get("name")=="main",
         "GITHUB_REPO_NOT_VERIFIED")
    need(cmd("api","user","--jq",".login").strip().lower()==OWNER.lower(),"GITHUB_IDENTITY_MISMATCH")
    log("GITHUB_IDENTITY","VERIFIED")
    src=remote("data.json")
    need(src is not None,"PUBLIC_DAILY_JSON_NOT_FOUND")
    d=json.loads(src[0].decode("utf-8"))
    need(d.get("version")==1 and isinstance(d.get("items"),list)
         and d.get("races_incomplete")==0,"DAILY_JSON_INVALID")
    day=d["date"]
    today=datetime.now(timezone(timedelta(hours=9))).date().isoformat()
    log("DAILY_DATE",day)
    log("JST_TODAY",today)
    need(day==today,"DAILY_JSON_NOT_TODAY_SAFE_STOP")
    hist=rear_research()
    rosters=lineup(day)
    need(len(rosters)>=int(d["races_scanned"]),"B_RACES_INCOMPLETE")
    rear=make_rear(d,rosters,hist)
    encoded=json.dumps(rear,ensure_ascii=False,separators=(",",":")).encode("utf-8")
    log("REAR_JSON_BYTES",len(encoded))
    log("REAR_JSON_SHA12",hashlib.sha256(encoded).hexdigest()[:12])
    if opts.check_only:
        log("GITHUB_WRITE","NO")
        log("STATUS","REAR_PREFLIGHT_PASS")
        return
    need(opts.publish,"PUBLISH_ARGUMENT_REQUIRED")
    v3=remote("preview-v3.html")
    need(v3 is not None and b"rear-data.json" in v3[0]
         and b"validRear" in v3[0],"V3_IS_NOT_READY_FOR_REAR_DATA")
    previous=remote("rear-data.json")
    if previous:
        old=json.loads(previous[0].decode("utf-8"))
        need(old.get("version")==1 and old.get("source")==rear["source"],"EXISTING_REAR_DATA_UNKNOWN_SOURCE")
        need(old.get("date","") <= day,"NEWER_REAR_DATA_EXISTS")
        if previous[0]==encoded:
            log("STATUS","REAR_ALREADY_MATCHING")
            return
    body={"message":"Add verified rear-direction personal research for "+day,
          "branch":"main","content":base64.b64encode(encoded).decode("ascii")}
    if previous: body["sha"]=previous[1]
    exe=shutil.which("gh") or "C:/Program Files/GitHub CLI/gh.exe"
    proc=subprocess.run([exe,"api","-X","PUT",
        "repos/"+FULL+"/contents/rear-data.json","--input","-"],
        input=json.dumps(body),text=True,encoding="utf-8",capture_output=True,timeout=160)
    need(proc.returncode==0,"REAR_GITHUB_UPLOAD_FAILED")
    saved=remote("rear-data.json")
    need(saved is not None and saved[0]==encoded,"REAR_GITHUB_READBACK_MISMATCH")
    log("PUBLISHED_FILES","rear-data.json_ONLY")
    log("GITHUB_UPLOAD","VERIFIED")
    log("V3_URL","https://brc-boatresearchclub.github.io/"+REPO+"/preview-v3.html")
    log("STATUS","REAR_DATA_PUBLISHED")
if __name__=="__main__":
    try: main()
    except Exception as exc:
        log("STATUS","BLOCKED_SAFE")
        log("ERROR",str(exc)[:220])
        sys.exit(1)
    finally:
        log("BRC_APPLICATION_CHANGED","NO")
        log("INDEX_HISTORY_CHANGED","NO")
        log("=== END ===")
