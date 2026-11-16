// Stringer Max: the whole workstation. Tracks, patterns, the song, the mixer, the master, and the text commands that drive it.
#pragma once
#include <array>
#include <cstdio>
#include <map>
#include <mutex>
#include <sstream>
#include "sm_voices.h"

namespace sm {
constexpr int MAXT = 16, NPAT = 32, NP = 36, CH = 32, TPS = 24, MAXSTEPS = 128, NM = 16;
enum { VOL, PAN, CUT, RES, HPF, DRIVE, CRUSH, SENDA, SENDB, DUCK, EQLO, EQMID, EQHI, TUNE, SHIFT, WIDTH, I0 };
enum { T_DRUM, T_SYNTH, T_SAMPLER, T_MIDI };
enum { M_DTIME, M_DFB, M_DTONE, M_RSIZE, M_RDAMP, M_LOW, M_HIGH, M_GLUE, M_SAT, M_WIDE, M_LOUD, M_VOL };
static const int SCALES[8] = {0xAB5, 0x5AD, 0x5AB, 0x6AD, 0x9AD, 0x4A9, 0x295, 0xFFF};   // major, minor, phrygian, dorian, harmonic minor, minor pentatonic, major pentatonic, chromatic

struct Note { int start, len, pitch; float vel; };
struct Lane { int param; std::vector<float> v; };
struct Clip { std::vector<Note> notes; std::vector<Lane> lanes; };
struct Pattern { int bars = 1; Clip clips[MAXT]; int len() const { return bars * 16 * TPS; } };

// one channel of the mixer: tuning, drive, crush, filters, EQ, level, pan
struct Strip {
  SVF lpL, lpR, hpL, hpR; Biquad eq[3][2]; float eqv[3] = {-1, -1, -1}; Tuner tun; bool tunOn = false; float crPh = 0, crL = 0, crR = 0, gL = 0, gR = 0; std::atomic<float> peak{0};
  void process(float* l, float* r, int n, const float* P, float sr, float duckEnv, int keyMask, bool skipLP) {
    const float sh = std::round((P[SHIFT] - 0.5f) * 24);
    if (P[TUNE] > 0.01f || sh != 0) { if (!tunOn) { tun.init(sr); tunOn = true; } tun.run(l, r, n, P[TUNE], sh, keyMask); } else tunOn = false;
    if (P[DRIVE] > 0.005f) { const float d = P[DRIVE], g = 1 + d * d * 24, mk = 1 / (1 + d * 1.2f); for (int i = 0; i < n; i++) { l[i] = fastTanh(l[i] * g) * mk; r[i] = fastTanh(r[i] * g) * mk; } }
    if (P[CRUSH] > 0.005f) { const float c = P[CRUSH], step = 1 / (1 + c * c * 40), lv = std::pow(2.f, 15 - c * 12);
      for (int i = 0; i < n; i++) { crPh += step; if (crPh >= 1) { crPh -= 1; crL = std::round(l[i] * lv) / lv; crR = std::round(r[i] * lv) / lv; } l[i] = crL; r[i] = crR; } }
    if (P[HPF] > 0.01f) { hpL.set(cutHz(P[HPF] * 0.78f), 0.75f, sr); hpR.a1 = hpL.a1; hpR.a2 = hpL.a2; hpR.a3 = hpL.a3; hpR.k = hpL.k; for (int i = 0; i < n; i++) { l[i] = hpL.hp(l[i]); r[i] = hpR.hp(r[i]); } }
    if (!skipLP && P[CUT] < 0.995f) { lpL.set(cutHz(P[CUT]), 0.5f + P[RES] * 8, sr); lpR.a1 = lpL.a1; lpR.a2 = lpL.a2; lpR.a3 = lpL.a3; lpR.k = lpL.k; for (int i = 0; i < n; i++) { l[i] = lpL.lp(l[i]); r[i] = lpR.lp(r[i]); } }
    for (int b = 0; b < 3; b++) { const float v = P[EQLO + b];
      if (v != eqv[b]) { eqv[b] = v; const float db = (v - 0.5f) * 24; for (int c = 0; c < 2; c++) { if (b == 0) eq[b][c].lowShelf(180, db, sr); else if (b == 1) eq[b][c].peak(1200, db, 0.9f, sr); else eq[b][c].highShelf(6000, db, sr); } }
      if (std::fabs(v - 0.5f) > 0.01f) for (int i = 0; i < n; i++) { l[i] = eq[b][0].run(l[i]); r[i] = eq[b][1].run(r[i]); } }
    const float vol = P[VOL] * P[VOL] * 1.0f * (1 - P[DUCK] * duckEnv), tl = vol * 1.4142f * std::cos(P[PAN] * PI / 2), tr = vol * 1.4142f * std::sin(P[PAN] * PI / 2); float pk = 0;
    for (int i = 0; i < n; i++) { gL += (tl - gL) * 0.01f; gR += (tr - gR) * 0.01f; l[i] *= gL; r[i] *= gR; pk = std::max(pk, std::max(std::fabs(l[i]), std::fabs(r[i]))); }
    peak.store(std::max(pk, peak.load(std::memory_order_relaxed)), std::memory_order_relaxed);
  }
};

struct Track {
  int type = T_SYNTH, eng = 0, smp = -1, midiCh = 0; std::string name = "TRACK"; bool mute = false, solo = false; float P[NP], Pe[NP]; Pad pads[8];
  Strip strip; SynthVoice sv[8]; DrumVoice dv[8]; SampVoice pv[8]; uint32_t order = 0; float lfo = 0, kickEnv = 0, lastHz = 0; int vowelSeq = 0, arpIdx = 0;
  std::unique_ptr<Reverb> rum; SVF rumLp; struct MN { int pitch, left; }; std::vector<MN> mnotes; std::vector<int> held;
  Track() { defaults(); }
  void defaults() { for (int i = 0; i < NP; i++) P[i] = 0; P[VOL] = 0.75f; P[PAN] = 0.5f; P[CUT] = 1; P[RES] = 0.15f; P[EQLO] = P[EQMID] = P[EQHI] = 0.5f; P[SHIFT] = 0.5f; std::memcpy(Pe, P, sizeof P); }
  void silence() { for (auto& v : sv) v.on = false; for (auto& v : dv) v.on = false; for (auto& v : pv) { v.on = false; v.s.reset(); } }
};

struct Engine {
  float sr = 48000; std::mutex mx; std::atomic<bool> offline{false}; std::atomic<int> version{1}, edits{0};
  std::unique_ptr<Track> trk[MAXT]; int nT = 0; Pattern pat[NPAT]; std::vector<int> song; std::string title = "UNTITLED";
  float bpm = 140, swing = 0, M[NM], perf[4] = {0.5f, 0, 0, 0}; int keyRoot = 9, scale = 1, curPat = 0, songPos = 0; double tick = 0; bool playing = false, songMode = false, recOn = false, loopSong = true, metro = false, ended = false, oneShot = false;
  std::map<std::string, int> sel; std::vector<std::shared_ptr<Sample>> smp;
  // live input
  float inP[NP]; Strip inStrip; bool inMon = false; std::vector<float> recL, recR; size_t recN = 0; std::atomic<bool> recAudio{false}; int recTick = 0, recPat = 0; std::atomic<float> inPeak{0};
  // buses and master
  Delay delay; Reverb reverb; Biquad mLow[2], mHigh[2]; float mEqV[2] = {-9, -9}; Limiter lim; Loudness loud; float glueEnv = 0, duckEnv = 0; SVF pfL, pfR, phL, phR; std::atomic<float> glueGr{0}, outPk[2];
  std::vector<float> pbL, pbR; int pbW = 0; double pbR_ = 0, tapeRate = 1; int stutLen = 0, stutPos = 0, stutStart = 0; bool stutOn = false, halfOn = false, tapeOn = false; float perfMix = 0; int metroLeft = 0; float metroPh = 0, metroHz = 1000;
  // reference track
  int refId = -1; bool refOn = false; double refPos = 0; float refGain = 1;
  // preview (auditioning a file before loading it)
  std::shared_ptr<Sample> pre; double prePos = 0; bool preOn = false;
  // midi out, undo, live recording
  uint32_t mq[512]; std::atomic<int> mqW{0}, mqR{0}; std::vector<std::string> undoS, redoS;
  struct Pend { int t, pitch, start; float vel; }; std::vector<Pend> pend; std::vector<std::array<int, 3>> suppress; std::atomic<float> cpu{0};

  explicit Engine(float rate) : sr(rate) { delay.init(sr); reverb.init(sr); lim.init(sr); loud.init(sr); pbL.assign(size_t(sr * 4), 0); pbR = pbL; outPk[0] = 0; outPk[1] = 0; resetProject(); }

