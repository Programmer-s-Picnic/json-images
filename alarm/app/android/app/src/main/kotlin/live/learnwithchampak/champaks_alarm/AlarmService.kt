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
    private var originalVolume: Int? = null
    private var appliedVolume: Int? = null
    private var wakeLock: android.os.PowerManager.WakeLock? = null
    private var voiceReady = false
    private var alarmMessage = ""
    private val voiceHandler = Handler(Looper.getMainLooper())
    private var generation = 0
    private var preview = false
    private var speaking = false
    private var tunePrepared = false
    private var tuneFinished = false
    private val toneHandler = Handler(Looper.getMainLooper())
    private val toneLoop = object : Runnable {
        override fun run() {
            if (!running || speaking) return
            fallbackTone?.startTone(ToneGenerator.TONE_PROP_BEEP, 750)
            if (fallbackTone != null) toneHandler.postDelayed(this, 1100)
        }
    }
    private val speechTimeout = Runnable {
        if (running && speaking) {
            speech?.stop()
            resumeTune()
        }
    }
    private val voiceCycle = Runnable { speakMessage() }


    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val id = intent?.getIntExtra("id", 0) ?: 0
        if (intent?.getBooleanExtra("scheduled", false) == true) {
            val entry = AlarmRepository(this).onFire(id, intent.getBooleanExtra("snooze", false))
            if (entry == null) {
                if (!running) stopSelf()
                return START_NOT_STICKY
            }
            intent.putExtra("label", entry.optString("label"))
                .putExtra("tuneUri", entry.optString("tuneUri"))
                .putExtra("message", entry.optString("message"))
                .putExtra("volume", entry.optInt("volume", -1))
                .putExtra("vibrate", entry.optBoolean("vibrate", true))
                .putExtra("snoozeMinutes", entry.optInt("snoozeMinutes", 5))
                .putExtra("speechRate", entry.optDouble("speechRate", 1.0).toFloat())
                .putExtra("language", entry.optString("language"))
        }
        generation++
        val session = generation
        running = true
        preview = intent?.getBooleanExtra("preview", false) == true
        speaking = false
        tunePrepared = false
        tuneFinished = false
        voiceReady = false
        voiceHandler.removeCallbacksAndMessages(null)
        speech?.stop()
        speech?.shutdown()
        speech = null
        if (id <= 0) { stopSelf(); return START_NOT_STICKY }
        if (wakeLock == null) {
            wakeLock = (getSystemService(Context.POWER_SERVICE) as android.os.PowerManager)
                .newWakeLock(android.os.PowerManager.PARTIAL_WAKE_LOCK, "champaks_alarm:ring").apply { acquire(10 * 60_000L) }
        }
        val audio = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val volume = intent?.getIntExtra("volume", -1) ?: -1
        if (originalVolume == null) originalVolume = audio.getStreamVolume(AudioManager.STREAM_ALARM)
        if (volume >= 0) {
            appliedVolume = (audio.getStreamMaxVolume(AudioManager.STREAM_ALARM) * volume.coerceIn(0, 100) / 100f).toInt()
            audio.setStreamVolume(AudioManager.STREAM_ALARM, appliedVolume!!, 0)
        }
        val snoozeMinutes = (intent?.getIntExtra("snoozeMinutes", 5) ?: 5).coerceIn(1, 30)
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
            Intent(this, AlarmActionReceiver::class.java).setAction("alarm.$name").putExtra("id", id).putExtra("preview", intent?.getBooleanExtra("preview", false) == true),
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
            .addAction(Notification.Action.Builder(Icon.createWithResource(this, applicationInfo.icon), "Snooze $snoozeMinutes min", action("SNOOZE", id * 2 + 1)).build())
            .build()
        startForeground(1001, notification)
        player?.release()
        player = null
        toneHandler.removeCallbacks(toneLoop)
        fallbackTone?.release()
        fallbackTone = null
        vibrator?.cancel()
        alarmMessage = intent?.getStringExtra("message").orEmpty().trim().take(160)
            .ifBlank { if (preview) "This is a test alarm." else "" }
        val candidates = listOfNotNull(
            intent?.getStringExtra("tuneUri")?.takeIf { it.isNotBlank() }?.let(Uri::parse),
            RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
            RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_ALARM),
            RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        ).distinct()
        prepareTune(candidates, 0, session)
        vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        if (intent?.getBooleanExtra("vibrate", true) != false) vibrator?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 700, 300), 0))
        if (alarmMessage.isNotBlank()) {
            speech = TextToSpeech(this) { status ->
                voiceHandler.post {
                    val engine = speech
                    if (running && generation == session && status == TextToSpeech.SUCCESS && engine != null) {
                        val localeStatus = engine.setLanguage(intent?.getStringExtra("language")?.takeIf { it.isNotBlank() }?.let(Locale::forLanguageTag) ?: Locale.getDefault())
                        if (localeStatus == TextToSpeech.LANG_MISSING_DATA ||
                            localeStatus == TextToSpeech.LANG_NOT_SUPPORTED) engine.language = Locale.US
                        engine.setSpeechRate((intent?.getFloatExtra("speechRate", 1f) ?: 1f).coerceIn(0.5f, 1.5f))
                        engine.setAudioAttributes(AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_ALARM)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
                        engine.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                            override fun onStart(utteranceId: String?) {}
                            override fun onDone(utteranceId: String?) {
                                voiceHandler.post { if (generation == session && speaking) resumeTune() }
                            }
                            @Deprecated("Android callback")
                            override fun onError(utteranceId: String?) {
                                voiceHandler.post { if (generation == session && speaking) resumeTune() }
                            }
                        })
                        voiceReady = true
                        if (tuneFinished) speakMessage()
                    }
                }
            }
        }
        return START_NOT_STICKY
    }

    private fun prepareTune(candidates: List<Uri>, index: Int, session: Int) {
        if (!running || generation != session) return
        if (index >= candidates.size) {
            fallbackTone = try { ToneGenerator(AudioManager.STREAM_ALARM, 100) } catch (_: Exception) { null }
            toneHandler.post(toneLoop)
            if (alarmMessage.isNotBlank()) voiceHandler.postDelayed(voiceCycle, 5000)
            return
        }
        val candidate = MediaPlayer()
        player = candidate
        tunePrepared = false
        val timeout = Runnable {
            if (running && generation == session && player === candidate && !tunePrepared) {
                candidate.release()
                player = null
                prepareTune(candidates, index + 1, session)
            }
        }
        fun fail() {
            voiceHandler.removeCallbacks(timeout)
            if (generation != session || player !== candidate) return
            candidate.release()
            player = null
            tunePrepared = false
            prepareTune(candidates, index + 1, session)
        }
        try {
            candidate.setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
            candidate.setOnErrorListener { _, _, _ -> fail(); true }
            candidate.setOnCompletionListener {
                if (running && generation == session && player === candidate) {
                    tuneFinished = true
                    if (alarmMessage.isNotBlank()) speakMessage() else resumeTune()
                }
            }
            candidate.setOnPreparedListener {
                voiceHandler.removeCallbacks(timeout)
                if (running && generation == session && player === candidate) {
                    tunePrepared = true
                    candidate.isLooping = alarmMessage.isBlank()
                    try { candidate.start() } catch (_: Exception) { fail(); return@setOnPreparedListener }
                    // A preview samples the chosen sound, then tests speech promptly.
                    if (preview && alarmMessage.isNotBlank()) voiceHandler.postDelayed(voiceCycle, 5000)
                }
            }
            candidate.setDataSource(this, candidates[index])
            candidate.prepareAsync()
            voiceHandler.postDelayed(timeout, 5000)
        } catch (_: Exception) { fail() }
    }

    private fun speakMessage() {
        if (!running || speaking || alarmMessage.isBlank()) return
        if (!voiceReady) {
            if (tuneFinished) resumeTune()
            voiceHandler.postDelayed(voiceCycle, 1000)
            return
        }
        voiceHandler.removeCallbacks(voiceCycle)
        try { if (tunePrepared && player?.isPlaying == true) player?.pause() } catch (_: Exception) { }
        toneHandler.removeCallbacks(toneLoop)
        fallbackTone?.stopTone()
        speaking = true
        val queued = try { speech?.speak(alarmMessage, TextToSpeech.QUEUE_FLUSH, null, "alarm-message") }
            catch (_: Exception) { TextToSpeech.ERROR }
        if (queued == TextToSpeech.SUCCESS) voiceHandler.postDelayed(speechTimeout, 20000)
        else resumeTune()
    }

    private fun resumeTune() {
        if (!running) return
        voiceHandler.removeCallbacks(speechTimeout)
        speaking = false
        tuneFinished = false
        val current = player
        if (current != null && tunePrepared) {
            try { current.seekTo(0); current.start() } catch (_: Exception) { }
            if (preview && alarmMessage.isNotBlank()) voiceHandler.postDelayed(voiceCycle, 5000)
        } else if (fallbackTone != null) {
            toneHandler.post(toneLoop)
            if (alarmMessage.isNotBlank()) voiceHandler.postDelayed(voiceCycle, 5000)
        }
    }

    override fun onDestroy() {
        running = false
        generation++
        voiceHandler.removeCallbacksAndMessages(null)
        player?.release()
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
        val audio = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        if (appliedVolume != null && audio.getStreamVolume(AudioManager.STREAM_ALARM) == appliedVolume) {
            originalVolume?.let { audio.setStreamVolume(AudioManager.STREAM_ALARM, it, 0) }
        }
        wakeLock?.let { if (it.isHeld) it.release() }
        wakeLock = null
        AlarmRepository(this).clearActive()
        super.onDestroy()
    }
}
