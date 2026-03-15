package uz.rsteam.taskflow.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightScheme = lightColorScheme(
    primary = BrandPrimary,
    secondary = BrandSecondary,
    tertiary = Info,
    background = SurfaceTertiary,
    surface = SurfacePrimary,
    surfaceVariant = SurfaceSecondary,
    error = Danger,
    onPrimary = SurfacePrimary,
    onSecondary = SurfacePrimary,
    onBackground = TextPrimary,
    onSurface = TextPrimary,
    onSurfaceVariant = TextSecondary,
    outline = TextTertiary
)

private val WarmScheme = lightColorScheme(
    primary = BrandPrimary,
    secondary = BrandSecondary,
    tertiary = Warning,
    background = WarmSurfaceTertiary,
    surface = WarmSurfacePrimary,
    surfaceVariant = WarmSurfaceSecondary,
    error = Danger,
    onPrimary = SurfacePrimary,
    onSecondary = SurfacePrimary,
    onBackground = TextPrimary,
    onSurface = TextPrimary,
    onSurfaceVariant = TextSecondary,
    outline = TextTertiary
)

private val DarkScheme = darkColorScheme(
    primary = BrandPrimary,
    secondary = BrandSecondary,
    tertiary = Info,
    background = DarkSurfaceTertiary,
    surface = DarkSurfacePrimary,
    surfaceVariant = DarkSurfaceSecondary,
    error = Danger,
    onPrimary = SurfacePrimary,
    onSecondary = SurfacePrimary,
    onBackground = DarkTextPrimary,
    onSurface = DarkTextPrimary,
    onSurfaceVariant = DarkTextSecondary,
    outline = DarkTextTertiary
)

enum class ThemeMode {
    System,
    Light,
    Dark,
    Warm
}

@Composable
fun TaskFlowTheme(
    themeMode: ThemeMode = ThemeMode.System,
    content: @Composable () -> Unit
) {
    val useDark = when (themeMode) {
        ThemeMode.System -> isSystemInDarkTheme()
        ThemeMode.Light -> false
        ThemeMode.Dark -> true
        ThemeMode.Warm -> false
    }
    val colorScheme = when {
        themeMode == ThemeMode.Warm -> WarmScheme
        useDark -> DarkScheme
        else -> LightScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = TaskFlowTypography,
        content = content
    )
}