  // ---------------------------------------------------------------- the project
  void resetProject() {
    for (auto& t : trk) t.reset(); nT = 0; for (auto& p : pat) p = Pattern(); song.clear(); bpm = 140; swing = 0; keyRoot = 9; scale = 1; curPat = 0; songPos = 0; tick = 0; playing = false; songMode = false; title = "UNTITLED";
    const float m[NM] = {0.4f, 0.45f, 0.5f, 0.6f, 0.4f, 0.5f, 0.5f, 0.3f, 0.15f, 0.5f, 0.35f, 0.8f}; for (int i = 0; i < NM; i++) M[i] = i < 12 ? m[i] : 0;
    Track d; std::memcpy(inP, d.P, sizeof inP); inP[SENDB] = 0.15f; pend.clear(); suppress.clear();
  }
  int addTrack(int type) {
    if (nT >= MAXT) return -1; trk[nT].reset(new Track()); Track& T = *trk[nT]; T.type = type; float* P = T.P;
    static const char* nm[4] = {"DRUMS", "SYNTH", "SAMPLER", "FM-1"}; T.name = nm[type & 3];
    if (type == T_DRUM) { const int ty[8] = {D_KICK, D_SNARE, D_CLAP, D_CHAT, D_OHAT, D_TOM, D_RIM, D_CRASH}; for (int i = 0; i < 8; i++) { T.pads[i] = Pad(); T.pads[i].type = ty[i]; } T.pads[3].level = 0.55f; T.pads[4].level = 0.5f; T.pads[7].level = 0.5f; P[I0] = 0; P[I0 + 1] = 0.5f; }
    if (type == T_SYNTH) { P[I0] = 0.02f; P[I0 + 1] = 0.45f; P[I0 + 2] = 0.7f; P[I0 + 3] = 0.3f; P[I0 + 4] = 0.45f; P[I0 + 5] = 0.3f; P[I0 + 6] = 0.3f; P[I0 + 7] = 0.4f; P[I0 + 9] = 0.6f; P[I0 + 10] = 0.5f; P[I0 + 12] = 0.5f; P[I0 + 15] = 0.4f; P[CUT] = 0.8f; }
    if (type == T_SAMPLER) { P[I0] = 0; P[I0 + 3] = 0.1f; P[I0 + 4] = 0; P[I0 + 5] = 1; P[I0 + 9] = 60 / 127.f; P[I0 + 11] = 0.5f; }
    std::memcpy(T.Pe, P, sizeof T.P); return nT++;
  }
  void delTrack(int t) {
    if (t < 0 || t >= nT) return; allOff();
    for (int i = t; i < nT - 1; i++) trk[i] = std::move(trk[i + 1]); trk[nT - 1].reset(); nT--;
    for (auto& p : pat) { for (int i = t; i < MAXT - 1; i++) p.clips[i] = std::move(p.clips[i + 1]); p.clips[MAXT - 1] = Clip(); }
  }
  int addSample(std::shared_ptr<Sample> s, int id = -1) { if (id < 0) { id = int(smp.size()); smp.push_back(nullptr); } if (id >= int(smp.size())) smp.resize(id + 1); smp[id] = std::move(s); version++; return id; }
  std::shared_ptr<Sample> getSmp(int id) { return id >= 0 && id < int(smp.size()) ? smp[id] : nullptr; }
  int keyMask() const { const int m = SCALES[scale & 7]; int o = 0; for (int i = 0; i < 12; i++) if (m & (1 << i)) o |= 1 << ((i + keyRoot) % 12); return o; }
  float* params(int t) { return t == MAXT ? inP : (t >= 0 && t < nT ? trk[t]->P : nullptr); }

  // ---------------------------------------------------------------- notes on and off
  void midiOut(int st, int a, int b) { const int w = mqW.load(); mq[w & 511] = uint32_t(st) | (uint32_t(a) << 8) | (uint32_t(b) << 16); mqW.store(w + 1); }
  void noteOn(int t, int pitch, float vel, int gate) {
    if (t < 0 || t >= nT || pitch < 0 || pitch > 127) return; Track& T = *trk[t]; const float* P = T.Pe;
    if (T.type == T_DRUM) { const int pd = pitch < 8 ? pitch : ((pitch - 36) % 8 + 8) % 8; const Pad& p = T.pads[pd]; auto s = p.type == D_SAMPLE ? getSmp(p.smp) : nullptr;
      if (p.type == D_CHAT) for (auto& v : T.dv) if (v.type == D_OHAT) v.on = false;
      T.dv[pd].trig(p, vel, sr, s.get()); if (p.type == D_KICK) { duckEnv = 1; T.kickEnv = 1; } return; }
    if (T.type == T_MIDI) { for (auto& m : T.mnotes) if (m.pitch == pitch) { midiOut(0x80 | T.midiCh, pitch, 0); m.left = -2; } T.mnotes.erase(std::remove_if(T.mnotes.begin(), T.mnotes.end(), [](const Track::MN& m) { return m.left == -2; }), T.mnotes.end());
      midiOut(0x90 | T.midiCh, pitch, std::max(1, int(vel * 127))); T.mnotes.push_back({pitch, gate}); return; }
    if (T.type == T_SYNTH) {
      SynthVoice* v = nullptr; for (auto& x : T.sv) if (x.on && x.pitch == pitch) { v = &x; break; } if (!v) for (auto& x : T.sv) if (!x.on) { v = &x; break; }
      if (!v) { v = &T.sv[0]; for (auto& x : T.sv) if (x.order < v->order) v = &x; }
      const int oct = int(std::lround((P[I0 + 10] - 0.5f) * 4)); const float hz = noteHz(float(pitch + oct * 12)); const bool was = v->on;
      v->on = true; v->pitch = pitch; v->vel = vel; v->gate = gate; v->stage = 1; v->fenv = 1; v->age = 0; v->order = ++T.order; v->tfreq = hz; v->freq = (P[I0 + 8] > 0.01f && T.lastHz > 0) ? T.lastHz : hz; T.lastHz = hz; v->vowel = T.vowelSeq++ % 5;
      if (!was) { v->aenv = 0; for (int k = 0; k < 7; k++) v->ph[k] = T.eng == 0 ? (k * 0.137 + 0.11 * (T.order % 7)) - std::floor(k * 0.137 + 0.11 * (T.order % 7)) : 0; v->sub = 0; v->fl.reset(); v->fr.reset(); for (auto& f : v->fm) f.reset(); }
      return; }
    auto s = getSmp(T.smp); if (!s || s->n() < 4) return;
    SampVoice* v = nullptr; for (auto& x : T.pv) if (x.on && x.pitch == pitch) { v = &x; break; } if (!v) for (auto& x : T.pv) if (!x.on) { v = &x; break; }
    if (!v) { v = &T.pv[0]; for (auto& x : T.pv) if (x.order < v->order) v = &x; }
    const int N = s->n(), mode = int(std::lround(P[I0 + 6] * 3)), root = int(std::lround(P[I0 + 9] * 127)), bars = int(std::lround(P[I0 + 8] * 16)); double a = clampf(P[I0 + 4], 0, 1) * N, b = clampf(P[I0 + 5], 0, 1) * N; if (b < a + 16) b = std::min<double>(N, a + 16);
    double rate = s->rate / sr; if (mode == 2) { const int k = ((pitch - 60) % 16 + 16) % 16; const double w = (b - a) / 16; a += k * w; b = a + w; } else rate *= std::pow(2.0, (pitch - root) / 12.0);
    v->on = true; v->s = s; v->pitch = pitch; v->vel = vel; v->gate = gate; v->stage = 1; v->aenv = P[I0] < 0.005f ? 1 : 0; v->order = ++T.order; v->start = a; v->end = b - 1; v->rate = rate; v->rev = P[I0 + 10] > 0.5f; v->loop = mode == 1; v->oneshot = mode == 0;
    v->stretch = P[I0 + 7] > 0.5f; v->adv = bars > 0 ? (b - a) / (bars * 16.0 * TPS * tickSamples()) : s->rate / sr; v->pos = v->rev ? v->end : a; v->gb[0] = v->gb[1] = v->pos; v->gp[0] = 0; v->gp[1] = 0.5f;
  }
  void noteOff(int t, int pitch) {
    if (t < 0 || t >= nT) return; Track& T = *trk[t];
    if (T.type == T_SYNTH) { for (auto& v : T.sv) if (v.on && v.pitch == pitch && v.gate < 0) v.stage = 4; }
    else if (T.type == T_SAMPLER) { for (auto& v : T.pv) if (v.on && v.pitch == pitch && v.gate < 0 && !v.oneshot) v.stage = 4; }
    else if (T.type == T_MIDI) { for (auto& m : T.mnotes) if (m.pitch == pitch && m.left < 0) { midiOut(0x80 | T.midiCh, pitch, 0); m.left = -2; } T.mnotes.erase(std::remove_if(T.mnotes.begin(), T.mnotes.end(), [](const Track::MN& m) { return m.left == -2; }), T.mnotes.end()); }
  }
  void allOff() { for (int t = 0; t < nT; t++) { Track& T = *trk[t]; for (auto& v : T.sv) if (v.on) v.stage = 4; for (auto& v : T.pv) if (v.on) v.stage = 4; for (auto& m : T.mnotes) midiOut(0x80 | T.midiCh, m.pitch, 0); T.mnotes.clear(); T.held.clear(); } pend.clear(); }
  double tickSamples() const { return sr * 60.0 / (bpm * 96.0); }

