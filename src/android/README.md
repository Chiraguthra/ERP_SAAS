# ERP Android WebView (POC)

This Android project opens the existing ERP web app in a `WebView` and performs auto-login by calling:

- `POST /api/mobile/bootstrap`

The web app login page is bypassed because the app injects JWT in `localStorage` key `token` before loading the ERP URL.

## 1) Backend prerequisites

Already implemented in this repo:

- `backend/routers/auth.py` contains `POST /api/mobile/bootstrap`
- `.env` and `backend/.env` include:
  - `MOBILE_POC_ENABLED=true`
  - `MOBILE_POC_SECRET=...`
  - `MOBILE_POC_USERNAME=admin`
  - `MOBILE_POC_TOKEN_TTL_DAYS=30`

Restart backend after env changes.

## 2) Configure Android build values

You can override these Gradle properties (from Android Studio `gradle.properties` or command-line `-P...`):

- `ERP_WEB_URL` (default: `http://10.0.2.2`)
- `ERP_BOOTSTRAP_URL` (default: `http://10.0.2.2:8080/api/mobile/bootstrap`)
- `ERP_MOBILE_SECRET` (**required**)
- `ERP_BOOTSTRAP_USERNAME` (default: `admin`)

Example:

```properties
ERP_WEB_URL=http://10.0.2.2
ERP_BOOTSTRAP_URL=http://10.0.2.2:8080/api/mobile/bootstrap
ERP_MOBILE_SECRET=your_mobile_poc_secret
ERP_BOOTSTRAP_USERNAME=admin
```

> `10.0.2.2` is correct for Android emulator to access host machine localhost.

## 3) Build APK

### Android Studio

1. Open folder: `android/`
2. Sync Gradle
3. Build > Build APK(s)

Output path:

- `android/app/build/outputs/apk/debug/app-debug.apk`

### Command line (if Gradle installed)

```bash
cd android
gradle :app:assembleDebug -PERP_MOBILE_SECRET=your_mobile_poc_secret
```

## 4) Install APK

Use Android Studio device manager or:

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

## Notes

- This is a quick POC approach and stores secret/token in app path; not production hardening.
- Current web app login behavior remains unchanged.
