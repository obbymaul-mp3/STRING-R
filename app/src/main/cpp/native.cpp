// Stringer Max on Android: the audio device (Oboe) around the engine, and the bridge to Kotlin.
#include <jni.h>
#include <android/log.h>
#include <oboe/Oboe.h>
#include <atomic>
#include <chrono>
#include <cmath>
#include <cstring>
#include <memory>
#include <mutex>
#include <string>
#include <thread>
#include <vector>
#include "sm_engine.h"

#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, "StringerMax", __VA_ARGS__)
using namespace sm;

namespace {
constexpr int CHUNK = 1024;

class Audio : public oboe::AudioStreamDataCallback, public oboe::AudioStreamErrorCallback {
 public:
  std::unique_ptr<Engine> engine; std::string pendingProject;
  std::shared_ptr<oboe::AudioStream> out, in; std::atomic<oboe::AudioStream*> inLive{nullptr}; std::mutex ctl;   // ctl guards every call that is not the audio callback
  std::atomic<bool> wantInput{false}, running{false}; std::atomic<int> inFrames{0}, misses{0};
  float oL[CHUNK], oR[CHUNK], iL[CHUNK], iR[CHUNK]; std::vector<float> inBuf; int inCh = 0; std::atomic<int> inDevice{0};
  double sr = 48000; bool outI16 = false; const char* outName = "";

  // Three ways of asking for the output. The first that gives a small block wins; otherwise the smallest block does.
  bool openOut() {
    struct Try { oboe::AudioApi api; oboe::AudioFormat fmt; const char* name; };
    const Try tries[3] = {{oboe::AudioApi::AAudio, oboe::AudioFormat::Float, "AAudio float"}, {oboe::AudioApi::AAudio, oboe::AudioFormat::I16, "AAudio 16-bit"}, {oboe::AudioApi::OpenSLES, oboe::AudioFormat::I16, "OpenSL"}};
    int best = -1, bestBurst = 1 << 30;
    for (int pass = 0; pass < 2; pass++) {
      for (int k = 0; k < 3; k++) {
        if (pass == 1 && k != best) continue;
        oboe::AudioStreamBuilder b;
        b.setAudioApi(tries[k].api)->setDirection(oboe::Direction::Output)->setPerformanceMode(oboe::PerformanceMode::LowLatency)->setSharingMode(oboe::SharingMode::Exclusive)
            ->setFormat(tries[k].fmt)->setFormatConversionAllowed(false)->setChannelCount(2)->setUsage(oboe::Usage::Game)->setDataCallback(this)->setErrorCallback(this);
        std::shared_ptr<oboe::AudioStream> s;
        if (b.openStream(s) != oboe::Result::OK) continue;
        const int burst = s->getFramesPerBurst(); LOGI("output try %s: %d Hz, block %d", tries[k].name, s->getSampleRate(), burst);
        if (pass == 1 || burst <= 480) { out = s; outI16 = s->getFormat() == oboe::AudioFormat::I16; outName = tries[k].name; out->setBufferSizeInFrames(burst * 2); sr = out->getSampleRate(); return true; }
        if (burst < bestBurst) { bestBurst = burst; best = k; }
        s->close();
      }
      if (best < 0) break;
    }
    return false;
  }
  bool openIn() {
    closeIn();
    oboe::AudioStreamBuilder b;
    b.setDirection(oboe::Direction::Input)->setPerformanceMode(oboe::PerformanceMode::LowLatency)->setSharingMode(oboe::SharingMode::Shared)
        ->setFormat(oboe::AudioFormat::Float)->setChannelCount(2)->setSampleRate(int(sr))->setSampleRateConversionQuality(oboe::SampleRateConversionQuality::Medium)
        ->setChannelConversionAllowed(true)->setFormatConversionAllowed(true)->setInputPreset(oboe::InputPreset::Unprocessed);
    if (inDevice.load() > 0) b.setDeviceId(inDevice.load());   // a USB device chosen by the app (the FM-1, the KO II), instead of whatever Android prefers
    std::shared_ptr<oboe::AudioStream> s; oboe::Result r = b.openStream(s);
    if (r != oboe::Result::OK) { b.setChannelCount(oboe::ChannelCount::Unspecified); r = b.openStream(s); }   // a multi-channel USB device: take it as it is and use its first two channels
    if (r != oboe::Result::OK) { LOGI("input failed: %s", oboe::convertToText(r)); return false; }
    inCh = s->getChannelCount(); inBuf.assign(size_t(CHUNK) * 4 * std::max(1, inCh), 0.f); s->requestStart(); in = s; inLive.store(s.get());
    LOGI("input %d Hz, %d ch, device %d", s->getSampleRate(), inCh, s->getDeviceId());
    return true;
  }
  // the callback may be reading from the input right now: hide it first, give the callback a moment, then close
  void closeIn() { if (!in) return; inLive.store(nullptr); std::this_thread::sleep_for(std::chrono::milliseconds(40)); in->stop(); in->close(); in.reset(); }
  bool start() {
    std::lock_guard<std::mutex> g(ctl);
    if (running) return true;
    if (!openOut()) return false;
    if (!engine || std::abs(sr - engine->sr) > 1) {   // a new sample rate means a new engine: carry the project across
      std::string keep = engine ? engine->dump() : pendingProject; std::vector<std::shared_ptr<Sample>> smp; if (engine) smp = engine->smp;
      engine.reset(new Engine(float(sr))); if (!keep.empty()) engine->load(keep); for (size_t i = 0; i < smp.size(); i++) if (smp[i] && smp[i]->n() > 0) engine->addSample(smp[i], int(i)); }
    if (wantInput) openIn();
    running = out->requestStart() == oboe::Result::OK; return running;
  }
  void stop() {
    std::lock_guard<std::mutex> g(ctl); running = false;
    if (out) { out->stop(); out->close(); out.reset(); } closeIn();
  }