  // ---------------------------------------------------------------- the sequencer
  void seqRange(double a, double b) {
    Pattern& p = pat[curPat]; const double ts = tickSamples(); const int plen = p.len();
    if (metro) for (int q = int(std::ceil(a / 96)); q * 96 < b; q++) { metroLeft = int(sr * 0.03f); metroHz = (q % 4 == 0) ? 1600.f : 1000.f; }
    for (int t = 0; t < nT; t++) {
      Track& T = *trk[t]; Clip& c = p.clips[t]; if (c.notes.empty()) continue;
      if (T.type == T_SYNTH && T.Pe[I0 + 11] > 0.5f) {   // arpeggiator: the notes in the pattern are the held chord
        static const int div[5] = {48, 36, 24, 16, 12}; const int st = div[std::min(4, int(T.Pe[I0 + 12] * 4.99f))], octs = 1 + int(T.Pe[I0 + 13] * 2.99f), mode = int(T.Pe[I0 + 14] * 3.99f);
        for (int q = int(std::ceil(a / st)); q * st < b; q++) { const int bt = q * st; int hp[16], hn = 0; float hv = 0.8f;
          for (auto& n : c.notes) if (n.start <= bt && bt < n.start + n.len && hn < 16) { hp[hn++] = n.pitch; hv = n.vel; }
          if (!hn) { T.arpIdx = 0; continue; } std::sort(hp, hp + hn); const int total = hn * octs; int k = T.arpIdx++ % (mode == 2 ? std::max(1, total * 2 - 2) : total);
          if (mode == 1) k = total - 1 - k; else if (mode == 2) { if (k >= total) k = 2 * total - 2 - k; } else if (mode == 3) k = int(T.dv[0].rng.uni() * total) % total;
          noteOn(t, hp[k % hn] + 12 * (k / hn), hv, std::max(64, int(st * 0.8 * ts))); }
        continue; }
      for (auto& n : c.notes) { double s = n.start; if (swing > 0 && n.start % TPS == 0 && (n.start / TPS) % 2 == 1) s += swing * 12;
        if (s >= plen) s = plen - 1; if (s >= a && s < b) { bool skip = false; for (size_t i = 0; i < suppress.size(); i++) if (suppress[i][0] == t && suppress[i][1] == n.pitch && suppress[i][2] == n.start) { suppress.erase(suppress.begin() + i); skip = true; break; }
          if (!skip) noteOn(t, n.pitch, n.vel, std::max(64, int(n.len * ts))); } }
    }
  }
  void advance(int n) {
    if (!playing) return; const double dt = n / tickSamples(); double a = tick, b = tick + dt; int plen = pat[curPat].len();
    if (b < plen) { seqRange(a, b); tick = b; return; }
    seqRange(a, plen); b -= plen;
    if (songMode && !song.empty()) { songPos++; if (songPos >= int(song.size())) { if (!loopSong) { playing = false; ended = true; allOff(); return; } songPos = 0; } curPat = song[songPos]; version++; }
    else if (oneShot) { playing = false; ended = true; allOff(); return; }
    seqRange(0, b); tick = b;
  }
  void applyAuto() {
    const int step = int(tick / TPS); const Pattern& p = pat[curPat];
    for (int t = 0; t < nT; t++) { Track& T = *trk[t]; std::memcpy(T.Pe, T.P, sizeof T.P); if (!playing) continue; for (auto& l : p.clips[t].lanes) if (step < int(l.v.size()) && l.v[step] >= 0 && l.param >= 0 && l.param < NP) T.Pe[l.param] = l.v[step]; }
  }

