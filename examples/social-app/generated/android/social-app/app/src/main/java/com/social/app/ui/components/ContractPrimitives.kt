package com.social.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.Composable
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.social.app.model.User
import com.social.app.ui.theme.Shapes
import com.social.app.ui.theme.Spacing
import com.social.app.ui.theme.TextSecondary
import com.social.app.ui.theme.TextTertiary

enum class ActionTriggerVariant {
    Primary,
    Secondary,
    Destructive,
}

data class ChipOption(
    val value: String,
    val label: String,
)

@Composable
fun ActionTriggerButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: ActionTriggerVariant = ActionTriggerVariant.Primary,
    enabled: Boolean = true,
    fullWidth: Boolean = false,
    icon: (@Composable () -> Unit)? = null,
) {
    val interactionSource = MutableInteractionSource()
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.97f else 1f,
        animationSpec = spring(dampingRatio = 0.55f, stiffness = 500f),
        label = "actionTriggerScale",
    )
    val shape =
        if (variant == ActionTriggerVariant.Secondary) {
            Shapes.RoundedCapSecondary
        } else {
            Shapes.RoundedCapPrimary
        }

    val buttonModifier =
        modifier.then(
            if (fullWidth) Modifier.fillMaxWidth() else Modifier,
        ).graphicsLayer {
            scaleX = scale
            scaleY = scale
        }

    when (variant) {
        ActionTriggerVariant.Primary ->
            Button(
                onClick = onClick,
                enabled = enabled,
                interactionSource = interactionSource,
                modifier = buttonModifier.heightIn(min = 48.dp),
                shape = shape,
                colors =
                    ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary,
                    ),
                contentPadding = PaddingValues(horizontal = 18.dp, vertical = 12.dp),
            ) {
                ActionButtonContent(text = text, icon = icon)
            }

        ActionTriggerVariant.Secondary ->
            OutlinedButton(
                onClick = onClick,
                enabled = enabled,
                interactionSource = interactionSource,
                modifier = buttonModifier.heightIn(min = 48.dp),
                shape = shape,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                colors =
                    ButtonDefaults.outlinedButtonColors(
                        contentColor = MaterialTheme.colorScheme.onSurface,
                    ),
                contentPadding = PaddingValues(horizontal = 18.dp, vertical = 12.dp),
            ) {
                ActionButtonContent(text = text, icon = icon)
            }

        ActionTriggerVariant.Destructive ->
            Button(
                onClick = onClick,
                enabled = enabled,
                interactionSource = interactionSource,
                modifier = buttonModifier.heightIn(min = 48.dp),
                shape = shape,
                colors =
                    ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.error,
                        contentColor = MaterialTheme.colorScheme.onError,
                    ),
                contentPadding = PaddingValues(horizontal = 18.dp, vertical = 12.dp),
            ) {
                ActionButtonContent(text = text, icon = icon)
            }
    }
}

