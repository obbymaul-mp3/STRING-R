// Stringer Max: the top screen. The song, the notes, the sample and the files.
'use strict';
document.documentElement.className = 'top';
const VIEWS = ['SONG', 'NOTES', 'SAMPLE', 'FILES'];
const U = { bar: 0, zoom: 2, len: 1, vel: 0.8, lock: true, chord: false, autoP: -1, erase: false, row0: null, path: '', pick: '', listing: null, peaksFor: -1, peaks: null };
let hdr = {}, rail, mainEl, cur = null, curKey = '';
const fit = (cv) => { const d = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, hh = cv.clientHeight; if (cv.width !== Math.round(w * d) || cv.height !== Math.round(hh * d)) { cv.width = Math.round(w * d); cv.height = Math.round(hh * d); } const g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); return [g, w, hh]; };
const steps = () => pat().bars * 16;
const visSteps = () => Math.min(steps(), U.zoom * 16);
const firstStep = () => { const max = Math.max(0, steps() - visSteps()); U.bar = clamp(U.bar, 0, Math.ceil(max / 16)); return Math.min(max, U.bar * 16); };

function build() {
  const app = document.getElementById('app');
  const b = (label, fn, cls = '') => h('div', { class: 'btn ' + cls, tap: fn }, label);
  hdr.title = h('div', { class: 'lbl', style: 'color:var(--w);max-width:13rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' });
  hdr.pat = h('div', { class: 'big', style: 'width:6.4rem;text-align:center;color:var(--c)' }); hdr.bars = h('div', { class: 'lbl' });
  hdr.bpm = h('div', { class: 'big', style: 'color:var(--c)' }); hdr.key = h('div', { class: 'mid', style: 'font-size:1.05rem;white-space:nowrap' }); hdr.pos = h('div', { class: 'big', style: 'font-variant-numeric:tabular-nums' });
  hdr.play = b('▶', () => transport('PLAY'), 'on'); hdr.rec = b('●', () => transport('REC'), 'hot'); hdr.mode = b('PATTERN', () => { C('mode ' + (S.st.songMode ? 0 : 1)); sync(); }, 'mag'); hdr.mode.style.width = '8.5rem'; hdr.undo = b('↶', () => { C('undo'); sync(); }, 'sm'); hdr.redo = b('↷', () => { C('redo'); sync(); }, 'sm');
  hdr.cpu = h('div', { class: 'lbl', style: 'font-size:.85rem' });
  const box = (label, el, fn) => h('div', { class: 'col', style: 'align-items:center;padding:0 .9rem;height:5rem;justify-content:center', tap: fn }, h('div', { class: 'lbl' }, label), el);
  const header = h('div', { class: 'row panel', style: 'height:6.2rem;margin:.5rem .5rem 0;padding:0 .8rem;gap:.5rem' },
    h('div', { class: 'col', style: 'width:13.5rem;gap:.2rem' }, h('div', { class: 'mich', style: 'font-size:1.35rem;letter-spacing:.22em;color:var(--c);text-shadow:0 0 1rem rgba(61,242,255,.8);white-space:nowrap' }, 'STRING-R'), hdr.title),
    b('◀', () => transport('PAT-'), 'sm'), box('PATTERN', hdr.pat, () => setView(0)), b('▶', () => transport('PAT+'), 'sm'), hdr.bars,
    h('div', { class: 'grow' }), box('TEMPO', hdr.bpm, tempoPop), box('KEY', hdr.key, keyPop), h('div', { class: 'col', style: 'align-items:flex-end;width:7.5rem' }, hdr.pos, hdr.cpu), hdr.play, b('■', () => { C('stop'); sync(); }), hdr.rec, hdr.mode, hdr.undo, hdr.redo);
  rail = h('div', { class: 'col panel scroll', style: 'width:16rem;margin:.5rem 0 .5rem .5rem;padding:.4rem;gap:.35rem' });
  mainEl = h('div', { class: 'grow col', style: 'margin:.5rem;min-width:0' });
  hdr.tabs = VIEWS.map((v, i) => h('div', { class: 'tab', tap: () => setView(i) }, v));
  const right = h('div', { class: 'grow col', style: 'min-width:0' }, h('div', { class: 'tabs', style: 'margin:.5rem .5rem 0' }, hdr.tabs), mainEl);
  app.append(header, h('div', { class: 'row grow', style: 'align-items:stretch;min-height:0' }, rail, right), h('div', { id: 'toast' }), h('div', { id: 'busy' }));
}
const setView = (i) => setSel('view', i);

