// HEARTSTRING: a chain-reaction groove machine inside STRING-R.
// The heart beats once a beat. Each drum that fires pulls its strings; each string has a chance of firing the drum at its other end,
// a few steps later. The top screen shows the heart cut open: the strings are its veins, and what travels along them is drawn as blood.
// The bottom screen edits the selected drum, its strings and the machine.
// Both screens share one document (the patch and what is selected), kept by the app; the top screen owns the sound.
'use strict';
const HSN = [['heart', 'HEART'], ['kick', 'KICK'], ['bass', 'BASS'], ['open', 'OPEN HAT'], ['hat', 'HAT'], ['rim', 'RIM'], ['clap', 'CLAP'], ['stab', 'LEAD'], ['roll', 'SNARE ROLL']];
const HSNAME = Object.fromEntries(HSN), HSDRUMS = HSN.slice(1).map(n => n[0]);
const HSSTYLES = [['trance', 'TRANCE'], ['techno', 'HARD TECHNO'], ['hyperpop', 'HYPERPOP'], ['house', 'HOUSE'], ['garage', 'GARAGE']];
const HSPRESETS = {
  trance: { bpm: 138, wander: 3, swing: 0, drive: 25, brk: 35, lead: 'supersaw', bass: 'saw', ratchet: { hat: 8 },
    wires: [['heart', 'kick', 0, 100, 1], ['kick', 'open', 2, 92, 1], ['kick', 'bass', 1, 95, 1], ['bass', 'bass', 1, 85, 1], ['kick', 'hat', 1, 45, 1], ['hat', 'hat', 1, 40, 1], ['kick', 'clap', 0, 100, 2], ['clap', 'rim', 3, 25, 1], ['kick', 'stab', 2, 70, 1], ['stab', 'stab', 1, 35, 1], ['kick', 'roll', 0, 80, 16]] },
  techno: { bpm: 145, wander: 6, swing: 0, drive: 60, brk: 25, lead: 'rave', bass: 'rumble', ratchet: { rim: 12, hat: 6 },
    wires: [['heart', 'kick', 0, 100, 1], ['kick', 'bass', 2, 90, 1], ['bass', 'bass', 1, 50, 1], ['kick', 'hat', 2, 95, 1], ['hat', 'hat', 1, 55, 1], ['kick', 'open', 2, 30, 2], ['kick', 'clap', 0, 85, 2], ['kick', 'rim', 3, 45, 1], ['rim', 'rim', 3, 40, 1], ['kick', 'stab', 3, 25, 1], ['stab', 'rim', 1, 30, 1], ['kick', 'roll', 0, 60, 16]] },
  hyperpop: { bpm: 165, wander: 5, swing: 0, drive: 75, brk: 30, lead: 'chip', bass: '808', ratchet: { hat: 25, clap: 10 },
    wires: [['heart', 'kick', 0, 100, 1], ['kick', 'kick', 3, 30, 1], ['kick', 'clap', 0, 100, 2], ['clap', 'clap', 1, 20, 1], ['kick', 'hat', 1, 80, 1], ['hat', 'hat', 1, 75, 1], ['kick', 'open', 2, 40, 1], ['kick', 'bass', 0, 90, 1], ['bass', 'bass', 3, 40, 1], ['kick', 'stab', 1, 75, 1], ['stab', 'stab', 1, 70, 1], ['kick', 'rim', 2, 30, 1], ['kick', 'roll', 0, 90, 8]] },
  house: { bpm: 124, wander: 5, swing: 30, drive: 20, brk: 15, lead: 'organ', bass: 'saw', ratchet: {},
    wires: [['heart', 'kick', 0, 100, 1], ['kick', 'open', 2, 95, 1], ['kick', 'hat', 1, 50, 1], ['hat', 'hat', 2, 60, 1], ['kick', 'clap', 0, 100, 2], ['kick', 'bass', 2, 70, 1], ['bass', 'bass', 1, 55, 1], ['kick', 'stab', 2, 50, 1], ['stab', 'stab', 3, 45, 1], ['kick', 'rim', 3, 30, 1], ['rim', 'hat', 1, 40, 1], ['kick', 'roll', 0, 40, 16]] },
  garage: { bpm: 132, wander: 10, swing: 45, drive: 25, brk: 15, lead: 'organ', bass: '808', ratchet: { hat: 10 },
    wires: [['heart', 'kick', 0, 100, 4, 0], ['kick', 'kick', 10, 85, 1], ['kick', 'kick', 6, 25, 1], ['heart', 'clap', 0, 100, 2, 1], ['heart', 'hat', 2, 90, 1], ['hat', 'hat', 1, 45, 1], ['heart', 'open', 2, 30, 1], ['clap', 'rim', 3, 40, 1], ['rim', 'rim', 3, 30, 1], ['kick', 'bass', 0, 80, 1], ['bass', 'bass', 3, 50, 1], ['heart', 'stab', 3, 45, 1], ['stab', 'stab', 3, 40, 1], ['heart', 'roll', 0, 30, 16]] },
};
const HSEVERY = [[1, 0, 'EVERY BEAT'], [2, 1, 'BEATS 2 AND 4'], [2, 0, 'BEATS 1 AND 3'], [4, 0, 'BEAT 1 OF EACH BAR'], [4, 3, 'BEAT 4 OF EACH BAR'], [8, 7, 'LAST BEAT OF 2 BARS'], [16, 15, 'LAST BEAT OF 4 BARS']];
const HSCH = [{ name: 'Am', root: 0, bass: 0, iv: [0, 3, 7] }, { name: 'F', root: -4, bass: 8, iv: [0, 4, 7] }, { name: 'C', root: 3, bass: 3, iv: [0, 4, 7] }, { name: 'G', root: -2, bass: 10, iv: [0, 4, 7] }];
const HSBUILT = { kick: { saw: 'TRANCE KICK', rumble: 'RUMBLE KICK', '808': 'CLUB KICK' }, bass: { saw: 'ROLLING SAW', rumble: 'RUMBLE', '808': '808 SUB' }, open: 'OPEN HAT', hat: 'CLOSED HAT', rim: 'RIM', clap: 'CLAP', stab: { supersaw: 'SUPERSAW CHORD', rave: 'RAVE STAB', chip: 'CHIP ARP', organ: 'ORGAN CHORD' }, roll: 'SNARE × 8' };
const HS = { doc: null, ver: -1, putT: 0 };
const hsOn = () => sel('hs', 0) === 1;
function hsPatchOf(style) {
  const p = HSPRESETS[style]; let id = 0; const nodes = {}; for (const n of HSDRUMS) nodes[n] = { vol: 0.8, ratchet: p.ratchet[n] || 0, mute: false, src: null };
  return { style, bpm: p.bpm, wander: p.wander, swing: p.swing, drive: p.drive, brk: p.brk, lead: p.lead, bass: p.bass, nodes, wires: p.wires.map(a => ({ id: ++id, from: a[0], to: a[1], delay: a[2], chance: a[3], every: a[4], phase: a[5] === undefined ? a[4] - 1 : a[5] })) };
}
function hsValid(d) { return d && d.patch && Array.isArray(d.patch.wires) && d.patch.nodes && HSDRUMS.every(n => d.patch.nodes[n]); }
function hsRead() { let d = null; try { d = JSON.parse(SMB.hsGet() || 'null'); } catch (e) {} return hsValid(d) ? d : null; }
function hsInit() { HS.doc = hsRead(); if (!HS.doc) { HS.doc = { patch: hsPatchOf('trance'), sel: { type: 'node', id: 'kick' }, play: false, lock: false, send: 0, reset: 0, patches: {}, name: 'TRANCE' }; hsPut(); } else { HS.doc.play = false; HS.ver = S.poll.hs != null ? S.poll.hs : -1; } }
function hsPut() { clearTimeout(HS.putT); HS.putT = 0; try { HS.ver = parseInt(SMB.hsPut(JSON.stringify(HS.doc))) || HS.ver; } catch (e) {} }
function hsPutSoon() { if (!HS.putT) HS.putT = setTimeout(hsPut, 70); }
// called on every tick of the page: pick up what the other screen changed
function hsPoll(changed) { if (!HS.doc) hsInit(); const v = S.poll.hs; if (v != null && v !== HS.ver && !HS.putT) { const d = hsRead(); HS.ver = v; if (d) { HS.doc = d; changed(); } } }
function hsStyle(style) { const d = HS.doc; d.patch = hsPatchOf(style); d.lock = false; d.reset = (d.reset || 0) + 1; d.name = HSSTYLES.find(s => s[0] === style)[1]; d.sel = { type: 'node', id: 'kick' }; hsPut(); }
function hsSound(n) { const p = HS.doc.patch, nd = p.nodes[n]; if (nd.src) return nd.src.name; const b = HSBUILT[n]; return typeof b === 'string' ? b : b[n === 'stab' ? p.lead : p.bass] || Object.values(b)[0]; }
const hsWireName = (w) => HSNAME[w.from] + ' → ' + (w.from === w.to ? 'ITSELF' : HSNAME[w.to]);
const hsFires = (d) => d === 0 ? 'SAME MOMENT' : d + (d > 1 ? ' STEPS LATER' : ' STEP LATER');
const hsAllowed = (w) => (HSEVERY.find(o => o[0] === w.every && o[1] === w.phase) || HSEVERY[0])[2];

