package com.social.app.ui.screens
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Image
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import com.social.app.R
import com.social.app.ui.components.ActionTriggerButton
import com.social.app.ui.components.ActionTriggerVariant
import com.social.app.ui.components.ChipOption
import com.social.app.ui.components.ContractSelectField
import com.social.app.ui.components.ContractTextField
import com.social.app.ui.theme.Spacing

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreatePostScreen(
    onDismiss: () -> Unit,
    onPublish: (String, String) -> Unit,
) {
    var body by remember { mutableStateOf("") }
    var audience by remember { mutableStateOf("public") }
    var expanded by remember { mutableStateOf(false) }
    val audienceOptions =
        listOf(
            ChipOption("public", stringResource(R.string.create_post_audience_public)),
            ChipOption("followers", stringResource(R.string.create_post_audience_followers)),
        )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.nav_create)) },
                navigationIcon = {
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = stringResource(R.string.common_cancel))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
            )
        },
    ) { padding ->
        Column(
            modifier =
                Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = Spacing.MD)
                    .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(Spacing.LG),
        ) {
            ContractTextField(
                value = body,
                onValueChange = { body = it.take(4000) },
                modifier = Modifier.padding(top = Spacing.SM),
                label = stringResource(R.string.create_post_body_placeholder),
                placeholder = stringResource(R.string.create_post_body_placeholder),
                singleLine = false,
                maxLines = 12,
            )

            ContractSelectField(
                label = stringResource(R.string.create_post_audience),
                selectedLabel = audienceOptions.first { it.value == audience }.label,
                expanded = expanded,
                onExpandedChange = { expanded = it },
                options = audienceOptions,
                onOptionSelected = { option -> audience = option.value },
            )

            ActionTriggerButton(
                text = stringResource(R.string.create_post_add_image),
                onClick = {},
                variant = ActionTriggerVariant.Secondary,
                fullWidth = true,
                icon = { Icon(Icons.Default.Image, contentDescription = null) },
            )

            ActionTriggerButton(
                text = stringResource(R.string.create_post_publish),
                onClick = {
                    onPublish(body, audience)
                },
                enabled = body.isNotBlank(),
                variant = ActionTriggerVariant.Primary,
                fullWidth = true,
            )

            Spacer(modifier = Modifier.height(Spacing.XL))
        }
    }
}
