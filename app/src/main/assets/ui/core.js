// STRING-R: what both screens share. The bridge to the engine, the state, the machined plates, knobs, meters, pop-ups.
'use strict';
const D = SMD, P = D.P, BAR = 384, STEP = 24;
// On the Thor the app provides SM. On a computer (tools/dev.js) the same calls go to a small local server running the real engine.
const SMB = window.SM || (() => {
  const call = (fn, a) => { const x = new XMLHttpRequest(); x.open('POST', '/sm', false); x.send(JSON.stringify([fn, ...a])); return x.responseText; };
  const o = {}; for (const f of ['cmd', 'state', 'poll', 'peaks', 'browse', 'projects', 'info', 'preview', 'load', 'pick', 'storage', 'save', 'open', 'remove', 'fresh', 'export', 'rec', 'focus', 'kits', 'saveKit', 'loadKit', 'removeKit']) o[f] = (...a) => call(f, a);
  return o;
})();
const S = { st: null, v: -1, m: null, poll: {}, lastAct: -1 };
const C = (s) => SMB.cmd(s);
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize);
const pad2 = (n) => String(n).padStart(2, '0');

function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) { const v = attrs[k]; if (k === 'class') e.className = v; else if (k === 'style') e.style.cssText = v; else if (k === 'tap') tap(e, v); else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v); }
  for (const k of kids.flat(4)) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
}
function tap(e, fn) { let sx = 0, sy = 0, ok = false; e.addEventListener('pointerdown', (ev) => { sx = ev.clientX; sy = ev.clientY; ok = true; e.classList.add('down'); });
  e.addEventListener('pointermove', (ev) => { if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) > rem() * 1.2) { ok = false; e.classList.remove('down'); } });
  e.addEventListener('pointerup', (ev) => { e.classList.remove('down'); if (ok) { ok = false; fn(ev); } }); e.addEventListener('pointercancel', () => { ok = false; e.classList.remove('down'); }); e.addEventListener('pointerleave', () => e.classList.remove('down')); }
function hold(e, down, up) { e.addEventListener('pointerdown', (ev) => { try { e.setPointerCapture(ev.pointerId); } catch (x) {} e.classList.add('down'); down(ev); }); const end = (ev) => { if (e.classList.contains('down')) { e.classList.remove('down'); up(ev); } }; e.addEventListener('pointerup', end); e.addEventListener('pointercancel', end); return e; }
const btn = (label, fn, cls = '', style = '') => h('button', { class: 'btn ' + cls, style, tap: fn }, label);
const lab = (t, cls = '') => h('span', { class: 'lab ' + cls }, t);
const two = (l, v, fn, cls = '') => h('button', { class: 'btn two ' + cls, tap: fn }, h('span', { class: 'lab' }, l), h('b', null, v));

// ---- state
const sel = (k, d = 0) => (S.st && S.st.sel && k in S.st.sel) ? S.st.sel[k] : d;
const setSel = (k, v) => { if (sel(k, -999) !== v) { C(`sel ${k} ${v}`); sync(); } };
const tIdx = () => S.st ? Math.max(0, Math.min(S.st.tracks.length - 1, sel('track', 0))) : 0;
const trk = () => S.st && S.st.tracks[tIdx()];
const edBlock = () => { const st = S.st, T = st && st.tracks[st.edT]; return T && T.blocks[st.edB] && st.edT === tIdx() ? T.blocks[st.edB] : null; };
const mark = () => C('mark');
function sync(force) { const j = SMB.state(force ? -1 : S.v); if (j) { try { S.st = JSON.parse(j); S.v = S.st.v; } catch (e) { console.log('state', e); return; } if (window.render) render(); } }
function edit(...cmds) { mark(); for (const c of cmds.flat()) C(c); sync(); }
// the placement of a block that the playhead is in, or its first one
function placeOf(t, b, tick) { const T = S.st.tracks[t]; if (!T) return null; let first = null; for (const [bar, bi] of T.pl) if (bi === b) { const B = T.blocks[bi]; if (!first) first = bar; if (tick != null && tick >= bar * BAR && tick < (bar + B.bars) * BAR) return bar; } return first; }
// choosing a track also chooses which of its blocks the note editor shows: the one under the playhead, else its first
function setTrack(t) { const st = S.st, T = st.tracks[t]; if (!T) return; C(`sel track ${t}`); const tick = S.m ? S.m.tick : 0; let b = -1; if (st.mode === 0) for (const [bar, bi] of T.pl) if (tick >= bar * BAR && tick < (bar + T.blocks[bi].bars) * BAR) b = bi; if (b < 0 && T.blocks.length) b = st.edT === t ? st.edB : 0; if (b >= 0) C(`ed ${t} ${b}`); sync(); }

