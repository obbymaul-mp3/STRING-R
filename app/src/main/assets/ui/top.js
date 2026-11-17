// STRING-R: the top screen. The song as blocks on a timeline, the notes inside a block, the sample, the files.
'use strict';
document.documentElement.className = 'top';
const VIEWS = ['SONG', 'NOTES', 'SAMPLE', 'FILES'], BGS = ['serpent', 'star', 'drop', 'portal'];
const U = { zb: 32, bar0: 0, row0: 0, selT: -1, selBar: -1, stamp: false, bar: 0, zoom: 2, len: 1, vel: 0.8, lock: true, chord: false, autoP: -1, erase: false, krow0: null, select: false, selN: new Set(), drow: 0, clipBar: null, path: '', pick: '', listing: null, peaksFor: -1, peaks: null };
const TINT = [['#ffffff', '#d9d5ff', '#a39df0'], ['#e2ccff', '#a877ff', '#6d3cf2'], ['#ffe1f6', '#ff9ae3', '#e0489f'], ['#d6ebff', '#86b4ff', '#4f7bf2'], ['#f4f5fa', '#b9bfd2', '#7f869e'], ['#e9ffd6', '#b4f07a', '#5fae2a'], ['#fff3d6', '#ffcf7a', '#e08a2a'], ['#d6fff6', '#7af0d8', '#2aae96']];
let hd = {}, rail, body, tabs = [], toolsEl, cur = null, curKey = '', railMeters = [], splash, main;
const fit = (cv) => { const d = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, hh = cv.clientHeight; if (cv.width !== Math.round(w * d) || cv.height !== Math.round(hh * d)) { cv.width = Math.round(w * d); cv.height = Math.round(hh * d); } const g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); return [g, w, hh]; };
const MAINPLATES = PL.laser(316, 978, 1604) +
  PL.plate([[0, 0], [1920, 0], [1920, 96], [1880, 132], [1250, 132], [1214, 104], [706, 104], [670, 132], [40, 132], [0, 96]], 'plate', PL.rivet(22, 22) + PL.rivet(1898, 22) + PL.rivet(690, 22) + PL.rivet(1230, 22) + PL.text(712, 99, 'SM-MAX // UNIT 01 // ALPHA 0.2', 12, '#0d0a2e', 0.75) + PL.text(1208, 99, 'AUDIO AMPLIFIER ON', 12, '#0d0a2e', 0.75, 'end')) +
  PL.plate([[0, 156], [276, 156], [316, 196], [316, 1080], [0, 1080]], 'plateH', PL.rivet(20, 176) + PL.rivet(296, 216) + PL.rivet(20, 1060) + PL.rivet(296, 1060)) +
  PL.plate([[352, 1080], [352, 1024], [388, 992], [1920, 992], [1920, 1080]], 'plate', PL.rivet(1898, 1012) + PL.rivet(404, 1012)) + PL.cross(336, 150) + PL.cross(1904, 150);
const HOMEPLATES = PL.laser(200, 952, 1520) +
  PL.plate([[0, 0], [520, 0], [480, 40], [60, 40], [40, 60], [40, 420], [0, 460]], 'plateH', PL.rivet(20, 20) + PL.rivet(20, 420)) + PL.plate([[1920, 0], [1400, 0], [1440, 40], [1860, 40], [1880, 60], [1880, 420], [1920, 460]], 'plateH', PL.rivet(1900, 20) + PL.rivet(1900, 420)) +
  PL.plate([[0, 1080], [0, 620], [40, 660], [40, 1020], [60, 1040], [700, 1040], [740, 1080]], 'plateH', PL.rivet(20, 1060)) + PL.plate([[1920, 1080], [1920, 620], [1880, 660], [1880, 1020], [1860, 1040], [1220, 1040], [1180, 1080]], 'plateH', PL.rivet(1900, 1060)) +
  PL.text(80, 96, 'SM-MAX // UNIT 01', 15, '#dcd8ff') + PL.text(80, 120, 'ALPHA 0.2 · BLOCKS ON A TIMELINE', 13, '#dcd8ff', 0.6) + PL.text(1840, 96, 'THOR MAX · DUAL SCREEN', 15, '#dcd8ff', 0.8, 'end') + PL.cross(100, 980) + PL.cross(1820, 980);

function build() {
  const app = document.getElementById('app'), A = (style, ...k) => h('div', { class: 'abs', style }, k);
  hd.title = h('div', { style: 'font-size:.8rem;line-height:1rem;letter-spacing:.05rem;color:#fff;word-break:break-word;max-width:100%' });
  const cell = (l, fn) => { const v = h('div', { class: 'mich', style: 'font-size:1.1rem;line-height:1.6rem;color:#fff;text-shadow:0 0 .6rem #8f7bff;white-space:nowrap' }); return [h('button', { class: 'col', style: 'align-items:center;justify-content:center;gap:.05rem;border-right:1px solid rgba(190,180,255,.3);height:100%', tap: fn }, lab(l), v), v]; };
  const c1 = cell('BPM', tempoPop), c2 = cell('KEY', keyPop), c3 = cell('BAR', () => { C('seek 0'); sync(); }), c4 = cell('BARS', () => setSel('view', 0)); hd.bpm = c1[1]; hd.key = c2[1]; hd.pos = c3[1]; hd.len = c4[1];
  const tb = (g, fn, aria, col) => h('button', { class: 'btn', style: `width:4.2rem;height:4.2rem;font-size:1.4rem;padding:0;color:${col || '#e4dfff'};clip-path:polygon(.6rem 0,100% 0,100% calc(100% - .6rem),calc(100% - .6rem) 100%,0 100%,0 .6rem)`, 'aria-label': aria, tap: fn }, g);
  hd.play = tb('▶', () => transport('PLAY'), 'Play', '#fff'); hd.rec = tb('●', () => transport('REC'), 'Record', '#ff7ad9'); hd.lufs = lab('--'); hd.mL = leds('', 'width:100%'); hd.mR = leds('', 'width:100%');
  rail = A('left:.9rem;top:10rem;width:13.4rem;display:flex;flex-direction:column;gap:.5rem'); body = A('left:17.6rem;top:7.3rem;width:77.4rem;height:41.5rem');
  tabs = VIEWS.map((v, i) => btn(v, () => setSel('view', i), 'off', 'width:7.4rem;height:3.2rem;font-size:.95rem;padding:0;clip-path:polygon(.7rem 0,100% 0,100% calc(100% - .7rem),calc(100% - .7rem) 100%,0 100%,0 .7rem)'));
  toolsEl = h('div', { class: 'row gap grow', style: 'justify-content:flex-end;min-width:0' });
  hd.undo = btn('↶', () => { C('undo'); sync(); }, 'sq', 'font-size:1.2rem'); hd.redo = btn('↷', () => { C('redo'); sync(); }, 'sq', 'font-size:1.2rem');
  main = A('inset:0',
    A('left:2.8rem;top:.8rem;width:30rem;height:5rem;display:flex;align-items:center;gap:.9rem', h('div', { class: 'lcd cut col', style: 'height:4.2rem;padding:0 1.3rem;justify-content:center;gap:.2rem' }, h('div', { class: 'mich chrome', style: 'font-size:1.8rem;letter-spacing:.45rem;line-height:2rem' }, 'STRING-R'), h('div', { class: 'mono', style: 'font-size:.7rem;letter-spacing:.2rem;color:#b9b2ff' }, 'STRINGER MAX')),
      h('button', { class: 'lcd col grow', style: 'height:4.2rem;padding:.3rem .8rem;justify-content:center;gap:.15rem;text-align:left;align-items:flex-start', tap: () => setSel('view', 3) }, lab('SONG'), hd.title)),
    h('div', { class: 'abs lcd', style: 'left:36.1rem;top:.6rem;width:23.8rem;height:3.5rem;display:grid;grid-template-columns:repeat(4,minmax(0,1fr))' }, c1[0], c2[0], c3[0], c4[0]),
    A('left:67rem;top:.9rem;width:26.2rem;height:4.8rem;display:flex;align-items:center;gap:.6rem', tb('◀◀', () => { C('stop'); C('seek 0'); sync(); }, 'Back to start'), hd.play, tb('■', () => { C('stop'); sync(); }, 'Stop'), hd.rec,
      h('div', { class: 'lcd col grow', style: 'height:4.2rem;padding:.5rem .6rem;justify-content:space-between' }, h('div', { class: 'row', style: 'justify-content:space-between' }, lab('LUFS'), hd.lufs), hd.mL, hd.mR)),
    A('left:60.2rem;top:1.3rem;width:6.6rem;height:3.2rem;display:flex;gap:.2rem', hd.undo, hd.redo), rail, body, A('left:21.5rem;top:50.1rem;width:73.4rem;height:3.4rem;display:flex;align-items:center;gap:.5rem', tabs, toolsEl));
  splash = h('div', { class: 'abs', style: 'inset:0;display:none', onpointerdown: () => setSel('home', 0) },
    h('div', { class: 'abs col', style: 'left:0;right:0;top:36rem;align-items:center;gap:1.4rem' }, h('div', { class: 'mich chrome', style: 'font-size:7.5rem;letter-spacing:1.7rem;line-height:9rem;padding-left:1.7rem;filter:drop-shadow(0 0 1.5rem rgba(120,130,255,.9))' }, 'STRING-R'), h('div', { class: 'mono', style: 'font-size:1.1rem;letter-spacing:.8rem;color:#fff' }, 'STRINGER MAX · POCKET WORKSTATION'),
      h('div', { class: 'mono', style: 'margin-top:1.2rem;font-size:.75rem;letter-spacing:.4rem;color:#dcd8ff' }, 'CHOOSE A SONG ON THE LOWER SCREEN')));
  app.append(main, splash);
}
function tempoPop() {
  let taps = []; const num = h('div', { class: 'mich', style: 'font-size:3.2rem;width:12rem;text-align:center;color:#fff;text-shadow:0 0 1rem #8f7bff' }, S.st.bpm); const set = (v) => { C('bpm ' + clamp(Math.round(v), 40, 240)); sync(); num.textContent = S.st.bpm; };
  const sw = knob({ label: 'SWING', small: true, get: () => S.st.swing, set: (v) => { S.st.swing = v; C('swing ' + v.toFixed(3)); } }); const met = btn('METRONOME', () => { C('metro ' + (S.st.metro ? 0 : 1)); sync(); met.classList.toggle('on', !!S.st.metro); }, S.st.metro ? 'on' : '', 'flex:1;height:5rem');
  popup('TEMPO', h('div', { class: 'col gap' }, h('div', { class: 'row gap', style: 'justify-content:center' }, ...[-10, -1].map(d => btn(d, () => set(S.st.bpm + d), 'sq')), num, ...[1, 10].map(d => btn('+' + d, () => set(S.st.bpm + d), 'sq'))),
    h('div', { class: 'row gap' }, ...[120, 128, 132, 138, 140, 150, 160, 174].map(v => btn(v, () => set(v), '', 'flex:1;padding:0'))),
    h('div', { class: 'row gap' }, h('button', { class: 'btn', style: 'flex:1.4;height:5rem', onpointerdown: () => { const n = performance.now(); taps = taps.filter(t => n - t < 2500); taps.push(n); if (taps.length > 2) set(60000 / ((taps[taps.length - 1] - taps[0]) / (taps.length - 1))); } }, 'TAP TEMPO'), sw, met)), 52);
}
function keyPop() {
  const b = h('div', { class: 'col gap' }); const draw = () => { b.innerHTML = ''; b.append(h('div', { style: 'display:grid;grid-template-columns:repeat(6,1fr);gap:.4rem' }, D.NOTES.map((n, i) => btn(n, () => { edit(`key ${i} ${S.st.scale}`); draw(); }, S.st.key === i ? 'on' : '', 'padding:0'))),
    h('div', { style: 'display:grid;grid-template-columns:repeat(4,1fr);gap:.4rem' }, D.SCALES.map((s, i) => btn(s[0], () => { edit(`key ${S.st.key} ${i}`); draw(); }, S.st.scale === i ? 'on' : '', 'padding:0'))), lab('THE KEY SETS WHICH NOTES THE PIANO ROLL SHOWS AND WHERE AUTO-TUNE PULLS A VOICE', 'hi')); }; draw(); popup('KEY AND SCALE', b, 56);
}
function trackMenu(t) {
  const T = S.st.tracks[t], items = ['RENAME', 'DELETE TRACK']; if (T.type === 3) items.push('MIDI CHANNEL ' + (T.ch + 1));
  choose(T.name, items, (i) => { if (i === 0) ask('TRACK NAME', T.name, (v) => edit(`trk name ${t} "${v.toUpperCase().replace(/"/g, '')}"`)); else if (i === 1) confirmPop('DELETE ' + T.name + '?', () => edit(`trk del ${t}`, `sel track ${Math.max(0, t - 1)}`)); else edit(`trk ch ${t} ${(T.ch + 1) % 16}`); }, 2, 44);
}

