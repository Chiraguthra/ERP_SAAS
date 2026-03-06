plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.erp.webview"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.erp.webview"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        val webUrl = (project.findProperty("ERP_WEB_URL") as String?) ?: "http://10.0.2.2"
        val bootstrapUrl = (project.findProperty("ERP_BOOTSTRAP_URL") as String?)
            ?: "http://10.0.2.2:8080/api/mobile/bootstrap"
        val mobileSecret = (project.findProperty("ERP_MOBILE_SECRET") as String?) ?: ""
        val bootstrapUsername = (project.findProperty("ERP_BOOTSTRAP_USERNAME") as String?) ?: "admin"

        buildConfigField("String", "ERP_WEB_URL", "\"$webUrl\"")
        buildConfigField("String", "ERP_BOOTSTRAP_URL", "\"$bootstrapUrl\"")
        buildConfigField("String", "ERP_MOBILE_SECRET", "\"$mobileSecret\"")
        buildConfigField("String", "ERP_BOOTSTRAP_USERNAME", "\"$bootstrapUsername\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        buildConfig = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
}
