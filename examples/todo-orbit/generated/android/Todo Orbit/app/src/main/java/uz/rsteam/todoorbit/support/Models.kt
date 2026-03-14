package uz.rsteam.todoorbit

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.listSaver
import androidx.compose.ui.res.stringResource
import java.time.LocalDate
import java.time.LocalDateTime

enum class ScreenTab { Tasks, Analytics, Settings }

enum class UiLocale { En, Ru }

enum class ThemeMode { Light, Dark }

enum class TaskStatus { Open, Done }

enum class Priority { Low, Medium, High }

enum class TaskFilter { All, Open, Done }

enum class AnalyticsPeriod { Week, Month, Quarter }

enum class Cadence { Daily, Weekly, Monthly }

enum class Weekday { Mon, Tue, Wed, Thu, Fri, Sat, Sun }

enum class SummaryChannel { Push, Email }

enum class PreviewMode { Invalid, Empty, Ready }

sealed interface OverlayState {
    data object CreateTask : OverlayState
    data class EditTask(val taskId: String) : OverlayState
    data object RecurringRule : OverlayState
    data class TaskMeta(val taskId: String) : OverlayState
}

data class PreferencesState(
    val locale: UiLocale = UiLocale.En,
    val themeMode: ThemeMode = ThemeMode.Light,
    val remindersEnabled: Boolean = true,
    val dailySummaryEnabled: Boolean = false
)

val PreferencesStateSaver: Saver<PreferencesState, Any> = listSaver(
    save = {
        listOf(
            it.locale.name,
            it.themeMode.name,
            it.remindersEnabled,
            it.dailySummaryEnabled
        )
    },
    restore = {
        PreferencesState(
            locale = UiLocale.valueOf(it[0] as String),
            themeMode = ThemeMode.valueOf(it[1] as String),
            remindersEnabled = it[2] as Boolean,
            dailySummaryEnabled = it[3] as Boolean
        )
    }
)

data class TaskModel(
    val id: String,
    val title: String,
    val notes: String = "",
    val status: TaskStatus,
    val priority: Priority,
    val dueDate: LocalDate? = null,
    val createdAt: LocalDateTime,
    val updatedAt: LocalDateTime
)

data class RecurringRuleModel(
    val id: String,
    val name: String,
    val cadence: Cadence,
    val interval: Int,
    val weekday: Weekday? = null,
    val monthDay: Int? = null,
    val startDate: LocalDate,
    val endDate: LocalDate? = null,
    val remindAt: String? = null,
    val summaryChannel: SummaryChannel? = null
)

data class TrendPoint(
    val label: String,
    val completed: Int,
    val created: Int
)

data class TaskDraft(
    val title: String = "",
    val notes: String = "",
    val priority: Priority = Priority.Medium,
    val dueDate: LocalDate? = null
)

data class RuleDraft(
    val name: String = "",
    val confirmName: String = "",
    val cadence: Cadence? = null,
    val interval: String = "1",
    val weekday: Weekday? = null,
    val monthDay: String = "",
    val startDate: LocalDate = LocalDate.now(),
    val hasEndDate: Boolean = false,
    val endDate: LocalDate? = null,
    val remindAt: String = "",
    val enableSummary: Boolean = false,
    val summaryChannel: SummaryChannel? = null
)

data class SchedulePreviewState(
    val mode: PreviewMode,
    val occurrences: List<LocalDate> = emptyList()
)

sealed interface UiText {
    data class Resource(
        val id: Int,
        val args: List<Any> = emptyList()
    ) : UiText

    data class Literal(val value: String) : UiText
}

val TaskStatus.labelRes: Int
    get() = when (this) {
        TaskStatus.Open -> R.string.status_open
        TaskStatus.Done -> R.string.status_done
    }

val Priority.labelRes: Int
    get() = when (this) {
        Priority.Low -> R.string.priority_low
        Priority.Medium -> R.string.priority_medium
        Priority.High -> R.string.priority_high
    }

val Weekday.labelRes: Int
    get() = when (this) {
        Weekday.Mon -> R.string.weekday_mon
        Weekday.Tue -> R.string.weekday_tue
        Weekday.Wed -> R.string.weekday_wed
        Weekday.Thu -> R.string.weekday_thu
        Weekday.Fri -> R.string.weekday_fri
        Weekday.Sat -> R.string.weekday_sat
        Weekday.Sun -> R.string.weekday_sun
    }

val Priority.color
    @Composable get() = when (this) {
        Priority.Low -> MaterialTheme.colorScheme.outline
        Priority.Medium -> MaterialTheme.colorScheme.tertiary
        Priority.High -> MaterialTheme.colorScheme.secondary
    }

@Composable
fun UiText.resolve(): String {
    return when (this) {
        is UiText.Resource -> stringResource(id, *args.toTypedArray())
        is UiText.Literal -> value
    }
}