let toastT = 0;
function toast(t) { const e = document.getElementById('toast'); if (!e) return; e.textContent = t; e.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('show'), 1800); }
function tick() {
  let p; try { p = JSON.parse(SMB.poll()); } catch (e) { return; } S.poll = p;
  if (p.m) { const [a, b] = p.m.split(';'); const f = a.split(',').map(Number); S.m = { v: f[0], playing: f[1], mode: f[2], tick: f[3], bars: f[4], mom: f[5], short: f[6], integ: f[7], lim: f[8], glue: f[9], pkL: f[10], pkR: f[11], inPk: f[12], recSec: f[13], cpu: f[14], trk: f.slice(15), inStrip: Number(b) };
    if (S.m.v !== S.v) sync(); }
  CUR.lx = p.lx || 0; CUR.ly = p.ly || 0;
  if (p.acts && p.acts.length) { if (S.lastAct < 0) S.lastAct = p.acts[p.acts.length - 1][0]; for (const [n, name] of p.acts) if (n > S.lastAct) { S.lastAct = n; if (name === 'A1' || name === 'A0') curPress(name === 'A1'); else if (window.onAct) onAct(name); } } else if (S.lastAct < 0) S.lastAct = 0;
  if (p.notice && p.notice !== tick.last) toast(p.notice); tick.last = p.notice;
  const bz = document.getElementById('busy'); if (bz) { bz.classList.toggle('show', !!p.busy && p.busy !== 'LOADING'); bz.textContent = p.busy || ''; }
  if (S.st && S.m && window.onMeters) onMeters();
}
function start() { sync(true); setInterval(tick, 50); tick(); if (document.documentElement.classList.contains('top')) curStart(); }

// ---- the stick cursor (top screen): the left stick moves a small chrome sword, A presses whatever its tip is on. Holding A and moving drags.
// It sends the same pointer events a finger does, so everything that works by touch works with it.
const CUR = { lx: 0, ly: 0, x: 0, y: 0, on: false, el: null, target: null, t: 0 };
const CURSVG = "<svg viewBox='0 0 52 52' width='100%' height='100%'><defs><linearGradient id='cg' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#fff'/><stop offset='.45' stop-color='#c9cdfb'/><stop offset='.6' stop-color='#5a5fc4'/><stop offset='1' stop-color='#eef0ff'/></linearGradient></defs><path d='M2 2 L15 8 L31 27 L27 31 L8 15 Z' fill='url(#cg)' stroke='#0d0a2e' stroke-width='1.4' stroke-linejoin='round'/><path d='M2 2 L29 29' stroke='#fff' stroke-width='1' opacity='.8'/><path d='M22 36 L36 22 L39 25 L25 39 Z' fill='url(#cg)' stroke='#0d0a2e' stroke-width='1.4'/><path d='M31 31 L37 37' stroke='#0d0a2e' stroke-width='6' stroke-linecap='round'/><path d='M31 31 L37 37' stroke='#a9a3f0' stroke-width='3.2' stroke-linecap='round'/><path d='M42 49 C34 44 33 38 37 36 C40 35 42 37 42 39 C43 36 46 35 48 37 C51 40 48 45 42 49 Z' fill='#ff7ad9' stroke='#0d0a2e' stroke-width='1.4'/><path d='M38.5 38.5 C39.5 37.6 40.6 38 41 39' stroke='#fff' stroke-width='1.2' fill='none' stroke-linecap='round'/></svg>";
function curStart() { CUR.el = h('div', { id: 'cur' }); CUR.el.innerHTML = CURSVG; document.body.append(CUR.el); CUR.x = innerWidth / 2; CUR.y = innerHeight / 2; CUR.t = performance.now();
  addEventListener('pointerdown', (e) => { if (e.isTrusted && CUR.on && !CUR.target) curShow(false); }, true); requestAnimationFrame(curFrame); }
