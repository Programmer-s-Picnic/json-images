package live.learnwithchampak.champaks_alarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.graphics.drawable.Icon
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import android.os.VibrationEffect
import android.os.Vibrator
import android.content.Context

class AlarmService : Service() {
    private var player: MediaPlayer? = null
    private var vibrator: Vibrator? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val id = intent?.getIntExtra("id", 0) ?: 0
        if (id <= 0) { stopSelf(); return START_NOT_STICKY }
        val label = intent.getStringExtra("label").orEmpty().ifBlank { "Alarm" }
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.createNotificationChannel(NotificationChannel("ringing_v1", "Ringing alarms", NotificationManager.IMPORTANCE_HIGH).apply {
            description = "Alarm sound and stop controls"
            setSound(null, null)
            enableVibration(false)
            lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        })
        val open = PendingIntent.getActivity(this, id,
            Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP).putExtra("alarm_id", id),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        fun action(name: String, request: Int) = PendingIntent.getBroadcast(this, request,
            Intent(this, AlarmActionReceiver::class.java).setAction("alarm.$name").putExtra("id", id),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val notification = Notification.Builder(this, "ringing_v1")
            .setSmallIcon(applicationInfo.icon)
            .setContentTitle(label)
            .setContentText("Alarm is ringing")
            .setCategory(Notification.CATEGORY_ALARM)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setContentIntent(open)
            .setFullScreenIntent(open, true)
            .addAction(Notification.Action.Builder(Icon.createWithResource(this, applicationInfo.icon), "Stop", action("STOP", id * 2)).build())
            .addAction(Notification.Action.Builder(Icon.createWithResource(this, applicationInfo.icon), "Snooze 5 min", action("SNOOZE", id * 2 + 1)).build())
            .build()
        startForeground(1001, notification)
        player?.release()
        vibrator?.cancel()
        try {
            val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            player = MediaPlayer().apply {
                setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
                setDataSource(this@AlarmService, uri)
                isLooping = true
                prepare()
                start()
            }
        } catch (_: Exception) { player = null }
        vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        vibrator?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 700, 300), 0))
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        player?.run { if (isPlaying) stop(); release() }
        player = null
        vibrator?.cancel()
        vibrator = null
        super.onDestroy()
    }
}
