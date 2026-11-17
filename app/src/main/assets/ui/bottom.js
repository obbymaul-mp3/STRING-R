// STRING-R: the bottom screen. The sound of the selected track, its effects, the mixer, the live input, the master, and pads to play.
'use strict';
document.documentElement.className = 'bottom';
const TABS = ['SOUND', 'FX', 'MIX', 'INPUT', 'MASTER', 'PLAY'], TBG = ['heart_b', 'urchin_b', 'star_b', 'drop_b', 'portal_b', 'blade'];
const V = { page: 0, pads16: null, mixPage: 0, mp: '', target: -10, mpage: 0, oct: 0, sound: {}, vox: '' };
let hd = {}, body, tabs = [], cur = null, curKey = '', main, home, wasHome = null;
const MAINPLATES = PL.plate([[0, 0], [1240, 0], [1240, 84], [1200, 116], [40, 116], [0, 84]], 'plate', PL.rivet(20, 20) + PL.rivet(1220, 20) + '') +
  PL.plate([[0, 1080], [0, 992], [36, 960], [1204, 960], [1240, 992], [1240, 1080]], 'plate', PL.rivet(20, 1060) + PL.rivet(1220, 1060)) + PL.laser(40, 950, 1160) + PL.cross(20, 136) + PL.cross(1220, 136);
const HOMEPLATES = PL.plate([[0, 0], [420, 0], [380, 40], [60, 40], [40, 60], [40, 360], [0, 400]], 'plateH', PL.rivet(20, 20)) + PL.plate([[1240, 0], [820, 0], [860, 40], [1180, 40], [1200, 60], [1200, 360], [1240, 400]], 'plateH', PL.rivet(1220, 20)) +
  PL.plate([[0, 1080], [0, 700], [40, 740], [40, 1020], [60, 1040], [520, 1040], [560, 1080]], 'plateH', PL.rivet(20, 1060)) + PL.plate([[1240, 1080], [1240, 700], [1200, 740], [1200, 1020], [1180, 1040], [720, 1040], [680, 1080]], 'plateH', PL.rivet(1220, 1060)) + PL.laser(120, 250, 1000);
const upd = (el) => el.querySelectorAll('.knob').forEach(k => k.upd && k.upd());
const play = (t, n, ms) => { C(`non ${t} ${n} 0.9`); setTimeout(() => C(`noff ${t} ${n}`), ms || 200); };
const panel = (style, ...k) => h('div', { class: 'lcd', style: 'padding:.7rem;' + style }, k);

function build() {
  const app = document.getElementById('app'), A = (style, ...k) => h('div', { class: 'abs', style }, k);
  hd.name = h('b', { style: 'display:block;width:17rem;text-align:left;font-size:1rem;color:#fff;white-space:nowrap;overflow:hidden;font-weight:700' }); hd.kind = lab('');
  hd.play = btn('▶', () => transport('PLAY'), 'sq', 'font-size:1.3rem;height:4rem;width:4rem'); hd.rec = btn('●', () => transport('REC'), 'sq', 'font-size:1.3rem;height:4rem;width:4rem;color:#ff7ad9'); hd.cpu = lab('', 'hi'); hd.m = leds('', 'width:100%');
  body = A('left:1.2rem;top:6.5rem;width:59.6rem;height:41rem');
  tabs = TABS.map((v, i) => btn(v, () => setSel('tab', i), 'off', 'flex:1;height:3.8rem;font-size:1rem'));
  main = A('inset:0', A('left:1.4rem;top:.7rem;width:59.2rem;height:4.2rem;display:flex;align-items:center;gap:.5rem',
    btn('◀', () => transport('TRACK-'), 'sq', 'height:4rem'), h('button', { class: 'lcd col cut', style: 'height:4rem;width:19rem;padding:0 1rem;justify-content:center;gap:.2rem;align-items:flex-start', tap: () => choose('CHOOSE A TRACK', [...S.st.tracks.map((T, i) => ({ label: pad2(i + 1) + ' ' + T.name, on: i === tIdx() })), '+ ADD A TRACK'], (i) => i >= S.st.tracks.length ? addTrackMenu() : setTrack(i), 2, 50) }, hd.kind, hd.name),
    btn('▶', () => transport('TRACK+'), 'sq', 'height:4rem'), h('div', { class: 'grow' }), h('div', { class: 'lcd col', style: 'height:4rem;width:15rem;padding:.5rem .7rem;justify-content:space-between' }, h('div', { class: 'row', style: 'justify-content:space-between' }, lab('THIS TRACK'), hd.cpu), hd.m), btn('■', () => { C('stop'); sync(); }, 'sq', 'font-size:1.2rem;height:4rem;width:4rem'), hd.play, hd.rec),
    body, A('left:1.6rem;top:49rem;width:58.8rem;display:flex;gap:.5rem', tabs));
  home = A('inset:0;display:none'); app.append(main, home);
}
function render() {
  if (!S.st) return; const isHome = sel('home', 1) === 1;
  if (isHome !== wasHome) { wasHome = isHome; home.style.display = isHome ? 'block' : 'none'; main.style.display = isHome ? 'none' : 'block'; setPlates(1240, 1080, isHome ? HOMEPLATES : MAINPLATES); document.getElementById('dim').style.cssText = isHome ? 'inset:0' : 'left:0;right:0;top:5.8rem;bottom:6rem'; curKey = ''; if (isHome) homeView(); }
  if (isHome) { setBg('tri', 0.45); return; }
  const st = S.st, T = trk(), tab = sel('tab', 0); fitTxt(hd.name, T ? T.name : 'NO TRACK'); hd.kind.textContent = T ? `TRACK ${pad2(tIdx() + 1)} · ${D.TYPES[T.type]}` : ''; hd.play.textContent = st.playing ? '❚❚' : '▶'; hd.play.classList.toggle('on', !!st.playing); hd.rec.classList.toggle('hot', !!st.rec);
  tabs.forEach((b, i) => { b.classList.toggle('off', i !== tab); b.classList.toggle('on', i === tab); });
  const key = [tab, tIdx(), T ? T.type : -1, T ? T.eng : 0, V.page, V.mpage, V.mixPage, st.tracks.length, T && T.type === 2 ? Math.round(T.P[P.S_MODE] * 4) : 0].join(':');
  if (key !== curKey) { curKey = key; body.innerHTML = ''; cur = [soundTab, fxTab, mixTab, inputTab, masterTab, playTab][tab](); body.append(cur.el); }
  setBg(TBG[tab], 0.55); cur.update();
}
function onMeters() { const m = S.m; if (sel('home', 1) === 1) { pulseBg(0.35, false); return; } hd.m.set(meterFrac(m.trk[tIdx()] || 0)); hd.cpu.textContent = 'CPU ' + Math.round(m.cpu) + '%'; pulseBg(Math.min(1, Math.max(m.pkL, m.pkR) * 1.3), false); if (cur && cur.fast) cur.fast(m); }
function onAct(name) { if (name === 'LEFT' || name === 'RIGHT') setSel('tab', (sel('tab', 0) + (name === 'RIGHT' ? 1 : TABS.length - 1)) % TABS.length); }

