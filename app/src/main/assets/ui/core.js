// Stringer Max: what both screens share. The bridge to the engine, the state, knobs, meters, pop-ups.
'use strict';
const D = SMD, P = D.P;
// On the Thor the app provides SM. On a computer (tools/dev.js) the same calls go to a small local server running the real engine.
const SMB = window.SM || (() => {
  const call = (fn, a) => { const x = new XMLHttpRequest(); x.open('POST', '/sm', false); x.send(JSON.stringify([fn, ...a])); return x.responseText; };
  const o = {}; for (const f of ['cmd', 'state', 'poll', 'peaks', 'browse', 'projects', 'info', 'preview', 'load', 'pick', 'storage', 'save', 'open', 'remove', 'fresh', 'export', 'rec', 'focus']) o[f] = (...a) => call(f, a);
  return o;
})();
const S = { st: null, v: -1, m: null, poll: {}, lastAct: -1, pk: [] };
const C = (s) => SMB.cmd(s);
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize);

function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const k in attrs) { const v = attrs[k]; if (k === 'class') e.className = v; else if (k === 'style') e.style.cssText = v; else if (k === 'tap') tap(e, v); else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v); }
  for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
}
// a tap that does not fire when the finger was scrolling
function tap(e, fn) { let sx = 0, sy = 0, ok = false; e.addEventListener('pointerdown', (ev) => { sx = ev.clientX; sy = ev.clientY; ok = true; e.classList.add('down'); });
  e.addEventListener('pointermove', (ev) => { if (Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) > rem() * 1.2) { ok = false; e.classList.remove('down'); } });
  e.addEventListener('pointerup', (ev) => { e.classList.remove('down'); if (ok) { ok = false; fn(ev); } }); e.addEventListener('pointercancel', () => { ok = false; e.classList.remove('down'); }); e.addEventListener('pointerleave', () => e.classList.remove('down')); }
// press-and-hold buttons (performance effects, pads)
function hold(e, down, up) { e.addEventListener('pointerdown', (ev) => { try { e.setPointerCapture(ev.pointerId); } catch (x) {} e.classList.add('down'); down(ev); }); const end = (ev) => { if (e.classList.contains('down')) { e.classList.remove('down'); up(ev); } }; e.addEventListener('pointerup', end); e.addEventListener('pointercancel', end); return e; }

// ---- state
const sel = (k, d = 0) => (S.st && S.st.sel && k in S.st.sel) ? S.st.sel[k] : d;
const setSel = (k, v) => { if (sel(k, -999) !== v) { C(`sel ${k} ${v}`); sync(); } };
const tIdx = () => S.st ? Math.max(0, Math.min(S.st.tracks.length - 1, sel('track', 0))) : 0;
const trk = () => S.st && S.st.tracks[tIdx()];
const pat = () => S.st.pats[S.st.pat];
const clip = (t = tIdx()) => (pat().c[t] || { n: [], a: {} });
const color = (t) => D.COLORS[t % D.COLORS.length];
const mark = () => C('mark');
function sync(force) { const j = SMB.state(force ? -1 : S.v); if (j) { try { S.st = JSON.parse(j); S.v = S.st.v; } catch (e) { console.log('state', e); return; } if (window.render) render(); } }
function edit(...cmds) { mark(); for (const c of cmds.flat()) C(c); sync(); }

let toastT = 0;
function toast(t) { const e = document.getElementById('toast'); if (!e) return; e.textContent = t; e.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('show'), 1800); }
function tick() {
  let p; try { p = JSON.parse(SMB.poll()); } catch (e) { return; } S.poll = p;
  if (p.m) { const [a, b] = p.m.split(';'); const f = a.split(',').map(Number); S.m = { v: f[0], playing: f[1], pat: f[2], tick: f[3], songPos: f[4], mom: f[5], short: f[6], integ: f[7], lim: f[8], glue: f[9], pkL: f[10], pkR: f[11], inPk: f[12], recSec: f[13], cpu: f[14], trk: f.slice(15), inStrip: Number(b) };
    if (S.m.v !== S.v) sync(); }
  if (p.acts && p.acts.length) { if (S.lastAct < 0) S.lastAct = p.acts[p.acts.length - 1][0]; for (const [n, name] of p.acts) if (n > S.lastAct) { S.lastAct = n; if (window.onAct) onAct(name); } } else if (S.lastAct < 0) S.lastAct = 0;
  if (p.notice && p.notice !== tick.last) toast(p.notice); tick.last = p.notice;
  const bz = document.getElementById('busy'); if (bz) { bz.classList.toggle('show', !!p.busy && p.busy !== 'LOADING'); bz.textContent = p.busy || ''; }
  if (S.st && S.m && window.onMeters) onMeters();
}
function start() { sync(true); setInterval(tick, 50); tick(); }
const meterFrac = (pk) => pk <= 0.0005 ? 0 : clamp((20 * Math.log10(pk) + 54) / 54);

