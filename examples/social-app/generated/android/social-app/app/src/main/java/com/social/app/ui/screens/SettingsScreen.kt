package com.social.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import com.arkivanov.mvikotlin.core.store.StoreFactory
import com.arkivanov.mvikotlin.extensions.coroutines.stateFlow
import com.social.app.R
import com.social.app.data.preferences.PreferencesRepository
import com.social.app.data.preferences.ThemeMode
import com.social.app.ui.components.ActionTriggerButton
import com.social.app.ui.components.ActionTriggerVariant
import com.social.app.ui.components.ChipOption
import com.social.app.ui.components.ContractConfirmationDialog
import com.social.app.ui.components.ContractSectionHeader
import com.social.app.ui.components.ContractSelectField
import com.social.app.ui.components.ContractToggleField
import com.social.app.ui.theme.Spacing
import androidx.compose.runtime.collectAsState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBackClick: () -> Unit,
    onEditProfileClick: () -> Unit,
    preferencesRepository: PreferencesRepository,
    storeFactory: StoreFactory,
) {
    val storeScope = rememberCoroutineScope()
    val store =
        remember(preferencesRepository, storeFactory) {
            SettingsStoreFactory(
                storeFactory = storeFactory,
                preferencesRepository = preferencesRepository,
            ).create()
        }
    DisposableEffect(store) {
        onDispose(store::dispose)
    }
    val stateFlow = remember(store, storeScope) { store.stateFlow(storeScope) }
    val state by stateFlow.collectAsState()
    val preferences = state.preferences
    var themeExpanded by remember { mutableStateOf(false) }
    var showLogoutDialog by remember { mutableStateOf(false) }

    val themeOptions =
        listOf(
            ChipOption("system", stringResource(R.string.settings_theme_system)),
            ChipOption("light", stringResource(R.string.settings_theme_light)),
            ChipOption("dark", stringResource(R.string.settings_theme_dark)),
        )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.nav_settings)) },
                navigationIcon = {
                    IconButton(onClick = onBackClick) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = Spacing.MD)
                .verticalScroll(rememberScrollState())
                .padding(bottom = Spacing.XL),
            verticalArrangement = Arrangement.spacedBy(Spacing.SM),
        ) {
            ContractSectionHeader(stringResource(R.string.settings_appearance))
            ContractSelectField(
                label = stringResource(R.string.settings_theme),
                selectedLabel = themeOptions.first { it.value == preferences.themeMode.storageValue }.label,
                expanded = themeExpanded,
                onExpandedChange = { themeExpanded = it },
                options = themeOptions,
                onOptionSelected = {
                    store.accept(SettingsStore.Intent.SelectTheme(ThemeMode.fromStorageValue(it.value)))
                },
            )

            ContractSectionHeader(stringResource(R.string.settings_notifications))
            ContractToggleField(
                label = stringResource(R.string.settings_push_notifications),
                checked = preferences.pushNotifications,
                onCheckedChange = {
                    store.accept(SettingsStore.Intent.SetPushNotifications(it))
                },
            )
            ContractToggleField(
                label = stringResource(R.string.settings_message_previews),
                checked = preferences.messagePreviews,
                onCheckedChange = {
                    store.accept(SettingsStore.Intent.SetMessagePreviews(it))
                },
            )

            ContractSectionHeader(stringResource(R.string.settings_language))
            ContractToggleField(
                label = stringResource(R.string.settings_auto_translate),
                checked = preferences.autoTranslate,
                onCheckedChange = {
                    store.accept(SettingsStore.Intent.SetAutoTranslate(it))
                },
            )

            ContractSectionHeader(stringResource(R.string.settings_account))
            ActionTriggerButton(
                text = stringResource(R.string.settings_edit_profile),
                onClick = onEditProfileClick,
                variant = ActionTriggerVariant.Secondary,
                fullWidth = true,
                icon = { Icon(Icons.Default.Edit, contentDescription = null) },
            )
            ActionTriggerButton(
                text = stringResource(R.string.settings_logout),
                onClick = { showLogoutDialog = true },
                variant = ActionTriggerVariant.Destructive,
                fullWidth = true,
            )
        }
    }

    if (showLogoutDialog) {
        ContractConfirmationDialog(
            title = stringResource(R.string.settings_logout),
            message = stringResource(R.string.settings_logout_confirm),
            confirmLabel = stringResource(R.string.settings_logout),
            dismissLabel = stringResource(R.string.common_cancel),
            onConfirm = { showLogoutDialog = false },
            onDismiss = { showLogoutDialog = false },
        )
    }
}
