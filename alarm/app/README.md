# Champak's Alarm 1.0

An alarm that tells you why it is ringing.

## First release features
- Multiple labeled alarms, one-time or selected weekdays.
- Next alarm with remaining time; enable, edit and delete.
- System alarm tunes or an audio file selected through Android's file picker.
- Spoken message after every tune cycle; phone language, English (India), or Hindi, with adjustable speed. Android voice data must be installed.
- Per-alarm volume (or phone alarm volume), vibration toggle, and 1–30 minute snooze options.
- Immediate complete Test Alarm in the editor and scheduled lock-screen test.
- Lock-screen alarm controls, notification Stop/Snooze, Android permission guidance.
- Rescheduling after restart, app update, clock or timezone change.
- Automatic dark theme. Settings stay on the device; no login or ads.

## Builds
The validation workflow generates a Flutter runner, analyzes it, and builds an APK and AAB targeting API 36 with minimum API 26. These validation artifacts use Flutter's debug signing fallback: **do not submit them to Google Play**.

Run `Signed Google Play release` only after configuring repository secrets:
`ALARM_UPLOAD_KEYSTORE_BASE64`, `ALARM_UPLOAD_STORE_PASSWORD`, `ALARM_UPLOAD_KEY_PASSWORD`, `ALARM_UPLOAD_KEY_ALIAS`.
Use your permanent upload keystore, back it up securely, and keep passwords out of source control. The workflow fails if signing secrets are missing and exports a signed AAB and APK when configured.

Package: `live.learnwithchampak.champaks_alarm`. Version: `1.0.0+6`.
Android updates require the same package and signing certificate. An older sideloaded debug APK may require uninstalling; do not promise in-place replacement until certificate compatibility is checked.

## Device acceptance before Play submission
1. Install and grant alarm/notification/full-screen permissions.
2. Test default and selected-file tunes, Hindi/English speech, repeat voice, volume, vibration and Stop.
3. Set a two-minute alarm; lock phone and close app. Verify ringing and notification actions.
4. Snooze with each configured duration; verify one-time and repeating alarms.
5. Reboot with a future alarm, then verify its firing; test timezone/clock changes.
6. Verify on Android 13, 14, 15 and 16, including battery saver.
7. Confirm signed APK upgrade with the intended existing certificate.

Device tests, Play listing assets, privacy-policy URL, declarations and production approval remain required. An APK build alone is not Play publication.
