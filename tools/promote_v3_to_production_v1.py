# -*- coding: utf-8 -*-
"""Promote reviewed BRC V3 to production after checking the PC publisher.
Only writes the local public index.html and public GitHub index.html.
"""
import argparse, base64, hashlib, json, os, shutil, subprocess, sys
from pathlib import Path

REPO = "BRC-BoatResearchClub/brc-slit-public-pages"
EXPECTED_V3_SHA = "d17bc0c8eadc28ae9fae8da633c12855160355b7"
PUBLIC = Path.home() / "Downloads" / "BRCdatabase" / "data_bunseki" / "展示スリット評価_再調査" / "07_個人GitHubPages公開"
INDEX = PUBLIC / "index.html"
PUBLISH = PUBLIC / "publish.py"
BACKUP = PUBLIC / "index.html.before_v3.bak"

def status(k, v):
    print(str(k) + "=" + str(v), flush=True)

def stop_unless(ok, error):
    if not ok:
        raise RuntimeError(error)

def gh(*args, input_text=None):
    exe = shutil.which("gh")
    if exe is None:
        fallback = Path("C:/Program Files/GitHub CLI/gh.exe")
        exe = str(fallback) if fallback.is_file() else None
    stop_unless(exe is not None, "GITHUB_CLI_NOT_FOUND")
    p = subprocess.run([exe, *args], input=input_text, capture_output=True,
                       text=True, encoding="utf-8", errors="replace", timeout=180)
    if p.returncode:
        raise RuntimeError("GITHUB_COMMAND_FAILED_" + str(p.returncode))
    return p.stdout

def github_file(path):
    response = json.loads(gh("api", "repos/" + REPO + "/contents/" + path + "?ref=main"))
    stop_unless(response.get("type") == "file" and response.get("encoding") == "base64",
                "GITHUB_FILE_FORMAT_UNEXPECTED")
    data = base64.b64decode(response["content"])
    return data, response["sha"]

def git_blob(data):
    payload = b"blob " + str(len(data)).encode("ascii") + b"\0" + data
    return hashlib.sha1(payload).hexdigest()

def change_once(text, before, after, code):
    count = text.count(before)
    stop_unless(count == 1, "V3_TEMPLATE_MARKER_UNEXPECTED_" + code)
    return text.replace(before, after, 1)

def make_production(v3):
    stop_unless(v3.count("<script>") == 1 and v3.count("</script>") == 1,
                "V3_SCRIPT_STRUCTURE_INVALID")
    head, mark, tail = v3.partition("<script>")
    replacements = (
        ('検証用プレビュー', '公開版', 'DESC'),
        ('<title>BRC｜展示スリット・レース詳細プレビュー V3</title>',
         '<title>BRC展示スリット｜当日の3方向レース分析</title>', 'TITLE'),
        ('BRC / PERSONAL RESEARCH · PREVIEW V3',
         'BRC / PERSONAL RESEARCH · 公開版', 'HEADER'),
        ('3方向を1レース内で比較する検証画面です。',
         '3方向を1レース内で比較する公開画面です。', 'INTRO'),
        ('<nav aria-label="ページ切り替え">',
         '<nav id="brc-pages-analysis-nav-v1" aria-label="ページ切り替え">', 'NAV'),
        ('<a class="active" href="./preview-v3.html">レース詳細 V3</a>',
         '<a class="active" href="./index.html">当日3方向分析</a>', 'HOME'),
        ('<a href="./index.html">従来の当日一覧</a>',
         '<a href="./preview-v3.html">検証版V3</a>', 'OTHER'),
        ('後艇については日次データへの接続が完了するまで数値を表示しません。',
         '後艇は当日データと日付が一致する検証済みデータがある場合だけ表示します。', 'REAR_NOTICE'),
        ('<b>検証用：</b>このページは別URLの試作版です。既存の当日一覧・過去分析・PC内ファイルは変更していません。',
         '<b>公開版：</b>当日の過去実績候補を示します。過去分析は別ページに保存しています。', 'FOOTER'),
    )
    for before, after, code in replacements:
        head = change_once(head, before, after, code)
    changed = head + mark + tail
    stop_unless(changed.partition("<script>")[2] == tail, "JS_CHANGED_UNEXPECTEDLY")
    stop_unless("brc-pages-analysis-nav-v1" in changed and './history.html' in changed
                and "rear-data.json" in changed and "d.date===x.date" in changed,
                "PRODUCTION_SAFETY_LINK_MISSING")
    return changed.encode("utf-8")

