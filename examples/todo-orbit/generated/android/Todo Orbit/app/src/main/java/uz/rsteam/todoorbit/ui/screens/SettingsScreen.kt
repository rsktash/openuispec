package uz.rsteam.todoorbit

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material3.Button
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun SettingsScreen(
    preferences: PreferencesState,
    recurringRules: List<RecurringRuleModel>,
    onPreferencesChange: (PreferencesState) -> Unit,
    onOpenRecurringRule: () -> Unit,
    locale: UiLocale
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(20.dp)
    ) {
        item {
            HeroCard(
                stringResource(R.string.settings_title),
                stringResource(R.string.settings_subtitle)
            )
        }
        item {
            ElevatedCard(shape = MaterialTheme.shapes.large) {
                Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    LanguageSelector(
                        current = preferences.locale,
                        onSelected = { onPreferencesChange(preferences.copy(locale = it)) }
                    )
                    ThemeSelector(
                        current = preferences.themeMode,
                        onSelected = { onPreferencesChange(preferences.copy(themeMode = it)) }
                    )
                    SettingsToggle(
                        title = stringResource(R.string.settings_reminders),
                        subtitle = stringResource(R.string.settings_reminders_helper),
                        checked = preferences.remindersEnabled,
                        onCheckedChange = { onPreferencesChange(preferences.copy(remindersEnabled = it)) }
                    )
                    SettingsToggle(
                        title = stringResource(R.string.settings_daily_summary),
                        subtitle = stringResource(R.string.settings_daily_summary_helper),
                        checked = preferences.dailySummaryEnabled,
                        onCheckedChange = { onPreferencesChange(preferences.copy(dailySummaryEnabled = it)) }
                    )
                }
            }
        }
        item {
            ElevatedCard(shape = MaterialTheme.shapes.large) {
                Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text(stringResource(R.string.settings_automation_title), style = MaterialTheme.typography.titleLarge)
                    Text(stringResource(R.string.settings_automation_subtitle), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Button(onClick = onOpenRecurringRule, shape = MaterialTheme.shapes.medium) {
                        Icon(Icons.Outlined.CalendarMonth, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text(stringResource(R.string.settings_automation_create_rule))
                    }
                    recurringRules.forEach { rule ->
                        OutlinedCard(shape = MaterialTheme.shapes.medium) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(rule.name, fontWeight = FontWeight.SemiBold)
                                Text(ruleDescription(rule, locale), color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ruleDescription(rule: RecurringRuleModel, locale: UiLocale): String {
    val cadence = when (rule.cadence) {
        Cadence.Daily -> stringResource(R.string.recurring_rule_cadence_daily)
        Cadence.Weekly -> "${stringResource(R.string.recurring_rule_cadence_weekly)} · ${stringResource(rule.weekday!!.labelRes)}"
        Cadence.Monthly -> "${stringResource(R.string.recurring_rule_cadence_monthly)} · ${rule.monthDay}"
    }
    return "$cadence · ${formatAbsolute(rule.startDate, locale)}"
}
