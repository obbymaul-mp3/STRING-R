// Stringer Max: the things that make sound (drum synth, the four synth engines, the sampler).
#pragma once
#include <memory>
#include <string>
#include "sm_dsp.h"

namespace sm {
struct Sample { std::vector<float> L, R; std::string name, path; float rate = 48000; int n() const { return int(L.size()); } };

enum { D_KICK, D_SNARE, D_CLAP, D_CHAT, D_OHAT, D_TOM, D_RIM, D_CRASH, D_RISER, D_SAMPLE, D_COUNT };
struct Pad { int type = D_KICK; float tune = 0.5f, decay = 0.5f, level = 0.8f, pan = 0.5f, tone = 0.5f; int smp = -1; };

struct DrumVoice {
  bool on = false; int type = 0; float t = 0, ph = 0, vel = 1, tune = .5f, decay = .5f, tone = .5f, sr = 48000, mph[6] = {0}; SVF f1, f2; Rng rng; const Sample* smp = nullptr; double sp = 0, srate = 1;
  void trig(const Pad& p, float v, float s, const Sample* sm_) {
    on = true; type = p.type; t = 0; ph = 0; vel = v; tune = p.tune; decay = p.decay; tone = p.tone; sr = s; smp = sm_; sp = 0; f1.reset(); f2.reset();
    if (type == D_SAMPLE) { if (!smp || smp->n() < 2) { on = false; return; } srate = std::pow(2.0, (tune - 0.5) * 2.0) * smp->rate / sr; }
    if (type == D_SNARE) f1.set(1200 + tone * 3000, 0.7f, sr); if (type == D_CLAP) f1.set(900 + tune * 1400, 1.6f, sr);
    if (type == D_CHAT || type == D_OHAT) f1.set(6000 + tone * 4000, 0.8f, sr); if (type == D_CRASH) f1.set(3000 + tone * 4000, 0.7f, sr); if (type == D_RIM) f1.set(700 + tune * 1600, 3, sr);
  }
  inline float metal(float base) { static const float r[6] = {1, 1.342f, 1.2312f, 1.6532f, 1.9523f, 2.1523f}; float s = 0; for (int k = 0; k < 6; k++) { mph[k] += base * r[k] / sr; if (mph[k] >= 1) mph[k] -= 1; s += mph[k] < 0.5f ? 1.f : -1.f; } return s / 6; }
  // one sample, mono (stereo samples are returned through l and r)
  inline void tick(float& l, float& r) {
    const float sec = t / sr; t += 1; float o = 0;
    switch (type) {
      case D_KICK: { const float f0 = 38 + tune * 45, f = f0 + f0 * (3 + tone * 9) * std::exp(-sec / 0.022f) + f0 * 0.6f * std::exp(-sec / 0.12f), tau = 0.07f + decay * decay * 0.9f;
        ph += f / sr; if (ph >= 1) ph -= 1; const float env = std::exp(-sec / tau); o = std::sin(2 * PI * ph) * env; if (sec < 0.004f) o += rng.bi() * tone * 0.5f * (1 - sec / 0.004f);
        o = fastTanh(o * (1.2f + tone * 3)) * 0.95f; if (env < 0.0008f) on = false; break; }
      case D_SNARE: { const float f = 150 + tune * 130 + 120 * std::exp(-sec / 0.012f); ph += f / sr; if (ph >= 1) ph -= 1; const float tau = 0.05f + decay * 0.35f, en = std::exp(-sec / tau), et = std::exp(-sec / (0.04f + decay * 0.1f));
        o = std::sin(2 * PI * ph) * et * 0.7f + f1.hp(rng.bi()) * en * (0.5f + tone * 0.7f); if (en < 0.0008f) on = false; break; }
      case D_CLAP: { const float tau = 0.06f + decay * 0.4f; float env = sec < 0.03f ? std::exp(-std::fmod(sec, 0.01f) / 0.004f) : std::exp(-(sec - 0.03f) / tau);
        o = f1.bp(rng.bi()) * env * 2.2f; if (sec > 0.03f && env < 0.0008f) on = false; break; }
      case D_CHAT: case D_OHAT: { const float tau = type == D_CHAT ? 0.012f + decay * 0.08f : 0.08f + decay * 0.7f, env = std::exp(-sec / tau);
        o = f1.hp(metal(300 + tune * 500) * 0.7f + rng.bi() * 0.5f) * env * 1.1f; if (env < 0.0008f) on = false; break; }
      case D_TOM: { const float f0 = 70 + tune * 220, f = f0 * (1 + 1.2f * std::exp(-sec / 0.03f)); ph += f / sr; if (ph >= 1) ph -= 1; const float env = std::exp(-sec / (0.08f + decay * 0.5f));
        o = std::sin(2 * PI * ph) * env; if (env < 0.0008f) on = false; break; }
      case D_RIM: { const float b = 420 + tune * 500; ph += b / sr; if (ph >= 1) ph -= 1; mph[0] += b * 1.48f / sr; if (mph[0] >= 1) mph[0] -= 1; const float env = std::exp(-sec / (0.015f + decay * 0.3f));
        o = f1.bp((ph < 0.5f ? 1.f : -1.f) + (mph[0] < 0.5f ? 1.f : -1.f)) * env * 0.9f; if (env < 0.0008f) on = false; break; }
      case D_CRASH: { const float env = std::exp(-sec / (0.4f + decay * 2.6f)); o = f1.hp(metal(380 + tune * 300) * 0.6f + rng.bi() * 0.6f) * env * 0.8f; if (env < 0.0008f) on = false; break; }
      case D_RISER: { const float dur = 0.5f + decay * 15.5f, x = sec / dur; if (x >= 1) { on = false; break; } if ((int(t) & 15) == 1) f1.set(200 * std::pow(40.f, x * (0.5f + tone * 0.5f)), 2.5f, sr);
        ph += (110 + tune * 220) * std::pow(4.f, x) / sr; if (ph >= 1) ph -= 1; o = (f1.bp(rng.bi()) * 1.4f + (2 * ph - 1) * 0.12f) * x * x * std::min(1.f, (1 - x) * 60); break; }
      case D_SAMPLE: { const int i0 = int(sp), N = smp->n(); if (i0 >= N - 1) { on = false; break; } const float f = float(sp - i0); const float tau = decay > 0.98f ? 1e9f : 0.03f + decay * decay * 3;
        const float env = std::exp(-sec / tau); l = (smp->L[i0] + (smp->L[i0 + 1] - smp->L[i0]) * f) * env * vel; r = (smp->R[i0] + (smp->R[i0 + 1] - smp->R[i0]) * f) * env * vel; sp += srate; if (env < 0.0008f) on = false; return; }
    }
    l = r = o * vel;
  }
};

struct SynthVoice {
  bool on = false; int pitch = 60, stage = 0, gate = -1, vowel = 0; float vel = 1, freq = 440, tfreq = 440, aenv = 0, fenv = 0, age = 0; double ph[7] = {0}, sub = 0; SVF fl, fr, fm[3]; uint32_t order = 0; float tri = 0;
};

struct SampVoice {
  bool on = false; int pitch = 60, stage = 0, gate = -1; float vel = 1, aenv = 0; double pos = 0, rate = 1, start = 0, end = 0, adv = 1; bool loop = false, stretch = false, rev = false, oneshot = false; uint32_t order = 0;
  double gb[2] = {0, 0}; float gp[2] = {0, 0.5f}; std::shared_ptr<Sample> s;
};

inline float polyblep(double t, double dt) { if (t < dt) { t /= dt; return float(t + t - t * t - 1); } if (t > 1 - dt) { t = (t - 1) / dt; return float(t * t + t + t + 1); } return 0; }
}  // namespace sm