// ---------------------------------------------------------------- the start screen
function homeView() {
  home.innerHTML = ''; let ps = []; try { ps = JSON.parse(SMB.projects()); } catch (e) {}
  const go = () => { C('sel home 0'); sync(true); }, big = (t, sub, fn, cls) => h('button', { class: 'btn two ' + cls, style: 'height:6rem;width:100%;padding:0 1.4rem;gap:.4rem', tap: fn }, h('b', { style: 'font-size:1.4rem;font-weight:700;letter-spacing:.2rem' }, t), h('span', { class: 'lab', style: cls === 'on' ? 'color:#0d0a2e' : '' }, sub));
  const list = h('div', { class: 'list scroll lcd', style: 'height:17.6rem' }, ps.length ? ps.map(p => h('div', { class: 'it', tap: () => { SMB.open(p.n); setTimeout(go, 300); } }, h('span', { style: 'color:#ff7ad9' }, '▸'), p.n)) : h('div', { class: 'it' }, 'YOUR SAVED SONGS APPEAR HERE'));
  home.append(h('div', { class: 'abs col', style: 'left:6rem;top:3.4rem;width:50rem;align-items:center;gap:.4rem' }, h('div', { class: 'mich chrome', style: 'font-size:3.4rem;letter-spacing:.9rem;line-height:4rem' }, 'STRING-R'), h('div', { class: 'mono', style: 'font-size:.8rem;letter-spacing:.5rem;color:#fff' }, 'WHAT ARE WE MAKING TODAY')),
    h('div', { class: 'abs col', style: 'left:6rem;top:14.5rem;width:50rem;gap:.7rem' }, big('CONTINUE', (S.poll.proj || S.st.title || 'YOUR LAST SONG') + ' · ' + S.st.bars + ' BARS · ' + S.st.bpm + ' BPM', go, 'on'),
      h('div', { class: 'row', style: 'gap:.7rem' }, h('div', { class: 'grow' }, big('NEW SONG', 'FOUR EMPTY TRACKS', () => { SMB.fresh('blank'); go(); }, '')), h('div', { class: 'grow' }, big('DEMO SONG', 'FIRST LIGHT · 138 BPM TRANCE', () => { SMB.fresh('demo'); go(); }, ''))),
      lab('OPEN A SAVED SONG', 'hi'), list, h('div', { class: 'mono', style: 'font-size:.65rem;letter-spacing:.15rem;color:#dcd8ff;text-align:center' }, (SMB.info() || '').toUpperCase())));
}

// ---------------------------------------------------------------- SOUND
function soundTab() { const T = trk(); if (!T) return { el: h('div', { class: 'abs col', style: 'inset:0;align-items:center;justify-content:center' }, btn('+ ADD A TRACK', addTrackMenu, 'hot big')), update() {} }; return [drumSound, synthSound, samplerSound, midiSound][T.type](); }
function keysRow(t, n = 12, style = '') { const st = S.st, mask = D.SCALES[st.scale][1], o = []; let p = 48 + st.key + V.oct * 12; while (o.length < n && p < 127) { if ((mask >> (((p - st.key) % 12 + 12) % 12)) & 1) o.push(p); p++; }
  return h('div', { class: 'row', style: 'gap:.35rem;' + style }, btn('−', () => { V.oct = Math.max(-2, V.oct - 1); curKey = ''; render(); }, 'sq'), o.map(p => { const root = ((p - st.key) % 12 + 12) % 12 === 0; return hold(h('button', { class: 'btn ' + (root ? 'on' : ''), style: 'flex:1;height:4.6rem;padding:0;min-width:0' }, noteName(p)), () => C(`non ${t} ${p} 0.9`), () => C(`noff ${t} ${p}`)); }), btn('+', () => { V.oct = Math.min(3, V.oct + 1); curKey = ''; render(); }, 'sq')); }
