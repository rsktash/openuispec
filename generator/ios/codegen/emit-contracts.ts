/**
 * Emits reusable SwiftUI View components for each contract family.
 */

import { fileHeader } from "./swift-utils.js";

export function emitActionTriggerView(): string {
  let code = fileHeader("ActionTriggerView.swift");

  code += `
enum ActionTriggerVariant: String {
    case primary, secondary, tertiary, ghost, destructive
}

enum ActionTriggerSize: String {
    case sm, md, lg
}

struct ActionTriggerView: View {
    let label: String
    var icon: String?
    var variant: ActionTriggerVariant = .primary
    var size: ActionTriggerSize = .md
    var fullWidth: Bool = false
    var isLoading: Bool = false
    var loadingLabel: String?
    var action: (() -> Void)?

    @Environment(\\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        Button {
            action?()
        } label: {
            HStack(spacing: Spacing.sm) {
                if isLoading {
                    ProgressView()
                        .tint(foregroundColor)
                } else if let icon {
                    Image(systemName: icon)
                        .font(iconFont)
                }
                Text(isLoading ? (loadingLabel ?? label) : label)
                    .font(textFont)
            }
            .frame(maxWidth: fullWidth ? .infinity : nil)
            .padding(.horizontal, horizontalPadding)
            .padding(.vertical, verticalPadding)
            .background(backgroundColor)
            .foregroundStyle(foregroundColor)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
            .overlay {
                if variant == .secondary || variant == .ghost {
                    RoundedRectangle(cornerRadius: cornerRadius)
                        .strokeBorder(borderColor, lineWidth: variant == .secondary ? 1 : 0)
                }
            }
        }
        .buttonStyle(.plain)
        .disabled(isLoading)
        .accessibilityLabel(label)
        .accessibilityAddTraits(.isButton)
    }

    private var textFont: Font {
        switch size {
        case .sm: return .caption
        case .md: return .body
        case .lg: return .headline
        }
    }

    private var iconFont: Font {
        switch size {
        case .sm: return .caption
        case .md: return .body
        case .lg: return .title3
        }
    }

    private var horizontalPadding: CGFloat {
        switch size {
        case .sm: return Spacing.sm
        case .md: return Spacing.md
        case .lg: return Spacing.lg
        }
    }

    private var verticalPadding: CGFloat {
        switch size {
        case .sm: return Spacing.xs
        case .md: return Spacing.sm
        case .lg: return Spacing.md
        }
    }

    private var cornerRadius: CGFloat {
        switch size {
        case .sm: return 6
        case .md: return 8
        case .lg: return 12
        }
    }

    private var backgroundColor: Color {
        switch variant {
        case .primary: return .brandPrimary
        case .secondary: return .clear
        case .tertiary: return .surfaceSecondary
        case .ghost: return .clear
        case .destructive: return .semanticDanger
        }
    }

    private var foregroundColor: Color {
        switch variant {
        case .primary: return .white
        case .secondary: return .brandPrimary
        case .tertiary: return .textPrimary
        case .ghost: return .brandPrimary
        case .destructive: return .white
        }
    }

    private var borderColor: Color {
        switch variant {
        case .secondary: return .borderDefault
        default: return .clear
        }
    }
}
`;
  return code;
}

