package live.learnwithchampak.champaks_alarm

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.media.RingtoneManager
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.content.pm.PackageManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import org.json.JSONObject

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "champaks_alarm/native").setMethodCallHandler { call, result ->
            val repo = AlarmRepository(this)
            try {
                when (call.method) {
                    "tunes" -> {
                        val tunes = mutableListOf(mapOf("name" to "Default alarm", "uri" to ""))
                        val ringtoneManager = RingtoneManager(this).apply { setType(RingtoneManager.TYPE_ALARM) }
                        val cursor = ringtoneManager.cursor
                        cursor.moveToPosition(-1)
                        while (cursor.moveToNext()) {
                            val position = cursor.position
                            val uri = ringtoneManager.getRingtoneUri(position)?.toString() ?: continue
                            tunes.add(mapOf("name" to cursor.getString(RingtoneManager.TITLE_COLUMN_INDEX), "uri" to uri))
                        }
                        result.success(tunes)
                    }
                    "list" -> result.success(repo.all().map { entry ->
                        entry.put("nextAt", repo.nextAt(entry)).toString()
                    })
                    "save" -> {
                        val input = JSONObject(call.argument<String>("json") ?: "{}")
                        if (input.optBoolean("enabled", true) && !canSchedule()) throw SecurityException("Exact alarm access is required")
                        result.success(repo.save(input).toString())
                    }
                    "toggle" -> {
                        if (call.argument<Boolean>("enabled") == true && !canSchedule()) throw SecurityException("Exact alarm access is required")
                        repo.toggle(call.argument<Int>("id") ?: 0, call.argument<Boolean>("enabled") ?: false)
                        result.success(null)
                    }
                    "delete" -> { repo.remove(call.argument<Int>("id") ?: 0); result.success(null) }
                    "test" -> { repo.test(call.argument<Int>("id") ?: 0); result.success(null) }
                    "testAlarm" -> {
                        val message = call.argument<String>("message").orEmpty().trim().take(160)
                        val tuneUri = call.argument<String>("tuneUri").orEmpty().take(512)
                        val label = call.argument<String>("label").orEmpty().take(80).ifBlank { "Test alarm" }
                        if (repo.activeId() != 0) throw IllegalStateException("Stop the ringing alarm before testing")
                        val intent = Intent(this, AlarmService::class.java)
                            .putExtra("id", 999999)
                            .putExtra("preview", true)
                            .putExtra("label", label)
                            .putExtra("message", message)
                            .putExtra("tuneUri", tuneUri)
                        startForegroundService(intent)
                        result.success(null)
                    }
                    "stopTestAlarm" -> {
                        if (repo.activeId() == 0) stopService(Intent(this, AlarmService::class.java))
                        result.success(null)
                    }
                    "setAlarmVolume" -> {
                        val audio = getSystemService(Context.AUDIO_SERVICE) as AudioManager
                        val level = call.argument<Int>("level") ?: 0
                        require(level in 0..audio.getStreamMaxVolume(AudioManager.STREAM_ALARM)) { "Invalid alarm volume" }
                        audio.setStreamVolume(AudioManager.STREAM_ALARM, level, 0)
                        result.success(null)
                    }
                    "alarmVolume" -> {
                        val audio = getSystemService(Context.AUDIO_SERVICE) as AudioManager
                        result.success(mapOf("current" to audio.getStreamVolume(AudioManager.STREAM_ALARM),
                            "max" to audio.getStreamMaxVolume(AudioManager.STREAM_ALARM)))
                    }
                    "active" -> result.success(repo.activeId())
                    "stop" -> { repo.stopRing(); result.success(null) }
                    "snooze" -> {
                        val id = call.argument<Int>("id") ?: 0
                        if (repo.activeId() == id) { repo.stopRing(); repo.scheduleSnooze(id) }
                        result.success(null)
                    }
                    "permissions" -> result.success(mapOf(
                        "exact" to canSchedule(),
                        "notifications" to (Build.VERSION.SDK_INT < 33 || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED),
                        "fullScreen" to (Build.VERSION.SDK_INT < 34 || (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).canUseFullScreenIntent())
                    ))
                    "requestPermission" -> {
                        when (call.argument<String>("kind")) {
                            "exact" -> if (Build.VERSION.SDK_INT >= 31) startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:$packageName")))
                            "notifications" -> if (Build.VERSION.SDK_INT >= 33) requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 100)
                            "fullScreen" -> if (Build.VERSION.SDK_INT >= 34) startActivity(Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:$packageName")))
                        }
                        result.success(null)
                    }
                    else -> result.notImplemented()
                }
            } catch (error: Exception) {
                result.error("ALARM_ERROR", error.message ?: "Could not update alarm", null)
            }
        }
    }

    private fun canSchedule() = Build.VERSION.SDK_INT < 31 ||
        (getSystemService(Context.ALARM_SERVICE) as AlarmManager).canScheduleExactAlarms()
}
