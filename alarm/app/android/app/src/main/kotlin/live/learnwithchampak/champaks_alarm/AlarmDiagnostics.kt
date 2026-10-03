package live.learnwithchampak.champaks_alarm

import android.app.AlarmManager
import android.app.NotificationManager
import android.content.Context
import android.media.AudioManager
import android.os.Build
import android.os.PowerManager
import org.json.JSONArray
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

internal object AlarmDiagnostics {
    @Synchronized fun log(context: Context, event: String) {
        try {
            val prefs = context.getSharedPreferences("alarm_diagnostics", Context.MODE_PRIVATE)
            val old = JSONArray(prefs.getString("events", "[]"))
            val next = JSONArray()
            for (i in maxOf(0, old.length() - 199) until old.length()) next.put(old.getString(i))
            val stamp = SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS Z", Locale.US).format(Date())
            next.put("$stamp  $event")
            prefs.edit().putString("events", next.toString()).commit()
        } catch (_: Exception) { }
    }

    fun clear(context: Context) {
        context.getSharedPreferences("alarm_diagnostics", Context.MODE_PRIVATE).edit().clear().commit()
    }

    fun report(context: Context): String {
        val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val notifications = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val version = context.packageManager.getPackageInfo(context.packageName, 0).versionName
        return buildString {
            appendLine("Champak's Alarm diagnostics — $version")
            appendLine("Device: ${Build.MANUFACTURER} ${Build.MODEL}; Android ${Build.VERSION.RELEASE} / API ${Build.VERSION.SDK_INT}")
            appendLine("Exact alarm permission: ${Build.VERSION.SDK_INT < 31 || manager.canScheduleExactAlarms()}")
            appendLine("Notifications enabled: ${notifications.areNotificationsEnabled()}")
            appendLine("Full-screen permission: ${Build.VERSION.SDK_INT < 34 || notifications.canUseFullScreenIntent()}")
            appendLine("Battery optimization exempt: ${power.isIgnoringBatteryOptimizations(context.packageName)}")
            appendLine("Battery saver: ${power.isPowerSaveMode}; device idle: ${power.isDeviceIdleMode}")
            appendLine("Alarm volume: ${audio.getStreamVolume(AudioManager.STREAM_ALARM)}/${audio.getStreamMaxVolume(AudioManager.STREAM_ALARM)}")
            appendLine("Do not disturb filter: ${notifications.currentInterruptionFilter}")
            appendLine("System next alarm (may belong to another app): ${manager.nextAlarmClock?.triggerTime?.let { Date(it).toString() } ?: "None"}")
            appendLine("\nSaved alarms (configuration, not proof of OS registration):")
            val repo = AlarmRepository(context)
            repo.all().forEach {
                val due = repo.nextAt(it)
                appendLine("ID ${it.optInt("id")}: enabled=${it.optBoolean("enabled")}, next=${if (due > 0) Date(due).toString() else "None"}")
            }
            appendLine("\nEvent log (oldest first; latest 200):")
            val events = JSONArray(context.getSharedPreferences("alarm_diagnostics", Context.MODE_PRIVATE).getString("events", "[]"))
            for (i in 0 until events.length()) appendLine(events.getString(i))
            appendLine("\nSCHEDULE_OK means Android accepted scheduling. RECEIVER_DELIVERED means the alarm reached the app. SERVICE_START / FOREGROUND_OK / TUNE_STARTED show playback progress.")
            appendLine("If SCHEDULE_OK has no receiver event after its due time, delivery was not observed; this alone does not identify the OS cause.")
            appendLine("Logs stay on this device. Alarm labels, spoken messages and audio paths are excluded.")
        }
    }
}
