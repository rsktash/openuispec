# TaskFlow — OpenUISpec Example Application

A complete task management app defined entirely in OpenUISpec v0.1, demonstrating how a single source of truth generates native iOS, Android, and Web applications.

## What this demonstrates

### All 7 contract families in use

| Contract | Where it's used | Variants exercised |
|----------|----------------|-------------------|
| `action_trigger` | FAB, form buttons, destructive delete, ghost cancel | primary, secondary, tertiary, destructive, ghost |
| `data_display` | Task items, stat cards, hero header, profile card, settings rows | card, compact, hero, stat, inline |
| `input_field` | Search, task form (text, multiline, select, date, toggle, checkbox) | text, multiline, select, date, toggle, checkbox |
| `nav_container` | Main tab bar (4 tabs with badge) | tab_bar (→ sidebar on web desktop) |
| `feedback` | Success toasts, error banners, delete confirmation dialog | toast, banner, dialog |
| `surface` | Assignee picker sheet, new project modal, create task sheet | sheet, modal |
| `collection` | Task list, filter chips, project grid, settings list, tag chips | list, grid, chips |

### Token system

- **5 token categories**: color (with priority + status semantic colors), typography (9-step scale), spacing (10-step with aliases), motion (4 durations + patterns), themes (light/dark/warm)
- **Constrained ranges**: Every token uses Level 2 (range-based) constraints
- **Platform flex**: ±15% spacing adaptation, system font fallbacks, dynamic color support

### Navigation

- **Tab-based root**: 4 tabs (Tasks, Projects, Calendar, Settings)
- **Push navigation**: Home → Task Detail, Projects → Project Detail
- **Modal flows**: Create Task (sheet), Edit Task (sheet), New Project (modal dialog)
- **Platform-adaptive**: tab bar on phone, rail on tablet, sidebar on desktop (web)

### Platform adaptation

- **iOS**: System tab bar, `.insetGrouped` list style, haptics, swipe actions on task rows, large title scroll, sheet with detents
- **Android**: Material 3 NavigationBar, ripple, predictive back, edge-to-edge, dynamic color
- **Web**: Responsive breakpoints (phone/tablet/desktop), keyboard shortcuts (⌘N, ⌘K, ⌘B), native `<dialog>`, CSS custom properties

## File structure

```
taskflow/
├── openuispec.yaml              # Root manifest + data model
├── tokens/
│   ├── color.yaml               # Brand + semantic + status colors
│   ├── typography.yaml          # Font family + 9-step type scale
│   ├── spacing.yaml             # 4px base unit, 10-step scale
│   ├── motion.yaml              # Durations, easings, patterns
│   └── themes.yaml              # Light, dark, warm variants
├── screens/
│   ├── home.yaml                # Task list with search, filters, FAB
│   ├── task_detail.yaml         # Full task view with actions + assignee sheet
│   ├── projects.yaml            # Project grid + new project dialog
│   └── settings.yaml            # Preferences, toggles, account management
├── flows/
│   └── create_task.yaml         # Task creation form (sheet presentation)
└── platform/
    ├── ios.yaml                 # SwiftUI overrides + behaviors
    ├── android.yaml             # Compose overrides + behaviors
    └── web.yaml                 # React overrides + responsive rules
```

## How to use this with an AI generator

Pass the entire `taskflow/` directory as context to an AI code generator with the prompt:

> Generate a native {ios|android|web} application from this OpenUISpec. Follow all contract state machines, apply token ranges for the target platform, and implement the navigation flows as defined. Use the platform adaptation file for target-specific overrides.

The AI should produce:
1. Compilable platform code (Swift/Kotlin/TypeScript)
2. All screens with correct contract-to-widget mapping
3. Navigation wiring matching the flow definitions
4. Theme support (light/dark at minimum)
5. Accessibility labels and roles per contract a11y specs
6. Loading, empty, and error states for all collections

## Spec coverage checklist

- [x] Root manifest with data model
- [x] Complete token system (color, typography, spacing, motion, themes)
- [x] All 7 contract families exercised with multiple variants
- [x] 4 screens composed from contracts
- [x] 1 multi-step flow (create task)
- [x] 2 inline surfaces (assignee picker sheet, new project modal)
- [x] Platform adaptation for iOS, Android, Web
- [x] Data binding with format expressions
- [x] Conditional rendering (`condition:` on description section)
- [x] State management (filters, search query, form submission)
- [x] Error handling with feedback contracts
- [x] Destructive actions with confirmation dialogs
- [x] Responsive layout hints (web breakpoints, grid column adaptation)
- [x] Keyboard shortcuts (web)
- [x] Swipe actions (iOS)
- [x] Platform-specific widget mapping

---

*TaskFlow is a reference implementation of OpenUISpec v0.1, not a production application.*
