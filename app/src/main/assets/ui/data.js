// Stringer Max: names, sounds, kits and presets. Plain data, shared by both screens.
const SMD = (() => {
  const P = { VOL: 0, PAN: 1, CUT: 2, RES: 3, HPF: 4, DRIVE: 5, CRUSH: 6, SENDA: 7, SENDB: 8, DUCK: 9, EQLO: 10, EQMID: 11, EQHI: 12, TUNE: 13, SHIFT: 14,
    ATK: 16, DEC: 17, SUS: 18, REL: 19, DETUNE: 20, SUB: 21, FENV: 22, FDEC: 23, GLIDE: 24, SHAPE: 25, OCT: 26, ARP: 27, ARPRATE: 28, ARPOCT: 29, ARPMODE: 30, LFORATE: 31, LFOCUT: 32, VIB: 33,
    S_ATK: 16, S_REL: 19, S_START: 20, S_END: 21, S_MODE: 22, S_STRETCH: 23, S_BARS: 24, S_ROOT: 25, S_REV: 26, S_GAIN: 27, G_POS: 28, G_SIZE: 29, G_DENS: 30, G_SPRAY: 31, G_SPREAD: 32, G_SHATTER: 33, G_FREEZE: 34, RUMBLE: 16, RUMTONE: 17 };
  const M = { DTIME: 0, DFB: 1, DTONE: 2, RSIZE: 3, RDAMP: 4, LOW: 5, HIGH: 6, GLUE: 7, SAT: 8, WIDE: 9, LOUD: 10, VOL: 11 };
  const TYPES = ['DRUMS', 'SYNTH', 'SAMPLER', 'FM-1 / MIDI'];
  const ENGINES = ['SUPERSAW', 'BASS', 'CHIP', 'VOX'];
  const DRUMS = ['KICK', 'SNARE', 'CLAP', 'HAT', 'OPEN HAT', 'TOM', 'RIM', 'CRASH', 'RISER', 'SAMPLE', 'EMPTY'];
  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const SCALES = [['MAJOR', 0xAB5], ['MINOR', 0x5AD], ['PHRYGIAN', 0x5AB], ['DORIAN', 0x6AD], ['HARMONIC', 0x9AD], ['MIN PENTA', 0x4A9], ['MAJ PENTA', 0x295], ['ALL NOTES', 0xFFF]];
  const COLORS = ['#3df2ff', '#ff4fd8', '#b6ff3d', '#ffb23d', '#8f7bff', '#ff5a5a', '#3dffb0', '#ffe93d', '#5aa8ff', '#ff8fb8', '#c8ff9a', '#ffd08f', '#b9a8ff', '#ff9a9a', '#9affdc', '#fff29a'];
  const DELAYS = ['1/16', '1/8T', '1/8', '3/16', '1/4', '3/8', '1/2', '3/4'];
  const ARPRATES = ['1/8', '1/8.', '1/16', '1/16T', '1/32'], ARPMODES = ['UP', 'DOWN', 'UP-DOWN', 'RANDOM'], SMODES = ['ONE-SHOT', 'LOOP', 'SLICE', 'CLIP', 'GRAIN'];

  // what the knobs on the DEVICE page are, per kind of track: [param, label, optional list of named steps]
  const KNOBS = {
    synth: [[P.CUT, 'CUTOFF'], [P.RES, 'RESO'], [P.DETUNE, 'DETUNE'], [P.SHAPE, 'SHAPE'],
      [P.ATK, 'ATTACK'], [P.DEC, 'DECAY'], [P.SUS, 'SUSTAIN'], [P.REL, 'RELEASE'],
      [P.FENV, 'FILTER ENV'], [P.FDEC, 'ENV DECAY'], [P.SUB, 'SUB'], [P.GLIDE, 'GLIDE'],
      [P.LFORATE, 'LFO RATE'], [P.LFOCUT, 'LFO > CUT'], [P.VIB, 'VIBRATO'], [P.OCT, 'OCTAVE', ['-2', '-1', '0', '+1', '+2']],
      [P.ARP, 'ARP', ['OFF', 'ON']], [P.ARPRATE, 'ARP RATE', ARPRATES], [P.ARPOCT, 'ARP OCT', ['1', '2', '3']], [P.ARPMODE, 'ARP MODE', ARPMODES]],
    sampler: [[P.S_START, 'START'], [P.S_END, 'END'], [P.S_GAIN, 'GAIN'], [P.CUT, 'CUTOFF'], [P.RES, 'RESO'], [P.S_ROOT, 'ROOT NOTE'],
      [P.S_ATK, 'ATTACK'], [P.S_REL, 'RELEASE'], [P.S_BARS, 'FIT BARS', ['OFF', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16'], 16], [P.DRIVE, 'DRIVE'], [P.SENDA, 'DELAY'], [P.SENDB, 'REVERB']],
    grain: [[P.G_POS, 'POSITION'], [P.G_SIZE, 'SIZE'], [P.G_DENS, 'DENSITY'], [P.G_SPRAY, 'SPRAY'], [P.G_SPREAD, 'SPREAD'], [P.G_SHATTER, 'SHATTER'],
      [P.S_ATK, 'ATTACK'], [P.S_REL, 'RELEASE'], [P.CUT, 'CUTOFF'], [P.RES, 'RESO'], [P.S_GAIN, 'GAIN'], [P.S_ROOT, 'ROOT NOTE']],
    drum: [[P.RUMBLE, 'RUMBLE'], [P.RUMTONE, 'RUMBLE SIZE'], [P.DRIVE, 'DRIVE'], [P.CUT, 'CUTOFF']],
    fx: [[P.DRIVE, 'DRIVE'], [P.CRUSH, 'CRUSH'], [P.HPF, 'LOW CUT'], [P.CUT, 'HIGH CUT'],
      [P.SENDA, 'DELAY'], [P.SENDB, 'REVERB'], [P.DUCK, 'DUCK TO KICK'], [P.RES, 'RESO'],
      [P.EQLO, 'EQ LOW'], [P.EQMID, 'EQ MID'], [P.EQHI, 'EQ HIGH'], [P.TUNE, 'AUTO-TUNE'],
      [P.SHIFT, 'PITCH SHIFT'], [P.VOL, 'LEVEL'], [P.PAN, 'PAN']],
    master: [[M.LOUD, 'LOUDNESS'], [M.GLUE, 'GLUE'], [M.SAT, 'WARMTH'], [M.WIDE, 'WIDTH'], [M.LOW, 'LOW'], [M.HIGH, 'HIGH'], [M.VOL, 'OUTPUT'],
      [M.DTIME, 'DELAY TIME', DELAYS], [M.DFB, 'DELAY REPEAT'], [M.DTONE, 'DELAY TONE'], [M.RSIZE, 'REVERB SIZE'], [M.RDAMP, 'REVERB DARK']],
  };
  const AUTO = [[P.CUT, 'CUTOFF'], [P.VOL, 'LEVEL'], [P.RES, 'RESO'], [P.DRIVE, 'DRIVE'], [P.CRUSH, 'CRUSH'], [P.SENDA, 'DELAY'], [P.SENDB, 'REVERB'], [P.HPF, 'LOW CUT'], [P.PAN, 'PAN'], [P.SHIFT, 'PITCH'], [P.DETUNE, 'DETUNE'], [P.SHAPE, 'SHAPE']];

  const s = (name, eng, p) => ({ name, eng, p });
  const SOUNDS = [
    s('SUPERSAW LEAD', 0, { 2: .82, 3: .15, 16: .02, 17: .5, 18: .8, 19: .35, 20: .55, 21: .2, 22: .15, 23: .4, 25: .8, 26: .5, 7: .35, 8: .3 }),
    s('ANTHEM PLUCK', 0, { 2: .35, 3: .25, 16: 0, 17: .3, 18: 0, 19: .3, 20: .5, 21: .1, 22: .75, 23: .32, 25: .7, 26: .5, 7: .45, 8: .35 }),
    s('TRANCE PAD', 0, { 2: .6, 3: .1, 16: .5, 17: .6, 18: .85, 19: .6, 20: .6, 21: .25, 22: 0, 25: .9, 26: .5, 8: .45, 31: .25, 32: .15 }),
    s('RAVE STAB', 0, { 2: .7, 3: .3, 16: 0, 17: .28, 18: .2, 19: .2, 20: .7, 21: 0, 22: .4, 23: .25, 25: 1, 26: .5, 5: .25, 8: .25 }),
    s('HYPER LEAD', 0, { 2: .95, 3: .1, 16: 0, 17: .4, 18: .9, 19: .25, 20: .45, 21: 0, 22: 0, 25: .6, 26: .75, 24: .25, 5: .2, 7: .3, 33: .2, 31: .55 }),
    s('HARD HOOVER', 0, { 2: .6, 3: .35, 16: .05, 17: .5, 18: .9, 19: .3, 20: .95, 21: .5, 22: .3, 23: .5, 24: .35, 25: 1, 26: .25, 5: .45 }),
    s('REESE BASS', 0, { 2: .42, 3: .2, 16: .01, 17: .5, 18: 1, 19: .2, 20: .5, 21: .6, 22: .1, 25: .3, 26: .25, 5: .2 }),
    s('ROLLING BASS', 1, { 2: .5, 3: .25, 16: 0, 17: .25, 18: .5, 19: .12, 20: .1, 21: .4, 22: .35, 23: .2, 25: .5, 26: .5, 9: .8 }),
    s('OFFBEAT BASS', 1, { 2: .58, 3: .3, 16: 0, 17: .3, 18: .3, 19: .15, 20: .15, 21: .5, 22: .45, 23: .22, 25: .75, 26: .5, 9: .6 }),
    s('SUB 808', 1, { 2: .6, 3: .1, 16: 0, 17: .75, 18: .3, 19: .45, 20: .5, 21: 0, 22: 0, 24: .3, 25: 0, 26: .5 }),
    s('BLOWN 808', 1, { 2: .75, 3: .1, 16: 0, 17: .75, 18: .4, 19: .45, 20: .6, 21: 0, 22: 0, 24: .3, 25: .05, 26: .5, 5: .7, 12: .6 }),
    s('ACID LINE', 1, { 2: .3, 3: .8, 16: 0, 17: .3, 18: .1, 19: .1, 20: 0, 21: 0, 22: .7, 23: .22, 24: .25, 25: .5, 26: .5, 5: .3 }),
    s('GARAGE ORGAN', 1, { 2: .5, 3: .1, 16: 0, 17: .2, 18: .4, 19: .1, 20: .05, 21: .3, 22: .3, 23: .15, 25: 1, 26: .5 }),
    s('DONK', 1, { 2: .7, 3: .5, 16: 0, 17: .12, 18: 0, 19: .1, 20: .9, 21: 0, 22: .5, 23: .1, 25: .2, 26: .75 }),
    s('CHIP LEAD', 2, { 2: 1, 16: 0, 17: .3, 18: .8, 19: .12, 20: 0, 21: 0, 25: .3, 26: .75, 33: .25, 31: .6 }),
    s('CHIP ARP CHORD', 2, { 2: 1, 16: 0, 17: .3, 18: .8, 19: .1, 20: .45, 21: 0, 25: .1, 26: .75 }),
    s('CHIP BASS', 2, { 2: 1, 16: 0, 17: .25, 18: .6, 19: .08, 20: 0, 21: .5, 25: .9, 26: .25 }),
    s('GAME OVER', 2, { 2: .9, 16: 0, 17: .2, 18: .5, 19: .2, 20: .8, 21: .3, 25: .6, 26: .5, 6: .35, 7: .3 }),
    s('ROBOT SINGER', 3, { 16: .05, 17: .4, 18: .9, 19: .25, 20: 1, 21: .2, 25: .2, 26: .5, 33: .3, 31: .55, 8: .3 }),
    s('VOX AAH', 3, { 16: .2, 17: .5, 18: .9, 19: .4, 20: 0, 21: .3, 25: 0, 26: .5, 33: .25, 31: .5, 8: .45 }),
    s('VOX OOH', 3, { 16: .25, 17: .5, 18: .9, 19: .45, 20: 0, 21: .2, 25: .95, 26: .5, 33: .2, 31: .5, 8: .5 }),
    s('CYBER CHOIR', 3, { 16: .35, 17: .5, 18: 1, 19: .6, 20: 0, 21: .6, 25: .45, 26: .75, 33: .35, 31: .45, 8: .6, 7: .3 }),
  ];
  const pad = (type, tune, decay, level, tone, pan = .5) => ({ type, tune, decay, level, tone, pan, smp: -1 });
  const KITS = [
    { name: 'TRANCE', rumble: 0, pads: [pad(0, .45, .4, .9, .45), pad(1, .5, .4, .7, .6), pad(2, .5, .45, .75, .5), pad(3, .6, .25, .5, .7), pad(4, .6, .35, .5, .7), pad(8, .4, .22, .6, .7), pad(6, .5, .3, .6, .5), pad(7, .5, .6, .5, .6)] },
    { name: 'TECHNO', rumble: .55, pads: [pad(0, .3, .5, .95, .6), pad(1, .3, .25, .6, .8), pad(2, .4, .3, .7, .5), pad(3, .7, .15, .45, .9), pad(4, .5, .3, .55, .8), pad(5, .2, .4, .7, .5), pad(6, .7, .2, .55, .5), pad(7, .3, .5, .45, .4)] },
    { name: 'HARD', rumble: .7, pads: [pad(0, .4, .6, 1, 1), pad(1, .6, .2, .7, 1), pad(2, .6, .25, .8, .5), pad(3, .8, .1, .5, 1), pad(4, .7, .25, .55, 1), pad(8, .6, .1, .6, .9), pad(6, .9, .15, .6, .5), pad(7, .6, .4, .5, .8)] },
    { name: 'HOUSE', rumble: 0, pads: [pad(0, .5, .35, .9, .3), pad(1, .55, .35, .65, .5), pad(2, .45, .5, .8, .5), pad(3, .5, .3, .5, .5), pad(4, .5, .45, .55, .5), pad(5, .5, .4, .6, .5), pad(6, .4, .35, .6, .5), pad(7, .4, .6, .45, .5)] },
    { name: 'UK GARAGE', rumble: 0, pads: [pad(0, .55, .25, .9, .35), pad(1, .7, .2, .7, .7), pad(2, .6, .3, .7, .5), pad(3, .75, .15, .5, .6), pad(4, .65, .3, .5, .6), pad(5, .7, .25, .6, .5), pad(6, .8, .15, .65, .5), pad(7, .5, .5, .4, .5)] },
    { name: 'HYPERPOP', rumble: 0, pads: [pad(0, .6, .7, 1, .95), pad(1, .8, .25, .8, .9), pad(2, .8, .3, .8, .5), pad(3, .9, .1, .5, 1), pad(4, .8, .3, .5, 1), pad(8, .7, .1, .6, 1), pad(6, 1, .1, .6, .5), pad(7, .7, .5, .5, .9)] },
    { name: '8-BIT', rumble: 0, pads: [pad(5, .1, .2, .9, .5), pad(1, 1, .1, .7, 1), pad(6, .9, .1, .7, .5), pad(3, 1, .05, .5, 1), pad(4, 1, .2, .5, 1), pad(5, .6, .25, .7, .5), pad(6, .3, .2, .6, .5), pad(1, .2, .5, .6, 1)], crush: .55 },
  ];
  const mp = (name, loud, glue, sat, wide, low, high, target) => ({ name, target, m: { [M.LOUD]: loud, [M.GLUE]: glue, [M.SAT]: sat, [M.WIDE]: wide, [M.LOW]: low, [M.HIGH]: high } });
  const MASTERS = [mp('RAW', .17, 0, 0, .5, .5, .5, -14), mp('CLEAN TRANCE', .38, .3, .12, .58, .52, .58, -10), mp('LOUD TECHNO', .5, .45, .3, .5, .58, .52, -8), mp('WARM HOUSE', .36, .4, .35, .52, .58, .46, -10),
    mp('HYPERPOP SMASH', .62, .6, .5, .6, .55, .62, -6), mp('STREAMING SAFE', .28, .25, .1, .5, .5, .52, -14), mp('CLUB SYSTEM', .46, .4, .2, .44, .62, .5, -8)];
  const vp = (name, p) => ({ name, p });
  const VOCALS = [vp('DRY', { 13: 0, 14: .5, 5: 0, 6: 0, 4: 0, 7: 0, 8: .1, 12: .5 }), vp('CLEAN TUNE', { 13: .55, 14: .5, 4: .2, 8: .25, 12: .58 }), vp('HARD TUNE', { 13: 1, 14: .5, 4: .22, 7: .2, 8: .3, 12: .62 }),
    vp('GLASS ANGEL', { 13: 1, 14: .5 + 5 / 24, 4: .3, 7: .4, 8: .6, 12: .7 }), vp('HELIUM POP', { 13: 1, 14: .5 + 7 / 24, 4: .28, 5: .15, 7: .25, 8: .3, 12: .68 }), vp('BLOWN CLUB', { 13: .9, 14: .5, 4: .25, 5: .6, 6: .25, 8: .35, 11: .6 }),
    vp('DEEP DEMON', { 13: .8, 14: .5 - 5 / 24, 5: .3, 8: .4, 10: .6 }), vp('TINY RADIO', { 13: .4, 14: .5, 4: .45, 2: .7, 5: .45, 6: .3, 8: .1 }), vp('CHIP VOICE', { 13: 1, 14: .5, 6: .6, 4: .25, 7: .3, 8: .2 })];
  return { P, M, TYPES, ENGINES, DRUMS, NOTES, SCALES, COLORS, DELAYS, KNOBS, AUTO, SOUNDS, KITS, MASTERS, VOCALS, SMODES };
})();
if (typeof module !== 'undefined') module.exports = SMD;