  // ---------------------------------------------------------------- rendering each kind of track
  void renderDrum(Track& T, float* l, float* r, int n) {
    float kick[CH]; std::memset(kick, 0, sizeof(float) * n); bool anyKick = false;
    for (int pd = 0; pd < 8; pd++) { DrumVoice& v = T.dv[pd]; if (!v.on) continue; const Pad& p = T.pads[pd]; const float g = p.level * p.level * 1.25f, gl = g * 1.4142f * std::cos(p.pan * PI / 2), gr = g * 1.4142f * std::sin(p.pan * PI / 2);
      for (int i = 0; i < n && v.on; i++) { float a = 0, b = 0; v.tick(a, b); l[i] += a * gl; r[i] += b * gr; if (v.type == D_KICK) { kick[i] += a * g; anyKick = true; } } }
    const float amt = T.Pe[I0];
    if (amt > 0.01f) {   // rumble: the kick's tail through a small dark room, pushed down while the kick itself hits
      if (!T.rum) { T.rum.reset(new Reverb()); T.rum->init(sr, 0.7f); } float rl[CH], rr[CH]; T.rum->run(kick, kick, rl, rr, n, 0.35f + T.Pe[I0 + 1] * 0.5f, 0.6f); T.rumLp.set(70 + T.Pe[I0 + 1] * 60, 0.8f, sr);
      const float kd = std::exp(-1 / (sr * 0.11f)); for (int i = 0; i < n; i++) { T.kickEnv *= kd; const float x = fastTanh(T.rumLp.lp(rl[i] + rr[i]) * 9) * amt * 0.9f * (1 - T.kickEnv) * (1 - T.kickEnv); l[i] += x; r[i] += x; } }
    (void)anyKick;
  }
  void renderSynth(Track& T, float* l, float* r, int n) {
    const float* P = T.Pe; const int eng = T.eng; auto sq = [](float x) { return x * x; };
    const float ka = 1 / ((0.001f + sq(P[I0]) * 2) * sr), kd = 1 - std::exp(-1 / ((0.01f + sq(P[I0 + 1]) * 3) * sr)), sus = P[I0 + 2], kr = 1 - std::exp(-1 / ((0.005f + sq(P[I0 + 3]) * 4) * sr));
    const float kf = 1 - std::exp(-1 / ((0.01f + sq(P[I0 + 7]) * 3) * sr)), glide = P[I0 + 8] > 0.01f ? 1 - std::exp(-1 / ((0.005f + sq(P[I0 + 8]) * 0.5f) * sr)) : 1;
    T.lfo += n * (0.1f + sq(P[I0 + 15]) * 20) / sr * 2 * PI; if (T.lfo > 2 * PI) T.lfo -= 2 * PI; const float lfo = std::sin(T.lfo), vib = 1 + P[I0 + 17] * 0.06f * lfo;
    const float det = P[I0 + 4], subL = P[I0 + 5], shape = P[I0 + 9]; static const float off[7] = {0, -0.33f, 0.33f, -0.66f, 0.66f, -1, 1};
    static const float FT[5][3] = {{800, 1150, 2900}, {400, 1700, 2600}, {280, 2250, 2900}, {450, 800, 2830}, {325, 700, 2530}};
    for (auto& v : T.sv) { if (!v.on) continue;
      const float cv = clampf(P[CUT] * (1 - P[I0 + 6] * 0.6f) + P[I0 + 6] * 0.75f * v.fenv + P[I0 + 16] * 0.35f * lfo, 0.02f, 1);
      v.fl.set(cutHz(cv), 0.5f + P[RES] * 9, sr); v.fr.a1 = v.fl.a1; v.fr.a2 = v.fl.a2; v.fr.a3 = v.fl.a3; v.fr.k = v.fl.k;
      if (eng == 3) { float x = det > 0.5f ? float(v.vowel) : shape * 3.999f; const int i0 = std::min(4, int(x)), i1 = std::min(4, i0 + 1); const float f = x - i0; for (int k = 0; k < 3; k++) v.fm[k].set(FT[i0][k] + (FT[i1][k] - FT[i0][k]) * f, 9, sr); }
      for (int i = 0; i < n; i++) {
        v.freq += (v.tfreq - v.freq) * glide; v.age += 1; if (v.gate > 0 && --v.gate == 0) v.stage = 4;
        if (v.stage == 1) { v.aenv += ka; if (v.aenv >= 1) { v.aenv = 1; v.stage = 2; } } else if (v.stage == 2) v.aenv += (sus - v.aenv) * kd; else if (v.stage == 4) { v.aenv -= v.aenv * kr + 1e-6f; if (v.aenv < 0.0004f) { v.on = false; break; } }
        v.fenv -= v.fenv * kf; float f = v.freq * vib, a = 0, b = 0; const double dt = f / sr;
        if (eng == 0) {   // supersaw: seven saws spread around the note
          for (int k = 0; k < 7; k++) { const double d = dt * (1 + off[k] * det * det * 0.045); v.ph[k] += d; if (v.ph[k] >= 1) v.ph[k] -= 1; const float s = float(2 * v.ph[k] - 1) - polyblep(v.ph[k], d), g = k == 0 ? 1 : 0.25f + shape * 0.75f; if (k == 0) { a += s * g * 0.7f; b += s * g * 0.7f; } else if (k & 1) { a += s * g; b += s * g * 0.25f; } else { a += s * g * 0.25f; b += s * g; } }
          v.sub += dt * 0.5; if (v.sub >= 1) v.sub -= 1; const float sb = std::sin(2 * PI * float(v.sub)) * subL * 1.5f; a = a * 0.3f + sb; b = b * 0.3f + sb;
        } else if (eng == 1) {   // bass: sine to saw to square, with a pitch punch at the start
          f *= 1 + det * 3 * std::exp(-v.age / (0.03f * sr)); const double d = f / sr; v.ph[0] += d; if (v.ph[0] >= 1) v.ph[0] -= 1; const float ph = float(v.ph[0]), sn = std::sin(2 * PI * ph), sw = (2 * ph - 1) - polyblep(v.ph[0], d);
          double p2 = v.ph[0] + 0.5; if (p2 >= 1) p2 -= 1; const float sqr = (ph < 0.5f ? 1.f : -1.f) + polyblep(v.ph[0], d) - polyblep(p2, d);
          a = shape < 0.5f ? sn + (sw - sn) * shape * 2 : sw + (sqr - sw) * (shape - 0.5f) * 2; v.sub += d * 0.5; if (v.sub >= 1) v.sub -= 1; a = a * 0.8f + std::sin(2 * PI * float(v.sub)) * subL * 1.2f; b = a;
        } else if (eng == 2) {   // chip: pulse waves and a stepped triangle, sixteen levels like an old console
          v.ph[0] += dt; if (v.ph[0] >= 1) v.ph[0] -= 1; const float ph = float(v.ph[0]);
          if (shape < 0.75f) { const float w = shape < 0.25f ? 0.125f : (shape < 0.5f ? 0.25f : 0.5f); a = ph < w ? 0.8f : -0.8f; } else { const float tr = ph < 0.5f ? ph * 4 - 1 : 3 - ph * 4; a = std::round(tr * 7.5f) / 7.5f; }
          if (det > 0.02f) { const float rate = 8 + det * 40, ar = std::fmod(v.age * rate / sr, 3.f); f = v.freq * (ar < 1 ? 1 : (ar < 2 ? 1.4983f : 2)); v.ph[0] += (f - v.freq * vib) / sr; if (v.ph[0] >= 1) v.ph[0] -= 1; }
          v.sub += dt * 0.5; if (v.sub >= 1) v.sub -= 1; a = a * 0.75f + (v.sub < 0.5 ? 0.6f : -0.6f) * subL; a = std::round(a * 8) / 8; b = a;
        } else {   // vox: a buzzing source through three mouth-shaped filters
          v.ph[0] += dt; if (v.ph[0] >= 1) v.ph[0] -= 1; const float src = (float(2 * v.ph[0] - 1) - polyblep(v.ph[0], dt)) + T.dv[0].rng.bi() * 0.04f * subL;
          a = v.fm[0].bp(src) * 1.0f + v.fm[1].bp(src) * 0.6f + v.fm[2].bp(src) * 0.35f; a *= 2.2f; b = a;
        }
        const float g = v.aenv * v.vel * 0.4f; if (eng == 3) { l[i] += a * g; r[i] += b * g; } else { l[i] += v.fl.lp(a) * g; r[i] += v.fr.lp(b) * g; }
      } }
  }
  void renderSampler(Track& T, float* l, float* r, int n) {
    const float* P = T.Pe; auto sq = [](float x) { return x * x; }; const float ka = 1 / ((0.0005f + sq(P[I0]) * 2) * sr), kr = 1 - std::exp(-1 / ((0.004f + sq(P[I0 + 3]) * 3) * sr)), gain = sq(P[I0 + 11] * 2), G = sr * 0.045f;
    for (auto& v : T.pv) { if (!v.on) continue; const Sample& s = *v.s; const float* L = s.L.data(); const float* R = s.R.data(); const int N = s.n();
      for (int i = 0; i < n; i++) {
        if (v.gate > 0 && --v.gate == 0 && !v.oneshot) v.stage = 4;
        if (v.stage == 1) { v.aenv += ka; if (v.aenv >= 1) { v.aenv = 1; v.stage = 3; } } else if (v.stage == 4) { v.aenv -= v.aenv * kr + 1e-6f; if (v.aenv < 0.0004f) { v.on = false; break; } }
        float a = 0, b = 0;
        if (!v.stretch) {
          if (v.pos < v.start || v.pos > v.end) { if (v.loop) v.pos = v.rev ? v.end : v.start; else { v.on = false; break; } }
          const int i0 = std::min(N - 2, std::max(0, int(v.pos))); const float f = float(v.pos - i0); a = L[i0] + (L[i0 + 1] - L[i0]) * f; b = R[i0] + (R[i0 + 1] - R[i0]) * f; v.pos += v.rev ? -v.rate : v.rate;
          const double left = v.rev ? v.pos - v.start : v.end - v.pos; if (!v.loop && left < 96) { const float e = float(std::max(0.0, left) / 96); a *= e; b *= e; }
        } else {   // time-stretch: two overlapping grains walk through the sound at the song's speed, each playing at the note's pitch
          if (v.pos > v.end) { if (v.loop) v.pos = v.start; else { v.on = false; break; } }
          for (int g = 0; g < 2; g++) { v.gp[g] += 1 / G; if (v.gp[g] >= 1) { v.gp[g] -= 1; v.gb[g] = v.pos; } const float w = 0.5f - 0.5f * std::cos(2 * PI * v.gp[g]); double sp = v.gb[g] + v.gp[g] * G * v.rate;
            if (sp > v.end) sp = v.end; const int i0 = std::min(N - 2, std::max(0, int(sp))); const float f = float(sp - i0); a += (L[i0] + (L[i0 + 1] - L[i0]) * f) * w; b += (R[i0] + (R[i0 + 1] - R[i0]) * f) * w; }
          v.pos += v.adv;
        }
        const float g = v.aenv * v.vel * gain; l[i] += a * g; r[i] += b * g;
      }
      if (!v.on) v.s.reset(); }
  }

