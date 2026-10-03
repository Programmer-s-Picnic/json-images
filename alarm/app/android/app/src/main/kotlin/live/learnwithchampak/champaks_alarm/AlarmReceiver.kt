package live.learnwithchampak.champaks_alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getIntExtra("id", 0)
        AlarmDiagnostics.log(context, "RECEIVER_DELIVERED id=$id")
        if (id <= 0) return
        val entry = AlarmRepository(context).onFire(id, intent.getBooleanExtra("snooze", false)) ?: return
        val ringIntent = Intent(context, AlarmService::class.java)
            .putExtra("id", id).putExtra("label", entry.optString("label"))
            .putExtra("tuneUri", entry.optString("tuneUri"))
            .putExtra("message", entry.optString("message"))
            .putExtra("volume", entry.optInt("volume", -1))
            .putExtra("vibrate", entry.optBoolean("vibrate", true))
            .putExtra("snoozeMinutes", entry.optInt("snoozeMinutes", 5))
            .putExtra("speechRate", entry.optDouble("speechRate", 1.0).toFloat())
            .putExtra("language", entry.optString("language"))
        try {
            if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(ringIntent)
            else context.startService(ringIntent)
            AlarmDiagnostics.log(context, "SERVICE_REQUEST_OK id=$id")
        } catch (error: Exception) {
            AlarmDiagnostics.log(context, "SERVICE_REQUEST_FAILED id=$id type=${error.javaClass.simpleName}")
            AlarmRepository(context).clearActive()
        }
    }
}

class AlarmBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        AlarmDiagnostics.log(context, "RESTORE action=${intent.action}")
        AlarmRepository(context).rescheduleAll()
    }
}

class AlarmActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val repo = AlarmRepository(context)
        val id = intent.getIntExtra("id", 0)
        if (intent.getBooleanExtra("preview", false)) {
            if (repo.activeId() == 0) context.stopService(Intent(context, AlarmService::class.java))
            return
        }
        if (id <= 0 || repo.activeId() != id) return
        val snooze = intent.action == "alarm.SNOOZE"
        if (snooze) {
            try { repo.scheduleSnooze(id) } catch (_: SecurityException) { return }
        }
        repo.stopRing()
    }
}