// ---------------------------------------------------------------- the start screen's backdrop: the chrome heart turning, stars blinking behind it
// The heart is a short film of ray-traced frames (bg/spin.webp) laid exactly over a still of the same scene without it (bg/sky.jpg).
// If the film cannot be shown, the still heart is used instead.
const SP = { img: null, sky: null, ok: null, on: false, stars: null };
function splashPlace() { const W = innerWidth, H = innerHeight, k = Math.max(W / 1920, H / 1080), size = 1080 * k; if (SP.img) SP.img.style.cssText += `;left:${(W - size) / 2}px;top:${(H - size) / 2}px;width:${size}px;height:${size}px`; }
function splashBg(on) {
  const bg = document.getElementById('bg');
  if (!SP.img) { SP.img = h('img', { id: 'spin', alt: '' }); SP.sky = h('canvas', { id: 'sky' }); bg.append(SP.sky, SP.img); SP.img.onload = () => { SP.ok = true; if (SP.on) splashBg(true); }; SP.img.onerror = () => { SP.ok = false; if (SP.on) splashBg(true); }; SP.img.src = 'bg/spin.webp'; addEventListener('resize', splashPlace); }
  SP.on = on; const film = on && SP.ok === true;
  SP.img.style.display = film ? 'block' : 'none'; SP.sky.style.display = on ? 'block' : 'none'; if (film) splashPlace();
  if (on) { const name = film ? 'sky' : 'heart'; if (bgName !== name) { bgName = name; bg.style.backgroundImage = `url(bg/${name}.jpg)`; } if (!SP.raf) SP.raf = requestAnimationFrame(twinkle); }
}
function twinkle(now) {
  SP.raf = 0; if (!SP.on) return; const cv = SP.sky, W = cv.clientWidth, H = cv.clientHeight; if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  if (!SP.stars) { let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; SP.stars = Array.from({ length: 90 }, () => ({ x: rnd(), y: rnd() * 0.86, r: 0.5 + rnd() * 1.6, sp: 0.6 + rnd() * 2.4, ph: rnd() * 6.28, big: rnd() > 0.86 })); }
  const g = cv.getContext('2d'), t = now / 1000, cx = W / 2, cy = H / 2, clear = Math.min(W, H) * 0.3; g.clearRect(0, 0, W, H);
  for (const s of SP.stars) { const x = s.x * W, y = s.y * H; if (Math.hypot(x - cx, y - cy) < clear) continue; const a = Math.pow(0.5 + 0.5 * Math.sin(t * s.sp + s.ph), 3); if (a < 0.03) continue;
    g.globalAlpha = a; g.fillStyle = '#eef0ff'; g.beginPath(); g.arc(x, y, s.r, 0, 6.283); g.fill();
    if (s.big) { const L = 6 + 16 * a; g.strokeStyle = '#cfd4ff'; g.lineWidth = 1; g.globalAlpha = a * 0.8; g.beginPath(); g.moveTo(x - L, y); g.lineTo(x + L, y); g.moveTo(x, y - L); g.lineTo(x, y + L); g.stroke(); } }
  g.globalAlpha = 1; SP.raf = requestAnimationFrame(twinkle);
}

