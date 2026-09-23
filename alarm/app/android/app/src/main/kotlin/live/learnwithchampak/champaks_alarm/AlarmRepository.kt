package live.learnwithchampak.champaks_alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject
import java.time.ZonedDateTime

internal class AlarmRepository(private val context: Context) {
    private val prefs = context.getSharedPreferences("champaks_alarms", Context.MODE_PRIVATE)
    private val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    fun all(): List<JSONObject> {
        val array = JSONArray(prefs.getString("items", "[]"))
        return (0 until array.length()).map { array.getJSONObject(it) }
    }

    private fun write(items: List<JSONObject>) {
        val array = JSONArray()
        items.forEach { array.put(it) }
        prefs.edit().putString("items", array.toString()).commit()
    }

    fun byId(id: Int): JSONObject? = all().firstOrNull { it.optInt("id") == id }

    fun save(input: JSONObject): JSONObject {
        val items = all().toMutableList()
        val id = input.optInt("id").takeIf { it > 0 } ?: prefs.getInt("next_id", 1).also {
            prefs.edit().putInt("next_id", it + 1).commit()
        }
        val existing = items.firstOrNull { it.optInt("id") == id }
        cancel(id)
        val days = input.optJSONArray("days") ?: JSONArray()
        val hour = input.getInt("hour")
        val minute = input.getInt("minute")
        require(hour in 0..23 && minute in 0..59)
        val entry = JSONObject().apply {
            put("id", id)
            put("hour", hour)
            put("minute", minute)
            put("label", input.optString("label").take(80))
            put("days", days)
            put("enabled", input.optBoolean("enabled", true))
            put("onceAt", if (days.length() == 0) nextOccurrence(hour, minute, emptySet()) else 0L)
        }
        if (existing != null) items.remove(existing)
        items.add(entry)
        write(items)
        if (entry.getBoolean("enabled")) schedule(entry)
        return entry
    }

    fun toggle(id: Int, enabled: Boolean) {
        val items = all()
        val entry = items.firstOrNull { it.getInt("id") == id } ?: return
        cancel(id)
        entry.put("enabled", enabled)
        if (enabled && entry.getJSONArray("days").length() == 0) {
            entry.put("onceAt", nextOccurrence(entry.getInt("hour"), entry.getInt("minute"), emptySet()))
        }
        write(items)
        if (enabled) schedule(entry)
    }

    fun remove(id: Int) {
        cancel(id)
        write(all().filterNot { it.getInt("id") == id })
        if (activeId() == id) stopRing()
    }

    fun nextAt(entry: JSONObject): Long {
        if (!entry.optBoolean("enabled")) return 0L
        val days = entry.getJSONArray("days")
        if (days.length() == 0) return entry.optLong("onceAt")
        val selected = (0 until days.length()).map { days.getInt(it) }.toSet()
        return nextOccurrence(entry.getInt("hour"), entry.getInt("minute"), selected)
    }

    private fun nextOccurrence(hour: Int, minute: Int, days: Set<Int>): Long {
        val now = ZonedDateTime.now()
        for (offset in 0..7) {
            val day = now.toLocalDate().plusDays(offset.toLong())
            if (days.isNotEmpty() && day.dayOfWeek.value !in days) continue
            val candidate = day.atTime(hour, minute).atZone(now.zone)
            if (candidate.isAfter(now)) return candidate.toInstant().toEpochMilli()
        }
        error("No next occurrence")
    }

    private fun pending(id: Int, snooze: Boolean): PendingIntent {
        val requestCode = id * 2 + if (snooze) 1 else 0
        val intent = Intent(context, AlarmReceiver::class.java)
            .putExtra("id", id).putExtra("snooze", snooze)
            .setAction("alarm.$requestCode")
        return PendingIntent.getBroadcast(context, requestCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    private fun showIntent(id: Int): PendingIntent = PendingIntent.getActivity(
        context, id, Intent(context, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            .putExtra("alarm_id", id),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    private fun setExact(id: Int, whenMillis: Long, snooze: Boolean) {
        if (Build.VERSION.SDK_INT >= 31 && !manager.canScheduleExactAlarms()) {
            throw SecurityException("Allow exact alarms in Android settings")
        }
        manager.setAlarmClock(AlarmManager.AlarmClockInfo(whenMillis, showIntent(id)), pending(id, snooze))
    }

    fun schedule(entry: JSONObject) {
        val whenMillis = nextAt(entry)
        if (whenMillis > System.currentTimeMillis()) setExact(entry.getInt("id"), whenMillis, false)
    }

    fun scheduleSnooze(id: Int) {
        val whenMillis = System.currentTimeMillis() + 5 * 60_000L
        setExact(id, whenMillis, true)
        val snoozes = JSONObject(prefs.getString("snoozes", "{}"))
        snoozes.put(id.toString(), whenMillis)
        prefs.edit().putString("snoozes", snoozes.toString()).commit()
    }

    fun cancel(id: Int) {
        listOf(false, true).forEach { snooze ->
            val pending = pending(id, snooze)
            manager.cancel(pending)
            pending.cancel()
        }
        val snoozes = JSONObject(prefs.getString("snoozes", "{}"))
        snoozes.remove(id.toString())
        prefs.edit().putString("snoozes", snoozes.toString()).commit()
    }

    fun rescheduleAll() {
        val items = all()
        var changed = false
        for (entry in items) {
            if (!entry.optBoolean("enabled")) continue
            if (entry.getJSONArray("days").length() == 0 && entry.optLong("onceAt") <= System.currentTimeMillis()) {
                entry.put("enabled", false)
                changed = true
            } else {
                try { schedule(entry) } catch (_: SecurityException) { /* Permission can be restored in the app. */ }
            }
        }
        if (changed) write(items)
        val snoozes = JSONObject(prefs.getString("snoozes", "{}"))
        for (key in snoozes.keys().asSequence().toList()) {
            val id = key.toIntOrNull() ?: continue
            val whenMillis = snoozes.optLong(key)
            if (whenMillis > System.currentTimeMillis() && byId(id) != null) {
                try { setExact(id, whenMillis, true) } catch (_: SecurityException) { }
            } else {
                snoozes.remove(key)
            }
        }
        prefs.edit().putString("snoozes", snoozes.toString()).commit()
    }

    fun onFire(id: Int, snooze: Boolean): JSONObject? {
        val items = all()
        val entry = items.firstOrNull { it.optInt("id") == id } ?: return null
        if (snooze) {
            val snoozes = JSONObject(prefs.getString("snoozes", "{}"))
            snoozes.remove(id.toString())
            prefs.edit().putString("snoozes", snoozes.toString()).commit()
        }
        if (!snooze) {
            if (!entry.optBoolean("enabled")) return null
            if (entry.getJSONArray("days").length() == 0) {
                entry.put("enabled", false)
                write(items)
            } else {
                try { schedule(entry) } catch (_: SecurityException) { }
            }
        }
        prefs.edit().putInt("active_id", id).commit()
        return entry
    }

    fun activeId(): Int = prefs.getInt("active_id", 0)
    fun stopRing() {
        prefs.edit().remove("active_id").commit()
        context.stopService(Intent(context, AlarmService::class.java))
    }
}
