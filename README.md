# STRING-R · Stringer Max for the AYN Thor

A pocket music workstation for the Thor's two screens, built to sit beside an M-Vave FM-1 (or a KO II, or a microphone) plugged into the USB-C port.

Alpha 0.2. Every push builds an APK; get it under **Releases → latest → StringerMax.apk**, open it on the Thor and install. It has not been run on a real Thor yet: expect things to fix.

## How a song is built
Like Music 2000: each track is a lane, and you place **blocks** on a timeline that runs left to right with the bars numbered along the top. A block is 1 to 64 bars of notes. Tap a block to pick it, drag it to move it, tap it again (or EDIT NOTES) to open it. The same block can be placed many times; change it once and every copy changes.

## What is in this build
- **Top screen:** SONG (the timeline: stamp, duplicate, split, delete, loop a region), NOTES (inside one block: a step grid for drums, a piano roll for everything else), SAMPLE (the waveform, start and end, slices, the grain window), FILES (your samples, your songs, export).
- **Note tools:** select notes with a box, then octave up/down, note up/down, cut, reverse, copy, delete. Drums: copy and paste a bar, shift, reverse, fill, clear a row. Key lock, chords, automation lanes, swing.
- **Sound sources:** a drum machine with 8 or 16 pads (seven built-in kits, or **your own kit**: any pad can hold your own sample, SAVE KIT keeps it under MY KITS), a synth with four engines (supersaw, bass/808, chip, vox) and 22 sounds, a sampler for your own files (one-shot, loop, slice, clip and **grain**), and MIDI tracks that play the FM-1.
- **Live input:** the FM-1's audio arrives over USB, passes through its own effects channel, and RECORD turns it into a new audio track at the bar where you started.
- **Effects on every track:** drive, crush, low cut, high cut, three-band EQ, delay, reverb, duck-to-kick sidechain, auto-tune and pitch shift. Kick rumble on drum tracks.
- **Mixing and mastering:** mixer, master presets, glue compressor, warmth, width, limiter, a loudness meter in LUFS with a target line, and A/B against a reference song.
- **Performing:** hold-to-play filter, stutter, half speed and tape stop (live only, not recorded).
- **Saving:** projects with autosave and undo, export of the song or of one file per track as 24-bit WAV into `Music/StringerMax`, and bouncing a block to a loop.

Not in this build yet: MP3 export, a video export for TikTok, tempo and key detection of samples, snapping a recorded vocal to the grid, a typed-lyrics singing voice (the VOX engine sings vowels), named sections on the timeline, and moving 3D backdrops (they are stills that pulse with the music).

## Buttons
| Button | Does |
|---|---|
| A | play / pause |
| B | stop (twice: back to the start) |
| X | record what you play into the block |
| Y | undo |
| START | play from the start |
| SELECT | next view on the top screen |
| L1 / R1 | previous / next track |
| L3 / R3 | previous / next block of the track |
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
- `tools/layout_check.py` — opens every screen and reports clipped, off-screen or overlapping text
