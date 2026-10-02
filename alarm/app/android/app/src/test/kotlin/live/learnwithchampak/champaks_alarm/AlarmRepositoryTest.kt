package live.learnwithchampak.champaks_alarm

import android.app.AlarmManager
import android.content.Context
import androidx.test.core.app.ApplicationProvider
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [33])
class AlarmRepositoryTest {
    private lateinit var context: Context
    private lateinit var repo: AlarmRepository
    private lateinit var manager: AlarmManager

    @Before fun setup() {
        context = ApplicationProvider.getApplicationContext()
        context.getSharedPreferences("champaks_alarms", Context.MODE_PRIVATE).edit().clear().commit()
        repo = AlarmRepository(context)
        manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        shadowOf(manager).setCanScheduleExactAlarms(true)
    }

    private fun save() = repo.save(JSONObject("""{"hour":23,"minute":59,"message":"Time to study","days":[],"enabled":true}"""))

    @Test fun savedAlarmStartsForegroundServiceDirectly() {
        val entry = save()
        val alarm = shadowOf(manager).scheduledAlarms.single()
        assertTrue(alarm.operation.isForegroundService)
        val intent = shadowOf(alarm.operation).savedIntent
        assertEquals(AlarmService::class.java.name, intent.component!!.className)
        assertTrue(intent.getBooleanExtra("scheduled", false))
        assertEquals(entry.getInt("id"), intent.getIntExtra("id", 0))
    }

    @Test fun reopeningAppRecoversRecentlyDueAlarmWithoutDisablingIt() {
        val entry = save()
        entry.put("onceAt", System.currentTimeMillis() - 1000)
        context.getSharedPreferences("champaks_alarms", Context.MODE_PRIVATE).edit()
            .putString("items", "[$entry]").commit()
        repo.rescheduleAll(recoverRecent = true)
        assertTrue(repo.byId(entry.getInt("id"))!!.getBoolean("enabled"))
        assertTrue(shadowOf(manager).scheduledAlarms.single().triggerAtTime > System.currentTimeMillis())
        val fired = repo.onFire(entry.getInt("id"), false)!!
        assertEquals("Time to study", fired.getString("message"))
        assertEquals(entry.getInt("id"), repo.activeId())
        assertFalse(repo.byId(entry.getInt("id"))!!.getBoolean("enabled"))
    }

    @Test fun toggleOffCancelsScheduledService() {
        val entry = save()
        repo.toggle(entry.getInt("id"), false)
        assertTrue(shadowOf(manager).scheduledAlarms.isEmpty())
    }

    @Test fun testStillWorksForDisabledAlarm() {
        val entry = save()
        repo.toggle(entry.getInt("id"), false)
        repo.test(entry.getInt("id"))
        val intent = shadowOf(shadowOf(manager).scheduledAlarms.single().operation).savedIntent
        assertTrue(intent.getBooleanExtra("snooze", false))
        assertNotNull(repo.onFire(entry.getInt("id"), true))
    }
}
