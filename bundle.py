#!/usr/bin/env python3
"""탐색기용 묶음 자료를 만든다.

주의할 점 하나. 품종 코드(E축)는 어업별 트리다 — 첫 자리가 1이면 연근해,
2는 해면양식, 3은 원양, 4는 내수면이다. 그래서 '명태'처럼 이름이 같아도
연근해(110072)와 원양(310290)이 서로 다른 코드로 들어 있고, 각 코드의
'계'는 그 코드 자신의 합계일 뿐 어업을 가로지른 합이 아니다.
이름으로만 묶으면 나중에 처리한 코드가 앞의 것을 덮어써서 숫자가 틀린다.
(명태 2025년이 연근해 0톤인데 원양 29,199톤에 덮여 29,199톤으로 보였다.)

그래서 여기서는 코드 첫 자리로 어업을 정하고, '계'는 그 이름에 속한
코드들을 더해서 만든다.
"""
import csv, json, collections, os

ROOT = os.path.dirname(os.path.abspath(__file__))
YRS = [str(y) for y in range(1970, 2026)]
YI = {y: i for i, y in enumerate(YRS)}
PREFIX = {"1": "연근해어업", "2": "해면양식업", "3": "원양어업", "4": "내수면어업"}


def arr():
    return [None] * len(YRS)


def add(a, i, v):
    """소수점은 3자리까지 남긴다. 1자리로 자르면 명태 연근해 2024년(0.023톤 = 23kg)
    처럼 '거의 0이지만 0은 아닌' 값이 0으로 뭉개진다."""
    x = (a[i] or 0) + v
    a[i] = round(x, 3) if abs(x) < 1000 else round(x, 1)


def main():
    F, FM = collections.defaultdict(arr), collections.defaultdict(arr)
    for r in csv.DictReader(open(os.path.join(ROOT, "csv/01_어업별_연도별.csv"), encoding="utf-8-sig")):
        i = YI.get(r["연도"])
        if i is None:
            continue
        if r["생산량_톤"]:
            F[r["어업별"]][i] = round(float(r["생산량_톤"]), 1)
        if r["생산금액_천원"]:
            FM[r["어업별"]][i] = round(float(r["생산금액_천원"]) / 1e6, 2)   # 천원 → 십억 원

    # 품종 — 코드 첫 자리로 어업을 정하고, 같은 이름은 '계'로 합친다
    SP = collections.defaultdict(lambda: collections.defaultdict(arr))
    for r in csv.DictReader(open(os.path.join(ROOT, "csv/03_품종별_어업별.csv"), encoding="utf-8-sig")):
        if r["구분"] != "품종" or not r["생산량_톤"]:
            continue
        i = YI.get(r["연도"])
        if i is None:
            continue
        fish = PREFIX.get(r["품종코드"][0])
        if not fish or r["어업별"] != fish:      # 코드 자신의 어업 행만 쓴다
            continue
        v = float(r["생산량_톤"])
        add(SP[r["품종"]][fish], i, v)
        add(SP[r["품종"]]["계"], i, v)

    keep = {}
    for sp, d in SP.items():
        t = d["계"]
        recent = sum(1 for i in range(len(YRS) - 15, len(YRS)) if t[i])
        if recent >= 5 or sum(1 for v in t if v) >= 20:
            keep[sp] = dict(d)
    print(f"품종 {len(SP)} → 남긴 것 {len(keep)}")

    # 지역 — 같은 이름의 여러 코드를 지역별로 합친다
    RG = collections.defaultdict(lambda: collections.defaultdict(arr))
    for r in csv.DictReader(open(os.path.join(ROOT, "csv/04_품종별_지역별.csv"), encoding="utf-8-sig")):
        i = YI.get(r["연도"])
        if i is None or not r["생산량_톤"]:
            continue
        add(RG[r["품종"]][r["지역"]], i, float(r["생산량_톤"]))

    out = {"years": YRS, "fishery": dict(F), "fisheryValue": dict(FM),
           "species": keep, "regional": {k: dict(v) for k, v in RG.items()}}
    p = os.path.join(ROOT, "data.js")
    open(p, "w", encoding="utf-8").write(
        "window.FISH=" + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";")
    print(f"→ data.js  {os.path.getsize(p)/1e6:.3f} MB")

    # 검산 — 명태가 제대로 갈라졌는지
    m = keep.get("명태", {})
    print("\n검산 · 명태 (톤)")
    for k in ("계", "연근해어업", "원양어업"):
        s = m.get(k)
        if s:
            print(f"  {k:8s} 1974:{s[YI['1974']] or 0:>9,.0f}  1990:{s[YI['1990']] or 0:>9,.0f}"
                  f"  2025:{s[YI['2025']] or 0:>9,.0f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
