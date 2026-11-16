// Stringer Max: the bottom screen. The sound of the selected track, its effects, the mixer, the live input, the master, and pads to play.
'use strict';
document.documentElement.className = 'bottom';
const TABS = ['SOUND', 'FX', 'MIX', 'INPUT', 'MASTER', 'PLAY'];
const V = { page: 0, mpage: 0, oct: 0, snd: {} };
let tabEls = [], body, cur = null, curKey = '', headName;
const b = (l, fn, on, cls = '') => h('div', { class: 'btn sm ' + cls + (on ? ' on' : ''), tap: fn }, l);
const mknob = ([idx, label, steps]) => knob({ label, steps, focus: `m ${idx}`, color: '#ff4fd8', get: () => S.st.M[idx], set: (v) => { S.st.M[idx] = v; C(`m ${idx} ${v.toFixed(4)}`); } });
const kinds = ['drum', 'synth', 'sampler', 'midi'];

function build() {
  const app = document.getElementById('app'); tabEls = TABS.map((t, i) => h('div', { class: 'tab', style: 'height:5.4rem;font-size:1.05rem;letter-spacing:.1em', tap: () => setSel('btab', i) }, t));
  headName = h('div', { class: 'mid', style: 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis' }); body = h('div', { class: 'grow col', style: 'margin:.5rem;min-height:0' });
  app.append(h('div', { class: 'tabs', style: 'margin:.4rem .5rem 0' }, tabEls), body, h('div', { id: 'toast' }), h('div', { id: 'busy' }));
}
function render() {
  if (!S.st) return; const tab = sel('btab', 0), T = trk(), t = tIdx(); tabEls.forEach((e, i) => e.classList.toggle('on', i === tab));
  const key = [tab, t, T ? T.type : -1, T ? T.eng : 0, V.page, V.mpage, tab === 2 ? S.st.tracks.length : 0].join(':');
  if (key !== curKey) { curKey = key; body.innerHTML = ''; cur = [soundTab, fxTab, mixTab, inputTab, masterTab, playTab][tab](); body.append(cur.el); }
  cur.update();
}
function onMeters() { if (cur && cur.fast) cur.fast(S.m); Scene.set(S.m.trk.map(v => Math.min(1, v * 1.6)), false); }
function onAct(name) { }
const title = (extra) => { const t = tIdx(), T = trk(); return h('div', { class: 'row gap', style: 'height:4rem;flex-shrink:0' }, h('div', { style: `width:.6rem;height:2.6rem;border-radius:.2rem;background:${color(t)};box-shadow:0 0 1rem ${color(t)}` }), h('div', { class: 'mid', style: 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:22rem' }, T ? T.name : 'NO TRACK'), h('div', { class: 'lbl' }, T ? D.TYPES[T.type] : ''), h('div', { class: 'grow' }), extra); };
const upd = (el) => el.querySelectorAll('.knob').forEach(k => k.upd());

// ---------------------------------------------------------------- SOUND
function soundTab() {
  const T = trk(), t = tIdx(); if (!T) return { el: h('div', { class: 'lbl' }, 'ADD A TRACK ON THE TOP SCREEN'), update() {} };
  const el = h('div', { class: 'col grow', style: 'gap:.5rem;min-height:0' });
  if (T.type === 1) {
    const idx = () => D.SOUNDS.findIndex(s => s.name === trk().name), step = (d) => { const i = idx(); applySound(t, D.SOUNDS[((i < 0 ? 0 : i + d) + D.SOUNDS.length) % D.SOUNDS.length]); };
    const name = h('div', { class: 'btn wide', style: 'font-size:1.25rem;color:var(--c)', tap: () => choose('SOUNDS', D.SOUNDS.map(s => ({ label: s.name, on: s.name === trk().name })), (i) => applySound(t, D.SOUNDS[i]), 3, 60) });
    const engs = D.ENGINES.map((e, i) => b(e, () => edit(`trk eng ${t} ${i}`), false, 'mag')), all = D.KNOBS.synth, grid = h('div', { class: 'kgrid grow' }, all.slice(V.page * 12, V.page * 12 + 12).map(k => pknob(t, k, 'synth')));
    el.append(title(h('div', { class: 'row', style: 'gap:.3rem' }, engs)), h('div', { class: 'row gap' }, b('◀', () => step(-1)), name, b('▶', () => step(1))), grid, h('div', { class: 'row gap' }, b('MAIN', () => { V.page = 0; render(); }, V.page === 0), b('ARP + LFO', () => { V.page = 1; render(); }, V.page === 1), h('div', { class: 'grow' }), h('div', { class: 'lbl' }, 'DOUBLE-TAP A KNOB TO RESET')));
    return { el, update() { const T = trk(); name.textContent = T.name; engs.forEach((e, i) => e.classList.toggle('on', T.eng === i)); upd(el); } };
  }
  if (T.type === 0) {
    const pads = h('div', { style: 'display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem' }), padEls = [], knobs = h('div', { class: 'kgrid' });
    for (let i = 0; i < 8; i++) { const e = h('div', { class: 'btn', style: 'height:6.6rem;flex-direction:column;gap:.3rem;font-size:.95rem' }); hold(e, () => { C(`non ${t} ${i} 0.9`); setSel('pad', i); }, () => {}); padEls.push(e); pads.append(e); }
    const pk = (field, label, steps) => knob({ label, steps, get: () => { const p = trk().pads[sel('pad', 0)]; return steps ? p.type / (steps.length - 1) : p[field]; }, set: (v) => { const i = sel('pad', 0), p = trk().pads[i]; if (steps) { p.type = Math.round(v * (steps.length - 1)); C(`pad ${t} ${i} type ${p.type}`); } else { p[field] = v; C(`pad ${t} ${i} ${field} ${v.toFixed(3)}`); } } });
    knobs.append(pk('type', 'SOUND', D.DRUMS), pk('tune', 'TUNE'), pk('decay', 'DECAY'), pk('tone', 'TONE'), pk('level', 'LEVEL'), pk('pan', 'PAN'), ...D.KNOBS.drum.slice(0, 2).map(k => pknob(t, k, 'drum')));
    el.append(title(h('div', { class: 'btn sm on', tap: () => choose('DRUM KITS', D.KITS.map(k => k.name), (i) => applyKit(t, D.KITS[i]), 2, 50) }, 'CHOOSE A KIT')), pads, h('div', { class: 'lbl' }, 'TAP A PAD TO HEAR IT · THE KNOBS SHAPE THE PAD YOU TAPPED'), knobs);
    return { el, update() { const T = trk(), sp = sel('pad', 0); padEls.forEach((e, i) => { e.innerHTML = ''; e.append(h('div', { class: 'lbl' }, i + 1), D.DRUMS[T.pads[i].type]); e.classList.toggle('on', i === sp); }); upd(el); } };
  }
  if (T.type === 2) {
    el.append(title(b('PICK A FILE ON TOP SCREEN', () => setSel('view', 3), false, 'mag')), h('div', { class: 'kgrid grow' }, D.KNOBS.sampler.map(k => pknob(t, k, 'sampler'))),
      h('div', { class: 'lbl', style: 'white-space:normal;line-height:1.6' }, 'ONE-SHOT PLAYS THE WHOLE SOUND. LOOP REPEATS IT. SLICE CUTS IT INTO 16 PIECES. CLIP PLAYS A RECORDING FOR AS LONG AS THE NOTE LASTS.'));
    return { el, update() { upd(el); } };
  }
  const ch = h('div', { class: 'big', style: 'color:var(--c);width:6rem;text-align:center' });
  el.append(title(), h('div', { class: 'panel col gap', style: 'padding:1.5rem;align-items:center' }, h('div', { class: 'lbl' }, 'NOTES ON THIS TRACK ARE SENT TO YOUR SYNTH OVER USB'), h('div', { class: 'row gap' }, b('−', () => edit(`trk ch ${t} ${(trk().ch + 15) % 16}`)), h('div', { class: 'col', style: 'align-items:center' }, h('div', { class: 'lbl' }, 'MIDI CHANNEL'), ch), b('+', () => edit(`trk ch ${t} ${(trk().ch + 1) % 16}`))),
    h('div', { class: 'lbl', style: 'white-space:normal;line-height:1.7;text-align:center' }, 'PLUG THE FM-1 INTO THE THOR. ITS SOUND COMES BACK THROUGH THE INPUT TAB, WHERE YOU CAN ADD EFFECTS AND RECORD IT.')));
  return { el, update() { ch.textContent = trk().ch + 1; } };
}

// ---------------------------------------------------------------- FX
function fxTab() {
  const T = trk(), t = tIdx(); if (!T) return { el: h('div'), update() {} };
  const el = h('div', { class: 'col grow', style: 'gap:.4rem;min-height:0' }, title(b('RESET FX', () => edit([5, 6, 4, 7, 8, 9, 13].map(k => `p ${t} ${k} 0`), `p ${t} 2 1`, [10, 11, 12, 14].map(k => `p ${t} ${k} 0.5`)))), h('div', { class: 'kgrid grow' }, D.KNOBS.fx.filter(k => T.type !== 3).map(k => pknob(t, k, kinds[T.type]))));
  if (T.type === 3) el.append(h('div', { class: 'lbl', style: 'white-space:normal;line-height:1.7' }, 'THIS TRACK ONLY SENDS NOTES. SHAPE THE FM-1\'S SOUND ON THE INPUT TAB.'));
  return { el, update() { upd(el); } };
}

// ---------------------------------------------------------------- MIX
function fader(get, set, col) {
  const fill = h('div', { style: `position:absolute;left:0;right:0;bottom:0;background:linear-gradient(to top, ${col}55, ${col}22);border-top:.35rem solid ${col}` }), mt = h('div', { style: 'position:absolute;left:0;bottom:0;width:.5rem;background:linear-gradient(to top,#2be0ff,#b6ff3d 70%,#ff5a5a);opacity:.95' });
  const e = h('div', { style: 'position:relative;width:100%;flex:1;min-height:0;background:rgba(3,8,18,.85);border:1px solid var(--line);border-radius:.3rem;overflow:hidden' }, fill, mt); let on = false, lv = 0;
  const at = (ev) => { const r = e.getBoundingClientRect(); set(clamp(1 - (ev.clientY - r.top) / r.height)); e.upd(); };
  e.addEventListener('pointerdown', (ev) => { try { e.setPointerCapture(ev.pointerId); } catch (x) {} on = true; mark(); at(ev); }); e.addEventListener('pointermove', (ev) => { if (on) at(ev); }); const up = () => { if (on) { on = false; C('bump'); } }; e.addEventListener('pointerup', up); e.addEventListener('pointercancel', up);
  e.upd = () => { fill.style.height = (get() * 100) + '%'; }; e.level = (f) => { lv = f > lv ? f : lv * 0.8 + f * 0.2; mt.style.height = (lv * 100) + '%'; }; return e;
}
function mixTab() {
  const st = S.st, strips = [], row = h('div', { class: 'row scrollx grow', style: 'gap:.4rem;align-items:stretch;min-height:0' });
  st.tracks.forEach((T, t) => { const f = fader(() => S.st.tracks[t].P[0], (v) => { S.st.tracks[t].P[0] = v; C(`p ${t} 0 ${v.toFixed(4)}`); }, color(t)), m = b('M', () => { C(`trk mute ${t} ${S.st.tracks[t].mute ? 0 : 1}`); sync(); }, false, 'hot'), s = b('S', () => { C(`trk solo ${t} ${S.st.tracks[t].solo ? 0 : 1}`); sync(); });
    const nm = h('div', { class: 'lbl', style: 'font-size:.8rem;width:100%;overflow:hidden;text-overflow:ellipsis;text-align:center', tap: () => setSel('track', t) });
    const e = h('div', { class: 'col panel', style: 'width:8.4rem;flex-shrink:0;padding:.4rem;gap:.35rem;align-items:center' }, nm, f, h('div', { class: 'row', style: 'gap:.25rem' }, m, s)); strips.push({ e, f, m, s, nm }); row.append(e); });
  const mf = fader(() => S.st.M[D.M.VOL], (v) => { S.st.M[D.M.VOL] = v; C(`m ${D.M.VOL} ${v.toFixed(4)}`); }, '#ffffff');
  const el = h('div', { class: 'row grow', style: 'gap:.4rem;align-items:stretch;min-height:0' }, row, h('div', { class: 'col panel', style: 'width:9rem;padding:.4rem;gap:.35rem;align-items:center;border-color:var(--c)' }, h('div', { class: 'lbl', style: 'color:var(--c)' }, 'MASTER'), mf, h('div', { class: 'lbl', style: 'height:3.2rem;display:flex;align-items:center' }, 'OUT')));
  return { el, update() { strips.forEach((x, t) => { const T = S.st.tracks[t]; if (!T) return; x.nm.textContent = T.name; x.nm.style.color = t === tIdx() ? color(t) : ''; x.e.style.borderColor = t === tIdx() ? color(t) : ''; x.m.classList.toggle('on', !!T.mute); x.s.classList.toggle('on', !!T.solo); x.f.upd(); }); mf.upd(); },
    fast(m) { strips.forEach((x, t) => x.f.level(meterFrac(m.trk[t] || 0))); mf.level(meterFrac(Math.max(m.pkL, m.pkR))); } };
}

// ---------------------------------------------------------------- INPUT: the FM-1, the KO II, a microphone
function inputTab() {
  const dev = h('div', { class: 'mid', style: 'color:var(--c);white-space:nowrap;overflow:hidden;text-overflow:ellipsis' }), lvl = meter('h', 'height:1.4rem;flex:1'), mon = b('HEAR IT', () => { C('inmon ' + (S.st.inMon ? 0 : 1)); sync(); }), rec = h('div', { class: 'btn hot', style: 'height:6rem;width:17rem;font-size:1.3rem', tap: () => { SMB.rec(); } }, '● RECORD'), chips = h('div', { class: 'row scrollx', style: 'gap:.4rem;flex-shrink:0' });
  D.VOCALS.forEach((v) => chips.append(h('div', { class: 'chip', tap: () => { const base = { 2: 1, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 10: .5, 11: .5, 12: .5, 13: 0, 14: .5 }; edit(Object.entries({ ...base, ...v.p }).map(([k, x]) => `p 16 ${k} ${x}`)); V.voc = v.name; render(); } }, v.name)));
  const ks = [[P.TUNE, 'AUTO-TUNE'], [P.SHIFT, 'PITCH SHIFT'], [P.DRIVE, 'DRIVE'], [P.CRUSH, 'CRUSH'], [P.HPF, 'LOW CUT'], [P.CUT, 'HIGH CUT'], [P.SENDA, 'DELAY'], [P.SENDB, 'REVERB'], [P.EQLO, 'EQ LOW'], [P.EQHI, 'EQ HIGH'], [P.PAN, 'PAN'], [P.VOL, 'LEVEL']];
  const el = h('div', { class: 'col grow', style: 'gap:.5rem;min-height:0' }, h('div', { class: 'row gap' }, h('div', { class: 'col grow', style: 'min-width:0;gap:.3rem' }, h('div', { class: 'lbl' }, 'COMING IN FROM'), dev, h('div', { class: 'row gap' }, lvl)), mon, rec), h('div', { class: 'lbl' }, 'VOICE AND INSTRUMENT STYLES'), chips, h('div', { class: 'kgrid grow' }, ks.map(k => pknob(16, k, 'in'))));
  return { el, update() { mon.classList.toggle('on', !!S.st.inMon); upd(el); chips.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.textContent === V.voc)); },
    fast(m) { const p = S.poll; dev.textContent = (p.input || '').toUpperCase() + (p.midi ? '  ·  MIDI: ' + p.midi.toUpperCase() : ''); lvl.set(meterFrac(m.inPk)); rec.classList.toggle('on', !!p.rec); rec.textContent = p.rec ? '■ STOP  ' + Math.floor(m.recSec / 60) + ':' + String(Math.floor(m.recSec % 60)).padStart(2, '0') : '● RECORD'; } };
}

// ---------------------------------------------------------------- MASTER
function masterTab() {
  const chips = h('div', { class: 'row scrollx', style: 'gap:.4rem;flex-shrink:0' }), big = h('div', { style: 'font-size:3.2rem;color:var(--c);width:11rem;text-align:right;font-variant-numeric:tabular-nums' }), integ = h('div', { class: 'mid' }), tgt = h('div', { class: 'lbl' }), cv = h('canvas', { style: 'width:100%;height:3rem;display:block' }), gr = meter('h', 'height:.9rem;flex:1'), refB = b('A/B REFERENCE', () => { if (S.st.refId < 0) return toast('LOAD A REFERENCE SONG IN FILES'); C(`ref ${S.st.refId} ${S.st.refOn ? 0 : 1}`); sync(); }, false, 'mag');
  D.MASTERS.forEach((p) => chips.append(h('div', { class: 'chip', tap: () => { edit(Object.entries(p.m).map(([k, v]) => `m ${k} ${v}`)); V.mp = p.name; V.target = p.target; C('lufs'); render(); } }, p.name)));
  const ks = V.mpage === 0 ? D.KNOBS.master.slice(0, 7) : D.KNOBS.master.slice(7), names = () => S.st.tracks.map(T => T.type === 3 ? '' : T.name).join('|');
  const el = h('div', { class: 'col grow', style: 'gap:.45rem;min-height:0' }, chips,
    h('div', { class: 'panel row gap', style: 'padding:.6rem 1rem;flex-shrink:0' }, h('div', { class: 'col' }, h('div', { class: 'lbl' }, 'LOUDNESS NOW'), h('div', { class: 'row', style: 'align-items:baseline;gap:.4rem' }, big, h('div', { class: 'lbl' }, 'LUFS'))), h('div', { class: 'col grow', style: 'gap:.3rem;min-width:0' }, cv, h('div', { class: 'row gap' }, h('div', { class: 'lbl' }, 'WHOLE SONG'), integ, h('div', { class: 'grow' }), tgt), h('div', { class: 'row gap' }, h('div', { class: 'lbl' }, 'LIMITING'), gr))),
    h('div', { class: 'kgrid grow' }, ks.map(mknob)),
    h('div', { class: 'row', style: 'gap:.35rem;flex-shrink:0' }, b('MASTER', () => { V.mpage = 0; render(); }, V.mpage === 0), b('ECHO + ROOM', () => { V.mpage = 1; render(); }, V.mpage === 1), refB, h('div', { class: 'grow' }), b('BOUNCE LOOP', () => SMB.export('bounce', '')), b('STEMS', () => SMB.export('stems', names())), b('EXPORT SONG', () => SMB.export('song', ''), true)));
  return { el, update() { upd(el); chips.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.textContent === V.mp)); refB.classList.toggle('on', !!S.st.refOn); tgt.textContent = 'TARGET ' + (V.target || -10) + ' LUFS'; },
    fast(m) { big.textContent = m.short <= -69 ? '--' : m.short.toFixed(1); integ.textContent = m.integ <= -69 ? '--' : m.integ.toFixed(1); gr.set(clamp((m.lim + m.glue * 0.5) / 12));
      const d = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, hh = cv.clientHeight; if (cv.width !== Math.round(w * d)) { cv.width = Math.round(w * d); cv.height = Math.round(hh * d); } const g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, w, hh);
      const X = (l) => clamp((l + 30) / 27) * w; g.fillStyle = 'rgba(3,8,18,.9)'; g.fillRect(0, hh * .25, w, hh * .5); const grad = g.createLinearGradient(0, 0, w, 0); grad.addColorStop(0, '#2be0ff'); grad.addColorStop(.6, '#b6ff3d'); grad.addColorStop(.85, '#ffb23d'); grad.addColorStop(1, '#ff5a5a'); g.fillStyle = grad; if (m.short > -69) g.fillRect(0, hh * .25, X(m.short), hh * .5);
      if (m.mom > -69) { g.fillStyle = '#fff'; g.fillRect(X(m.mom) - 1, hh * .1, 2, hh * .8); } g.fillStyle = '#ff4fd8'; const tx = X(V.target || -10); g.fillRect(tx - 1.5, 0, 3, hh); for (const l of [-24, -18, -14, -10, -6]) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(X(l), hh * .85, 1, hh * .15); } } };
}