function synthSound() {
  const t = tIdx(), T = trk(), nameB = h('b', { style: 'display:block;width:14.4rem;text-align:left' }, ''), step = (d) => { const i = D.SOUNDS.findIndex(s => s.name === trk().name), n = D.SOUNDS.length; applySound(t, D.SOUNDS[((i < 0 ? 0 : i + d) + n) % n]); play(t, 60, 300); };
  const ks = V.page === 0 ? D.KNOBS.synth.slice(0, 12) : D.KNOBS.synth.slice(12);
  const el = h('div', { class: 'abs col', style: 'inset:0;gap:.6rem' },
    h('div', { class: 'row gap' }, D.ENGINES.map((e, i) => btn(e, () => edit(`trk eng ${t} ${i}`), T.eng === i ? 'on' : '', 'flex:1')), h('div', { style: 'width:.6rem' }), btn('◀', () => step(-1), 'sq'), h('button', { class: 'btn two', style: 'width:16rem', tap: () => choose('CHOOSE A SOUND', D.SOUNDS.map(s => ({ label: s.name, on: s.name === trk().name })), (i) => { applySound(t, D.SOUNDS[i]); play(t, 60, 300); }, 3, 58) }, lab('SOUND'), nameB), btn('▶', () => step(1), 'sq')),
    h('div', { class: 'row gap' }, btn('MAIN', () => { V.page = 0; render(); }, V.page === 0 ? 'on' : '', 'width:9rem'), btn('ARP + LFO', () => { V.page = 1; render(); }, V.page === 1 ? 'on' : '', 'width:9rem'), h('div', { class: 'grow' }), lab('DRAG A KNOB UP OR DOWN · DOUBLE-TAP RESETS IT', 'hi')),
    kgrid(6, ks.map(k => pknob(t, k)), 'flex:1;align-content:space-evenly'), keysRow(t));
  return { el, update() { upd(el); fitTxt(nameB, trk().name); } };
}
function kitPicker() {
  const t = tIdx(); let mine = []; try { mine = JSON.parse(SMB.kits()); } catch (e) {}
  const after = () => { closePop(); setTimeout(() => sync(true), 500); }, save = () => ask('NAME THIS KIT', trk().name.replace(/ KIT$/, ''), (v) => { SMB.saveKit(v.toUpperCase()); setTimeout(() => sync(true), 300); });
  popup('DRUM KITS', h('div', { class: 'col', style: 'gap:.7rem' }, h('div', { class: 'row gap' }, lab('MY KITS · YOUR OWN PADS AND SAMPLES', 'hi'), h('div', { class: 'grow' }), btn('SAVE THIS KIT', save, 'hot')),
    h('div', { class: 'list scroll lcd', style: 'max-height:15rem;min-height:3.2rem' }, mine.length ? mine.map(k => h('div', { class: 'it' }, h('button', { class: 'grow', style: 'height:3rem;text-align:left', tap: () => { SMB.loadKit(k.n); after(); } }, k.n), h('span', { class: 'tag' }, `${k.pads} PADS · ${k.smp} SAMPLES`), h('button', { style: 'width:2.2rem;height:2.2rem;border:.1rem solid currentColor;margin-left:.6rem', 'aria-label': 'Delete kit ' + k.n, tap: () => confirmPop('DELETE THE KIT ' + k.n + '?', () => { SMB.removeKit(k.n); setTimeout(kitPicker, 150); }) }, '✕'))) : h('div', { class: 'it' }, 'NO KITS SAVED YET — BUILD ONE ON THE PADS, THEN SAVE IT')),
    lab('BUILT-IN KITS', 'hi'), h('div', { style: 'display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem' }, D.KITS.map(k => btn(k.name, () => { applyKit(t, k); closePop(); play(t, 0); })), btn('EMPTY KIT', () => { applyKit(t, { name: 'MY', rumble: 0, pads: [] }); closePop(); }))), 56);
}
function drumSound() {
  const t = tIdx(), grid = h('div', { style: 'display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;flex:1;min-height:0' }), side = h('div', { class: 'col', style: 'width:27.5rem;gap:.5rem' }), el = h('div', { class: 'abs row', style: 'inset:0;gap:.7rem;align-items:stretch' }, h('div', { class: 'col grow', style: 'gap:.5rem' }, grid), side);
  const pads = () => S.st.tracks[t].pads, n16 = () => V.pads16 != null ? V.pads16 : pads().some((p, i) => i >= 8 && p.type !== 10); let last = '';
  const pk = (f, label) => knob({ label, small: true, get: () => pads()[sel('pad', 0)][f], set: (v) => { pads()[sel('pad', 0)][f] = v; C(`pad ${t} ${sel('pad', 0)} ${f} ${v.toFixed(4)}`); } });
  function fill() { const ps = pads(), sp = clamp(sel('pad', 0), 0, 15), big = n16(); grid.innerHTML = ''; grid.style.gridTemplateRows = `repeat(${big ? 4 : 2},1fr)`;
    const order = big ? [12, 13, 14, 15, 8, 9, 10, 11, 4, 5, 6, 7, 0, 1, 2, 3] : [4, 5, 6, 7, 0, 1, 2, 3];
    for (const i of order) { const p = ps[i], sm = p.type === 9 ? S.st.smp.find(s => s.id === p.smp) : null, on = i === sp, empty = p.type === 10;
      grid.append(hold(h('button', { class: 'btn ' + (on ? 'on' : ''), style: `height:auto;min-height:0;padding:.5rem;flex-direction:column;align-items:flex-start;justify-content:space-between;white-space:normal;text-align:left;${empty && !on ? 'opacity:.55' : ''}` }, h('span', { class: 'mono', style: 'font-size:.7rem;letter-spacing:.1rem' }, 'PAD ' + pad2(i + 1)), h('span', { style: 'font-size:.85rem;word-break:break-word;line-height:1.1' }, sm ? sm.name.slice(0, 18) : D.DRUMS[p.type]), h('span', { class: 'mono', style: `font-size:.68rem;letter-spacing:.08rem;color:${on ? '#0d0a2e' : '#ff7ad9'}` }, sm ? 'YOUR SAMPLE' : empty ? 'TAP, THEN LOAD' : 'SYNTH')), () => { C(`non ${t} ${i} 0.9`); if (sel('pad', 0) !== i) { C(`sel pad ${i}`); sync(); } }, () => C(`noff ${t} ${i}`))); }
    const p = ps[sp]; side.innerHTML = '';
    side.append(h('div', { class: 'row gap' }, two('KIT', S.st.tracks[t].name.slice(0, 11), kitPicker, 'grow'), btn('MY KITS', kitPicker), btn('SAVE KIT', () => ask('NAME THIS KIT', S.st.tracks[t].name.replace(/ KIT$/, ''), (v) => { SMB.saveKit(v.toUpperCase()); setTimeout(() => sync(true), 300); }), 'hot')),
      panel('display:flex;flex-direction:column;gap:.5rem;flex:1', h('div', { class: 'row gap' }, lab('PAD ' + pad2(sp + 1), 'hi'), h('div', { class: 'grow' }), btn(D.DRUMS[p.type] + ' ▾', () => choose('WHAT IS ON THIS PAD', D.DRUMS.map((d, i) => ({ label: d, on: i === p.type })).filter((_, i) => i !== 9), (i) => edit(`pad ${t} ${sp} type ${i >= 9 ? 10 : i}`), 4, 54), 'sm'), btn('LOAD MY SAMPLE', () => { C('sel view 3'); sync(); toast('PICK A FILE ON THE TOP SCREEN → DRUM PAD ' + pad2(sp + 1)); }, 'sm on')),
        kgrid(3, [pk('tune', p.type === 9 ? 'PITCH ±' : 'TUNE'), pk('decay', 'LENGTH'), pk('level', 'LEVEL'), pk('pan', 'PAN'), pk('tone', 'TONE')], 'flex:1;align-content:space-evenly')),
      panel('', lab('WHOLE KIT', 'hi'), kgrid(4, D.KNOBS.drum.map(k => pknob(t, k, true)))), h('div', { class: 'row gap' }, btn(n16() ? '16 PADS' : '8 PADS', () => { V.pads16 = !n16(); last = ''; update(); }, '', 'flex:1'), btn('COPY PAD ▸ NEXT', () => { if (sp >= 15) return; const q = ps[sp]; edit(`pad ${t} ${sp + 1} ${q.type} ${q.tune} ${q.decay} ${q.level} ${q.pan} ${q.tone} ${q.smp}`, `sel pad ${sp + 1}`); }, '', 'flex:1'))); }
  function update() { const k = JSON.stringify([pads().map(p => [p.type, p.smp]), sel('pad', 0), n16(), S.st.tracks[t].name]); if (k !== last) { last = k; fill(); } else upd(el); }
  return { el, update };
}
function samplerSound() {
  const t = tIdx(), T = trk(), mode = Math.round(T.P[P.S_MODE] * 4), grain = mode === 4, set = (k, v) => edit(`p ${t} ${k} ${v}`), tog = (label, k) => btn(label, () => set(k, trk().P[k] > .5 ? 0 : 1), T.P[k] > .5 ? 'on' : '', 'flex:1');
  const nameB = h('b', null, ''), row2 = h('div', { class: 'row gap' });
  const el = h('div', { class: 'abs col', style: 'inset:0;gap:.6rem' }, h('div', { class: 'row gap' }, h('button', { class: 'btn two', style: 'width:17rem', tap: () => { C('sel view 3'); sync(); toast('PICK A FILE ON THE TOP SCREEN'); } }, lab('SAMPLE · TAP TO LOAD'), nameB), D.SMODES.map((m, i) => btn(m, () => set(P.S_MODE, i / 4), mode === i ? (i === 4 ? 'hot' : 'on') : '', 'flex:1;padding:0'))),
    row2, kgrid(6, (grain ? D.KNOBS.grain : D.KNOBS.sampler).map(k => pknob(t, k)), 'flex:1;align-content:space-evenly'),
    lab(grain ? 'GRAIN: THE SAMPLE IS SPRAYED AS TINY PIECES AROUND POSITION. PLAY NOTES IN A BLOCK TO PITCH THE CLOUD.' : ['ONE-SHOT: A NOTE PLAYS THE SAMPLE ONCE, PITCHED BY THE NOTE', 'LOOP: HELD NOTES LOOP BETWEEN START AND END', 'SLICE: 16 SLICES, ONE PER NOTE FROM C4 UP', 'CLIP: A LONG RECORDING THAT FOLLOWS THE SONG'][mode], 'hi'), keysRow(t));
  function update() { const T2 = trk(), sm = S.st.smp.find(s => s.id === T2.smp); nameB.textContent = sm ? sm.name.slice(0, 18) : 'NONE YET'; row2.innerHTML = '';
    if (grain) row2.append(tog('FREEZE', P.G_FREEZE), tog('REVERSE', P.S_REV), btn('CHAOS', () => edit([P.G_POS, P.G_SIZE, P.G_DENS, P.G_SPRAY, P.G_SPREAD, P.G_SHATTER].map(k => `p ${t} ${k} ${Math.random().toFixed(3)}`)), '', 'flex:1'), btn('CALM', () => edit(`p ${t} ${P.G_SIZE} 0.5`, `p ${t} ${P.G_DENS} 0.5`, `p ${t} ${P.G_SPRAY} 0.1`, `p ${t} ${P.G_SPREAD} 0.3`, `p ${t} ${P.G_SHATTER} 0`), '', 'flex:1'), btn('SEE THE WAVE', () => { C('sel view 2'); sync(); }, '', 'flex:1'));
    else row2.append(tog('STRETCH TO TEMPO', P.S_STRETCH), tog('REVERSE', P.S_REV), btn('SEE THE WAVE', () => { C('sel view 2'); sync(); }, '', 'flex:1'), btn('TURN INTO GRAINS', () => set(P.S_MODE, 1), 'hot', 'flex:1'));
    upd(el); }
  return { el, update };
}
function midiSound() {
  const t = tIdx(), chL = h('div', { class: 'mich', style: 'font-size:2.6rem;color:#fff;width:8rem;text-align:center' }), dev = lab('', 'hi');
  const el = h('div', { class: 'abs col', style: 'inset:0;gap:1rem;align-items:center;justify-content:center' }, h('div', { class: 'mich chrome', style: 'font-size:1.6rem;letter-spacing:.3rem' }, 'THIS TRACK PLAYS THE FM-1'), lab('ITS NOTES GO OUT OVER USB MIDI. THE FM-1 MAKES THE SOUND; RECORD IT ON THE INPUT TAB TO KEEP IT AS AUDIO.', 'hi'), dev,
    h('div', { class: 'row gap' }, lab('MIDI CHANNEL', 'hi'), btn('−', () => edit(`trk ch ${t} ${(trk().ch + 15) % 16}`), 'sq'), chL, btn('+', () => edit(`trk ch ${t} ${(trk().ch + 1) % 16}`), 'sq')), h('div', { style: 'width:100%' }, keysRow(t)));
  return { el, update() { chL.textContent = trk().ch + 1; }, fast() { dev.textContent = S.poll.midi ? 'CONNECTED: ' + S.poll.midi.toUpperCase() : 'NO MIDI DEVICE FOUND — PLUG THE FM-1 INTO THE USB-C PORT'; } };
}