function tempoPop() {
  const st = S.st; let taps = [];
  const set = (v) => { C('bpm ' + clamp(v, 40, 240)); sync(); num.textContent = S.st.bpm; }; const num = h('div', { class: 'big', style: 'font-size:3.4rem;width:14rem;text-align:center;color:var(--c)' }, st.bpm);
  const sw = knob({ label: 'SWING', get: () => S.st.swing, set: (v) => { S.st.swing = v; C('swing ' + v.toFixed(3)); } });
  const met = h('div', { class: 'btn wide' + (st.metro ? ' on' : ''), tap: () => { C('metro ' + (S.st.metro ? 0 : 1)); sync(); met.classList.toggle('on', !!S.st.metro); } }, 'METRONOME');
  popup('TEMPO', h('div', { class: 'col gap' }, h('div', { class: 'row gap', style: 'justify-content:center' }, ...[-10, -1].map(d => h('div', { class: 'btn', tap: () => set(S.st.bpm + d) }, d)), num, ...[1, 10].map(d => h('div', { class: 'btn', tap: () => set(S.st.bpm + d) }, '+' + d))),
    h('div', { class: 'row gap' }, ...[120, 128, 132, 138, 140, 150, 160, 174].map(v => h('div', { class: 'btn sm wide', tap: () => set(v) }, v))),
    h('div', { class: 'row gap' }, h('div', { class: 'btn wide', style: 'height:7rem', onpointerdown: () => { const n = performance.now(); taps = taps.filter(t => n - t < 2500); taps.push(n); if (taps.length > 2) set(Math.round(60000 / ((taps[taps.length - 1] - taps[0]) / (taps.length - 1)))); } }, 'TAP TEMPO'), sw, met)), 58);
}
function keyPop() {
  const body = h('div', { class: 'col gap' }); const draw = () => { body.innerHTML = ''; body.append(h('div', { style: 'display:grid;grid-template-columns:repeat(6,1fr);gap:.5rem' }, D.NOTES.map((n, i) => h('div', { class: 'btn' + (S.st.key === i ? ' on' : ''), tap: () => { edit(`key ${i} ${S.st.scale}`); draw(); } }, n))),
    h('div', { style: 'display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem' }, D.SCALES.map((s, i) => h('div', { class: 'btn' + (S.st.scale === i ? ' on mag' : ' mag'), style: 'font-size:.95rem', tap: () => { edit(`key ${S.st.key} ${i}`); draw(); } }, s[0]))),
    h('div', { class: 'lbl', style: 'white-space:normal;line-height:1.6' }, 'THE KEY SETS WHICH NOTES THE PIANO ROLL SHOWS AND WHERE AUTO-TUNE PULLS A VOICE.')); }; draw(); popup('KEY AND SCALE', body, 62);
}
function trackMenu(t) {
  const T = S.st.tracks[t]; const items = ['RENAME', 'CLEAR ITS NOTES', 'DELETE TRACK']; if (T.type === 3) items.push('MIDI CHANNEL ' + (T.ch + 1));
  choose(T.name, items, (i) => { if (i === 0) ask('TRACK NAME', T.name, (v) => edit(`trk name ${t} "${v.toUpperCase().replace(/"/g, '')}"`)); else if (i === 1) edit(`nclear ${S.st.pat} ${t} 1`); else if (i === 2) confirmPop('DELETE ' + T.name + '?', () => { edit(`trk del ${t}`, `sel track ${Math.max(0, t - 1)}`); }); else edit(`trk ch ${t} ${(T.ch + 1) % 16}`); }, 2, 50);
}

// ---------------------------------------------------------------- rail and header
let railMeters = [];
function renderChrome() {
  const st = S.st; hdr.title.textContent = st.title; hdr.pat.textContent = String(st.pat + 1).padStart(2, '0'); hdr.bars.textContent = pat().bars + (pat().bars > 1 ? ' BARS' : ' BAR');
  hdr.bpm.textContent = st.bpm; hdr.key.textContent = D.NOTES[st.key] + ' ' + D.SCALES[st.scale][0]; hdr.play.textContent = st.playing ? '❚❚' : '▶'; hdr.play.classList.toggle('on', !!st.playing); hdr.rec.classList.toggle('on', !!st.rec);
  hdr.mode.textContent = st.songMode ? 'SONG' : 'PATTERN'; hdr.mode.classList.toggle('on', !!st.songMode); hdr.undo.classList.toggle('dim', !st.undo); hdr.redo.classList.toggle('dim', !st.redo);
  const v = sel('view', 0); hdr.tabs.forEach((t, i) => t.classList.toggle('on', i === v));
  rail.innerHTML = ''; railMeters = [];
  st.tracks.forEach((T, t) => { const on = t === tIdx(), m = meter('h', 'height:.35rem;width:100%;border:none'); railMeters.push(m);
    rail.append(h('div', { class: 'col', style: `border:1px solid ${on ? color(t) : 'var(--line)'};border-left:.5rem solid ${color(t)};border-radius:.4rem;padding:.35rem .5rem;gap:.25rem;background:${on ? 'rgba(61,242,255,.12)' : 'rgba(10,18,34,.5)'}`, tap: (e) => { if (e.target.dataset.b) return; if (on) trackMenu(t); else setSel('track', t); } },
      h('div', { class: 'row', style: 'gap:.3rem' }, h('div', { class: 'grow', style: 'font-size:1rem;letter-spacing:.06em;overflow:hidden;white-space:nowrap;text-overflow:ellipsis' }, T.name),
        h('div', { 'data-b': 1, class: 'btn sm' + (T.mute ? ' on hot' : ''), style: 'height:2.4rem;min-width:2.4rem;padding:0', tap: () => { C(`trk mute ${t} ${T.mute ? 0 : 1}`); sync(); } }, 'M'),
        h('div', { 'data-b': 1, class: 'btn sm' + (T.solo ? ' on' : ''), style: 'height:2.4rem;min-width:2.4rem;padding:0', tap: () => { C(`trk solo ${t} ${T.solo ? 0 : 1}`); sync(); } }, 'S')), m)); });
  rail.append(h('div', { class: 'btn', style: 'height:3.4rem;flex-shrink:0', tap: addTrackMenu }, '+ TRACK'));
}
function render() {
  if (!S.st) return; renderChrome(); const v = sel('view', 0), T = trk(), key = v + ':' + (T ? T.type : -1);
  if (key !== curKey) { curKey = key; mainEl.innerHTML = ''; cur = [songView, notesView, sampleView, filesView][v](); mainEl.append(cur.el); }
  cur.update();
}
function onMeters() {
  const m = S.m, st = S.st, plen = st.pats[m.pat] ? st.pats[m.pat].bars * 384 : 384, bar = Math.floor(m.tick / 384) + 1, beat = Math.floor((m.tick % 384) / 96) + 1;
  hdr.pos.textContent = (st.songMode && st.song.length ? (m.songPos + 1) + ':' : '') + bar + '.' + beat; hdr.cpu.textContent = 'CPU ' + Math.round(m.cpu * 100) + '%';
  railMeters.forEach((r, i) => r.set(meterFrac(m.trk[i] || 0)));
  const kick = st.tracks.some((T, i) => T.type === 0 && (m.trk[i] || 0) > 0.25) && m.playing && (m.tick % 96) < 14; Scene.set(m.trk.map(v => Math.min(1, v * 1.6)), kick);
  if (cur && cur.fast) cur.fast(m, plen);
}
function onAct(name) {
  if (['PLAY', 'REC', 'TRACK-', 'TRACK+', 'PAT-', 'PAT+'].includes(name)) return transport(name);
  if (name === 'VIEW') return setView((sel('view', 0) + 1) % VIEWS.length);
  if (cur && cur.act) cur.act(name);
}

