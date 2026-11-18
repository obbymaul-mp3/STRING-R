package com.stringer.max

import android.content.ContentValues
import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.media.midi.MidiDevice
import android.media.midi.MidiDeviceInfo
import android.media.midi.MidiInputPort
import android.media.midi.MidiManager
import android.media.midi.MidiReceiver
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.view.InputDevice
import android.view.KeyEvent
import android.view.MotionEvent
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.abs
import kotlin.math.max

/** Everything both screens, the buttons and MIDI share: projects, files, recording, export. The song itself lives in the engine. */
object Studio {
    private var app: Context? = null
    private var booted = false
    private var visible = 0
    private val main = Handler(Looper.getMainLooper())
    @Volatile var notice = ""; private var noticeUntil = 0L
    @Volatile var busy = ""            // what a long job is doing ("EXPORTING"), shown on both screens
    @Volatile var recording = false
    @Volatile var micOk = false
    @Volatile var inputName = "built-in microphone"; @Volatile var usbInput = false
    @Volatile var midiName = ""
    @Volatile var project = ""
    @Volatile var selTrack = 0
    @Volatile var focus = ""           // the knob the right stick turns: "p 3 2" or "m 4"
    var picker: ((String) -> Unit)? = null
    var askStorage: (() -> Unit)? = null

    fun say(t: String) { notice = t; noticeUntil = System.currentTimeMillis() + 3500 }
    private fun q(s: String): String { val sb = StringBuilder("\""); for (c in s) { if (c == '"' || c == '\\') sb.append('\\'); if (c >= ' ') sb.append(c) }; sb.append('"'); return sb.toString() }

    // ---------------------------------------------------------------- folders
    private fun base(): File { val c = app!!; return c.getExternalFilesDir(null) ?: c.filesDir }
    private fun dir(name: String): File { val d = File(base(), name); d.mkdirs(); return d }
    private fun projectsDir() = dir("projects")
    private fun takesDir() = dir("takes")
    private fun kitsDir() = dir("kits")
    private fun safe(name: String) = name.replace(Regex("[^A-Za-z0-9 ._-]"), " ").trim().ifEmpty { "SONG" }
    private fun stamp() = SimpleDateFormat("yyyy-MM-dd HH.mm.ss", Locale.US).format(Date())

    // ---------------------------------------------------------------- starting up
    fun boot(ctx: Context) {
        if (booted) return; booted = true; app = ctx.applicationContext
        Native.start()
        val auto = File(projectsDir(), "_autosave.smx")
        try {
            if (auto.exists()) { Native.loadProject(auto.readText()); project = File(projectsDir(), "_name.txt").let { if (it.exists()) it.readText().trim() else "" } }
            else { Native.loadProject(ctx.assets.open("demo.smx").bufferedReader().use { it.readText() }); project = "" }
        } catch (e: Exception) { android.util.Log.e("StringerMax", "boot project", e) }
        lastEdits = Native.edits()
        Thread { loadMissing() }.start()
        startMidi(ctx.applicationContext); main.post(ticker)
        Thread({ midiPump() }, "midi-out").start()
    }
    fun shown() { visible++; if (visible == 1 && booted) Native.start() }
    fun hidden() { visible = max(0, visible - 1); if (visible == 0) { autosave(true); main.postDelayed({ if (visible == 0 && !recording && busy.isEmpty()) { Native.cmd("stop"); Native.stop() } }, 1500) } }

    /** Samples the project names but that are not in memory yet are read from their files. */
    private fun loadMissing() {
        var lost = 0
        for (line in Native.missing().split('\n')) {
            val tab = line.indexOf('\t'); if (tab < 0) continue
            val id = line.substring(0, tab).toIntOrNull() ?: continue; val path = line.substring(tab + 1)
            val p = if (path.isNotEmpty() && File(path).exists()) Decode.file(path, 600) else null
            if (p != null) Native.fillSample(id, p.l, p.r, p.rate) else lost++
        }
        if (lost > 0) say("$lost SAMPLE" + (if (lost > 1) "S" else "") + " NOT FOUND")
        Native.cmd("bump")
    }

