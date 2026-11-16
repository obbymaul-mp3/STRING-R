// Writes the two starting songs from the preset data: assets/demo.smx (a finished trance sketch built from blocks) and assets/blank.smx.
const D = require('../app/src/main/assets/ui/data.js'), fs = require('fs');
const T = 24;
function proj(title, bpm) {
  const L = ['smx 2', `title "${title}"`, `bpm ${bpm}`, 'key 9 1']; let nt = 0; const nb = {};
  const kit = (t, k) => { D.KITS[k].pads.forEach((p, i) => L.push(`pad ${t} ${i} ${p.type} ${p.tune} ${p.decay} ${p.level} ${p.pan} ${p.tone} -1`)); L.push(`p ${t} 16 ${D.KITS[k].rumble}`); };
  const sound = (t, name, extra = {}) => { const s = D.SOUNDS.find(x => x.name === name); L.push(`trk eng ${t} ${s.eng}`); for (const [k, v] of Object.entries({ ...s.p, ...extra })) L.push(`p ${t} ${k} ${v}`); L.push(`trk name ${t} "${name}"`); };
  return { L, add: (type) => { L.push(`trk add ${type}`); nb[nt] = 0; return nt++; }, kit, sound,
    blk: (t, bars, name) => { L.push(`blk add ${t} ${bars} "${name}"`); return nb[t]++; },
    n: (t, b, step, len, pitch, vel = 0.8) => L.push(`n ${t} ${b} ${Math.round(step * T)} ${Math.round(len * T)} ${pitch} ${vel}`), pl: (t, bar, b) => L.push(`pl add ${t} ${bar} ${b}`) };
}
// ---- blank: four tracks, one empty four-bar block each, placed at bar 1
{ const p = proj('NEW SONG', 138); const d = p.add(0); p.kit(d, 0); const b = p.add(1); p.sound(b, 'ROLLING BASS'); const l = p.add(1); p.sound(l, 'SUPERSAW LEAD'); const m = p.add(3); p.L.push(`trk name ${m} "FM-1"`);
  for (const t of [d, b, l, m]) { p.blk(t, 4, 'BLOCK 1'); p.pl(t, 0, 0); } p.L.push('loop 1 0 4');
  fs.writeFileSync(__dirname + '/../app/src/main/assets/blank.smx', p.L.join('\n') + '\n'); }