export function emitDataDisplayView(): string {
  let code = fileHeader("DataDisplayView.swift");

  code += `
enum DataDisplayVariant: String {
    case hero, compact, card, inline, stat
}

struct DataDisplayView: View {
    let variant: DataDisplayVariant
    var title: String = ""
    var subtitle: String?
    var body_text: String?
    var icon: String?
    var iconColor: Color = .textSecondary
    var iconSize: CGFloat = 20
    var trailingText: String?
    var trailingIcon: String?
    var trailingIconColor: Color = .textTertiary
    var badgeText: String?
    var badgeSeverity: String?
    var badgeDot: Bool = false
    var isInteractive: Bool = false
    var onTap: (() -> Void)?

    var body: some View {
        Group {
            switch variant {
            case .hero:
                heroLayout
            case .compact:
                compactLayout
            case .card:
                cardLayout
            case .inline:
                inlineLayout
            case .stat:
                statLayout
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(title)
    }

    private var heroLayout: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            if let icon {
                Image(systemName: icon)
                    .font(.title)
                    .foregroundStyle(iconColor)
            }
            Text(title)
                .font(.headingLg)
                .foregroundStyle(Color.textPrimary)
            if let badgeText {
                BadgeView(text: badgeText, severity: badgeSeverity ?? "neutral")
            }
            if let subtitle {
                Text(subtitle)
                    .font(.bodySm)
                    .foregroundStyle(Color.textSecondary)
            }
        }
    }

    private var compactLayout: some View {
        Button {
            onTap?()
        } label: {
            HStack(spacing: Spacing.sm) {
                if let icon {
                    Image(systemName: icon)
                        .font(.system(size: iconSize))
                        .foregroundStyle(iconColor)
                        .frame(width: 24)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.body)
                        .foregroundStyle(Color.textPrimary)
                    if let subtitle {
                        Text(subtitle)
                            .font(.caption)
                            .foregroundStyle(Color.textSecondary)
                    }
                }
                Spacer()
                if badgeDot {
                    Circle()
                        .fill(severityColor(badgeSeverity))
                        .frame(width: 8, height: 8)
                }
                if let trailingText {
                    Text(trailingText)
                        .font(.bodySm)
                        .foregroundStyle(Color.textSecondary)
                }
                if let trailingIcon {
                    Image(systemName: trailingIcon)
                        .font(.caption)
                        .foregroundStyle(trailingIconColor)
                }
            }
            .padding(.vertical, Spacing.sm)
        }
        .buttonStyle(.plain)
        .disabled(!isInteractive)
    }

    private var cardLayout: some View {
        Button {
            onTap?()
        } label: {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack(spacing: Spacing.sm) {
                    if let icon {
                        Image(systemName: icon)
                            .font(.system(size: iconSize))
                            .foregroundStyle(iconColor)
                            .frame(width: 40, height: 40)
                            .background(iconColor.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: Spacing.sm))
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        Text(title)
                            .font(.headingSm)
                            .foregroundStyle(Color.textPrimary)
                        if let subtitle {
                            Text(subtitle)
                                .font(.caption)
                                .foregroundStyle(Color.textSecondary)
                        }
                    }
                    Spacer()
                    if let trailingIcon {
                        Image(systemName: trailingIcon)
                            .foregroundStyle(trailingIconColor)
                    }
                }
            }
            .padding(Spacing.md)
            .background(Color.surfaceSecondary)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
        .disabled(!isInteractive)
    }

    private var inlineLayout: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.body)
                .foregroundStyle(Color.textPrimary)
            if let subtitle {
                Text(subtitle)
                    .font(.bodySm)
                    .foregroundStyle(Color.textSecondary)
            }
        }
    }

    private var statLayout: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            HStack(spacing: Spacing.xs) {
                if let icon {
                    Image(systemName: icon)
                        .font(.system(size: iconSize))
                        .foregroundStyle(iconColor)
                }
                Text(title)
                    .font(.caption)
                    .foregroundStyle(Color.textTertiary)
            }
            if let body_text {
                Text(body_text)
                    .font(.headingSm)
                    .foregroundStyle(Color.textPrimary)
            }
        }
        .padding(Spacing.sm)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.surfaceSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func severityColor(_ severity: String?) -> Color {
        switch severity {
        case "success": return .semanticSuccess
        case "warning": return .semanticWarning
        case "error", "danger": return .semanticDanger
        case "info": return .semanticInfo
        default: return .textTertiary
        }
    }
}

struct BadgeView: View {
    let text: String
    var severity: String = "neutral"

    var body: some View {
        Text(text)
            .font(.caption2)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(backgroundColor)
            .foregroundStyle(foregroundColor)
            .clipShape(Capsule())
    }

    private var backgroundColor: Color {
        switch severity {
        case "success": return .semanticSuccess.opacity(0.15)
        case "warning": return .semanticWarning.opacity(0.15)
        case "error", "danger": return .semanticDanger.opacity(0.15)
        case "info": return .semanticInfo.opacity(0.15)
        default: return .textTertiary.opacity(0.15)
        }
    }

    private var foregroundColor: Color {
        switch severity {
        case "success": return .semanticSuccess
        case "warning": return .semanticWarning
        case "error", "danger": return .semanticDanger
        case "info": return .semanticInfo
        default: return .textSecondary
        }
    }
}
`;
  return code;
}

