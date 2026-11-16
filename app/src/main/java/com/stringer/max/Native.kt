package com.stringer.max

/** The C++ engine. Everything here is safe to call from any thread. */
object Native {
    init { System.loadLibrary("stringer") }
    external fun start(): Boolean
    external fun stop()
    external fun openInput(device: Int): Boolean
    external fun cmd(line: String): String
    external fun state(known: Int): String
    external fun meters(): String
    external fun edits(): Int
    external fun dump(): String
    external fun loadProject(text: String)
    external fun missing(): String
    external fun addSample(name: String, path: String, l: FloatArray, r: FloatArray, rate: Int): Int
    external fun fillSample(id: Int, l: FloatArray, r: FloatArray, rate: Int)
    external fun peaks(id: Int, bins: Int): String
    external fun preview(l: FloatArray, r: FloatArray, rate: Int)
    external fun setReference(id: Int)
    external fun recStart(): Boolean
    external fun recStop(path: String): Int
    external fun render(path: String, mode: Int, arg: Int): Int
    external fun midiPoll(): IntArray?
    external fun info(): String
}
