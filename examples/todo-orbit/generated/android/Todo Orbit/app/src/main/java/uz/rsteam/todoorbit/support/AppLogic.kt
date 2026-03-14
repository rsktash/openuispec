package uz.rsteam.todoorbit

import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale
import kotlin.math.roundToInt

data class AnalyticsOverview(
    val completedToday: Int,
    val openTasks: Int,
    val overdueTasks: Int,
    val completionRate: Int
)

fun analyticsOverview(tasks: List<TaskModel>): AnalyticsOverview {
    val today = LocalDate.now()
    val completedToday = tasks.count { it.status == TaskStatus.Done && it.updatedAt.toLocalDate() == today }
    val openTasks = tasks.count { it.status == TaskStatus.Open }
    val overdueTasks = tasks.count { it.status == TaskStatus.Open && it.dueDate?.isBefore(today) == true }
    val completionRate = if (tasks.isEmpty()) 0 else (((tasks.size - openTasks).toFloat() / tasks.size) * 100f).roundToInt()
    return AnalyticsOverview(completedToday, openTasks, overdueTasks, completionRate)
}

fun trendPoints(tasks: List<TaskModel>, period: AnalyticsPeriod, locale: UiLocale): List<TrendPoint> {
    val length = when (period) {
        AnalyticsPeriod.Week -> 7
        AnalyticsPeriod.Month -> 6
        AnalyticsPeriod.Quarter -> 8
    }
    val formatter = when (locale) {
        UiLocale.En -> DateTimeFormatter.ofPattern(if (period == AnalyticsPeriod.Week) "EEE" else "MMM d", Locale.ENGLISH)
        UiLocale.Ru -> DateTimeFormatter.ofPattern(if (period == AnalyticsPeriod.Week) "EEE" else "d MMM", Locale("ru"))
    }
    val today = LocalDate.now()
    return (0 until length).map { index ->
        val cursor = today.minusDays(((length - index - 1) * if (period == AnalyticsPeriod.Week) 1 else 5).toLong())
        TrendPoint(
            label = cursor.format(formatter),
            completed = tasks.count { it.status == TaskStatus.Done && !it.updatedAt.toLocalDate().isAfter(cursor) },
            created = tasks.count { !it.createdAt.toLocalDate().isAfter(cursor) }
        )
    }
}

fun validateRuleDraft(
    draft: RuleDraft,
    preferences: PreferencesState,
    rules: List<RecurringRuleModel>
): Map<String, UiText> {
    val errors = mutableMapOf<String, UiText>()
    val trimmedName = draft.name.trim()
    if (trimmedName.length < 4) {
        errors["name"] = UiText.Resource(R.string.validation_rule_name_min_length, listOf(4))
    } else if (trimmedName == "Default") {
        errors["name"] = UiText.Resource(R.string.validation_rule_name_reserved)
    } else if (rules.any { it.name.equals(trimmedName, ignoreCase = true) }) {
        errors["name"] = UiText.Resource(R.string.validation_rule_name_taken)
    }

    if (draft.confirmName.trim() != trimmedName) {
        errors["confirmName"] = UiText.Resource(R.string.validation_match_field)
    }

    val interval = draft.interval.toIntOrNull()
    when {
        interval == null || interval < 1 -> errors["interval"] = UiText.Resource(R.string.validation_min_value, listOf(1))
        interval > 30 -> errors["interval"] = UiText.Resource(R.string.validation_max_value, listOf(30))
    }

    if (draft.cadence == null) {
        errors["cadence"] = UiText.Resource(R.string.validation_fix_errors)
    }

    if (draft.cadence == Cadence.Weekly && draft.weekday == null) {
        errors["weekday"] = UiText.Resource(R.string.validation_fix_errors)
    }

    if (draft.cadence == Cadence.Monthly) {
        val monthDay = draft.monthDay.toIntOrNull()
        when {
            monthDay == null || monthDay < 1 -> errors["monthDay"] = UiText.Resource(R.string.validation_min_value, listOf(1))
            monthDay > 28 -> errors["monthDay"] = UiText.Resource(R.string.validation_month_day_max)
        }
    }

    if (draft.hasEndDate && draft.endDate != null && draft.endDate.isBefore(draft.startDate)) {
        errors["endDate"] = UiText.Resource(R.string.validation_end_date_after_start)
    }

    if (preferences.remindersEnabled && !Regex("^([01]\\d|2[0-3]):[0-5]\\d$").matches(draft.remindAt)) {
        errors["remindAt"] = UiText.Resource(R.string.validation_time_format)
    }

    if (draft.enableSummary && draft.summaryChannel == null) {
        errors["summaryChannel"] = UiText.Resource(R.string.validation_fix_errors)
    }

    return errors
}

