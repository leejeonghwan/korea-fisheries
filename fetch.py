#!/usr/bin/env python3
"""KOSIS 어업생산동향조사 수집기. 받은 건 data/ 에 날것으로 쌓아두고 다시 받지 않는다."""
import json, os, sys, time, urllib.parse, urllib.request

K = os.environ.get("KOSIS_API_KEY", "")
RAW = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
os.makedirs(RAW, exist_ok=True)


def api(params, tag, tries=5):
    """받아둔 게 있으면 그걸 쓴다. 없으면 받아서 저장한다."""
    p = os.path.join(RAW, tag + ".json")
    if os.path.exists(p):
        try:
            return json.load(open(p, encoding="utf-8"))
        except Exception:
            pass
    q = dict(params, apiKey=K, format="json", jsonVD="Y")
    u = ("https://kosis.kr/openapi/Param/statisticsParameterData.do?"
         + "&".join(f"{k}={urllib.parse.quote(str(v), safe='+')}" for k, v in q.items()))
    last = None
    for t in range(tries):
        try:
            with urllib.request.urlopen(u, timeout=90) as r:
                d = json.loads(r.read().decode("utf-8"))
            if not isinstance(d, list):
                if str(d.get("err")) == "30":          # 데이터 없음 — 빈 결과로 저장
                    d = []
                else:
                    raise RuntimeError(str(d)[:120])
            json.dump(d, open(p, "w", encoding="utf-8"), ensure_ascii=False)
            print(f"  · {tag}: {len(d)}행", flush=True)
            return d
        except Exception as e:
            last = e
            time.sleep(2 * (t + 1))
    print(f"  ✗ {tag}: {str(last)[:70]}", flush=True)
    return None


def main():
    if not K:
        print("KOSIS_API_KEY 가 없습니다.")
        return 1
    base = {"method": "getList", "orgId": "101", "prdSe": "Y",
            "startPrdDe": "1960", "endPrdDe": "2026"}

    # 1) 총괄표 — 어업별 × 연도, 전국. 긴 시계열의 뼈대.
    api(dict(base, tblId="DT_1EW0001", itmId="T01+T05+",
             objL1="0+1+2+3+4+5+", objL2="00+", objL3="0+"), "01_총괄_어업별")

    # 2) 총괄표 — 어업별 × 지역 × 연도
    api(dict(base, tblId="DT_1EW0001", itmId="T01+T05+",
             objL1="0+1+2+3+4+", objL2="10+11+21+22+23+24+25+26+27+31+32+33+34+35+36+37+38+39+",
             objL3="0+"), "02_총괄_지역별")
    return 0


if __name__ == "__main__":
    sys.exit(main())


def species():
    """품종별 × 연도. 품종 코드가 427개라 묶어서 받는다."""
    mp = os.path.join(RAW, "품종메타.json")
    if os.path.exists(mp):
        mi = json.load(open(mp, encoding="utf-8"))
    else:
        u = ("https://kosis.kr/openapi/statisticsData.do?method=getMeta"
             f"&apiKey={urllib.parse.quote(K)}&format=json&jsonVD=Y"
             "&orgId=101&tblId=DT_1EW0004&type=ITM")
        mi = None
        for t in range(6):                     # KOSIS 가 연결을 자주 끊는다
            try:
                with urllib.request.urlopen(u, timeout=90) as r:
                    mi = json.loads(r.read().decode())
                break
            except Exception as e:
                print(f"  메타 재시도 {t+1}: {str(e)[:50]}", flush=True)
                time.sleep(3 * (t + 1))
        if mi is None:
            raise RuntimeError("품종 메타를 받지 못했습니다")
        json.dump(mi, open(mp, "w", encoding="utf-8"), ensure_ascii=False)
    codes = [r["ITM_ID"] for r in mi if r.get("OBJ_ID") == "E"]
    json.dump([{"code": r["ITM_ID"], "name": r.get("ITM_NM")}
               for r in mi if r.get("OBJ_ID") == "E"],
              open(os.path.join(RAW, "품종코드.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print(f"품종 코드 {len(codes)}개")
    base = {"method": "getList", "orgId": "101", "tblId": "DT_1EW0004", "prdSe": "Y",
            "startPrdDe": "1960", "endPrdDe": "2026", "itmId": "T01+T05+",
            "objL1": "0+1+2+3+4+", "objL3": "00+", "objL4": "0+"}
    N = 30
    for i in range(0, len(codes), N):
        chunk = codes[i:i + N]
        api(dict(base, objL2="+".join(chunk) + "+"), f"10_품종_{i//N:02d}")


def regional():
    """고른 품종 × 지역 × 연도. 지역 분석(바지락·동해안 어종)에 쓴다."""
    codes = json.load(open(os.path.join(RAW, "_지역용품종.json"), encoding="utf-8"))
    AREAS = ("11+12+21+22+23+24+25+26+27+31+32+33+34+35+36+37+38+39+")
    base = {"method": "getList", "orgId": "101", "tblId": "DT_1EW0004", "prdSe": "Y",
            "startPrdDe": "1960", "endPrdDe": "2026", "itmId": "T01+T05+",
            "objL1": "1+2+4+", "objL3": AREAS, "objL4": "0+"}
    N = 3
    for i in range(0, len(codes), N):
        api(dict(base, objL2="+".join(codes[i:i + N]) + "+"), f"20_지역품종_{i//N:02d}")
