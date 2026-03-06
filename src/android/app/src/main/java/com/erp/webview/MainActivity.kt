package com.erp.webview

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private val httpClient = OkHttpClient()

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        progressBar = findViewById(R.id.progressBar)

        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.databaseEnabled = true
        webView.settings.loadsImagesAutomatically = true
        webView.settings.useWideViewPort = true
        webView.settings.loadWithOverviewMode = true

        webView.webViewClient = WebViewClient()
        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                progressBar.progress = newProgress
                progressBar.visibility = if (newProgress in 1..99) ProgressBar.VISIBLE else ProgressBar.GONE
            }
        }

        bootstrapAndOpenWebApp()
    }

    private fun bootstrapAndOpenWebApp() {
        if (BuildConfig.ERP_USE_GUEST_MODE) {
            fetchGuestTokenAndLoad()
            return
        }
        val secret = BuildConfig.ERP_MOBILE_SECRET.trim()
        if (secret.isEmpty()) {
            Toast.makeText(this, "Missing ERP_MOBILE_SECRET in Android build config", Toast.LENGTH_LONG).show()
            return
        }

        val payload = JSONObject().apply {
            put("secret", secret)
            put("username", BuildConfig.ERP_BOOTSTRAP_USERNAME)
        }
        val request = Request.Builder()
            .url(BuildConfig.ERP_BOOTSTRAP_URL)
            .post(payload.toString().toRequestBody("application/json; charset=utf-8".toMediaType()))
            .build()

        httpClient.newCall(request).enqueue(object : okhttp3.Callback {
            override fun onFailure(call: okhttp3.Call, e: IOException) {
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "Bootstrap failed: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }

            override fun onResponse(call: okhttp3.Call, response: okhttp3.Response) {
                val body = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    runOnUiThread {
                        Toast.makeText(this@MainActivity, "Bootstrap error: HTTP ${response.code}", Toast.LENGTH_LONG).show()
                    }
                    return
                }
                val token = try {
                    JSONObject(body).optString("access_token", "")
                } catch (_: Exception) {
                    ""
                }
                if (token.isBlank()) {
                    runOnUiThread {
                        Toast.makeText(this@MainActivity, "Bootstrap error: token missing", Toast.LENGTH_LONG).show()
                    }
                    return
                }

                runOnUiThread {
                    injectTokenAndLoad(token)
                }
            }
        })
    }

    private fun fetchGuestTokenAndLoad() {
        val request = Request.Builder()
            .url(BuildConfig.ERP_GUEST_TOKEN_URL)
            .post("{}".toRequestBody("application/json; charset=utf-8".toMediaType()))
            .build()

        httpClient.newCall(request).enqueue(object : okhttp3.Callback {
            override fun onFailure(call: okhttp3.Call, e: IOException) {
                runOnUiThread {
                    Toast.makeText(
                        this@MainActivity,
                        "Cannot connect. Start backend and enable MOBILE_GUEST_ENABLED.",
                        Toast.LENGTH_LONG
                    ).show()
                    // Still load web URL so user can log in manually if backend is up
                    webView.loadUrl(BuildConfig.ERP_WEB_URL)
                }
            }

            override fun onResponse(call: okhttp3.Call, response: okhttp3.Response) {
                val body = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    runOnUiThread {
                        webView.loadUrl(BuildConfig.ERP_WEB_URL)
                    }
                    return
                }
                val token = try {
                    JSONObject(body).optString("access_token", "")
                } catch (_: Exception) {
                    ""
                }
                runOnUiThread {
                    if (token.isNotBlank()) {
                        injectTokenAndLoad(token)
                    } else {
                        webView.loadUrl(BuildConfig.ERP_WEB_URL)
                    }
                }
            }
        })
    }

    private fun injectTokenAndLoad(token: String) {
        webView.loadUrl("about:blank")
        webView.postDelayed({
            val escapedToken = JSONObject.quote(token)
            webView.evaluateJavascript("localStorage.setItem('token', $escapedToken);", null)
            webView.loadUrl(BuildConfig.ERP_WEB_URL)
        }, 250)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