// ---------------------------------------------------------------- SONG
function songView() {
  const strip = h('div', { class: 'row scrollx panel', style: 'height:10rem;padding:.6rem;gap:.5rem;flex-shrink:0' }), pal = h('div', { style: 'display:grid;grid-template-columns:repeat(16,1fr);gap:.35rem' }), tools = h('div', { class: 'row gap', style: 'flex-wrap:wrap' }), over = h('canvas', { style: 'width:100%;height:100%' }), info = h('div', { class: 'lbl' });
  const el = h('div', { class: 'col grow', style: 'gap:.5rem;min-height:0' }, h('div', { class: 'row gap' }, h('div', { class: 'lbl' }, 'THE SONG: PATTERNS PLAYED IN ORDER'), h('div', { class: 'grow' }), info), strip, tools, h('div', { class: 'panel', style: 'padding:.6rem' }, pal), h('div', { class: 'panel grow', style: 'min-height:0;padding:.4rem' }, over));
  let slotEls = [];
  const has = (p) => S.st.pats[p].c.some(c => c.n.length > 0);
  function update() {
    const st = S.st; strip.innerHTML = ''; slotEls = [];
    st.song.forEach((p, i) => { const e = h('div', { class: 'col', style: `width:6.6rem;height:100%;flex-shrink:0;border:1px solid var(--line);border-radius:.4rem;align-items:center;justify-content:center;gap:.3rem;background:rgba(20,34,60,.6)`, tap: () => { U.slot = i; C('seek ' + i); sync(); } }, h('div', { class: 'lbl' }, i + 1), h('div', { class: 'big', style: `color:${color(p)}` }, String(p + 1).padStart(2, '0')), h('div', { class: 'lbl' }, st.pats[p].bars + ' BAR')); slotEls.push(e); strip.append(e); });
    strip.append(h('div', { class: 'btn', style: 'height:100%;flex-shrink:0;flex-direction:column;gap:.3rem', tap: () => edit(`song add ${st.pat}`) }, h('div', { class: 'big' }, '+'), h('div', { class: 'lbl' }, 'ADD ' + String(st.pat + 1).padStart(2, '0'))));
    let secs = 0; st.song.forEach(p => secs += st.pats[p].bars * 4 * 60 / st.bpm); info.textContent = st.song.length ? `${st.song.length} PARTS · ${Math.floor(secs / 60)}:${String(Math.round(secs % 60)).padStart(2, '0')}` : 'EMPTY: ADD PATTERNS BELOW';
    tools.innerHTML = ''; const b = (l, fn, on) => h('div', { class: 'btn sm' + (on ? ' on' : ''), tap: fn }, l); const sl = U.slot;
    tools.append(h('div', { class: 'lbl' }, 'PART'), b('REMOVE', () => { if (sl != null && sl < st.song.length) edit(`song del ${sl}`); }), b('REPEAT', () => { if (sl != null && sl < st.song.length) edit(`song add ${st.song[sl]} ${sl + 1}`); }), b('USE PATTERN ' + String(st.pat + 1).padStart(2, '0'), () => { if (sl != null && sl < st.song.length) edit(`song set ${sl} ${st.pat}`); }), b('LOOP SONG', () => { C('loop ' + (st.loop ? 0 : 1)); sync(); }, st.loop),
      h('div', { style: 'width:1.5rem' }), h('div', { class: 'lbl' }, 'PATTERN'), ...[1, 2, 4, 8].map(n => b(n + ' BAR', () => edit(`pb ${st.pat} ${n}`), pat().bars === n)), b('DOUBLE', () => edit(`pdouble ${st.pat}`)),
      b('COPY TO NEW', () => { let d = -1; for (let i = 0; i < 32; i++) if (!has(i) && i !== st.pat) { d = i; break; } if (d >= 0) edit(`pcopy ${st.pat} ${d}`, `pat ${d}`); else toast('ALL 32 PATTERNS ARE USED'); }), b('CLEAR', () => confirmPop('CLEAR PATTERN ' + (st.pat + 1) + '?', () => edit(`pclear ${st.pat}`))));
    pal.innerHTML = ''; for (let i = 0; i < 32; i++) pal.append(h('div', { class: 'btn sm' + (i === st.pat ? ' on' : ''), style: `min-width:0;padding:0;height:3rem;${has(i) ? `color:${color(i)};border-color:${color(i)}` : 'opacity:.45'}`, tap: () => { C('pat ' + i); sync(); } }, String(i + 1).padStart(2, '0')));
    drawOver();
  }
  function drawOver(ph) {
    const [g, w, hh] = fit(over), st = S.st, n = st.tracks.length, P = pat(), len = P.bars * 384, rh = Math.min(hh / Math.max(1, n), rem() * 3.2), lw = 0; g.clearRect(0, 0, w, hh);
    for (let b = 0; b <= P.bars * 4; b++) { g.fillStyle = b % 4 === 0 ? 'rgba(120,190,255,.35)' : 'rgba(120,190,255,.1)'; g.fillRect(lw + (w - lw) * b / (P.bars * 4), 0, 1, rh * n); }
    st.tracks.forEach((T, t) => { const y = t * rh, c = P.c[t]; if (t === tIdx()) { g.fillStyle = 'rgba(61,242,255,.08)'; g.fillRect(0, y, w, rh); } if (!c) return; g.fillStyle = color(t);
      let lo = 127, hi = 0; for (const nt of c.n) { lo = Math.min(lo, nt[2]); hi = Math.max(hi, nt[2]); } const span = Math.max(1, hi - lo);
      for (const nt of c.n) { const x = lw + (w - lw) * nt[0] / len, ww = Math.max(2, (w - lw) * Math.min(nt[1], len - nt[0]) / len - 1), yy = y + 3 + (rh - 8) * (1 - (nt[2] - lo) / span) * 0.8; g.globalAlpha = 0.45 + nt[3] * 0.55; g.fillRect(x, yy, ww, Math.max(2, rh * 0.16)); } g.globalAlpha = 1; });
    if (ph != null) { g.fillStyle = '#fff'; g.fillRect(lw + (w - lw) * ph / len, 0, 2, rh * n); }
  }
  return { el, update, fast: (m) => { slotEls.forEach((e, i) => { const play = S.st.songMode && m.playing && i === m.songPos, selc = i === U.slot; e.style.borderColor = play ? '#fff' : selc ? 'var(--c)' : 'var(--line)'; e.style.boxShadow = play ? '0 0 1.2rem rgba(255,255,255,.5)' : 'none'; }); drawOver(m.playing ? m.tick : null); } };
}

