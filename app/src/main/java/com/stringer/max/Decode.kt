package com.stringer.max

import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import java.io.File
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.max
import kotlin.math.min

/** Sound read from a file: left, right, and how many samples a second. */
class Pcm(val l: FloatArray, val r: FloatArray, val rate: Int)

/** Reads audio files. WAV and AIFF are read directly (any bit depth); everything else goes through the device's decoders. */
object Decode {
    val kinds = setOf("wav", "aif", "aiff", "mp3", "flac", "ogg", "m4a", "aac", "opus")
    fun isAudio(name: String): Boolean = kinds.contains(name.substringAfterLast('.', "").lowercase())

    fun file(path: String, maxSeconds: Int): Pcm? {
        val ext = path.substringAfterLast('.', "").lowercase()
        try { if (ext == "wav") { val p = wav(path, maxSeconds); if (p != null) return p } } catch (e: Exception) { android.util.Log.e("StringerMax", "wav", e) }
        try { if (ext == "aif" || ext == "aiff") { val p = aiff(path, maxSeconds); if (p != null) return p } } catch (e: Exception) { android.util.Log.e("StringerMax", "aiff", e) }
        return try { codec(path, maxSeconds) } catch (e: Exception) { android.util.Log.e("StringerMax", "decode", e); null }
    }

    private fun pcm(raw: ByteArray, order: ByteOrder, ch: Int, bits: Int, float: Boolean, rate: Int): Pcm? {
        val bytes = bits / 8; if (bytes < 1 || ch < 1) return null
        val frames = raw.size / (bytes * ch); if (frames < 2) return null
        val bb = ByteBuffer.wrap(raw).order(order); val l = FloatArray(frames); val r = FloatArray(frames); val little = order == ByteOrder.LITTLE_ENDIAN
        for (f in 0 until frames) {
            for (c in 0 until min(ch, 2)) {
                val p = (f * ch + c) * bytes
                val v: Float = if (float && bits == 32) bb.getFloat(p) else when (bits) {
                    8 -> if (little) ((raw[p].toInt() and 255) - 128) / 128f else raw[p] / 128f
                    16 -> bb.getShort(p) / 32768f
                    24 -> { val b0 = raw[p].toInt() and 255; val b1 = raw[p + 1].toInt() and 255; val b2 = raw[p + 2].toInt() and 255
                        val x = if (little) (b0 or (b1 shl 8) or (b2 shl 16)) else (b2 or (b1 shl 8) or (b0 shl 16)); ((x shl 8) shr 8) / 8388608f }
                    32 -> bb.getInt(p) / 2147483648f
                    else -> 0f
                }
                if (c == 0) l[f] = v else r[f] = v
            }
            if (ch == 1) r[f] = l[f]
        }
        return Pcm(l, r, rate)
    }

    private fun wav(path: String, maxSeconds: Int): Pcm? {
        RandomAccessFile(path, "r").use { f ->
            val head = ByteArray(12); f.readFully(head); if (String(head, 0, 4, Charsets.US_ASCII) != "RIFF" || String(head, 8, 4, Charsets.US_ASCII) != "WAVE") return null
            var ch = 2; var bits = 16; var rate = 44100; var tag = 1; val h = ByteArray(8)
            while (f.filePointer + 8 <= f.length()) {
                f.readFully(h); val id = String(h, 0, 4, Charsets.US_ASCII); val size = ByteBuffer.wrap(h, 4, 4).order(ByteOrder.LITTLE_ENDIAN).int.toLong() and 0xFFFFFFFFL
                if (id == "fmt ") {
                    val b = ByteArray(min(size, 64L).toInt()); f.readFully(b); val bb = ByteBuffer.wrap(b).order(ByteOrder.LITTLE_ENDIAN)
                    tag = bb.getShort(0).toInt() and 0xFFFF; ch = bb.getShort(2).toInt(); rate = bb.getInt(4); bits = bb.getShort(14).toInt()
                    if (tag == 0xFFFE && b.size >= 26) tag = bb.getShort(24).toInt() and 0xFFFF
                    f.seek(f.filePointer + (size - b.size) + (size and 1))
                } else if (id == "data") {
                    if (tag != 1 && tag != 3) return null
                    val want = min(min(size, f.length() - f.filePointer), rate.toLong() * ch * (bits / 8) * maxSeconds)
                    val raw = ByteArray(want.toInt()); f.readFully(raw); return pcm(raw, ByteOrder.LITTLE_ENDIAN, ch, bits, tag == 3, rate)
                } else f.seek(f.filePointer + size + (size and 1))
            }
        }
        return null
    }