// ---------------------------------------------------------------- header, rail, tabs
function chrome() {
  const st = S.st; hd.title.textContent = st.title; hd.bpm.textContent = st.bpm; hd.key.textContent = D.NOTES[st.key] + ' ' + D.SCALES[st.scale][0].slice(0, 3); hd.len.textContent = st.bars;
  hd.play.textContent = st.playing ? '❚❚' : '▶'; hd.play.classList.toggle('on', !!st.playing); hd.rec.classList.toggle('hot', !!st.rec); hd.undo.classList.toggle('dim', !st.undo); hd.redo.classList.toggle('dim', !st.redo);
  const v = sel('view', 0); tabs.forEach((t, i) => { t.classList.toggle('off', i !== v); t.style.color = i === v ? '#fff' : ''; t.style.boxShadow = i === v ? 'inset 0 0 0 .1rem #fff, 0 0 .9rem #8f7bff' : ''; });
  rail.innerHTML = ''; railMeters = []; const fits = []; const n = st.tracks.length, ti = tIdx(); if (ti < U.row0) U.row0 = ti; if (ti >= U.row0 + 5) U.row0 = ti - 4; U.row0 = clamp(U.row0, 0, Math.max(0, n - 5));
  rail.append(h('div', { class: 'row', style: 'height:.9rem;justify-content:space-between;color:#0d0a2e;font-size:.7rem;letter-spacing:.15rem' }, h('span', null, 'TRACKS'), h('span', null, pad2(n) + ' / 16')));
  for (let t = U.row0; t < Math.min(n, U.row0 + 5); t++) { const T = st.tracks[t], on = t === ti, m = leds('', 'width:100%;height:.5rem'); railMeters[t] = m; const sub = on ? '#0d0a2e' : '#a9a3f0';
    const nmB = h('button', { style: 'display:block;height:1.5rem;width:100%;text-align:left;font-size:.82rem;font-weight:700;white-space:nowrap;overflow:hidden', tap: () => { if (on) trackMenu(t); else setTrack(t); } }, T.name); fits.push([nmB, T.name]);
    const mini = (l, cls, fn) => h('button', { class: 'row', style: `width:2.4rem;height:2.2rem;justify-content:center;border:.1rem solid ${sub};font-size:.75rem;flex-shrink:0;${cls}`, 'aria-label': l + ' ' + T.name, tap: fn }, l[0]);
    rail.append(h('div', { class: 'col cutr ' + (on ? '' : 'lcd'), style: `height:6rem;padding:.5rem .6rem;justify-content:space-between;${on ? 'background:linear-gradient(180deg,#fff,#d9d5ff 45%,#a39df0);color:#0d0a2e;box-shadow:0 0 1.2rem #8f7bff' : ''}` },
      nmB,
      h('div', { class: 'row', style: 'gap:.4rem' }, h('button', { class: 'mono grow', style: `height:2.2rem;text-align:left;font-size:.68rem;letter-spacing:.08rem;color:${sub};white-space:nowrap`, tap: () => { if (on) trackMenu(t); else setTrack(t); } }, pad2(t + 1) + ' ' + (T.type === 1 ? D.ENGINES[T.eng] : T.type === 3 ? 'FM-1' : D.TYPES[T.type])),
        mini('Mute', T.mute ? 'background:#ff7ad9;color:#2a0320' : '', () => { C(`trk mute ${t} ${T.mute ? 0 : 1}`); sync(); }), mini('Solo', T.solo ? 'background:#fff;color:#0d0a2e' : '', () => { C(`trk solo ${t} ${T.solo ? 0 : 1}`); sync(); })), m)); }
  const pg = n > 5 ? [btn('▲', () => { setTrack(Math.max(0, tIdx() - 1)); }, 'off sq', 'height:2.6rem'), btn('▼', () => { setTrack(Math.min(n - 1, tIdx() + 1)); }, 'off sq', 'height:2.6rem')] : [];
  rail.append(h('div', { class: 'row', style: 'gap:.4rem' }, btn('+ TRACK', addTrackMenu, 'off', 'flex:1;height:2.6rem'), pg)); for (const [e, t] of fits) fitTxt(e, t);
}
let wasHome = null;
function render() {
  if (!S.st) return; const home = sel('home', 1) === 1;
  if (home !== wasHome) { wasHome = home; splash.style.display = home ? 'block' : 'none'; main.style.display = home ? 'none' : 'block'; setPlates(1920, 1080, home ? HOMEPLATES : MAINPLATES); document.getElementById('dim').style.cssText = home ? 'left:0;right:0;top:32rem;bottom:0;background:linear-gradient(180deg,rgba(0,0,8,0),rgba(0,0,8,.92) 55%)' : 'left:15.8rem;top:5.2rem;right:0;bottom:0'; bgName = ''; if (!home) splashBg(false); }
  if (home) { splashBg(true); return; }
  if (sel('view', 0) === 0 && sel('autoloop', 0)) { C('loop 0'); C('mode 0'); C('sel autoloop 0'); sync(); return; }   // the loop that editing a block switched on ends when you come back to the song
  chrome(); const v = sel('view', 0), T = trk(), key = v === 0 || v === 3 ? 'v' + v : v + ':' + tIdx() + ':' + (T ? T.type : -1) + ':' + (v === 1 ? (edBlock() ? 1 : 0) : 0);
  if (key !== curKey) { curKey = key; body.innerHTML = ''; cur = [songView, notesView, sampleView, filesView][v](); body.append(cur.el); }
  setBg(v === 1 && T && T.type === 0 ? 'urchin' : BGS[v], v === 0 ? 0.42 : 0.5); cur.update(); toolsEl.innerHTML = ''; if (cur.tools) toolsEl.append(...cur.tools());
}
function onMeters() {
  const m = S.m, st = S.st; if (sel('home', 1) === 1) { pulseBg(0.35, false); return; }
  const bar = Math.floor(m.tick / BAR) + 1, beat = Math.floor((m.tick % BAR) / 96) + 1, six = Math.floor((m.tick % 96) / STEP) + 1; hd.pos.textContent = bar + '.' + beat + '.' + six;
  hd.lufs.textContent = m.short <= -69 ? '--' : m.short.toFixed(1); hd.mL.set(meterFrac(m.pkL)); hd.mR.set(meterFrac(m.pkR));
  railMeters.forEach((r, i) => r && r.set(meterFrac(m.trk[i] || 0)));
  const kick = m.playing && st.tracks.some((T, i) => T.type === 0 && (m.trk[i] || 0) > 0.3) && (m.tick % 96) < 16; pulseBg(Math.min(1, Math.max(m.pkL, m.pkR) * 1.3), kick);
  if (cur && cur.fast) cur.fast(m);
}
function onAct(name) {
  if (['PLAY', 'REC', 'TRACK-', 'TRACK+', 'PAT-', 'PAT+'].includes(name)) return transport(name);
  if (name === 'VIEW') return setSel('view', (sel('view', 0) + 1) % VIEWS.length);
  if (cur && cur.act) cur.act(name);
}

