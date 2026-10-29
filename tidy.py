#!/usr/bin/env python3
"""받아둔 날것을 정돈된 CSV로 바꾼다. data/ → csv/"""
import json, os, glob, csv, collections

ROOT = os.path.dirname(os.path.abspath(__file__))
RAW, OUT = os.path.join(ROOT, "data"), os.path.join(ROOT, "csv")
os.makedirs(OUT, exist_ok=True)

ITEM = {"생산량:계": "생산량_톤", "생산금액:계": "생산금액_천원"}


def rows(pattern):
    for p in sorted(glob.glob(os.path.join(RAW, pattern))):
        for r in json.load(open(p, encoding="utf-8")):
            try:
                v = float(r["DT"])
            except (TypeError, ValueError, KeyError):
                continue
            yield r, v


def write(path, header, data):
    with open(os.path.join(OUT, path), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(data)
    print(f"  → csv/{path}  {len(data):,}행")


def main():
    # 1) 어업별 연도별 (전국)
    t = collections.defaultdict(dict)
    for r, v in rows("01_총괄_어업별.json"):
        k = ITEM.get(r["ITM_NM"])
        if k:
            t[(r["PRD_DE"], r["C1_NM"])][k] = v
    write("01_어업별_연도별.csv", ["연도", "어업별", "생산량_톤", "생산금액_천원"],
          [[y, c, d.get("생산량_톤", ""), d.get("생산금액_천원", "")]
           for (y, c), d in sorted(t.items())])

    # 2) 어업별 지역별 연도별
    t = collections.defaultdict(dict)
    for r, v in rows("02_총괄_지역별.json"):
        k = ITEM.get(r["ITM_NM"])
        if k:
            t[(r["PRD_DE"], r["C1_NM"], r["C2_NM"])][k] = v
    write("02_어업별_지역별.csv", ["연도", "어업별", "지역", "생산량_톤", "생산금액_천원"],
          [[y, c, a, d.get("생산량_톤", ""), d.get("생산금액_천원", "")]
           for (y, c, a), d in sorted(t.items())])

    # 3) 품종별 어업별 연도별 (전국) — 분류 소계(어류·갑각류 등)와 개별 품종이 섞여 있어
    #    코드 길이로 구분한다. 6자리가 개별 품종, 그보다 짧으면 묶음이다.
    t = collections.defaultdict(dict)
    for r, v in rows("10_품종_*.json"):
        k = ITEM.get(r["ITM_NM"])
        if not k:
            continue
        t[(r["PRD_DE"], r["C1_NM"], r["C2"], r["C2_NM"])][k] = v
    data = [[y, c, code, nm, "품종" if len(code) >= 6 else "묶음",
             d.get("생산량_톤", ""), d.get("생산금액_천원", "")]
            for (y, c, code, nm), d in sorted(t.items())]
    write("03_품종별_어업별.csv",
          ["연도", "어업별", "품종코드", "품종", "구분", "생산량_톤", "생산금액_천원"], data)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


def regional():
    t = collections.defaultdict(dict)
    for r, v in rows("20_지역품종_*.json"):
        k = ITEM.get(r["ITM_NM"])
        if k:
            t[(r["PRD_DE"], r["C1_NM"], r["C2_NM"], r["C3_NM"])][k] = v
    write("04_품종별_지역별.csv",
          ["연도", "어업별", "품종", "지역", "생산량_톤", "생산금액_천원"],
          [[y, c, sp, a, d.get("생산량_톤", ""), d.get("생산금액_천원", "")]
           for (y, c, sp, a), d in sorted(t.items())])
