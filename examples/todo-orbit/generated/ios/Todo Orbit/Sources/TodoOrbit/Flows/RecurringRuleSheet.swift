import SwiftUI

struct RecurringRuleSheet: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject var model: AppModel

    @State private var draft = RecurringRuleDraft()
    @State private var errors: [String: String] = [:]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    if !errors.isEmpty {
                        Text(model.string("validation.fix_errors"))
                            .font(.footnote.weight(.medium))
                            .foregroundStyle(.orange)
                            .padding(14)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Color.orange.opacity(0.1), in: CutCornerShape(cut: 12))
                    }

                    VStack(spacing: 14) {
                        TextField(model.string("recurring_rule.field_name"), text: $draft.name)
                        errorText("name")

                        TextField(model.string("recurring_rule.field_confirm_name"), text: $draft.confirmName)
                        errorText("confirmName")

                        Picker(model.string("recurring_rule.field_cadence"), selection: $draft.cadence) {
                            Text("—").tag(RecurrenceCadence?.none)
                            ForEach(RecurrenceCadence.allCases) { cadence in
                                Text(model.string("recurring_rule.cadence_\(cadence.rawValue)"))
                                    .tag(RecurrenceCadence?.some(cadence))
                            }
                        }
                        .pickerStyle(.segmented)
                        errorText("cadence")

                        TextField(model.string("recurring_rule.field_interval"), text: $draft.interval)
                            .keyboardType(.numberPad)
                        errorText("interval")

                        if draft.cadence == .weekly {
                            Picker(model.string("recurring_rule.field_weekday"), selection: $draft.weekday) {
                                Text("—").tag(Weekday?.none)
                                ForEach(Weekday.allCases) { weekday in
                                    Text(model.label(for: weekday)).tag(Weekday?.some(weekday))
                                }
                            }
                            .pickerStyle(.menu)
                            errorText("weekday")
                        }

                        if draft.cadence == .monthly {
                            TextField(model.string("recurring_rule.field_month_day"), text: $draft.monthDay)
                                .keyboardType(.numberPad)
                            errorText("monthDay")
                        }

                        DatePicker(model.string("recurring_rule.field_start_date"), selection: $draft.startDate, displayedComponents: .date)

                        Toggle(model.string("recurring_rule.field_has_end_date"), isOn: $draft.hasEndDate)
                        if draft.hasEndDate {
                            DatePicker(model.string("recurring_rule.field_end_date"), selection: $draft.endDate, displayedComponents: .date)
                            errorText("endDate")
                        }

                        if model.preferences.remindersEnabled {
                            TextField(model.string("recurring_rule.field_remind_at"), text: $draft.remindAt)
                                .textInputAutocapitalization(.never)
                            errorText("remindAt")
                        }

                        Toggle(model.string("recurring_rule.field_enable_summary"), isOn: $draft.enableSummary)
                        if draft.enableSummary {
                            Picker(model.string("recurring_rule.field_summary_channel"), selection: $draft.summaryChannel) {
                                Text("—").tag(SummaryChannel?.none)
                                ForEach(SummaryChannel.allCases) { channel in
                                    Text(model.string("recurring_rule.summary_\(channel.rawValue)"))
                                        .tag(SummaryChannel?.some(channel))
                                }
                            }
                            .pickerStyle(.segmented)
                            errorText("summaryChannel")
                        }
                    }
                    .textFieldStyle(.roundedBorder)
                    .orbitCard(fill: Color(uiColor: .secondarySystemGroupedBackground), stroke: Color.teal.opacity(0.18))

                    SchedulePreviewView(
                        model: model,
                        title: model.string("recurring_preview.title"),
                        result: SchedulePreviewView.compute(from: draft)
                    )
                }
                .padding()
            }
            .navigationTitle(model.string("recurring_rule.title"))
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(model.string("common.cancel")) { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(model.string("recurring_rule.save")) {
                        errors = model.addRecurringRule(from: draft)
                        if errors.isEmpty {
                            dismiss()
                        }
                    }
                }
            }
        }
        .presentationDetents([.large])
    }

    @ViewBuilder
    private func errorText(_ key: String) -> some View {
        if let message = errors[key] {
            Text(message)
                .font(.footnote)
                .foregroundStyle(.red)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}
