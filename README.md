# STRING-R · Stringer Max for the AYN Thor

A pocket music workstation for the Thor's two screens, built to sit beside an M-Vave FM-1 (or a KO II, or a microphone) plugged into the USB-C port.

Build 0.1. Every push builds an APK; get it under **Releases → latest → StringerMax.apk**, open it on the Thor and install.

## What is in this build
- **Sound sources:** a drum synth (seven kits: trance, techno, hard, house, UK garage, hyperpop, 8-bit), a synth with four engines (supersaw, bass/808, chip, vox) and 22 sounds, a sampler for your own files, and MIDI tracks that play the FM-1.
- **Writing:** 32 patterns of 1 to 8 bars, a step grid for drums, a piano roll with key lock and chords, an arpeggiator, automation lanes, swing, and a song made by chaining patterns.
- **Live input:** the FM-1's audio arrives over USB, passes through its own effects channel, and RECORD turns it into a new audio track you can cut, loop, slice or stretch to the tempo.
- **Effects on every track:** drive, crush, low cut, high cut, three-band EQ, delay, reverb, duck-to-kick sidechain, auto-tune and pitch shift. Kick rumble on drum tracks.
- **Mixing and mastering:** mixer, master presets, glue compressor, warmth, width, limiter, a loudness meter in LUFS with a target line, and A/B against a reference song.
- **Performing:** hold-to-play filter, stutter, half speed and tape stop.
- **Saving:** projects with autosave and undo, export of the song or of one file per track as 24-bit WAV into `Music/StringerMax`, and bouncing a pattern to a loop.

Not in this build yet: MP3 export, a video export for TikTok, tempo and key detection of samples, snapping a recorded vocal to the grid, and a typed-lyrics singing voice (the VOX engine sings vowels).

## Buttons
| Button | Does |
|---|---|
| A | play / pause |
| B | stop (twice: back to the start) |
| X | record what you play into the pattern |
| Y | undo |
| START | play from the start |
| SELECT | next view on the top screen |
| L1 / R1 | previous / next track |
| L3 / R3 | previous / next pattern |
| L2 | filter sweep while held |
| R2 | stutter while held |
| D-pad | move around the notes |
| Left stick | level and pan of the selected track |
| Right stick | turns the knob you last touched |

## Getting your samples on
Plug the Thor into the Mac, copy sample folders into the Thor's `Music` folder, then open FILES on the top screen. WAV, AIFF, MP3, FLAC, OGG and M4A load.

## Layout
- `app/src/main/cpp/engine` — the audio engine (C++): instruments, sequencer, effects, master
- `app/src/main/cpp/native.cpp` — audio in and out (Oboe) and the bridge to the app
- `app/src/main/java` — the app: screens, buttons, MIDI, files, projects, export
- `app/src/main/assets/ui` — what the two screens show
- `app/src/main/assets/*.smx` — the demo song and the blank song (made by `tools/mkdemo.js`)
- `enginetest/host.cpp` — runs the engine on a computer: `host test song.smx out.wav`
- `tools/dev.js` — previews both screens in a browser against the real engine
