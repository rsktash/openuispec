package uz.rsteam.todoorbit

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AnalyticsScreen(
    period: AnalyticsPeriod,
    overview: AnalyticsOverview,
    trendSeries: List<TrendPoint>,
    overdueTasks: List<TaskModel>,
    onPeriodChange: (AnalyticsPeriod) -> Unit,
    locale: UiLocale
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(20.dp)
    ) {
        item {
            HeroCard(
                stringResource(R.string.analytics_title),
                stringResource(R.string.analytics_subtitle)
            )
        }
        item {
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                AnalyticsPeriod.entries.forEach { entry ->
                    FilterChip(
                        selected = period == entry,
                        onClick = { onPeriodChange(entry) },
                        label = {
                            Text(
                                when (entry) {
                                    AnalyticsPeriod.Week -> stringResource(R.string.analytics_period_week)
                                    AnalyticsPeriod.Month -> stringResource(R.string.analytics_period_month)
                                    AnalyticsPeriod.Quarter -> stringResource(R.string.analytics_period_quarter)
                                }
                            )
                        }
                    )
                }
            }
        }
        item {
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                modifier = Modifier.height(220.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                userScrollEnabled = false
            ) {
                item { StatCard(stringResource(R.string.analytics_completed_today), overview.completedToday.toString()) }
                item { StatCard(stringResource(R.string.analytics_open_tasks), overview.openTasks.toString()) }
                item { StatCard(stringResource(R.string.analytics_overdue_tasks), overview.overdueTasks.toString()) }
                item { StatCard(stringResource(R.string.analytics_completion_rate), "${overview.completionRate}%") }
            }
        }
        item {
            TrendChartCard(series = trendSeries, period = period)
        }
        item {
            ElevatedCard(shape = MaterialTheme.shapes.large) {
                Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(stringResource(R.string.analytics_overdue_section), style = MaterialTheme.typography.headlineSmall)
                    Text(stringResource(R.string.analytics_overdue_subtitle), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    if (overdueTasks.isEmpty()) {
                        Text(stringResource(R.string.analytics_empty_overdue_body), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    } else {
                        overdueTasks.forEach { task ->
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Column {
                                    Text(task.title, fontWeight = FontWeight.SemiBold)
                                    Text(stringResource(task.priority.labelRes), color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Text(task.dueDate?.let { formatAbsolute(it, locale) }.orEmpty())
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun TrendChartCard(
    series: List<TrendPoint>,
    period: AnalyticsPeriod
) {
    val outlineVariant = MaterialTheme.colorScheme.outlineVariant
    val createdColor = MaterialTheme.colorScheme.secondary
    val completedColor = MaterialTheme.colorScheme.primary

    ElevatedCard(shape = MaterialTheme.shapes.large) {
        Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text(
                        stringResource(R.string.analytics_contract_label),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        when (period) {
                            AnalyticsPeriod.Week -> stringResource(R.string.analytics_period_week)
                            AnalyticsPeriod.Month -> stringResource(R.string.analytics_period_month)
                            AnalyticsPeriod.Quarter -> stringResource(R.string.analytics_period_quarter)
                        },
                        style = MaterialTheme.typography.titleLarge
                    )
                }
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    LegendDot(color = createdColor, label = stringResource(R.string.analytics_legend_created))
                    LegendDot(color = completedColor, label = stringResource(R.string.analytics_legend_completed))
                }
            }
            if (series.isEmpty()) {
                Text(stringResource(R.string.analytics_empty_trend), color = MaterialTheme.colorScheme.onSurfaceVariant)
            } else {
                Canvas(modifier = Modifier.fillMaxWidth().height(220.dp)) {
                    val maxValue = series.maxOf { maxOf(it.completed, it.created) }.coerceAtLeast(1)
                    val leftPad = 32.dp.toPx()
                    val bottomPad = 28.dp.toPx()
                    val usableWidth = size.width - leftPad * 2
                    val usableHeight = size.height - bottomPad - 20.dp.toPx()
                    repeat(4) { index ->
                        val y = 20.dp.toPx() + (usableHeight / 3f) * index
                        drawLine(
                            color = outlineVariant,
                            start = Offset(leftPad, y),
                            end = Offset(size.width - leftPad, y)
                        )
                    }
                    fun buildPath(selector: (TrendPoint) -> Int): Path {
                        return Path().apply {
                            series.forEachIndexed { index, point ->
                                val x = leftPad + (usableWidth / series.lastIndex.coerceAtLeast(1)) * index
                                val y = 20.dp.toPx() + usableHeight - (usableHeight * selector(point) / maxValue.toFloat())
                                if (index == 0) moveTo(x, y) else lineTo(x, y)
                            }
                        }
                    }
                    drawPath(
                        path = buildPath { it.created },
                        color = createdColor,
                        style = Stroke(width = 6f, cap = StrokeCap.Round)
                    )
                    drawPath(
                        path = buildPath { it.completed },
                        color = completedColor,
                        style = Stroke(width = 6f, cap = StrokeCap.Round)
                    )
                }
                Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                    series.forEach { point ->
                        Text(
                            text = point.label,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}