export function emitInputFieldView(): string {
  let code = fileHeader("InputFieldView.swift");

  code += `
enum InputFieldType: String {
    case text, multiline, select, date, toggle, checkbox, email
}

struct InputFieldView: View {
    let inputType: InputFieldType
    var label: String = ""
    var placeholder: String = ""
    var helperText: String?
    var icon: String?
    var isRequired: Bool = false
    var maxLength: Int?
    var clearable: Bool = false

    @Binding var textValue: String
    @Binding var boolValue: Bool
    @Binding var dateValue: Date
    @Binding var selectionValue: String

    var options: [SelectOption] = []
    var onSubmit: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            if !label.isEmpty && inputType != .checkbox && inputType != .toggle {
                HStack(spacing: 2) {
                    Text(label)
                        .font(.bodySm)
                        .foregroundStyle(Color.textSecondary)
                    if isRequired {
                        Text("*")
                            .foregroundStyle(Color.semanticDanger)
                    }
                }
            }

            Group {
                switch inputType {
                case .text, .email:
                    textField
                case .multiline:
                    textEditor
                case .select:
                    selectField
                case .date:
                    dateField
                case .toggle:
                    toggleField
                case .checkbox:
                    checkboxField
                }
            }

            if let helperText {
                Text(helperText)
                    .font(.caption)
                    .foregroundStyle(Color.textTertiary)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(label)
    }

    private var textField: some View {
        HStack(spacing: Spacing.sm) {
            if let icon {
                Image(systemName: icon)
                    .foregroundStyle(Color.textTertiary)
            }
            TextField(placeholder, text: $textValue)
                .textFieldStyle(.plain)
            if clearable && !textValue.isEmpty {
                Button {
                    textValue = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(Color.textTertiary)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(Spacing.sm)
        .background(Color.surfaceSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay {
            RoundedRectangle(cornerRadius: 8)
                .strokeBorder(Color.borderDefault, lineWidth: 1)
        }
    }

    private var textEditor: some View {
        TextEditor(text: $textValue)
            .frame(minHeight: 100)
            .padding(Spacing.xs)
            .background(Color.surfaceSecondary)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay {
                RoundedRectangle(cornerRadius: 8)
                    .strokeBorder(Color.borderDefault, lineWidth: 1)
            }
    }

    private var selectField: some View {
        Picker(label, selection: $selectionValue) {
            Text(placeholder.isEmpty ? "Select..." : placeholder)
                .tag("")
            ForEach(options) { option in
                HStack {
                    if let icon = option.icon {
                        Image(systemName: icon)
                    }
                    Text(option.label)
                }
                .tag(option.value)
            }
        }
        .pickerStyle(.menu)
        .tint(Color.textPrimary)
    }

    private var dateField: some View {
        DatePicker(
            label,
            selection: $dateValue,
            displayedComponents: [.date]
        )
        .datePickerStyle(.graphical)
    }

    private var toggleField: some View {
        Toggle(label, isOn: $boolValue)
            .tint(Color.brandPrimary)
    }

    private var checkboxField: some View {
        Button {
            boolValue.toggle()
        } label: {
            Image(systemName: boolValue ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(boolValue ? Color.brandPrimary : Color.textTertiary)
                .font(.title3)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityAddTraits(boolValue ? .isSelected : [])
    }
}

struct SelectOption: Identifiable, Hashable {
    let id: String
    let value: String
    let label: String
    var icon: String?
    var color: String?

    init(value: String, label: String, icon: String? = nil, color: String? = nil) {
        self.id = value
        self.value = value
        self.label = label
        self.icon = icon
        self.color = color
    }
}
`;
  return code;
}

