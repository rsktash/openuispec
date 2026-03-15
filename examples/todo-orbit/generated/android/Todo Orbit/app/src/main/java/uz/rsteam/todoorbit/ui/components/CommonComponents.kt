package uz.rsteam.todoorbit

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedCard
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun HeroCard(title: String, subtitle: String) {
    ElevatedCard(
        shape = MaterialTheme.shapes.large,
        colors = CardDefaults.elevatedCardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.65f)
        )
    ) {
        Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
fun StatCard(title: String, value: String) {
    Card(shape = MaterialTheme.shapes.medium) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(title, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(value, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun LegendDot(color: Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Box(modifier = Modifier.size(10.dp).background(color, CircleShape))
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
fun LanguageSelector(current: UiLocale, onSelected: (UiLocale) -> Unit) {
    EnumSelector(
        title = stringResource(R.string.settings_language),
        current = current.name,
        options = listOf(
            UiLocale.En.name to stringResource(R.string.settings_language_en),
            UiLocale.Ru.name to stringResource(R.string.settings_language_ru)
        ),
        style = EnumSelectorStyle.Segmented,
        onSelected = { selected -> onSelected(UiLocale.entries.first { it.name == selected }) }
    )
}

@Composable
fun ThemeSelector(current: ThemeMode, onSelected: (ThemeMode) -> Unit) {
    EnumSelector(
        title = stringResource(R.string.settings_theme),
        current = current.name,
        options = listOf(
            ThemeMode.Light.name to stringResource(R.string.settings_theme_light),
            ThemeMode.Dark.name to stringResource(R.string.settings_theme_dark)
        ),
        style = EnumSelectorStyle.Segmented,
        onSelected = { selected -> onSelected(ThemeMode.entries.first { it.name == selected }) }
    )
}

enum class EnumSelectorStyle {
    Segmented,
    Dropdown
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EnumSelector(
    title: String,
    current: String,
    options: List<Pair<String, String>>,
    style: EnumSelectorStyle = EnumSelectorStyle.Segmented,
    leadingIcon: @Composable (() -> Unit)? = null,
    onSelected: (String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(title, style = MaterialTheme.typography.titleSmall)
        when (style) {
            EnumSelectorStyle.Segmented -> {
                SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                    options.forEachIndexed { index, (value, label) ->
                        SegmentedButton(
                            selected = value == current,
                            onClick = { onSelected(value) },
                            shape = SegmentedButtonDefaults.itemShape(index = index, count = options.size),
                            label = { Text(label) }
                        )
                    }
                }
            }

            EnumSelectorStyle.Dropdown -> {
                var expanded by remember { mutableStateOf(false) }
                val selectedLabel = options.firstOrNull { it.first == current }?.second.orEmpty()
                ExposedDropdownMenuBox(
                    expanded = expanded,
                    onExpandedChange = { expanded = !expanded }
                ) {
                    OutlinedTextField(
                        value = selectedLabel,
                        onValueChange = {},
                        modifier = Modifier
                            .menuAnchor()
                            .fillMaxWidth(),
                        readOnly = true,
                        label = { Text(title) },
                        leadingIcon = leadingIcon,
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                        shape = MaterialTheme.shapes.medium
                    )
                    DropdownMenu(
                        expanded = expanded,
                        onDismissRequest = { expanded = false }
                    ) {
                        options.forEach { (value, label) ->
                            DropdownMenuItem(
                                text = { Text(label) },
                                onClick = {
                                    expanded = false
                                    onSelected(value)
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SettingsToggle(
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.fillMaxWidth(0.8f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(title, fontWeight = FontWeight.SemiBold)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Spacer(Modifier.width(12.dp))
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}

@Composable
fun RuleTextField(
    label: String,
    value: String,
    placeholder: String = "",
    helper: String? = null,
    error: String? = null,
    onValueChange: (String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            label = { Text(label) },
            placeholder = if (placeholder.isNotBlank()) ({ Text(placeholder) }) else null,
            shape = MaterialTheme.shapes.medium,
            isError = error != null
        )
        when {
            error != null -> Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            helper != null -> Text(helper, color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
fun EmptyCard(title: String, body: String) {
    OutlinedCard(shape = MaterialTheme.shapes.large) {
        Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            Text(body, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
fun LabelValue(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, fontWeight = FontWeight.SemiBold)
    }
}
