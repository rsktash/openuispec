import SwiftUI

struct SettingsView: View {
    @Bindable var model: AppModel
    @State private var showDeleteAlert = false

    var body: some View {
        List {
            Section {
                NavigationLink {
                    ProfileEditView(model: model)
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: model.currentUser.avatarSymbol ?? "person.crop.circle.fill")
                            .font(.largeTitle)
                            .foregroundStyle(AppPalette.brandPrimary)
                        VStack(alignment: .leading) {
                            Text(model.currentUser.name)
                                .font(.headline)
                            Text(model.currentUser.email)
                                .font(.subheadline)
                                .foregroundStyle(AppPalette.textSecondary)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }

            Section {
                Picker(model.localized("settings.theme"), selection: $model.preferences.theme) {
                    Text(model.localized("settings.theme_system")).tag(ThemePreference.system)
                    Text(model.localized("settings.theme_light")).tag(ThemePreference.light)
                    Text(model.localized("settings.theme_dark")).tag(ThemePreference.dark)
                    Text(model.localized("settings.theme_warm")).tag(ThemePreference.warm)
                }

                Picker(model.localized("settings.default_priority"), selection: $model.preferences.defaultPriority) {
                    Text(model.localized("priority.low")).tag(TaskPriority.low)
                    Text(model.localized("priority.medium")).tag(TaskPriority.medium)
                    Text(model.localized("priority.high")).tag(TaskPriority.high)
                    Text(model.localized("priority.urgent")).tag(TaskPriority.urgent)
                }

                Toggle(model.localized("settings.notifications"), isOn: $model.preferences.notificationsEnabled)
                Toggle(model.localized("settings.reminders"), isOn: $model.preferences.remindersEnabled)
            } header: {
                Text(model.localized("settings.preferences"))
            } footer: {
                Text(model.localized("settings.reminders_helper"))
            }

            Section {
                Button(model.localized("settings.export")) {
                    model.exportData()
                }

                Button(model.localized("settings.delete_account"), role: .destructive) {
                    showDeleteAlert = true
                }
            } header: {
                Text(model.localized("settings.data"))
            }

            Section {
                VStack(spacing: 4) {
                    Text(model.localized("settings.app_version"))
                    Text(model.localized("settings.app_credit"))
                }
                .font(.caption)
                .foregroundStyle(AppPalette.textSecondary)
                .frame(maxWidth: .infinity)
            }
            .listRowBackground(Color.clear)
        }
        .navigationTitle(model.localized("nav.settings"))
        .alert(model.localized("settings.delete_title"), isPresented: $showDeleteAlert) {
            Button(model.localized("common.cancel"), role: .cancel) {}
            Button(model.localized("settings.delete_confirm"), role: .destructive) {
                model.toastMessage = model.localized("settings.delete_title")
            }
        } message: {
            Text(model.localized("settings.delete_message"))
        }
    }
}
