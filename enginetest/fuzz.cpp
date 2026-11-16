// Throws thousands of random commands at the engine while it plays, to shake out crashes. Build with -fsanitize=address,undefined.
#include <fstream>
#include <iostream>
#include "sm_engine.h"
using namespace sm;
static std::string slurp(const char* p) { std::ifstream f(p); std::stringstream s; s << f.rdbuf(); return s.str(); }
int main(int argc, char** argv) {
  Engine e(argc > 3 ? atof(argv[3]) : 48000); e.load(slurp(argv[1])); Rng r; r.s = argc > 2 ? atoi(argv[2]) : 7; auto R = [&](int n) { return int(r.uni() * n); };
  for (int k = 0; k < 3; k++) { auto s = std::make_shared<Sample>(); const int n = k == 0 ? 3 : 2000 + R(90000); s->L.resize(n); s->R.resize(n); for (int i = 0; i < n; i++) s->L[i] = s->R[i] = std::sin(i * 0.03f * (k + 1)) * 0.5f; s->rate = k == 2 ? 44100 : 48000; s->name = "S" + std::to_string(k); e.addSample(s); }
  float l[512], rr[512], il[512], ir[512]; for (int i = 0; i < 512; i++) { il[i] = std::sin(i * 0.05f) * 0.4f; ir[i] = il[i]; } char b[200]; long cmds = 0; double peak = 0;
  const char* pf[] = {"type", "tune", "decay", "level", "pan", "tone", "smp"};
  for (int it = 0; it < 6000; it++) {
    const int n = 1 + R(12);
    for (int k = 0; k < n; k++) { const int t = R(19) - 1, p = R(34) - 1; b[0] = 0;
      const int bk = R(8) - 1;
      switch (R(44)) {
        case 0: snprintf(b, sizeof b, "p %d %d %.3f", t, R(40) - 2, r.uni() * 1.4f - 0.2f); break; case 1: snprintf(b, sizeof b, "non %d %d %.2f", t, R(140) - 6, r.uni()); break; case 2: snprintf(b, sizeof b, "noff %d %d", t, R(140) - 6); break;
        case 3: snprintf(b, sizeof b, "n %d %d %d %d %d %.2f", t, bk, R(3400) - 100, R(900) - 50, R(140) - 6, r.uni()); break; case 4: snprintf(b, sizeof b, "nd %d %d %d %d", t, bk, R(3200), R(128)); break;
        case 5: snprintf(b, sizeof b, "trk add %d", R(5)); break; case 6: if (R(6) == 0) snprintf(b, sizeof b, "trk del %d", t); break; case 7: snprintf(b, sizeof b, "trk eng %d %d", t, R(6)); break; case 8: snprintf(b, sizeof b, "trk smp %d %d", t, R(6) - 2); break;
        case 9: snprintf(b, sizeof b, "pad %d %d %s %.2f", t, R(19) - 1, pf[R(7)], r.uni() * 14 - 1); break; case 10: snprintf(b, sizeof b, "blk add %d %d", t, R(70) - 2); break; case 11: snprintf(b, sizeof b, "blk bars %d %d %d", t, bk, R(70) - 2); break;
        case 12: snprintf(b, sizeof b, "bpm %d", 20 + R(260)); break; case 13: snprintf(b, sizeof b, "swing %.2f", r.uni() * 1.3f); break; case 14: snprintf(b, sizeof b, R(2) ? "play" : "stop"); break; case 15: snprintf(b, sizeof b, "mode %d %d", R(2), R(12) - 2); break;
        case 16: snprintf(b, sizeof b, "pl add %d %d %d", t, R(40) - 2, bk); break; case 17: snprintf(b, sizeof b, "pl del %d %d", t, R(40) - 2); break; case 18: snprintf(b, sizeof b, "seek %d", R(40) - 2); break; case 19: snprintf(b, sizeof b, "m %d %.2f", R(18) - 1, r.uni() * 1.2f - 0.1f); break;
        case 20: snprintf(b, sizeof b, "perf %d %.2f", R(5), r.uni()); break; case 21: snprintf(b, sizeof b, "au %d %d %d %d %.2f", t, bk, R(40) - 2, R(1100) - 5, r.uni() * 1.2f - 0.3f); break; case 22: snprintf(b, sizeof b, "mark"); break; case 23: snprintf(b, sizeof b, R(2) ? "undo" : "redo"); break;
        case 24: snprintf(b, sizeof b, "blk copy %d %d", t, bk); break; case 25: snprintf(b, sizeof b, "blk double %d %d", t, bk); break; case 26: if (R(4) == 0) snprintf(b, sizeof b, "blk del %d %d", t, bk); break; case 27: snprintf(b, sizeof b, "rec %d", R(2)); break;
        case 28: snprintf(b, sizeof b, "inmon %d", R(2)); break; case 29: snprintf(b, sizeof b, "key %d %d", R(14) - 1, R(10) - 1); break; case 30: snprintf(b, sizeof b, "trk mute %d %d", t, R(2)); break; case 31: snprintf(b, sizeof b, "trk solo %d %d", t, R(2)); break;
        case 32: snprintf(b, sizeof b, "nudge %d %d %.2f", t, R(40) - 2, r.bi()); break; case 33: snprintf(b, sizeof b, "ref %d %d", R(5) - 1, R(2)); break; case 34: snprintf(b, sizeof b, "sel k%d %d", R(4), R(9)); break; case 35: snprintf(b, sizeof b, "trk type %d %d", t, R(4)); break;
        case 36: snprintf(b, sizeof b, "nshift %d %d %d", t, bk, R(60) - 30); break; case 37: snprintf(b, sizeof b, "metro %d", R(2)); break; case 38: snprintf(b, sizeof b, "nclear %d %d %d", t, bk, R(2)); break;
        case 39: snprintf(b, sizeof b, "blk split %d %d %d", t, bk, R(10) - 1); break; case 40: snprintf(b, sizeof b, "ed %d %d", t, bk); break; case 41: snprintf(b, sizeof b, "pl move %d %d %d", t, R(40) - 2, R(40) - 2); break; case 42: snprintf(b, sizeof b, "pl dup %d %d", t, R(40)); break;
        default: snprintf(b, sizeof b, "loop %d %d %d", R(2), R(30) - 2, R(40) - 2); }
      if (b[0]) { e.exec(b); cmds++; } }
    if (R(300) == 0) { e.recL.assign(48000, 0); e.recR.assign(48000, 0); e.recN = 0; e.recAudio = true; } if (R(200) == 0) e.recAudio = false;
    if (R(400) == 0) { std::vector<float> L, Rr; e.exec("bpm 170"); for (int q = 0; q < e.nT; q++) { auto& pl = e.trk[q]->pl; pl.erase(std::remove_if(pl.begin(), pl.end(), [](const Place& x) { return x.bar > 12; }), pl.end()); } e.render(R(3), R(4), L, Rr); e.exec("kitdump 0"); }
    if (R(500) == 0) { e.load(e.dump()); }
    if (R(40) == 0) { e.state(); e.meters(); e.peaks(R(4), 50); }
    const int fr = 1 + R(512); e.process(l, rr, fr, R(3) ? il : nullptr, ir);
    for (int i = 0; i < fr; i++) { if (!std::isfinite(l[i]) || !std::isfinite(rr[i])) { printf("NaN at iteration %d after '%s'\n", it, b); return 1; } peak = std::max<double>(peak, std::max(std::fabs(l[i]), std::fabs(rr[i]))); }
  }
  printf("fuzz ok: %ld commands, %d tracks, peak %.3f\n", cmds, e.nT, peak); return 0;
}