  oboe::DataCallbackResult onAudioReady(oboe::AudioStream*, void* data, int32_t frames) override {
    float* o = static_cast<float*>(data); int16_t* o16 = static_cast<int16_t*>(data); Engine* e = engine.get(); const auto t0 = std::chrono::steady_clock::now();
    // the screens change the song under a lock; wait a moment for it rather than click, and stay silent while a song is being exported
    bool have = false; if (e && !e->offline.load()) { for (int tries = 0; tries < 400 && !(have = e->mx.try_lock()); tries++) { if (tries > 20) std::this_thread::yield(); } if (!have) misses++; }
    int done = 0;
    while (done < frames) {
      const int n = std::min(CHUNK, frames - done); bool haveIn = false;
      oboe::AudioStream* is = inLive.load(std::memory_order_acquire);
      if (is && inCh > 0) {
        auto r = is->read(inBuf.data(), n, 0);
        const int got = r ? r.value() : 0;
        if (got > 0) { haveIn = true; inFrames += got;
          for (int i = 0; i < n; i++) { if (i < got) { iL[i] = inBuf[size_t(i) * inCh]; iR[i] = inCh > 1 ? inBuf[size_t(i) * inCh + 1] : iL[i]; } else { iL[i] = iR[i] = 0; } }
          // if the input has piled up (clocks drift), drop the backlog so the delay never grows
          auto av = is->getAvailableFrames(); if (av && av.value() > 6 * frames) is->read(inBuf.data(), std::min<int>(av.value() - 2 * frames, CHUNK * 4), 0);
        }
      }
      if (have) e->process(oL, oR, n, haveIn ? iL : nullptr, haveIn ? iR : nullptr); else { std::memset(oL, 0, sizeof(float) * n); std::memset(oR, 0, sizeof(float) * n); }
      if (outI16) for (int i = 0; i < n; i++) { o16[2 * (done + i)] = int16_t(std::lrintf(std::fmax(-1.f, std::fmin(1.f, oL[i])) * 32767.f)); o16[2 * (done + i) + 1] = int16_t(std::lrintf(std::fmax(-1.f, std::fmin(1.f, oR[i])) * 32767.f)); }
      else for (int i = 0; i < n; i++) { o[2 * (done + i)] = oL[i]; o[2 * (done + i) + 1] = oR[i]; }
      done += n;
    }
    if (have) { const double used = std::chrono::duration<double>(std::chrono::steady_clock::now() - t0).count(), avail = frames / sr; e->cpu.store(float(e->cpu.load() * 0.9 + 0.1 * used / avail)); e->mx.unlock(); }
    return oboe::DataCallbackResult::Continue;
  }
  // headphones or a USB device plugged or unplugged: the stream dies and we open a fresh one on the new route
  void onErrorAfterClose(oboe::AudioStream* s, oboe::Result r) override {
    LOGI("stream closed: %s", oboe::convertToText(r));
    if (s->getDirection() == oboe::Direction::Output && running) { running = false; std::thread([this] { { std::lock_guard<std::mutex> g(ctl); out.reset(); } start(); }).detach(); }
  }
};
Audio A;
int bounceCount = 0, takeCount = 0;

std::string jstr(JNIEnv* env, jstring s) { if (!s) return ""; const char* c = env->GetStringUTFChars(s, nullptr); std::string o(c ? c : ""); if (c) env->ReleaseStringUTFChars(s, c); return o; }
// Java's modified UTF-8 cannot carry every byte sequence: build the string from bytes instead
jstring jout(JNIEnv* env, const std::string& s) {
  jbyteArray b = env->NewByteArray(jsize(s.size())); env->SetByteArrayRegion(b, 0, jsize(s.size()), reinterpret_cast<const jbyte*>(s.data()));
  jclass cls = env->FindClass("java/lang/String"); jmethodID ctor = env->GetMethodID(cls, "<init>", "([BLjava/lang/String;)V"); jstring enc = env->NewStringUTF("UTF-8");
  jstring r = static_cast<jstring>(env->NewObject(cls, ctor, b, enc)); env->DeleteLocalRef(b); env->DeleteLocalRef(enc); env->DeleteLocalRef(cls); return r;
}
std::shared_ptr<Sample> makeSample(JNIEnv* env, jstring name, jstring path, jfloatArray l, jfloatArray r, jint rate) {
  auto s = std::make_shared<Sample>(); s->name = jstr(env, name); s->path = jstr(env, path); s->rate = float(rate); const jsize n = env->GetArrayLength(l);
  s->L.resize(n); s->R.resize(n); env->GetFloatArrayRegion(l, 0, n, s->L.data()); env->GetFloatArrayRegion(r, 0, std::min(n, env->GetArrayLength(r)), s->R.data()); return s;
}
}  // namespace

