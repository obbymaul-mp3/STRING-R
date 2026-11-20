// STRING-R: what both screens share. The bridge to the engine, the state, the machined plates, knobs, meters, pop-ups.
'use strict';
const D = SMD, P = D.P, BAR = 384, STEP = 24;
// On the Thor the app provides SM. On a computer (tools/dev.js) the same calls go to a small local server running the real engine.
const SMB = window.SM || (() => {
  const call = (fn, a) => { const x = new XMLHttpRequest(); x.open('POST', '/sm', false); x.send(JSON.stringify([fn, ...a])); return x.responseText; };
  const o = {}; for (const f of ['cmd', 'state', 'poll', 'peaks', 'browse', 'projects', 'info', 'preview', 'load', 'pick', 'storage', 'save', 'open', 'remove', 'fresh', 'export', 'rec', 'focus', 'kits', 'saveKit', 'loadKit', 'removeKit', 'hsPut', 'hsGet', 'kitPads']) o[f] = (...a) => call(f, a);
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
function tick() { if (S.st && sel('fitv', 0) !== FIT.seen) { FIT.seen = sel('fitv', 0); fitApply(); }
  let p; try { p = JSON.parse(SMB.poll()); } catch (e) { return; } S.poll = p;
  if (p.m) { const [a, b] = p.m.split(';'); const f = a.split(',').map(Number); S.m = { v: f[0], playing: f[1], mode: f[2], tick: f[3], bars: f[4], mom: f[5], short: f[6], integ: f[7], lim: f[8], glue: f[9], pkL: f[10], pkR: f[11], inPk: f[12], recSec: f[13], cpu: f[14], trk: f.slice(15), inStrip: Number(b) };
    if (S.m.v !== S.v) sync(); }
  CUR.lx = p.lx || 0; CUR.ly = p.ly || 0;
  if (p.acts && p.acts.length) { if (S.lastAct < 0) S.lastAct = p.acts[p.acts.length - 1][0]; for (const [n, name] of p.acts) if (n > S.lastAct) { S.lastAct = n; if ((name === 'A1' || name === 'A0') && CUR.el && (CUR.on || CUR.target)) curPress(name === 'A1'); else { if (CUR.el && CUR.on && ['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(name)) curShow(false); if (window.onAct) onAct(name); } } } else if (S.lastAct < 0) S.lastAct = 0;
  if (p.notice && p.notice !== tick.last) toast(p.notice); tick.last = p.notice;
  const bz = document.getElementById('busy'); if (bz) { bz.classList.toggle('show', !!p.busy && p.busy !== 'LOADING'); bz.textContent = p.busy || ''; }
  if (S.st && S.m && window.onMeters) onMeters();
}
// ---- fitting the picture to the glass. The whole interface is drawn on a 54-unit-tall stage; this decides how big a unit is and where the stage sits.
// It trusts the smallest answer it can get: the page's own size, what Android says is actually visible, and a trim the user sets by hand
// on the start screen (for a panel that hides a strip the system does not report).
const FIT = { vis: null, info: '', seen: -1, trim: () => { const k = document.documentElement.classList.contains('top') ? 'smfitT' : 'smfitB'; let v = 0; try { v = parseFloat(localStorage.getItem(k)) || 0; } catch (e) {} return clamp(v, 0, 25); } };
function fitApply() {
  const de = document.documentElement, top = de.classList.contains('top'), SW = top ? 96 : 62, SH = 54, st = document.getElementById('stage'); if (!st) return;
  let W = Math.min(innerWidth, de.clientWidth || 1e9), H = Math.min(innerHeight, de.clientHeight || 1e9, window.visualViewport ? visualViewport.height : 1e9), ox = 0, oy = 0;
  const v = FIT.vis; if (v && v.vw > 0 && v.r > v.l && v.b > v.t) { const k = innerWidth / v.vw; ox = v.l * k; oy = v.t * k; W = Math.min(W - ox, (v.r - v.l) * k); H = Math.min(H - oy, (v.b - v.t) * k); }
  H *= 1 - FIT.trim() / 100; const r = Math.max(4, Math.min(W / SW, H / SH));
  de.style.fontSize = r + 'px'; st.style.left = (ox + (W - SW * r) / 2) + 'px'; st.style.top = (oy + (H - SH * r) / 2) + 'px';
}
function SMFIT(vw, vh, l, t, r, b, info) { FIT.vis = { vw, vh, l, t, r, b }; FIT.info = info || ''; fitApply(); }
function fitSet(which, d) { const k = which === 'top' ? 'smfitT' : 'smfitB'; let v = 0; try { v = parseFloat(localStorage.getItem(k)) || 0; v = clamp(v + d, 0, 25); localStorage.setItem(k, String(v)); } catch (e) {} C('sel fitv ' + ((sel('fitv', 0) + 1) % 1000)); sync(); fitApply(); return v; }
function fitGet(which) { try { return parseFloat(localStorage.getItem(which === 'top' ? 'smfitT' : 'smfitB')) || 0; } catch (e) { return 0; } }
window.addEventListener('resize', fitApply); window.addEventListener('DOMContentLoaded', fitApply);
function start() { sync(true); setInterval(tick, 50); tick(); if (document.documentElement.classList.contains('top')) curStart(); }

// ---- the stick cursor (top screen): the left stick moves a small chrome sword, A presses whatever its tip is on. Holding A and moving drags.
// It sends the same pointer events a finger does, so everything that works by touch works with it.
const CUR = { lx: 0, ly: 0, x: 0, y: 0, on: false, el: null, target: null, t: 0 };
const CURSVG = "<svg viewBox='0 0 12 12' width='100%' height='100%' shape-rendering='crispEdges'><rect x='0' y='0' width='1' height='1' fill='#1a0b33'/><rect x='1' y='0' width='1' height='1' fill='#1a0b33'/><rect x='0' y='1' width='1' height='1' fill='#1a0b33'/><rect x='1' y='1' width='1' height='1' fill='#ffffff'/><rect x='2' y='1' width='1' height='1' fill='#1a0b33'/><rect x='1' y='2' width='1' height='1' fill='#1a0b33'/><rect x='2' y='2' width='1' height='1' fill='#ffffff'/><rect x='3' y='2' width='1' height='1' fill='#1a0b33'/><rect x='2' y='3' width='1' height='1' fill='#1a0b33'/><rect x='3' y='3' width='1' height='1' fill='#ffffff'/><rect x='4' y='3' width='1' height='1' fill='#1a0b33'/><rect x='3' y='4' width='1' height='1' fill='#1a0b33'/><rect x='4' y='4' width='1' height='1' fill='#ffffff'/><rect x='5' y='4' width='1' height='1' fill='#1a0b33'/><rect x='4' y='5' width='1' height='1' fill='#1a0b33'/><rect x='5' y='5' width='1' height='1' fill='#ffffff'/><rect x='6' y='5' width='1' height='1' fill='#1a0b33'/><rect x='8' y='5' width='1' height='1' fill='#1a0b33'/><rect x='9' y='5' width='1' height='1' fill='#1a0b33'/><rect x='5' y='6' width='1' height='1' fill='#1a0b33'/><rect x='6' y='6' width='1' height='1' fill='#ffffff'/><rect x='7' y='6' width='1' height='1' fill='#1a0b33'/><rect x='8' y='6' width='1' height='1' fill='#f2c14e'/><rect x='9' y='6' width='1' height='1' fill='#1a0b33'/><rect x='6' y='7' width='1' height='1' fill='#1a0b33'/><rect x='7' y='7' width='1' height='1' fill='#f2c14e'/><rect x='8' y='7' width='1' height='1' fill='#1a0b33'/><rect x='5' y='8' width='1' height='1' fill='#1a0b33'/><rect x='6' y='8' width='1' height='1' fill='#f2c14e'/><rect x='7' y='8' width='1' height='1' fill='#1a0b33'/><rect x='8' y='8' width='1' height='1' fill='#ff5fb4'/><rect x='9' y='8' width='1' height='1' fill='#1a0b33'/><rect x='5' y='9' width='1' height='1' fill='#1a0b33'/><rect x='6' y='9' width='1' height='1' fill='#1a0b33'/><rect x='8' y='9' width='1' height='1' fill='#1a0b33'/><rect x='9' y='9' width='1' height='1' fill='#ff5fb4'/><rect x='10' y='9' width='1' height='1' fill='#1a0b33'/><rect x='9' y='10' width='1' height='1' fill='#1a0b33'/><rect x='10' y='10' width='1' height='1' fill='#ff5fb4'/><rect x='11' y='10' width='1' height='1' fill='#1a0b33'/><rect x='10' y='11' width='1' height='1' fill='#1a0b33'/><rect x='11' y='11' width='1' height='1' fill='#1a0b33'/></svg>";
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
<linearGradient id="plate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26145c" stop-opacity="0.9"/><stop offset="1" stop-color="#0e072c" stop-opacity="0.93"/></linearGradient>
<linearGradient id="plateH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26145c" stop-opacity="0.9"/><stop offset="1" stop-color="#0e072c" stop-opacity="0.93"/></linearGradient>
<linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a46b4"/><stop offset="1" stop-color="#1d1150"/></linearGradient>
</defs>`;
// the windows behind the controls: indigo, a parchment edge, an ink line outside it (drawn once per screen as one picture)
const PL = {
  plate: (pts, grad = 'plate', extra = '') => { const p = pts.map(q => q.join(',')).join(' '); return `<g><polygon points="${p}" fill="#000" opacity="0.5" transform="translate(8 10)"/><polygon points="${p}" fill="url(#${grad})" stroke="#1a0b33" stroke-width="12" stroke-linejoin="miter"/><polygon points="${p}" fill="none" stroke="#f4e6c4" stroke-width="4" stroke-linejoin="miter"/>${extra}</g>`; },
  rivet: (x, y) => `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" fill="#f2c14e" stroke="#1a0b33" stroke-width="3" transform="rotate(45 ${x} ${y})"/>`,
  vent: () => '', barcode: () => '',
  text: (x, y, t, size = 14, fill = '#b9a8ff', op = 0.8, anchor = 'start') => `<text x="${x}" y="${y}" font-family="Mono, monospace" font-size="${size + 4}" letter-spacing="2" fill="${fill === '#1a0b33' ? '#b9a8ff' : fill}" fill-opacity="${Math.max(op, 0.9)}" text-anchor="${anchor}">${t}</text>`,
  cross: (x, y) => `<rect x="${x - 5}" y="${y - 5}" width="10" height="10" fill="#ff5fb4" stroke="#1a0b33" stroke-width="3" transform="rotate(45 ${x} ${y})"/>`,
  laser: (x, y, w) => `<rect x="${x}" y="${y - 2}" width="${w}" height="8" fill="#1a0b33"/><rect x="${x}" y="${y}" width="${w}" height="4" fill="#f2c14e"/>`,
};
function setPlates(W, H, inner) { document.getElementById('plates').outerHTML = `<svg id="plates" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${DEFS}${inner}</svg>`; }
// the low-poly scene behind each view; it breathes a little with the music
let bgName = '';
function setBg(name, dim) { const e = document.getElementById('bg'); if (name !== bgName) { bgName = name; e.style.backgroundImage = `url(bg/${name}.jpg)`; } document.getElementById('dim').style.background = `rgba(0,0,6,${dim})`; }
let bgLv = 0, bgBeat = 0;
function pulseBg(level, kick) { bgLv += (level - bgLv) * 0.2; if (kick) bgBeat = 1; bgBeat *= 0.82; const e = document.getElementById('bg'); e.style.transform = `scale(${(1.02 + bgBeat * 0.012).toFixed(4)})`; e.style.filter = `brightness(${(0.9 + bgLv * 0.25 + bgBeat * 0.2).toFixed(3)})`; }

// ---- dial: an eight-sided face, a ring of 27 gold lights, the number in the middle. Drag up and down. o = { label, get, set, steps, fmt, focus, def, small }
function knob(o) {
  const el = h('div', { class: 'knob' + (o.small ? ' s' : '') }); const ns = 'http://www.w3.org/2000/svg', mk = (t, a) => { const e = document.createElementNS(ns, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const svg = mk('svg', { viewBox: '0 0 160 160' }), ticks = [], oct = (r) => Array.from({ length: 8 }, (_, k) => { const a = (22.5 + 45 * k) * Math.PI / 180; return (80 + r * Math.cos(a)).toFixed(1) + ',' + (80 + r * Math.sin(a)).toFixed(1); }).join(' ');
  svg.append(mk('polygon', { points: oct(80), fill: '#1a0b33' }));
  for (let k = 0; k < 27; k++) { const a = (135 + 270 * k / 26) * Math.PI / 180; const l = mk('line', { x1: 80 + 58 * Math.cos(a), y1: 80 + 58 * Math.sin(a), x2: 80 + 72 * Math.cos(a), y2: 80 + 72 * Math.sin(a), 'stroke-width': 8, stroke: '#2a1a66' }); ticks.push(l); svg.append(l); }
  svg.append(mk('polygon', { points: oct(57), fill: 'url(#chrome)', stroke: '#1a0b33', 'stroke-width': 4 }));
  const ptr = mk('line', { stroke: '#f4e6c4', 'stroke-width': 6 }), txt = mk('text', { x: 80, y: 92, 'text-anchor': 'middle', fill: '#fff', 'font-family': 'Mich, sans-serif', 'font-size': 30 }); svg.append(ptr, txt);
  el.append(svg, h('div', { class: 'kl' }, o.label));
  const text = (v) => o.steps ? o.steps[Math.min(o.steps.length - 1, Math.round(v * (o.stepMax || o.steps.length - 1)))] : o.fmt ? o.fmt(v) : String(Math.round(v * 100));
  let lastLit = -1, lastT = '';
  el.upd = () => { const v = clamp(o.get()), lit = Math.round(v * 27); if (lit !== lastLit) { lastLit = lit; ticks.forEach((t, k) => t.setAttribute('stroke', k < lit ? (k >= 23 ? '#ff5fb4' : '#f2c14e') : '#2a1a66')); }
    const a = (135 + 270 * v) * Math.PI / 180; ptr.setAttribute('x1', 80 + 40 * Math.cos(a)); ptr.setAttribute('y1', 80 + 40 * Math.sin(a)); ptr.setAttribute('x2', 80 + 52 * Math.cos(a)); ptr.setAttribute('y2', 80 + 52 * Math.sin(a));
    const t = text(v); if (t !== lastT) { lastT = t; txt.textContent = t; const long = t.length > 3; txt.setAttribute('font-size', long ? (t.length > 6 ? 14 : 19) : 30); txt.setAttribute('y', long ? 88 : 92); } };
  let sy = 0, sv = 0, on = false, lastTap = 0;
  el.addEventListener('pointerdown', (e) => { try { el.setPointerCapture(e.pointerId); } catch (x) {} on = true; sy = e.clientY; sv = clamp(o.get()); mark(); document.querySelectorAll('.knob.focus').forEach(k => k.classList.remove('focus')); el.classList.add('focus'); if (o.focus) SMB.focus(o.focus);
    const now = Date.now(); if (now - lastTap < 320 && o.def != null) { o.set(o.def); el.upd(); } lastTap = now; });
  el.addEventListener('pointermove', (e) => { if (!on) return; let v = clamp(sv + (sy - e.clientY) / (rem() * 22)); if (o.steps) { const n = o.stepMax || o.steps.length - 1; v = Math.round(v * n) / n; } if (v !== o.get()) { o.set(v); el.upd(); } });
  const end = () => { if (on) { on = false; C('bump'); } }; el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  // the same dial from the buttons: one click up or down, and back to where it started
  el.nudge = (d) => { mark(); let v = clamp(o.get()); if (o.steps) { const n = o.stepMax || o.steps.length - 1; v = clamp(Math.round(v * n) / n + d / n); } else v = clamp(Math.round((v + d * 0.02) * 100) / 100); o.set(v); el.upd(); if (o.focus) SMB.focus(o.focus); C('bump'); };
  el.resetV = () => { if (o.def == null) return false; mark(); o.set(o.def); el.upd(); C('bump'); return true; }; el.focusMe = () => { if (o.focus) SMB.focus(o.focus); };
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

// ---- the ladder. The app is four rungs, left to right, from the whole song down to one sound: SONG > BLOCK > NOTES > SOUND.
// L steps out, R steps in. On every rung the four face buttons mean the same thing: A does, B deletes, X copies, Y pastes.
// The big screen shows the rung; the small screen shows the controls for whatever the sword is on.
const RUNGS = ['SONG', 'BLOCK', 'NOTES', 'SOUND'], RVIEW = [0, 4, 1, 5];
const LEGEND = [['PLACE · OPEN', 'DELETE', 'COPY', 'PASTE'], ['USE THIS', 'DELETE', 'COPY', 'PASTE NEW'], ['NOTE ON/OFF', 'DELETE', 'COPY BAR', 'PASTE BAR'], ['HEAR IT', 'RESET DIAL', 'COPY SOUND', 'PASTE SOUND']];
// a button press that starts on the small screen and is meant for the big one travels through the shared state, with a counter so repeats count
const XA = ['A', 'B', 'X', 'Y', 'L1', 'R1', 'A+LEFT', 'A+RIGHT', 'NEW', 'CLONE', 'HEART'];
function sendAct(name) { const i = XA.indexOf(name); if (i < 0) return; C('sel xact ' + (((((sel('xact', 0) >> 5) + 1) % 30000) << 5) | i)); sync(); }
function sendStep(n) { C('sel stepin ' + (((((sel('stepin', 0) >> 8) + 1) % 30000) << 8) | (n & 255))); sync(); }

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