// ================================================================ TOP SCREEN: the sound and the heart
const HP = { heart: [591, 531.8, 47.5], kick: [495.3, 593.1, 35.8], bass: [401.7, 516.5, 32.7], open: [436.6, 402.1, 32.4], hat: [727.7, 398.2, 31.2], rim: [790.1, 508.5, 31.2], clap: [713.2, 579, 33.6], stab: [575, 704.1, 31.4], roll: [690.2, 674.5, 31.2] };   // where each socket sits in the 1920 x 1080 picture
const HORDER = ['open', 'hat', 'rim', 'clap', 'kick', 'bass', 'roll', 'stab'], HX0 = 1180, HY0 = 150, HPITCH = 104, HRH = 92;
const HT = { root: null, cv: null, el: {}, strips: {}, ctx: null, playing: false, step: 0, next: 0, timer: 0, locked: false, inBreak: false, chord: 0, pending: new Map(), loop: new Array(64).fill(null), filled: 0, vis: [], flash: {}, flow: [], bufs: {}, lastSend: 0, lastReset: 0, bar: 0, raf: 0, beat: 0 };
function hsTopBuild(app) {
  const A = (style, ...k) => h('div', { class: 'abs', style }, k), e = HT.el;
  HT.cv = h('canvas', { class: 'abs', style: 'left:0;top:0;width:96rem;height:54rem' });
  const pic = h('div', { class: 'abs', style: 'left:0;top:0;width:96rem;height:54rem;transform-origin:30.8% 50%' }, h('img', { src: 'bg/hscut.jpg', alt: '', style: 'position:absolute;left:0;top:0;width:100%;height:100%' })); e.pic = pic;
  const cell = (l, fs) => { const v = h('div', { class: 'mich', style: `font-size:${fs}rem;line-height:1.6rem;color:#fff;text-shadow:0 0 .6rem #8f7bff;white-space:nowrap` }); return [h('div', { class: 'col', style: 'align-items:center;justify-content:center;gap:.05rem;border-right:1px solid rgba(190,180,255,.3);height:100%' }, lab(l), v), v]; };
  const c1 = cell('STYLE', .8), c2 = cell('BPM', 1.3), c3 = cell('BAR', 1.1), c4 = cell('CHORD', 1.3); e.style = c1[1]; e.bpm = c2[1]; e.bar = c3[1]; e.chord = c4[1];
  const tb = (g, fn, aria) => h('button', { class: 'btn', style: 'width:4.2rem;height:4.2rem;font-size:1.4rem;padding:0;color:#fff;clip-path:polygon(.6rem 0,100% 0,100% calc(100% - .6rem),calc(100% - .6rem) 100%,0 100%,0 .6rem)', 'aria-label': aria, tap: fn }, g);
  e.play = tb('▶', () => { HS.doc.play = !HS.doc.play; hsPut(); hsTopApply(); }, 'Play or stop the heart'); e.lock = btn('LOCK LAST 4 BARS', () => { HS.doc.lock = !HS.doc.lock; hsPut(); hsTopApply(); }, '', 'width:11.6rem;height:4.2rem;white-space:normal;line-height:1.2rem;padding:0 .4rem');
  e.status = h('b', { style: 'font-size:.9rem;color:#fff;white-space:nowrap' }); e.status2 = lab('', 'hi'); e.name = h('div', { style: 'font-size:.95rem;color:#fff;white-space:nowrap;overflow:hidden;width:100%' });
  const strips = A('left:0;top:0;width:0;height:0');
  HORDER.forEach((n, i) => { const meter = leds('', 'width:100%'), nm = h('span', { style: 'font-size:1rem;font-weight:700;letter-spacing:.1rem;white-space:nowrap' }, HSNAME[n]), snd = h('span', { class: 'mono', style: 'display:block;width:12rem;font-size:.72rem;letter-spacing:.06rem;white-space:nowrap;overflow:hidden' }), outs = h('span', { class: 'mono', style: 'display:block;font-size:.72rem;letter-spacing:.05rem;white-space:nowrap;overflow:hidden' }), roll = h('span', { class: 'mich', style: 'font-size:.95rem' }), mute = h('button', { style: 'width:2.6rem;height:2.6rem;border:.1rem solid currentColor;font-size:.8rem', 'aria-label': 'Mute ' + HSNAME[n], tap: (ev) => { ev.stopPropagation(); const nd = HS.doc.patch.nodes[n]; nd.mute = !nd.mute; hsPut(); hsTopApply(); } }, 'M');
    const box = h('div', { class: 'abs cutr lcd', style: `left:${HX0 / 20}rem;top:${(HY0 + i * HPITCH) / 20}rem;width:35rem;height:${HRH / 20}rem;padding:0 .7rem;display:grid;grid-template-columns:12.4rem minmax(0,1fr) 4.2rem 2.6rem;gap:.7rem;align-items:center`, tap: () => { HS.doc.sel = { type: 'node', id: n }; hsPut(); hsTopApply(); } },
      h('div', { class: 'col', style: 'gap:.25rem;min-width:0' }, nm, snd), h('div', { class: 'col', style: 'gap:.4rem;min-width:0' }, meter, outs), h('div', { class: 'col', style: 'align-items:center;gap:.1rem' }, lab('ROLL'), roll), mute);
    HT.strips[n] = { box, snd, outs, roll, mute, meter }; strips.append(box); });
  e.styles = HSSTYLES.map(([id, name]) => btn(name, () => { hsStyle(id); hsTopApply(); }, 'off', 'height:3.2rem;font-size:.9rem;padding:0 1rem'));
  e.brk = h('div', { class: 'lcd row', style: 'height:3.2rem;padding:0 .8rem;gap:.5rem;flex-shrink:0' }, h('span', { style: 'width:.7rem;height:.7rem;background:#2a2666' }), lab('BREAKDOWN', 'hi'));
  HT.under = h('div', { class: 'abs', style: 'inset:0;display:none;overflow:hidden' }, pic, h('div', { class: 'abs', style: 'left:0;top:0;width:96rem;height:54rem;background:linear-gradient(90deg,rgba(0,0,6,0) 47%,rgba(0,0,6,.9) 60%)' })); const stage = document.getElementById('stage'); stage.insertBefore(HT.under, stage.firstChild);
  HT.root = A('inset:0;display:none', HT.cv,
    A('left:2.8rem;top:.8rem;width:30rem;height:5rem;display:flex;align-items:center;gap:.9rem', h('div', { class: 'lcd cut col', style: 'height:4.2rem;padding:0 1.2rem;justify-content:center;gap:.2rem' }, h('div', { class: 'mich chrome', style: 'font-size:1.5rem;letter-spacing:.3rem;line-height:2rem' }, 'HEARTSTRING'), h('div', { class: 'mono', style: 'font-size:.7rem;letter-spacing:.18rem;color:#b9b2ff' }, 'GROOVE MACHINE')),
      h('div', { class: 'lcd col grow', style: 'height:4.2rem;padding:.3rem .8rem;justify-content:center;gap:.15rem;min-width:0' }, lab('PATCH'), e.name)),
    h('div', { class: 'abs lcd', style: 'left:36.1rem;top:.6rem;width:23.8rem;height:3.5rem;display:grid;grid-template-columns:repeat(4,minmax(0,1fr))' }, c1[0], c2[0], c3[0], c4[0]),
    A('left:63.6rem;top:.9rem;width:29.6rem;height:4.8rem;display:flex;align-items:center;gap:.6rem', e.play, e.lock, h('div', { class: 'lcd col grow', style: 'height:4.2rem;padding:.5rem .7rem;justify-content:center;gap:.3rem;min-width:0' }, e.status, e.status2)),
    strips, A('left:3rem;top:50.1rem;width:90rem;height:3.4rem;display:flex;align-items:center;gap:.5rem', e.styles, h('div', { class: 'grow' }), e.brk, btn('SEND 4 BARS TO SONG', hsSend, 'hot', 'height:3.2rem;font-size:.9rem'), btn('◀ SONG', () => { C('sel hs 0'); sync(); }, '', 'height:3.2rem;font-size:.9rem')));
  app.append(HT.root);
  HT.cv.addEventListener('pointerdown', (ev) => { const r = HT.cv.getBoundingClientRect(), k = 1920 / r.width, x = (ev.clientX - r.left) * k, y = (ev.clientY - r.top) * k; let pick = null;
    for (const n in HP) if (Math.hypot(x - HP[n][0], y - HP[n][1]) < HP[n][2] + 10) pick = { type: 'node', id: n };
    if (!pick) for (const w of HS.doc.patch.wires) { const g = hsGeom(w); for (let t = 0.1; t <= 0.9; t += 0.05) { const q = hsPt(g, t); if (Math.hypot(x - q[0], y - q[1]) < 20) pick = { type: 'wire', id: w.id }; } }
    if (pick) { HS.doc.sel = pick; hsPut(); hsTopApply(); } });
}
const HSPLATES = () => PL.laser(0, 978, 1920) + PL.plate([[0, 0], [1920, 0], [1920, 96], [1880, 132], [1250, 132], [1214, 104], [706, 104], [670, 132], [40, 132], [0, 96]], 'plate', PL.rivet(22, 22) + PL.rivet(1898, 22) + PL.rivet(690, 22) + PL.rivet(1230, 22)) +
  PL.plate([[0, 1080], [0, 1024], [36, 992], [1884, 992], [1920, 1024], [1920, 1080]], 'plate', PL.rivet(22, 1060) + PL.rivet(1898, 1060)) + PL.cross(24, 150) + PL.cross(1896, 150);
