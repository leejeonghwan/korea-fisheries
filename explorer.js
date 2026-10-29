/* 한국 수산업 56년 — 탐색기
   자료는 data.js 가 window.FISH 로 실어 준다. */
(function () {
  'use strict';
  const D = window.FISH;
  const YRS = D.years;
  let ready = false;                 // 아래 선언들이 다 끝나기 전에는 그리지 않는다

  /* ── 테마 ───────────────────────────────────────────── */
  const btn = document.getElementById('themeBtn');
  // 어두운 쪽이 기본이다. 밝게 바꾼 적이 있으면 그것만 기억한다.
  let light = false;
  try { light = localStorage.getItem('fishTheme') === 'light'; } catch (e) {}
  apply();

  function apply() {
    document.documentElement.setAttribute('data-theme', light ? 'light' : 'dark');
    btn.textContent = light ? '어둡게' : '밝게';
    if (ready) redrawAll();
  }
  btn.addEventListener('click', () => {
    light = !light;
    try { localStorage.setItem('fishTheme', light ? 'light' : 'dark'); } catch (e) {}
    apply();
  });

  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const SER = () => [css('--s1'), css('--s2'), css('--s3'), css('--s4'), css('--s5')];

  /* ── 숫자 표기 ──────────────────────────────────────── */
  const nf = (v, d) => v == null ? '—'
    : v.toLocaleString('ko-KR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });

  /* ── 요약 숫자 ──────────────────────────────────────── */
  const F = D.fishery, FV = D.fisheryValue;
  const last = YRS.length - 1, prev = last - 1;
  const tot = F['계'], ton = v => v / 1e4;                       // 톤 → 만 톤
  const jo = v => v / 1e3;                                        // 십억 원 → 조 원
  const pct = (a, b) => (a / b - 1) * 100;
  const arrow = p => (p >= 0 ? '<span class="up">▲ ' : '<span class="dn">▼ ')
    + nf(Math.abs(p), 1) + '%</span>';
  // 명태는 연근해(우리 바다)와 원양을 반드시 갈라서 봐야 한다.
  // 우리 바다에서는 2008년부터 0톤이고, 지금 먹는 명태는 원양에서 잡아온 것이다.
  const mtNear = (D.species['명태'] || {})['연근해어업'] || [];
  const mtFar = (D.species['명태'] || {})['원양어업'] || [];

  document.getElementById('stats').innerHTML = [
    ['<div class="n">' + nf(ton(tot[last]), 0) + '<span style="font-size:.55em;font-weight:500"> 만 톤</span></div>',
     '2025년 총생산량 — 역대 최대',
     '전년 대비 ' + arrow(pct(tot[last], tot[prev]))],
    ['<div class="n">' + nf(jo(FV['계'][last]), 2) + '<span style="font-size:.55em;font-weight:500"> 조 원</span></div>',
     '2025년 생산금액 — 역대 최대',
     '전년 대비 ' + arrow(pct(FV['계'][last], FV['계'][prev]))],
    ['<div class="n">' + nf(ton(F['연근해어업'][last]), 0) + '<span style="font-size:.55em;font-weight:500"> 만 톤</span></div>',
     '연근해어업 — 반등했지만',
     '1986년 정점의 ' + nf(F['연근해어업'][last] / Math.max.apply(null, F['연근해어업'].filter(Boolean)) * 100, 0) + '%'],
    (() => {
      // 우리 바다 명태는 2025년 집계가 아예 없다. 값이 있는 마지막 해를 쓴다.
      let i = last;
      while (i >= 0 && mtNear[i] == null) i--;
      const v = i >= 0 ? mtNear[i] : null;
      const big = v == null ? '—'
        : v < 1 ? nf(v * 1000, 0) + '<span style="font-size:.55em;font-weight:500"> kg</span>'
                : nf(v, 0) + '<span style="font-size:.55em;font-weight:500"> 톤</span>';
      return ['<div class="n">' + big + '</div>',
              YRS[i] + '년 우리 바다에서 잡힌 명태',
              '1974년 6만 4512톤 · 2025년은 집계 없음'];
    })()
  ].map(s => '<div class="stat">' + s[0] + '<div class="l">' + s[1] + '</div><div class="d">' + s[2] + '</div></div>').join('');

  /* ── 탭 ─────────────────────────────────────────────── */
  document.querySelectorAll('nav button').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('nav button').forEach(x => x.setAttribute('aria-selected', String(x === b)));
      document.querySelectorAll('section.panel').forEach(s => { s.hidden = s.id !== b.dataset.t; });
      redrawAll();
    });
  });

  /* ── 차트 공통 ──────────────────────────────────────── */
  const charts = {};
  function base(stacked) {
    const ink2 = css('--ink-2'), grid = css('--line-soft'), surf = css('--surface-1');
    return {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },     // 교차선 + 묶음 말풍선
      plugins: {
        legend: {
          position: 'top', align: 'start',
          labels: { color: ink2, boxWidth: 10, boxHeight: 10, usePointStyle: true,
                    pointStyle: 'circle', font: { size: 12.5 }, padding: 14 }
        },
        tooltip: {
          backgroundColor: css('--surface-2'), titleColor: css('--ink'), bodyColor: ink2,
          borderColor: css('--line'), borderWidth: 1, padding: 11, cornerRadius: 7,
          displayColors: true, boxWidth: 9, boxHeight: 9, usePointStyle: true,
          titleFont: { size: 13 }, bodyFont: { size: 12.5 },
          itemSort: (a, b) => b.parsed.y - a.parsed.y
        }
      },
      scales: {
        x: { stacked: !!stacked, grid: { display: false },
             ticks: { color: css('--ink-3'), maxRotation: 0, autoSkipPadding: 22, font: { size: 11.5 } },
             border: { color: grid } },
        y: { stacked: !!stacked, beginAtZero: true,
             grid: { color: grid, drawTicks: false },
             ticks: { color: css('--ink-3'), font: { size: 11.5 }, padding: 8 },
             border: { display: false } }
      },
      elements: {
        line: { borderWidth: 2, tension: .18 },
        point: { radius: 0, hoverRadius: 5, hoverBorderWidth: 2, hoverBorderColor: surf }
      }
    };
  }

  function draw(id, cfg) {
    if (charts[id]) charts[id].destroy();
    const el = document.getElementById(id);
    if (el) charts[id] = new Chart(el, cfg);
  }

  function lines(id, names, series, opt) {
    opt = opt || {};
    const C = SER();
    draw(id, {
      type: 'line',
      data: {
        labels: YRS,
        datasets: names.map((n, i) => ({
          label: n, data: series[i], borderColor: C[i % C.length],
          backgroundColor: C[i % C.length], fill: false, spanGaps: false
        }))
      },
      options: Object.assign(base(false), {
        plugins: Object.assign(base(false).plugins, {
          legend: Object.assign(base(false).plugins.legend, { display: names.length > 1 }),
          tooltip: Object.assign(base(false).plugins.tooltip, {
            callbacks: { label: c => c.dataset.label + ': ' + nf(c.parsed.y, opt.dp) + (opt.unit || '') }
          })
        })
      })
    });
  }

  /* ── 1. 구조 변화 ───────────────────────────────────── */
  const FKEYS = ['연근해어업', '해면양식업', '원양어업', '내수면어업'];
  function t1() {
    lines('c1', FKEYS, FKEYS.map(k => F[k].map(v => v == null ? null : ton(v))), { dp: 1, unit: ' 만 톤' });
    const share = FKEYS.map(k => F[k].map((v, i) =>
      (v == null || !tot[i]) ? null : +(v / tot[i] * 100).toFixed(1)));
    const C = SER();
    draw('c2', {
      type: 'line',
      data: { labels: YRS, datasets: FKEYS.map((n, i) => ({
        label: n, data: share[i], borderColor: C[i], backgroundColor: C[i] + 'cc',
        fill: true, borderWidth: 1.5, spanGaps: false })) },
      options: (() => {
        const o = base(true);
        o.scales.y.max = 100;
        o.scales.y.ticks.callback = v => v + '%';
        o.plugins.tooltip.callbacks = { label: c => c.dataset.label + ': ' + nf(c.parsed.y, 1) + '%' };
        return o;
      })()
    });
    table('c1', ['연도'].concat(FKEYS), FKEYS.map(k => F[k].map(v => v == null ? null : ton(v))), 1);
    table('c2', ['연도'].concat(FKEYS), share, 1);
  }

  /* ── 2. 품종 ────────────────────────────────────────── */
  // 묶음마다 어울리는 어업 구분을 함께 정해 둔다.
  // '사라진 어종'을 어업 전체로 보면 원양에서 잡아온 명태가 섞여 뜻이 흐려진다.
  const PRESETS = {
    '사라진 어종': { sp: ['명태', '꽁치', '도루묵'], f: '연근해어업' },
    '오징어': { sp: ['살오징어(오징어)'], f: '연근해어업' },
    '더운물 어종': { sp: ['고등어', '삼치류', '방어류', '전갱이류'], f: '연근해어업' },
    '회복한 어종': { sp: ['대구', '청어', '꽃게'], f: '연근해어업' },
    '양식 4대': { sp: ['김류', '미역류', '다시마류', '굴류'], f: '해면양식업' },
    '조개': { sp: ['바지락', '굴류', '홍합류', '전복류'], f: '해면양식업' }
  };
  const spsel = document.getElementById('spsel'), spq = document.getElementById('spq'),
        spfish = document.getElementById('spfish');
  const SPNAMES = Object.keys(D.species).sort((a, b) => a.localeCompare(b, 'ko'));

  document.getElementById('presets').innerHTML = Object.keys(PRESETS)
    .map(k => '<button class="chip" type="button" data-p="' + k + '">' + k + '</button>').join('');
  document.querySelectorAll('#presets .chip').forEach(c => c.addEventListener('click', () => {
    usePreset(c.dataset.p);
  }));
  function usePreset(key) {
    const p = PRESETS[key];
    document.querySelectorAll('#presets .chip').forEach(
      x => x.setAttribute('aria-pressed', String(x.dataset.p === key)));
    spfish.value = p.f;
    pickSpecies(p.sp);
  }

  function fillSpecies(q) {
    const list = SPNAMES.filter(n => !q || n.indexOf(q) >= 0);
    const cur = sel();
    spsel.size = Math.min(9, Math.max(5, list.length));
    spsel.innerHTML = list.map(n =>
      '<option value="' + n + '"' + (cur.indexOf(n) >= 0 ? ' selected' : '') + '>' + n + '</option>').join('');
  }
  const sel = () => Array.prototype.slice.call(spsel.selectedOptions).map(o => o.value);
  function pickSpecies(names) {
    fillSpecies('');
    let first = null;
    Array.prototype.forEach.call(spsel.options, o => {
      o.selected = names.indexOf(o.value) >= 0;
      if (o.selected && !first) first = o;
    });
    if (first) spsel.scrollTop = Math.max(0, first.offsetTop - spsel.clientHeight / 2);
    t2();
  }
  spq.addEventListener('input', () => fillSpecies(spq.value.trim()));
  spsel.addEventListener('change', () => {
    document.querySelectorAll('#presets .chip').forEach(x => x.setAttribute('aria-pressed', 'false'));
    t2();
  });
  spfish.addEventListener('change', t2);

  function t2() {
    let names = sel().slice(0, 5);
    if (!names.length) names = PRESETS['사라진 어종'].sp;
    const f = spfish.value;
    const series = names.map(n => (D.species[n] || {})[f] || YRS.map(() => null));
    lines('c3', names, series, { dp: 0, unit: ' 톤' });
    document.getElementById('c3cap').textContent =
      '단위: 톤. ' + (f === '계' ? '모든 어업을 합친 값입니다.' : f + '만 집계한 값입니다.')
      + ' 값이 없는 해는 선이 끊깁니다 — 조사되지 않았거나 생산이 없었던 경우입니다.';
    table('c3', ['연도'].concat(names), series, 0);
  }

  /* ── 3. 지역 ────────────────────────────────────────── */
  const rgsel = document.getElementById('rgsel');
  const RGNAMES = Object.keys(D.regional).sort((a, b) => a.localeCompare(b, 'ko'));
  rgsel.innerHTML = RGNAMES.map(n =>
    '<option value="' + n + '"' + (n === '바지락' ? ' selected' : '') + '>' + n + '</option>').join('');
  rgsel.addEventListener('change', t3);

  function t3() {
    const sp = rgsel.value, byA = D.regional[sp] || {};
    const rank = Object.keys(byA).map(a => {
      const v = byA[a];
      let s = 0;
      for (let i = YRS.length - 10; i < YRS.length; i++) s += v[i] || 0;
      return [a, s];
    }).sort((x, y) => y[1] - x[1]);
    const top = rank.slice(0, 5).map(r => r[0]);
    lines('c4', top, top.map(a => byA[a]), { dp: 0, unit: ' 톤' });
    document.getElementById('c4cap').textContent =
      '단위: 톤. 최근 10년 생산량이 많은 5개 시도입니다. 전체 ' + rank.length + '개 시도는 표에서 볼 수 있습니다.';
    const all = rank.map(r => r[0]);
    table('c4', ['연도'].concat(all), all.map(a => byA[a]), 0);
  }

  /* ── 4. 물량과 돈 ───────────────────────────────────── */
  function t4() {
    lines('c5', ['생산량'], [tot.map(v => v == null ? null : ton(v))], { dp: 1, unit: ' 만 톤' });
    lines('c6', ['생산금액'], [FV['계'].map(v => v == null ? null : +jo(v).toFixed(2))], { dp: 2, unit: ' 조 원' });
    // 단가: 천원/톤 → 만원/톤. FV 는 십억 원 단위로 담겨 있다.
    const unit = tot.map((v, i) => {
      const m = FV['계'][i];
      return (!v || m == null) ? null : +(m * 1e9 / v / 1e4).toFixed(0);
    });
    lines('c7', ['톤당 단가'], [unit], { dp: 0, unit: ' 만 원' });
    table('c7', ['연도', '생산량(만 톤)', '생산금액(조 원)', '톤당 단가(만 원)'],
          [tot.map(v => v == null ? null : ton(v)),
           FV['계'].map(v => v == null ? null : +jo(v).toFixed(2)), unit], 1);
  }

  /* ── 표 보기 (색만으로 정보가 전달되지 않게 하는 안전장치) ── */
  const shown = {};
  function table(id, header, series, dp) {
    const host = document.getElementById(id + '_t');
    if (!host) return;
    host.dataset.header = JSON.stringify(header);
    host.dataset.series = JSON.stringify(series);
    host.dataset.dp = dp || 0;
    if (shown[id]) render(id);
  }
  function render(id) {
    const host = document.getElementById(id + '_t');
    const header = JSON.parse(host.dataset.header || '[]');
    const series = JSON.parse(host.dataset.series || '[]');
    const dp = +host.dataset.dp || 0;
    let h = '<table><thead><tr>' + header.map(x => '<th>' + x + '</th>').join('') + '</tr></thead><tbody>';
    for (let i = YRS.length - 1; i >= 0; i--) {
      if (!series.some(s => s && s[i] != null)) continue;
      h += '<tr><td>' + YRS[i] + '</td>'
        + series.map(s => '<td>' + nf(s ? s[i] : null, dp) + '</td>').join('') + '</tr>';
    }
    host.innerHTML = h + '</tbody></table>';
  }
  document.querySelectorAll('.tbtn').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.table;
    shown[id] = !shown[id];
    b.textContent = shown[id] ? '표 닫기' : '표로 보기';
    if (shown[id]) render(id); else document.getElementById(id + '_t').innerHTML = '';
  }));

  /* ── 그리기 ─────────────────────────────────────────── */
  function redrawAll() {
    if (!window.Chart) return;
    const vis = id => {
      const s = document.getElementById(id);
      return s && !s.hidden;
    };
    if (vis('t1')) t1();
    if (vis('t2')) t2();
    if (vis('t3')) t3();
    if (vis('t4')) t4();
  }
  ready = true;
  fillSpecies('');
  usePreset('사라진 어종');
  redrawAll();
})();