// ---------------------------------------------------------------- NOTES: step grid for drums, piano roll for everything else
function notesView() {
  const T = trk(); if (!T) return { el: h('div', { class: 'lbl' }, 'ADD A TRACK FIRST'), update() {} };
  const drum = T.type === 0, cv = h('canvas', { style: 'width:100%;height:100%;display:block' }), av = h('canvas', { style: 'width:100%;height:100%;display:block' }), bar = h('div', { class: 'row', style: 'gap:.4rem;flex-wrap:nowrap' }), avWrap = h('div', { class: 'panel', style: 'height:8rem;flex-shrink:0;display:none' }, av);
  const el = h('div', { class: 'col grow', style: 'gap:.4rem;min-height:0' }, bar, h('div', { class: 'panel grow', style: 'min-height:0;overflow:hidden' }, cv), avWrap);
  const LW = () => rem() * (drum ? 9 : 6.5), RH = () => rem() * 2.7;
  // the rows of the piano roll: every note, or only the notes of the key
  const rowsAll = () => { const o = []; const mask = D.SCALES[S.st.scale][1]; for (let n = 108; n >= 24; n--) if (!U.lock || (mask >> (((n - S.st.key) % 12 + 12) % 12)) & 1) o.push(n); return o; };
  let rows = [], geom = null, drag = null;
  function layout() { const [g, w, hh] = fit(cv); const lw = LW(), vs = visSteps(), f0 = firstStep(), cw = (w - lw) / vs; let rh, r0 = 0, nrow;
    if (drum) { nrow = 8; rh = hh / 8; rows = [0, 1, 2, 3, 4, 5, 6, 7]; }
    else { rows = rowsAll(); nrow = Math.max(4, Math.floor(hh / RH())); rh = hh / nrow; if (U.row0 == null) { const ns = clip().n; let mid = 60; if (ns.length) mid = ns.reduce((a, n) => a + n[2], 0) / ns.length; let best = 0; rows.forEach((p, i) => { if (Math.abs(p - mid) < Math.abs(rows[best] - mid)) best = i; }); U.row0 = best - Math.floor(nrow / 2); } U.row0 = clamp(U.row0, 0, Math.max(0, rows.length - nrow)); r0 = U.row0; }
    geom = { g, w, hh, lw, vs, f0, cw, rh, r0, nrow }; return geom; }
  function draw(tickNow) {
    const st = S.st, G = layout(), { g, w, hh, lw, vs, f0, cw, rh, r0, nrow } = G, c = clip(), col = color(tIdx()); g.clearRect(0, 0, w, hh); g.font = `500 ${rem() * 1.15}px sans-serif-condensed, 'Arial Narrow', sans-serif`; g.textBaseline = 'middle';
    for (let r = 0; r < nrow; r++) { const p = rows[r0 + r]; if (p == null) break; const y = r * rh, root = !drum && ((p - st.key) % 12 + 12) % 12 === 0, black = !drum && [1, 3, 6, 8, 10].includes(p % 12);
      g.fillStyle = drum ? (r % 2 ? 'rgba(20,34,60,.35)' : 'rgba(10,18,34,.35)') : root ? 'rgba(61,242,255,.10)' : black ? 'rgba(3,6,14,.55)' : 'rgba(20,34,60,.32)'; g.fillRect(lw, y, w - lw, rh - 1);
      g.fillStyle = drum ? 'rgba(20,34,60,.9)' : black ? 'rgba(8,12,24,.95)' : 'rgba(200,225,255,.16)'; g.fillRect(0, y, lw - 2, rh - 1); g.fillStyle = root ? '#3df2ff' : '#cfe2f5'; g.fillText(drum ? D.DRUMS[T.pads[p].type] : noteName(p), rem() * 0.6, y + rh / 2); }
    for (let s = 0; s <= vs; s++) { const a = f0 + s; g.fillStyle = a % 16 === 0 ? 'rgba(160,215,255,.6)' : a % 4 === 0 ? 'rgba(120,190,255,.28)' : 'rgba(120,190,255,.09)'; g.fillRect(lw + s * cw, 0, a % 16 === 0 ? 2 : 1, hh); }
    if (drum) for (let s = 0; s < vs; s++) if (Math.floor((f0 + s) / 4) % 2 === 0) { g.fillStyle = 'rgba(120,190,255,.045)'; g.fillRect(lw + s * cw, 0, cw, hh); }
    for (const n of c.n) { const ri = rows.indexOf(n[2]) - r0; if (ri < 0 || ri >= nrow) continue; const x = lw + (n[0] / 24 - f0) * cw, ww = drum ? cw : n[1] / 24 * cw; if (x + ww < lw || x > w) continue;
      const pad = drum ? Math.min(cw, rh) * 0.14 : 1; g.globalAlpha = 0.4 + 0.6 * n[3]; g.fillStyle = col; rr(g, Math.max(lw, x) + pad, ri * rh + pad, Math.max(3, ww - pad * 2 - (x < lw ? lw - x : 0)), rh - pad * 2 - 1, rem() * 0.3); g.fill(); g.globalAlpha = 1;
      if (!drum) { g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(Math.max(lw, x) + 1, ri * rh + 2, 2, rh - 5); } }
    if (tickNow != null) { const x = lw + (tickNow / 24 - f0) * cw; if (x >= lw && x <= w) { g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(x, 0, 2, hh); } }
    if (U.autoP >= 0) drawAuto();
  }
  function rr(g, x, y, w, hh, r) { r = Math.min(r, w / 2, hh / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function drawAuto() { const [g, w, hh] = fit(av), lw = LW(), vs = visSteps(), f0 = firstStep(), cw = (w - lw) / vs, lane = clip().a[U.autoP] || [], base = T.P[U.autoP]; g.clearRect(0, 0, w, hh); g.font = `${rem() * 0.9}px Mich, sans-serif`; g.fillStyle = '#7f93ad'; g.textBaseline = 'middle';
    g.fillText((D.AUTO.find(a => a[0] === U.autoP) || [0, ''])[1], rem() * 0.5, hh / 2); g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(lw, hh - 2 - (hh - 4) * base, w - lw, 1);
    for (let s = 0; s < vs; s++) { const v = lane[f0 + s]; if (v == null || v < 0) continue; g.fillStyle = '#ff4fd8'; g.fillRect(lw + s * cw + 1, hh - 2 - (hh - 4) * v, cw - 2, (hh - 4) * v + 2); } }
  // ---- touch
  const at = (e) => { const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, G = geom; return { x, y, step: G.f0 + Math.floor((x - G.lw) / G.cw), fstep: G.f0 + (x - G.lw) / G.cw, row: G.r0 + Math.floor(y / G.rh), keys: x < G.lw }; };
  const audition = (p) => { const t = tIdx(); C(`non ${t} ${p} 0.8`); setTimeout(() => C(`noff ${t} ${p}`), 160); };
  const pcmd = (...a) => a.forEach(x => C(x));
  cv.addEventListener('pointerdown', (e) => { if (!geom) return; try { cv.setPointerCapture(e.pointerId); } catch (x) {} const q = at(e), c = clip(), t = tIdx(), p = S.st.pat, pitch = rows[q.row]; if (pitch == null) return;
    if (q.keys) { drag = { mode: 'scroll', y: q.y, r0: U.row0, moved: false, pitch }; return; }
    if (q.step < 0 || q.step >= steps()) return; mark();
    if (drum) { const i = c.n.findIndex(n => n[2] === pitch && n[0] === q.step * 24); const add = i < 0; if (add) { c.n.push([q.step * 24, 24, pitch, U.vel]); C(`n ${p} ${t} ${q.step * 24} 24 ${pitch} ${U.vel}`); audition(pitch); } else { c.n.splice(i, 1); C(`nd ${p} ${t} ${q.step * 24} ${pitch}`); } drag = { mode: 'paint', add, pitch, last: q.step }; draw(); return; }
    const hit = c.n.find(n => n[2] === pitch && q.fstep >= n[0] / 24 && q.fstep < (n[0] + n[1]) / 24);
    if (hit) { const rel = (q.fstep - hit[0] / 24) / (hit[1] / 24); drag = { mode: rel > 0.7 && hit[1] > 24 || rel > 0.85 ? 'size' : 'move', n: hit, s0: q.step, row0: q.row, start: hit[0], len: hit[1], pitch: hit[2], moved: false }; audition(pitch); }
    else { const add = (pi) => { const n = [q.step * 24, Math.round(U.len * 24), pi, U.vel]; c.n.push(n); C(`n ${p} ${t} ${n[0]} ${n[1]} ${pi} ${U.vel}`); return n; }; const n = add(pitch); audition(pitch);
      if (U.chord) for (const d of [2, 4]) { const pi = rows[q.row - d]; if (pi != null) { add(pi); setTimeout(() => audition(pi), 0); } }
      drag = { mode: 'size', n, s0: q.step, row0: q.row, start: n[0], len: n[1], pitch, moved: true, fresh: true }; }
    draw(); });
  cv.addEventListener('pointermove', (e) => { if (!drag) return; const q = at(e), c = clip(), t = tIdx(), p = S.st.pat;
    if (drag.mode === 'scroll') { const d = Math.round((drag.y - q.y) / geom.rh); if (d) drag.moved = true; U.row0 = drag.r0 - d; draw(); return; }
    if (drag.mode === 'paint') { const s = clamp(q.step, 0, steps() - 1); if (s === drag.last) return; drag.last = s; const i = c.n.findIndex(n => n[2] === drag.pitch && n[0] === s * 24);
      if (drag.add && i < 0) { c.n.push([s * 24, 24, drag.pitch, U.vel]); C(`n ${p} ${t} ${s * 24} 24 ${drag.pitch} ${U.vel}`); } else if (!drag.add && i >= 0) { c.n.splice(i, 1); C(`nd ${p} ${t} ${s * 24} ${drag.pitch}`); } draw(); return; }
    const n = drag.n; if (drag.mode === 'size') { const len = Math.max(24, (clamp(q.step, 0, steps() - 1) + 1) * 24 - n[0]); if (len !== n[1]) { n[1] = len; drag.moved = true; C(`n ${p} ${t} ${n[0]} ${len} ${n[2]} ${n[3]}`); if (!drag.fresh) U.len = len / 24; draw(); } return; }
    const ns = clamp(drag.start + (q.step - drag.s0) * 24, 0, steps() * 24 - 24), np = rows[clamp(rows.indexOf(drag.pitch) + (q.row - drag.row0), 0, rows.length - 1)];
    if (ns !== n[0] || np !== n[2]) { drag.moved = true; pcmd(`nd ${p} ${t} ${n[0]} ${n[2]}`, `n ${p} ${t} ${ns} ${n[1]} ${np} ${n[3]}`); if (np !== n[2]) audition(np); n[0] = ns; n[2] = np; draw(); } });
  const up = () => { if (!drag) return; const d = drag; drag = null; if (d.mode === 'scroll') { if (!d.moved) audition(d.pitch); return; }
    if (d.mode !== 'paint' && !d.moved && !d.fresh) { const c = clip(), i = c.n.indexOf(d.n); if (i >= 0) { c.n.splice(i, 1); C(`nd ${S.st.pat} ${tIdx()} ${d.n[0]} ${d.n[2]}`); } }
    if (d.fresh && d.n) U.len = d.n[1] / 24; C('bump'); sync(); };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  const autoSet = (e) => { const r = av.getBoundingClientRect(), G = geom; if (!G) return; const s = G.f0 + Math.floor((e.clientX - r.left - G.lw) / G.cw); if (s < 0 || s >= steps()) return; const v = U.erase ? -1 : clamp(1 - (e.clientY - r.top) / r.height); const c = clip(); if (!c.a[U.autoP]) c.a[U.autoP] = []; while (c.a[U.autoP].length <= s) c.a[U.autoP].push(-1); c.a[U.autoP][s] = v; C(`au ${S.st.pat} ${tIdx()} ${U.autoP} ${s} ${v.toFixed(3)}`); drawAuto(); };
  let adrag = false; av.addEventListener('pointerdown', (e) => { try { av.setPointerCapture(e.pointerId); } catch (x) {} adrag = true; mark(); autoSet(e); }); av.addEventListener('pointermove', (e) => { if (adrag) autoSet(e); }); const aup = () => { if (adrag) { adrag = false; C('bump'); sync(); } }; av.addEventListener('pointerup', aup); av.addEventListener('pointercancel', aup);
  function update() {
    const st = S.st, b = (l, fn, on, cls = '') => h('div', { class: 'btn sm ' + cls + (on ? ' on' : ''), tap: fn }, l); bar.innerHTML = ''; const pages = Math.max(1, Math.ceil(steps() / 16) - U.zoom + 1);
    const cyc = (label, list, curV, set) => h('div', { class: 'btn sm', style: 'flex-direction:column;gap:0;line-height:1.1', tap: () => { const i = list.findIndex(x => x[0] === curV); set(list[(i + 1) % list.length][0]); update(); } }, h('div', { style: 'font-size:.72rem;color:var(--d);letter-spacing:.14em' }, label), (list.find(x => x[0] === curV) || list[0])[1]);
    bar.append(b('◀', () => { U.bar = Math.max(0, U.bar - 1); update(); }), h('div', { class: 'lbl', style: 'width:8.5rem;text-align:center;color:var(--w)' }, `BAR ${Math.min(U.bar, pages - 1) + 1}${visSteps() > 16 ? '-' + (Math.min(U.bar, pages - 1) + visSteps() / 16) : ''} OF ${pat().bars}`), b('▶', () => { U.bar = Math.min(pages - 1, U.bar + 1); update(); }),
      cyc('SHOW', [[1, '1 BAR'], [2, '2 BARS'], [4, '4 BARS']], U.zoom, (v) => { U.zoom = v; }));
    if (!drum) bar.append(cyc('NOTE LENGTH', [[1, '1/16'], [2, '1/8'], [4, '1/4'], [8, '1/2'], [16, '1 BAR']], [1, 2, 4, 8, 16].includes(U.len) ? U.len : 1, (v) => { U.len = v; }), b('KEY LOCK', () => { U.lock = !U.lock; U.row0 = null; update(); }, U.lock, 'mag'), b('CHORDS', () => { U.chord = !U.chord; update(); }, U.chord, 'mag'));
    bar.append(cyc('HIT', [[0.45, 'SOFT'], [0.8, 'MEDIUM'], [1, 'HARD']], U.vel, (v) => { U.vel = v; }), h('div', { class: 'grow' }),
      b(U.autoP < 0 ? 'AUTOMATION' : 'AUTO: ' + (D.AUTO.find(a => a[0] === U.autoP) || [0, ''])[1], () => choose('DRAW CHANGES OVER TIME FOR…', [{ label: 'HIDE', on: U.autoP < 0 }, ...D.AUTO.map(a => ({ label: a[1], on: a[0] === U.autoP }))], (i) => { U.autoP = i === 0 ? -1 : D.AUTO[i - 1][0]; update(); }, 4), U.autoP >= 0, 'mag'));
    if (U.autoP >= 0) bar.append(b('ERASE', () => { U.erase = !U.erase; update(); }, U.erase, 'hot'));
    bar.append(b('CLEAR', () => confirmPop('CLEAR THESE NOTES?', () => edit(`nclear ${st.pat} ${tIdx()} 0`))));
    avWrap.style.display = U.autoP >= 0 ? 'block' : 'none'; requestAnimationFrame(() => draw());
  }
  let lastPage = -1;
  return { el, update, fast: (m) => { if (drag) return; if (m.playing && m.pat === S.st.pat) { const pg = Math.floor(m.tick / 384 / U.zoom) * U.zoom; if (pg !== lastPage && steps() > visSteps()) { lastPage = pg; U.bar = pg; update(); } draw(m.tick); } else if (lastPage !== -2) { lastPage = -2; draw(); } },
    act: (n) => { if (n === 'UP') U.row0 = (U.row0 || 0) - 2; else if (n === 'DOWN') U.row0 = (U.row0 || 0) + 2; else if (n === 'LEFT') U.bar = Math.max(0, U.bar - 1); else if (n === 'RIGHT') U.bar++; update(); } };
}

// ---------------------------------------------------------------- SAMPLE
function sampleView() {
  const T = trk(), cv = h('canvas', { style: 'width:100%;height:100%;display:block' }), bar = h('div', { class: 'row gap', style: 'flex-wrap:wrap' }), el = h('div', { class: 'col grow', style: 'gap:.5rem;min-height:0' }, bar, h('div', { class: 'panel grow', style: 'min-height:0;overflow:hidden' }, cv));
  const sid = () => { const T = trk(); return !T ? -1 : T.type === 2 ? T.smp : T.type === 0 ? T.pads[sel('pad', 0)].smp : -1; };
  const b = (l, fn, on, cls = '') => h('div', { class: 'btn sm ' + cls + (on ? ' on' : ''), tap: fn }, l); let drag = null;
  function draw(ph) { const [g, w, hh] = fit(cv), T = trk(), id = sid(); g.clearRect(0, 0, w, hh); if (id < 0 || !U.peaks) { g.fillStyle = '#7f93ad'; g.font = `${rem() * 1.2}px Mich, sans-serif`; g.textAlign = 'center'; g.fillText(T && (T.type === 2 || T.type === 0) ? 'NO SAMPLE YET — OPEN FILES TO LOAD ONE' : 'THIS TRACK MAKES ITS OWN SOUND', w / 2, hh / 2); g.textAlign = 'left'; return; }
    const pk = U.peaks, n = pk.length, mid = hh / 2, a = T.type === 2 ? T.P[P.S_START] : 0, e = T.type === 2 ? T.P[P.S_END] : 1; g.fillStyle = 'rgba(61,242,255,.07)'; g.fillRect(a * w, 0, (e - a) * w, hh);
    for (let i = 0; i < n; i++) { const x = i / n * w, v = pk[i] * mid * 0.95, inside = i / n >= a && i / n <= e; g.fillStyle = inside ? color(tIdx()) : 'rgba(127,147,173,.45)'; g.fillRect(x, mid - v, Math.max(1, w / n - 0.5), Math.max(1, v * 2)); }
    if (T.type === 2) { if (Math.round(T.P[P.S_MODE] * 3) === 2) for (let k = 1; k < 16; k++) { g.fillStyle = 'rgba(255,79,216,.7)'; g.fillRect((a + (e - a) * k / 16) * w, 0, 1, hh); }
      for (const [v, c] of [[a, '#b6ff3d'], [e, '#ff5a5a']]) { g.fillStyle = c; g.fillRect(v * w - 1.5, 0, 3, hh); g.beginPath(); g.arc(v * w, rem() * 1.4, rem() * 1.1, 0, 7); g.fill(); } } }
  cv.addEventListener('pointerdown', (ev) => { const T = trk(); if (!T || T.type !== 2) return; try { cv.setPointerCapture(ev.pointerId); } catch (x) {} const r = cv.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width; mark(); drag = Math.abs(x - T.P[P.S_START]) < Math.abs(x - T.P[P.S_END]) ? P.S_START : P.S_END; });
  cv.addEventListener('pointermove', (ev) => { if (drag == null) return; const T = trk(), r = cv.getBoundingClientRect(); let x = clamp((ev.clientX - r.left) / r.width); if (drag === P.S_START) x = Math.min(x, T.P[P.S_END] - 0.005); else x = Math.max(x, T.P[P.S_START] + 0.005); T.P[drag] = x; C(`p ${tIdx()} ${drag} ${x.toFixed(5)}`); draw(); });
  const up = () => { if (drag != null) { drag = null; C('bump'); const t = tIdx(); C(`non ${t} 60 0.8`); setTimeout(() => C(`noff ${t} 60`), 600); } }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  function update() { const T = trk(), st = S.st, id = sid(), t = tIdx(); bar.innerHTML = ''; if (!T) return;
    if (id !== U.peaksFor) { U.peaksFor = id; U.peaks = null; if (id >= 0) { const s = SMB.peaks(id, 900); U.peaks = s ? s.split(',').map(Number) : null; } }
    const sm = st.smp.find(s => s.id === id);
    bar.append(h('div', { class: 'mid', style: `color:${color(t)};max-width:22rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap` }, sm ? sm.name : 'NO SAMPLE'), h('div', { class: 'lbl' }, sm ? sm.sec.toFixed(2) + ' S' : ''), b('LOAD A FILE', () => setView(3), false, 'mag'));
    if (T.type === 2) { const mode = Math.round(T.P[P.S_MODE] * 3), bars = Math.round(T.P[P.S_BARS] * 16), set = (k, v) => edit(`p ${t} ${k} ${v}`);
      bar.append(h('div', { style: 'width:1rem' }), ...D.SMODES.map((m, i) => b(m, () => set(P.S_MODE, i / 3), mode === i)), b('STRETCH TO TEMPO', () => set(P.S_STRETCH, T.P[P.S_STRETCH] > .5 ? 0 : 1), T.P[P.S_STRETCH] > .5, 'mag'),
        b('−', () => set(P.S_BARS, Math.max(0, bars - 1) / 16)), h('div', { class: 'lbl', style: 'width:6.5rem;text-align:center' }, bars ? bars + (bars > 1 ? ' BARS' : ' BAR') : 'NO FIT'), b('+', () => set(P.S_BARS, Math.min(16, bars + 1) / 16)), b('REVERSE', () => set(P.S_REV, T.P[P.S_REV] > .5 ? 0 : 1), T.P[P.S_REV] > .5),
        b('SLICES → NOTES', () => { const cmds = [`p ${t} ${P.S_MODE} ${2 / 3}`, `nclear ${st.pat} ${t} 0`], stp = steps() / 16; for (let k = 0; k < 16; k++) cmds.push(`n ${st.pat} ${t} ${Math.round(k * stp) * 24} ${Math.max(24, Math.round(stp) * 24)} ${60 + k} 0.9`); edit(cmds); toast('16 SLICES LAID OUT'); }),
        b('PLAY', () => { C(`non ${t} 60 0.9`); setTimeout(() => C(`noff ${t} 60`), 4000); })); }
    else if (T.type === 0) bar.append(h('div', { class: 'lbl' }, 'PAD ' + (sel('pad', 0) + 1) + ' · LOAD A FILE TO PUT YOUR OWN SOUND ON THIS PAD'));
    else bar.append(b('ADD A SAMPLER TRACK', addTrackMenu));
    requestAnimationFrame(() => draw()); }
  return { el, update };
}

// ---------------------------------------------------------------- FILES
function filesView() {
  const list = h('div', { class: 'list scroll grow panel', style: 'min-height:0' }), pathEl = h('div', { class: 'lbl grow', style: 'overflow:hidden;text-overflow:ellipsis;font-family:sans-serif;letter-spacing:.04em;text-transform:none' }), acts = h('div', { class: 'row gap', style: 'flex-wrap:wrap' }), projList = h('div', { class: 'list scroll grow panel', style: 'min-height:0' }), projName = h('div', { class: 'mid', style: 'color:var(--c)' });
  const b = (l, fn, cls = '') => h('div', { class: 'btn sm ' + cls, tap: fn }, l);
  const el = h('div', { class: 'row grow', style: 'gap:.6rem;min-height:0;align-items:stretch' },
    h('div', { class: 'col', style: 'flex:1.7;gap:.5rem;min-width:0' }, h('div', { class: 'row gap' }, b('▲ UP', () => go(U.listing ? U.listing.up : '')), pathEl, b('FIND WITH ANDROID…', () => SMB.pick(target()))), list, acts),
    h('div', { class: 'col', style: 'flex:1;gap:.5rem;min-width:0' }, h('div', { class: 'row gap' }, h('div', { class: 'lbl' }, 'SONG'), projName), h('div', { class: 'row gap', style: 'flex-wrap:wrap' }, b('SAVE', () => { const n = S.poll.proj; if (n) SMB.save(n); else saveAs(); setTimeout(update, 200); }, 'on'), b('SAVE AS', saveAs), b('NEW', () => confirmPop('START A NEW SONG?', () => { SMB.fresh('blank'); sync(true); })), b('DEMO', () => confirmPop('OPEN THE DEMO SONG?', () => { SMB.fresh('demo'); sync(true); }))), projList));
  function saveAs() { ask('NAME THIS SONG', S.poll.proj || S.st.title, (v) => { SMB.save(v.toUpperCase()); sync(true); setTimeout(update, 200); }); }
  function target() { const T = trk(); return T && T.type === 0 ? 'pad ' + sel('pad', 0) : T && T.type === 2 && T.smp < 0 ? 'track' : 'new'; }
  function go(p) { U.path = p; U.pick = ''; try { U.listing = JSON.parse(SMB.browse(p)); } catch (e) { U.listing = { path: p, up: '', dirs: [], files: [] }; } update(); }
  function update() {
    if (!U.listing) return go(U.path); const L = U.listing, T = trk(); pathEl.textContent = L.path || 'CHOOSE WHERE TO LOOK'; list.innerHTML = '';
    for (const d of L.dirs) list.append(h('div', { class: 'it', tap: () => go(d.p) }, h('span', { style: 'color:var(--c)' }, '▸'), d.n));
    for (const f of L.files) list.append(h('div', { class: 'it' + (U.pick === f.p ? ' on' : ''), tap: () => { U.pick = f.p; SMB.preview(f.p); update(); } }, h('span', { style: 'color:var(--m)' }, '♪'), f.n, h('span', { class: 'tag' }, f.k > 1024 ? (f.k / 1024).toFixed(1) + ' MB' : f.k + ' KB')));
    if (L.path && !L.dirs.length && !L.files.length) list.append(h('div', { class: 'it', style: 'color:var(--d);white-space:normal;line-height:1.5;padding:1rem', tap: () => SMB.storage() }, L.denied ? 'STRINGER MAX NEEDS PERMISSION TO SEE YOUR MUSIC FILES. TAP HERE TO ALLOW IT.' : 'NO SOUND FILES HERE. COPY SAMPLES FROM YOUR MAC INTO THE THOR\'S MUSIC FOLDER, OR USE "FIND WITH ANDROID".'));
    acts.innerHTML = ''; const pk = U.pick, ld = (tg) => { if (!pk) return toast('TAP A FILE FIRST'); SMB.load(pk, tg); setTimeout(() => sync(true), 700); };
    acts.append(h('div', { class: 'lbl' }, pk ? 'LOAD IT AS' : 'TAP A FILE TO HEAR IT'), b('A NEW TRACK', () => ld('new'), 'on'));
    if (T && T.type === 2) acts.append(b('THIS TRACK\'S SAMPLE', () => ld('track'))); if (T && T.type === 0) acts.append(b('DRUM PAD ' + (sel('pad', 0) + 1), () => ld('pad ' + sel('pad', 0)))); acts.append(b('REFERENCE SONG', () => ld('ref'), 'mag'), b('STOP', () => C('pre')));
    projName.textContent = S.poll.proj || 'NOT SAVED YET'; projList.innerHTML = ''; let ps = []; try { ps = JSON.parse(SMB.projects()); } catch (e) {}
    for (const p of ps) projList.append(h('div', { class: 'it' + (p.n === S.poll.proj ? ' on' : '') }, h('div', { class: 'grow', tap: () => confirmPop('OPEN ' + p.n + '?', () => { SMB.open(p.n); sync(true); setTimeout(update, 300); }) }, p.n), h('div', { class: 'btn sm', style: 'height:2.6rem;min-width:2.6rem', tap: () => confirmPop('DELETE ' + p.n + '?', () => { SMB.remove(p.n); setTimeout(update, 100); }) }, '✕')));
    if (!ps.length) projList.append(h('div', { class: 'it', style: 'color:var(--d)' }, 'YOUR SAVED SONGS APPEAR HERE'));
  }
  return { el, update };
}

window.addEventListener('load', () => { build(); Scene.init(document.getElementById('scene'), { cols: 18, rows: 10 }); start(); });