    private fun aiff(path: String, maxSeconds: Int): Pcm? {
        RandomAccessFile(path, "r").use { f ->
            val head = ByteArray(12); f.readFully(head); if (String(head, 0, 4, Charsets.US_ASCII) != "FORM") return null
            var ch = 2; var bits = 16; var rate = 44100; var little = false; val h = ByteArray(8)
            while (f.filePointer + 8 <= f.length()) {
                f.readFully(h); val id = String(h, 0, 4, Charsets.US_ASCII); val size = ByteBuffer.wrap(h, 4, 4).int.toLong() and 0xFFFFFFFFL
                if (id == "COMM") {
                    val b = ByteArray(min(size, 64L).toInt()); f.readFully(b); val bb = ByteBuffer.wrap(b)
                    ch = bb.getShort(0).toInt(); bits = bb.getShort(6).toInt(); val exp = (bb.getShort(8).toInt() and 0x7FFF) - 16383; val hi = bb.getInt(10).toLong() and 0xFFFFFFFFL
                    rate = (hi.toDouble() * Math.pow(2.0, (exp - 31).toDouble())).toInt()
                    if (b.size >= 22 && String(b, 18, 4, Charsets.US_ASCII) == "sowt") little = true
                    f.seek(f.filePointer + (size - b.size) + (size and 1))
                } else if (id == "SSND") {
                    f.seek(f.filePointer + 8); val want = min(min(size - 8, f.length() - f.filePointer), rate.toLong() * ch * (bits / 8) * maxSeconds)
                    val raw = ByteArray(want.toInt()); f.readFully(raw); return pcm(raw, if (little) ByteOrder.LITTLE_ENDIAN else ByteOrder.BIG_ENDIAN, ch, bits, false, rate)
                } else f.seek(f.filePointer + size + (size and 1))
            }
        }
        return null
    }

    private fun codec(path: String, maxSeconds: Int): Pcm? {
        val ex = MediaExtractor(); ex.setDataSource(path)
        var fmt: MediaFormat? = null
        for (i in 0 until ex.trackCount) { val f = ex.getTrackFormat(i); if (f.getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true) { ex.selectTrack(i); fmt = f; break } }
        val format = fmt ?: run { ex.release(); return null }
        var rate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE); var ch = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
        val codec = MediaCodec.createDecoderByType(format.getString(MediaFormat.KEY_MIME)!!); codec.configure(format, null, null, 0); codec.start()
        val pcm = java.io.ByteArrayOutputStream(); val info = MediaCodec.BufferInfo(); var inDone = false; var outDone = false; var idle = 0
        while (!outDone && idle < 500) {
            if (!inDone) { val ii = codec.dequeueInputBuffer(10000); if (ii >= 0) { val n = ex.readSampleData(codec.getInputBuffer(ii)!!, 0); if (n < 0) { codec.queueInputBuffer(ii, 0, 0, 0, MediaCodec.BUFFER_FLAG_END_OF_STREAM); inDone = true } else { codec.queueInputBuffer(ii, 0, n, ex.sampleTime, 0); ex.advance() } } }
            val oi = codec.dequeueOutputBuffer(info, 10000)
            if (oi >= 0) { idle = 0; val buf = codec.getOutputBuffer(oi)!!; val b = ByteArray(info.size); buf.position(info.offset); buf.get(b); pcm.write(b); codec.releaseOutputBuffer(oi, false)
                if (info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM != 0 || pcm.size() > rate.toLong() * ch * 2 * maxSeconds) outDone = true }
            else if (oi == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED) { val f = codec.outputFormat; rate = f.getInteger(MediaFormat.KEY_SAMPLE_RATE); ch = f.getInteger(MediaFormat.KEY_CHANNEL_COUNT) }
            else idle++
        }
        try { codec.stop() } catch (e: Exception) {}
        codec.release(); ex.release()
        return pcm(pcm.toByteArray(), ByteOrder.LITTLE_ENDIAN, max(1, ch), 16, false, rate)
    }

    @Suppress("unused") fun exists(path: String): Boolean = File(path).exists()
}
