// Stringer Max: the building blocks of the sound (filters, delay, reverb, pitch correction, limiter, loudness).
#pragma once
#include <algorithm>
#include <atomic>
#include <cmath>
#include <cstdint>
#include <cstring>
#include <vector>

namespace sm {
constexpr float PI = 3.14159265358979f;
inline float clampf(float v, float a, float b) { return v < a ? a : (v > b ? b : v); }
inline float cutHz(float v) { return 20.f * std::pow(1000.f, clampf(v, 0.f, 1.f)); }   // 0..1 -> 20 Hz..20 kHz
inline float noteHz(float n) { return 440.f * std::pow(2.f, (n - 69.f) / 12.f); }
inline float dbGain(float db) { return std::pow(10.f, db / 20.f); }
inline float fastTanh(float x) { if (x < -3) return -1; if (x > 3) return 1; const float x2 = x * x; return x * (27 + x2) / (27 + 9 * x2); }

struct Rng { uint32_t s = 0x1234567u; float uni() { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s & 0xFFFFFF) / float(0x1000000); } float bi() { return uni() * 2 - 1; } };

// state-variable filter (lowpass, bandpass and highpass from one structure)
struct SVF {
  float ic1 = 0, ic2 = 0, a1 = 0, a2 = 0, a3 = 0, k = 1;
  void set(float hz, float q, float sr) { const float g = std::tan(PI * clampf(hz, 16.f, sr * 0.45f) / sr); k = 1 / std::max(0.3f, q); a1 = 1 / (1 + g * (g + k)); a2 = g * a1; a3 = g * a2; }
  inline void run(float x, float& lp, float& bp, float& hp) { const float v3 = x - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3; ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2; lp = v2; bp = v1; hp = x - k * v1 - v2; }
  inline float lp(float x) { float l, b, h; run(x, l, b, h); return l; }
  inline float hp(float x) { float l, b, h; run(x, l, b, h); return h; }
  inline float bp(float x) { float l, b, h; run(x, l, b, h); return b; }
  void reset() { ic1 = ic2 = 0; }
};

struct Biquad {
  float b0 = 1, b1 = 0, b2 = 0, a1 = 0, a2 = 0, z1 = 0, z2 = 0;
  inline float run(float x) { const float y = b0 * x + z1; z1 = b1 * x - a1 * y + z2; z2 = b2 * x - a2 * y; return y; }
  void norm(float a0) { b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0; }
  void lowShelf(float hz, float db, float sr) { const float A = std::pow(10.f, db / 40), w = 2 * PI * hz / sr, c = std::cos(w), al = std::sin(w) / 2 * std::sqrt(2.f), s = 2 * std::sqrt(A) * al;
    b0 = A * ((A + 1) - (A - 1) * c + s); b1 = 2 * A * ((A - 1) - (A + 1) * c); b2 = A * ((A + 1) - (A - 1) * c - s); const float a0 = (A + 1) + (A - 1) * c + s; a1 = -2 * ((A - 1) + (A + 1) * c); a2 = (A + 1) + (A - 1) * c - s; norm(a0); }
  void highShelf(float hz, float db, float sr, float q = 0.7071f) { const float A = std::pow(10.f, db / 40), w = 2 * PI * hz / sr, c = std::cos(w), al = std::sin(w) / (2 * q), s = 2 * std::sqrt(A) * al;
    b0 = A * ((A + 1) + (A - 1) * c + s); b1 = -2 * A * ((A - 1) + (A + 1) * c); b2 = A * ((A + 1) + (A - 1) * c - s); const float a0 = (A + 1) - (A - 1) * c + s; a1 = 2 * ((A - 1) - (A + 1) * c); a2 = (A + 1) - (A - 1) * c - s; norm(a0); }
  void peak(float hz, float db, float q, float sr) { const float A = std::pow(10.f, db / 40), w = 2 * PI * hz / sr, c = std::cos(w), al = std::sin(w) / (2 * q);
    b0 = 1 + al * A; b1 = -2 * c; b2 = 1 - al * A; const float a0 = 1 + al / A; a1 = -2 * c; a2 = 1 - al / A; norm(a0); }
  void highPass(float hz, float q, float sr) { const float w = 2 * PI * hz / sr, c = std::cos(w), al = std::sin(w) / (2 * q);
    b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; const float a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; norm(a0); }
  void reset() { z1 = z2 = 0; }
};