    // ---------------------------------------------------------------- projects
    private var lastEdits = 0
    private fun autosave(force: Boolean) {
        try { val e = Native.edits(); if (!force && e == lastEdits) return; if (busy.isNotEmpty()) return; lastEdits = e
            val text = Native.dump(); if (text.length < 10) return
            Thread { try { val tmp = File(projectsDir(), "_autosave.tmp"); tmp.writeText(text); tmp.renameTo(File(projectsDir(), "_autosave.smx")); File(projectsDir(), "_name.txt").writeText(project) } catch (x: Exception) { android.util.Log.e("StringerMax", "autosave", x) } }.start()
        } catch (x: Exception) { android.util.Log.e("StringerMax", "autosave", x) }
    }
    fun projects(): String {
        val sb = StringBuilder("[")
        val list = projectsDir().listFiles { f -> f.name.endsWith(".smx") && !f.name.startsWith("_") }?.sortedByDescending { it.lastModified() } ?: emptyList()
        list.forEachIndexed { i, f -> if (i > 0) sb.append(','); sb.append("{\"n\":").append(q(f.name.removeSuffix(".smx"))).append(",\"t\":").append(f.lastModified() / 1000).append('}') }
        return sb.append("]").toString()
    }
    fun save(name: String) {
        val n = safe(name); try { Native.cmd("title " + q(n)); File(projectsDir(), "$n.smx").writeText(Native.dump()); project = n; say("SAVED  $n"); autosave(true) } catch (e: Exception) { android.util.Log.e("StringerMax", "save", e); say("COULD NOT SAVE") }
    }
    fun open(name: String) {
        try { val f = File(projectsDir(), safe(name) + ".smx"); if (!f.exists()) { say("NOT FOUND"); return }
            Native.loadProject(f.readText()); project = safe(name); Thread { loadMissing() }.start(); say("OPENED  $project") } catch (e: Exception) { android.util.Log.e("StringerMax", "open", e); say("COULD NOT OPEN") }
    }
    fun deleteProject(name: String) { try { File(projectsDir(), safe(name) + ".smx").delete(); say("DELETED") } catch (e: Exception) {} }
    fun newSong(kind: String) {
        try { val c = app ?: return; val asset = if (kind == "demo") "demo.smx" else "blank.smx"
            Native.loadProject(c.assets.open(asset).bufferedReader().use { it.readText() }); project = ""; say(if (kind == "demo") "DEMO SONG" else "NEW SONG") } catch (e: Exception) { android.util.Log.e("StringerMax", "new", e) }
    }

    // ---------------------------------------------------------------- the file browser
    private fun roots(): List<Pair<String, String>> {
        val out = ArrayList<Pair<String, String>>(); val c = app ?: return out
        out.add("THOR STORAGE" to "/storage/emulated/0")
        try { for (d in c.getExternalFilesDirs(null)) { if (d == null) continue; val p = d.absolutePath; val i = p.indexOf("/Android/"); if (i > 0) { val root = p.substring(0, i); if (root != "/storage/emulated/0") out.add("SD CARD" to root) } } } catch (e: Exception) {}
        out.add("MY TAKES AND BOUNCES" to takesDir().absolutePath)
        return out
    }
    fun browse(path: String): String {
        val sb = StringBuilder()
        if (path.isEmpty()) { sb.append("{\"path\":\"\",\"up\":\"\",\"dirs\":["); roots().forEachIndexed { i, r -> if (i > 0) sb.append(','); sb.append("{\"n\":").append(q(r.first)).append(",\"p\":").append(q(r.second)).append('}') }; return sb.append("],\"files\":[]}").toString() }
        val d = File(path); val isRoot = roots().any { it.second == path }
        sb.append("{\"path\":").append(q(path)).append(",\"up\":").append(q(if (isRoot) "" else (d.parent ?: ""))).append(",\"dirs\":[")
        val all = try { d.listFiles() } catch (e: Exception) { null }
        val dirs = all?.filter { it.isDirectory && !it.name.startsWith(".") && it.name != "Android" }?.sortedBy { it.name.lowercase() } ?: emptyList()
        val files = all?.filter { it.isFile && Decode.isAudio(it.name) }?.sortedBy { it.name.lowercase() } ?: emptyList()
        dirs.forEachIndexed { i, f -> if (i > 0) sb.append(','); sb.append("{\"n\":").append(q(f.name)).append(",\"p\":").append(q(f.absolutePath)).append('}') }
        sb.append("],\"files\":[")
        files.take(600).forEachIndexed { i, f -> if (i > 0) sb.append(','); sb.append("{\"n\":").append(q(f.name)).append(",\"p\":").append(q(f.absolutePath)).append(",\"k\":").append(f.length() / 1024).append('}') }
        sb.append("],\"denied\":").append(all == null).append('}')
        return sb.toString()
    }
    fun preview(path: String) { Thread { val p = Decode.file(path, 20); if (p != null) Native.preview(p.l, p.r, p.rate) else say("CANNOT READ THAT FILE") }.start() }

