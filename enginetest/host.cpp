// Runs the engine on a computer: a line-based host for tests and for previewing the screens.
//   host test <script.smx> <out.wav>   render the song and print checks
//   host serve [script.smx]            read "cmd ...", "state", "meters", "run N", "peaks id bins" lines; answer one line each
#include <chrono>
#include <fstream>
#include <iostream>
#include "sm_engine.h"
using namespace sm;
static std::string slurp(const char* p) { std::ifstream f(p); std::stringstream s; s << f.rdbuf(); return s.str(); }
int main(int argc, char** argv) {
  Engine e(48000); const std::string mode = argc > 1 ? argv[1] : "serve";
  if (mode == "test") {
    e.load(slurp(argv[2])); const std::string d1 = e.dump(); e.load(d1); const std::string d2 = e.dump(); printf("roundtrip %s (%zu bytes)\n", d1 == d2 ? "ok" : "DIFFERS", d1.size());
    std::vector<float> L, R; auto t0 = std::chrono::steady_clock::now(); e.render(0, 0, L, R); const double ms = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t0).count();
    float pk = 0; double sq = 0; bool bad = false; for (size_t i = 0; i < L.size(); i++) { if (!std::isfinite(L[i]) || !std::isfinite(R[i])) bad = true; pk = std::max(pk, std::max(std::fabs(L[i]), std::fabs(R[i]))); sq += L[i] * L[i] + R[i] * R[i]; }
    printf("rendered %.1f s in %.0f ms (%.1fx realtime), peak %.3f, rms %.1f dB, integrated %.1f LUFS, %s\n", L.size() / 48000.0, ms, L.size() / 48.0 / ms, pk, 10 * std::log10(sq / (2 * L.size()) + 1e-12), e.loud.integ.load(), bad ? "NaN FOUND" : "finite");
    if (argc > 3) Engine::writeWav(argv[3], L, R, 48000);
    for (int t = 0; t < e.nT; t++) { std::vector<float> a, b; e.render(2, t, a, b); float p = 0; for (float v : a) p = std::max(p, std::fabs(v)); printf("  track %d %-10s peak %.3f\n", t, e.trk[t]->name.c_str(), p); }
    e.exec("mark"); e.exec("n 0 0 0 24 0 1"); e.exec("undo"); printf("undo %s\n", e.dump() == d2 ? "ok" : "DIFFERS"); std::string st = e.state(); printf("state %zu bytes\n", st.size());
    return bad || d1 != d2;
  }
  if (argc > 2) e.load(slurp(argv[2]));
  std::string line; float l[4096], r[4096];
  while (std::getline(std::cin, line)) {
    std::string out;
    if (line == "state") out = e.state(); else if (line == "meters") out = e.meters();
    else if (line.rfind("run ", 0) == 0) { int n = atoi(line.c_str() + 4); while (n > 0) { const int k = std::min(n, 4096); e.process(l, r, k, nullptr, nullptr); n -= k; } }
    else if (line.rfind("peaks ", 0) == 0) { int id = 0, bins = 0; sscanf(line.c_str() + 6, "%d %d", &id, &bins); out = e.peaks(id, bins); }
    else if (line.rfind("cmd ", 0) == 0) out = e.exec(line.substr(4));
    for (char& c : out) if (c == '\n') c = '\x01';
    std::cout << out << std::endl;
  }
}
