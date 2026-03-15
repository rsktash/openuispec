import SwiftUI

struct CalendarView: View {
    @Bindable var model: AppModel

    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: "calendar.badge.clock")
                .font(.system(size: 52))
                .foregroundStyle(AppPalette.brandPrimary)
            Text(model.localized("calendar.title"))
                .font(.largeTitle.weight(.bold))
            Text(model.localized("calendar.coming_soon"))
                .foregroundStyle(AppPalette.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
        .background(Color(.systemGroupedBackground))
        .navigationTitle(model.localized("calendar.title"))
    }
}