@Composable
private fun ActionButtonContent(
    text: String,
    icon: (@Composable () -> Unit)?,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.SM),
    ) {
        icon?.invoke()
        Text(
            text = text,
            style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.SemiBold),
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContractTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    placeholder: String = label,
    singleLine: Boolean = true,
    maxLines: Int = if (singleLine) 1 else 5,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    leadingIcon: (@Composable () -> Unit)? = null,
    trailingAction: (@Composable () -> Unit)? = null,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.fillMaxWidth(),
        label = { Text(label, color = TextSecondary) },
        placeholder = { Text(placeholder, color = TextTertiary) },
        leadingIcon = leadingIcon,
        trailingIcon = trailingAction,
        singleLine = singleLine,
        maxLines = maxLines,
        keyboardOptions = keyboardOptions,
        shape = Shapes.RoundedCapPrimary,
        colors =
            OutlinedTextFieldDefaults.colors(
                unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                focusedContainerColor = MaterialTheme.colorScheme.surface,
                focusedBorderColor = MaterialTheme.colorScheme.primary,
                unfocusedBorderColor = MaterialTheme.colorScheme.outline,
                focusedLabelColor = MaterialTheme.colorScheme.primary,
                cursorColor = MaterialTheme.colorScheme.primary,
                focusedPlaceholderColor = TextTertiary,
                unfocusedPlaceholderColor = TextTertiary,
            ),
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContractSelectField(
    label: String,
    selectedLabel: String,
    expanded: Boolean,
    onExpandedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
    options: List<ChipOption>,
    onOptionSelected: (ChipOption) -> Unit,
) {
    ExposedDropdownMenuBox(
        expanded = expanded,
        onExpandedChange = onExpandedChange,
        modifier = modifier,
    ) {
        OutlinedTextField(
            value = selectedLabel,
            onValueChange = {},
            readOnly = true,
            modifier =
                Modifier
                    .menuAnchor(type = androidx.compose.material3.ExposedDropdownMenuAnchorType.PrimaryNotEditable)
                    .fillMaxWidth(),
            label = { Text(label, color = TextSecondary) },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            shape = Shapes.RoundedCapPrimary,
            colors =
                OutlinedTextFieldDefaults.colors(
                    unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                    focusedContainerColor = MaterialTheme.colorScheme.surface,
                    focusedBorderColor = MaterialTheme.colorScheme.primary,
                    unfocusedBorderColor = MaterialTheme.colorScheme.outline,
                ),
        )

        ExposedDropdownMenu(
            expanded = expanded,
            onDismissRequest = { onExpandedChange(false) },
        ) {
            options.forEach { option ->
                DropdownMenuItem(
                    text = { Text(option.label) },
                    onClick = {
                        onOptionSelected(option)
                        onExpandedChange(false)
                    },
                )
            }
        }
    }
}

@Composable
fun ContractToggleField(
    label: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurface,
        )
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
        )
    }
}

@Composable
fun ContractChipRow(
    options: List<ChipOption>,
    selectedValue: String,
    onSelect: (ChipOption) -> Unit,
    modifier: Modifier = Modifier,
) {
    LazyRow(
        modifier = modifier,
        contentPadding = PaddingValues(horizontal = Spacing.MD),
        horizontalArrangement = Arrangement.spacedBy(Spacing.XS),
    ) {
        items(options) { option ->
            FilterChip(
                selected = option.value == selectedValue,
                onClick = { onSelect(option) },
                label = { Text(option.label) },
                shape = Shapes.RoundedCapPrimary,
                colors =
                    FilterChipDefaults.filterChipColors(
                        containerColor = Color.Transparent,
                        selectedContainerColor = MaterialTheme.colorScheme.secondary,
                        selectedLabelColor = MaterialTheme.colorScheme.onSecondary,
                    ),
                border =
                    FilterChipDefaults.filterChipBorder(
                        enabled = true,
                        selected = option.value == selectedValue,
                        borderColor = MaterialTheme.colorScheme.outline,
                        selectedBorderColor = Color.Transparent,
                    ),
            )
        }
    }
}

@Composable
fun ContractSectionHeader(
    title: String,
    modifier: Modifier = Modifier,
) {
    Text(
        text = title,
        modifier = modifier.padding(horizontal = Spacing.MD, vertical = Spacing.SM),
        style = MaterialTheme.typography.headlineMedium,
        color = MaterialTheme.colorScheme.onSurface,
    )
}