// ---------------------------------------------------------------- SONG: every track's blocks, left to right
function songView() {
  const W = 77.4, LH = 6, PITCH = 6.5, rulerEl = h('div', { class: 'abs', style: 'left:0;top:0;width:100%;height:1.5rem;border-bottom:.1rem solid rgba(207,202,255,.8)' }), loopEl = h('div', { class: 'abs', style: 'top:2.4rem;height:.3rem;background:#ff7ad9;box-shadow:0 0 .6rem #ff7ad9' }), lanes = h('div', { id: 'lanes', class: 'abs', style: `left:0;top:4.1rem;width:100%;height:${PITCH * 5 - 0.5}rem;overflow:hidden` }), head = h('div', { class: 'abs', style: 'top:0;width:.15rem;height:36.1rem;background:#fff;box-shadow:0 0 .7rem #b04bff,0 0 2rem #b04bff;pointer-events:none' }), shelf = h('div', { class: 'abs row gap', style: 'left:0;top:37.3rem;width:100%;height:3.6rem' });
  const el = h('div', { class: 'abs', style: 'inset:0' }, rulerEl, loopEl, lanes, head, shelf); const bw = () => W / U.zb; let drag = null;
  const barAt = (e) => { const r = lanes.getBoundingClientRect(); return U.bar0 + Math.floor((e.clientX - r.left) / r.width * U.zb); }, laneAt = (e) => { const r = lanes.getBoundingClientRect(); return U.row0 + Math.floor((e.clientY - r.top) / (PITCH * rem())); };
  rulerEl.addEventListener('pointerdown', (e) => { const r = rulerEl.getBoundingClientRect(); C('seek ' + (U.bar0 + Math.floor((e.clientX - r.left) / r.width * U.zb))); sync(); });
  lanes.addEventListener('pointerdown', (e) => { try { lanes.setPointerCapture(e.pointerId); } catch (x) {} const t = laneAt(e), bar = barAt(e), st = S.st, T = st.tracks[t]; if (!T) return;
    const hit = T.pl.find(([b0, bi]) => bar >= b0 && bar < b0 + T.blocks[bi].bars);
    if (hit) { drag = { t, from: hit[0], b: hit[1], off: bar - hit[0], to: hit[0], moved: false, was: U.selT === t && U.selBar === hit[0] }; U.selT = t; U.selBar = hit[0]; C(`sel track ${t}`); C(`ed ${t} ${hit[1]}`); sync(); }
    else if (U.stamp && T.blocks.length) { const b = st.edT === t ? st.edB : 0; U.selT = t; U.selBar = bar; C(`sel track ${t}`); edit(`pl add ${t} ${bar} ${b}`); }
    else { C('seek ' + bar); U.selT = -1; if (t !== tIdx()) setTrack(t); else sync(); } });
  lanes.addEventListener('pointermove', (e) => { if (!drag) return; const to = Math.max(0, barAt(e) - drag.off); if (to !== drag.to) { drag.to = to; drag.moved = true; const b = lanes.querySelector('[data-sel="1"]'); if (b) b.style.left = ((to - U.bar0) * bw() + 0.1) + 'rem'; } });
  const up = () => { if (!drag) return; const d = drag; drag = null; if (d.moved && d.to !== d.from) { U.selBar = d.to; edit(`pl move ${d.t} ${d.from} ${d.to}`); } else if (d.was) openBlock(d.t, d.b, d.from); }; lanes.addEventListener('pointerup', up); lanes.addEventListener('pointercancel', up);
  function openBlock(t, b, bar) { const B = S.st.tracks[t].blocks[b]; C(`sel track ${t}`); C(`ed ${t} ${b}`); if (bar != null) { C(`loop 1 ${bar} ${bar + B.bars}`); C('sel autoloop 1'); C('mode 0'); } else C('mode 1'); U.selN.clear(); U.select = false; U.bar = 0; U.krow0 = null; C('sel view 1'); sync(); }
  function miniNotes(B) { const cv = h('canvas', { style: 'width:100%;height:1.6rem;display:block' }); requestAnimationFrame(() => { if (!cv.isConnected) return; const [g, w, hh] = fit(cv), len = B.bars * BAR; let lo = 127, hi = 0; for (const n of B.n) { lo = Math.min(lo, n[2]); hi = Math.max(hi, n[2]); } const sp = Math.max(1, hi - lo); g.fillStyle = 'rgba(13,10,46,.7)'; for (const n of B.n) g.fillRect(n[0] / len * w, (hh - 3) * (1 - (n[2] - lo) / sp), Math.max(1.5, Math.min(n[1], len - n[0]) / len * w - 1), 3); }); return cv; }
  function update() {
    const st = S.st, zb = U.zb; U.bar0 = clamp(U.bar0, 0, Math.max(0, Math.ceil((st.bars + 8) / 4) * 4 - zb)); rulerEl.innerHTML = '';
    for (let b = 0; b < zb; b++) { const ab = U.bar0 + b, big = ab % 4 === 0; rulerEl.append(h('span', { class: 'abs', style: `left:${b * bw()}rem;top:${big ? 0 : .6}rem;width:${big ? .1 : .05}rem;height:${big ? 1.5 : .9}rem;background:#cfcaff` })); if (big || zb <= 16) rulerEl.append(h('span', { class: 'abs mono', style: `left:${b * bw() + .4}rem;top:0;font-size:.7rem;letter-spacing:.1rem;color:#dcd8ff` }, ab + 1)); }
    loopEl.style.display = st.loopOn ? 'block' : 'none'; loopEl.style.left = ((st.loopA - U.bar0) * bw()) + 'rem'; loopEl.style.width = ((st.loopB - st.loopA) * bw()) + 'rem';
    lanes.innerHTML = ''; lanes.style.backgroundImage = `repeating-linear-gradient(90deg, rgba(190,180,255,.55) 0 .1rem, transparent .1rem ${bw() * 4}rem), repeating-linear-gradient(90deg, rgba(150,136,255,.2) 0 1px, transparent 1px ${bw()}rem)`; lanes.style.backgroundPosition = `${-(U.bar0 % 4) * bw()}rem 0`;
    for (let r = 0; r < 5; r++) { const t = U.row0 + r, T = st.tracks[t]; if (!T) break; lanes.append(h('div', { class: 'abs', style: `left:0;top:${r * PITCH}rem;width:100%;height:${LH}rem;pointer-events:none;background:rgba(7,5,28,${t === tIdx() ? .38 : .62});border-top:1px solid rgba(150,136,255,.5);border-bottom:1px solid rgba(150,136,255,.5)` }));
      for (const [bar, bi] of T.pl) { const B = T.blocks[bi]; if (bar + B.bars <= U.bar0 || bar >= U.bar0 + zb) continue; const s_ = U.selT === t && U.selBar === bar, c = TINT[t % TINT.length], w = B.bars * bw();
        lanes.append(h('div', { 'data-sel': s_ ? 1 : 0, class: 'abs col cutr', style: `left:${(bar - U.bar0) * bw() + .1}rem;top:${r * PITCH + .4}rem;width:${w - .2}rem;height:${LH - .8}rem;padding:.35rem .5rem;justify-content:space-between;overflow:hidden;pointer-events:none;color:#0d0a2e;background:linear-gradient(180deg,${c[0]},${c[1]} 50%,${c[2]});border:${s_ ? '.15rem solid #fff' : '1px solid #0d0a2e'};box-shadow:${s_ ? '0 0 1.3rem #fff, 0 0 3rem #b04bff' : 'inset 0 -.5rem .8rem rgba(20,10,90,.35)'}` },
          h('span', { style: 'font-size:.75rem;font-weight:700;white-space:nowrap' }, B.name.slice(0, Math.max(1, Math.floor((w - 1.5) / 0.8)))), miniNotes(B), h('span', { class: 'mono', style: 'font-size:.65rem;letter-spacing:.08rem;white-space:nowrap' }, w > 8 ? `BLOCK ${pad2(bi + 1)} · ${B.bars} BAR${B.bars > 1 ? 'S' : ''}` : w > 4.4 ? B.bars + (B.bars > 1 ? ' BARS' : ' BAR') : String(B.bars)))); } }
    if (st.loopOn) lanes.append(h('div', { class: 'abs', style: `left:${(st.loopA - U.bar0) * bw()}rem;top:0;width:${(st.loopB - st.loopA) * bw()}rem;height:100%;background:rgba(255,122,217,.06);border-left:.1rem solid #ff7ad9;border-right:.1rem solid #ff7ad9;pointer-events:none` }));
    const t = tIdx(), T = trk(); shelf.innerHTML = ''; if (!T) return; const chips = h('div', { class: 'row gap scrollx', style: 'max-width:22rem' }, T.blocks.map((B, i) => btn(pad2(i + 1) + ' ' + B.name.slice(0, 14), () => { C(`ed ${t} ${i}`); sync(); }, st.edT === t && st.edB === i ? 'on' : '')));
    const selP = U.selT >= 0 && st.tracks[U.selT] && st.tracks[U.selT].pl.find(p => p[0] === U.selBar), need = (fn) => () => selP ? fn() : toast('TAP A BLOCK ON THE TIMELINE FIRST');
    shelf.append(lab('BLOCKS', 'hi'), chips, btn('+ NEW', () => { mark(); const b = parseInt(C(`blk add ${t} 4`)); if (b >= 0) { C(`ed ${t} ${b}`); C('mode 1'); U.selN.clear(); C('sel view 1'); } sync(); }, 'hot'), h('div', { class: 'grow' }),
      btn('EDIT NOTES', () => { if (selP) openBlock(U.selT, selP[1], selP[0]); else if (st.edT === t && T.blocks[st.edB]) openBlock(t, st.edB, placeOf(t, st.edB)); else toast('MAKE A BLOCK FIRST'); }, 'on'), btn('STAMP', () => { U.stamp = !U.stamp; if (U.stamp) toast('TAP AN EMPTY BAR TO PLACE THE LIT BLOCK'); update(); }, U.stamp ? 'on' : ''),
      btn('DUPLICATE', need(() => { const B = st.tracks[U.selT].blocks[selP[1]]; const from = U.selBar; U.selBar += B.bars; edit(`pl dup ${U.selT} ${from}`); })),
      btn('SPLIT', need(() => { const B = st.tracks[U.selT].blocks[selP[1]]; if (B.bars < 2) return toast('ONE BAR CANNOT BE SPLIT'); const tk = S.m ? S.m.tick : 0, inside = tk > U.selBar * BAR && tk < (U.selBar + B.bars) * BAR, at = inside ? clamp(Math.round(tk / BAR) - U.selBar, 1, B.bars - 1) : Math.floor(B.bars / 2); edit(`blk split ${U.selT} ${selP[1]} ${at}`); toast('SPLIT IN TWO'); })),
      btn('DELETE', need(() => { const t0 = U.selT, b0 = U.selBar; U.selT = -1; edit(`pl del ${t0} ${b0}`); })));
  }
  const tools = () => { const st = S.st; return [two('SHOW', U.zb + ' BARS', () => { U.zb = U.zb === 16 ? 32 : U.zb === 32 ? 64 : 16; render(); }), btn('◀', () => { U.bar0 = Math.max(0, U.bar0 - U.zb / 2); render(); }, 'sq'), btn('▶', () => { U.bar0 += U.zb / 2; render(); }, 'sq'),
    two('LOOP', st.loopOn ? `BARS ${st.loopA + 1}–${st.loopB}` : 'OFF', () => { C(`loop ${st.loopOn ? 0 : 1}`); C('sel autoloop 0'); sync(); }, st.loopOn ? 'hot' : ''), two('LOOP THE', 'LIT BLOCK', () => { const T = st.tracks[U.selT], p = T && T.pl.find(q => q[0] === U.selBar); if (!p) return toast('TAP A BLOCK FIRST'); C(`loop 1 ${p[0]} ${p[0] + T.blocks[p[1]].bars}`); C('sel autoloop 0'); sync(); }),
    two('LENGTH', `${st.bars} BARS · ${Math.floor(st.bars * 240 / st.bpm / 60)}:${pad2(Math.floor(st.bars * 240 / st.bpm % 60))}`, () => {})]; };
  return { el, update, tools, fast: (m) => { const x = (m.tick / BAR - U.bar0) * bw(); head.style.display = m.mode === 0 && x >= 0 && x <= W ? 'block' : 'none'; head.style.left = x + 'rem'; if (m.playing && m.mode === 0 && !drag) { const b = Math.floor(m.tick / BAR); if (b >= U.bar0 + U.zb || b < U.bar0) { U.bar0 = Math.floor(b / (U.zb / 2)) * (U.zb / 2); update(); } } },
    act: (n) => { if (n === 'LEFT') U.bar0 = Math.max(0, U.bar0 - 4); else if (n === 'RIGHT') U.bar0 += 4; else if (n === 'UP') return transport('TRACK-'); else if (n === 'DOWN') return transport('TRACK+'); render(); } };
}