// ---------------------------------------------------------------- FX
function fxTab() { const t = tIdx(); if (!trk()) return { el: h('div'), update() {} };
  const el = h('div', { class: 'abs col', style: 'inset:0;gap:.5rem' }, lab('EFFECTS ON THIS TRACK · DELAY AND REVERB ARE SHARED AND SET ON THE MASTER TAB', 'hi'), kgrid(5, D.KNOBS.fx.map(k => pknob(t, k)), 'flex:1;align-content:space-evenly'),
    h('div', { class: 'row gap' }, btn('RESET ALL EFFECTS', () => edit([[5, 0], [6, 0], [4, 0], [2, 1], [7, 0], [8, 0], [9, 0], [3, .15], [10, .5], [11, .5], [12, .5], [13, 0], [14, .5]].map(([k, v]) => `p ${t} ${k} ${v}`))), h('div', { class: 'grow' }), lab('TO CHANGE AN EFFECT OVER TIME, USE AUTOMATION IN THE NOTES VIEW', 'hi')));
  return { el, update() { upd(el); } }; }

// ---------------------------------------------------------------- MIX
function mixTab() {
  const st = S.st, n = st.tracks.length, per = 6; V.mixPage = clamp(V.mixPage, 0, Math.max(0, Math.ceil(n / per) - 1)); const t0 = V.mixPage * per, meters = [], strips = [], row = h('div', { class: 'row grow', style: 'gap:.5rem;align-items:stretch' });
  for (let t = t0; t < Math.min(n, t0 + per); t++) { const cap = h('div', { class: 'abs', style: 'left:.3rem;right:.3rem;height:1.6rem;background:linear-gradient(180deg,#fff,#d9d5ff 45%,#a39df0);border:.1rem solid #0d0a2e;box-shadow:0 0 .8rem #8f7bff;pointer-events:none' }), m = leds('v', 'height:100%'), tr = h('div', { style: 'position:relative;flex:1;height:100%;background:rgba(7,5,28,.7);border:.1rem solid rgba(190,180,255,.4)' }, h('div', { class: 'abs', style: 'left:50%;top:.6rem;bottom:.6rem;width:.2rem;background:#3a2f7a' }), cap);
    const setV = (e) => { const r = tr.getBoundingClientRect(), v = clamp(1 - (e.clientY - r.top - rem() * 0.8) / (r.height - rem() * 1.6)); S.st.tracks[t].P[0] = v; C(`p ${t} 0 ${v.toFixed(4)}`); place(); }, place = () => { cap.style.bottom = `calc(${(S.st.tracks[t].P[0] * 100).toFixed(1)}% - ${(S.st.tracks[t].P[0] * 1.6).toFixed(2)}rem)`; };
    let d = false; tr.addEventListener('pointerdown', (e) => { try { tr.setPointerCapture(e.pointerId); } catch (x) {} d = true; mark(); SMB.focus(`p ${t} 0`); setV(e); }); tr.addEventListener('pointermove', (e) => { if (d) setV(e); }); const up = () => { if (d) { d = false; C('bump'); } }; tr.addEventListener('pointerup', up); tr.addEventListener('pointercancel', up);
    const nmT = h('span', { style: 'display:block;width:100%;text-align:center' }), nm = h('button', { class: 'btn sm', style: 'width:100%;padding:0 .4rem', tap: () => setTrack(t) }, nmT), mu = btn('M', () => { C(`trk mute ${t} ${S.st.tracks[t].mute ? 0 : 1}`); sync(); }, 'sm', 'flex:1;padding:0'), so = btn('S', () => { C(`trk solo ${t} ${S.st.tracks[t].solo ? 0 : 1}`); sync(); }, 'sm', 'flex:1;padding:0');
    meters[t] = m; strips.push({ t, place, nm, nmT, mu, so }); row.append(h('div', { class: 'col', style: 'flex:1;min-width:0;gap:.4rem' }, nm, h('div', { class: 'row grow', style: 'gap:.3rem;align-items:stretch' }, tr, m), pknob(t, [P.PAN, 'PAN'], true), h('div', { class: 'row', style: 'gap:.3rem' }, mu, so))); }
  const mm = leds('v', 'height:100%'), el = h('div', { class: 'abs row', style: 'inset:0;gap:.6rem;align-items:stretch' }, row, h('div', { class: 'col', style: 'width:5.4rem;gap:.4rem' }, lab('OUT', 'hi'), h('div', { class: 'row grow', style: 'justify-content:center' }, mm), n > per ? btn('◀', () => { V.mixPage--; render(); }, 'sm') : null, n > per ? btn('▶', () => { V.mixPage++; render(); }, 'sm') : null, btn('+', addTrackMenu, 'sm')));
  return { el, update() { for (const s of strips) { const T = S.st.tracks[s.t]; if (!T) continue; s.place(); fitTxt(s.nmT, T.name, 0.66); s.nm.classList.toggle('on', s.t === tIdx()); s.mu.classList.toggle('hot', !!T.mute); s.so.classList.toggle('on', !!T.solo); } upd(el); }, fast(m) { meters.forEach((x, i) => x && x.set(meterFrac(m.trk[i] || 0))); mm.set(meterFrac(Math.max(m.pkL, m.pkR))); } };
}