@Composable
fun ProfileHeroCard(
    title: String,
    subtitle: String,
    body: String?,
    avatarUrl: String?,
    modifier: Modifier = Modifier,
    actionLabel: String? = null,
    actionVariant: ActionTriggerVariant = ActionTriggerVariant.Secondary,
    actionIcon: (@Composable () -> Unit)? = null,
    onActionClick: (() -> Unit)? = null,
) {
    Surface(
        modifier = modifier,
        shape = Shapes.HeroShape,
        color = MaterialTheme.colorScheme.surfaceVariant,
    ) {
        Column(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .padding(Spacing.LG),
            verticalArrangement = Arrangement.spacedBy(Spacing.MD),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(Spacing.MD),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                RoundedCapAvatar(
                    imageUrl = avatarUrl,
                    contentDescription = title,
                    size = 88.dp,
                )
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = title,
                        style = MaterialTheme.typography.headlineLarge,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (actionLabel != null && onActionClick != null) {
                    ActionTriggerButton(
                        text = actionLabel,
                        onClick = onActionClick,
                        variant = actionVariant,
                        icon = actionIcon,
                    )
                }
            }

            if (!body.isNullOrBlank()) {
                Text(
                    text = body,
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
fun ContractListCard(
    title: String,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    body: String? = null,
    trailing: String? = null,
    avatarUrl: String? = null,
    onClick: (() -> Unit)? = null,
) {
    Surface(
        modifier =
            modifier.then(
                if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier,
            ),
        shape = Shapes.CardShape,
        color = MaterialTheme.colorScheme.surfaceVariant,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
    ) {
        Row(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .padding(Spacing.MD),
            horizontalArrangement = Arrangement.spacedBy(Spacing.SM),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (avatarUrl != null) {
                RoundedCapAvatar(
                    imageUrl = avatarUrl,
                    contentDescription = title,
                )
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.headlineSmall,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                if (subtitle != null) {
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (body != null) {
                    Text(
                        text = body,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            if (trailing != null) {
                Text(
                    text = trailing,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
fun CompactResultRow(
    title: String,
    subtitle: String,
    avatarUrl: String?,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Column(modifier = modifier.clickable(onClick = onClick)) {
        Row(
            modifier =
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = Spacing.MD, vertical = Spacing.SM),
            horizontalArrangement = Arrangement.spacedBy(Spacing.SM),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (avatarUrl != null) {
                RoundedCapAvatar(
                    imageUrl = avatarUrl,
                    contentDescription = title,
                    size = 44.dp,
                )
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.headlineSmall,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        HorizontalDivider(color = MaterialTheme.colorScheme.outline)
    }
}

@Composable
fun CreatorSuggestionCard(
    user: User,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Surface(
        modifier = modifier.clickable(onClick = onClick),
        shape = Shapes.CardShape,
        color = MaterialTheme.colorScheme.surfaceVariant,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
    ) {
        Column(
            modifier =
                Modifier
                    .width(180.dp)
                    .padding(Spacing.MD),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(Spacing.SM),
        ) {
            RoundedCapAvatar(
                imageUrl = user.avatarUrl,
                contentDescription = user.displayName,
                size = 64.dp,
            )
            Text(
                text = user.displayName,
                style = MaterialTheme.typography.headlineSmall,
                maxLines = 1,
            )
            Text(
                text = "@${user.handle}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
            )
        }
    }
}

@Composable
private fun RoundedCapAvatar(
    imageUrl: String?,
    contentDescription: String,
    size: androidx.compose.ui.unit.Dp = 48.dp,
) {
    Box(
        modifier =
            Modifier
                .size(size)
                .clip(Shapes.RoundedCapPrimary),
    ) {
        if (imageUrl != null) {
            AsyncImage(
                model = imageUrl,
                contentDescription = contentDescription,
                modifier = Modifier.matchParentSize(),
                contentScale = ContentScale.Crop,
            )
        } else {
            Surface(
                modifier = Modifier.matchParentSize(),
                color = MaterialTheme.colorScheme.surface,
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = null,
                    )
                }
            }
        }
    }
}

@Composable
fun ContractConfirmationDialog(
    title: String,
    message: String,
    confirmLabel: String,
    dismissLabel: String,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        shape = Shapes.HeroShape,
        title = { Text(title) },
        text = { Text(message) },
        confirmButton = {
            ActionTriggerButton(
                text = confirmLabel,
                onClick = onConfirm,
                variant = ActionTriggerVariant.Destructive,
            )
        },
        dismissButton = {
            ActionTriggerButton(
                text = dismissLabel,
                onClick = onDismiss,
                variant = ActionTriggerVariant.Secondary,
            )
        },
        containerColor = MaterialTheme.colorScheme.surface,
    )
}

@Composable
fun ContractSnackbarHost(
    hostState: SnackbarHostState,
    modifier: Modifier = Modifier,
) {
    SnackbarHost(
        hostState = hostState,
        modifier = modifier,
    ) { snackbarData ->
        Snackbar(
            modifier = Modifier.padding(horizontal = Spacing.MD, vertical = Spacing.SM),
            shape = Shapes.RoundedCapPrimary,
            containerColor = MaterialTheme.colorScheme.primary,
            contentColor = MaterialTheme.colorScheme.onPrimary,
            snackbarData = snackbarData,
        )
    }
}