#define JNI(ret, name) extern "C" JNIEXPORT ret JNICALL Java_com_stringer_max_Native_##name
#define ENG(fail) Engine* e = A.engine.get(); if (!e) return fail

JNI(jboolean, start)(JNIEnv*, jobject) { return A.start(); }
JNI(void, stop)(JNIEnv*, jobject) { A.stop(); }
JNI(jboolean, openInput)(JNIEnv*, jobject, jint device) { A.wantInput = true; A.inDevice = device; std::lock_guard<std::mutex> g(A.ctl); return A.running ? A.openIn() : true; }
JNI(jstring, cmd)(JNIEnv* env, jobject, jstring line) { ENG(env->NewStringUTF("")); if (e->offline.load()) return env->NewStringUTF(""); const std::string c = jstr(env, line); std::lock_guard<std::mutex> g(e->mx); return jout(env, e->exec(c)); }
JNI(jstring, state)(JNIEnv* env, jobject, jint known) { ENG(env->NewStringUTF("")); if (e->offline.load() || e->version.load() == known) return env->NewStringUTF(""); std::lock_guard<std::mutex> g(e->mx); return jout(env, e->state()); }
JNI(jstring, meters)(JNIEnv* env, jobject) { ENG(env->NewStringUTF("")); if (e->offline.load()) return env->NewStringUTF(""); return jout(env, e->meters()); }
JNI(jint, edits)(JNIEnv*, jobject) { ENG(0); return e->edits.load(); }
JNI(jstring, dump)(JNIEnv* env, jobject) { ENG(env->NewStringUTF("")); std::lock_guard<std::mutex> g(e->mx); return jout(env, e->dump()); }
JNI(void, loadProject)(JNIEnv* env, jobject, jstring text) { const std::string t = jstr(env, text); Engine* e = A.engine.get(); if (!e) { A.pendingProject = t; return; } std::lock_guard<std::mutex> g(e->mx); e->load(t); e->undoS.clear(); e->redoS.clear(); }
// the samples a loaded project names but whose sound is not in memory yet: "id<TAB>path" lines
JNI(jstring, missing)(JNIEnv* env, jobject) { ENG(env->NewStringUTF("")); std::lock_guard<std::mutex> g(e->mx); std::string o; for (size_t i = 0; i < e->smp.size(); i++) if (e->smp[i] && e->smp[i]->n() == 0) { o += std::to_string(i) + "\t" + e->smp[i]->path + "\n"; } return jout(env, o); }
JNI(jint, addSample)(JNIEnv* env, jobject, jstring name, jstring path, jfloatArray l, jfloatArray r, jint rate) { ENG(-1); auto s = makeSample(env, name, path, l, r, rate); std::lock_guard<std::mutex> g(e->mx); const std::string p = s->path; if (!p.empty()) for (size_t i = 0; i < e->smp.size(); i++) if (e->smp[i] && e->smp[i]->path == p && e->smp[i]->n() > 0) return jint(i); return e->addSample(s); }
JNI(void, fillSample)(JNIEnv* env, jobject, jint id, jfloatArray l, jfloatArray r, jint rate) { ENG(); auto s = makeSample(env, nullptr, nullptr, l, r, rate); std::lock_guard<std::mutex> g(e->mx); auto old = e->getSmp(id); if (old) { s->name = old->name; s->path = old->path; } e->addSample(s, id); }
JNI(jstring, peaks)(JNIEnv* env, jobject, jint id, jint bins) { ENG(env->NewStringUTF("")); if (e->offline.load()) return env->NewStringUTF(""); std::lock_guard<std::mutex> g(e->mx); return jout(env, e->peaks(id, bins)); }
JNI(void, preview)(JNIEnv* env, jobject, jfloatArray l, jfloatArray r, jint rate) { ENG(); auto s = makeSample(env, nullptr, nullptr, l, r, rate); std::lock_guard<std::mutex> g(e->mx); e->pre = s; e->prePos = 0; e->preOn = s->n() > 2; }
// the reference track: loaded like a sample, levelled so it compares fairly with your master
JNI(void, setReference)(JNIEnv* env, jobject, jint id) { ENG(); std::lock_guard<std::mutex> g(e->mx); auto s = e->getSmp(id); if (!s || s->n() < 1000) return; double sq = 0; const int n = s->n(), st = std::max(1, n / 400000); long c = 0; for (int i = 0; i < n; i += st) { sq += s->L[i] * s->L[i] + s->R[i] * s->R[i]; c += 2; }
  const double rms = std::sqrt(sq / std::max(1L, c)); e->refId = id; e->refGain = float(std::min(2.0, std::max(0.25, 0.18 / std::max(1e-4, rms)))); e->refPos = 0; e->version++; }
