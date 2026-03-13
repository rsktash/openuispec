# TaskFlow — OpenUISpec Example Application

A complete task management app defined entirely in OpenUISpec v0.1, demonstrating how a single source of truth generates native iOS, Android, and Web applications.

## What this demonstrates

### All 7 contract families in use

| Contract | Where it's used | Variants exercised |
|----------|----------------|-------------------|
| `action_trigger` | FAB, form buttons, destructive delete, ghost cancel | primary, secondary, tertiary, destructive, ghost |
| `data_display` | Task items, stat cards, hero header, profile card, settings rows | card, compact, hero, stat, inline |
| `input_field` | Search, task form (text, multiline, select, date, toggle, checkbox) | text, multiline, select, date, toggle, checkbox |
| `nav_container` | Main tab bar (4 tabs with badge), adaptive rail/sidebar | tab_bar, rail, sidebar |
| `feedback` | Success toasts, error banners, delete confirmation dialog | toast, banner, dialog |
| `surface` | Assignee picker sheet/panel, new project modal, create task sheet | sheet, modal, panel |
| `collection` | Task list, filter chips, project grid, settings list, tag chips | list, grid, chips |

### Adaptive layout

- **Navigation**: tab_bar (compact) → rail (regular) → sidebar (expanded)
- **Task detail**: stacked stat cards → horizontal row, stacked buttons → inline row
- **Projects**: 1-column grid → 2-column → 3-column
- **Surfaces**: assignee picker renders as sheet (compact) or side panel (expanded)
- **Home**: single-column scroll (compact) → split_view master-detail (expanded)

### Action system

- **navigate**: push to detail, present sheet/modal, `$back` destination
- **api_call**: with `on_success`/`on_error` handlers, optimistic updates on toggle
- **confirm**: destructive delete with confirmation dialog
- **sequence**: dismiss + feedback + refresh composed in order
- **feedback**: success toasts, error banners as side-effect actions
- **set_state**: filter changes, form submission loading state

### Data binding

- **API sources**: `api.tasks.list`, `api.auth.currentUser`, etc.
- **Local state**: `state.active_filter`, `state.search_query`, `state.is_submitting`
- **Format expressions**: `{task.due_date | format:date_relative}`, `{item.priority | map:priority_to_severity}`
- **Computed expressions**: `{task.status == done ? 'Reopen task' : 'Mark complete'}`
- **Two-way binding**: `data_binding: "form.title"` on input fields
- **Conditional rendering**: `condition: "task.description != null"`

### Token system

- **7 token categories**: color, typography, spacing, elevation, motion, layout, themes
- **Constrained ranges**: Every token uses Level 2 (range-based) constraints
- **Platform flex**: ±15% spacing adaptation, system font fallbacks, dynamic color support

### Platform adaptation

- **iOS**: System tab bar, `.insetGrouped` list style, haptics, swipe actions, sheet detents
- **Android**: Material 3 NavigationBar, ripple, predictive back, edge-to-edge, dynamic color
- **Web**: Keyboard shortcuts (⌘N, ⌘K, ⌘B), native `<dialog>`, CSS custom properties

## File structure

```
taskflow/
├── openuispec.yaml              # Root manifest + data model + formatters + API endpoints
├── tokens/
│   ├── color.yaml               # Brand + semantic + status colors
│   ├── typography.yaml          # Font family + 9-step type scale
│   ├── spacing.yaml             # 4px base unit, 10-step scale
│   ├── elevation.yaml           # 4-level elevation (none/sm/md/lg)
│   ├── motion.yaml              # Durations, easings, patterns
│   ├── layout.yaml              # Size classes, primitives, reflow rules
│   └── themes.yaml              # Light, dark, warm variants
├── contracts/                   # 7 contract family stubs (see spec Section 4)
├── screens/
│   ├── home.yaml                # Task list with search, filters, FAB, adaptive nav
│   ├── task_detail.yaml         # Full task view with actions + assignee sheet
│   ├── projects.yaml            # Project grid + new project dialog
│   ├── project_detail.yaml      # Single project with task list (stub)
│   ├── settings.yaml            # Preferences, toggles, account management
│   └── calendar.yaml            # Calendar view (stub)
├── flows/
│   └── create_task.yaml         # Task creation form (sheet presentation)
└── platform/
    ├── ios.yaml                 # SwiftUI overrides + behaviors
    ├── android.yaml             # Compose overrides + behaviors
    └── web.yaml                 # React overrides + responsive rules
```

## How to use this with AI

Pass the entire `taskflow/` directory as context to an AI code generator with the prompt:

> Generate a native {ios|android|web} application from this OpenUISpec. Follow all contract state machines, apply token ranges for the target platform, and implement the navigation flows as defined. Use the platform adaptation file for target-specific overrides.

The AI should produce:
1. Compilable platform code (Swift/Kotlin/TypeScript)
2. All screens with correct contract-to-widget mapping
3. Navigation wiring matching the flow definitions
4. Theme support (light/dark at minimum)
5. Accessibility labels and roles per contract a11y specs
6. Loading, empty, and error states for all collections
7. Adaptive layout responding to size class changes

---

*TaskFlow is a reference implementation of OpenUISpec v0.1, not a production application.*
