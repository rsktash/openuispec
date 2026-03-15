import SwiftUI

struct ProfileEditView: View {
    @Bindable var model: AppModel
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var email = ""

    var body: some View {
        Form {
            Section {
                VStack(spacing: 12) {
                    Image(systemName: model.currentUser.avatarSymbol ?? "person.crop.circle.fill")
                        .font(.system(size: 54))
                        .foregroundStyle(AppPalette.brandPrimary)
                    Text(model.currentUser.name)
                        .font(.headline)
                    Text(model.currentUser.email)
                        .foregroundStyle(AppPalette.textSecondary)
                    Button(model.localized("profile.change_photo")) {}
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
            }

            Section {
                TextField(model.localized("profile.field_name"), text: $name)
                TextField(model.localized("profile.field_email"), text: $email)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.emailAddress)
            }

            Section {
                Button(model.localized("profile.save")) {
                    model.updateProfile(name: name, email: email)
                    dismiss()
                }
                .buttonStyle(.borderedProminent)
                .frame(maxWidth: .infinity, alignment: .center)
            }
        }
        .navigationTitle(model.localized("profile.save"))
        .onAppear {
            name = model.currentUser.name
            email = model.currentUser.email
        }
    }
}