// show or hide the heart screen; called by top.js when the mode changes
function hsTopShow(on) { HT.root.style.display = HT.under.style.display = on ? 'block' : 'none'; if (on) { if (!HS.doc) hsInit(); hsTopApply(); if (!HT.raf) HT.raf = requestAnimationFrame(hsDraw); } else if (HS.doc && HS.doc.play) { HS.doc.play = false; hsPut(); hsTopApply(); } }
// bring the screen and the engine in line with the document
function hsTopApply() {
  const d = HS.doc, p = d.patch, e = HT.el; if (!e.play) return;
  if ((d.reset || 0) !== HT.lastReset) { HT.lastReset = d.reset || 0; HT.pending.clear(); HT.loop.fill(null); HT.filled = 0; hsDrive(); }
  if ((d.send || 0) > HT.lastSend) { HT.lastSend = d.send; hsSend(); }
  HT.locked = !!d.lock; if (d.play && !HT.playing) hsStart(); else if (!d.play && HT.playing) hsStop();
  hsDrive(); e.style.style.width = '5.4rem'; e.style.style.textAlign = 'center'; fitTxt(e.style, (HSSTYLES.find(s => s[0] === p.style) || ['', ''])[1], 0.5); e.bpm.textContent = p.bpm; fitTxt(e.name, d.name || 'UNTITLED');
  e.play.textContent = d.play ? '■' : '▶'; e.play.classList.toggle('on', !!d.play); e.lock.classList.toggle('on', !!d.lock); e.lock.textContent = d.lock ? 'LOCKED · TAP TO FREE' : 'LOCK LAST 4 BARS';
  e.styles.forEach((b, i) => { const on = HSSTYLES[i][0] === p.style; b.classList.toggle('off', !on); b.classList.toggle('on', on); });
  for (const n of HORDER) { const s = HT.strips[n], nd = p.nodes[n], on = d.sel && d.sel.type === 'node' && d.sel.id === n; s.box.classList.toggle('lcd', !on); s.box.style.background = on ? 'linear-gradient(180deg,#fff,#d9d5ff 45%,#a39df0)' : ''; s.box.style.color = on ? '#0d0a2e' : ''; s.box.style.boxShadow = on ? '0 0 1.2rem #8f7bff' : '';
    fitTxt(s.snd, hsSound(n) + ' ▾', 0.6); const ol = p.wires.filter(w => w.from === n).map(w => (w.to === n ? 'ITSELF' : HSNAME[w.to].split(' ')[0]) + ' ' + w.chance); s.outs.textContent = ol.length ? '→ ' + ol.slice(0, 2).join(' · ') + (ol.length > 2 ? ' · +' + (ol.length - 2) : '') : 'NO STRINGS OUT';
    s.roll.textContent = nd.ratchet + '%'; s.mute.style.background = nd.mute ? '#ff7ad9' : ''; s.mute.style.color = nd.mute ? '#2a0320' : ''; s.box.style.opacity = nd.mute ? 0.6 : 1; hsLoadSrc(n); }
}
// ---- own samples: fetched through the app and decoded once
function hsLoadSrc(n) { const nd = HS.doc.patch.nodes[n], path = nd.src && nd.src.path; if (!path || HT.bufs[path] !== undefined) return; HT.bufs[path] = null; hsCtx();
  fetch('smp?p=' + encodeURIComponent(path)).then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); }).then(ab => new Promise((res, rej) => HT.ctx.decodeAudioData(ab, res, rej))).then(b => { HT.bufs[path] = b; }).catch(() => { HT.bufs[path] = false; toast('COULD NOT READ ' + nd.src.name + ' · USING THE BUILT-IN SOUND'); }); }
// ---- the sound (as the prototype): drums and synths made on the spot, a sidechain pump, echo, room, grit
let hMaster, hShaper, hDuck, hRev, hDlySend, hDly, hNoise;
function hsCtx() { if (HT.ctx) return HT.ctx; const AC = window.AudioContext || window.webkitAudioContext, ctx = HT.ctx = new AC();
  hMaster = ctx.createGain(); hMaster.gain.value = 0.7; hShaper = ctx.createWaveShaper(); hShaper.oversample = '2x'; const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.12;
  const out = ctx.createGain(); out.gain.value = 0.85; hMaster.connect(hShaper); hShaper.connect(comp); comp.connect(out); out.connect(ctx.destination); hDuck = ctx.createGain(); hDuck.connect(hMaster);
  const ir = ctx.createBuffer(2, ctx.sampleRate * 1.8, ctx.sampleRate); for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.6); }
  const conv = ctx.createConvolver(); conv.buffer = ir; hRev = ctx.createGain(); const revOut = ctx.createGain(); revOut.gain.value = 0.28; hRev.connect(conv); conv.connect(revOut); revOut.connect(hDuck);
  hDly = ctx.createDelay(1.5); hDly.delayTime.value = hsStepDur() * 3; const fb = ctx.createGain(); fb.gain.value = 0.38; const dOut = ctx.createGain(); dOut.gain.value = 0.3; hDlySend = ctx.createGain(); hDlySend.connect(hDly); hDly.connect(fb); fb.connect(hDly); hDly.connect(dOut); dOut.connect(hDuck);
  hNoise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const nd = hNoise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1; hsDrive(); return ctx; }
