#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SkyHeight 数据自动同步脚本
─────────────────────────
功能：从上游拉取全量身高数据 → 合并已有数据 → 生成 data.js
用法：python3 sync.py
配置：通过环境变量 SKY_KAMI 指定卡密（默认用内置值）
"""
import json
import os
import re
import sys
import time
import urllib.request
import urllib.parse
from datetime import datetime

# ── 配置 ──
KAMI       = os.environ.get("SKY_KAMI", "sjmyP3CODLBFLV")
API        = "https://skycsg.asia/height/history"
DATA_DIR   = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
MASTER     = os.path.join(DATA_DIR, "master.json")
OUT_JS     = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data.js")
TIMEOUT    = 90
UA         = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"


def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


def fetch_history():
    """从上游拉取全量历史记录"""
    body = urllib.parse.urlencode({"kami": KAMI}).encode()
    req = urllib.request.Request(
        API, data=body,
        headers={
            "content-type": "application/x-www-form-urlencoded",
            "user-agent": UA,
            "referer": "https://skycsg.asia/",
        },
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        raw = r.read().decode("utf-8", "replace")
    d = json.loads(raw)
    if d.get("code") != 1:
        raise RuntimeError(f"上游返回错误: {d}")
    lst = json.loads(d["msg"]) if isinstance(d["msg"], str) else d["msg"]
    return lst


def load_master():
    """读取本地主库"""
    if os.path.exists(MASTER):
        try:
            with open(MASTER, encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            log(f"主库读取失败，将重建: {e}")
    return {}


def merge(master, records):
    """把新记录合并进主库（按时间取最新）"""
    added = updated = 0
    for r in records:
        u = (r.get("uuid") or "").strip().lower()
        if not re.match(r"^[0-9a-f]{8}-[0-9a-f]{4}-", u):
            continue
        ts = r.get("timestamp") or ""
        old = master.get(u)
        if old is None:
            master[u] = r
            added += 1
        elif ts > (old.get("timestamp") or ""):
            master[u] = r
            updated += 1
    return added, updated


def fnum(v):
    try:
        return round(float(v), 2)
    except Exception:
        return None


def export_js(master):
    """导出为 data.js（列式压缩，体积最小）"""
    players = []
    for u, r in master.items():
        players.append({
            "id": u,
            "h":  fnum(r.get("height")),
            "ch": fnum(r.get("current_height")),
            "mx": fnum(r.get("max_height")),
            "mn": fnum(r.get("min_height")),
            "s":  fnum(r.get("scale")),
            "ic": r.get("inviteCode") or "",
            "t":  r.get("timestamp") or "",
        })
    # 按身高降序（好看）
    players.sort(key=lambda x: (-(x["h"] if x["h"] is not None else -999)))

    cols = {k: [p[k] for p in players] for k in ("id", "h", "ch", "mx", "mn", "s", "ic", "t")}
    parts = []
    for k, v in cols.items():
        parts.append(k + ":" + json.dumps(v, ensure_ascii=False, separators=(",", ":")))
    js = "window.SKY_DATA={\n" + ",\n".join(parts) + "\n};\n"
    with open(OUT_JS, "w", encoding="utf-8") as f:
        f.write(js)
    return len(players)


def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    log("开始同步…")

    try:
        records = fetch_history()
        log(f"上游返回 {len(records):,} 条记录")
    except Exception as e:
        log(f"✗ 拉取失败: {e}")
        # 拉取失败时不清空已有数据，保证网站仍可用
        if os.path.exists(OUT_JS):
            log("保留现有 data.js，本次同步跳过")
            return 0
        return 1

    master = load_master()
    before = len(master)
    added, updated = merge(master, records)
    log(f"合并: 新增 {added:,} 人, 更新 {updated:,} 人 (总计 {len(master):,})")

    with open(MASTER, "w", encoding="utf-8") as f:
        json.dump(master, f, ensure_ascii=False, separators=(",", ":"))

    n = export_js(master)
    size = os.path.getsize(OUT_JS)
    log(f"✓ 已生成 data.js: {n:,} 位玩家, {size/1024/1024:.2f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