// ---- demo: A minor, 138 bpm, Am F C G. Thirty bars of blocks on five tracks.
{ const p = proj('FIRST LIGHT', 138); const dr = p.add(0); p.kit(dr, 0); const bs = p.add(1); p.sound(bs, 'ROLLING BASS', { 0: .68 }); const ld = p.add(1); p.sound(ld, 'SUPERSAW LEAD', { 9: .35, 0: .8 });
  const pl = p.add(1); p.sound(pl, 'ANTHEM PLUCK', { 27: 1, 28: .5, 29: .5, 30: 0, 9: .5, 0: .8 }); const fm = p.add(3); p.L.push(`trk name ${fm} "FM-1"`);
  const roots = [33, 29, 36, 31], chords = [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]];
  const mel = [[[0, 3, 76], [3, 3, 76], [6, 2, 74], [8, 4, 72], [12, 2, 74], [14, 2, 76]], [[0, 3, 72], [3, 3, 72], [6, 2, 69], [8, 4, 77], [12, 4, 76]], [[0, 3, 76], [3, 3, 79], [6, 2, 76], [8, 4, 72], [12, 2, 74], [14, 2, 76]], [[0, 6, 74], [6, 2, 71], [8, 4, 74], [12, 4, 79]]];
  // drums
  const drum = (name, bars, o) => { const b = p.blk(dr, bars, name); for (let s = 0; s < bars * 16; s++) { if (s % 4 === 0) p.n(dr, b, s, 1, 0, o.fade ? 1 - s / (bars * 16) * 0.7 : 1); if (o.oh && s % 4 === 2) p.n(dr, b, s, 1, 4, .8); if (o.hat && s % 2 === 1) p.n(dr, b, s, 1, 3, .5); if (o.clap && s % 8 === 4) p.n(dr, b, s, 1, 2, .85); }
    if (o.roll) { p.n(dr, b, 32, 32, 5, .8); for (let s = 48; s < 64; s += (s < 56 ? 2 : 1)) p.n(dr, b, s, 1, 1, .4 + (s - 48) / 30); } if (o.crash) p.n(dr, b, 0, 4, 7, .7); if (o.fill) for (let s = 58; s < 64; s++) p.n(dr, b, s, 1, s % 2 ? 1 : 6, .6 + (s - 58) / 15); return b; };
  const dK = drum('KICK ONLY', 4, { oh: 1 }), dB = drum('BUILD', 4, { oh: 1, hat: 1, roll: 1 }), dF = drum('FULL KIT', 4, { oh: 1, hat: 1, clap: 1, crash: 1 }), dF2 = drum('FULL + FILL', 4, { oh: 1, hat: 1, clap: 1, fill: 1 }), dO = drum('OUT', 2, { fade: 1 });
  [[0, dK], [4, dB], [8, dF], [12, dF2], [20, dF], [24, dF2], [28, dO]].forEach(([bar, b]) => p.pl(dr, bar, b));
  // bass
  const bass = (name, jump) => { const b = p.blk(bs, 4, name); for (let bar = 0; bar < 4; bar++) for (let s = 0; s < 16; s++) if (s % 4) p.n(bs, b, bar * 16 + s, .8, roots[bar] + (jump && s % 4 === 3 ? 12 : 0), s % 4 === 2 ? .9 : .7); return b; };
  const bA = bass('ROLL A', 0), bB = bass('ROLL B', 1); [[4, bA], [8, bA], [12, bB], [20, bA], [24, bB]].forEach(([bar, b]) => p.pl(bs, bar, b));
  // lead
  const hook = p.blk(ld, 8, 'MAIN HOOK'); for (let rep = 0; rep < 2; rep++) for (let bar = 0; bar < 4; bar++) mel[bar].forEach(([s, l, n]) => p.n(ld, hook, (rep * 4 + bar) * 16 + s, l - .15, n + (rep && bar === 3 && s >= 8 ? 2 : 0), .85));
  const soft = p.blk(ld, 4, 'HOOK SOFT'); for (let bar = 0; bar < 4; bar++) p.n(ld, soft, bar * 16, 12, mel[bar][0][2], .6);
  [[8, hook], [16, soft], [20, hook]].forEach(([bar, b]) => p.pl(ld, bar, b));
  // pluck, arpeggiated
  const arp = (name, bars, lo, sweep) => { const b = p.blk(pl, bars, name); for (let bar = 0; bar < bars; bar++) chords[bar % 4].forEach(c => p.n(pl, b, bar * 16, 16, c - (lo ? 12 : 0), .75));
    if (sweep) { const cut = []; for (let s = 0; s < bars * 16; s++) cut.push((0.25 + 0.55 * s / (bars * 16 - 1)).toFixed(3)); p.L.push(`au ${pl} ${b} 2 ${cut.join(' ')}`); } return b; };
  const aR = arp('ARP RISE', 4, 0, 1), aC = arp('ARP CHORDS', 8, 0, 0), aL = arp('ARP LOW', 4, 1, 0); [[4, aR], [8, aC], [16, aL], [20, aC]].forEach(([bar, b]) => p.pl(pl, bar, b));
  // FM-1 over MIDI: stabs for the synth to play
  const st = p.blk(fm, 4, 'FM STAB'); for (let bar = 0; bar < 4; bar++) { chords[bar].forEach(c => { p.n(fm, st, bar * 16 + 2, 1.5, c + 12, .8); p.n(fm, st, bar * 16 + 10, 1.5, c + 12, .7); }); }
  const tl = p.blk(fm, 2, 'FM TAIL'); chords[0].forEach(c => p.n(fm, tl, 0, 30, c, .6)); [[12, st], [24, st], [28, tl]].forEach(([bar, b]) => p.pl(fm, bar, b));
  p.L.push('loop 0 8 16'); p.L.push('m 0.43 0.45 0.5 0.6 0.4 0.52 0.58 0.3 0.12 0.58 0.33 0.8 0 0 0 0');
  fs.writeFileSync(__dirname + '/../app/src/main/assets/demo.smx', p.L.join('\n') + '\n'); }