// ---------------------------------------------------------------- INPUT: the FM-1, the KO II or a microphone coming in
function inputTab() {
  const dev = h('b', { style: 'font-size:1rem;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis' }), lvl = leds('', 'flex:1;height:1.2rem'), mon = btn('HEAR IT', () => { C('inmon ' + (S.st.inMon ? 0 : 1)); sync(); }, '', 'width:9rem;height:4.2rem'), rec = btn('● RECORD', () => { SMB.rec(); }, 'hot dimd', 'width:16rem;height:4.2rem;font-size:1.1rem'), styles = h('div', { style: 'display:grid;grid-template-columns:repeat(5,1fr);gap:.4rem' });
  const ks = [[P.TUNE, 'AUTO-TUNE'], [P.SHIFT, 'PITCH SHIFT'], [P.DRIVE, 'DRIVE'], [P.CRUSH, 'CRUSH'], [P.HPF, 'LOW CUT'], [P.CUT, 'HIGH CUT'], [P.SENDA, 'DELAY'], [P.SENDB, 'REVERB'], [P.EQLO, 'EQ LOW'], [P.EQMID, 'EQ MID'], [P.EQHI, 'EQ HIGH'], [P.VOL, 'LEVEL']];
  const el = h('div', { class: 'abs col', style: 'inset:0;gap:.6rem' }, h('div', { class: 'row gap' }, h('div', { class: 'lcd col grow', style: 'height:4.2rem;padding:.5rem .8rem;justify-content:space-between' }, h('div', { class: 'row gap' }, lab('COMING IN FROM'), dev), lvl), mon, rec),
    lab('VOICE STYLES · ONE TAP SETS THE KNOBS BELOW · AUTO-TUNE FOLLOWS THE SONG KEY', 'hi'), styles, kgrid(6, ks.map(k => pknob(16, k)), 'flex:1;align-content:space-evenly'), lab('RECORD WAITS FOR THE FIRST SOUND, THEN STARTS. THE TAKE LANDS ON A NEW TRACK AT THAT BAR.', 'hi'));
  function update() { styles.innerHTML = ''; D.VOCALS.forEach(v => styles.append(btn(v.name, () => { V.vox = v.name; edit(Object.entries({ 13: 0, 14: .5, 5: 0, 6: 0, 4: 0, 2: 1, 7: 0, 8: 0, 10: .5, 11: .5, 12: .5, ...v.p }).map(([k, x]) => `p 16 ${k} ${x}`)); }, V.vox === v.name ? 'on' : '', 'padding:0'))); mon.classList.toggle('on', !!S.st.inMon); upd(el); }
  return { el, update, fast(m) { const p = S.poll; dev.textContent = (p.mic === false ? 'MICROPHONE NOT ALLOWED YET' : (p.input || 'NOTHING')).toUpperCase() + (p.midi ? ' · MIDI ' + p.midi.toUpperCase() : ''); lvl.set(meterFrac(m.inPk)); rec.classList.toggle('dimd', !p.rec); rec.textContent = !p.rec ? '● RECORD' : m.recSec < 0.02 ? 'READY · PLAY NOW' : '■ STOP ' + Math.floor(m.recSec / 60) + ':' + pad2(Math.floor(m.recSec % 60)); } };
}