// ---- knob: drag up and down. o = { label, get, set, steps, fmt, focus, def }
const ARC = 2 * Math.PI * 38 * 0.75;
function knob(o) {
  const el = h('div', { class: 'knob' }); const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', '0 0 100 100');
  const mk = (stroke, w, op) => { const c = document.createElementNS(ns, 'circle'); c.setAttribute('cx', 50); c.setAttribute('cy', 50); c.setAttribute('r', 38); c.setAttribute('fill', 'none'); c.setAttribute('stroke', stroke); c.setAttribute('stroke-width', w); c.setAttribute('stroke-linecap', 'round'); c.setAttribute('transform', 'rotate(135 50 50)'); c.setAttribute('opacity', op); svg.append(c); return c; };
  const bg = mk('#5f86b8', 5, .35); bg.setAttribute('stroke-dasharray', `${ARC} 999`); const fg = mk(o.color || '#3df2ff', 6.5, 1); const dot = document.createElementNS(ns, 'circle'); dot.setAttribute('r', 3.2); dot.setAttribute('fill', '#fff'); svg.append(dot);
  const val = h('div', { class: 'v' }); el.append(svg, val, h('div', { class: 'lbl' }, o.label));
  const text = (v) => o.steps ? o.steps[Math.min(o.steps.length - 1, Math.round(v * (o.stepMax || o.steps.length - 1)))] : o.fmt ? o.fmt(v) : String(Math.round(v * 100));
  el.upd = () => { const v = clamp(o.get()); fg.setAttribute('stroke-dasharray', `${Math.max(0.01, ARC * v)} 999`); const a = (135 + 270 * v) * Math.PI / 180; dot.setAttribute('cx', 50 + 38 * Math.cos(a)); dot.setAttribute('cy', 50 + 38 * Math.sin(a)); val.textContent = text(v); };
  let sy = 0, sv = 0, on = false, lastTap = 0;
  el.addEventListener('pointerdown', (e) => { try { el.setPointerCapture(e.pointerId); } catch (x) {} on = true; sy = e.clientY; sv = clamp(o.get()); mark(); document.querySelectorAll('.knob.focus').forEach(k => k.classList.remove('focus')); el.classList.add('focus'); if (o.focus) SMB.focus(o.focus);
    const now = Date.now(); if (now - lastTap < 320 && o.def != null) { o.set(o.def); el.upd(); } lastTap = now; });
  el.addEventListener('pointermove', (e) => { if (!on) return; let v = clamp(sv + (sy - e.clientY) / (rem() * 22)); if (o.steps) { const n = o.stepMax || o.steps.length - 1; v = Math.round(v * n) / n; } if (v !== o.get()) { o.set(v); el.upd(); } });
  const end = () => { if (on) { on = false; C('bump'); } }; el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  el.upd(); return el;
}
// a knob for a track parameter (t = 16 is the live input)
const FMT = { [P.PAN]: (v) => Math.abs(v - .5) < .02 ? 'C' : (v < .5 ? 'L' : 'R') + Math.round(Math.abs(v - .5) * 200), [P.SHIFT]: (v) => { const s = Math.round((v - .5) * 24); return (s > 0 ? '+' : '') + s; }, [P.EQLO]: (v) => ((v - .5) * 24).toFixed(0), [P.EQMID]: (v) => ((v - .5) * 24).toFixed(0), [P.EQHI]: (v) => ((v - .5) * 24).toFixed(0) };
const DEF = { [P.PAN]: .5, [P.SHIFT]: .5, [P.EQLO]: .5, [P.EQMID]: .5, [P.EQHI]: .5, [P.VOL]: .75, [P.CUT]: 1 };
function pknob(t, [idx, label, steps], kind) {
  const arr = () => t === 16 ? S.st.inP : (S.st.tracks[t] ? S.st.tracks[t].P : []);
  const o = { label, steps, focus: `p ${t} ${idx}`, get: () => arr()[idx] || 0, set: (v) => { arr()[idx] = v; C(`p ${t} ${idx} ${v.toFixed(4)}`); } };
  if (kind === 'sampler' && idx === P.S_ROOT) { o.fmt = (v) => noteName(Math.round(v * 127)); } else if (kind !== 'sampler' || idx < 16) { if (FMT[idx] && !(kind === 'sampler' && idx >= 16)) o.fmt = FMT[idx]; if (idx in DEF) o.def = DEF[idx]; }
  if (idx === P.S_BARS && kind === 'sampler') o.stepMax = 16;
  return knob(o);
}
const noteName = (n) => D.NOTES[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1);
function meter(cls, style) { const i = h('i'); const e = h('div', { class: 'meter ' + (cls || ''), style }, i); let cur = 0; e.set = (f) => { cur = f > cur ? f : cur * 0.82 + f * 0.18; if (cls === 'h') i.style.width = (cur * 100).toFixed(1) + '%'; else i.style.height = (cur * 100).toFixed(1) + '%'; }; return e; }

