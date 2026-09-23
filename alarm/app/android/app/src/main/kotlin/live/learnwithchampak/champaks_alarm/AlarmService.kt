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
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.VibrationEffect
import android.os.Vibrator
import android.content.Context
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import java.util.Locale

class AlarmService : Service() {
    private var player: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private var speech: TextToSpeech? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val id = intent?.getIntExtra("id", 0) ?: 0
        if (id <= 0) { stopSelf(); return START_NOT_STICKY }
        val label = intent?.getStringExtra("label").orEmpty().ifBlank { "Alarm" }
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
            val chosen = intent?.getStringExtra("tuneUri").orEmpty()
            val uri = chosen.takeIf { it.isNotBlank() }?.let(Uri::parse)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                ?: throw IllegalStateException("No system alarm sound")
            player = MediaPlayer().apply {
                setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
                setDataSource(this@AlarmService, uri)
                isLooping = true
                prepare()
                start()
            }
        } catch (_: Exception) {
            player?.release()
            player = null
            try {
                val fallback = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                if (fallback != null) player = MediaPlayer().apply {
                    setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build())
                    setDataSource(this@AlarmService, fallback)
                    isLooping = true
                    prepare()
                    start()
                }
            } catch (_: Exception) { player?.release(); player = null }
        }
        vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        vibrator?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 700, 300), 0))
        val message = intent?.getStringExtra("message").orEmpty().take(160)
        if (message.isNotBlank()) {
            speech?.shutdown()
            speech = TextToSpeech(this) { status ->
                if (status == TextToSpeech.SUCCESS) {
                    speech?.language = Locale.getDefault()
                    speech?.setAudioAttributes(AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
                    speech?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                        override fun onStart(utteranceId: String?) { player?.setVolume(0.2f, 0.2f) }
                        override fun onDone(utteranceId: String?) { player?.setVolume(1f, 1f) }
                        @Deprecated("Android callback")
                        override fun onError(utteranceId: String?) { player?.setVolume(1f, 1f) }
                    })
                    speech?.speak(message, TextToSpeech.QUEUE_FLUSH, null, "alarm-message")
                }
            }
        }
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        player?.run { if (isPlaying) stop(); release() }
        player = null
        speech?.stop()
        speech?.shutdown()
        speech = null
        vibrator?.cancel()
        vibrator = null
        super.onDestroy()
    }
}
