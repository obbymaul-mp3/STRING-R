package com.stringer.max

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.ActivityOptions
import android.content.Intent
import android.content.pm.PackageManager
import android.hardware.display.DisplayManager
import android.os.Build
import android.os.Bundle
import android.view.Display
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import java.lang.ref.WeakReference

/** What the pages call. The names match the `SM.` calls in assets/ui. */
class Bridge {
    @JavascriptInterface fun cmd(line: String): String {
        if (line.startsWith("sel track ")) Studio.selTrack = line.substring(10).trim().toIntOrNull() ?: 0
        return Native.cmd(line)
    }
    @JavascriptInterface fun state(known: Int): String = Native.state(known)
    @JavascriptInterface fun poll(): String = Studio.poll()
    @JavascriptInterface fun peaks(id: Int, bins: Int): String = Native.peaks(id, bins)
    @JavascriptInterface fun browse(path: String): String = Studio.browse(path)
    @JavascriptInterface fun preview(path: String) = Studio.preview(path)
    @JavascriptInterface fun load(path: String, target: String) = Studio.load(path, target)
    @JavascriptInterface fun pick(target: String) { Studio.picker?.invoke(target) }
    @JavascriptInterface fun storage() { Studio.askStorage?.invoke() }
    @JavascriptInterface fun projects(): String = Studio.projects()
    @JavascriptInterface fun save(name: String) = Studio.save(name)
    @JavascriptInterface fun open(name: String) = Studio.open(name)
    @JavascriptInterface fun remove(name: String) = Studio.deleteProject(name)
    @JavascriptInterface fun fresh(kind: String) = Studio.newSong(kind)
    @JavascriptInterface fun export(kind: String, names: String) = Studio.export(kind, names)
    @JavascriptInterface fun kits(): String = Studio.kits()
    @JavascriptInterface fun saveKit(name: String) = Studio.saveKit(name)
    @JavascriptInterface fun loadKit(name: String) = Studio.loadKit(name)
    @JavascriptInterface fun removeKit(name: String) = Studio.deleteKit(name)
    @JavascriptInterface fun rec() = Studio.rec()
    @JavascriptInterface fun focus(what: String) { Studio.focus = what }
    @JavascriptInterface fun info(): String = Native.info()
}

/** One screen of the workstation. Two of these run at once on a Thor: the big screen and the small one. */
open class ScreenActivity : Activity() {
    protected lateinit var web: WebView
    protected var page = "single"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        page = intent.getStringExtra("page") ?: choosePage()
        web = WebView(this)
        web.settings.javaScriptEnabled = true; web.settings.domStorageEnabled = true
        web.setBackgroundColor(0xFF03040A.toInt()); web.overScrollMode = View.OVER_SCROLL_NEVER
        web.isHapticFeedbackEnabled = false; web.isLongClickable = false; web.setOnLongClickListener { true }
        web.addJavascriptInterface(Bridge(), "SM")
        // the pages are served from the app's own files under one address
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                val u = request.url; if (u.host != "sm.local") return null; val path = u.path ?: return null
                return try {
                    val name = path.removePrefix("/"); val mime = when (name.substringAfterLast('.')) { "html" -> "text/html"; "js" -> "application/javascript"; "css" -> "text/css"; "ttf" -> "font/ttf"; else -> "application/octet-stream" }
                    WebResourceResponse(mime, if (mime.startsWith("text") || mime.endsWith("javascript")) "utf-8" else null, assets.open(name))
                } catch (e: Exception) { WebResourceResponse("text/plain", "utf-8", 404, "Not found", emptyMap(), java.io.ByteArrayInputStream(ByteArray(0))) }
            }
        }
        setContentView(web)
        Studio.boot(this)
        web.loadUrl("https://sm.local/ui/$page.html")
    }
    /** Called on the screen the app was launched on. Returns the page for this screen. */
    protected open fun choosePage(): String = "single"

    override fun onStart() { super.onStart(); Studio.shown() }
    override fun onStop() { super.onStop(); Studio.hidden() }
    override fun onWindowFocusChanged(hasFocus: Boolean) { super.onWindowFocusChanged(hasFocus); if (hasFocus) immersive() }
    @Suppress("DEPRECATION")
    private fun immersive() {
        window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or View.SYSTEM_UI_FLAG_FULLSCREEN or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
    }
    override fun dispatchKeyEvent(event: KeyEvent): Boolean = Studio.key(event) || super.dispatchKeyEvent(event)
    override fun dispatchGenericMotionEvent(event: MotionEvent): Boolean = Studio.motion(event) || super.dispatchGenericMotionEvent(event)
}

class CompanionActivity : ScreenActivity() {
    override fun onCreate(savedInstanceState: Bundle?) { super.onCreate(savedInstanceState); MainActivity.other = WeakReference(this) }
}

class MainActivity : ScreenActivity() {
    companion object { var other: WeakReference<Activity>? = null }
    private var pickTarget = "new"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Studio.picker = { target -> pickTarget = target; runOnUiThread { try { startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("audio/*"), 7) } catch (e: Exception) { android.util.Log.e("StringerMax", "picker", e) } } }
        Studio.askStorage = { runOnUiThread { askPermissions() } }
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) Studio.micGranted()
        askPermissions()
    }
    private fun askPermissions() {
        val want = ArrayList<String>()
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) want.add(Manifest.permission.RECORD_AUDIO)
        val storage = if (Build.VERSION.SDK_INT >= 33) "android.permission.READ_MEDIA_AUDIO" else Manifest.permission.READ_EXTERNAL_STORAGE
        if (checkSelfPermission(storage) != PackageManager.PERMISSION_GRANTED) want.add(storage)
        if (want.isNotEmpty()) requestPermissions(want.toTypedArray(), 1)
    }
    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        for (i in permissions.indices) if (permissions[i] == Manifest.permission.RECORD_AUDIO && i < grantResults.size && grantResults[i] == PackageManager.PERMISSION_GRANTED) Studio.micGranted()
    }
    /** Two displays: the bigger one becomes the top screen, the smaller one the bottom. One display: both on one page. */
    @Suppress("DEPRECATION")
    override fun choosePage(): String {
        try {
            val dm = getSystemService(DisplayManager::class.java); val mine = windowManager.defaultDisplay
            val other = dm.displays.firstOrNull { it.displayId != mine.displayId && it.state != Display.STATE_OFF && (it.flags and Display.FLAG_PRIVATE) == 0 } ?: return "single"
            fun area(d: Display) = d.mode.physicalWidth.toLong() * d.mode.physicalHeight
            val iAmBig = area(mine) >= area(other)
            val opts = ActivityOptions.makeBasic(); opts.launchDisplayId = other.displayId
            startActivity(Intent(this, CompanionActivity::class.java).putExtra("page", if (iAmBig) "bottom" else "top")
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_MULTIPLE_TASK), opts.toBundle())
            return if (iAmBig) "top" else "bottom"
        } catch (e: Exception) { android.util.Log.e("StringerMax", "second screen", e); return "single" }
    }
    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 7 && resultCode == RESULT_OK) data?.data?.let { Studio.importUri(it, pickTarget) }
    }
    override fun onDestroy() { super.onDestroy(); if (isFinishing) { Studio.picker = null; Studio.askStorage = null; other?.get()?.finish() } }
}