  // ---------------------------------------------------------------- one block of sound
  void process(float* outL, float* outR, int frames, const float* inL, const float* inR) {
    int done = 0;
    while (done < frames) { const int n = std::min(CH, frames - done); chunk(outL + done, outR + done, n, inL ? inL + done : nullptr, inR ? inR + done : nullptr); done += n; }
  }
  void chunk(float* oL, float* oR, int n, const float* inL, const float* inR) {
    float mL[CH] = {0}, mR[CH] = {0}, aL[CH] = {0}, aR[CH] = {0}, bL[CH] = {0}, bR[CH] = {0}, tl[CH], tr[CH];
    advance(n); applyAuto(); duckEnv *= std::exp(-n / (sr * 60.f / bpm * 0.32f)); const int km = keyMask(); bool anySolo = false; for (int t = 0; t < nT; t++) anySolo |= trk[t]->solo;
    for (int t = 0; t < nT; t++) {
      Track& T = *trk[t]; if (T.type == T_MIDI) { for (auto& m : T.mnotes) if (m.left > 0) { m.left -= n; if (m.left <= 0) { midiOut(0x80 | T.midiCh, m.pitch, 0); m.left = -2; } } T.mnotes.erase(std::remove_if(T.mnotes.begin(), T.mnotes.end(), [](const Track::MN& m) { return m.left == -2; }), T.mnotes.end()); continue; }
      std::memset(tl, 0, sizeof(float) * n); std::memset(tr, 0, sizeof(float) * n);
      if (T.type == T_DRUM) renderDrum(T, tl, tr, n); else if (T.type == T_SYNTH) renderSynth(T, tl, tr, n); else renderSampler(T, tl, tr, n);
      T.strip.process(tl, tr, n, T.Pe, sr, duckEnv, km, T.type == T_SYNTH && T.eng != 3);
      if (T.mute || (anySolo && !T.solo)) continue;
      const float sa = T.Pe[SENDA] * T.Pe[SENDA], sb = T.Pe[SENDB] * T.Pe[SENDB];
      for (int i = 0; i < n; i++) { mL[i] += tl[i]; mR[i] += tr[i]; aL[i] += tl[i] * sa; aR[i] += tr[i] * sa; bL[i] += tl[i] * sb; bR[i] += tr[i] * sb; }
    }
    if (inL) {   // the live input: recorded dry, heard through its own channel
      float pk = 0; for (int i = 0; i < n; i++) { tl[i] = inL[i]; tr[i] = inR[i]; pk = std::max(pk, std::max(std::fabs(tl[i]), std::fabs(tr[i]))); } inPeak.store(std::max(pk, inPeak.load()));
      if (recAudio.load() && recN + n <= recL.size()) { std::memcpy(recL.data() + recN, tl, n * sizeof(float)); std::memcpy(recR.data() + recN, tr, n * sizeof(float)); recN += n; }
      if (inMon) { inStrip.process(tl, tr, n, inP, sr, duckEnv, km, false); const float sa = inP[SENDA] * inP[SENDA], sb = inP[SENDB] * inP[SENDB];
        for (int i = 0; i < n; i++) { mL[i] += tl[i]; mR[i] += tr[i]; aL[i] += tl[i] * sa; aR[i] += tr[i] * sa; bL[i] += tl[i] * sb; bR[i] += tr[i] * sb; } }
    }
    if (preOn && pre) { const int N = pre->n(); const double rt = pre->rate / sr; for (int i = 0; i < n; i++) { const int i0 = int(prePos); if (i0 >= N - 1) { preOn = false; break; } mL[i] += pre->L[i0] * 0.8f; mR[i] += pre->R[i0] * 0.8f; prePos += rt; } }
    static const float divs[8] = {0.25f, 1 / 3.f, 0.5f, 0.75f, 1, 1.5f, 2, 3};   // in beats
    delay.run(aL, aR, tl, tr, n, sr * 60 / bpm * divs[std::min(7, int(M[M_DTIME] * 7.99f))], M[M_DFB] * 0.92f, M[M_DTONE]); for (int i = 0; i < n; i++) { mL[i] += tl[i]; mR[i] += tr[i]; bL[i] += tl[i] * 0.2f; bR[i] += tr[i] * 0.2f; }
    reverb.run(bL, bR, tl, tr, n, M[M_RSIZE], M[M_RDAMP]); for (int i = 0; i < n; i++) { mL[i] += tl[i]; mR[i] += tr[i]; }
    if (metroLeft > 0) for (int i = 0; i < n && metroLeft > 0; i++, metroLeft--) { metroPh += metroHz / sr; const float s = std::sin(2 * PI * metroPh) * 0.25f * std::min(1.f, metroLeft / 200.f); mL[i] += s; mR[i] += s; }
    perform(mL, mR, n); master(mL, mR, n);
    if (refOn) { auto s = getSmp(refId); if (s && s->n() > 2) { const int N = s->n(); const double rt = s->rate / sr; for (int i = 0; i < n; i++) { if (refPos >= N - 1) refPos = 0; const int i0 = int(refPos); mL[i] = s->L[i0] * refGain; mR[i] = s->R[i0] * refGain; refPos += rt; } } }
    float p0 = 0, p1 = 0; for (int i = 0; i < n; i++) { oL[i] = mL[i]; oR[i] = mR[i]; p0 = std::max(p0, std::fabs(mL[i])); p1 = std::max(p1, std::fabs(mR[i])); }
    outPk[0].store(std::max(p0, outPk[0].load())); outPk[1].store(std::max(p1, outPk[1].load())); loud.run(oL, oR, n);
  }
  // hold-to-play effects over the whole mix: DJ filter, stutter, half speed, tape stop
  void perform(float* l, float* r, int n) {
    const int N = int(pbL.size()); const float fv = perf[0]; const bool st = perf[1] > 0.5f, hf = perf[2] > 0.5f, tp = perf[3] > 0.5f; const int beat = int(sr * 60 / bpm);
    if (st && !stutOn) { stutLen = std::max(256, beat / (perf[1] > 0.9f ? 8 : 4)); stutStart = (pbW - stutLen + N) % N; stutPos = 0; } stutOn = st;
    if (hf && !halfOn) pbR_ = pbW; halfOn = hf; if (tp && !tapeOn) { pbR_ = pbW; tapeRate = 1; } tapeOn = tp;
    if (std::fabs(fv - 0.5f) > 0.03f) { if (fv < 0.5f) { pfL.set(cutHz(0.25f + fv * 1.5f), 2.2f, sr); pfR.a1 = pfL.a1; pfR.a2 = pfL.a2; pfR.a3 = pfL.a3; pfR.k = pfL.k; for (int i = 0; i < n; i++) { l[i] = pfL.lp(l[i]); r[i] = pfR.lp(r[i]); } }
      else { phL.set(cutHz((fv - 0.5f) * 1.5f), 2.2f, sr); phR.a1 = phL.a1; phR.a2 = phL.a2; phR.a3 = phL.a3; phR.k = phL.k; for (int i = 0; i < n; i++) { l[i] = phL.hp(l[i]); r[i] = phR.hp(r[i]); } } }
    for (int i = 0; i < n; i++) {
      if (!stutOn) { pbL[pbW] = l[i]; pbR[pbW] = r[i]; }
      float a = l[i], b = r[i];
      if (stutOn) { const int p = (stutStart + stutPos) % N; const float e = std::min(1.f, std::min(stutPos, stutLen - stutPos) / 64.f); a = pbL[p] * e; b = pbR[p] * e; if (++stutPos >= stutLen) stutPos = 0; }
      else if (tapeOn || halfOn) { const int i0 = int(pbR_) % N, i1 = (i0 + 1) % N; const float f = float(pbR_ - std::floor(pbR_)); a = pbL[i0] + (pbL[i1] - pbL[i0]) * f; b = pbR[i0] + (pbR[i1] - pbR[i0]) * f;
        if (tapeOn) { tapeRate *= 1 - 1 / (sr * 0.25f); pbR_ += tapeRate; if (tapeRate < 0.02f) { a = b = 0; } else { a *= float(std::min(1.0, tapeRate * 3)); b *= float(std::min(1.0, tapeRate * 3)); } }
        else { pbR_ += 0.5; double lag = pbW - pbR_; if (lag < 0) lag += N; if (lag > beat * 2) pbR_ = pbW - 32; } if (pbR_ >= N) pbR_ -= N; if (pbR_ < 0) pbR_ += N; }
      l[i] = a; r[i] = b; if (!stutOn) { if (++pbW >= N) pbW = 0; }
    }
  }
  void master(float* l, float* r, int n) {
    if (M[M_LOW] != mEqV[0]) { mEqV[0] = M[M_LOW]; for (auto& b : mLow) b.lowShelf(90, (M[M_LOW] - 0.5f) * 12, sr); } if (M[M_HIGH] != mEqV[1]) { mEqV[1] = M[M_HIGH]; for (auto& b : mHigh) b.highShelf(8000, (M[M_HIGH] - 0.5f) * 12, sr); }
    const float glue = M[M_GLUE], thr = dbGain(-4 - glue * 20), ratio = 1 + glue * 3, mk = dbGain(glue * 7), sat = M[M_SAT], wide = M[M_WIDE] * 2, loudG = dbGain(M[M_LOUD] * 24 - 4), vol = std::min(1.f, M[M_VOL] * M[M_VOL] * 1.5625f);
    const float ca = 1 - std::exp(-1 / (sr * 0.012f)), cr = 1 - std::exp(-1 / (sr * 0.18f)); float gmin = 1;
    for (int i = 0; i < n; i++) {
      float a = mHigh[0].run(mLow[0].run(l[i] * 0.5f)), b = mHigh[1].run(mLow[1].run(r[i] * 0.5f));
      const float pk = std::max(std::fabs(a), std::fabs(b)); glueEnv += (pk - glueEnv) * (pk > glueEnv ? ca : cr); float g = 1; if (glue > 0.01f && glueEnv > thr) g = std::pow(glueEnv / thr, 1 / ratio - 1); if (g < gmin) gmin = g; a *= g * mk; b *= g * mk;
      if (sat > 0.01f) { const float d = 1 + sat * 3; a = a * (1 - sat) + fastTanh(a * d) / fastTanh(d) * sat * 0.9f + 0; b = b * (1 - sat) + fastTanh(b * d) / fastTanh(d) * sat * 0.9f; }
      const float mid = (a + b) * 0.5f, side = (a - b) * 0.5f * wide; l[i] = (mid + side) * loudG; r[i] = (mid - side) * loudG;
    }
    glueGr.store(-20 * std::log10(std::max(gmin, 1e-4f))); lim.run(l, r, n, 0.966f, 1 / (sr * 0.12f)); for (int i = 0; i < n; i++) { l[i] *= vol; r[i] *= vol; }
  }