export function emitCollectionView(): string {
  let code = fileHeader("CollectionView.swift");

  code += `
enum CollectionVariant: String {
    case list, grid, chips
}

enum CollectionLoadState {
    case loading
    case loaded
    case empty(icon: String, title: String, body: String)
    case error(message: String)
}

struct CollectionView<Item: Identifiable & Hashable, ItemView: View>: View {
    let variant: CollectionVariant
    let items: [Item]
    var loadState: CollectionLoadState = .loaded
    var columns: Int = 1
    var pullToRefresh: Bool = false
    var onRefresh: (() async -> Void)?
    var onItemTap: ((Item) -> Void)?
    @ViewBuilder let itemView: (Item) -> ItemView

    @Environment(\\.horizontalSizeClass) private var sizeClass

    var body: some View {
        Group {
            switch loadState {
            case .loading:
                loadingView
            case .loaded:
                if items.isEmpty {
                    emptyView(icon: "tray", title: "No items", body: "")
                } else {
                    contentView
                }
            case .empty(let icon, let title, let body):
                emptyView(icon: icon, title: title, body: body)
            case .error(let message):
                errorView(message: message)
            }
        }
    }

    @ViewBuilder
    private var contentView: some View {
        switch variant {
        case .list:
            LazyVStack(spacing: 0) {
                ForEach(items) { item in
                    Button {
                        onItemTap?(item)
                    } label: {
                        itemView(item)
                    }
                    .buttonStyle(.plain)
                    Divider()
                        .padding(.leading, Spacing.md)
                }
            }
        case .grid:
            let gridColumns = Array(repeating: GridItem(.flexible(), spacing: Spacing.md), count: effectiveColumns)
            LazyVGrid(columns: gridColumns, spacing: Spacing.md) {
                ForEach(items) { item in
                    Button {
                        onItemTap?(item)
                    } label: {
                        itemView(item)
                    }
                    .buttonStyle(.plain)
                }
            }
        case .chips:
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Spacing.sm) {
                    ForEach(items) { item in
                        Button {
                            onItemTap?(item)
                        } label: {
                            itemView(item)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private var effectiveColumns: Int {
        switch sizeClass {
        case .compact: return max(1, columns)
        default: return max(2, columns)
        }
    }

    private var loadingView: some View {
        VStack(spacing: Spacing.md) {
            ProgressView()
            Text("Loading...")
                .font(.bodySm)
                .foregroundStyle(Color.textTertiary)
        }
        .frame(maxWidth: .infinity, minHeight: 200)
    }

    private func emptyView(icon: String, title: String, body: String) -> some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: 48))
                .foregroundStyle(Color.textTertiary)
            Text(title)
                .font(.heading)
                .foregroundStyle(Color.textPrimary)
            if !body.isEmpty {
                Text(body)
                    .font(.bodySm)
                    .foregroundStyle(Color.textSecondary)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 200)
        .accessibilityElement(children: .combine)
    }

    private func errorView(message: String) -> some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundStyle(Color.semanticDanger)
            Text(message)
                .font(.bodySm)
                .foregroundStyle(Color.textSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, minHeight: 200)
    }
}
`;
  return code;
}

export function emitFeedbackView(): string {
  let code = fileHeader("FeedbackView.swift");

  code += `
enum FeedbackSeverity: String {
    case success, warning, error, info, neutral
}

struct ToastView: View {
    let message: String
    var severity: FeedbackSeverity = .neutral
    var icon: String?

    var body: some View {
        HStack(spacing: Spacing.sm) {
            if let icon {
                Image(systemName: icon)
                    .foregroundStyle(severityColor)
            }
            Text(message)
                .font(.bodySm)
                .foregroundStyle(Color.textPrimary)
            Spacer()
        }
        .padding(Spacing.md)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .elevation(Elevation.md)
        .padding(.horizontal, Spacing.md)
        .accessibilityLabel(message)
        .accessibilityAddTraits(.isStaticText)
    }

    private var severityColor: Color {
        switch severity {
        case .success: return .semanticSuccess
        case .warning: return .semanticWarning
        case .error: return .semanticDanger
        case .info: return .semanticInfo
        case .neutral: return .textSecondary
        }
    }
}

struct ToastModifier: ViewModifier {
    @Binding var isPresented: Bool
    let message: String
    var severity: FeedbackSeverity = .neutral
    var icon: String?
    var duration: TimeInterval = 3.0

    func body(content: Content) -> some View {
        content.overlay(alignment: .top) {
            if isPresented {
                ToastView(message: message, severity: severity, icon: icon)
                    .transition(.move(edge: .top).combined(with: .opacity))
                    .onAppear {
                        DispatchQueue.main.asyncAfter(deadline: .now() + duration) {
                            withAnimation { isPresented = false }
                        }
                    }
                    .padding(.top, Spacing.md)
            }
        }
        .animation(.easeOut(duration: Motion.quick), value: isPresented)
    }
}

extension View {
    func toast(isPresented: Binding<Bool>, message: String, severity: FeedbackSeverity = .neutral, icon: String? = nil) -> some View {
        modifier(ToastModifier(isPresented: isPresented, message: message, severity: severity, icon: icon))
    }
}
`;
  return code;
}

export function emitSurfaceView(): string {
  let code = fileHeader("SurfaceView.swift");

  code += `
struct SurfaceSheetView<Content: View>: View {
    let title: String
    @Binding var isPresented: Bool
    @ViewBuilder let content: () -> Content

    var body: some View {
        NavigationStack {
            ScrollView {
                content()
                    .padding(Spacing.md)
            }
            .navigationTitle(title)
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") {
                        isPresented = false
                    }
                }
            }
        }
        .accessibilityAddTraits(.isModal)
    }
}
`;
  return code;
}