JNI(jboolean, recStart)(JNIEnv*, jobject) { ENG(false); std::lock_guard<std::mutex> g(e->mx); if (e->recAudio.load()) return true; const size_t cap = size_t(e->sr * 300); try { e->recL.assign(cap, 0); e->recR.assign(cap, 0); } catch (...) { return false; }
  e->recN = 0; e->recTick = e->playing ? int(e->tick / TPS) * TPS : 0; e->recPat = e->curPat; e->recAudio = true; return true; }
// RECORD stops: the take becomes a sample on a new track, placed where recording began, with the input's effects copied across
JNI(jint, recStop)(JNIEnv* env, jobject, jstring path) { ENG(-1); const std::string p = jstr(env, path); std::lock_guard<std::mutex> g(e->mx); if (!e->recAudio.load()) return -1; e->recAudio = false; const size_t n = e->recN; if (n < size_t(e->sr * 0.15)) { e->recL.clear(); e->recR.clear(); e->recL.shrink_to_fit(); e->recR.shrink_to_fit(); return -1; }
  auto s = std::make_shared<Sample>(); s->L.assign(e->recL.begin(), e->recL.begin() + n); s->R.assign(e->recR.begin(), e->recR.begin() + n); e->recL.clear(); e->recR.clear(); e->recL.shrink_to_fit(); e->recR.shrink_to_fit(); e->recN = 0;
  s->rate = e->sr; s->name = "TAKE " + std::to_string(++takeCount); s->path = p; Engine::writeWav(p, s->L, s->R, int(e->sr)); e->mark(); const int id = e->addSample(s); const int t = e->addTrack(T_SAMPLER);
  if (t >= 0) { Track& T = *e->trk[t]; T.name = s->name; T.smp = id; for (int i = 1; i < I0; i++) T.P[i] = e->inP[i]; T.P[I0 + 6] = 1; T.P[I0 + 5] = 1; T.P[I0 + 9] = 60 / 127.f;
    const int len = std::max(TPS, int(n / e->tickSamples())); e->addNote(e->recPat, t, std::min(e->recTick, e->pat[e->recPat].len() - TPS), len, 60, 1); e->sel["track"] = t; }
  e->version++; e->edits++; return id; }