// ---------------------------------------------------------------- NOTES: inside one block. A step grid for drums, a piano roll for everything else.
function notesView() {
  const T = trk(), B0 = edBlock(); if (!T || !B0) { const t = tIdx(); return { el: h('div', { class: 'abs col', style: 'inset:0;align-items:center;justify-content:center;gap:1rem' }, h('div', { class: 'mich chrome', style: 'font-size:1.6rem;letter-spacing:.3rem' }, T ? 'THIS TRACK HAS NO BLOCK YET' : 'ADD A TRACK FIRST'), T ? btn('+ NEW BLOCK', () => { mark(); const b = parseInt(C(`blk add ${t} 4`)); C(`ed ${t} ${b}`); C(`pl add ${t} ${Math.floor((S.m ? S.m.tick : 0) / BAR / 4) * 4} ${b}`); sync(); }, 'hot big') : btn('+ TRACK', addTrackMenu, 'hot big')), update() {} }; }
  const drum = T.type === 0, cv = h('canvas', { class: 'abs', style: 'left:0;top:0;width:100%;height:33rem' }), av = h('canvas', { class: 'abs lcd', style: 'left:0;top:28rem;width:100%;height:5rem;display:none' }), row = h('div', { class: 'abs row gap', style: 'left:0;top:33.7rem;width:100%;height:3.4rem' }), row2 = h('div', { class: 'abs row gap', style: 'left:0;top:37.7rem;width:100%;height:3.4rem' }), el = h('div', { class: 'abs', style: 'inset:0' }, cv, av, row, row2);
  const blk = () => edBlock() || B0, steps = () => blk().bars * 16, vis = () => Math.min(steps(), U.zoom * 16), first = () => { const mx = Math.max(0, steps() - vis()); U.bar = clamp(U.bar, 0, Math.ceil(mx / 16)); return Math.min(mx, U.bar * 16); };
  const tb = () => `${S.st.edT} ${S.st.edB}`, key = (n) => n[0] + ':' + n[2], npads = () => trk().pads.some((p, i) => i >= 8 && p.type !== 10) ? 16 : 8;
  const rowsAll = () => { const o = [], mask = D.SCALES[S.st.scale][1]; for (let n = 108; n >= 24; n--) if (!U.lock || (mask >> (((n - S.st.key) % 12 + 12) % 12)) & 1) o.push(n); return o; };
  let rows = [], G = null, drag = null;
  function layout() { const [g, w, hh0] = fit(cv), R = rem(), top = 1.4 * R, hh = (U.autoP >= 0 ? 27.8 * R : hh0) - top, lw = (drum ? 8.8 : 4.4) * R, vs = vis(), f0 = first(), cw = (w - lw) / vs; let rh, r0 = 0, nrow;
    if (drum) { nrow = npads(); rh = hh / nrow; rows = Array.from({ length: nrow }, (_, i) => i); }
    else { rows = rowsAll(); nrow = Math.max(4, Math.floor(hh / (3.2 * R))); rh = hh / nrow; if (U.krow0 == null) { const ns = blk().n; let mid = 64; if (ns.length) mid = ns.reduce((a, n) => a + n[2], 0) / ns.length; let best = 0; rows.forEach((p, i) => { if (Math.abs(p - mid) < Math.abs(rows[best] - mid)) best = i; }); U.krow0 = best - Math.floor(nrow / 2); } U.krow0 = clamp(U.krow0, 0, Math.max(0, rows.length - nrow)); r0 = U.krow0; }
    G = { g, w, hh, top, lw, vs, f0, cw, rh, r0, nrow, R }; return G; }
  function rr(g, x, y, w, hh, c) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + w - c, y); g.lineTo(x + w, y + c); g.lineTo(x + w, y + hh); g.lineTo(x, y + hh); g.closePath(); }
  function draw(local) {
    const st = S.st, { g, w, hh, top, lw, vs, f0, cw, rh, r0, nrow, R } = layout(), B = blk(); g.clearRect(0, 0, w, cv.clientHeight); g.textBaseline = 'middle';
    g.font = `${R * 0.65}px Mono, monospace`; for (let s = 0; s <= vs; s++) { const a = f0 + s, x = lw + s * cw; if (a % 4 === 0) { g.fillStyle = '#cfcaff'; g.fillRect(x, a % 16 === 0 ? 0 : top * 0.5, a % 16 === 0 ? 2 : 1, top); if (s < vs) { g.fillStyle = '#dcd8ff'; g.fillText(`${Math.floor(a / 16) + 1}.${Math.floor(a % 16 / 4) + 1}`, x + 5, top * 0.42); } } } g.fillStyle = 'rgba(207,202,255,.8)'; g.fillRect(lw, top - 2, w - lw, 2);
    g.save(); g.translate(0, top); g.font = `${R * (drum ? 0.8 : 0.85)}px Silk, monospace`;
    for (let r = 0; r < nrow; r++) { const p = rows[r0 + r]; if (p == null) break; const y = r * rh, root = !drum && ((p - st.key) % 12 + 12) % 12 === 0, on = drum && p === U.drow;
      if (root) { g.fillStyle = 'rgba(176,75,255,.14)'; g.fillRect(lw, y, w - lw, rh); } g.fillStyle = 'rgba(150,136,255,.28)'; g.fillRect(lw, y + rh - 1, w - lw, 1);
      if (on) { const gr = g.createLinearGradient(0, y, 0, y + rh); gr.addColorStop(0, '#fff'); gr.addColorStop(.5, '#d9d5ff'); gr.addColorStop(1, '#a39df0'); g.fillStyle = gr; } else g.fillStyle = root ? '#2a1670' : '#090622'; g.fillRect(0, y, lw - 3, rh - 1); g.fillStyle = root ? '#b04bff' : '#3a2f7a'; g.fillRect(lw - 3, y, 3, rh - 1);
      g.fillStyle = on ? '#0d0a2e' : root ? '#fff' : '#c5bfff'; g.fillText(drum ? D.DRUMS[T.pads[p].type] : noteName(p), R * 0.5, y + rh / 2); if (drum) { g.font = `${R * 0.6}px Mono, monospace`; g.fillText(pad2(p + 1), lw - R * 1.5, y + rh / 2); g.font = `${R * 0.8}px Silk, monospace`; } }
    if (drum) for (let s = 0; s < vs; s++) if (Math.floor((f0 + s) / 4) % 2 === 0) { g.fillStyle = 'rgba(120,104,255,.07)'; g.fillRect(lw + s * cw, 0, cw, hh); }
    for (let s = 0; s <= vs; s++) { const a = f0 + s; g.fillStyle = a % 16 === 0 ? 'rgba(190,180,255,.6)' : a % 4 === 0 ? 'rgba(150,136,255,.42)' : 'rgba(150,136,255,.16)'; g.fillRect(lw + s * cw, 0, a % 16 === 0 ? 2 : 1, hh); }
    for (const n of B.n) { const ri = rows.indexOf(n[2]) - r0; if (ri < 0 || ri >= nrow) continue; let x = lw + (n[0] / STEP - f0) * cw, ww = drum ? cw : n[1] / STEP * cw; if (x + ww < lw || x > w) continue; if (x < lw) { ww -= lw - x; x = lw; }
      const pd = Math.min(rh * 0.14, 8), y = ri * rh + pd, hN = rh - pd * 2, sl = U.selN.has(key(n)), gr = g.createLinearGradient(0, y, 0, y + hN); gr.addColorStop(0, '#fff'); gr.addColorStop(.45, sl ? '#ffd3f3' : '#b3a8ff'); gr.addColorStop(1, sl ? '#ff7ad9' : '#6d5cf2');
      g.globalAlpha = 0.45 + 0.55 * n[3]; g.shadowColor = sl ? '#ff7ad9' : '#8f7bff'; g.shadowBlur = R * 0.6; g.fillStyle = gr; rr(g, x + 2, y, Math.max(4, ww - 5), hN, Math.min(8, hN / 3)); g.fill(); g.shadowBlur = 0; g.globalAlpha = 1; g.fillStyle = sl ? '#fff' : '#2b21a0'; g.fillRect(x + 2, y, 4, hN); }
    if (drag && drag.mode === 'box') { g.strokeStyle = '#fff'; g.setLineDash([6, 5]); g.lineWidth = 2; g.strokeRect(drag.x0, drag.y0 - top, drag.x1 - drag.x0, drag.y1 - drag.y0); g.fillStyle = 'rgba(255,122,217,.1)'; g.fillRect(drag.x0, drag.y0 - top, drag.x1 - drag.x0, drag.y1 - drag.y0); g.setLineDash([]); }
    g.restore();
    if (local != null) { const x = lw + (local / STEP - f0) * cw; if (x >= lw && x <= w) { g.shadowColor = '#b04bff'; g.shadowBlur = R; g.fillStyle = '#fff'; g.fillRect(x, 0, 3, top + hh); g.shadowBlur = 0; g.beginPath(); g.moveTo(x - 9, 0); g.lineTo(x + 11, 0); g.lineTo(x + 1, 12); g.fill(); } }
    if (U.autoP >= 0) drawAuto();
  }
  function drawAuto() { const [g, w, hh] = fit(av), lw = G.lw, vs = G.vs, f0 = G.f0, cw = G.cw, lane = blk().a[U.autoP] || [], base = trk().P[U.autoP]; g.clearRect(0, 0, w, hh); g.font = `${G.R * 0.65}px Mono, monospace`; g.fillStyle = '#dcd8ff'; g.textBaseline = 'middle';
    g.fillText((D.AUTO.find(a => a[0] === U.autoP) || [0, ''])[1], G.R * 0.5, hh / 2); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(lw, hh - 2 - (hh - 4) * base, w - lw, 1);
    for (let s = 0; s < vs; s++) { const v = lane[f0 + s]; if (v == null || v < 0) continue; g.fillStyle = '#ff7ad9'; g.fillRect(lw + s * cw + 1, hh - 2 - (hh - 4) * v, cw - 2, (hh - 4) * v + 2); } }
  const at = (e) => { const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; return { x, y, step: G.f0 + Math.floor((x - G.lw) / G.cw), fstep: G.f0 + (x - G.lw) / G.cw, row: G.r0 + Math.floor((y - G.top) / G.rh), keys: x < G.lw, ruler: y < G.top }; };
  const aud = (p) => { const t = tIdx(); C(`non ${t} ${p} 0.8`); setTimeout(() => C(`noff ${t} ${p}`), 160); };
  cv.addEventListener('pointerdown', (e) => { if (!G) return; try { cv.setPointerCapture(e.pointerId); } catch (x) {} const q = at(e), B = blk(), pitch = rows[q.row];
    if (q.ruler) { if (S.st.mode === 0) { const pb = placeOf(S.st.edT, S.st.edB, S.m && S.m.tick); if (pb != null) { C('seek ' + (pb + Math.floor(clamp(q.step, 0, steps() - 1) / 16))); sync(); } } return; }
    if (pitch == null || q.row >= G.r0 + G.nrow) return; if (q.keys) { if (drum) { U.drow = pitch; aud(pitch); draw(); return; } drag = { mode: 'scroll', y: q.y, r0: U.krow0, moved: false, pitch }; return; }
    if (q.step < 0 || q.step >= steps()) return; const hit = drum ? B.n.find(n => n[2] === pitch && n[0] === q.step * STEP) : B.n.find(n => n[2] === pitch && q.fstep >= n[0] / STEP && q.fstep < (n[0] + n[1]) / STEP);
    if (U.select && !drum) { if (hit) { const k = key(hit); if (U.selN.has(k)) U.selN.delete(k); else U.selN.add(k); draw(); update(); } else drag = { mode: 'box', x0: q.x, y0: q.y, x1: q.x, y1: q.y }; return; }
    mark();
    if (drum) { U.drow = pitch; const add = !hit; if (add) { B.n.push([q.step * STEP, STEP, pitch, U.vel]); C(`n ${tb()} ${q.step * STEP} ${STEP} ${pitch} ${U.vel}`); aud(pitch); } else { B.n.splice(B.n.indexOf(hit), 1); C(`nd ${tb()} ${q.step * STEP} ${pitch}`); } drag = { mode: 'paint', add, pitch, last: q.step }; draw(); return; }
    if (hit) { const rel = (q.fstep - hit[0] / STEP) / (hit[1] / STEP); drag = { mode: (rel > 0.7 && hit[1] > STEP) || rel > 0.85 ? 'size' : 'move', n: hit, s0: q.step, row0: q.row, start: hit[0], pitch: hit[2], moved: false }; aud(pitch); }
    else { const add = (pi) => { const n = [q.step * STEP, Math.round(U.len * STEP), pi, U.vel]; B.n.push(n); C(`n ${tb()} ${n[0]} ${n[1]} ${pi} ${U.vel}`); return n; }; const n = add(pitch); aud(pitch); if (U.chord) for (const d of [2, 4]) { const pi = rows[q.row - d]; if (pi != null) { add(pi); setTimeout(() => aud(pi), 0); } } drag = { mode: 'size', n, s0: q.step, row0: q.row, start: n[0], pitch, moved: true, fresh: true }; }
    draw(); });
  cv.addEventListener('pointermove', (e) => { if (!drag) return; const q = at(e), B = blk();
    if (drag.mode === 'scroll') { const d = Math.round((drag.y - q.y) / G.rh); if (d) drag.moved = true; U.krow0 = drag.r0 - d; draw(); return; }
    if (drag.mode === 'box') { drag.x1 = q.x; drag.y1 = q.y; draw(); return; }
    if (drag.mode === 'paint') { const s = clamp(q.step, 0, steps() - 1); if (s === drag.last) return; drag.last = s; const i = B.n.findIndex(n => n[2] === drag.pitch && n[0] === s * STEP); if (drag.add && i < 0) { B.n.push([s * STEP, STEP, drag.pitch, U.vel]); C(`n ${tb()} ${s * STEP} ${STEP} ${drag.pitch} ${U.vel}`); } else if (!drag.add && i >= 0) { B.n.splice(i, 1); C(`nd ${tb()} ${s * STEP} ${drag.pitch}`); } draw(); return; }
    const n = drag.n; if (drag.mode === 'size') { const len = Math.max(STEP, (clamp(q.step, 0, steps() - 1) + 1) * STEP - n[0]); if (len !== n[1]) { n[1] = len; drag.moved = true; C(`n ${tb()} ${n[0]} ${len} ${n[2]} ${n[3]}`); draw(); } return; }
    const ns = clamp(drag.start + (q.step - drag.s0) * STEP, 0, steps() * STEP - STEP), np = rows[clamp(rows.indexOf(drag.pitch) + (q.row - drag.row0), 0, rows.length - 1)];
    if (ns !== n[0] || np !== n[2]) { drag.moved = true; C(`nd ${tb()} ${n[0]} ${n[2]}`); C(`n ${tb()} ${ns} ${n[1]} ${np} ${n[3]}`); if (np !== n[2]) aud(np); n[0] = ns; n[2] = np; draw(); } });
  const up = () => { if (!drag) return; const d = drag, B = blk(); drag = null; if (d.mode === 'scroll') { if (!d.moved) aud(d.pitch); return; }
    if (d.mode === 'box') { const xa = Math.min(d.x0, d.x1), xb = Math.max(d.x0, d.x1), ya = Math.min(d.y0, d.y1) - G.top, yb = Math.max(d.y0, d.y1) - G.top; for (const n of B.n) { const ri = rows.indexOf(n[2]) - G.r0, x = G.lw + (n[0] / STEP - G.f0) * G.cw, ww = n[1] / STEP * G.cw, y = ri * G.rh; if (ri >= 0 && x < xb && x + ww > xa && y < yb && y + G.rh > ya) U.selN.add(key(n)); } draw(); update(); return; }
    if (d.mode !== 'paint' && !d.moved && !d.fresh) { const i = B.n.indexOf(d.n); if (i >= 0) { B.n.splice(i, 1); C(`nd ${tb()} ${d.n[0]} ${d.n[2]}`); } } if (d.fresh && d.n) U.len = d.n[1] / STEP; C('bump'); sync(); };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  const autoSet = (e) => { const r = av.getBoundingClientRect(); if (!G) return; const s = G.f0 + Math.floor((e.clientX - r.left - G.lw) / G.cw); if (s < 0 || s >= steps()) return; const v = U.erase ? -1 : clamp(1 - (e.clientY - r.top) / r.height), B = blk(); if (!B.a[U.autoP]) B.a[U.autoP] = []; while (B.a[U.autoP].length <= s) B.a[U.autoP].push(-1); B.a[U.autoP][s] = v; C(`au ${tb()} ${U.autoP} ${s} ${v.toFixed(3)}`); drawAuto(); };
  let ad = false; av.addEventListener('pointerdown', (e) => { try { av.setPointerCapture(e.pointerId); } catch (x) {} ad = true; mark(); autoSet(e); }); av.addEventListener('pointermove', (e) => { if (ad) autoSet(e); }); const aup = () => { if (ad) { ad = false; C('bump'); sync(); } }; av.addEventListener('pointerup', aup); av.addEventListener('pointercancel', aup);
  // ---- note tools: they work on the selected notes
  const picked = () => blk().n.filter(n => U.selN.has(key(n)));
  function change(fn) { const pick = picked(); if (!pick.length) return toast('SELECT SOME NOTES FIRST'); const out = fn(pick.map(n => n.slice())); mark(); for (const n of pick) C(`nd ${tb()} ${n[0]} ${n[2]}`); U.selN.clear(); const len = steps() * STEP; for (const n of out) if (n[0] >= 0 && n[0] < len && n[2] >= 0 && n[2] <= 127) { C(`n ${tb()} ${n[0]} ${Math.max(6, Math.min(n[1], len - n[0]))} ${n[2]} ${n[3]}`); U.selN.add(key(n)); } C('bump'); sync(); }
  const shiftRow = (d) => change((ns) => ns.map(n => { const i = rows.indexOf(n[2]); n[2] = i < 0 ? n[2] + d : rows[clamp(i - d, 0, rows.length - 1)]; return n; }));
  const ops = { 'OCT −': () => change((ns) => ns.map(n => (n[2] -= 12, n))), 'OCT +': () => change((ns) => ns.map(n => (n[2] += 12, n))), 'NOTE −': () => shiftRow(-1), 'NOTE +': () => shiftRow(1),
    'CUT': () => change((ns) => ns.flatMap(n => { if (n[1] < 2 * STEP) return [n]; const a = Math.floor(n[1] / STEP / 2) * STEP; return [[n[0], a, n[2], n[3]], [n[0] + a, n[1] - a, n[2], n[3]]]; })),
    'REVERSE': () => change((ns) => { const a = Math.min(...ns.map(n => n[0])), b = Math.max(...ns.map(n => n[0] + n[1])); return ns.map(n => (n[0] = a + (b - (n[0] + n[1])), n)); }),
    'COPY': () => { const pick = picked(); if (!pick.length) return toast('SELECT SOME NOTES FIRST'); const a = Math.min(...pick.map(n => n[0])), b = Math.max(...pick.map(n => n[0] + n[1])), sh = Math.ceil((b - a) / 96) * 96; if (a + sh >= steps() * STEP) return toast('NO ROOM: MAKE THE BLOCK LONGER'); mark(); U.selN.clear(); for (const n of pick) if (n[0] + sh < steps() * STEP) { C(`n ${tb()} ${n[0] + sh} ${n[1]} ${n[2]} ${n[3]}`); U.selN.add((n[0] + sh) + ':' + n[2]); } C('bump'); sync(); },
    'DELETE': () => { const pick = picked(); if (!pick.length) return toast('SELECT SOME NOTES FIRST'); mark(); for (const n of pick) C(`nd ${tb()} ${n[0]} ${n[2]}`); U.selN.clear(); C('bump'); sync(); } };
  const all = (fn) => { mark(); const old = blk().n.map(n => n.slice()); C(`nclear ${tb()} 0`); for (const n of fn(old)) C(`n ${tb()} ${n[0]} ${n[1]} ${n[2]} ${n[3]}`); C('bump'); sync(); };
  const dops = { 'COPY BAR': () => { const b0 = first() / 16 * BAR; U.clipBar = blk().n.filter(n => n[0] >= b0 && n[0] < b0 + BAR).map(n => [n[0] - b0, n[1], n[2], n[3]]); toast('BAR COPIED'); }, 'PASTE BAR': () => { if (!U.clipBar) return toast('COPY A BAR FIRST'); const b0 = first() / 16 * BAR; all((o) => o.filter(n => n[0] < b0 || n[0] >= b0 + BAR).concat(U.clipBar.map(n => [n[0] + b0, n[1], n[2], n[3]]))); },
    '◀ SHIFT': () => all((o) => o.map(n => (n[0] = (n[0] - STEP + steps() * STEP) % (steps() * STEP), n))), 'SHIFT ▶': () => all((o) => o.map(n => (n[0] = (n[0] + STEP) % (steps() * STEP), n))), 'REVERSE': () => all((o) => o.map(n => (n[0] = Math.max(0, steps() * STEP - STEP - n[0]), n))),
    'FILL': () => { const r = U.drow, mine = blk().n.filter(n => n[2] === r), n16 = steps(), every = mine.length === 0 ? 4 : mine.length <= n16 / 4 ? 2 : mine.length <= n16 / 2 ? 1 : 0; all((o) => { const out = o.filter(n => n[2] !== r); if (every) for (let s = 0; s < n16; s += every) out.push([s * STEP, STEP, r, U.vel]); return out; }); }, 'CLEAR ROW': () => all((o) => o.filter(n => n[2] !== U.drow)) };
  function update() {
    const st = S.st, B = blk(); row.innerHTML = '';
    row.append(two('EDITING BLOCK', pad2(st.edB + 1) + ' ' + B.name.slice(0, 18), () => ask('BLOCK NAME', B.name, (v) => edit(`blk name ${tb()} "${v.toUpperCase().replace(/"/g, '')}"`))), btn('−', () => { if (B.bars > 1) edit(`blk bars ${tb()} ${B.bars - 1}`); }, 'sq', 'font-size:1.1rem'),
      h('div', { class: 'lcd col', style: 'height:3.2rem;padding:0 .8rem;align-items:center;justify-content:center;gap:.1rem;flex-shrink:0' }, lab('LENGTH'), h('span', { class: 'mich', style: 'font-size:1rem;color:#fff;white-space:nowrap' }, B.bars + (B.bars > 1 ? ' BARS' : ' BAR'))), btn('+', () => { if (B.bars < 64) edit(`blk bars ${tb()} ${B.bars + 1}`); }, 'sq', 'font-size:1.1rem'), btn('×2', () => edit(`blk double ${tb()}`), 'sq'), h('div', { class: 'grow' }));
    row2.innerHTML = ''; if (!drum) row.append(cyc('NOTE LENGTH', [[1, '1/16'], [2, '1/8'], [4, '1/4'], [8, '1/2'], [16, '1 BAR']], [1, 2, 4, 8, 16].includes(U.len) ? U.len : 1, (v) => { U.len = v; }), two('KEY LOCK', U.lock ? 'ON' : 'OFF', () => { U.lock = !U.lock; U.krow0 = null; render(); }, U.lock ? 'on' : ''), two('CHORDS', U.chord ? 'ON' : 'OFF', () => { U.chord = !U.chord; render(); }, U.chord ? 'on' : ''));
    row.append(cyc('HIT', [[0.45, 'SOFT'], [0.8, 'MEDIUM'], [1, 'HARD']], U.vel, (v) => { U.vel = v; }));
    if (drum) row2.append(lab('ROW ' + pad2(U.drow + 1) + ' · ' + D.DRUMS[trk().pads[U.drow].type], 'hi'), h('div', { class: 'grow' }), ...Object.keys(dops).map(k => btn(k, dops[k])));
    else row2.append(btn(U.selN.size ? U.selN.size + ' PICKED' : 'SELECT', () => { U.select = !U.select; if (!U.select) U.selN.clear(); else toast('DRAG A BOX OR TAP NOTES, THEN PICK A TOOL'); update(); draw(localTick()); }, U.select ? 'on' : '', 'width:8.5rem;padding:0'), btn('ALL', () => { U.select = true; U.selN = new Set(B.n.map(key)); update(); draw(localTick()); }), h('div', { class: 'grow' }), ...Object.keys(ops).map(k => btn(k, ops[k])));
    av.style.display = U.autoP >= 0 ? 'block' : 'none'; requestAnimationFrame(() => draw(localTick()));
  }
  const localTick = () => { const m = S.m, st = S.st; if (!m) return null; if (m.mode === 1) return m.tick; const pb = placeOf(st.edT, st.edB, m.tick); if (pb == null) return null; const l = m.tick - pb * BAR; return l >= 0 && l < blk().bars * BAR ? l : null; };
  const cyc = (label, list, curV, set) => two(label, (list.find(x => x[0] === curV) || list[0])[1], () => { const i = list.findIndex(x => x[0] === curV); set(list[(i + 1) % list.length][0]); render(); });
  const tools = () => { const st = S.st, o = [btn('◀', () => { U.bar = Math.max(0, U.bar - 1); render(); }, 'sq'), btn('▶', () => { U.bar++; render(); }, 'sq'), cyc('SHOW', [[1, '1 BAR'], [2, '2 BARS'], [4, '4 BARS']], U.zoom, (v) => { U.zoom = v; })];
    o.push(two('AUTOMATION', U.autoP < 0 ? 'OFF' : (D.AUTO.find(a => a[0] === U.autoP) || [0, ''])[1], () => choose('DRAW CHANGES OVER TIME FOR…', [{ label: 'HIDE', on: U.autoP < 0 }, ...D.AUTO.map(a => ({ label: a[1], on: a[0] === U.autoP })), { label: U.erase ? 'ERASER: ON' : 'ERASER: OFF', on: U.erase }], (i) => { if (i === D.AUTO.length + 1) U.erase = !U.erase; else U.autoP = i === 0 ? -1 : D.AUTO[i - 1][0]; render(); }, 4), U.autoP >= 0 ? 'on' : ''),
      two('HEAR', st.mode === 1 ? 'BLOCK ALONE' : 'IN THE SONG', () => { if (st.mode === 1) { const pb = placeOf(st.edT, st.edB); if (pb == null) return toast('PLACE THIS BLOCK ON THE TIMELINE FIRST'); C(`loop 1 ${pb} ${pb + blk().bars}`); C(`mode 0 ${pb}`); } else C('mode 1'); sync(); }, st.mode === 1 ? 'on' : '')); return o; };
  let lastPg = -1;
  return { el, update, tools, fast: () => { if (drag) return; const l = localTick(); if (l != null && S.m.playing) { const pg = Math.floor(l / BAR / U.zoom) * U.zoom; if (pg !== lastPg && steps() > vis()) { lastPg = pg; U.bar = pg; } } draw(l); },
    act: (n) => { if (n === 'UP') U.krow0 = (U.krow0 || 0) - 2; else if (n === 'DOWN') U.krow0 = (U.krow0 || 0) + 2; else if (n === 'LEFT') U.bar = Math.max(0, U.bar - 1); else if (n === 'RIGHT') U.bar++; render(); } };
}

