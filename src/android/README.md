# ERP Android WebView – Install APK, Use Without Login

This Android app wraps the ERP web app in a WebView and can open **without login**: it obtains a guest token from the backend and injects it so the user goes straight into the app.

---

## 1) Backend setup (no-login / guest mode)

Guest mode is **on by default**. Ensure the backend has:

- **`MOBILE_GUEST_ENABLED=true`** (default) – enables `POST /api/mobile/guest-token`
- **`MOBILE_GUEST_USERNAME=guest`** (optional) – username for the guest user
- **`MOBILE_GUEST_TOKEN_TTL_DAYS=365`** (optional) – token validity in days

On first run, the backend seeds a **guest** user (role `staff`) so the Android app can get a token without any credentials. No secret is required.

To disable guest mode and use the old bootstrap flow with a secret:

- Set `MOBILE_GUEST_ENABLED=false`
- Set `MOBILE_POC_ENABLED=true`, `MOBILE_POC_SECRET=...`, and build the APK with `ERP_MOBILE_SECRET` (see below).

---

## 2) Build the APK (no login required)

### Windows: use Android Studio (no `gradlew` needed)

1. Open **Android Studio**.
2. **File → Open** and select the **`android`** folder (e.g. `...\ERP_SAAS\src\android`).
3. Wait for Gradle sync to finish.
4. **Build → Build APK(s)**.
5. APK path: `android\app\build\outputs\apk\debug\app-debug.apk`.

To use the command line on Windows, you need the Gradle Wrapper. If `gradlew.bat` is missing or you see “gradlew is not recognized”:

- **Option A:** Build from Android Studio as above (recommended on Windows).
- **Option B:** Install Gradle (e.g. from [gradle.org/install](https://gradle.org/install/)), then in the `android` folder run:
  ```bat
  gradle wrapper --gradle-version=8.5
  ```
  After that you can use:
  ```bat
  .\gradlew.bat :app:assembleDebug
  ```

### Option A: Guest mode (no secret) – recommended

Do **not** set `ERP_MOBILE_SECRET`. The app will call `/api/mobile/guest-token` and open without login.

From project root (e.g. `src/`):

```bash
cd android
./gradlew :app:assembleDebug
```

Or in Android Studio: open the `android/` folder → Build → Build APK(s).

**Output:** `android/app/build/outputs/apk/debug/app-debug.apk`

**Defaults** point to your deployed server **103.127.30.237** (web at `http://103.127.30.237`, API at `/api`). Build and install the APK to use the app on a device without changing anything.

For **emulator** (backend/frontend on your machine), override in `android/gradle.properties`:

```properties
ERP_WEB_URL=http://10.0.2.2:5000
ERP_GUEST_TOKEN_URL=http://10.0.2.2:8080/api/mobile/guest-token
```

### Option B: Bootstrap mode (secret-based auto-login)

If you use the old bootstrap flow (`MOBILE_POC_ENABLED=true`):

```bash
cd android
./gradlew :app:assembleDebug -PERP_MOBILE_SECRET=your_mobile_poc_secret
```

Or set in `android/gradle.properties`:

```properties
ERP_MOBILE_SECRET=your_mobile_poc_secret
ERP_BOOTSTRAP_USERNAME=admin
```

---

## 3) Gradle properties (optional)

`android/gradle.properties` is preconfigured for the deployed server **103.127.30.237**:

```properties
ERP_WEB_URL=http://103.127.30.237
ERP_GUEST_TOKEN_URL=http://103.127.30.237/api/mobile/guest-token
```

To use a **different server**, change these URLs. To use **local emulator**, set:

```properties
ERP_WEB_URL=http://10.0.2.2:5000
ERP_GUEST_TOKEN_URL=http://10.0.2.2:8080/api/mobile/guest-token
```

- **Guest mode (no login):** Leave `ERP_MOBILE_SECRET` unset.
- **Bootstrap mode:** Set `ERP_MOBILE_SECRET=your_secret` and optionally `ERP_BOOTSTRAP_USERNAME=admin`.

---

## 4) Install the APK

- **Emulator:** Drag `app-debug.apk` onto the emulator or use Android Studio Run.
- **Device:**  
  `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`

---

## 5) Release APK (optional)

For a signed release APK:

1. Create a keystore and configure signing in `android/app/build.gradle.kts` (signingConfigs).
2. Run:  
   `./gradlew :app:assembleRelease`

---

## Summary

| Goal                         | Backend env                          | Build / gradle.properties                    |
|-----------------------------|--------------------------------------|---------------------------------------------|
| Open app **without login**  | `MOBILE_GUEST_ENABLED=true` (default)| Do **not** set `ERP_MOBILE_SECRET`          |
| Auto-login with secret      | `MOBILE_POC_ENABLED=true`, secret    | Set `ERP_MOBILE_SECRET=...`                  |

The same web app runs in the browser (with login) and in the Android APK (without login when using guest mode).