    /** Loads a file as a sample and puts it where asked: "track" (the selected sampler, or a new one), "new", "pad N", "ref". */
    fun load(path: String, target: String) {
        say("LOADING"); busy = "LOADING"
        Thread {
            try {
                val p = Decode.file(path, 600); if (p == null) { say("CANNOT READ THAT FILE"); return@Thread }
                val name = File(path).name.substringBeforeLast('.').uppercase(Locale.US).take(24)
                val id = Native.addSample(name, path, p.l, p.r, p.rate); if (id < 0) { say("COULD NOT LOAD"); return@Thread }
                Native.cmd("mark")
                when {
                    target == "ref" -> { Native.setReference(id); say("REFERENCE LOADED") }
                    target.startsWith("pad ") -> { Native.cmd("pad $selTrack ${target.substring(4)} smp $id"); say("ON THE PAD") }
                    target == "track" -> { Native.cmd("trk smp $selTrack $id"); Native.cmd("trk name $selTrack " + q(name)); say("LOADED") }
                    else -> { val t = Native.cmd("trk add 2").toIntOrNull() ?: -1; if (t >= 0) { Native.cmd("trk smp $t $id"); Native.cmd("trk name $t " + q(name)); Native.cmd("blk add $t 4 \"BLOCK 1\""); Native.cmd("n $t 0 0 96 60 0.9"); Native.cmd("pl add $t 0 0"); Native.cmd("ed $t 0"); Native.cmd("sel track $t"); selTrack = t; say("NEW TRACK · ITS BLOCK IS AT BAR 1") } else say("NO ROOM FOR ANOTHER TRACK") }
                }
            } catch (e: Exception) { android.util.Log.e("StringerMax", "load", e); say("COULD NOT LOAD") } finally { busy = "" }
        }.start()
    }
    /** A file chosen with the system's picker is copied into the app's own folder first, then loaded like any other. */
    fun importUri(uri: android.net.Uri, target: String) {
        val c = app ?: return
        Thread {
            try {
                var name = "IMPORT.wav"
                c.contentResolver.query(uri, arrayOf(android.provider.OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cur -> if (cur.moveToFirst()) name = cur.getString(0) ?: name }
                val out = File(dir("imports"), safe(name)); c.contentResolver.openInputStream(uri)?.use { i -> out.outputStream().use { o -> i.copyTo(o) } }
                load(out.absolutePath, target)
            } catch (e: Exception) { android.util.Log.e("StringerMax", "import", e); say("COULD NOT READ THAT FILE") }
        }.start()
    }

    // ---------------------------------------------------------------- your own drum kits: the pads of a drum track, saved by name
    // ---------------------------------------------------------------- Heartstring: one document shared by the two screens, kept between launches
    @Volatile private var hsDoc: String? = null
    @Volatile var hsVer = 0
    private fun hsFile() = File(dir("heartstring"), "state.json")
    fun hsGet(): String { if (hsDoc == null) hsDoc = try { hsFile().readText() } catch (e: Exception) { "" }; return hsDoc ?: "" }
    @Synchronized fun hsPut(json: String): Int { hsDoc = json; hsVer++; val v = hsVer; Thread { try { hsFile().writeText(json) } catch (e: Exception) {} }.start(); return v }
    /** The pads of a saved kit that hold the user's own samples: [{"i":0,"path":"..."}] */
    fun kitPads(name: String): String {
        val sb = StringBuilder("["); var first = true
        try { for (line in File(kitsDir(), safe(name) + ".kit").readLines()) { val a = line.split(' ', limit = 8); if (a.size >= 8 && a[0] != "x" && a[7].length > 2) { if (!first) sb.append(','); first = false; sb.append("{\"i\":").append(a[0].toIntOrNull() ?: 0).append(",\"path\":").append(q(a[7].trim().removeSurrounding("\"").replace("\\\\", "\\"))).append('}') } } } catch (e: Exception) {}
        return sb.append("]").toString()
    }
    fun kits(): String {
        val sb = StringBuilder("[")
        val list = kitsDir().listFiles { f -> f.name.endsWith(".kit") }?.sortedByDescending { it.lastModified() } ?: emptyList()
        list.forEachIndexed { i, f ->
            var pads = 0; var smp = 0
            try { for (line in f.readLines()) { val a = line.split(' ', limit = 8); if (a.size >= 8 && a[0] != "x") { if (a[1] != "10") pads++; if (a[7].length > 2) smp++ } } } catch (e: Exception) {}
            if (i > 0) sb.append(','); sb.append("{\"n\":").append(q(f.name.removeSuffix(".kit"))).append(",\"pads\":").append(pads).append(",\"smp\":").append(smp).append(",\"t\":").append(f.lastModified() / 1000).append('}')
        }
        return sb.append("]").toString()
    }
    fun saveKit(name: String) {
        val n = safe(name); try { val text = Native.cmd("kitdump $selTrack"); if (text.length < 10) { say("SELECT A DRUM TRACK FIRST"); return }; File(kitsDir(), "$n.kit").writeText(text); Native.cmd("trk name $selTrack " + q(n)); Native.cmd("bump"); say("KIT SAVED  $n") } catch (e: Exception) { android.util.Log.e("StringerMax", "kit save", e); say("COULD NOT SAVE THE KIT") }
    }
    fun deleteKit(name: String) { try { File(kitsDir(), safe(name) + ".kit").delete(); say("KIT DELETED") } catch (e: Exception) {} }
    fun loadKit(name: String) {
        val f = File(kitsDir(), safe(name) + ".kit"); if (!f.exists()) { say("KIT NOT FOUND"); return }
        val t = selTrack; busy = "LOADING"
        Thread {
            try {
                Native.cmd("mark"); var lost = 0
                for (line in f.readLines()) {
                    val a = line.split(' ', limit = 8)
                    if (a.isNotEmpty() && a[0] == "x" && a.size >= 3) { Native.cmd("p $t 16 ${a[1]}"); Native.cmd("p $t 6 ${a[2]}"); continue }
                    if (a.size < 8) continue
                    val path = a[7].trim().removeSurrounding("\"").replace("\\\\", "\\"); var id = -1; var type = a[1]
                    if (path.isNotEmpty()) { val p = if (File(path).exists()) Decode.file(path, 60) else null
                        if (p != null) id = Native.addSample(File(path).name.substringBeforeLast('.').uppercase(Locale.US).take(24), path, p.l, p.r, p.rate) else { lost++; type = "10" } }
                    Native.cmd("pad $t ${a[0]} $type ${a[2]} ${a[3]} ${a[4]} ${a[5]} ${a[6]} $id")
                }
                Native.cmd("trk name $t " + q(safe(name))); Native.cmd("bump"); say(if (lost > 0) "$lost SOUNDS OF THIS KIT WERE NOT FOUND" else "KIT LOADED")
            } catch (e: Exception) { android.util.Log.e("StringerMax", "kit load", e); say("COULD NOT LOAD THE KIT") } finally { busy = "" }
        }.start()
    }

    // ---------------------------------------------------------------- recording the input
    fun rec() {
        if (!recording) { if (!micOk) { say("ALLOW THE MICROPHONE FIRST"); return }; Native.cmd("inmon 1"); recording = Native.recStart(); if (!recording) say("COULD NOT RECORD"); return }
        recording = false
        Thread { val f = File(takesDir(), "TAKE " + stamp() + ".wav"); val id = Native.recStop(f.absolutePath); say(if (id >= 0) "TAKE ADDED AS A TRACK" else if (id == -2) "NOTHING WAS HEARD: NO TAKE" else "TOO SHORT TO KEEP") }.start()
    }

    // ---------------------------------------------------------------- export
    private fun publish(src: File, name: String): Boolean {
        val c = app ?: return false
        return try {
            val v = ContentValues().apply { put(MediaStore.MediaColumns.DISPLAY_NAME, name); put(MediaStore.MediaColumns.MIME_TYPE, "audio/wav"); put(MediaStore.MediaColumns.RELATIVE_PATH, "Music/StringerMax") }
            val uri = c.contentResolver.insert(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, v) ?: return false
            c.contentResolver.openOutputStream(uri)?.use { o -> src.inputStream().use { it.copyTo(o) } }; true
        } catch (e: Exception) { android.util.Log.e("StringerMax", "publish", e); false }
    }
    /** "song": the whole song as one WAV. "stems": one WAV per track. "bounce": the block being edited becomes a loop on a new sampler track. */
    fun export(kind: String, trackNames: String) {
        if (busy.isNotEmpty()) return
        busy = if (kind == "bounce") "BOUNCING" else "EXPORTING"
        Thread {
            try {
                val title = safe(project.ifEmpty { "SONG" }); val tmp = File(dir("export"), "render.wav")
                if (kind == "song") { val ok = Native.render(tmp.absolutePath, 0, 0) > 0 && publish(tmp, "$title ${stamp()}.wav"); say(if (ok) "SAVED IN MUSIC / STRINGERMAX" else "EXPORT FAILED") }
                else if (kind == "stems") { val names = trackNames.split('|'); var n = 0; val when_ = stamp()
                    names.forEachIndexed { t, nm -> if (nm.isNotEmpty()) { busy = "STEM ${t + 1} OF ${names.size}"; if (Native.render(tmp.absolutePath, 2, t) > 0 && publish(tmp, "$title $when_ - ${t + 1} ${safe(nm)}.wav")) n++ } }
                    say("$n STEMS SAVED IN MUSIC / STRINGERMAX") }
                else { val f = File(takesDir(), "BOUNCE " + stamp() + ".wav"); val id = Native.render(f.absolutePath, 1, 0); Native.cmd("bump"); say(if (id > 0) "BOUNCED TO A NEW TRACK" else "BOUNCE FAILED") }
                tmp.delete()
            } catch (e: Exception) { android.util.Log.e("StringerMax", "export", e); say("EXPORT FAILED") } finally { busy = "" }
        }.start()
    }

    // ---------------------------------------------------------------- the input: a USB device beats the built-in microphone
    fun micGranted() { micOk = true; pickInput() }
    private var lastInput = -1
    private fun pickInput() {
        if (!micOk) return
        try {
            val am = app?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return
            val usb = am.getDevices(AudioManager.GET_DEVICES_INPUTS).firstOrNull { it.type == AudioDeviceInfo.TYPE_USB_DEVICE || it.type == AudioDeviceInfo.TYPE_USB_HEADSET }
            val id = usb?.id ?: 0; usbInput = usb != null
            val label = usb?.productName?.toString() ?: ""
            inputName = if (usb == null) "built-in microphone" else if (label.isBlank()) "USB audio" else label
            if (id != lastInput) { lastInput = id; Thread { Native.openInput(id) }.start() }
        } catch (e: Exception) { android.util.Log.e("StringerMax", "input", e) }
    }

    // ---------------------------------------------------------------- MIDI in (a keyboard plays the selected track) and out (FM-1 tracks play the synth)
    private var midi: MidiManager? = null
    private val opened = HashSet<Int>()
    private val outs = java.util.concurrent.CopyOnWriteArrayList<MidiInputPort>()
    private fun startMidi(ctx: Context) {
        midi = ctx.getSystemService(Context.MIDI_SERVICE) as? MidiManager
        val mm = midi ?: return
        try {
            mm.registerDeviceCallback(object : MidiManager.DeviceCallback() {
                override fun onDeviceAdded(device: MidiDeviceInfo) { openMidi(device) }
                override fun onDeviceRemoved(device: MidiDeviceInfo) { opened.remove(device.id); midiName = "" }
            }, main)
        } catch (e: Exception) { android.util.Log.e("StringerMax", "midi", e) }
        scanMidi()
    }
    @Suppress("DEPRECATION")
    private fun scanMidi() { try { midi?.devices?.forEach { openMidi(it) } } catch (e: Exception) { android.util.Log.e("StringerMax", "midi scan", e) } }
    private fun openMidi(info: MidiDeviceInfo) {
        if (!opened.add(info.id)) return
        try {
            midi?.openDevice(info, { dev: MidiDevice? ->
                if (dev == null) { opened.remove(info.id); return@openDevice }
                val label = info.properties.getString(MidiDeviceInfo.PROPERTY_NAME) ?: info.properties.getString(MidiDeviceInfo.PROPERTY_PRODUCT) ?: "MIDI device"
                try { if (info.outputPortCount > 0) dev.openOutputPort(0)?.connect(receiver) } catch (e: Exception) { android.util.Log.e("StringerMax", "midi in", e) }
                try { if (info.inputPortCount > 0) { val p = dev.openInputPort(0); if (p != null) outs.add(p) } } catch (e: Exception) { android.util.Log.e("StringerMax", "midi out", e) }
                midiName = label
            }, main)
        } catch (e: Exception) { opened.remove(info.id); android.util.Log.e("StringerMax", "midi open", e) }
    }
    private val receiver = object : MidiReceiver() {
        override fun onSend(msg: ByteArray, offset: Int, count: Int, timestamp: Long) {
            var i = offset; val end = offset + count
            while (i < end) {
                val st = msg[i].toInt() and 0xFF; val type = st and 0xF0
                if (type == 0x90 && i + 2 < end) { val n = msg[i + 1].toInt() and 0x7F; val v = msg[i + 2].toInt() and 0x7F; if (v > 0) Native.cmd("non $selTrack $n ${v / 127f}") else Native.cmd("noff $selTrack $n"); i += 3 }
                else if (type == 0x80 && i + 2 < end) { Native.cmd("noff $selTrack ${msg[i + 1].toInt() and 0x7F}"); i += 3 }
                else if (type == 0xC0 || type == 0xD0) i += 2
                else if (st >= 0xF8) i += 1
                else if (st >= 0x80) i += 3
                else i += 1
            }
        }
    }
    private fun midiPump() {
        val b = ByteArray(3)
        while (true) {
            try {
                val ev = Native.midiPoll()
                if (ev != null) for (e in ev) { b[0] = (e and 0xFF).toByte(); b[1] = ((e shr 8) and 0x7F).toByte(); b[2] = ((e shr 16) and 0x7F).toByte(); for (p in outs) { try { p.send(b, 0, 3) } catch (x: Exception) { outs.remove(p) } } }
                Thread.sleep(2)
            } catch (x: Exception) { try { Thread.sleep(50) } catch (y: Exception) {} }
        }
    }

    // ---------------------------------------------------------------- buttons and sticks: transport and navigation
    private val acts = ArrayList<Pair<Int, String>>(); private var actSeq = 0
    private fun act(name: String) { synchronized(acts) { acts.add(++actSeq to name); while (acts.size > 24) acts.removeAt(0) } }
    private var lastStop = 0L
    fun key(e: KeyEvent): Boolean {
        val down = e.action == KeyEvent.ACTION_DOWN; val first = down && e.repeatCount == 0
        when (e.keyCode) {
            KeyEvent.KEYCODE_BUTTON_A -> { if (first) act("A1") else if (!down) act("A0") }   // A presses whatever the stick cursor points at
            KeyEvent.KEYCODE_BUTTON_B -> if (first) { Native.cmd("stop"); if (System.currentTimeMillis() - lastStop < 600) Native.cmd("stop"); lastStop = System.currentTimeMillis(); Native.cmd("bump") }
            KeyEvent.KEYCODE_BUTTON_X -> if (first) act("REC")
            KeyEvent.KEYCODE_BUTTON_Y -> if (first) { Native.cmd("undo"); say("UNDO") }
            KeyEvent.KEYCODE_BUTTON_START -> if (first) act("PLAY")
            KeyEvent.KEYCODE_BUTTON_SELECT -> if (first) act("VIEW")
            KeyEvent.KEYCODE_BUTTON_L1 -> if (first) act("TRACK-")
            KeyEvent.KEYCODE_BUTTON_R1 -> if (first) act("TRACK+")
            KeyEvent.KEYCODE_BUTTON_THUMBL -> if (first) act("PAT-")
            KeyEvent.KEYCODE_BUTTON_THUMBR -> if (first) act("PAT+")
            KeyEvent.KEYCODE_BUTTON_L2 -> { if (first) Native.cmd("perf 0 0.22") else if (!down) Native.cmd("perf 0 0.5") }
            KeyEvent.KEYCODE_BUTTON_R2 -> { if (first) Native.cmd("perf 1 1") else if (!down) Native.cmd("perf 1 0") }
            KeyEvent.KEYCODE_DPAD_LEFT -> if (down) act("LEFT")
            KeyEvent.KEYCODE_DPAD_RIGHT -> if (down) act("RIGHT")
            KeyEvent.KEYCODE_DPAD_UP -> if (down) act("UP")
            KeyEvent.KEYCODE_DPAD_DOWN -> if (down) act("DOWN")
            else -> return false
        }
        return true
    }
    private var lx = 0f; private var ly = 0f; private var rx = 0f; private var ry = 0f; private var hatX = 0; private var hatY = 0; private var trigL = false; private var trigR = false
    fun motion(e: MotionEvent): Boolean {
        if (e.source and InputDevice.SOURCE_JOYSTICK != InputDevice.SOURCE_JOYSTICK || e.action != MotionEvent.ACTION_MOVE) return false
        fun dz(v: Float) = if (abs(v) < 0.2f) 0f else v
        lx = dz(e.getAxisValue(MotionEvent.AXIS_X)); ly = dz(e.getAxisValue(MotionEvent.AXIS_Y)); rx = dz(e.getAxisValue(MotionEvent.AXIS_Z)); ry = dz(e.getAxisValue(MotionEvent.AXIS_RZ))
        val lt = max(e.getAxisValue(MotionEvent.AXIS_LTRIGGER), e.getAxisValue(MotionEvent.AXIS_BRAKE)); val rt = max(e.getAxisValue(MotionEvent.AXIS_RTRIGGER), e.getAxisValue(MotionEvent.AXIS_GAS))
        if (lt > 0.08f) { trigL = true; Native.cmd("perf 0 ${0.5f - lt * 0.34f}") } else if (trigL) { trigL = false; Native.cmd("perf 0 0.5") }
        if (rt > 0.5f && !trigR) { trigR = true; Native.cmd("perf 1 1") } else if (rt < 0.3f && trigR) { trigR = false; Native.cmd("perf 1 0") }
        val hx = Math.round(e.getAxisValue(MotionEvent.AXIS_HAT_X)); val hy = Math.round(e.getAxisValue(MotionEvent.AXIS_HAT_Y))
        if (hx != hatX) { hatX = hx; if (hx != 0) act(if (hx > 0) "RIGHT" else "LEFT") }
        if (hy != hatY) { hatY = hy; if (hy != 0) act(if (hy > 0) "DOWN" else "UP") }
        return true
    }
    private var ticks = 0
    private val ticker = object : Runnable {
        override fun run() {
            if (visible > 0) {
                val f = focus
                if (ry != 0f && f.isNotEmpty()) { if (f.startsWith("p ")) Native.cmd("nudge " + f.substring(2) + " " + (-ry * 0.012f)) else if (f.startsWith("m ")) Native.cmd("mnudge " + f.substring(2) + " " + (-ry * 0.012f)) }
                if (ry != 0f && ticks % 6 == 0) Native.cmd("bump")
                if (ticks % 120 == 60) { scanMidi(); pickInput() }
                if (ticks % 300 == 299) autosave(false)
            }
            ticks++
            main.postDelayed(this, 16)
        }
    }

    /** What both screens ask for many times a second: meters, button presses, messages. */
    fun poll(): String {
        val sb = StringBuilder("{\"m\":\"").append(Native.meters()).append("\",\"acts\":[")
        synchronized(acts) { acts.forEachIndexed { i, a -> if (i > 0) sb.append(','); sb.append('[').append(a.first).append(',').append(q(a.second)).append(']') } }
        sb.append("],\"notice\":").append(q(if (System.currentTimeMillis() < noticeUntil) notice else "")).append(",\"busy\":").append(q(busy)).append(",\"rec\":").append(recording)
            .append(",\"input\":").append(q(inputName)).append(",\"usb\":").append(usbInput).append(",\"mic\":").append(micOk).append(",\"midi\":").append(q(midiName)).append(",\"proj\":").append(q(project)).append(",\"hs\":").append(hsVer).append(",\"lx\":").append(lx).append(",\"ly\":").append(ly).append('}')
        return sb.toString()
    }
}
