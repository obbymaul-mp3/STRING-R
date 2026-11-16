// Writes the two starting projects from the preset data: assets/demo.smx (a finished trance sketch) and assets/blank.smx (an empty four-track song).
const D = require('../app/src/main/assets/ui/data.js'), fs = require('fs');
const T = 24;
function proj(title, bpm) {
  const L = ['smx 1', `title "${title}"`, `bpm ${bpm}`, 'key 9 1']; let nt = 0;
  const kit = (t, k) => { D.KITS[k].pads.forEach((p, i) => L.push(`pad ${t} ${i} ${p.type} ${p.tune} ${p.decay} ${p.level} ${p.pan} ${p.tone} -1`)); L.push(`p ${t} 16 ${D.KITS[k].rumble}`); };
  const sound = (t, name, extra = {}) => { const s = D.SOUNDS.find(x => x.name === name); L.push(`trk eng ${t} ${s.eng}`); for (const [k, v] of Object.entries({ ...s.p, ...extra })) L.push(`p ${t} ${k} ${v}`); L.push(`trk name ${t} "${name}"`); };
  return { L, add: (type) => { L.push(`trk add ${type}`); return nt++; }, kit, sound, n: (p, t, step, len, pitch, vel = 0.8) => L.push(`n ${p} ${t} ${Math.round(step * T)} ${Math.round(len * T)} ${pitch} ${vel}`) };
}
// ---- blank
{ const p = proj('NEW SONG', 138); const d = p.add(0); p.kit(d, 0); const b = p.add(1); p.sound(b, 'ROLLING BASS'); const l = p.add(1); p.sound(l, 'SUPERSAW LEAD'); const m = p.add(3); p.L.push(`trk name ${m} "FM-1"`); p.L.push('song 0');
  fs.writeFileSync(__dirname + '/../app/src/main/assets/blank.smx', p.L.join('\n') + '\n'); }
// ---- demo: A minor, 138 bpm. Am F C G.
{ const p = proj('FIRST LIGHT', 138); const dr = p.add(0); p.kit(dr, 0); const bs = p.add(1); p.sound(bs, 'ROLLING BASS', { 0: .68 }); const ld = p.add(1); p.sound(ld, 'SUPERSAW LEAD', { 9: .35, 0: .8 });
  const pl = p.add(1); p.sound(pl, 'ANTHEM PLUCK', { 27: 1, 28: .5, 29: .5, 30: 0, 9: .5, 0: .8 }); const pd = p.add(1); p.sound(pd, 'TRANCE PAD', { 9: .6, 0: .6 }); const fm = p.add(3); p.L.push(`trk name ${fm} "FM-1"`);
  const roots = [33, 29, 36, 31], chords = [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]];
  const mel = [[[0, 3, 76], [3, 3, 76], [6, 2, 74], [8, 4, 72], [12, 2, 74], [14, 2, 76]], [[0, 3, 72], [3, 3, 72], [6, 2, 69], [8, 4, 77], [12, 4, 76]], [[0, 3, 76], [3, 3, 79], [6, 2, 76], [8, 4, 72], [12, 2, 74], [14, 2, 76]], [[0, 6, 74], [6, 2, 71], [8, 4, 74], [12, 4, 79]]];
  for (let P = 0; P < 4; P++) { p.L.push(`pb ${P} 4`);
    for (let bar = 0; bar < 4; bar++) { const o = bar * 16;
      if (P !== 3) for (let s = 0; s < 16; s++) { if (s % 4 === 0) p.n(P, dr, o + s, 1, 0, 1); else p.n(P, bs, o + s, .8, roots[bar], s % 4 === 2 ? .9 : .7); if (s % 4 === 2) p.n(P, dr, o + s, 1, 4, .8); else if (P > 0 && s % 2 === 1) p.n(P, dr, o + s, 1, 3, .5); }
      if (P >= 1 && P !== 3) { p.n(P, dr, o + 4, 1, 2, .85); p.n(P, dr, o + 12, 1, 2, .85); }
      if (P >= 1) chords[bar].forEach(c => p.n(P, pl, o, 16, c, .75));
      if (P >= 2) chords[bar].forEach(c => p.n(P, pd, o, 16, c, .6));
      if (P >= 2) mel[bar].forEach(([s, l, n]) => p.n(P, ld, o + s, l - .15, n, .85));
    }
    if (P === 1) { p.n(P, dr, 32, 32, 5, .8); for (let s = 48; s < 64; s += (s < 56 ? 2 : 1)) p.n(P, dr, s, 1, 1, .4 + (s - 48) / 30); const cut = []; for (let s = 0; s < 64; s++) cut.push((0.25 + 0.55 * s / 63).toFixed(3)); p.L.push(`au ${P} ${pl} 2 ${cut.join(' ')}`); }
    if (P === 2) p.n(P, dr, 0, 4, 7, .7);
    if (P === 0) { const cut = []; for (let s = 0; s < 64; s++) cut.push((0.3 + 0.2 * s / 63).toFixed(3)); p.L.push(`au ${P} ${bs} 2 ${cut.join(' ')}`); }
  }
  p.L.push('song 0 1 2 2 3 1 2 2'); p.L.push('m 0.43 0.45 0.5 0.6 0.4 0.52 0.58 0.3 0.12 0.58 0.33 0.8 0 0 0 0');
  fs.writeFileSync(__dirname + '/../app/src/main/assets/demo.smx', p.L.join('\n') + '\n'); }
