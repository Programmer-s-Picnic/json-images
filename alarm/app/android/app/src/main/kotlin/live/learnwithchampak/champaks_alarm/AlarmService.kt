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
import android.media.AudioManager
import android.media.ToneGenerator
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.Handler
import android.os.Looper
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
    private var fallbackTone: ToneGenerator? = null
    private var running = false
    private var voiceReady = false
    private var alarmMessage = ""
    private val voiceHandler = Handler(Looper.getMainLooper())
    private val fallbackVoice = object : Runnable {
        override fun run() {
            if (running && player == null && alarmMessage.isNotBlank() && voiceReady) {
                speech?.speak(alarmMessage, TextToSpeech.QUEUE_FLUSH, null, "alarm-message")
            }
            if (running && player == null) voiceHandler.postDelayed(this, 12000)
        }
    }
    private val toneHandler = Handler(Looper.getMainLooper())
    private val toneLoop = object : Runnable {
        override fun run() {
            fallbackTone?.startTone(ToneGenerator.TONE_PROP_BEEP, 750)
            if (fallbackTone != null) toneHandler.postDelayed(this, 1100)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val id = intent?.getIntExtra("id", 0) ?: 0
        running = true
        voiceReady = false
        voiceHandler.removeCallbacks(fallbackVoice)
        speech?.stop()
        speech?.shutdown()
        speech = null
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
        toneHandler.removeCallbacks(toneLoop)
        fallbackTone?.release()
        fallbackTone = null
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
        if (player == null) {
            try {
                fallbackTone = ToneGenerator(AudioManager.STREAM_ALARM, 100)
                toneHandler.post(toneLoop)
            } catch (_: Exception) { fallbackTone = null }
        }
        vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        vibrator?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 700, 300), 0))
        alarmMessage = intent?.getStringExtra("message").orEmpty().take(160)
        if (alarmMessage.isNotBlank()) {
            player?.apply {
                isLooping = false
                setOnCompletionListener { completed ->
                    if (running) {
                        if (voiceReady) {
                            val queued = speech?.speak(alarmMessage, TextToSpeech.QUEUE_FLUSH, null, "alarm-message")
                            if (queued != TextToSpeech.SUCCESS) restartTune(completed)
                        } else restartTune(completed)
                    }
                }
            }
            if (player == null) voiceHandler.postDelayed(fallbackVoice, 3000)
            speech = TextToSpeech(this) { status ->
                voiceHandler.post {
                    val engine = speech
                    if (running && status == TextToSpeech.SUCCESS && engine != null) {
                        val localeStatus = engine.setLanguage(Locale.getDefault())
                        if (localeStatus == TextToSpeech.LANG_MISSING_DATA ||
                            localeStatus == TextToSpeech.LANG_NOT_SUPPORTED) engine.language = Locale.US
                        engine.setAudioAttributes(AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
                        engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                            override fun onStart(utteranceId: String?) {}
                            override fun onDone(utteranceId: String?) {
                                voiceHandler.post { player?.let { restartTune(it) } }
                            }
                            @Deprecated("Android callback")
                            override fun onError(utteranceId: String?) {
                                voiceHandler.post { player?.let { restartTune(it) } }
                            }
                        })
                        voiceReady = true
                    }
                }
            }
        }
        return START_NOT_STICKY
    }

    private fun restartTune(completed: MediaPlayer) {
        if (!running || player !== completed) return
        try {
            completed.seekTo(0)
            completed.start()
        } catch (_: Exception) { /* Stop controls remain available. */ }
    }

    override fun onDestroy() {
        running = false
        voiceHandler.removeCallbacks(fallbackVoice)
        player?.run { if (isPlaying) stop(); release() }
        player = null
        toneHandler.removeCallbacks(toneLoop)
        fallbackTone?.stopTone()
        fallbackTone?.release()
        fallbackTone = null
        speech?.stop()
        speech?.shutdown()
        speech = null
        vibrator?.cancel()
        vibrator = null
        super.onDestroy()
    }
}