  // ---------------------------------------------------------------- saving: the project as a list of commands
  static void qs(std::string& o, const std::string& s) { o += '"'; for (char c : s) { if (c == '"' || c == '\\') o += '\\'; if (c != '\n') o += c; } o += '"'; }
  static void fl(std::string& o, float v) { char b[32]; snprintf(b, sizeof b, " %.5g", v); o += b; }
  std::string dump() {
    std::string o = "smx 1\n"; char b[160]; o += "title "; qs(o, title); o += "\n"; snprintf(b, sizeof b, "bpm %.4g\nswing %.4g\nkey %d %d\n", bpm, swing, keyRoot, scale); o += b;
    for (size_t i = 0; i < smp.size(); i++) if (smp[i]) { snprintf(b, sizeof b, "smp %d ", int(i)); o += b; qs(o, smp[i]->name); o += ' '; qs(o, smp[i]->path); o += "\n"; }
    for (int t = 0; t < nT; t++) { Track& T = *trk[t]; snprintf(b, sizeof b, "trk add %d\ntrk eng %d %d\ntrk smp %d %d\ntrk ch %d %d\ntrk mute %d %d\ntrk solo %d %d\ntrk name %d ", T.type, t, T.eng, t, T.smp, t, T.midiCh, t, int(T.mute), t, int(T.solo), t); o += b; qs(o, T.name); o += "\n";
      snprintf(b, sizeof b, "pall %d", t); o += b; for (int i = 0; i < NP; i++) fl(o, T.P[i]); o += "\n";
      if (T.type == T_DRUM) for (int i = 0; i < 8; i++) { const Pad& p = T.pads[i]; snprintf(b, sizeof b, "pad %d %d %d %.4g %.4g %.4g %.4g %.4g %d\n", t, i, p.type, p.tune, p.decay, p.level, p.pan, p.tone, p.smp); o += b; } }
    for (int p = 0; p < NPAT; p++) { const Pattern& P = pat[p]; bool any = P.bars != 1; for (int t = 0; t < nT; t++) any |= !P.clips[t].notes.empty() || !P.clips[t].lanes.empty(); if (!any) continue;
      snprintf(b, sizeof b, "pb %d %d\n", p, P.bars); o += b;
      for (int t = 0; t < nT; t++) { for (auto& n : P.clips[t].notes) { snprintf(b, sizeof b, "n %d %d %d %d %d %.3g\n", p, t, n.start, n.len, n.pitch, n.vel); o += b; }
        for (auto& l : P.clips[t].lanes) { snprintf(b, sizeof b, "au %d %d %d", p, t, l.param); o += b; for (float v : l.v) fl(o, v); o += "\n"; } } }
    o += "song"; for (int s : song) { snprintf(b, sizeof b, " %d", s); o += b; } o += "\nm"; for (int i = 0; i < NM; i++) fl(o, M[i]); o += "\npall 16"; for (int i = 0; i < NP; i++) fl(o, inP[i]); o += "\n";
    snprintf(b, sizeof b, "ref %d\n", refId); o += b; return o;
  }
  void load(const std::string& text) { allOff(); for (int t = 0; t < nT; t++) trk[t]->silence(); resetProject(); std::istringstream is(text); std::string line; while (std::getline(is, line)) if (!line.empty()) exec(line, true); curPat = 0; version++; }
  void mark() { undoS.push_back(dump()); if (undoS.size() > 40) undoS.erase(undoS.begin()); redoS.clear(); }
  void restore(const std::string& s) { const bool wp = playing; const int cp = curPat, sp = songPos; const double tk = tick; const bool sm_ = songMode; const std::string tt = title; load(s); title = tt; playing = wp; curPat = cp; songPos = sp; tick = tk; songMode = sm_; }