function hsDrive() { if (!HT.ctx) return; const dr = HS.doc.patch.drive, k = 1 + dr / 100 * 14, n = 1024, c = new Float32Array(n), norm = Math.tanh(k); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(k * x) / norm; } hShaper.curve = c; hMaster.gain.value = 0.7 - dr / 100 * 0.3; }
const hsStepDur = () => 60 / HS.doc.patch.bpm / 4;
const hN = (t, dur) => { const s = HT.ctx.createBufferSource(); s.buffer = hNoise; s.loop = true; s.start(t, Math.random() * 0.5); s.stop(t + dur); return s; };
const hE = (g, t, peak, dec) => { g.gain.setValueAtTime(Math.max(peak, 0.0002), t); g.gain.exponentialRampToValueAtTime(0.0001, t + dec); };
const hO = (type, f, t, dur) => { const o = HT.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(t + dur); return o; };
const hHat = (t, p, dec, hpf) => { const ctx = HT.ctx, s = hN(t, dec + 0.05), hp = ctx.createBiquadFilter(), g = ctx.createGain(); hp.type = 'highpass'; hp.frequency.value = hpf; hE(g, t, p, dec); s.connect(hp); hp.connect(g); g.connect(hDuck); };
const hSnare = (t, v) => { const ctx = HT.ctx, s = hN(t, 0.15), hp = ctx.createBiquadFilter(), g = ctx.createGain(); hp.type = 'highpass'; hp.frequency.value = 1400; hE(g, t, v * 0.5, 0.1); s.connect(hp); hp.connect(g); g.connect(hMaster); g.connect(hRev); const o = hO('triangle', 200, t, 0.1), og = ctx.createGain(); hE(og, t, v * 0.4, 0.07); o.connect(og); og.connect(hMaster); };
const hPump = (t) => { hDuck.gain.cancelScheduledValues(t); hDuck.gain.setValueAtTime(0.22, t); hDuck.gain.linearRampToValueAtTime(1, t + hsStepDur() * 2.3); };
const HV = {
  kick(t, v) { const ctx = HT.ctx, long = HS.doc.patch.bass === 'rumble' ? 0.42 : 0.3, o = hO('sine', 175, t, long + 0.05); o.frequency.exponentialRampToValueAtTime(46, t + 0.1); const g = ctx.createGain(); hE(g, t, v * 1.1, long); o.connect(g); g.connect(hMaster);
    const c = hN(t, 0.02), cg = ctx.createGain(), hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000; hE(cg, t, v * 0.35, 0.015); c.connect(hp); hp.connect(cg); cg.connect(hMaster); hPump(t); },
  bass(t, v) { const ctx = HT.ctx, G = HS.doc.patch, f = 55 * Math.pow(2, HSCH[HT.chord].bass / 12), d = hsStepDur(), g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    if (G.bass === '808') { const o = hO('sine', f * 2.2, t, d * 3.2); o.frequency.exponentialRampToValueAtTime(f, t + 0.05); hE(g, t, v * 0.95, d * 3); o.connect(g); g.connect(hMaster); return; }
    if (G.bass === 'rumble') { const o = hO('sawtooth', f, t, d * 1.6), o2 = hO('sine', f, t, d * 1.6); lp.frequency.value = 170; lp.Q.value = 2; hE(g, t, v * 0.9, d * 1.5); o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(hDuck); g.connect(hRev); return; }
    const o = hO('sawtooth', f, t, d), o2 = hO('square', f * 2.005, t, d), g2 = ctx.createGain(); g2.gain.value = 0.35; lp.Q.value = 5; lp.frequency.setValueAtTime(1300, t); lp.frequency.exponentialRampToValueAtTime(220, t + d * 0.8); hE(g, t, v * 0.55, d * 0.95); o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(hDuck); },
  hat(t, v) { hHat(t, v * 0.32, 0.045, 8500); }, open(t, v) { hHat(t, v * 0.3, 0.26, 7000); },
  clap(t, v) { const ctx = HT.ctx, s = hN(t, 0.3), bp = ctx.createBiquadFilter(), g = ctx.createGain(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.9; const p = v * 0.75;
    for (let i = 0; i < 3; i++) { g.gain.setValueAtTime(p, t + i * 0.012); g.gain.exponentialRampToValueAtTime(p * 0.15, t + i * 0.012 + 0.01); } g.gain.setValueAtTime(p, t + 0.036); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24); s.connect(bp); bp.connect(g); g.connect(hMaster); g.connect(hRev); },
  rim(t, v) { const ctx = HT.ctx, o = hO('triangle', 1750, t, 0.06), o2 = hO('square', 480, t, 0.06), g = ctx.createGain(), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 2; hE(g, t, v * 0.5, 0.045); o.connect(bp); o2.connect(bp); bp.connect(g); g.connect(hMaster); g.connect(hRev); },
  stab(t, v) { const ctx = HT.ctx, G = HS.doc.patch, ch = HSCH[HT.chord], d = hsStepDur(), g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
    if (G.lead === 'chip') { const iv = ch.iv[Math.floor(Math.random() * 3)], oct = Math.random() < 0.35 ? 2 : 1, o = hO('square', 440 * oct * Math.pow(2, (ch.root + iv) / 12), t, d * 0.9); hE(g, t, v * 0.16, d * 0.85); o.connect(g); g.connect(hDuck); g.connect(hDlySend); return; }
    const base = 220 * Math.pow(2, ch.root / 12);
    if (G.lead === 'organ') { ch.iv.forEach(iv => { const f = base * Math.pow(2, iv / 12); hO('triangle', f, t, 0.3).connect(lp); const q = hO('square', f * 2, t, 0.3), qg = ctx.createGain(); qg.gain.value = 0.25; q.connect(qg); qg.connect(lp); }); lp.frequency.value = 1900; hE(g, t, v * 0.2, 0.2); lp.connect(g); g.connect(hDuck); g.connect(hRev); g.connect(hDlySend); return; }
    if (G.lead === 'rave') { [0, 3, 7].forEach(iv => { hO('sawtooth', base * Math.pow(2, iv / 12), t, 0.2).connect(lp); }); lp.Q.value = 7; lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.12); hE(g, t, v * 0.16, 0.15); lp.connect(g); g.connect(hDuck); g.connect(hRev); return; }
    const len = d * 2.2; ch.iv.concat([12]).forEach(iv => { [-19, -8, 0, 8, 19].forEach(c => { const o = hO('sawtooth', base * Math.pow(2, iv / 12), t, len + 0.05); o.detune.value = c; o.connect(lp); }); });
    lp.Q.value = 1.5; lp.frequency.setValueAtTime(6500, t); lp.frequency.exponentialRampToValueAtTime(900, t + len); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 0.055, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + len); lp.connect(g); g.connect(hDuck); g.connect(hDlySend); g.connect(hRev); },
  roll(t, v) { const d = hsStepDur() / 2; for (let i = 0; i < 8; i++) hSnare(t + i * d, v * (0.3 + 0.7 * i / 7)); },
};
function hsRiser(t, dur) { const ctx = HT.ctx, s = hN(t, dur), bp = ctx.createBiquadFilter(), g = ctx.createGain(); bp.type = 'bandpass'; bp.Q.value = 1.2; bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(9000, t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + dur * 0.97); g.gain.linearRampToValueAtTime(0.0001, t + dur); s.connect(bp); bp.connect(g); g.connect(hMaster); g.connect(hRev); }
function hsPlayNode(id, t, n) {
  if (id === 'heart') return; const nd = HS.doc.patch.nodes[id]; if (!nd || nd.mute) return; if (HT.inBreak && (id === 'kick' || id === 'bass')) return;
  const ctx = HT.ctx, d = hsStepDur(), buf = nd.src && HT.bufs[nd.src.path];
  for (let i = 0; i < n; i++) { const tt = t + i * d / n, v = nd.vol * (i ? 0.7 : 1);
    if (buf) { const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf; g.gain.value = v; s.connect(g); g.connect(id === 'kick' ? hMaster : hDuck); s.start(tt); if (id === 'kick') hPump(tt); } else HV[id](tt, v); }
}
// ---- the chain
function hsFire(id, beat, life, depth, s, t, fired) {
  if (fired.has(id)) return; const p = HS.doc.patch, nd = p.nodes[id]; let n = 1; if (nd && nd.ratchet && Math.random() * 100 < nd.ratchet) n = Math.random() < 0.4 ? 3 : 2;
  fired.set(id, n); hsPlayNode(id, t, n); HT.vis.push({ type: 'hit', id, t });
  for (const w of p.wires) { if (w.from !== id) continue; if (beat % w.every !== w.phase) continue; if (Math.random() * 100 >= w.chance) continue;
    if (w.delay === 0) { if (depth < 6) { HT.vis.push({ type: 'pulse', w: w.id, t0: t, t1: t + 0.07 }); hsFire(w.to, beat, life, depth + 1, s, t, fired); } }
    else if (life - w.delay >= 0) { const at = s + w.delay; if (!HT.pending.has(at)) HT.pending.set(at, []); HT.pending.get(at).push({ id: w.to, beat, life: life - w.delay }); HT.vis.push({ type: 'pulse', w: w.id, t0: t, t1: t + w.delay * hsStepDur() }); } }
}
function hsStepAt(s, t0) {
  const p = HS.doc.patch, d = hsStepDur(), t = t0 + (s % 2 ? p.swing / 100 * d * 0.5 : 0), pos = s % 64, bar = Math.floor(s / 16), beat = Math.floor(s / 4);
  if (s % 16 === 0) { HT.chord = bar % 4; HT.inBreak = !HT.locked && bar % 4 === 3 && Math.random() * 100 < p.brk; if (HT.inBreak) hsRiser(t, 16 * d); hDly.delayTime.setValueAtTime(d * 3, t); HT.vis.push({ type: 'bar', bar, brk: HT.inBreak, t }); }
  if (HT.locked && HT.loop[pos]) { HT.pending.delete(s); if (s % 4 === 0) HT.vis.push({ type: 'hit', id: 'heart', t }); for (const e of HT.loop[pos]) { hsPlayNode(e[0], t, e[1]); HT.vis.push({ type: 'hit', id: e[0], t }); } return; }
  const fired = new Map(); if (s % 4 === 0) hsFire('heart', beat, p.wander, 0, s, t, fired);
  const arr = HT.pending.get(s); if (arr) { HT.pending.delete(s); for (const q of arr) hsFire(q.id, q.beat, q.life, 0, s, t, fired); }
  if (!HT.inBreak) { if (!HT.loop[pos]) HT.filled++; HT.loop[pos] = Array.from(fired.entries()).filter(e => e[0] !== 'heart'); }
}
function hsTick() { const ctx = HT.ctx; while (HT.next < ctx.currentTime + 0.16) { hsStepAt(HT.step, HT.next); HT.next += hsStepDur(); HT.step++; } }
function hsStart() { const ctx = hsCtx(); try { const r = ctx.resume(); if (r && r.catch) r.catch(() => toast('TAP ▶ ON THE TOP SCREEN TO START THE SOUND')); } catch (e) {} HT.step = 0; HT.pending.clear(); HT.next = ctx.currentTime + 0.08; HT.playing = true; HT.inBreak = false; HT.timer = setInterval(hsTick, 25); hsTick(); }
function hsStop() { HT.playing = false; clearInterval(HT.timer); HT.pending.clear(); HT.vis = []; HT.flow = []; }
// ---- drawing: the veins as tubes, what moves through them as blood
function hsGeom(w) { const a = HP[w.from], b = HP[w.to]; if (w.from === w.to) { const dx = a[0] < 591 ? -1 : 1, r = 26; return { self: true, cx: a[0] + dx * (a[2] + r - 8) * 0.8, cy: a[1] - (a[2] + r - 8) * 0.6, r }; }
  const dx = b[0] - a[0], dy = b[1] - a[1], k = ((w.from.charCodeAt(0) + w.to.charCodeAt(1)) % 2 ? 1 : -1) * 0.2; return { self: false, a, b, c: [(a[0] + b[0]) / 2 - dy * k, (a[1] + b[1]) / 2 + dx * k] }; }
