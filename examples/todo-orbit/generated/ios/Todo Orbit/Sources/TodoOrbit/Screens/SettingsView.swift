import SwiftUI

struct SettingsView: View {
    @ObservedObject var model: AppModel
    @State private var draft = Preferences(locale: .en, theme: .light, remindersEnabled: true, dailySummaryEnabled: false)
    @State private var showRecurringSheet = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("screens/settings")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(.secondary)
                        .textCase(.uppercase)
                    Text(model.string("settings.title"))
                        .font(.largeTitle.weight(.bold))
                    Text(model.string("settings.subtitle"))
                        .foregroundStyle(.secondary)
                }

                VStack(spacing: 14) {
                    Picker(model.string("settings.language"), selection: $draft.locale) {
                        Text(model.string("settings.language_en")).tag(AppLocale.en)
                        Text(model.string("settings.language_ru")).tag(AppLocale.ru)
                    }

                    Picker(model.string("settings.theme"), selection: $draft.theme) {
                        Text(model.string("settings.theme_light")).tag(ThemePreference.light)
                        Text(model.string("settings.theme_dark")).tag(ThemePreference.dark)
                    }

                    Toggle(model.string("settings.reminders"), isOn: $draft.remindersEnabled)
                    Toggle(model.string("settings.daily_summary"), isOn: $draft.dailySummaryEnabled)

                    Button(model.string("settings.save")) {
                        model.savePreferences(draft)
                    }
                    .buttonStyle(OrbitPrimaryButtonStyle())
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .orbitCard()

                VStack(alignment: .leading, spacing: 14) {
                    Text(model.string("settings.automation_title"))
                        .font(.title3.weight(.semibold))
                    Text(model.string("settings.automation_subtitle"))
                        .foregroundStyle(.secondary)

                    Button(model.string("settings.automation_create_rule")) {
                        showRecurringSheet = true
                    }
                    .buttonStyle(OrbitPrimaryButtonStyle())

                    if !model.rules.isEmpty {
                        ForEach(model.rules) { rule in
                            VStack(alignment: .leading, spacing: 6) {
                                Text(rule.name)
                                    .font(.headline)
                                Text(model.describe(rule: rule))
                                    .foregroundStyle(.secondary)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.vertical, 8)
                        }
                    }
                }
                .orbitCard()
            }
            .padding()
        }
        .navigationTitle(model.string("nav.settings"))
        .onAppear { draft = model.preferences }
        .sheet(isPresented: $showRecurringSheet) {
            RecurringRuleSheet(model: model)
        }
    }
}