  // ---------------------------------------------------------------- commands
  static std::vector<std::string> split(const std::string& s) {
    std::vector<std::string> o; size_t i = 0; while (i < s.size()) { while (i < s.size() && s[i] == ' ') i++; if (i >= s.size()) break;
      if (s[i] == '"') { std::string t; i++; while (i < s.size() && s[i] != '"') { if (s[i] == '\\' && i + 1 < s.size()) i++; t += s[i++]; } i++; o.push_back(t); }
      else { size_t j = s.find(' ', i); if (j == std::string::npos) j = s.size(); o.push_back(s.substr(i, j - i)); i = j; } }
    return o; }
  Clip* clip(int p, int t) { return p >= 0 && p < NPAT && t >= 0 && t < nT ? &pat[p].clips[t] : nullptr; }
  std::string exec(const std::string& line, bool loading = false) {
    auto a = split(line); if (a.empty()) return ""; const std::string& c = a[0]; auto I = [&](size_t i) { return i < a.size() ? atoi(a[i].c_str()) : 0; }; auto F = [&](size_t i) { return i < a.size() ? float(atof(a[i].c_str())) : 0.f; };
    bool edit = true;
    if (c == "p") { float* P = params(I(1)); const int k = I(2); if (P && k >= 0 && k < NP) { P[k] = clampf(F(3), 0, 1); if (recOn && playing && I(1) < nT) setAuto(curPat, I(1), k, int(tick / TPS), P[k]); } edit = false; }
    else if (c == "nudge") { float* P = params(I(1)); const int k = I(2); if (P && k >= 0 && k < NP) P[k] = clampf(P[k] + F(3), 0, 1); }
    else if (c == "mnudge") { const int k = I(1); if (k >= 0 && k < NM) M[k] = clampf(M[k] + F(2), 0, 1); }
    else if (c == "pall") { float* P = params(I(1)); if (P) for (int i = 0; i < NP && i + 2 < int(a.size()); i++) P[i] = F(i + 2); }
    else if (c == "m") { if (a.size() > 3) for (int i = 0; i < NM && i + 1 < int(a.size()); i++) M[i] = F(i + 1); else if (I(1) >= 0 && I(1) < NM) M[I(1)] = clampf(F(2), 0, 1); }
    else if (c == "perf") { if (I(1) >= 0 && I(1) < 4) perf[I(1)] = F(2); edit = false; }
    else if (c == "non") { const int t = I(1), pitch = I(2); const float vel = a.size() > 3 ? F(3) : 0.85f; noteOn(t, pitch, vel, -1);
      if (recOn && playing && t >= 0 && t < nT) { const int plen = pat[curPat].len(); int st = int(std::lround(tick / TPS)) * TPS; if (st >= plen) st = 0;
        if (trk[t]->type == T_DRUM) { addNote(curPat, t, st, TPS, pitch & 7, vel); if (st > tick) suppress.push_back({t, pitch & 7, st}); version++; } else pend.push_back({t, pitch, st, vel}); }
      edit = false; }
    else if (c == "noff") { const int t = I(1), pitch = I(2); noteOff(t, pitch);
      for (size_t i = 0; i < pend.size(); i++) if (pend[i].t == t && pend[i].pitch == pitch) { const int plen = pat[curPat].len(); int len = int(std::lround((tick - pend[i].start) / TPS)) * TPS; if (len <= 0) len += plen; len = std::max(TPS, std::min(len, plen));
        addNote(curPat, t, pend[i].start, len, pitch, pend[i].vel); if (pend[i].start > tick) suppress.push_back({t, pitch, pend[i].start}); pend.erase(pend.begin() + i); version++; break; }
      edit = false; }
    else if (c == "play") { if (!playing) { playing = true; ended = false; if (songMode && !song.empty()) { songPos = std::min(songPos, int(song.size()) - 1); curPat = song[songPos]; } loud.reset(); } }
    else if (c == "stop") { if (!playing) { tick = 0; songPos = 0; if (songMode && !song.empty()) curPat = song[0]; } playing = false; allOff(); }
    else if (c == "seek") { songPos = std::max(0, std::min(I(1), int(song.size()) - 1)); if (songMode && !song.empty()) curPat = song[songPos]; tick = 0; allOff(); }
    else if (c == "rec") recOn = I(1) != 0; else if (c == "metro") metro = I(1) != 0; else if (c == "mode") songMode = I(1) != 0; else if (c == "loop") loopSong = I(1) != 0; else if (c == "inmon") inMon = I(1) != 0;
    else if (c == "bpm") bpm = clampf(F(1), 40, 240); else if (c == "swing") swing = clampf(F(1), 0, 1); else if (c == "key") { keyRoot = ((I(1) % 12) + 12) % 12; scale = I(2) & 7; }
    else if (c == "title") { if (a.size() > 1) title = a[1]; }
    else if (c == "pat") { const int p = std::max(0, std::min(NPAT - 1, I(1))); if (p != curPat) { curPat = p; if (tick >= pat[p].len()) tick = std::fmod(tick, double(pat[p].len())); allOff(); } }
    else if (c == "pb") { const int p = I(1); if (p >= 0 && p < NPAT) { pat[p].bars = std::max(1, std::min(8, I(2))); if (p == curPat && tick >= pat[p].len()) tick = 0; } }
    else if (c == "trk") { const std::string& s = a.size() > 1 ? a[1] : c; const int t = I(2);
      if (s == "add") { const int r = addTrack(I(2)); version++; return std::to_string(r); }
      if (t < 0 || t >= nT) return ""; Track& T = *trk[t];
      if (s == "del") delTrack(t); else if (s == "eng") T.eng = I(3) & 3; else if (s == "smp") T.smp = I(3); else if (s == "ch") T.midiCh = I(3) & 15; else if (s == "mute") T.mute = I(3) != 0; else if (s == "solo") T.solo = I(3) != 0; else if (s == "name" && a.size() > 3) T.name = a[3];
      else if (s == "type") { T.silence(); T.type = I(3) & 3; } }
    else if (c == "pad") { const int t = I(1), i = I(2); if (t >= 0 && t < nT && i >= 0 && i < 8) { Pad& p = trk[t]->pads[i];
        if (a.size() >= 10) { p.type = I(3) % D_COUNT; p.tune = F(4); p.decay = F(5); p.level = F(6); p.pan = F(7); p.tone = F(8); p.smp = I(9); }
        else if (a.size() >= 5) { const std::string& f = a[3]; if (f == "type") p.type = I(4) % D_COUNT; else if (f == "tune") p.tune = F(4); else if (f == "decay") p.decay = F(4); else if (f == "level") p.level = F(4); else if (f == "pan") p.pan = F(4); else if (f == "tone") p.tone = F(4); else if (f == "smp") { p.smp = I(4); p.type = D_SAMPLE; } } } }
    else if (c == "n") { addNote(I(1), I(2), I(3), I(4), I(5), a.size() > 6 ? F(6) : 0.8f); }
    else if (c == "nd") { if (Clip* k = clip(I(1), I(2))) { const int st = I(3), pi = I(4); k->notes.erase(std::remove_if(k->notes.begin(), k->notes.end(), [&](const Note& n) { return n.start == st && n.pitch == pi; }), k->notes.end()); } }
    else if (c == "nclear") { if (Clip* k = clip(I(1), I(2))) { k->notes.clear(); if (I(3)) k->lanes.clear(); } }
    else if (c == "nshift") { if (Clip* k = clip(I(1), I(2))) for (auto& n : k->notes) n.pitch = std::max(0, std::min(127, n.pitch + I(3))); }
    else if (c == "au") { const int p = I(1), t = I(2), k = I(3); if (Clip* cl = clip(p, t)) { if (a.size() <= 4) { cl->lanes.erase(std::remove_if(cl->lanes.begin(), cl->lanes.end(), [&](const Lane& l) { return l.param == k; }), cl->lanes.end()); }
        else if (a.size() == 6 && !loading) setAuto(p, t, k, I(4), F(5)); else { Lane* L = nullptr; for (auto& l : cl->lanes) if (l.param == k) L = &l; if (!L) { cl->lanes.push_back({k, {}}); L = &cl->lanes.back(); } L->v.clear(); for (size_t i = 4; i < a.size(); i++) L->v.push_back(F(i)); } } }
    else if (c == "pcopy") { const int s = I(1), d = I(2); if (s >= 0 && s < NPAT && d >= 0 && d < NPAT && s != d) pat[d] = pat[s]; }
    else if (c == "pclear") { const int p = I(1); if (p >= 0 && p < NPAT) pat[p] = Pattern(); }
    else if (c == "pdouble") { const int p = I(1); if (p >= 0 && p < NPAT && pat[p].bars <= 4) { Pattern& P = pat[p]; const int len = P.len(); for (auto& cl : P.clips) { const size_t n0 = cl.notes.size(); for (size_t i = 0; i < n0; i++) { Note n = cl.notes[i]; n.start += len; cl.notes.push_back(n); } for (auto& l : cl.lanes) { l.v.resize(P.bars * 16, -1); const size_t m = l.v.size(); for (size_t i = 0; i < m; i++) l.v.push_back(l.v[i]); } } P.bars *= 2; } }
    else if (c == "song") { const std::string s = a.size() > 1 ? a[1] : ""; if (s == "add") { if (song.size() < 256) song.insert(song.begin() + std::max(0, std::min(int(song.size()), a.size() > 3 ? I(3) : int(song.size()))), std::max(0, std::min(NPAT - 1, I(2)))); }
      else if (s == "del") { if (I(2) >= 0 && I(2) < int(song.size())) song.erase(song.begin() + I(2)); if (songPos >= int(song.size())) songPos = 0; } else if (s == "set") { if (I(2) >= 0 && I(2) < int(song.size())) song[I(2)] = std::max(0, std::min(NPAT - 1, I(3))); }
      else if (s == "clear") { song.clear(); songPos = 0; } else { song.clear(); for (size_t i = 1; i < a.size(); i++) song.push_back(std::max(0, std::min(NPAT - 1, I(i)))); } }
    else if (c == "smp") { const int id = I(1); if (id >= 0 && id < 4096) { if (id >= int(smp.size())) smp.resize(id + 1); if (!smp[id]) smp[id] = std::make_shared<Sample>(); if (a.size() > 2) smp[id]->name = a[2]; if (a.size() > 3) smp[id]->path = a[3]; } }
    else if (c == "sel") { if (a.size() > 2) sel[a[1]] = I(2); }
    else if (c == "ref") { if (a.size() > 2) refOn = I(2) != 0; else { refId = I(1); } refPos = refOn ? refPos : 0; }
    else if (c == "pre") { preOn = false; }
    else if (c == "lufs") loud.reset();
    else if (c == "mark") { mark(); edit = false; }
    else if (c == "bump") {}
    else if (c == "undo") { if (!undoS.empty()) { redoS.push_back(dump()); const std::string s = undoS.back(); undoS.pop_back(); restore(s); } }
    else if (c == "redo") { if (!redoS.empty()) { undoS.push_back(dump()); const std::string s = redoS.back(); redoS.pop_back(); restore(s); } }
    else if (c == "new") { allOff(); for (int t = 0; t < nT; t++) trk[t]->silence(); resetProject(); undoS.clear(); redoS.clear(); }
    else if (c == "dump") return dump();
    else if (c == "smx") {}
    else return "?";
    if (edit) version++;
    if (!loading && c != "sel" && c != "perf" && c != "non" && c != "noff") edits++;
    return "";
  }
  void addNote(int p, int t, int start, int len, int pitch, float vel) { Clip* k = clip(p, t); if (!k || k->notes.size() > 4000) return; start = std::max(0, std::min(start, MAXSTEPS * TPS - 1));
    for (auto& n : k->notes) if (n.start == start && n.pitch == pitch) { n.len = std::max(1, len); n.vel = vel; return; } k->notes.push_back({start, std::max(1, len), pitch, clampf(vel, 0.02f, 1)}); }
  void setAuto(int p, int t, int param, int step, float v) { Clip* k = clip(p, t); if (!k || step < 0 || step >= MAXSTEPS || param < 0 || param >= NP) return; Lane* L = nullptr; for (auto& l : k->lanes) if (l.param == param) L = &l;
    if (!L) { if (v < 0) return; k->lanes.push_back({param, {}}); L = &k->lanes.back(); } if (int(L->v.size()) <= step) L->v.resize(step + 1, -1); L->v[step] = v; }