// ping-pong delay locked to the tempo
struct Delay {
  std::vector<float> L, R; int w = 0; float lpL = 0, lpR = 0, cur = 12000;
  void init(float sr) { L.assign(size_t(sr * 2.5f), 0); R = L; w = 0; }
  void clear() { std::fill(L.begin(), L.end(), 0.f); std::fill(R.begin(), R.end(), 0.f); lpL = lpR = 0; }
  void run(const float* inL, const float* inR, float* oL, float* oR, int n, float samples, float fb, float tone) {
    const int N = int(L.size()); samples = clampf(samples, 64.f, float(N - 2)); const float a = 0.05f + 0.9f * tone;
    for (int i = 0; i < n; i++) {
      cur += (samples - cur) * 0.0015f; float rp = float(w) - cur; while (rp < 0) rp += N; const int i0 = int(rp) % N, i1 = (i0 + 1) % N; const float f = rp - i0;
      const float dl = L[i0] + (L[i1] - L[i0]) * f, dr = R[i0] + (R[i1] - R[i0]) * f;
      lpL += (dl - lpL) * a; lpR += (dr - lpR) * a;
      L[w] = (inL[i] + inR[i]) * 0.5f + lpR * fb; R[w] = lpL * fb;   // the echo bounces left, right, left
      oL[i] = dl; oR[i] = dr; if (++w >= N) w = 0;
    }
  }
};

// room reverb (eight combs into four allpasses a side)
struct Reverb {
  struct Comb { std::vector<float> b; int i = 0; float st = 0; inline float run(float x, float fb, float damp) { const float y = b[i]; st = y * (1 - damp) + st * damp; b[i] = x + st * fb; if (++i >= int(b.size())) i = 0; return y; } };
  struct AP { std::vector<float> b; int i = 0; inline float run(float x) { const float y = b[i]; b[i] = x + y * 0.5f; if (++i >= int(b.size())) i = 0; return y - x; } };
  Comb c[2][8]; AP a[2][4];
  void init(float sr, float scale = 1) { const int ct[8] = {1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617}, at[4] = {556, 441, 341, 225}; const float k = sr / 44100.f * scale;
    for (int ch = 0; ch < 2; ch++) { for (int j = 0; j < 8; j++) { c[ch][j].b.assign(size_t((ct[j] + ch * 23) * k) + 1, 0); c[ch][j].i = 0; c[ch][j].st = 0; } for (int j = 0; j < 4; j++) { a[ch][j].b.assign(size_t((at[j] + ch * 23) * k) + 1, 0); a[ch][j].i = 0; } } }
  void clear() { for (auto& ch : c) for (auto& x : ch) { std::fill(x.b.begin(), x.b.end(), 0.f); x.st = 0; } for (auto& ch : a) for (auto& x : ch) std::fill(x.b.begin(), x.b.end(), 0.f); }
  void run(const float* inL, const float* inR, float* oL, float* oR, int n, float size, float damp) {
    const float fb = 0.7f + 0.28f * size, d = 0.05f + 0.6f * damp;
    for (int i = 0; i < n; i++) { const float x = (inL[i] + inR[i]) * 0.015f; float l = 0, r = 0;
      for (int j = 0; j < 8; j++) { l += c[0][j].run(x, fb, d); r += c[1][j].run(x, fb, d); }
      for (int j = 0; j < 4; j++) { l = a[0][j].run(l); r = a[1][j].run(r); }
      oL[i] = l; oR[i] = r; }
  }
};

// Pitch correction and pitch shift. Listens for the note being sung, pulls it to the nearest note of the key.
struct Tuner {
  std::vector<float> dl, dr, det; int w = 0, dw = 0, hop = 0, dec = 0; float decAcc = 0, phase = 0, ratio = 1, corr = 1, lastHz = 0; float sr = 48000;
  void init(float s) { sr = s; dl.assign(8192, 0); dr = dl; det.assign(640, 0); w = dw = hop = dec = 0; decAcc = 0; phase = 0; ratio = corr = 1; }
  float detect() {   // the sung pitch in Hz, or 0 when there is no clear note
    const int W = 400, N = int(det.size()); float x[640]; for (int i = 0; i < N; i++) x[i] = det[(dw + i) % N];
    float e = 0; for (int i = 0; i < W; i++) e += x[i] * x[i]; if (e / W < 1e-5f) return 0;
    const float fs = sr / 4; const int lo = std::max(4, int(fs / 900)), hi = std::min(N - W - 1, int(fs / 70)); float run = 0, best = 1e9f; int bt = -1; static thread_local float d[260];
    for (int t = 1; t <= hi; t++) { float s = 0; for (int i = 0; i < W; i += 2) { const float q = x[i] - x[i + t]; s += q * q; } run += s; d[t] = s * t / (run + 1e-9f); }
    for (int t = lo; t < hi; t++) { if (d[t] < 0.18f && d[t] <= d[t + 1]) { bt = t; break; } if (d[t] < best) { best = d[t]; bt = t; } }
    if (bt < lo || d[bt] > 0.35f) return 0;
    float tt = float(bt); if (bt > lo && bt < hi) { const float a = d[bt - 1], b = d[bt], c = d[bt + 1], den = a - 2 * b + c; if (std::fabs(den) > 1e-9f) tt += 0.5f * (a - c) / den; }
    return fs / tt;
  }
  // amount 0..1 (0 = off, 1 = hard snap), shift in semitones, mask = which of the twelve notes are allowed
  void run(float* L, float* R, int n, float amount, float shift, int mask) {
    const int N = int(dl.size()); const float W = sr * 0.035f, base = std::pow(2.f, shift / 12.f);
    for (int i = 0; i < n; i++) {
      const float m = (L[i] + R[i]) * 0.5f; dl[w] = L[i]; dr[w] = R[i];
      decAcc += m; if (++dec >= 4) { det[dw] = decAcc * 0.25f; dw = (dw + 1) % int(det.size()); dec = 0; decAcc = 0; }
      if (++hop >= 256) { hop = 0; float target = 1;
        if (amount > 0.01f) { const float hz = detect(); lastHz = hz;
          if (hz > 0) { const float note = 69 + 12 * std::log2(hz / 440.f); int bestN = int(std::lround(note)); float bd = 99;
            for (int c = int(note) - 6; c <= int(note) + 7; c++) if (mask & (1 << (((c % 12) + 12) % 12))) { const float dd = std::fabs(c - note); if (dd < bd) { bd = dd; bestN = c; } }
            target = std::pow(2.f, (bestN - note) / 12.f); } else target = corr; }
        const float speed = amount > 0.01f ? 0.08f + 0.92f * amount * amount : 1; corr += (target - corr) * speed; }
      ratio += (base * corr - ratio) * 0.02f;
      phase += (1 - ratio) / W; if (phase >= 1) phase -= 1; if (phase < 0) phase += 1;
      float oL = 0, oR = 0;
      for (int k = 0; k < 2; k++) { float p = phase + 0.5f * k; if (p >= 1) p -= 1; const float g = std::sin(PI * p); float rp = float(w) - 2 - p * W; while (rp < 0) rp += N;
        const int i0 = int(rp) % N, i1 = (i0 + 1) % N; const float f = rp - i0; oL += (dl[i0] + (dl[i1] - dl[i0]) * f) * g * g; oR += (dr[i0] + (dr[i1] - dr[i0]) * f) * g * g; }
      L[i] = oL; R[i] = oR; if (++w >= N) w = 0;
    }
  }
};