// ---------------------------------------------------------------- PLAY: pads for the selected track, and effects you hold
function playTab() {
  const T = trk(), t = tIdx(), pads = h('div', { style: 'display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;flex:1;min-height:0' }), el = h('div', { class: 'row grow', style: 'gap:.6rem;align-items:stretch;min-height:0' });
  const notes = () => { if (!T || T.type === 0) return [0, 1, 2, 3, 4, 5, 6, 7]; const mask = D.SCALES[S.st.scale][1], o = []; let n = 48 + S.st.key + V.oct * 12; while (o.length < 16 && n < 127) { if ((mask >> (((n - S.st.key) % 12 + 12) % 12)) & 1) o.push(n); n++; } return o; };
  function fill() { pads.innerHTML = ''; const ns = notes(), drum = T && T.type === 0; (drum ? ns : ns.slice(12, 16).concat(ns.slice(8, 12), ns.slice(4, 8), ns.slice(0, 4))).forEach((n) => { const root = !drum && ((n - S.st.key) % 12 + 12) % 12 === 0;
    pads.append(hold(h('div', { class: 'btn' + (root ? ' on' : ''), style: `height:auto;min-height:0;font-size:1.1rem;flex-direction:column;gap:.2rem;${drum ? 'grid-row:span 2;' : ''}` }, drum ? [h('div', { class: 'lbl' }, n + 1), D.DRUMS[T.pads[n].type]] : noteName(n)), () => C(`non ${t} ${n} 0.9`), () => C(`noff ${t} ${n}`))); }); }
  const hb = (label, on, off, cls = '') => hold(h('div', { class: 'btn ' + cls, style: 'height:6.4rem;font-size:1.05rem' }, label), on, off);
  const strip = h('div', { class: 'panel', style: 'height:6.4rem;position:relative;overflow:hidden' }, h('div', { class: 'lbl', style: 'position:absolute;left:1rem;top:.6rem' }, '◀ MUFFLE'), h('div', { class: 'lbl', style: 'position:absolute;right:1rem;top:.6rem' }, 'THIN ▶'), h('div', { class: 'lbl', style: 'position:absolute;left:0;right:0;bottom:.6rem;text-align:center' }, 'FILTER: SLIDE AND HOLD')), dot = h('div', { style: 'position:absolute;top:0;bottom:0;width:.5rem;background:var(--c);box-shadow:0 0 1rem var(--c);left:50%' }); strip.append(dot);
  let sd = false; const sv = (e) => { const r = strip.getBoundingClientRect(), x = clamp((e.clientX - r.left) / r.width); dot.style.left = (x * 100) + '%'; C('perf 0 ' + x.toFixed(3)); };
  strip.addEventListener('pointerdown', (e) => { try { strip.setPointerCapture(e.pointerId); } catch (x) {} sd = true; sv(e); }); strip.addEventListener('pointermove', (e) => { if (sd) sv(e); }); const su = () => { if (sd) { sd = false; dot.style.left = '50%'; C('perf 0 0.5'); } }; strip.addEventListener('pointerup', su); strip.addEventListener('pointercancel', su);
  const octL = h('div', { class: 'lbl', style: 'width:6rem;text-align:center' });
  el.append(h('div', { class: 'col', style: 'flex:1.5;gap:.5rem;min-width:0' }, title(T && T.type !== 0 ? h('div', { class: 'row', style: 'gap:.3rem' }, b('−', () => { V.oct = Math.max(-2, V.oct - 1); fill(); upd2(); }), octL, b('+', () => { V.oct = Math.min(3, V.oct + 1); fill(); upd2(); })) : null), pads),
    h('div', { class: 'col', style: 'flex:1;gap:.5rem;min-width:0' }, h('div', { class: 'lbl', style: 'height:4rem;display:flex;align-items:center' }, 'HOLD TO PERFORM'), strip, hb('STUTTER', () => C('perf 1 0.7'), () => C('perf 1 0'), 'mag'), hb('FAST STUTTER', () => C('perf 1 1'), () => C('perf 1 0'), 'mag'), hb('HALF SPEED', () => C('perf 2 1'), () => C('perf 2 0')), hb('TAPE STOP', () => C('perf 3 1'), () => C('perf 3 0'), 'hot')));
  const upd2 = () => { octL.textContent = 'OCTAVE ' + (V.oct > 0 ? '+' : '') + V.oct; }; let lastKey = '';
  return { el, update() { const k = S.st.key + ':' + S.st.scale + ':' + (T && T.type === 0 ? T.pads.map(p => p.type).join() : ''); if (k !== lastKey) { lastKey = k; fill(); } upd2(); } };
}

window.addEventListener('load', () => { build(); Scene.init(document.getElementById('scene'), { cols: 12, rows: 8, floaters: 6, scale: 0.6 }); start(); });