// ---- pop-ups
function closePop() { document.querySelectorAll('.pop').forEach(p => p.remove()); }
function popup(title, body, w) { closePop(); const p = h('div', { class: 'pop', onpointerdown: (e) => { if (e.target === p) closePop(); } }, h('div', { class: 'panel', style: `width:${w || 60}rem` }, h('div', { class: 'row gap' }, h('div', { class: 'mid grow', style: 'color:var(--c)' }, title), h('div', { class: 'btn sm', tap: closePop }, 'CLOSE')), body)); document.body.append(p); return p; }
function choose(title, items, fn, cols = 3, w) { popup(title, h('div', { class: 'scroll', style: `display:grid;grid-template-columns:repeat(${cols},1fr);gap:.6rem;max-height:70vh` }, items.map((it, i) => h('div', { class: 'btn' + (it.on ? ' on' : ''), style: 'height:4.6rem;font-size:1rem', tap: () => { closePop(); fn(i, it); } }, it.label || it))), w); }
function ask(title, value, fn) { const inp = h('input', { class: 'txt grow', value: value || '', maxlength: 28 }); popup(title, h('div', { class: 'row gap' }, inp, h('div', { class: 'btn on', tap: () => { const v = inp.value.trim(); closePop(); if (v) fn(v); } }, 'OK')), 50); setTimeout(() => inp.focus(), 50); }
function confirmPop(title, fn) { popup(title, h('div', { class: 'row gap' }, h('div', { class: 'btn wide', tap: closePop }, 'NO'), h('div', { class: 'btn wide on', tap: () => { closePop(); fn(); } }, 'YES')), 40); }

// ---- things both screens do
function transport(name) {
  const st = S.st; if (!st) return;
  if (name === 'PLAY') { C(st.playing ? 'stop' : 'play'); sync(); }
  else if (name === 'REC') { C('rec ' + (st.rec ? 0 : 1)); sync(); }
  else if (name === 'TRACK-' || name === 'TRACK+') setSel('track', clamp(tIdx() + (name === 'TRACK+' ? 1 : -1), 0, st.tracks.length - 1));
  else if (name === 'PAT-' || name === 'PAT+') { C('pat ' + clamp(st.pat + (name === 'PAT+' ? 1 : -1), 0, 31)); sync(); }
}
function applySound(t, s) { const cmds = [`trk eng ${t} ${s.eng}`, `trk name ${t} "${s.name}"`]; const base = { 2: .8, 3: .15, 5: 0, 6: 0, 7: 0, 12: .5, 16: .02, 17: .45, 18: .7, 19: .3, 20: .45, 21: .3, 22: .3, 23: .4, 24: 0, 25: .6, 26: .5, 27: 0, 31: .4, 32: 0, 33: 0 };
  for (const [k, v] of Object.entries({ ...base, ...s.p })) if (k !== '9' && k !== '8' || k in s.p) cmds.push(`p ${t} ${k} ${v}`); edit(cmds); }
function applyKit(t, k) { const cmds = k.pads.map((p, i) => `pad ${t} ${i} ${p.type} ${p.tune} ${p.decay} ${p.level} ${p.pan} ${p.tone} -1`); cmds.push(`p ${t} 16 ${k.rumble}`, `p ${t} 6 ${k.crush || 0}`, `trk name ${t} "${k.name} KIT"`); edit(cmds); }
function addTrackMenu() { choose('ADD A TRACK', ['DRUM MACHINE', 'SYNTH', 'SAMPLER / AUDIO', 'FM-1 OVER MIDI'], (i) => { mark(); const t = parseInt(C('trk add ' + i)); if (t >= 0) { if (i === 0) applyKit(t, D.KITS[0]); if (i === 1) applySound(t, D.SOUNDS[0]); C('sel track ' + t); } else toast('16 TRACKS IS THE LIMIT'); sync(); }, 2, 50); }