// ---------------------------------------------------------------- MASTER
function masterTab() {
  const chips = h('div', { style: 'display:grid;grid-template-columns:repeat(4,1fr);gap:.4rem' }), big = h('div', { class: 'mich', style: 'font-size:3rem;line-height:3.2rem;color:#fff;width:10.5rem;text-align:right;text-shadow:0 0 1rem #8f7bff' }), integ = h('b', { style: 'color:#fff;font-size:.9rem' }), tgt = lab('', 'hi'), cv = h('canvas', { style: 'width:100%;height:2.6rem;display:block' }), gr = leds('', 'flex:1'), refB = btn('A/B REFERENCE', () => { if (S.st.refId < 0) return toast('LOAD A REFERENCE SONG IN FILES ON THE TOP SCREEN'); C(`ref ${S.st.refId} ${S.st.refOn ? 0 : 1}`); sync(); });
  const mknob = ([i, label, steps]) => knob({ label, steps, focus: `m ${i}`, get: () => S.st.M[i], set: (v) => { S.st.M[i] = v; C(`m ${i} ${v.toFixed(4)}`); } }), names = () => S.st.tracks.map(T => T.type === 3 ? '' : T.name).join('|');
  D.MASTERS.forEach(p => chips.append(btn(p.name, () => { edit(Object.entries(p.m).map(([k, v]) => `m ${k} ${v}`)); V.mp = p.name; V.target = p.target; C('lufs'); render(); }, '', 'padding:0')));
  const el = h('div', { class: 'abs col', style: 'inset:0;gap:.6rem' }, chips,
    h('div', { class: 'lcd row', style: 'padding:.6rem 1rem;gap:1rem' }, h('div', { class: 'col' }, lab('LOUDNESS NOW'), h('div', { class: 'row', style: 'align-items:baseline;gap:.4rem' }, big, lab('LUFS'))), h('div', { class: 'col grow', style: 'gap:.35rem' }, cv, h('div', { class: 'row gap' }, lab('WHOLE SONG'), integ, h('div', { class: 'grow' }), tgt), h('div', { class: 'row gap' }, lab('LIMITING'), gr))),
    kgrid(V.mpage === 0 ? 4 : 5, (V.mpage === 0 ? D.KNOBS.master.slice(0, 7) : D.KNOBS.master.slice(7)).map(mknob), 'flex:1;align-content:space-evenly'),
    h('div', { class: 'row gap' }, btn('MASTER', () => { V.mpage = 0; render(); }, V.mpage === 0 ? 'on' : ''), btn('ECHO + ROOM', () => { V.mpage = 1; render(); }, V.mpage === 1 ? 'on' : ''), refB, h('div', { class: 'grow' }), btn('BOUNCE BLOCK', () => SMB.export('bounce', '')), btn('STEMS', () => SMB.export('stems', names())), btn('EXPORT SONG', () => SMB.export('song', ''), 'hot')));
  return { el, update() { upd(el); chips.querySelectorAll('.btn').forEach(c => c.classList.toggle('on', c.textContent === V.mp)); refB.classList.toggle('on', !!S.st.refOn); tgt.textContent = 'TARGET ' + V.target + ' LUFS'; },
    fast(m) { big.textContent = m.short <= -69 ? '--' : m.short.toFixed(1); integ.textContent = m.integ <= -69 ? '--' : m.integ.toFixed(1); gr.set(clamp((m.lim + m.glue * 0.5) / 12));
      const d = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, hh = cv.clientHeight; if (cv.width !== Math.round(w * d)) { cv.width = Math.round(w * d); cv.height = Math.round(hh * d); } const g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, w, hh);
      const X = (l) => clamp((l + 30) / 27) * w; g.fillStyle = '#1a1548'; g.fillRect(0, hh * .25, w, hh * .5); const grad = g.createLinearGradient(0, 0, w, 0); grad.addColorStop(0, '#6d5cf2'); grad.addColorStop(.7, '#e9e6ff'); grad.addColorStop(1, '#ff7ad9'); g.fillStyle = grad; if (m.short > -69) g.fillRect(0, hh * .25, X(m.short), hh * .5);
      if (m.mom > -69) { g.fillStyle = '#fff'; g.fillRect(X(m.mom) - 1, hh * .1, 2, hh * .8); } g.fillStyle = '#ff7ad9'; g.fillRect(X(V.target) - 1.5, 0, 3, hh); for (const l of [-24, -18, -14, -10, -6]) { g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(X(l), hh * .85, 1, hh * .15); } } };
}