fun schedulePreview(draft: RuleDraft): SchedulePreviewState {
    val interval = draft.interval.toIntOrNull() ?: return SchedulePreviewState(PreviewMode.Invalid)
    val cadence = draft.cadence ?: return SchedulePreviewState(PreviewMode.Invalid)
    if (interval < 1) return SchedulePreviewState(PreviewMode.Invalid)
    if (draft.hasEndDate && draft.endDate != null && draft.endDate.isBefore(draft.startDate)) {
        return SchedulePreviewState(PreviewMode.Invalid)
    }
    if (cadence == Cadence.Weekly && draft.weekday == null) return SchedulePreviewState(PreviewMode.Invalid)
    val monthlyDay = if (cadence == Cadence.Monthly) draft.monthDay.toIntOrNull() ?: return SchedulePreviewState(PreviewMode.Invalid) else null

    val result = mutableListOf<LocalDate>()
    var cursor = draft.startDate
    repeat(4) {
        val next = when (cadence) {
            Cadence.Daily -> cursor
            Cadence.Weekly -> nextWeekdayFrom(cursor, draft.weekday!!)
            Cadence.Monthly -> nextMonthlyFrom(cursor, monthlyDay!!)
        }
        if (draft.endDate != null && next.isAfter(draft.endDate)) return@repeat
        result += next
        cursor = when (cadence) {
            Cadence.Daily -> next.plusDays(interval.toLong())
            Cadence.Weekly -> next.plusWeeks(interval.toLong())
            Cadence.Monthly -> next.plusMonths(interval.toLong())
        }
    }

    return if (result.isEmpty()) SchedulePreviewState(PreviewMode.Empty) else SchedulePreviewState(PreviewMode.Ready, result)
}

fun formatAbsolute(date: LocalDate, locale: UiLocale): String {
    val formatter = when (locale) {
        UiLocale.En -> DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM).withLocale(Locale.ENGLISH)
        UiLocale.Ru -> DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM).withLocale(Locale("ru"))
    }
    return formatter.format(date)
}

fun parseLocalDateOrNull(value: String): LocalDate? {
    return runCatching {
        value.takeIf(String::isNotBlank)?.let(LocalDate::parse)
    }.getOrNull()
}

private fun nextWeekdayFrom(date: LocalDate, weekday: Weekday): LocalDate {
    var cursor = date
    while (cursor.dayOfWeek.value != weekdayToDayNumber(weekday)) {
        cursor = cursor.plusDays(1)
    }
    return cursor
}

private fun nextMonthlyFrom(date: LocalDate, day: Int): LocalDate {
    val base = date.withDayOfMonth(1)
    val candidate = base.withDayOfMonth(day.coerceAtMost(base.lengthOfMonth()))
    return if (candidate.isBefore(date)) {
        base.plusMonths(1).withDayOfMonth(day.coerceAtMost(base.plusMonths(1).lengthOfMonth()))
    } else {
        candidate
    }
}

private fun weekdayToDayNumber(weekday: Weekday): Int {
    return when (weekday) {
        Weekday.Mon -> 1
        Weekday.Tue -> 2
        Weekday.Wed -> 3
        Weekday.Thu -> 4
        Weekday.Fri -> 5
        Weekday.Sat -> 6
        Weekday.Sun -> 7
    }
}

fun sampleTasks(): List<TaskModel> {
    val now = LocalDateTime.now()
    return listOf(
        TaskModel(
            id = "task-1",
            title = "Prepare bilingual launch notes",
            notes = "Document the web, iOS, and Android behavior differences before review.",
            status = TaskStatus.Open,
            priority = Priority.High,
            dueDate = LocalDate.now().plusDays(2),
            createdAt = now.minusDays(6),
            updatedAt = now.minusDays(1)
        ),
        TaskModel(
            id = "task-2",
            title = "Review recurring-rule validation",
            notes = "Confirm async uniqueness checks and cross-field constraints.",
            status = TaskStatus.Done,
            priority = Priority.Medium,
            dueDate = LocalDate.now().minusDays(1),
            createdAt = now.minusDays(5),
            updatedAt = now
        ),
        TaskModel(
            id = "task-3",
            title = "Polish analytics empty states",
            notes = "Ensure chart and overdue list degrade gracefully on zero-data snapshots.",
            status = TaskStatus.Open,
            priority = Priority.Medium,
            dueDate = LocalDate.now().plusDays(5),
            createdAt = now.minusDays(4),
            updatedAt = now.minusDays(2)
        ),
        TaskModel(
            id = "task-4",
            title = "Regenerate drift snapshots",
            notes = "Refresh ios, android, and web state after spec edits.",
            status = TaskStatus.Open,
            priority = Priority.Low,
            dueDate = LocalDate.now().minusDays(3),
            createdAt = now.minusDays(3),
            updatedAt = now.minusDays(3)
        ),
        TaskModel(
            id = "task-5",
            title = "Prototype schedule preview contract",
            notes = "Use derived occurrences to prove custom-contract generation.",
            status = TaskStatus.Done,
            priority = Priority.High,
            dueDate = LocalDate.now().plusDays(1),
            createdAt = now.minusDays(8),
            updatedAt = now.minusDays(1)
        )
    )
}