  // ---------------------------------------------------------------- what the screens read
  std::string state() {
    std::string o; o.reserve(16384); char b[256]; auto num = [&](float v) { snprintf(b, sizeof b, "%.4g", v); o += b; };
    snprintf(b, sizeof b, "{\"v\":%d,\"bpm\":%.4g,\"swing\":%.3g,\"key\":%d,\"scale\":%d,\"playing\":%d,\"songMode\":%d,\"rec\":%d,\"metro\":%d,\"loop\":%d,\"pat\":%d,\"inMon\":%d,\"undo\":%d,\"redo\":%d,\"refId\":%d,\"refOn\":%d,\"title\":", version.load(), bpm, swing, keyRoot, scale, int(playing), int(songMode), int(recOn), int(metro), int(loopSong), curPat, int(inMon), int(undoS.size()), int(redoS.size()), refId, int(refOn)); o += b; qs(o, title);
    o += ",\"sel\":{"; { bool f = true; for (auto& kv : sel) { if (!f) o += ','; f = false; qs(o, kv.first); snprintf(b, sizeof b, ":%d", kv.second); o += b; } } o += "},\"M\":["; for (int i = 0; i < NM; i++) { if (i) o += ','; num(M[i]); } o += "],\"inP\":["; for (int i = 0; i < NP; i++) { if (i) o += ','; num(inP[i]); }
    o += "],\"song\":["; for (size_t i = 0; i < song.size(); i++) { if (i) o += ','; o += std::to_string(song[i]); } o += "],\"tracks\":[";
    for (int t = 0; t < nT; t++) { Track& T = *trk[t]; if (t) o += ','; snprintf(b, sizeof b, "{\"type\":%d,\"eng\":%d,\"smp\":%d,\"ch\":%d,\"mute\":%d,\"solo\":%d,\"name\":", T.type, T.eng, T.smp, T.midiCh, int(T.mute), int(T.solo)); o += b; qs(o, T.name);
      o += ",\"P\":["; for (int i = 0; i < NP; i++) { if (i) o += ','; num(T.P[i]); } o += "]";
      if (T.type == T_DRUM) { o += ",\"pads\":["; for (int i = 0; i < 8; i++) { const Pad& p = T.pads[i]; if (i) o += ','; snprintf(b, sizeof b, "{\"type\":%d,\"tune\":%.3g,\"decay\":%.3g,\"level\":%.3g,\"pan\":%.3g,\"tone\":%.3g,\"smp\":%d}", p.type, p.tune, p.decay, p.level, p.pan, p.tone, p.smp); o += b; } o += "]"; }
      o += "}"; }
    o += "],\"pats\":[";
    for (int p = 0; p < NPAT; p++) { const Pattern& P = pat[p]; if (p) o += ','; snprintf(b, sizeof b, "{\"bars\":%d,\"c\":[", P.bars); o += b;
      for (int t = 0; t < nT; t++) { if (t) o += ','; o += "{\"n\":["; bool f = true; for (auto& n : P.clips[t].notes) { if (!f) o += ','; f = false; snprintf(b, sizeof b, "[%d,%d,%d,%.3g]", n.start, n.len, n.pitch, n.vel); o += b; }
        o += "],\"a\":{"; f = true; for (auto& l : P.clips[t].lanes) { if (!f) o += ','; f = false; snprintf(b, sizeof b, "\"%d\":[", l.param); o += b; for (size_t i = 0; i < l.v.size(); i++) { if (i) o += ','; num(l.v[i]); } o += "]"; } o += "}}"; }
      o += "]}"; }
    o += "],\"smp\":["; { bool f = true; for (size_t i = 0; i < smp.size(); i++) if (smp[i]) { if (!f) o += ','; f = false; snprintf(b, sizeof b, "{\"id\":%d,\"sec\":%.3g,\"name\":", int(i), smp[i]->n() / smp[i]->rate); o += b; qs(o, smp[i]->name); o += "}"; } }
    o += "]}"; return o;
  }
  // fast numbers for the meters: no lock needed, read many times a second
  std::string meters() {
    std::string o; char b[96]; snprintf(b, sizeof b, "%d,%d,%d,%.2f,%d,%.1f,%.1f,%.1f,%.2f,%.2f,%.3f,%.3f,%.3f,%.1f,%.2f", version.load(), int(playing), curPat, tick, songPos, loud.mom.load(), loud.shortT.load(), loud.integ.load(), lim.gr.load(), glueGr.load(), outPk[0].exchange(0), outPk[1].exchange(0), inPeak.exchange(0), float(recN / sr), cpu.load()); o += b;
    for (int t = 0; t < nT; t++) { Track* T = trk[t].get(); snprintf(b, sizeof b, ",%.3f", T ? T->strip.peak.exchange(0) : 0.f); o += b; } snprintf(b, sizeof b, ";%.3f", inStrip.peak.exchange(0)); o += b; return o;
  }
  std::string peaks(int id, int bins) { auto s = getSmp(id); if (!s || s->n() < 2) return ""; std::string o; char b[16]; const int N = s->n();
    for (int k = 0; k < bins; k++) { const int a0 = int(int64_t(N) * k / bins), e = std::max(a0 + 1, int(int64_t(N) * (k + 1) / bins)); float pk = 0; const int st = std::max(1, (e - a0) / 64); for (int i = a0; i < e; i += st) pk = std::max(pk, std::max(std::fabs(s->L[i]), std::fabs(s->R[i]))); snprintf(b, sizeof b, k ? ",%.3f" : "%.3f", pk); o += b; }
    return o; }

  // ---------------------------------------------------------------- export: the song, a pattern or one track written as a WAV
  static bool writeWav(const std::string& path, const std::vector<float>& L, const std::vector<float>& R, int rate) {
    FILE* f = fopen(path.c_str(), "wb"); if (!f) return false; const uint32_t n = uint32_t(L.size()), bytes = n * 6; auto u32 = [&](uint32_t v) { fwrite(&v, 4, 1, f); }; auto u16 = [&](uint16_t v) { fwrite(&v, 2, 1, f); };
    fwrite("RIFF", 1, 4, f); u32(36 + bytes); fwrite("WAVEfmt ", 1, 8, f); u32(16); u16(1); u16(2); u32(rate); u32(rate * 6); u16(6); u16(24); fwrite("data", 1, 4, f); u32(bytes);
    std::vector<uint8_t> buf; buf.reserve(6 * 4096); for (uint32_t i = 0; i < n; i++) { for (int c = 0; c < 2; c++) { const int32_t v = int32_t(std::lrint(clampf(c ? R[i] : L[i], -1, 1) * 8388607.0)); buf.push_back(v & 255); buf.push_back((v >> 8) & 255); buf.push_back((v >> 16) & 255); } if (buf.size() >= 6 * 4096) { fwrite(buf.data(), 1, buf.size(), f); buf.clear(); } }
    if (!buf.empty()) fwrite(buf.data(), 1, buf.size(), f); fclose(f); return true; }
  // mode 0: the song (or the pattern if there is no song) with its tail; 1: the pattern exactly, as a loop; 2: one track of the song
  bool render(int mode, int arg, std::vector<float>& L, std::vector<float>& R) {
    const bool wp = playing, wm = songMode, wl = loopSong, wr = recOn, wmet = metro; const int cp = curPat, sp = songPos; const double tk = tick; std::vector<bool> solo, mute;
    allOff(); for (int t = 0; t < nT; t++) { trk[t]->silence(); solo.push_back(trk[t]->solo); mute.push_back(trk[t]->mute); if (mode == 2) { trk[t]->solo = t == arg; trk[t]->mute = false; } }
    delay.clear(); reverb.clear(); loud.reset(); lim.init(sr); std::fill(pbL.begin(), pbL.end(), 0.f); std::fill(pbR.begin(), pbR.end(), 0.f); recOn = false; metro = false; const bool useSong = mode != 1 && !song.empty(); songMode = useSong; loopSong = false; oneShot = !useSong; songPos = 0; if (useSong) curPat = song[0]; tick = 0; ended = false; playing = true;
    const bool wasMon = inMon; inMon = false; float l[CH], r[CH]; const size_t maxN = size_t(sr * 60 * 12); int tail = mode == 1 ? 0 : int(sr * 2.5f); L.clear(); R.clear();
    while (L.size() < maxN) { chunk(l, r, CH, nullptr, nullptr); L.insert(L.end(), l, l + CH); R.insert(R.end(), r, r + CH); if (ended) { if (tail <= 0) break; tail -= CH; } }
    if (mode == 1) { size_t want = size_t(pat[curPat].len() * tickSamples()); if (L.size() > want) { L.resize(want); R.resize(want); } }
    playing = wp; songMode = wm; loopSong = wl; recOn = wr; metro = wmet; oneShot = false; curPat = cp; songPos = sp; tick = tk; inMon = wasMon; ended = false; allOff(); for (int t = 0; t < nT; t++) { trk[t]->silence(); trk[t]->solo = solo[t]; trk[t]->mute = mute[t]; } delay.clear(); reverb.clear();
    return !L.empty();
  }
};
}  // namespace sm