// ---------------------------------------------------------------- PLAY: pads for the selected track, and effects you hold
function playTab() {
  const T = trk(), t = tIdx(), pads = h('div', { style: 'display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(4,1fr);gap:.5rem;flex:1;min-height:0' }), el = h('div', { class: 'abs row', style: 'inset:0;gap:.7rem;align-items:stretch' }), octL = lab('', 'hi');
  const notes = () => { const mask = D.SCALES[S.st.scale][1], o = []; let n = 48 + S.st.key + V.oct * 12; while (o.length < 16 && n < 127) { if ((mask >> (((n - S.st.key) % 12 + 12) % 12)) & 1) o.push(n); n++; } return o; };
  function fill() { pads.innerHTML = ''; if (!T) return; const drum = T.type === 0, ns = drum ? Array.from({ length: 16 }, (_, i) => i) : notes(); [12, 13, 14, 15, 8, 9, 10, 11, 4, 5, 6, 7, 0, 1, 2, 3].forEach((k) => { const n = ns[k]; if (n == null) return pads.append(h('div')); const root = !drum && ((n - S.st.key) % 12 + 12) % 12 === 0, sm = drum && T.pads[n].type === 9 ? S.st.smp.find(s => s.id === T.pads[n].smp) : null;
    pads.append(hold(h('button', { class: 'btn ' + (root ? 'on' : ''), style: `height:auto;min-height:0;font-size:1rem;flex-direction:column;gap:.2rem;white-space:normal;${drum && T.pads[n].type === 10 ? 'opacity:.4' : ''}` }, drum ? [h('span', { class: 'mono', style: 'font-size:.65rem' }, pad2(n + 1)), sm ? sm.name.slice(0, 12) : D.DRUMS[T.pads[n].type]] : noteName(n)), () => C(`non ${t} ${n} 0.9`), () => C(`noff ${t} ${n}`))); }); }
  const hb = (label, on, off, cls = '') => hold(h('button', { class: 'btn ' + cls, style: 'flex:1;height:auto;font-size:1rem' }, label), on, off);
  const dot = h('div', { class: 'abs', style: 'top:0;bottom:0;width:.4rem;background:#fff;box-shadow:0 0 1rem #b04bff;left:50%' }), strip = h('div', { class: 'lcd', style: 'height:6rem;position:relative;overflow:hidden' }, h('span', { class: 'lab abs', style: 'left:.8rem;top:.5rem' }, '◀ MUFFLE'), h('span', { class: 'lab abs', style: 'right:.8rem;top:.5rem' }, 'THIN ▶'), h('span', { class: 'lab abs', style: 'left:0;right:0;bottom:.5rem;text-align:center' }, 'FILTER: SLIDE AND HOLD'), dot);
  let sd = false; const sv = (e) => { const r = strip.getBoundingClientRect(), x = clamp((e.clientX - r.left) / r.width); dot.style.left = (x * 100) + '%'; C('perf 0 ' + x.toFixed(3)); };
  strip.addEventListener('pointerdown', (e) => { try { strip.setPointerCapture(e.pointerId); } catch (x) {} sd = true; sv(e); }); strip.addEventListener('pointermove', (e) => { if (sd) sv(e); }); const su = () => { if (sd) { sd = false; dot.style.left = '50%'; C('perf 0 0.5'); } }; strip.addEventListener('pointerup', su); strip.addEventListener('pointercancel', su);
  el.append(h('div', { class: 'col', style: 'flex:1.6;gap:.5rem;min-width:0' }, h('div', { class: 'row gap', style: 'height:3.2rem' }, lab(S.st.rec ? 'RECORD IS ON: WHAT YOU PLAY IS WRITTEN INTO THE BLOCK' : 'PRESS ● AND PLAY TO WRITE NOTES INTO THE BLOCK', 'hi'), h('div', { class: 'grow' }), T && T.type !== 0 ? [btn('−', () => { V.oct = Math.max(-2, V.oct - 1); fill(); upd2(); }, 'sq'), octL, btn('+', () => { V.oct = Math.min(3, V.oct + 1); fill(); upd2(); }, 'sq')] : null), pads),
    h('div', { class: 'col', style: 'flex:1;gap:.5rem;min-width:0' }, h('div', { class: 'row', style: 'height:3.2rem' }, lab('HOLD TO PERFORM · LIVE ONLY, NOT RECORDED', 'hi')), strip, hb('STUTTER', () => C('perf 1 0.7'), () => C('perf 1 0')), hb('FAST STUTTER', () => C('perf 1 1'), () => C('perf 1 0')), hb('HALF SPEED', () => C('perf 2 1'), () => C('perf 2 0')), hb('TAPE STOP', () => C('perf 3 1'), () => C('perf 3 0'), 'hot')));
  const upd2 = () => { octL.textContent = 'OCTAVE ' + (V.oct > 0 ? '+' : '') + V.oct; }; let lastKey = '';
  return { el, update() { const k = S.st.key + ':' + S.st.scale + ':' + (T && T.type === 0 ? T.pads.map(p => p.type + '.' + p.smp).join() : ''); if (k !== lastKey) { lastKey = k; fill(); } upd2(); } };
}

window.addEventListener('load', () => { build(); start(); });
