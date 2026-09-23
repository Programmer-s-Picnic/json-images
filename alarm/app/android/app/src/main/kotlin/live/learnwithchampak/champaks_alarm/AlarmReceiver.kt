package live.learnwithchampak.champaks_alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getIntExtra("id", 0)
        if (id <= 0) return
        val entry = AlarmRepository(context).onFire(id, intent.getBooleanExtra("snooze", false)) ?: return
        val ringIntent = Intent(context, AlarmService::class.java)
            .putExtra("id", id).putExtra("label", entry.optString("label"))
        if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(ringIntent)
        else context.startService(ringIntent)
    }
}

class AlarmBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        AlarmRepository(context).rescheduleAll()
    }
}

class AlarmActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val repo = AlarmRepository(context)
        val id = intent.getIntExtra("id", 0)
        if (id <= 0 || repo.activeId() != id) return
        val snooze = intent.action == "alarm.SNOOZE"
        repo.stopRing()
        if (snooze) {
            try { repo.scheduleSnooze(id) } catch (_: SecurityException) { /* Request permission in UI. */ }
        }
    }
}