function curShow(on) { CUR.on = on; CUR.el.style.display = on ? 'block' : 'none'; }
function curPlace() { CUR.el.style.transform = `translate(${CUR.x.toFixed(1)}px,${CUR.y.toFixed(1)}px)`; }
function curEvent(type, target) { const e = new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, clientX: CUR.x, clientY: CUR.y, pointerId: 77, pointerType: 'mouse', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1 }); (target || document.body).dispatchEvent(e); }
function curFrame(now) { const dt = Math.min(0.05, (now - CUR.t) / 1000); CUR.t = now; const m = Math.hypot(CUR.lx, CUR.ly);
  if (m > 0.01) { if (!CUR.on) curShow(true); const sp = rem() * (6 + 46 * m * m) * dt / m; CUR.x = clamp(CUR.x + CUR.lx * sp, 0, innerWidth - 1); CUR.y = clamp(CUR.y + CUR.ly * sp, 0, innerHeight - 1); curPlace(); if (CUR.target) curEvent('pointermove', CUR.target); }
  requestAnimationFrame(curFrame); }
function curPress(down) { if (!CUR.el) return;
  if (down) { if (!CUR.on) { curShow(true); curPlace(); return; } if (CUR.target) return; const t = document.elementFromPoint(CUR.x, CUR.y); if (!t) return; CUR.target = t; CUR.el.classList.add('down'); curEvent('pointerdown', t); }
  else if (CUR.target) { const t = CUR.target; CUR.target = null; CUR.el.classList.remove('down'); if (t.isConnected) curEvent('pointerup', t); else curEvent('pointerup', document.body); } }
const meterFrac = (pk) => pk <= 0.0005 ? 0 : clamp((20 * Math.log10(pk) + 54) / 54);
function leds(cls = '', style = '') { const i = h('i'); const e = h('div', { class: 'leds ' + cls, style }, i); let cur = 0; e.set = (f) => { cur = f > cur ? f : cur * 0.8 + f * 0.2; const pc = (cur * 100).toFixed(1) + '%'; if (cls.includes('v')) i.style.height = pc; else i.style.width = pc; }; return e; }

// ---- the machined plates behind the controls (drawn once per screen as one picture)
const DEFS = `<defs>
<linearGradient id="plate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3e0ff"/><stop offset="0.08" stop-color="#bdb9f6"/><stop offset="0.5" stop-color="#9692e0"/><stop offset="0.92" stop-color="#6f6bc2"/><stop offset="1" stop-color="#4a4698"/></linearGradient>
<linearGradient id="plateH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6f6bc2"/><stop offset="0.5" stop-color="#b4b0f2"/><stop offset="0.86" stop-color="#8f8bdc"/><stop offset="1" stop-color="#57539f"/></linearGradient>
<linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.2" stop-color="#b9c2f2"/><stop offset="0.45" stop-color="#2f348c"/><stop offset="0.52" stop-color="#f1f3ff"/><stop offset="0.74" stop-color="#7b84d6"/><stop offset="1" stop-color="#151848"/></linearGradient>
<pattern id="circuit" width="96" height="96" patternUnits="userSpaceOnUse"><g fill="none" stroke="#1b1766" stroke-opacity="0.34" stroke-width="1.5"><path d="M0 12 H30 L42 24 H96"/><path d="M12 0 V40 L24 52 V96"/><path d="M60 0 V18 L72 30 H96"/><path d="M0 70 H18 L30 82 H64 L76 70 H96"/><path d="M48 96 V60 L60 48 H84"/></g><g fill="#1b1766" fill-opacity="0.45"><circle cx="30" cy="12" r="3"/><circle cx="24" cy="52" r="3"/><circle cx="72" cy="30" r="3"/><circle cx="84" cy="48" r="3"/><rect x="40" y="76" width="10" height="6"/></g></pattern>
<pattern id="brush" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="1" fill="#14104a" fill-opacity="0.16"/></pattern>
<pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#ffffff" fill-opacity="0.07"/></pattern>
<filter id="blur3"><feGaussianBlur stdDeviation="3"/></filter>
</defs>`;
const PL = {
  plate: (pts, grad = 'plate', extra = '') => { const p = pts.map(q => q.join(',')).join(' '); return `<g><polygon points="${p}" fill="#000" opacity="0.7" transform="translate(0 7)"/><polygon points="${p}" fill="url(#${grad})"/><polygon points="${p}" fill="url(#circuit)"/><polygon points="${p}" fill="url(#brush)"/><polygon points="${p}" fill="none" stroke="#f3f1ff" stroke-width="2.5"/>${extra}</g>`; },
  rivet: (x, y) => `<circle cx="${x}" cy="${y}" r="7" fill="url(#chrome)" stroke="#1a1660" stroke-width="1.5"/><path d="M${x - 4} ${y} H${x + 4}" stroke="#1a1660" stroke-width="1.5"/>`,
  vent: (x, y, n, w = 44) => Array.from({ length: n }, (_, i) => `<rect x="${x}" y="${y + i * 10}" width="${w}" height="5" rx="2.5" fill="#0d0a2e" opacity="0.85"/><rect x="${x}" y="${y + i * 10 + 5}" width="${w}" height="1" fill="#fff" opacity="0.5"/>`).join(''),
  barcode: (x, y, hh = 30, seed = 7) => { let o = '', cx = x; for (let i = 0; i < 34; i++) { seed = (seed * 73 + 19) % 101; const w = 2 + seed % 5; if (i % 2 === 0) o += `<rect x="${cx}" y="${y}" width="${w}" height="${hh}" fill="#0d0a2e"/>`; cx += w; } return o; },
  text: (x, y, t, size = 14, fill = '#0d0a2e', op = 0.8, anchor = 'start') => `<text x="${x}" y="${y}" font-family="Mono, monospace" font-size="${size}" letter-spacing="2" fill="${fill}" fill-opacity="${op}" text-anchor="${anchor}">${t}</text>`,
  cross: (x, y) => `<path d="M${x - 10} ${y} H${x + 10} M${x} ${y - 10} V${y + 10}" stroke="#cfcaff" stroke-width="1.5" opacity="0.8"/>`,
  laser: (x, y, w) => `<rect x="${x}" y="${y - 6}" width="${w}" height="14" fill="#b04bff" opacity="0.22" filter="url(#blur3)"/><rect x="${x}" y="${y}" width="${w}" height="3" fill="#b04bff"/><rect x="${x}" y="${y + 1}" width="${w}" height="1" fill="#fff"/>`,
};
function setPlates(W, H, inner) { document.getElementById('plates').outerHTML = `<svg id="plates" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${DEFS}${inner}</svg>`; }
// the chrome sculpture behind each view; it breathes a little with the music
let bgName = '';
function setBg(name, dim) { const e = document.getElementById('bg'); if (name !== bgName) { bgName = name; e.style.backgroundImage = `url(bg/${name}.jpg)`; } document.getElementById('dim').style.background = `rgba(0,0,6,${dim})`; }
let bgLv = 0, bgBeat = 0;
function pulseBg(level, kick) { bgLv += (level - bgLv) * 0.2; if (kick) bgBeat = 1; bgBeat *= 0.82; const e = document.getElementById('bg'); e.style.transform = `scale(${(1.02 + bgBeat * 0.012).toFixed(4)})`; e.style.filter = `brightness(${(0.9 + bgLv * 0.25 + bgBeat * 0.2).toFixed(3)})`; }