// ---------------------------------------------------------------- SAMPLE
function sampleView() {
  const cv = h('canvas', { class: 'abs', style: 'left:0;top:7.6rem;width:100%;height:33.6rem' }), bar = h('div', { class: 'abs row gap', style: 'left:0;top:.2rem;width:100%;flex-wrap:wrap' }), el = h('div', { class: 'abs', style: 'inset:0' }, bar, cv);
  const sid = () => { const T = trk(); return !T ? -1 : T.type === 2 ? T.smp : T.type === 0 ? T.pads[sel('pad', 0)].smp : -1; }; let drag = null;
  function draw() { const [g, w, hh] = fit(cv), T = trk(), id = sid(), R = rem(); g.clearRect(0, 0, w, hh); g.fillStyle = 'rgba(7,5,28,.55)'; g.fillRect(0, 0, w, hh);
    if (id < 0 || !U.peaks) { g.fillStyle = '#dcd8ff'; g.font = `${R}px Silk, monospace`; g.textAlign = 'center'; g.fillText(T && (T.type === 2 || T.type === 0) ? 'NO SOUND HERE YET — OPEN FILES TO LOAD ONE' : 'THIS TRACK MAKES ITS OWN SOUND', w / 2, hh / 2); g.textAlign = 'left'; return; }
    const pk = U.peaks, n = pk.length, mid = hh / 2, a = T.type === 2 ? T.P[P.S_START] : 0, e = T.type === 2 ? T.P[P.S_END] : 1, mode = T.type === 2 ? Math.round(T.P[P.S_MODE] * 4) : 0; g.fillStyle = 'rgba(120,104,255,.10)'; g.fillRect(a * w, 0, (e - a) * w, hh); g.fillStyle = 'rgba(207,202,255,.5)'; g.fillRect(0, mid, w, 2);
    const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#fff'); gr.addColorStop(.5, '#b3a8ff'); gr.addColorStop(1, '#fff');
    for (let i = 0; i < n; i++) { const x = i / n * w, v = pk[i] * mid * 0.92, ins = i / n >= a && i / n <= e; g.fillStyle = ins ? gr : 'rgba(91,87,144,.6)'; g.fillRect(x, mid - v, Math.max(1, w / n - 1), Math.max(1, v * 2)); }
    if (T.type === 2) { g.font = `${R * 0.7}px Mono, monospace`; if (mode === 2) for (let k = 0; k < 16; k++) { const x = (a + (e - a) * k / 16) * w; g.fillStyle = '#b04bff'; g.fillRect(x, 0, 2, hh); g.fillStyle = '#dcd8ff'; g.fillText(pad2(k + 1), x + 6, R); }
      if (mode === 4) { const c = a + (e - a) * T.P[P.G_POS], sp = (e - a) * (0.03 + T.P[P.G_SPRAY] * 0.25); g.fillStyle = 'rgba(255,122,217,.18)'; g.fillRect((c - sp) * w, 0, sp * 2 * w, hh); g.fillStyle = '#ff7ad9'; g.fillRect(c * w - 1.5, 0, 3, hh); g.fillStyle = '#fff'; for (let k = 0; k < 20; k++) g.fillRect((c + sp * (((k * 0.618) % 1) * 2 - 1)) * w, R + (k * 37) % (hh - R * 2), 14 + (k * 13) % 26, 4); }
      for (const [v, c, dir] of [[a, '#fff', 1], [e, '#ff7ad9', -1]]) { g.fillStyle = c; g.fillRect(v * w - 3, 0, 6, hh); g.beginPath(); g.moveTo(v * w, 0); g.lineTo(v * w + dir * 2 * R, 0); g.lineTo(v * w, 2 * R); g.fill(); } } }
  cv.addEventListener('pointerdown', (ev) => { const T = trk(); if (!T || T.type !== 2) return; try { cv.setPointerCapture(ev.pointerId); } catch (x) {} const r = cv.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width; mark(); const mode = Math.round(T.P[P.S_MODE] * 4);
    drag = mode === 4 && Math.abs(x - (T.P[P.S_START] + (T.P[P.S_END] - T.P[P.S_START]) * T.P[P.G_POS])) < 0.04 ? P.G_POS : Math.abs(x - T.P[P.S_START]) < Math.abs(x - T.P[P.S_END]) ? P.S_START : P.S_END; });
  cv.addEventListener('pointermove', (ev) => { if (drag == null) return; const T = trk(), r = cv.getBoundingClientRect(); let x = clamp((ev.clientX - r.left) / r.width); if (drag === P.G_POS) x = clamp((x - T.P[P.S_START]) / Math.max(0.01, T.P[P.S_END] - T.P[P.S_START])); else if (drag === P.S_START) x = Math.min(x, T.P[P.S_END] - 0.005); else x = Math.max(x, T.P[P.S_START] + 0.005); T.P[drag] = x; C(`p ${tIdx()} ${drag} ${x.toFixed(5)}`); draw(); });
  const up = () => { if (drag != null) { drag = null; C('bump'); const t = tIdx(); C(`non ${t} 60 0.8`); setTimeout(() => C(`noff ${t} 60`), 700); } }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  function update() { const T = trk(), st = S.st, id = sid(), t = tIdx(); bar.innerHTML = ''; if (!T) return;
    if (id !== U.peaksFor) { U.peaksFor = id; U.peaks = null; if (id >= 0) { const s = SMB.peaks(id, 900); U.peaks = s ? s.split(',').map(Number) : null; } }
    const sm = st.smp.find(s => s.id === id); bar.append(two(sm ? `SAMPLE · ${sm.sec.toFixed(2)} S` : 'SAMPLE', sm ? sm.name : 'NONE', () => {}), btn('LOAD A FILE', () => setSel('view', 3), 'hot'));
    if (T.type === 2) { const mode = Math.round(T.P[P.S_MODE] * 4), bars = Math.round(T.P[P.S_BARS] * 16), set = (k, v) => edit(`p ${t} ${k} ${v}`);
      bar.append(...D.SMODES.map((m, i) => btn(m, () => set(P.S_MODE, i / 4), mode === i ? 'on' : '')), btn('STRETCH TO TEMPO', () => set(P.S_STRETCH, T.P[P.S_STRETCH] > .5 ? 0 : 1), T.P[P.S_STRETCH] > .5 ? 'on' : ''), btn('−', () => set(P.S_BARS, Math.max(0, bars - 1) / 16), 'sq'), two('FIT', bars ? bars + (bars > 1 ? ' BARS' : ' BAR') : 'OFF', () => {}), btn('+', () => set(P.S_BARS, Math.min(16, bars + 1) / 16), 'sq'),
        btn('REVERSE', () => set(P.S_REV, T.P[P.S_REV] > .5 ? 0 : 1), T.P[P.S_REV] > .5 ? 'on' : ''), btn('SLICES → NOTES', () => { const B = edBlock(); if (!B) return toast('MAKE A BLOCK ON THIS TRACK FIRST'); const n16 = B.bars * 16, cmds = [`p ${t} ${P.S_MODE} 0.5`, `nclear ${st.edT} ${st.edB} 0`]; for (let k = 0; k < 16; k++) cmds.push(`n ${st.edT} ${st.edB} ${Math.round(k * n16 / 16) * STEP} ${Math.max(STEP, Math.round(n16 / 16) * STEP)} ${60 + k} 0.9`); edit(cmds); toast('16 SLICES LAID OUT IN THE BLOCK'); }),
        btn('▶ HEAR', () => { C(`non ${t} 60 0.9`); setTimeout(() => C(`noff ${t} 60`), 4000); })); }
    else if (T.type === 0) bar.append(lab('PAD ' + pad2(sel('pad', 0) + 1) + ' · LOAD A FILE TO PUT YOUR OWN SOUND ON THIS PAD', 'hi')); else bar.append(btn('ADD A SAMPLER TRACK', addTrackMenu));
    requestAnimationFrame(draw); }
  return { el, update };
}