// K-weighted loudness, as streaming services measure it
struct Loudness {
  Biquad s[2], h[2]; double acc = 0; int cnt = 0, blk = 4800; float ring[30] = {0}; int ri = 0, filled = 0; double intSum = 0; long intN = 0;
  std::atomic<float> mom{-70}, shortT{-70}, integ{-70};
  void init(float sr) { for (int c = 0; c < 2; c++) { s[c].highShelf(1681.97f, 4.0f, sr, 0.7072f); h[c].highPass(38.135f, 0.5003f, sr); s[c].reset(); h[c].reset(); } blk = int(sr / 10); reset(); }
  void reset() { acc = 0; cnt = 0; ri = filled = 0; intSum = 0; intN = 0; mom = -70; shortT = -70; integ = -70; }
  static float lufs(double ms) { return ms < 1e-10 ? -70.f : float(-0.691 + 10 * std::log10(ms)); }
  void run(const float* L, const float* R, int n) {
    for (int i = 0; i < n; i++) { const float l = h[0].run(s[0].run(L[i])), r = h[1].run(s[1].run(R[i])); acc += double(l) * l + double(r) * r;
      if (++cnt >= blk) { const float ms = float(acc / cnt); acc = 0; cnt = 0; ring[ri] = ms; ri = (ri + 1) % 30; if (filled < 30) filled++;
        double m4 = 0, m30 = 0; for (int k = 0; k < filled; k++) { const float v = ring[(ri - 1 - k + 60) % 30]; if (k < 4) m4 += v; m30 += v; }
        mom = lufs(m4 / std::min(filled, 4)); shortT = lufs(m30 / filled); if (lufs(ms) > -55) { intSum += ms; intN++; integ = lufs(intSum / intN); } } }
  }
};

// The last stage: holds peaks under the ceiling by looking a few milliseconds ahead.
struct Limiter {
  std::vector<float> L, R; int w = 0, look = 240, hold = 0; float gain = 1, tgt = 1; std::atomic<float> gr{0};
  void init(float sr) { look = int(sr * 0.005f); L.assign(look, 0); R = L; w = 0; gain = 1; }
  void run(float* l, float* r, int n, float ceil, float rel) {
    float minG = 1;
    for (int i = 0; i < n; i++) { const float pk = std::max(std::fabs(l[i]), std::fabs(r[i])); const float need = pk > ceil ? ceil / pk : 1;
      if (need < tgt) { tgt = need; hold = look + 8; } else if (hold > 0) hold--; else tgt += (1 - tgt) * rel;
      gain += (tgt - gain) * (tgt < gain ? 0.2f : 0.05f);
      const float ol = L[w], orr = R[w]; L[w] = l[i]; R[w] = r[i]; if (++w >= look) w = 0;
      const float g = gain; l[i] = clampf(ol * g, -ceil, ceil); r[i] = clampf(orr * g, -ceil, ceil); if (g < minG) minG = g; }
    gr.store(std::max(minG < 1 ? -20 * std::log10(minG) : 0.f, gr.load() * 0.9f));
  }
};
}  // namespace sm
