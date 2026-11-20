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

## Heartstring
The pink **♥ HEART** button on the top screen opens Heartstring, a chain-reaction groove machine. A heart beats once a beat; each drum that fires pulls its strings, and each string has a chance of firing the drum at its other end a few steps later. The top screen shows the heart cut open: the strings are its veins and what moves along them is drawn as blood, running from the core through the veins and down each drum's line into its sound. The bottom screen edits the selected drum (its sound: built-in, one of your samples, or a pad from one of your kits; level; roll chance), its strings (chance, when it fires, which beats it is allowed on) and the machine (tempo, wander, swing, damage, breakdowns). Five styles: Trance, Hard Techno, Hyperpop, House, Garage. LOCK repeats the last four bars exactly; SEND 4 BARS TO SONG writes them into the song as three new tracks of blocks (drums, bass, lead).

Heartstring makes its own sound, separate from the song's mixer: it does not pass through MASTER and is not in an export until you send its bars to the song.

## The ladder

The app is four rungs, left to right, from the whole song down to one sound: **SONG › BLOCK › NOTES › SOUND**. The top screen shows the rung you are on, and a small sword marks where you are. The bottom screen follows the sword: it always shows the controls for whatever it is on.

| Button | Does |
|---|---|
| R1 / L1 | step in / step back out along the ladder |
| D-pad | moves the sword (on SOUND: left and right pick a dial, up and down turn it) |
| A | do: place or open a block, use a version, put a note on or off, hear the sound |
| B | delete (on SOUND: put the dial back) |
| X / Y | copy / paste: a block, a version, a bar of notes, a whole sound |
| Hold A + D-pad | change it: a block's length, a note's pitch or length |
| START | play / pause |
| SELECT | the bottom screen's next page (mixer, master, record, effects) |
| Left stick + A | a pointer for anything on the top screen |
| Left stick click | record |
| Right stick | turns the dial you last touched; click it to undo |
| L2 / R2 | filter and stutter while held |

On the NOTES rung, the keys on the bottom screen and the keys of a connected FM-1 write notes at the sword and step on.

Touch works everywhere as well; the cursor hides when you touch the screen and returns when you move the stick.

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