// mode 0 song, 1 pattern as a loop (also becomes a sample), 2 one track of the song. Returns the new sample's number for mode 1, otherwise 1 for success.
JNI(jint, render)(JNIEnv* env, jobject, jstring path, jint mode, jint arg) { ENG(0); const std::string p = jstr(env, path); e->offline = true; std::vector<float> L, R; int res = 0;
  { std::lock_guard<std::mutex> g(e->mx); if (e->render(mode, arg, L, R) && Engine::writeWav(p, L, R, int(e->sr))) { res = 1;
      if (mode == 1) { auto s = std::make_shared<Sample>(); s->L = std::move(L); s->R = std::move(R); s->rate = e->sr; s->name = "BOUNCE " + std::to_string(++bounceCount); s->path = p; res = e->addSample(s); e->edits++; } } }
  e->offline = false; return res; }
JNI(jintArray, midiPoll)(JNIEnv* env, jobject) { ENG(nullptr); const int w = e->mqW.load(), r = e->mqR.load(); int n = w - r; if (n <= 0) return nullptr; if (n > 256) n = 256; jint buf[256]; for (int i = 0; i < n; i++) buf[i] = jint(e->mq[(r + i) & 511]); e->mqR.store(r + n); jintArray a = env->NewIntArray(n); env->SetIntArrayRegion(a, 0, n, buf); return a; }
JNI(jstring, info)(JNIEnv* env, jobject) {
  std::string t = "audio off"; std::lock_guard<std::mutex> g(A.ctl);
  if (A.out) { char b[256]; const double ms = 1000.0 * A.out->getBufferSizeInFrames() / A.out->getSampleRate();
    snprintf(b, sizeof b, "%d Hz · block %d · buffer %.0f ms · %s · %s · input %s", A.out->getSampleRate(), A.out->getFramesPerBurst(), ms,
             A.out->getPerformanceMode() == oboe::PerformanceMode::LowLatency ? "fast" : "slow path", A.outName, A.in ? (A.inFrames.load() > 0 ? "running" : "open, silent") : "off"); t = b; }
  return env->NewStringUTF(t.c_str());
}