// ---------------------------------------------------------------- FILES
function filesView() {
  const list = h('div', { class: 'abs list scroll lcd', style: 'left:0;top:3.6rem;width:48rem;height:28.4rem' }), pathEl = h('div', { class: 'lcd mono grow row', style: 'height:3.2rem;padding:0 .8rem;font-size:.75rem;letter-spacing:.1rem;color:#fff;overflow:hidden;white-space:nowrap' }), acts = h('div', { class: 'abs col gap', style: 'left:0;top:32.6rem;width:48rem' }), proj = h('div', { class: 'abs list scroll lcd', style: 'left:49.4rem;top:7.5rem;width:28rem;height:19rem' }), name = h('span', { class: 'mich chrome', style: 'font-size:1.3rem' });
  function saveAs() { ask('NAME THIS SONG', S.poll.proj || S.st.title, (v) => { SMB.save(v.toUpperCase()); sync(true); setTimeout(update, 200); }); }
  function target() { const T = trk(); return T && T.type === 0 ? 'pad ' + sel('pad', 0) : T && T.type === 2 && T.smp < 0 ? 'track' : 'new'; }
  const el = h('div', { class: 'abs', style: 'inset:0' }, h('div', { class: 'abs row gap', style: 'left:0;top:.1rem;width:48rem' }, btn('▲ UP', () => go(U.listing ? U.listing.up : '')), pathEl, btn('FIND WITH ANDROID', () => SMB.pick(target()))), list, acts,
    h('div', { class: 'abs col gap', style: 'left:49.4rem;top:.1rem;width:28rem' }, h('div', { class: 'row gap', style: 'align-items:baseline' }, lab('SONG', 'hi'), name), h('div', { class: 'row gap' }, btn('SAVE', () => { const n = S.poll.proj; if (n) SMB.save(n); else saveAs(); setTimeout(update, 200); }, 'on'), btn('SAVE AS', saveAs), btn('NEW', () => confirmPop('START A NEW SONG?', () => { SMB.fresh('blank'); sync(true); })), btn('DEMO', () => confirmPop('OPEN THE DEMO SONG?', () => { SMB.fresh('demo'); sync(true); })))), proj,
    h('div', { class: 'abs col gap', style: 'left:49.4rem;top:27.4rem;width:28rem' }, lab('EXPORT · 24-BIT WAV TO MUSIC / STRINGERMAX', 'hi'), h('div', { class: 'row gap' }, btn('EXPORT SONG', () => SMB.export('song', ''), 'hot'), btn('STEMS', () => SMB.export('stems', S.st.tracks.map(T => T.type === 3 ? '' : T.name).join('|'))), btn('BOUNCE BLOCK', () => SMB.export('bounce', ''))), h('div', { class: 'row gap', style: 'margin-top:.6rem' }, btn('BACK TO THE START SCREEN', () => setSel('home', 1)))));
  function go(p) { U.path = p; U.pick = ''; try { U.listing = JSON.parse(SMB.browse(p)); } catch (e) { U.listing = { path: p, up: '', dirs: [], files: [] }; } update(); }
  function update() {
    if (!U.listing) return go(U.path); const L = U.listing, T = trk(); pathEl.textContent = (L.path || 'CHOOSE WHERE TO LOOK').toUpperCase(); list.innerHTML = '';
    for (const d of L.dirs) list.append(h('div', { class: 'it', tap: () => go(d.p) }, h('span', { style: 'color:#b04bff;font-size:1rem' }, '▸'), d.n));
    for (const f of L.files) list.append(h('div', { class: 'it' + (U.pick === f.p ? ' on' : ''), tap: () => { U.pick = f.p; SMB.preview(f.p); update(); } }, h('span', { style: `color:${U.pick === f.p ? '#0d0a2e' : '#ff7ad9'};font-size:1rem` }, '♪'), f.n, h('span', { class: 'tag' }, f.k > 1024 ? (f.k / 1024).toFixed(1) + ' MB' : f.k + ' KB')));
    if (L.path && !L.dirs.length && !L.files.length) list.append(h('div', { class: 'it', style: 'white-space:normal;line-height:1.6;padding:1rem', tap: () => SMB.storage() }, L.denied ? 'STRING-R NEEDS PERMISSION TO SEE YOUR MUSIC FILES. TAP HERE TO ALLOW IT.' : 'NO SOUND FILES HERE. COPY SAMPLES FROM YOUR MAC INTO THE THOR\'S MUSIC FOLDER, OR USE FIND WITH ANDROID.'));
    acts.innerHTML = ''; const pk = U.pick, ld = (tg) => { if (!pk) return toast('TAP A FILE FIRST'); SMB.load(pk, tg); setTimeout(() => sync(true), 700); }, r = h('div', { class: 'row gap' }, btn('A NEW TRACK', () => ld('new'), 'on'));
    if (T && T.type === 2) r.append(btn('THIS TRACK', () => ld('track'))); if (T && T.type === 0) r.append(btn('DRUM PAD ' + pad2(sel('pad', 0) + 1), () => ld('pad ' + sel('pad', 0)), 'on')); r.append(btn('REFERENCE SONG', () => ld('ref')), btn('■ STOP', () => C('pre')));
    acts.append(lab(pk ? 'LOAD ' + pk.split('/').pop().toUpperCase().slice(0, 30) + ' AS' : 'TAP A FILE TO HEAR IT, THEN CHOOSE WHERE IT GOES', 'hi'), r);
    name.textContent = S.poll.proj || 'NOT SAVED YET'; proj.innerHTML = ''; let ps = []; try { ps = JSON.parse(SMB.projects()); } catch (e) {}
    for (const p of ps) proj.append(h('div', { class: 'it' + (p.n === S.poll.proj ? ' on' : '') }, h('button', { class: 'grow', style: 'height:2.8rem;text-align:left', tap: () => confirmPop('OPEN ' + p.n + '?', () => { SMB.open(p.n); sync(true); setTimeout(update, 300); }) }, p.n), h('button', { style: 'width:2.2rem;height:2.2rem;border:.1rem solid currentColor', 'aria-label': 'Delete ' + p.n, tap: () => confirmPop('DELETE ' + p.n + '?', () => { SMB.remove(p.n); setTimeout(update, 100); }) }, '✕')));
    if (!ps.length) proj.append(h('div', { class: 'it' }, 'YOUR SAVED SONGS APPEAR HERE'));
  }
  return { el, update };
}

window.addEventListener('load', () => { build(); start(); });