function hsPt(g, t) { if (g.self) { const an = Math.PI / 2 + t * Math.PI * 2; return [g.cx + Math.cos(an) * g.r, g.cy + Math.sin(an) * g.r]; } const u = 1 - t; return [u * u * g.a[0] + 2 * u * t * g.c[0] + t * t * g.b[0], u * u * g.a[1] + 2 * u * t * g.c[1] + t * t * g.b[1]]; }
function hsLine(n, i) { const p = HP[n], my = HY0 + i * HPITCH + HRH / 2; return [[p[0] + p[2] * 0.7, p[1]], [p[0] + 190, p[1]], [HX0 - 200, my], [HX0 - 6, my]]; }
const hsCub = (c, t) => { const u = 1 - t, a = u * u * u, b = 3 * u * u * t, d = 3 * u * t * t, e = t * t * t; return [a * c[0][0] + b * c[1][0] + d * c[2][0] + e * c[3][0], a * c[0][1] + b * c[1][1] + d * c[2][1] + e * c[3][1]]; };
function hsDraw() {
  HT.raf = 0; if (!hsOn() || !HS.doc) return; HT.raf = requestAnimationFrame(hsDraw);
  const cv = HT.cv, W = cv.clientWidth, Hh = cv.clientHeight, dpr = Math.min(1.5, devicePixelRatio || 1); if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr); }
  const g = cv.getContext('2d'), k = W * dpr / 1920; g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, 1920, 1080); g.lineCap = 'round'; g.lineJoin = 'round';
  const d = HS.doc, p = d.patch, e = HT.el, now = HT.ctx ? HT.ctx.currentTime : 0;
  // what has happened by now
  if (HT.vis.length) { const keep = []; for (const v of HT.vis) { if (v.type === 'hit') { if (v.t <= now) { HT.flash[v.id] = v.t; if (v.id === 'heart') HT.beat = v.t; else HT.flow.push({ id: v.id, t: v.t }); } else keep.push(v); }
      else if (v.type === 'bar') { if (v.t <= now) { HT.bar = v.bar; e.bar.textContent = (v.bar % 4 + 1) + ' / 4'; e.chord.textContent = HSCH[v.bar % 4].name; e.brk.firstChild.style.background = v.brk ? '#ff7ad9' : '#2a2666'; e.brk.firstChild.style.boxShadow = v.brk ? '0 0 .6rem #ff7ad9' : ''; } else keep.push(v); } else if (v.t1 >= now) keep.push(v); } HT.vis = keep; }
  HT.flow = HT.flow.filter(f => now - f.t < 0.32);
  const fl = (id) => HT.flash[id] !== undefined ? Math.max(0, 1 - (now - HT.flash[id]) / 0.22) : 0, hb = HT.beat ? Math.max(0, 1 - (now - HT.beat) / 0.25) : 0;
  e.pic.style.transform = `scale(${(1 + hb * 0.012).toFixed(4)})`; e.pic.style.filter = `brightness(${(0.95 + hb * 0.2).toFixed(3)})`;
  e.status.textContent = HT.playing ? (HT.inBreak ? 'BREAKDOWN' : 'BEATING') : 'STOPPED'; e.status2.textContent = d.lock ? 'LOCKED TO THE LAST 4 BARS' : HT.playing ? 'EVOLVING' : 'PRESS ▶';
  const tube = (path, w, hot, sel) => { g.save(); g.globalAlpha = 0.5; g.strokeStyle = '#000'; g.lineWidth = w + 7; g.translate(2, 6); path(); g.stroke(); g.restore();
    if (sel) { g.strokeStyle = '#fff'; g.lineWidth = w + 8; path(); g.stroke(); } g.strokeStyle = '#0d0a2e'; g.lineWidth = w + 4; path(); g.stroke(); g.strokeStyle = '#5b62c9'; g.lineWidth = w; path(); g.stroke();
    g.strokeStyle = '#4a0f2c'; g.lineWidth = w * 0.5; path(); g.stroke();                                                                     // the blood at rest, dark, down the middle of the vein
    g.save(); g.translate(-w * 0.16, -w * 0.24); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = Math.max(1.2, w * 0.16); path(); g.stroke(); g.restore(); };
  const sw = d.sel && d.sel.type === 'wire' ? d.sel.id : -1, geo = {};
  for (const w of p.wires) { const q = geo[w.id] = hsGeom(w), wd = (5 + w.chance / 100 * 10) * (q.self ? 0.7 : 1);
    tube(() => { g.beginPath(); if (q.self) g.arc(q.cx, q.cy, q.r, 0, Math.PI * 2); else { g.moveTo(q.a[0], q.a[1]); g.quadraticCurveTo(q.c[0], q.c[1], q.b[0], q.b[1]); } }, wd, false, w.id === sw); }
  // blood on the move: a bright slug with a tail, from one socket to the next
  const slug = (pt, t, len, wd) => { const a = Math.max(0, t - len), n = 7; for (const [col, lw, al] of [['#ff2d7a', wd + 12, 0.28], ['#ff2d7a', wd, 1], ['#ffd0e4', wd * 0.45, 1]]) { g.globalAlpha = al; g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); for (let i = 0; i <= n; i++) { const q = pt(a + (t - a) * i / n); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); } g.stroke(); } g.globalAlpha = 1; const h = pt(t); g.fillStyle = '#fff'; g.beginPath(); g.arc(h[0], h[1], wd * 0.36, 0, 6.283); g.fill(); };
  for (const v of HT.vis) { if (v.type !== 'pulse' || v.t0 > now) continue; const q = geo[v.w], w = p.wires.find(x => x.id === v.w); if (!q || !w) continue; const t = Math.min(1, (now - v.t0) / Math.max(0.001, v.t1 - v.t0)); slug((u) => hsPt(q, u), t, 0.38, 5 + w.chance / 100 * 8); }
  // each drum's line to its sound: blood runs down it when the drum fires
  HORDER.forEach((n, i) => { const c = hsLine(n, i), f = fl(n), on = d.sel && d.sel.type === 'node' && d.sel.id === n; g.strokeStyle = on ? 'rgba(255,255,255,.95)' : 'rgba(207,202,255,.6)'; g.lineWidth = on ? 2.5 : 1.5; g.beginPath(); g.moveTo(c[0][0], c[0][1]); g.bezierCurveTo(c[1][0], c[1][1], c[2][0], c[2][1], c[3][0], c[3][1]); g.stroke();
    g.fillStyle = f > 0 ? '#ff2d7a' : '#fff'; g.beginPath(); g.arc(c[3][0], c[3][1], 5 + f * 4, 0, 6.283); g.fill(); HT.strips[n].meter.set(f); });
  for (const f of HT.flow) { const i = HORDER.indexOf(f.id); if (i >= 0) slug((u) => hsCub(hsLine(f.id, i), u), Math.min(1, (now - f.t) / 0.3), 0.3, 6); }
  // the sockets: a ring when selected, a bloom of blood when the drum hits; the core swells on every beat
  for (const n in HP) { const [x, y, r] = HP[n], f = n === 'heart' ? hb : fl(n), on = d.sel && d.sel.type === 'node' && d.sel.id === n;
    if (f > 0) { const gr = g.createRadialGradient(x, y, 0, x, y, r + 26 * f + 8); gr.addColorStop(0, `rgba(255,220,235,${0.9 * f})`); gr.addColorStop(0.45, `rgba(255,45,122,${0.75 * f})`); gr.addColorStop(1, 'rgba(255,45,122,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r + 26 * f + 8, 0, 6.283); g.fill(); }
    if (on) { g.strokeStyle = '#fff'; g.lineWidth = 3.5; g.beginPath(); g.arc(x, y, r + 8, 0, 6.283); g.stroke(); g.setLineDash([4, 7]); g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r + 16, 0, 6.283); g.stroke(); g.setLineDash([]); }
    if (n !== 'heart' && p.nodes[n].mute) { g.fillStyle = 'rgba(0,0,6,.6)'; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); } }
  // the odds of the selected string, on a small plate beside it
  if (sw >= 0 && geo[sw]) { const w = p.wires.find(x => x.id === sw), q = geo[sw], m = q.self ? [q.cx, q.cy - q.r - 22] : hsPt(q, 0.5), tx = w.chance + '%'; g.font = '22px Mono, monospace'; const tw = g.measureText(tx).width + 20; g.fillStyle = '#fff'; g.fillRect(m[0] - tw / 2, m[1] - 17, tw, 34); g.fillStyle = '#0d0a2e'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(tx, m[0], m[1] + 1); }
}
// ---- send the last four bars into the song as three new tracks of blocks
function hsSend() {
  if (HT.filled < 64) return toast('LET IT PLAY FOUR BARS FIRST, THEN SEND'); const p = HS.doc.patch, st = S.st; if (!st) return; if (st.tracks.length > 13) return toast('NO ROOM: THE SONG NEEDS 3 FREE TRACKS');
  mark(); const kitI = { trance: 0, techno: 1, hyperpop: 5, house: 3, garage: 4 }[p.style] || 0, kit = D.KITS[kitI], want = { kick: 0, roll: 1, clap: 2, hat: 3, open: 4, rim: 6 }, padOf = {};
  const td = parseInt(C('trk add 0')); applyKit(td, kit); let free = kit.pads.length;
  for (const n in want) { let i = kit.pads.findIndex(q => q && q.type === want[n]); if (i < 0) { i = free++; C(`pad ${td} ${i} ${want[n]} 0.5 0.4 0.7 0.5 0.6 -1`); } padOf[n] = i; }
  C(`trk name ${td} "HEART DRUMS"`); const bd = parseInt(C(`blk add ${td} 4 "HEART GROOVE"`));
  const sound = (name) => D.SOUNDS.find(s => s.name === name) || D.SOUNDS[0];
  const tb = parseInt(C('trk add 1')); applySound(tb, sound({ saw: 'ROLLING BASS', rumble: 'ROLLING BASS', '808': 'SUB 808' }[p.bass])); const bb = parseInt(C(`blk add ${tb} 4 "HEART BASS"`));
  const tl = parseInt(C('trk add 1')); applySound(tl, sound({ supersaw: 'SUPERSAW LEAD', rave: 'RAVE STAB', chip: 'CHIP LEAD', organ: 'GARAGE ORGAN' }[p.lead])); const bl = parseInt(C(`blk add ${tl} 4 "HEART LEAD"`));
  for (let s = 0; s < 64; s++) { const ch = HSCH[Math.floor(s / 16)]; for (const [id, n] of HT.loop[s] || []) { const nd = p.nodes[id]; if (!nd || nd.mute) continue; const v = clamp(nd.vol * 1.1, 0.1, 1).toFixed(2);
      for (let i = 0; i < n; i++) { const tk = s * 24 + Math.round(i * 24 / n);
        if (id === 'roll') { for (let r = 0; r < 8; r++) if (tk + r * 12 < 1536) C(`n ${td} ${bd} ${tk + r * 12} 12 ${padOf.roll} ${(0.3 + 0.7 * r / 7).toFixed(2)}`); }
        else if (id === 'bass') C(`n ${tb} ${bb} ${tk} ${p.bass === '808' ? 60 : 22} ${33 + ch.bass} ${v}`);
        else if (id === 'stab') { if (p.lead === 'chip') C(`n ${tl} ${bl} ${tk} 20 ${69 + ch.root + ch.iv[(s + i) % 3]} ${v}`); else for (const iv of ch.iv) C(`n ${tl} ${bl} ${tk} ${p.lead === 'supersaw' ? 48 : 24} ${57 + ch.root + iv} ${v}`); }
        else C(`n ${td} ${bd} ${tk} 24 ${padOf[id]} ${v}`); } } }
  for (const [t, b] of [[td, bd], [tb, bb], [tl, bl]]) C(`pl add ${t} 0 ${b}`);
  for (const n in padOf) { const src = p.nodes[n].src; if (src && src.path) { C(`sel track ${td}`); SMB.load(src.path, 'pad ' + padOf[n]); } }
  C('sel track ' + td); C(`ed ${td} ${bd}`); C('bump'); sync(true);
  toast(st.bpm === p.bpm ? 'SENT: 3 NEW TRACKS AT BAR 1' : `SENT AT BAR 1 · SONG IS ${st.bpm} BPM, THIS GROOVE WAS ${p.bpm}`);
}