def check():
    stop_unless(INDEX.is_file() and PUBLISH.is_file(), "LOCAL_PUBLISHER_OR_INDEX_NOT_FOUND")
    script = PUBLISH.read_text(encoding="utf-8-sig")
    stop_unless("put_file('index.html'" in script and "put_file('data.json'" in script,
                "PUBLISHER_UPLOAD_CONTRACT_NOT_VERIFIED")
    stop_unless("put_file('history.html'" not in script, "HISTORY_UPLOAD_UNEXPECTED")
    # Local index is the source of the existing daily publisher.
    status("PC_PUBLISHER", "VERIFIED")
    account = gh("api", "user", "--jq", ".login").strip()
    stop_unless(account.lower() == "brc-boatresearchclub", "GITHUB_ACCOUNT_UNEXPECTED")
    status("GITHUB_ACCOUNT", "VERIFIED")
    v3, sha = github_file("preview-v3.html")
    stop_unless(sha == EXPECTED_V3_SHA, "V3_SOURCE_CHANGED_STOP")
    production = make_production(v3.decode("utf-8-sig"))
    current_remote, remote_sha = github_file("index.html")
    local = INDEX.read_bytes()
    stop_unless(git_blob(current_remote) == remote_sha, "REMOTE_HASH_INVALID")
    stop_unless(git_blob(local) == remote_sha, "PC_GITHUB_INDEX_MISMATCH_SAFE_STOP")
    # V3 reads rear-data.json only if its date matches the daily data.
    daily, _ = github_file("data.json")
    rear, _ = github_file("rear-data.json")
    daily = json.loads(daily)
    rear = json.loads(rear)
    stop_unless(daily.get("date") == rear.get("date") and
                daily.get("races_incomplete") == 0 and
                isinstance(rear.get("items"), list) and len(rear["items"]) > 0,
                "REAR_DATE_OR_DATA_UNVERIFIED")
    status("DAILY_DATE", daily["date"])
    status("REAR_RECORDS", len(rear["items"]))
    status("LOCAL_REMOTE_INDEX", "MATCHED")
    status("V3_SOURCE", "VERIFIED")
    status("NEW_INDEX_SHA12", hashlib.sha256(production).hexdigest()[:12])
    return production, local, remote_sha

def apply(production, old_local, old_sha):
    new_sha = git_blob(production)
    if new_sha == old_sha:
        status("PUBLIC_INDEX", "ALREADY_MATCHING")
        status("STATUS", "V3_PRODUCTION_READY")
        return
    if BACKUP.is_file():
        stop_unless(BACKUP.read_bytes() == old_local, "BACKUP_ALREADY_EXISTS_DIFFERENT")
    else:
        with BACKUP.open("xb") as f:
            f.write(old_local)
    tmp = INDEX.with_name("index.html.brc_v3_tmp")
    stop_unless(not tmp.exists(), "TEMP_FILE_ALREADY_EXISTS")
    remote_published = False
    try:
        with tmp.open("xb") as f:
            f.write(production)
        os.replace(str(tmp), str(INDEX))
        stop_unless(INDEX.read_bytes() == production, "LOCAL_INDEX_READBACK_FAILED")
        payload = {
            "message": "Promote V3 race comparison to production while preserving daily publishing",
            "content": base64.b64encode(production).decode("ascii"),
            "sha": old_sha,
            "branch": "main"
        }
        response = gh("api", "-X", "PUT",
                      "repos/" + REPO + "/contents/index.html", "--input", "-",
                      input_text=json.dumps(payload, ensure_ascii=False))
        saved = json.loads(response)
        stop_unless(saved.get("content", {}).get("sha") == new_sha,
                    "GITHUB_UPLOAD_CONTENT_SHA_UNCONFIRMED")
        remote_published = True
        published, fetched_sha = github_file("index.html")
        stop_unless(published == production and fetched_sha == new_sha,
                    "GITHUB_INDEX_READBACK_FAILED")
        status("PC_INDEX", "UPDATED")
        status("PUBLIC_INDEX", "UPDATED_AND_VERIFIED")
        status("STATUS", "V3_PRODUCTION_READY")
    except Exception:
        # Roll back only when the remote still contains the original index.
        try:
            remote_now, remote_now_sha = github_file("index.html")
        except Exception:
            remote_now_sha = ""
        if remote_now_sha == old_sha and INDEX.exists():
            INDEX.write_bytes(old_local)
            status("PC_INDEX", "ROLLED_BACK")
        else:
            status("PC_INDEX", "KEPT_FOR_MANUAL_VERIFICATION")
        raise
    finally:
        if tmp.exists():
            tmp.unlink()

def main():
    ap = argparse.ArgumentParser()
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check-only", action="store_true")
    mode.add_argument("--apply", action="store_true")
    a = ap.parse_args()
    status("VERSION", "BRC_V3_PRODUCTION_PROMOTION_V1")
    status("BRC_APP_WRITE", "NO")
    status("HISTORY_WRITE", "NO")
    status("DATA_JSON_WRITE", "NO")
    status("REAR_DATA_WRITE", "NO")
    status("TASK_CHANGE", "NO")
    prod, old, sha = check()
    if a.check_only:
        status("FILE_WRITE", "NO")
        status("GITHUB_WRITE", "NO")
        status("STATUS", "V3_PRODUCTION_PREFLIGHT_PASS")
    elif a.apply:
        apply(prod, old, sha)
    status("=== END ===", "")
if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        status("STATUS", "BLOCKED_SAFE")
        status("ERROR", str(exc)[:180])
        sys.exit(1)
