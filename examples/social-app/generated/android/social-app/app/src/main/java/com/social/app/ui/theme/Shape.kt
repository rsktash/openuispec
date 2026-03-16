package com.social.app.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.unit.dp

object Shapes {
    val RoundedCapPrimary = RoundedCornerShape(
        topStart = 2.dp,
        topEnd = 24.dp,
        bottomEnd = 2.dp,
        bottomStart = 24.dp
    )

    val RoundedCapSecondary = RoundedCornerShape(
        topStart = 24.dp,
        topEnd = 2.dp,
        bottomEnd = 24.dp,
        bottomStart = 2.dp
    )

    val CardShape = RoundedCornerShape(
        topStart = 3.dp,
        topEnd = 20.dp,
        bottomEnd = 3.dp,
        bottomStart = 20.dp
    )

    val HeroShape = RoundedCornerShape(
        topStart = 3.dp,
        topEnd = 24.dp,
        bottomEnd = 3.dp,
        bottomStart = 24.dp
    )

    val SheetShape = RoundedCornerShape(
        topStart = 24.dp,
        topEnd = 24.dp,
        bottomStart = 0.dp,
        bottomEnd = 0.dp
    )
}