// ================================================================ BOTTOM SCREEN: the editor
const HB = { root: null, built: '' };
function hsBottomShow(app, on) { if (!HB.root) { HB.root = h('div', { class: 'abs', style: 'inset:0;display:none' }); app.append(HB.root); } HB.root.style.display = on ? 'block' : 'none'; if (on) { if (!HS.doc) hsInit(); hsBottomRender(true); } }
const HSBPLATES = () => PL.plate([[0, 0], [1240, 0], [1240, 84], [1200, 116], [40, 116], [0, 84]], 'plate', PL.rivet(20, 20) + PL.rivet(1220, 20)) + PL.plate([[20, 800], [40, 780], [1220, 780], [1220, 1040], [1200, 1060], [20, 1060]], 'plateH', PL.rivet(44, 804) + PL.rivet(1196, 804) + PL.rivet(44, 1036) + PL.rivet(1196, 1036)) + PL.cross(20, 136) + PL.cross(1220, 136);
function hsPickFile(n) {
  let path = ''; const list = h('div', { class: 'list scroll lcd', style: 'height:26rem' }), where = lab('', 'hi'), body = h('div', { class: 'col gap' }, h('div', { class: 'row gap' }, btn('▲ UP', () => go(up)), where), list); let up = '';
  function go(pth) { path = pth; let L; try { L = JSON.parse(SMB.browse(pth)); } catch (e) { L = { path: pth, up: '', dirs: [], files: [] }; } up = L.up || ''; where.textContent = (L.path || 'CHOOSE WHERE TO LOOK').toUpperCase().slice(-44); list.innerHTML = '';
    for (const d of L.dirs) list.append(h('div', { class: 'it', tap: () => go(d.p) }, h('span', { style: 'color:#b04bff' }, '▸'), d.n));
    for (const f of L.files) list.append(h('div', { class: 'it' }, h('button', { class: 'grow', style: 'height:3rem;text-align:left;overflow:hidden;white-space:nowrap', tap: () => SMB.preview(f.p) }, '♪ ' + f.n.slice(0, 30)), h('button', { class: 'btn sm on', style: 'margin-left:.5rem', tap: () => { C('pre'); HS.doc.patch.nodes[n].src = { path: f.p, name: f.n.replace(/\.[a-z0-9]+$/i, '').toUpperCase().slice(0, 22) }; hsPut(); closePop(); hsBottomRender(true); } }, 'USE')));
    if (L.path && !L.dirs.length && !L.files.length) list.append(h('div', { class: 'it', style: 'white-space:normal;line-height:1.6;padding:1rem', tap: () => SMB.storage() }, L.denied ? 'STRING-R NEEDS PERMISSION TO SEE YOUR MUSIC FILES. TAP HERE TO ALLOW IT.' : 'NO SOUND FILES HERE.')); }
  popup('A SAMPLE FOR ' + HSNAME[n] + ' · TAP TO HEAR, USE TO CHOOSE', body, 56); go('');
}
function hsPickKit(n) {
  let kits = []; try { kits = JSON.parse(SMB.kits()); } catch (e) {} const list = h('div', { class: 'list scroll lcd', style: 'height:26rem' });
  const open = (name) => { list.innerHTML = ''; let pads = []; try { pads = JSON.parse(SMB.kitPads(name)); } catch (e) {} pads = pads.filter(q => q.path);
    list.append(h('div', { class: 'it', tap: show }, '◀ ALL KITS')); if (!pads.length) list.append(h('div', { class: 'it' }, 'THIS KIT HAS NO SAMPLES OF YOUR OWN'));
    for (const q of pads) { const nm = q.path.split('/').pop().replace(/\.[a-z0-9]+$/i, '').toUpperCase().slice(0, 22); list.append(h('div', { class: 'it' }, h('button', { class: 'grow', style: 'height:3rem;text-align:left;overflow:hidden;white-space:nowrap', tap: () => SMB.preview(q.path) }, `♪ PAD ${pad2(q.i + 1)} · ${nm}`), h('button', { class: 'btn sm on', style: 'margin-left:.5rem', tap: () => { C('pre'); HS.doc.patch.nodes[n].src = { path: q.path, name: nm }; hsPut(); closePop(); hsBottomRender(true); } }, 'USE'))); } };
  const show = () => { list.innerHTML = ''; if (!kits.length) list.append(h('div', { class: 'it', style: 'white-space:normal;line-height:1.6;padding:1rem' }, 'NO KITS SAVED YET. BUILD ONE ON A DRUM TRACK IN STRING-R AND TAP SAVE KIT.')); for (const k of kits) list.append(h('div', { class: 'it', tap: () => open(k.n) }, h('span', { style: 'color:#b04bff' }, '▸'), k.n, h('span', { class: 'tag' }, k.smp + ' SAMPLES'))); };
  popup('MY KITS · A SOUND FOR ' + HSNAME[n], list, 52); show();
}
function hsBottomRender(force) {
  if (!HB.root || !HS.doc) return; const d = HS.doc, p = d.patch; let sn = d.sel && d.sel.type === 'node' ? d.sel.id : null, sw = d.sel && d.sel.type === 'wire' ? p.wires.find(w => w.id === d.sel.id) : null; if (sw) sn = sw.from; if (!sn) sn = 'kick';
  const outs = p.wires.filter(w => w.from === sn); if (!sw && outs.length) sw = outs[0];
  const key = JSON.stringify([sn, sw && sw.id, p.style, d.lock, d.play, p.wires.map(w => [w.id, w.from, w.to, w.delay, w.every, w.phase]), sn !== 'heart' && [p.nodes[sn].mute, p.nodes[sn].src]]);
  if (!force && key === HB.built) { HB.root.querySelectorAll('.knob').forEach(k => k.upd && k.upd()); HB.root.querySelectorAll('[data-ch]').forEach(e => { const w = p.wires.find(x => x.id === +e.dataset.ch); if (w) e.firstChild.style.width = w.chance + '%'; }); HB.root.querySelectorAll('[data-pc]').forEach(e => { const w = p.wires.find(x => x.id === +e.dataset.pc); if (w) e.textContent = w.chance + '%'; }); return; }
  HB.built = key; const R = HB.root; R.innerHTML = ''; const A = (style, ...k) => h('div', { class: 'abs', style }, k), nd = sn === 'heart' ? null : p.nodes[sn];
  const pick = (id) => { d.sel = { type: 'node', id }; hsPut(); hsBottomRender(true); }, K = (o) => knob({ ...o, set: (v) => { o.set(v); hsPutSoon(); } });
  R.append(A('left:1.5rem;top:.6rem;width:59rem;height:4.4rem;display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:.3rem;align-items:center', HSN.map(([id, name]) => btn(name, () => pick(id), id === sn ? 'on' : 'off', 'height:3.8rem;font-size:.78rem;padding:0 .2rem;white-space:normal;line-height:1rem'))));
  R.append(A('left:1.2rem;top:6.4rem;width:59.6rem;height:3.6rem;display:flex;align-items:center;gap:.8rem', h('div', { style: 'width:.5rem;height:2.8rem;background:#fff;box-shadow:0 0 .8rem #b04bff' }), h('div', { class: 'mich chrome', style: 'font-size:1.6rem;letter-spacing:.2rem;white-space:nowrap' }, HSNAME[sn]),
    lab(sn === 'heart' ? 'THE CLOCK · BEATS ONCE A BEAT AND STARTS EVERY CHAIN' : 'TAP ITS SOCKET ON THE HEART, OR ITS STRIP, TO SELECT IT', 'hi'), h('div', { class: 'grow' }), nd ? btn(nd.mute ? 'MUTED' : 'MUTE', () => { nd.mute = !nd.mute; hsPut(); hsBottomRender(true); }, nd.mute ? 'hot' : '', 'width:7rem') : null));
  // the sound of this drum
  const left = h('div', { class: 'abs lcd col', style: 'left:1rem;top:10.6rem;width:22rem;height:27.6rem;padding:.7rem;gap:.6rem;background-color:rgba(7,5,28,.82)' }); R.append(left);
  if (nd) { const cur = h('b', { style: 'display:block;width:100%;font-size:1rem;color:#fff' });
    left.append(lab('THE SOUND OF THIS DRUM', 'hi'), h('div', { class: 'lcd col', style: 'padding:.6rem .7rem;gap:.3rem' }, lab(nd.src ? 'YOUR SAMPLE' : 'BUILT-IN · FOLLOWS THE STYLE'), cur),
      h('div', { class: 'col', style: 'gap:.4rem' }, btn('BUILT-IN', () => { nd.src = null; hsPut(); hsBottomRender(true); }, nd.src ? '' : 'on', 'height:3.2rem'), btn('MY SAMPLES', () => hsPickFile(sn), '', 'height:3.2rem'), btn('MY KITS', () => hsPickKit(sn), '', 'height:3.2rem')),
      kgrid(2, [K({ label: 'LEVEL', small: true, get: () => nd.vol, set: (v) => { nd.vol = v; } }), K({ label: 'ROLL CHANCE %', small: true, fmt: (v) => String(Math.round(v * 100)), get: () => nd.ratchet / 100, set: (v) => { nd.ratchet = Math.round(v * 100); } })], 'flex:1;align-content:center'));
    requestAnimationFrame(() => fitTxt(cur, hsSound(sn))); }
  else left.append(lab('THE HEART', 'hi'), h('div', { class: 'mono', style: 'font-size:.8rem;line-height:1.5rem;color:#dcd8ff;letter-spacing:.05rem' }, 'THE HEART MAKES NO SOUND. IT BEATS ON EVERY BEAT AND PUMPS INTO ITS STRINGS. IN MOST STYLES ITS ONE STRING GOES TO THE KICK; IN GARAGE IT FEEDS THE CLAP, HATS AND LEAD DIRECTLY.'));
  // its strings
  const rows = h('div', { class: 'col scroll', style: 'flex:1;min-height:0' });
  for (const w of outs) { const on = sw && w.id === sw.id; rows.append(h('button', { class: on ? '' : '', style: `display:grid;grid-template-columns:9.4rem minmax(0,1fr) 3.6rem;gap:.6rem;align-items:center;min-height:2.4rem;height:2.4rem;flex-shrink:0;padding:0 .6rem;text-align:left;border-bottom:1px solid rgba(190,180,255,.25);${on ? 'background:linear-gradient(180deg,#fff,#d9d5ff 45%,#a39df0);color:#0d0a2e' : ''}`, tap: () => { d.sel = { type: 'wire', id: w.id }; hsPut(); hsBottomRender(true); } },
      h('span', { style: 'font-size:.85rem;font-weight:700;white-space:nowrap;overflow:hidden' }, '→ ' + (w.to === sn ? 'ITSELF' : HSNAME[w.to])), h('div', { class: 'col', style: 'gap:.2rem;min-width:0' }, h('div', { 'data-ch': w.id, style: `height:.5rem;border:1px solid ${on ? '#0d0a2e' : '#a9a3f0'};background:${on ? 'rgba(13,10,46,.25)' : '#15123f'}` }, h('div', { style: `width:${w.chance}%;height:100%;background:${on ? '#0d0a2e' : 'linear-gradient(90deg,#6d5cf2,#e9e6ff)'}` })),
        h('span', { class: 'mono', style: 'font-size:.7rem;letter-spacing:.04rem;white-space:nowrap;overflow:hidden' }, hsFires(w.delay) + ' · ' + hsAllowed(w))), h('span', { class: 'mich', 'data-pc': w.id, style: 'font-size:.9rem;text-align:right' }, w.chance + '%'))); }
  if (!outs.length) rows.append(h('div', { class: 'mono', style: 'padding:1rem;font-size:.8rem;color:#dcd8ff;line-height:1.4rem' }, 'NO STRINGS LEAVE THIS DRUM. IT ONLY PLAYS WHEN ANOTHER DRUM FIRES IT. ADD ONE TO MAKE IT PASS THE PULSE ON.'));
  const right = h('div', { class: 'abs lcd col', style: 'left:23.8rem;top:10.6rem;width:37.2rem;height:27.6rem;padding:.7rem;gap:.5rem;background-color:rgba(7,5,28,.82)' }); R.append(right);
  right.append(h('div', { class: 'row gap' }, lab('STRINGS LEAVING ' + HSNAME[sn], 'hi'), h('div', { class: 'grow' }), btn('+ ADD STRING', () => choose('A NEW STRING FROM ' + HSNAME[sn] + ' TO…', HSN.slice(1).map(([id, name]) => ({ label: id === sn ? 'ITSELF' : name })), (i) => { const to = HSDRUMS[i]; let w = p.wires.find(x => x.from === sn && x.to === to); if (!w) { w = { id: Math.max(0, ...p.wires.map(x => x.id)) + 1, from: sn, to, delay: sn === to ? 1 : 2, chance: 50, every: 1, phase: 0 }; p.wires.push(w); } d.sel = { type: 'wire', id: w.id }; hsPut(); hsBottomRender(true); }, 4, 56), 'hot sm'),
    sw ? btn('REMOVE', () => { p.wires = p.wires.filter(x => x.id !== sw.id); d.sel = { type: 'node', id: sn }; hsPut(); hsBottomRender(true); }, 'sm') : null), rows);
  if (sw) right.append(h('div', { class: 'row gap', style: 'align-items:center' }, K({ label: 'CHANCE %', small: true, fmt: (v) => String(Math.round(v * 100)), get: () => sw.chance / 100, set: (v) => { sw.chance = Math.round(v * 100); const e = R.querySelector(`[data-ch="${sw.id}"]`); if (e) e.firstChild.style.width = sw.chance + '%'; const pc = R.querySelector(`[data-pc="${sw.id}"]`); if (pc) pc.textContent = sw.chance + '%'; } }),
    h('div', { class: 'col grow', style: 'gap:.4rem;min-width:0' }, two('FIRES', hsFires(sw.delay) + ' ▾', () => choose('WHEN DOES IT FIRE?  (A STEP IS A 16TH NOTE; 2 STEPS LATER IS THE OFFBEAT)', Array.from({ length: 13 }, (_, i) => ({ label: hsFires(i), on: i === sw.delay })), (i) => { sw.delay = i; hsPut(); hsBottomRender(true); }, 3, 58)),
      two('ALLOWED ON', hsAllowed(sw) + ' ▾', () => choose('ON WHICH BEATS MAY IT FIRE?', HSEVERY.map(o => ({ label: o[2], on: o[0] === sw.every && o[1] === sw.phase })), (i) => { sw.every = HSEVERY[i][0]; sw.phase = HSEVERY[i][1]; hsPut(); hsBottomRender(true); }, 2, 56)))));
  // the machine
  const mk = (label, key, lo, hi, fmt) => K({ label, small: true, fmt: (v) => fmt(Math.round(lo + v * (hi - lo))), get: () => (p[key] - lo) / (hi - lo), set: (v) => { p[key] = Math.round(lo + v * (hi - lo)); } });
  R.append(A('left:3.4rem;top:39.9rem;width:34.6rem;height:12.4rem;display:flex;flex-direction:column;gap:.3rem', h('span', { class: 'lab', style: 'color:#0d0a2e;font-size:.75rem' }, 'THE MACHINE · ALL DRUMS'), kgrid(5, [mk('TEMPO', 'bpm', 100, 180, v => String(v)), mk('WANDER', 'wander', 1, 16, v => String(v)), mk('SWING %', 'swing', 0, 60, v => String(v)), mk('DAMAGE %', 'drive', 0, 100, v => String(v)), mk('BREAKS %', 'brk', 0, 100, v => String(v))], 'flex:1;align-content:center')));
  const names = Object.keys(d.patches || {});
  R.append(A('left:39rem;top:40rem;width:21rem;display:flex;flex-direction:column;gap:.45rem', h('div', { class: 'row', style: 'gap:.45rem' }, btn(d.play ? '■ STOP' : '▶ PLAY', () => { d.play = !d.play; hsPut(); hsBottomRender(true); }, d.play ? 'on' : '', 'flex:1;height:3.4rem'), btn(d.lock ? 'LOCKED' : 'LOCK 4 BARS', () => { d.lock = !d.lock; hsPut(); hsBottomRender(true); }, d.lock ? 'on' : '', 'flex:1.3;height:3.4rem;padding:0')),
    btn('SEND 4 BARS TO SONG', () => { d.send = (d.send || 0) + 1; hsPut(); }, 'hot', 'height:3.4rem'),
    h('div', { class: 'row', style: 'gap:.45rem' }, btn('SAVE PATCH', () => ask('NAME THIS PATCH', d.name || '', (v) => { d.patches = d.patches || {}; d.name = v.toUpperCase(); d.patches[d.name] = JSON.parse(JSON.stringify(p)); hsPut(); toast('PATCH SAVED'); }), '', 'flex:1;height:3.2rem;padding:0'),
      btn('LOAD PATCH', () => names.length ? choose('LOAD A PATCH', names, (i) => { d.patch = JSON.parse(JSON.stringify(d.patches[names[i]])); d.name = names[i]; d.reset = (d.reset || 0) + 1; d.lock = false; d.sel = { type: 'node', id: 'kick' }; hsPut(); hsBottomRender(true); }, 2, 50) : toast('NO PATCHES SAVED YET'), '', 'flex:1;height:3.2rem;padding:0'))));
}