// ---- knob: a chrome bezel, a ring of 27 lights, an LCD face. Drag up and down. o = { label, get, set, steps, fmt, focus, def, small }
function knob(o) {
  const el = h('div', { class: 'knob' + (o.small ? ' s' : '') }); const ns = 'http://www.w3.org/2000/svg', mk = (t, a) => { const e = document.createElementNS(ns, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const svg = mk('svg', { viewBox: '0 0 160 160' }), ticks = [];
  for (let k = 0; k < 27; k++) { const a = (135 + 270 * k / 26) * Math.PI / 180; const l = mk('line', { x1: 80 + 62 * Math.cos(a), y1: 80 + 62 * Math.sin(a), x2: 80 + 74 * Math.cos(a), y2: 80 + 74 * Math.sin(a), 'stroke-width': 5, stroke: '#2f2a78' }); ticks.push(l); svg.append(l); }
  svg.append(mk('circle', { cx: 80, cy: 80, r: 54, fill: 'url(#chrome)', stroke: '#f3f1ff', 'stroke-width': 2 }), mk('circle', { cx: 80, cy: 80, r: 43, fill: '#07051c', stroke: '#1a1660', 'stroke-width': 3 }), mk('circle', { cx: 80, cy: 80, r: 43, fill: 'url(#scan)' }));
  const ptr = mk('line', { stroke: '#fff', 'stroke-width': 5, 'stroke-linecap': 'round' }), txt = mk('text', { x: 80, y: 91, 'text-anchor': 'middle', fill: '#fff', 'font-family': 'Mich, sans-serif', 'font-size': 28 }); svg.append(ptr, txt);
  el.append(svg, h('div', { class: 'kl' }, o.label));
  const text = (v) => o.steps ? o.steps[Math.min(o.steps.length - 1, Math.round(v * (o.stepMax || o.steps.length - 1)))] : o.fmt ? o.fmt(v) : String(Math.round(v * 100));
  let lastLit = -1, lastT = '';
  el.upd = () => { const v = clamp(o.get()), lit = Math.round(v * 27); if (lit !== lastLit) { lastLit = lit; ticks.forEach((t, k) => t.setAttribute('stroke', k < lit ? (k >= 23 ? '#ff7ad9' : '#e9e6ff') : '#2f2a78')); }
    const a = (135 + 270 * v) * Math.PI / 180; ptr.setAttribute('x1', 80 + 30 * Math.cos(a)); ptr.setAttribute('y1', 80 + 30 * Math.sin(a)); ptr.setAttribute('x2', 80 + 52 * Math.cos(a)); ptr.setAttribute('y2', 80 + 52 * Math.sin(a));
    const t = text(v); if (t !== lastT) { lastT = t; txt.textContent = t; const long = t.length > 3; txt.setAttribute('font-size', long ? (t.length > 6 ? 12 : 16) : 28); txt.setAttribute('y', long ? 87 : 91); } };
  let sy = 0, sv = 0, on = false, lastTap = 0;
  el.addEventListener('pointerdown', (e) => { try { el.setPointerCapture(e.pointerId); } catch (x) {} on = true; sy = e.clientY; sv = clamp(o.get()); mark(); document.querySelectorAll('.knob.focus').forEach(k => k.classList.remove('focus')); el.classList.add('focus'); if (o.focus) SMB.focus(o.focus);
    const now = Date.now(); if (now - lastTap < 320 && o.def != null) { o.set(o.def); el.upd(); } lastTap = now; });
  el.addEventListener('pointermove', (e) => { if (!on) return; let v = clamp(sv + (sy - e.clientY) / (rem() * 22)); if (o.steps) { const n = o.stepMax || o.steps.length - 1; v = Math.round(v * n) / n; } if (v !== o.get()) { o.set(v); el.upd(); } });
  const end = () => { if (on) { on = false; C('bump'); } }; el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  el.upd(); return el;
}
// put text in a one-line box so that it always fits: first a smaller size, then fewer letters. The box must already be on the page.
function fitTxt(e, t, min = 0.62) { e.style.whiteSpace = 'nowrap'; e.style.overflow = 'hidden'; e.style.fontSize = ''; e.textContent = t; if (!e.isConnected || !e.clientWidth) return e; let fs = parseFloat(getComputedStyle(e).fontSize) / rem(); while (e.scrollWidth > e.clientWidth && fs > min) { fs -= 0.04; e.style.fontSize = fs + 'rem'; } let n = t.length; while (e.scrollWidth > e.clientWidth && n > 3) e.textContent = t.slice(0, --n - 1) + '…'; return e; }
const noteName = (n) => D.NOTES[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1);
const FMT = { [P.PAN]: (v) => Math.abs(v - .5) < .02 ? 'C' : (v < .5 ? 'L' : 'R') + Math.round(Math.abs(v - .5) * 200), [P.SHIFT]: (v) => { const s = Math.round((v - .5) * 24); return (s > 0 ? '+' : '') + s; }, [P.EQLO]: (v) => ((v - .5) * 24).toFixed(0), [P.EQMID]: (v) => ((v - .5) * 24).toFixed(0), [P.EQHI]: (v) => ((v - .5) * 24).toFixed(0) };
const DEF = { [P.PAN]: .5, [P.SHIFT]: .5, [P.EQLO]: .5, [P.EQMID]: .5, [P.EQHI]: .5, [P.VOL]: .75, [P.CUT]: 1 };
// a knob for a track parameter (t = 16 is the live input)
function pknob(t, [idx, label, steps, stepMax], small) {
  const arr = () => t === 16 ? S.st.inP : (S.st.tracks[t] ? S.st.tracks[t].P : []);
  const o = { label, steps, stepMax, small, focus: `p ${t} ${idx}`, get: () => arr()[idx] || 0, set: (v) => { arr()[idx] = v; C(`p ${t} ${idx} ${v.toFixed(4)}`); } };
  if (idx < 16) { if (FMT[idx]) o.fmt = FMT[idx]; if (idx in DEF) o.def = DEF[idx]; } else if (label === 'ROOT NOTE') o.fmt = (v) => noteName(Math.round(v * 127)); else if (label === 'PITCH') o.fmt = (v) => noteName(Math.round(v * 127));
  return knob(o);
}
const kgrid = (cols, kids, style = '') => h('div', { class: 'kgrid', style: `grid-template-columns:repeat(${cols},minmax(0,1fr));${style}` }, kids);

// ---- pop-ups
function closePop() { document.querySelectorAll('.pop').forEach(p => p.remove()); }
function popup(title, body, w) { closePop(); const p = h('div', { class: 'pop', onpointerdown: (e) => { if (e.target === p) closePop(); } }, h('div', { class: 'card', style: `width:${w || 56}rem` }, h('div', { class: 'row gap' }, h('div', { class: 'mich chrome grow', style: 'font-size:1.4rem;letter-spacing:.2rem' }, title), btn('CLOSE', closePop)), body)); document.body.append(p); return p; }
function choose(title, items, fn, cols = 3, w) { popup(title, h('div', { class: 'scroll', style: `display:grid;grid-template-columns:repeat(${cols},1fr);gap:.5rem;max-height:70vh` }, items.map((it, i) => btn(it.label || it, () => { closePop(); fn(i, it); }, it.on ? 'on' : '', 'height:3.6rem'))), w); }
function ask(title, value, fn) { const done = () => { const v = inp.value.trim(); closePop(); if (v) fn(v); }, inp = h('input', { class: 'txt grow', value: value || '', maxlength: 24, enterkeyhint: 'done', onkeydown: (e) => { if (e.key === 'Enter') done(); } }); popup(title, h('div', { class: 'row gap' }, inp, btn('OK', done, 'on')), 46).classList.add('high'); setTimeout(() => { inp.focus(); inp.select(); }, 50); }
function confirmPop(title, fn) { popup(title, h('div', { class: 'row gap' }, btn('NO', closePop, '', 'flex:1'), btn('YES', () => { closePop(); fn(); }, 'on', 'flex:1')), 36); }

// ---- things both screens do
function transport(name) {
  const st = S.st; if (!st) return;
  if (name === 'PLAY') { C(st.playing ? 'stop' : 'play'); sync(); }
  else if (name === 'REC') { C('rec ' + (st.rec ? 0 : 1)); sync(); }
  else if (name === 'TRACK-' || name === 'TRACK+') setTrack(clamp(tIdx() + (name === 'TRACK+' ? 1 : -1), 0, st.tracks.length - 1));
  else if (name === 'PAT-' || name === 'PAT+') { const T = trk(); if (T && T.blocks.length) { const b = ((st.edT === tIdx() ? st.edB : 0) + (name === 'PAT+' ? 1 : T.blocks.length - 1)) % T.blocks.length; C(`ed ${tIdx()} ${b}`); sync(); } }
}
function applySound(t, s) { const cmds = [`trk eng ${t} ${s.eng}`, `trk name ${t} "${s.name}"`]; const base = { 2: .8, 3: .15, 5: 0, 6: 0, 7: 0, 12: .5, 16: .02, 17: .45, 18: .7, 19: .3, 20: .45, 21: .3, 22: .3, 23: .4, 24: 0, 25: .6, 26: .5, 27: 0, 31: .4, 32: 0, 33: 0 };
  for (const [k, v] of Object.entries({ ...base, ...s.p })) cmds.push(`p ${t} ${k} ${v}`); edit(cmds); }
function applyKit(t, k) { const cmds = []; for (let i = 0; i < 16; i++) { const p = k.pads[i]; cmds.push(p ? `pad ${t} ${i} ${p.type} ${p.tune} ${p.decay} ${p.level} ${p.pan} ${p.tone} -1` : `pad ${t} ${i} 10 0.5 0.5 0.8 0.5 0.5 -1`); } cmds.push(`p ${t} 16 ${k.rumble}`, `p ${t} 6 ${k.crush || 0}`, `trk name ${t} "${k.name} KIT"`); edit(cmds); }
// every new track starts with one four-bar block, placed at the first free spot from the playhead
function addTrackMenu() { choose('ADD A TRACK', ['DRUM MACHINE', 'SYNTH', 'SAMPLER / AUDIO', 'FM-1 OVER MIDI'], (i) => { mark(); const t = parseInt(C('trk add ' + i)); if (t >= 0) { if (i === 0) applyKit(t, D.KITS[0]); if (i === 1) applySound(t, D.SOUNDS[0]); C(`blk add ${t} 4 "BLOCK 1"`); C(`pl add ${t} 0 0`); C(`ed ${t} 0`); C('sel track ' + t); } else toast('16 TRACKS IS THE LIMIT'); sync(); }, 2, 46); }
