package uz.rsteam.todoorbit.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.shape.CutCornerShape
import androidx.compose.ui.unit.dp

private val LightColors = lightColorScheme(
    primary = Color(0xFF0F766E),
    secondary = Color(0xFFF59E0B),
    background = Color(0xFFFCFCF9),
    surface = Color(0xFFF3F4EE),
    surfaceVariant = Color(0xFFE7EBE4),
    onPrimary = Color.White,
    onSecondary = Color(0xFF172026),
    onBackground = Color(0xFF172026),
    onSurface = Color(0xFF172026),
    onSurfaceVariant = Color(0xFF52606D),
    error = Color(0xFFDC2626),
    tertiary = Color(0xFF2563EB)
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF29A89D),
    secondary = Color(0xFFFFC24B),
    background = Color(0xFF0F1418),
    surface = Color(0xFF172026),
    surfaceVariant = Color(0xFF202A31),
    onPrimary = Color.White,
    onSecondary = Color(0xFF172026),
    onBackground = Color(0xFFF7FAF8),
    onSurface = Color(0xFFF7FAF8),
    onSurfaceVariant = Color(0xFFCED6DD),
    error = Color(0xFFFF6B6B),
    tertiary = Color(0xFF5D91FF)
)

private val TodoOrbitShapes = Shapes(
    small = CutCornerShape(topStart = 14.dp, bottomEnd = 14.dp),
    medium = CutCornerShape(topStart = 18.dp, bottomEnd = 18.dp),
    large = CutCornerShape(topStart = 24.dp, bottomEnd = 24.dp)
)

@Composable
fun TodoOrbitTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        shapes = TodoOrbitShapes,
        content = content
    )
}
