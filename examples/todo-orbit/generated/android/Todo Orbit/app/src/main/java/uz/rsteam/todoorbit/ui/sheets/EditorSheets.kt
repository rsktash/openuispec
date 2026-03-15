package uz.rsteam.todoorbit

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Button
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaskEditorSheet(
    draft: TaskDraft,
    title: String,
    saveLabel: String,
    onDismiss: () -> Unit,
    onSubmit: (TaskDraft) -> Unit
) {
    val minLengthError = stringResource(R.string.validation_min_length, 2)
    val priorityOptions = Priority.entries.map { it.name to stringResource(it.labelRes) }
    var localDraft by remember(draft) { mutableStateOf(draft) }
    var titleError by remember { mutableStateOf<String?>(null) }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp).padding(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(title, style = MaterialTheme.typography.headlineSmall)
            OutlinedTextField(
                value = localDraft.title,
                onValueChange = {
                    localDraft = localDraft.copy(title = it)
                    titleError = if (it.trim().length < 2) {
                        minLengthError
                    } else {
                        null
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                label = { Text(stringResource(R.string.create_task_field_title)) },
                placeholder = { Text(stringResource(R.string.create_task_field_title_placeholder)) },
                shape = MaterialTheme.shapes.medium,
                isError = titleError != null
            )
            AnimatedVisibility(visible = titleError != null) {
                Text(titleError.orEmpty(), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }
            OutlinedTextField(
                value = localDraft.notes,
                onValueChange = { localDraft = localDraft.copy(notes = it) },
                modifier = Modifier.fillMaxWidth(),
                label = { Text(stringResource(R.string.create_task_field_notes)) },
                placeholder = { Text(stringResource(R.string.create_task_field_notes_placeholder)) },
                shape = MaterialTheme.shapes.medium,
                minLines = 4
            )
            EnumSelector(
                title = stringResource(R.string.create_task_field_priority),
                current = localDraft.priority.name,
                options = priorityOptions,
                style = EnumSelectorStyle.Segmented,
                onSelected = { selected ->
                    localDraft = localDraft.copy(priority = Priority.entries.first { it.name == selected })
                }
            )
            OutlinedTextField(
                value = localDraft.dueDate?.toString().orEmpty(),
                onValueChange = { entered ->
                    localDraft = localDraft.copy(dueDate = parseLocalDateOrNull(entered))
                },
                modifier = Modifier.fillMaxWidth(),
                label = { Text(stringResource(R.string.create_task_field_due_date)) },
                placeholder = { Text(stringResource(R.string.create_task_field_due_date_placeholder)) },
                shape = MaterialTheme.shapes.medium
            )
            Button(
                onClick = {
                    if (localDraft.title.trim().length >= 2) {
                        onSubmit(localDraft)
                    } else {
                        titleError = minLengthError
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                shape = MaterialTheme.shapes.medium
            ) {
                Text(saveLabel)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecurringRuleSheet(
    preferences: PreferencesState,
    rules: List<RecurringRuleModel>,
    locale: UiLocale,
    onDismiss: () -> Unit,
    onSubmit: (RecurringRuleModel) -> Unit
) {
    val dailyCadenceLabel = stringResource(R.string.recurring_rule_cadence_daily)
    val weeklyCadenceLabel = stringResource(R.string.recurring_rule_cadence_weekly)
    val monthlyCadenceLabel = stringResource(R.string.recurring_rule_cadence_monthly)
    val weekdayOptions = listOf(
        "" to "—",
        Weekday.Mon.name to stringResource(R.string.weekday_mon),
        Weekday.Tue.name to stringResource(R.string.weekday_tue),
        Weekday.Wed.name to stringResource(R.string.weekday_wed),
        Weekday.Thu.name to stringResource(R.string.weekday_thu),
        Weekday.Fri.name to stringResource(R.string.weekday_fri),
        Weekday.Sat.name to stringResource(R.string.weekday_sat),
        Weekday.Sun.name to stringResource(R.string.weekday_sun)
    )
    val summaryChannelOptions = listOf(
        "" to "—",
        SummaryChannel.Push.name to stringResource(R.string.recurring_rule_summary_push),
        SummaryChannel.Email.name to stringResource(R.string.recurring_rule_summary_email)
    )
    var draft by remember { mutableStateOf(RuleDraft()) }
    var errors by remember { mutableStateOf<Map<String, UiText>>(emptyMap()) }
    var checkingName by remember { mutableStateOf(false) }
    val preview = remember(draft) { schedulePreview(draft) }

    LaunchedEffect(draft.name, rules) {
        val trimmed = draft.name.trim()
        if (trimmed.length < 4 || trimmed == "Default") {
            checkingName = false
            return@LaunchedEffect
        }
        checkingName = true
        delay(450)
        checkingName = false
        if (rules.any { it.name.equals(trimmed, ignoreCase = true) }) {
            errors = errors + ("name" to UiText.Resource(R.string.validation_rule_name_taken))
        }
    }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp).padding(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(stringResource(R.string.recurring_rule_title), style = MaterialTheme.typography.headlineSmall)
            Text(stringResource(R.string.recurring_rule_subtitle), color = MaterialTheme.colorScheme.onSurfaceVariant)

            RuleTextField(
                label = stringResource(R.string.recurring_rule_field_name),
                value = draft.name,
                placeholder = stringResource(R.string.recurring_rule_field_name_placeholder),
                error = errors["name"]?.resolve(),
                helper = if (checkingName) stringResource(R.string.recurring_rule_checking_name) else null,
                onValueChange = { draft = draft.copy(name = it) }
            )
            RuleTextField(
                label = stringResource(R.string.recurring_rule_field_confirm_name),
                value = draft.confirmName,
                placeholder = stringResource(R.string.recurring_rule_field_confirm_name_placeholder),
                error = errors["confirmName"]?.resolve(),
                onValueChange = { draft = draft.copy(confirmName = it) }
            )

            EnumSelector(
                title = stringResource(R.string.recurring_rule_field_cadence),
                current = draft.cadence?.name.orEmpty(),
                options = listOf(
                    Cadence.Daily.name to dailyCadenceLabel,
                    Cadence.Weekly.name to weeklyCadenceLabel,
                    Cadence.Monthly.name to monthlyCadenceLabel
                ),
                style = EnumSelectorStyle.Segmented,
                onSelected = {
                    draft = draft.copy(
                        cadence = Cadence.entries.firstOrNull { entry -> entry.name == it },
                        weekday = if (it == Cadence.Weekly.name) draft.weekday else null,
                        monthDay = if (it == Cadence.Monthly.name) draft.monthDay else ""
                    )
                }
            )
            RuleTextField(
                label = stringResource(R.string.recurring_rule_field_interval),
                value = draft.interval,
                helper = stringResource(R.string.recurring_rule_field_interval_helper),
                error = errors["interval"]?.resolve(),
                onValueChange = { draft = draft.copy(interval = it) }
            )

            AnimatedVisibility(visible = draft.cadence == Cadence.Weekly) {
                EnumSelector(
                    title = stringResource(R.string.recurring_rule_field_weekday),
                    current = draft.weekday?.name.orEmpty(),
                    options = weekdayOptions,
                    style = EnumSelectorStyle.Dropdown,
                    onSelected = { draft = draft.copy(weekday = Weekday.entries.firstOrNull { day -> day.name == it }) }
                )
            }
            AnimatedVisibility(visible = draft.cadence == Cadence.Monthly) {
                RuleTextField(
                    label = stringResource(R.string.recurring_rule_field_month_day),
                    value = draft.monthDay,
                    helper = stringResource(R.string.recurring_rule_field_month_day_helper),
                    error = errors["monthDay"]?.resolve(),
                    onValueChange = { draft = draft.copy(monthDay = it) }
                )
            }

            RuleTextField(
                label = stringResource(R.string.recurring_rule_field_start_date),
                value = draft.startDate.toString(),
                error = errors["startDate"]?.resolve(),
                onValueChange = { text ->
                    parseLocalDateOrNull(text)?.also { draft = draft.copy(startDate = it) }
                }
            )
            SettingsToggle(
                title = stringResource(R.string.recurring_rule_field_has_end_date),
                subtitle = stringResource(R.string.recurring_rule_field_has_end_date_helper),
                checked = draft.hasEndDate,
                onCheckedChange = { draft = draft.copy(hasEndDate = it) }
            )
            AnimatedVisibility(visible = draft.hasEndDate) {
                RuleTextField(
                    label = stringResource(R.string.recurring_rule_field_end_date),
                    value = draft.endDate?.toString().orEmpty(),
                    error = errors["endDate"]?.resolve(),
                    onValueChange = { text -> draft = draft.copy(endDate = parseLocalDateOrNull(text)) }
                )
            }
            if (preferences.remindersEnabled) {
                RuleTextField(
                    label = stringResource(R.string.recurring_rule_field_remind_at),
                    value = draft.remindAt,
                    placeholder = stringResource(R.string.recurring_rule_field_remind_at_placeholder),
                    helper = stringResource(R.string.recurring_rule_field_remind_at_helper),
                    error = errors["remindAt"]?.resolve(),
                    onValueChange = { draft = draft.copy(remindAt = it) }
                )
            }
            SettingsToggle(
                title = stringResource(R.string.recurring_rule_field_enable_summary),
                subtitle = stringResource(R.string.recurring_rule_field_enable_summary_helper),
                checked = draft.enableSummary,
                onCheckedChange = { draft = draft.copy(enableSummary = it) }
            )
            AnimatedVisibility(visible = draft.enableSummary) {
                EnumSelector(
                    title = stringResource(R.string.recurring_rule_field_summary_channel),
                    current = draft.summaryChannel?.name.orEmpty(),
                    options = summaryChannelOptions.drop(1),
                    style = EnumSelectorStyle.Segmented,
                    onSelected = {
                        draft = draft.copy(summaryChannel = SummaryChannel.entries.firstOrNull { item -> item.name == it })
                    }
                )
            }

            SchedulePreviewCard(previewState = preview, locale = locale)

            Button(
                onClick = {
                    val validation = validateRuleDraft(draft, preferences, rules)
                    errors = validation
                    if (validation.isEmpty()) {
                        onSubmit(
                            RecurringRuleModel(
                                id = "rule-${System.currentTimeMillis()}",
                                name = draft.name.trim(),
                                cadence = draft.cadence!!,
                                interval = draft.interval.toInt(),
                                weekday = draft.weekday,
                                monthDay = draft.monthDay.toIntOrNull(),
                                startDate = draft.startDate,
                                endDate = if (draft.hasEndDate) draft.endDate else null,
                                remindAt = draft.remindAt.takeIf { it.isNotBlank() },
                                summaryChannel = if (draft.enableSummary) draft.summaryChannel else null
                            )
                        )
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                shape = MaterialTheme.shapes.medium
            ) {
                Text(stringResource(R.string.recurring_rule_save))
            }
        }
    }
}

@Composable
fun SchedulePreviewCard(
    previewState: SchedulePreviewState,
    locale: UiLocale
) {
    ElevatedCard(shape = MaterialTheme.shapes.large) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(stringResource(R.string.recurring_preview_title), style = MaterialTheme.typography.titleMedium)
            when (previewState.mode) {
                PreviewMode.Invalid -> {
                    Text(stringResource(R.string.recurring_preview_invalid), color = MaterialTheme.colorScheme.error)
                }

                PreviewMode.Empty -> {
                    Text(stringResource(R.string.recurring_preview_empty), color = MaterialTheme.colorScheme.onSurfaceVariant)
                }

                PreviewMode.Ready -> {
                    previewState.occurrences.forEachIndexed { index, date ->
                        OutlinedCard(shape = MaterialTheme.shapes.medium) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    if (index == 0) stringResource(R.string.recurring_preview_next) else "+$index",
                                    fontWeight = FontWeight.SemiBold
                                )
                                Text(formatAbsolute(date, locale))
                            }
                        }
                    }
                }
            }
        }
    }
}
