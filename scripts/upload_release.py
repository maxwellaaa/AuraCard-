#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json, subprocess, urllib.error, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIR = Path(r"E:\cursor-agent\deliverables\AuraCard-desktop-2026-08-08")
TAG = "v1.0.0-2026-08-08"
BODY = (ROOT / "docs" / "RELEASE-BODY-2026-08-08.md").read_text(encoding="utf-8")
API = "https://api.github.com/repos/maxwellaaa/AuraCard-"

def git_token():
    p = subprocess.run(
        ["git", "credential", "fill"],
        input="protocol=https\nhost=github.com\n\n",
        text=True,
        capture_output=True,
        cwd=str(ROOT),
        timeout=30,
    )
    for line in (p.stdout or "").splitlines():
        if line.startswith("password="):
            return line.split("=", 1)[1]
    raise SystemExit("NO_CREDENTIALS")

token = git_token()
headers = {
    "Authorization": f"Bearer {token}",
    "Accept": "application/vnd.github+json",
    "User-Agent": "AuraCard-agent",
    "X-GitHub-Api-Version": "2022-11-28",
}

def call(method, url, payload=None, raw=None):
    h = dict(headers)
    body = None
    if raw is not None:
        body = raw
        h["Content-Type"] = "application/octet-stream"
    elif payload is not None:
        body = json.dumps(payload).encode("utf-8")
        h["Content-Type"] = "application/json; charset=utf-8"
    req = urllib.request.Request(url, data=body, headers=h, method=method)
    with urllib.request.urlopen(req, timeout=600) as resp:
        b = resp.read()
        return json.loads(b.decode("utf-8")) if b else {}

info = call("GET", API)
print("repo", info.get("full_name"), info.get("html_url"))

rel = None
try:
    rel = call("GET", f"{API}/releases/tags/{TAG}")
    print("existing", rel.get("html_url"))
except urllib.error.HTTPError as e:
    if e.code != 404:
        raise
    print("no release yet")

payload = {
    "tag_name": TAG,
    "target_commitish": "master",
    "name": "AuraCard v1.0.0 (2026-08-08)",
    "body": BODY,
    "draft": False,
    "prerelease": False,
}
if rel:
    rel = call("PATCH", f"{API}/releases/{rel['id']}", payload)
    print("RELEASE_UPDATED", rel.get("html_url"))
else:
    rel = call("POST", f"{API}/releases", payload)
    print("RELEASE_CREATED", rel.get("html_url"))

upload = rel["upload_url"].split("{", 1)[0]
assets = {a["name"]: a for a in rel.get("assets") or []}
for f in sorted(DIR.glob("*.exe")):
    if f.name in assets:
        call("DELETE", f"{API}/releases/assets/{assets[f.name]['id']}")
        print("DELETED", f.name)
    url = upload + "?name=" + urllib.parse.quote(f.name)
    print("UPLOADING", f.name, f.stat().st_size)
    asset = call("POST", url, raw=f.read_bytes())
    print("ASSET", asset.get("browser_download_url"))
print("DONE", rel.get("html_url"))
