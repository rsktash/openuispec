# OpenUISpec v0.1

> A single source of truth design language for AI-native, platform-native app development.

**Status:** Draft  
**Version:** 0.1  
**Authors:** Rustam Samandarov  
**Last updated:** 2026-03-13

---

## 1. Philosophy

OpenUISpec is not a cross-platform framework. It is a **semantic design language specification** from which AI generates native platform code. The spec describes *what* UI does and *how it should feel* — never *which widget to use*.

### Core principles

1. **Semantic over visual.** The spec defines behavioral intent, not pixel layouts. A "primary action trigger" maps to `Button` in SwiftUI, `Button` in Compose, and `<button>` in HTML — the spec never says "button."
2. **Constrained freedom.** Tokens use ranges, not exact values. Close enough to be recognizably the same brand; loose enough for each platform to feel native.
3. **Contract-driven.** Every component is a behavioral contract with typed props, a state machine, and accessibility requirements. If a state exists in the spec, the generated code must handle it.
4. **AI-first authoring.** The spec is structured for machine consumption: strongly typed, validatable, with generation hints that tell AI what it must, should, and may produce.
5. **Platform respect.** iOS should feel like iOS. Android should feel like Android. Web should feel like the web. The spec preserves platform identity; it does not erase it.

---

## 2. Document structure

An OpenUISpec project consists of:

```
project/
├── openuispec.yaml          # Root manifest
├── tokens/
│   ├── color.yaml
│   ├── typography.yaml
│   ├── spacing.yaml
│   ├── motion.yaml
│   ├── layout.yaml
│   └── themes.yaml
├── contracts/
│   ├── action_trigger.yaml
│   ├── data_display.yaml
│   ├── input_field.yaml
│   ├── nav_container.yaml
│   ├── feedback.yaml
│   ├── surface.yaml
│   └── collection.yaml
├── screens/
│   ├── home.yaml
│   ├── order_detail.yaml
│   └── settings.yaml
├── flows/
│   ├── onboarding.yaml
│   └── checkout.yaml
└── platform/
    ├── ios.yaml
    ├── android.yaml
    └── web.yaml
```

### Root manifest

```yaml
# openuispec.yaml
spec_version: "0.1"
project:
  name: "MyApp"
  description: "A sample application defined in OpenUISpec"
  
includes:
  tokens: "./tokens/"
  contracts: "./contracts/"
  screens: "./screens/"
  flows: "./flows/"
  platform: "./platform/"

generation:
  targets: [ios, android, web]
  ai_model: "any"                    # no model lock-in
  output_format:
    ios: { language: swift, framework: swiftui }
    android: { language: kotlin, framework: compose }
    web: { language: typescript, framework: react }
```

---

## 3. Token layer

Tokens define the visual language. Every token has three parts: a **semantic description** (why it exists), a **reference value** (the canonical default), and a **constraint range** (how far platforms may deviate).

### 3.1 Color tokens

```yaml
# tokens/color.yaml
color:
  brand:
    primary:
      semantic: "Main brand identity, primary actions, key interactive elements"
      reference: "#2563EB"
      range:
        hue: [215, 225]
        saturation: [70, 85]
        lightness: [45, 55]
      on_color:
        semantic: "Text/icons on brand.primary backgrounds"
        reference: "#FFFFFF"
        contrast_min: 4.5              # WCAG AA
      platform:
        ios: { dynamic: true }
        android: { harmonize: true }
        web: { exact: true }

    secondary:
      semantic: "Supporting brand color for accents and secondary elements"
      reference: "#7C3AED"
      range:
        hue: [265, 275]
        saturation: [65, 80]
        lightness: [40, 55]
      on_color:
        reference: "#FFFFFF"
        contrast_min: 4.5

  surface:
    primary:
      semantic: "Main content background"
      role: background
      reference: "#FFFFFF"
    secondary:
      semantic: "Grouped/card backgrounds, subtle elevation"
      role: background-variant
      reference: "#F8F9FA"
    tertiary:
      semantic: "Page-level background behind cards"
      role: canvas
      reference: "#F1F3F5"

  text:
    primary:
      semantic: "High-emphasis body text, headings"
      role: on-surface
      reference: "#111827"
      contrast_min: 7.0               # WCAG AAA
    secondary:
      semantic: "Medium-emphasis supporting text"
      role: on-surface-variant
      reference: "#6B7280"
      contrast_min: 4.5
    tertiary:
      semantic: "Low-emphasis hints, placeholders"
      role: on-surface-dim
      reference: "#9CA3AF"
      contrast_min: 3.0
    disabled:
      semantic: "Non-interactive text"
      role: on-surface-disabled
      reference: "#D1D5DB"

  semantic:
    success:
      value: { hue: [140, 155], saturation: [60, 80], lightness: [35, 45] }
      reference: "#059669"
      on_color: { reference: "#FFFFFF", contrast_min: 4.5 }
    warning:
      value: { hue: [35, 45], saturation: [85, 95], lightness: [45, 55] }
      reference: "#D97706"
      on_color: { reference: "#FFFFFF", contrast_min: 3.0 }
    danger:
      value: { hue: [0, 10], saturation: [70, 85], lightness: [45, 55] }
      reference: "#DC2626"
      on_color: { reference: "#FFFFFF", contrast_min: 4.5 }
    info:
      value: { hue: [200, 215], saturation: [70, 85], lightness: [45, 55] }
      reference: "#2563EB"
      on_color: { reference: "#FFFFFF", contrast_min: 4.5 }

  border:
    default:
      semantic: "Standard borders and dividers"
      reference: "#E5E7EB"
      opacity: 0.15
    emphasis:
      semantic: "Hover state, focused borders"
      reference: "#D1D5DB"
      opacity: 0.3
```

### 3.2 Typography tokens

```yaml
# tokens/typography.yaml
typography:
  font_family:
    primary:
      semantic: "Brand typeface for all UI text"
      value: "DM Sans"
      fallback_strategy: "geometric-sans"
      platform:
        ios: { system_alternative: "SF Pro" }
        android: { system_alternative: "Google Sans" }
        web: { load_strategy: "swap", source: "google_fonts" }
    accent:
      semantic: "Display and editorial emphasis"
      value: "Fraunces"
      fallback_strategy: "serif-display"

  scale:
    display_lg:
      semantic: "Hero text, splash screens"
      size: { base: 40, range: [36, 44] }
      weight: 700
      tracking: -0.025
      line_height: 1.15
    display:
      semantic: "Major section headers, onboarding titles"
      size: { base: 32, range: [28, 36] }
      weight: 700
      tracking: -0.02
      line_height: 1.2
    heading_lg:
      semantic: "Screen titles"
      size: { base: 24, range: [22, 26] }
      weight: 600
      tracking: -0.015
      line_height: 1.3
    heading:
      semantic: "Section headers"
      size: { base: 20, range: [18, 22] }
      weight: 600
      tracking: -0.01
      line_height: 1.35
    heading_sm:
      semantic: "Subsection headers, card titles"
      size: { base: 16, range: [15, 17] }
      weight: 600
      tracking: 0
      line_height: 1.4
    body:
      semantic: "Primary readable content"
      size: { base: 16, range: [14, 16] }
      weight: 400
      tracking: 0
      line_height: 1.5
    body_sm:
      semantic: "Secondary content, descriptions"
      size: { base: 14, range: [13, 15] }
      weight: 400
      tracking: 0.005
      line_height: 1.45
    caption:
      semantic: "Labels, timestamps, metadata"
      size: { base: 12, range: [11, 13] }
      weight: 400
      tracking: 0.02
      line_height: 1.35
    overline:
      semantic: "Category labels, section tags"
      size: { base: 11, range: [10, 12] }
      weight: 600
      tracking: 0.08
      transform: uppercase
      line_height: 1.3
```

### 3.3 Spacing tokens

```yaml
# tokens/spacing.yaml
spacing:
  base_unit: 4
  platform_flex: 0.15                 # platforms may shift ±15%
  
  scale:
    none: 0
    xxs: 2
    xs: 4
    sm: 8
    md: { base: 16, range: [12, 16] }
    lg: { base: 24, range: [20, 24] }
    xl: 32
    xxl: 48
    xxxl: 64

  # Semantic spacing aliases
  aliases:
    page_margin: { horizontal: lg, vertical: md }
    card_padding: { all: md }
    section_gap: xl
    inline_gap: sm
    stack_gap: md
```

### 3.4 Motion tokens

```yaml
# tokens/motion.yaml
motion:
  duration:
    instant: 100
    quick: 200
    normal: 300
    slow: 500
    
  easing:
    default: "ease-out"
    enter: "ease-out"
    exit: "ease-in"
    emphasis: "cubic-bezier(0.2, 0, 0, 1)"
    
  # Respect reduced motion globally
  reduced_motion: "remove-animation"
  
  patterns:
    press_feedback:
      duration: "instant"
      property: "scale"
      value: 0.97
    state_change:
      duration: "quick"
      property: "opacity, background"
    screen_enter:
      duration: "normal"
      easing: "enter"
      pattern: "slide-from-trailing"
    screen_exit:
      duration: "quick"
      easing: "exit"
      pattern: "slide-to-leading"
```

### 3.5 Layout tokens

Layout tokens define the adaptive breakpoint vocabulary and layout primitives. See **Section 5.5** for the full adaptive layout system.

```yaml
# tokens/layout.yaml
layout:
  size_classes:
    compact:   { width: { max: 600 },            columns: 4,  margin: "spacing.md" }
    regular:   { width: { min: 601, max: 1024 }, columns: 8,  margin: "spacing.lg" }
    expanded:  { width: { min: 1025 },           columns: 12, margin: "spacing.xl" }

  primitives: [stack, row, grid, scroll_vertical, split_view, adaptive]
```

Every screen and section references size classes by name (`compact`, `regular`, `expanded`), never by pixel values.

### 3.6 Themes

```yaml
# tokens/themes.yaml
themes:
  default: "light"
  
  variants:
    light:
      surface.primary: { lightness: [95, 100] }
      surface.secondary: { lightness: [92, 97] }
      surface.tertiary: { lightness: [88, 93] }
      text.primary: { lightness: [5, 15] }
      text.secondary: { lightness: [35, 45] }
      text.tertiary: { lightness: [55, 65] }
      border.default: { opacity: 0.15 }
      
    dark:
      surface.primary: { lightness: [8, 15] }
      surface.secondary: { lightness: [12, 20] }
      surface.tertiary: { lightness: [5, 10] }
      text.primary: { lightness: [85, 95] }
      text.secondary: { lightness: [55, 65] }
      text.tertiary: { lightness: [40, 50] }
      border.default: { opacity: 0.2 }
      
    brand:
      extends: "light"
      surface.primary: { hue: 35, saturation: [5, 10], lightness: [96, 99] }
      surface.secondary: { hue: 35, saturation: [4, 8], lightness: [92, 96] }

  platform:
    ios:
      supports_dynamic: true
      system_materials: true           # iOS vibrancy/blur
    android:
      material_you: true               # wallpaper-based theming
      dynamic_color: true
    web:
      prefers_color_scheme: true
      css_custom_properties: true
```

---

## 4. Component contracts

Each contract defines a **behavioral family** — a category of UI elements that share the same role, props shape, state machine, and accessibility pattern. The AI maps each contract to the most appropriate native widget per platform.

### Contract anatomy

Every contract contains:

| Section | Purpose | Required |
|---------|---------|----------|
| `semantic` | Human-readable description of what this family does | Yes |
| `props` | Typed inputs the component accepts | Yes |
| `states` | Finite state machine with valid transitions | Yes |
| `a11y` | Accessibility role, label pattern, focus behavior | Yes |
| `tokens` | Visual token bindings per variant | Yes |
| `platform_mapping` | Default native widget per platform | Yes |
| `generation` | AI generation hints, must/should/may rules | No |
| `test_cases` | Suggested verification scenarios | No |

### Modifier: `!exact`

Any token value can be suffixed with `!exact` to override the range system and force a precise value. Use sparingly — only for brand-critical values like logo dimensions or signature brand colors at specific usage points.

```yaml
# Example: exact override
logo_width: { value: 120, modifier: "!exact" }
```

---

### 4.1 `action_trigger`

Initiates an action, mutation, or navigation. The most common interactive contract.

```yaml
# contracts/action_trigger.yaml
action_trigger:
  semantic: "Initiates an action, state change, or navigation event"

  props:
    label: { type: string, required: true }
    icon: { type: icon_ref, required: false, position: [leading, trailing] }
    variant:
      type: enum
      values: [primary, secondary, tertiary, destructive, ghost]
      default: primary
    size:
      type: enum
      values: [sm, md, lg]
      default: md
    full_width: { type: bool, default: false }
    loading_label: { type: string, required: false }

  states:
    default:
      transitions_to: [pressed, focused, disabled, loading]
    pressed:
      transitions_to: [default, loading]
      duration: "motion.instant"
      feedback: "motion.patterns.press_feedback"
    focused:
      transitions_to: [pressed, default]
      style: "platform_focus_ring"
    loading:
      transitions_to: [default, disabled]
      behavior: "disables interaction, shows indeterminate progress"
      label_override: "props.loading_label"
    disabled:
      transitions_to: [default]
      behavior: "visually muted, non-interactive, excluded from tab order"

  a11y:
    role: button
    label: "props.label"
    traits:
      disabled: { announces: "dimmed | disabled" }
      loading: { announces: "loading" }
    focus:
      order: "document"
      style: "platform_default"
      keyboard: { activate: ["Enter", "Space"] }

  tokens:
    primary:
      background: "color.brand.primary"
      text: "color.brand.primary.on_color"
      min_height: { sm: 32, md: [44, 48], lg: 56 }
      padding_h: { sm: "spacing.sm", md: "spacing.md", lg: "spacing.lg" }
      radius: "spacing.sm"
    secondary:
      background: "color.surface.secondary"
      text: "color.text.primary"
      border: { width: 1, color: "color.border.emphasis" }
      min_height: { sm: 32, md: [44, 48], lg: 56 }
      padding_h: "spacing.md"
      radius: "spacing.sm"
    tertiary:
      background: transparent
      text: "color.brand.primary"
      min_height: { sm: 28, md: [36, 40], lg: 48 }
      padding_h: "spacing.sm"
    destructive:
      background: "color.semantic.danger"
      text: "color.semantic.danger.on_color"
      min_height: { sm: 32, md: [44, 48], lg: 56 }
      padding_h: "spacing.md"
      radius: "spacing.sm"
    ghost:
      background: transparent
      text: "color.text.secondary"
      min_height: { sm: 28, md: [36, 40], lg: 48 }
      padding_h: "spacing.xs"

  platform_mapping:
    ios:
      primary: { widget: "Button", style: ".borderedProminent" }
      secondary: { widget: "Button", style: ".bordered" }
      tertiary: { widget: "Button", style: ".borderless" }
      ghost: { widget: "Button", style: ".plain" }
    android:
      primary: { widget: "Button", composable: "Button" }
      secondary: { widget: "OutlinedButton", composable: "OutlinedButton" }
      tertiary: { widget: "TextButton", composable: "TextButton" }
      ghost: { widget: "TextButton", composable: "TextButton" }
    web:
      all: { element: "button", type: "button" }

  generation:
    must_handle:
      - "All declared states and transitions"
      - "Accessibility labels and role announcement"
      - "Token-accurate colors, spacing, and sizing per variant"
      - "Loading state with progress indicator"
      - "Disabled state removes from tab order"
    should_handle:
      - "Haptic feedback on press (iOS: .impact(style: .light))"
      - "Ripple effect on press (Android)"
      - "Press scale animation per motion.patterns.press_feedback"
      - "Keyboard activation via Enter and Space"
    may_handle:
      - "Long-press secondary action"
      - "Context menu on right-click (web)"

  test_cases:
    - "Renders with label and primary variant at md size"
    - "Shows loading state with spinner replacing or alongside label"
    - "Disabled state prevents tap/click and is excluded from focus order"
    - "VoiceOver announces: '{label}, button' / TalkBack: '{label}, button'"
    - "Focus ring visible on keyboard navigation"
```

---

### 4.2 `data_display`

Presents read-only information. The most diverse family — covers everything from stat cards to list items.

```yaml
# contracts/data_display.yaml
data_display:
  semantic: "Presents read-only information in a structured layout"

  props:
    title: { type: string, required: true }
    subtitle: { type: string, required: false }
    body: { type: string, required: false }
    media: { type: media_ref, required: false, position: [top, leading, background] }
    leading: { type: component_ref, required: false }
    trailing: { type: component_ref, required: false }
    metadata: { type: "map<string, string>", required: false }
    badge: { type: badge_config, required: false }
    variant:
      type: enum
      values: [card, compact, hero, stat, inline]
      default: card
    emphasis:
      type: enum
      values: [default, elevated, muted]
      default: default
    interactive: { type: bool, default: false }

  states:
    default:
      transitions_to: [pressed, highlighted]
    pressed:
      condition: "props.interactive == true"
      transitions_to: [default]
      duration: "motion.instant"
    highlighted:
      semantic: "Visually emphasized (e.g., unread, new, selected)"
      transitions_to: [default]
    loading:
      behavior: "Shows skeleton placeholder matching layout shape"
      transitions_to: [default]
    empty:
      behavior: "Shows empty state message"
      transitions_to: [default, loading]

  a11y:
    role:
      interactive: "button"
      static: "group"
    label: "props.title"
    hint: "props.subtitle"
    traits:
      highlighted: { announces: "new" }
      loading: { announces: "loading" }

  tokens:
    card:
      background: "color.surface.primary"
      border: { width: 0.5, color: "color.border.default" }
      radius: "spacing.md"
      padding: "spacing.md"
      title_style: "typography.heading_sm"
      subtitle_style: "typography.body_sm"
      body_style: "typography.body"
    compact:
      min_height: [44, 48]
      padding_v: "spacing.sm"
      padding_h: "spacing.md"
      title_style: "typography.body"
      subtitle_style: "typography.caption"
      separator: { color: "color.border.default", inset_leading: "spacing.md" }
    hero:
      padding: "spacing.lg"
      title_style: "typography.display"
      subtitle_style: "typography.body"
      media_height: { range: [200, 300] }
    stat:
      padding: "spacing.md"
      background: "color.surface.secondary"
      radius: "spacing.sm"
      label_style: "typography.caption"
      value_style: "typography.heading_lg"
    inline:
      padding: "spacing.xs"
      title_style: "typography.body_sm"

  platform_mapping:
    ios:
      card: { container: "GroupBox or custom View" }
      compact: { container: "HStack inside List row" }
      hero: { container: "custom header View" }
      stat: { container: "custom View" }
    android:
      card: { composable: "Card or ElevatedCard" }
      compact: { composable: "ListItem" }
      hero: { composable: "custom composable" }
      stat: { composable: "Surface" }
    web:
      card: { element: "article or div", class: "card" }
      compact: { element: "li", class: "list-item" }
      hero: { element: "header or section" }
      stat: { element: "div", class: "stat-card" }

  generation:
    must_handle:
      - "All variant layouts with correct typography hierarchy"
      - "Loading skeleton matching the variant shape"
      - "Empty state with configurable message"
      - "Interactive mode adds press feedback and button role"
    should_handle:
      - "Image lazy loading for media prop"
      - "Text truncation with configurable line limits"
      - "Badge rendering in top-trailing position"
```

---

### 4.3 `input_field`

Captures user input. Covers text, selection, toggles, and sliders.

```yaml
# contracts/input_field.yaml
input_field:
  semantic: "Captures and validates user input"

  props:
    label: { type: string, required: true }
    placeholder: { type: string, required: false }
    value: { type: any, required: false, binding: true }
    helper_text: { type: string, required: false }
    error_text: { type: string, required: false }
    input_type:
      type: enum
      values: [text, number, email, password, phone, multiline, date, time, select, toggle, slider, checkbox, radio]
      default: text
    required: { type: bool, default: false }
    max_length: { type: int, required: false }
    options: { type: "list<option>", required: false, condition: "input_type in [select, radio]" }
    range: { type: range_config, required: false, condition: "input_type == slider" }
    prefix: { type: string, required: false }
    suffix: { type: string, required: false }
    icon: { type: icon_ref, required: false, position: [leading, trailing] }
    clearable: { type: bool, default: false }

  states:
    empty:
      transitions_to: [focused]
      visual: "Shows placeholder, label in resting position"
    focused:
      transitions_to: [filled, empty, error]
      visual: "Label animates to active position, border emphasized"
      duration: "motion.quick"
    filled:
      transitions_to: [focused, disabled, error]
      visual: "Shows value, label in active position"
    error:
      transitions_to: [focused]
      visual: "Border and label in danger color, error_text visible"
    disabled:
      transitions_to: [empty, filled]
      behavior: "Non-interactive, visually muted"
    readonly:
      behavior: "Displays value, not editable, selectable for copy"

  a11y:
    role:
      text: "textfield"
      select: "combobox"
      toggle: "switch"
      slider: "slider"
      checkbox: "checkbox"
      radio: "radio"
    label: "props.label"
    hint: "props.helper_text"
    error: "props.error_text"
    required: "props.required"
    traits:
      error: { announces: "error: {error_text}" }
      disabled: { announces: "dimmed" }
    focus:
      order: "document"
      keyboard:
        text: { submit: "Return", next: "Tab" }
        toggle: { activate: "Space" }
        select: { open: "Space", navigate: "ArrowUp/ArrowDown" }

  tokens:
    text:
      min_height: [44, 48]
      padding_h: "spacing.md"
      padding_v: "spacing.sm"
      background: "color.surface.primary"
      border: { width: 1, color: "color.border.default" }
      border_focused: { width: 2, color: "color.brand.primary" }
      border_error: { width: 2, color: "color.semantic.danger" }
      radius: "spacing.sm"
      label_style: "typography.caption"
      value_style: "typography.body"
      placeholder_color: "color.text.tertiary"
      error_color: "color.semantic.danger"
    toggle:
      track_width: [51, 52]
      track_height: [31, 32]
      thumb_size: [27, 28]
      track_on: "color.brand.primary"
      track_off: "color.border.emphasis"
    slider:
      track_height: [4, 6]
      thumb_size: [20, 24]
      active_track: "color.brand.primary"
      inactive_track: "color.border.default"

  platform_mapping:
    ios:
      text: { widget: "TextField" }
      multiline: { widget: "TextEditor" }
      select: { widget: "Picker" }
      toggle: { widget: "Toggle" }
      slider: { widget: "Slider" }
      date: { widget: "DatePicker" }
    android:
      text: { composable: "OutlinedTextField" }
      multiline: { composable: "OutlinedTextField(singleLine=false)" }
      select: { composable: "ExposedDropdownMenuBox" }
      toggle: { composable: "Switch" }
      slider: { composable: "Slider" }
      date: { composable: "DatePicker" }
    web:
      text: { element: "input", type: "text" }
      multiline: { element: "textarea" }
      select: { element: "select" }
      toggle: { element: "input", type: "checkbox", role: "switch" }
      slider: { element: "input", type: "range" }
      date: { element: "input", type: "date" }

  generation:
    must_handle:
      - "All states including error with visible error_text"
      - "Label animation between resting and active positions"
      - "Accessibility labels, hints, and error announcements"
      - "Keyboard type adaptation per input_type"
      - "Required field validation"
    should_handle:
      - "Character count display when max_length is set"
      - "Clear button when clearable is true and field is filled"
      - "Prefix/suffix rendering without affecting input value"
      - "Secure text entry toggle for password type"
```

---

### 4.4 `nav_container`

Provides persistent navigation structure. Defines *how* a user moves between sections — not *where* they go (that's in flows).

```yaml
# contracts/nav_container.yaml
nav_container:
  semantic: "Provides persistent navigation between top-level sections"

  props:
    items:
      type: "list<nav_item>"
      required: true
      item_shape:
        id: { type: string, required: true }
        label: { type: string, required: true }
        icon: { type: icon_ref, required: true }
        icon_active: { type: icon_ref, required: false }
        badge: { type: badge_config, required: false }
        destination: { type: screen_ref, required: true }
    variant:
      type: enum
      values: [tab_bar, sidebar, drawer, bottom_nav, rail]
      default: tab_bar
    selected: { type: string, binding: true }
    collapsed: { type: bool, default: false, condition: "variant in [sidebar, rail]" }

  states:
    default:
      transitions_to: [item_pressed]
    item_pressed:
      transitions_to: [default]
      duration: "motion.quick"
      behavior: "Highlights pressed item, navigates to destination"
    collapsed:
      condition: "variant in [sidebar, rail]"
      transitions_to: [default]
      visual: "Compact mode showing only icons"
    expanded:
      condition: "variant in [sidebar, drawer]"
      transitions_to: [collapsed, default]
      visual: "Full mode showing icons and labels"

  a11y:
    role: "navigation"
    label: "Main navigation"
    item_role: "tab"
    traits:
      selected: { announces: "selected" }
      badge: { announces: "{badge.count} notifications" }
    focus:
      order: "before-content"
      keyboard:
        navigate: "ArrowLeft/ArrowRight (tab_bar) | ArrowUp/ArrowDown (sidebar)"
        activate: "Enter"

  tokens:
    tab_bar:
      height: [49, 56]                # iOS 49pt, Android 56dp
      background: "color.surface.primary"
      border_top: { width: 0.5, color: "color.border.default" }
      icon_size: 24
      label_style: "typography.caption"
      active_color: "color.brand.primary"
      inactive_color: "color.text.tertiary"
    sidebar:
      width: { collapsed: [64, 72], expanded: [220, 280] }
      background: "color.surface.secondary"
      item_height: [44, 48]
      item_radius: "spacing.sm"
      item_padding_h: "spacing.md"
      active_background: "color.brand.primary"
      active_text: "color.brand.primary.on_color"
      icon_size: 20
      label_style: "typography.body_sm"
    drawer:
      width: { range: [280, 320] }
      overlay_opacity: 0.5
      background: "color.surface.primary"
    rail:
      width: [72, 80]
      icon_size: 24
      label_style: "typography.caption"

  platform_mapping:
    ios:
      tab_bar: { widget: "TabView", style: ".tabViewStyle(.page) or default" }
      sidebar: { widget: "NavigationSplitView sidebar" }
      drawer: { widget: "custom sheet or NavigationSplitView" }
    android:
      tab_bar: { composable: "NavigationBar" }
      sidebar: { composable: "NavigationDrawer(permanent)" }
      drawer: { composable: "ModalNavigationDrawer" }
      rail: { composable: "NavigationRail" }
    web:
      tab_bar: { element: "nav", pattern: "bottom fixed bar" }
      sidebar: { element: "aside", pattern: "collapsible sidebar" }
      drawer: { element: "aside + overlay", pattern: "off-canvas" }

  generation:
    must_handle:
      - "Active/inactive state per item with visual differentiation"
      - "Badge rendering with count or dot indicator"
      - "Navigation role and tab semantics for screen readers"
      - "Keyboard arrow navigation between items"
    should_handle:
      - "Collapse/expand animation for sidebar variant"
      - "Swipe gesture to open/close drawer (mobile)"
      - "Responsive variant switching (sidebar on tablet, tab_bar on phone)"
      - "Safe area insets (iOS bottom, Android gesture nav)"
```

---

### 4.5 `feedback`

Communicates system status, confirmations, warnings, or errors to the user.

```yaml
# contracts/feedback.yaml
feedback:
  semantic: "Communicates system status, outcomes, or required decisions to the user"

  props:
    message: { type: string, required: true }
    title: { type: string, required: false }
    severity:
      type: enum
      values: [info, success, warning, error, neutral]
      default: neutral
    variant:
      type: enum
      values: [toast, banner, dialog, snackbar, inline]
      default: toast
    duration:
      type: int
      required: false
      default: 4000
      condition: "variant in [toast, snackbar]"
    actions:
      type: "list<action>"
      required: false
      max: 2
      item_shape:
        label: { type: string, required: true }
        action: { type: action_ref, required: true }
        variant: { type: enum, values: [primary, secondary, destructive], default: primary }
    dismissible: { type: bool, default: true }
    icon: { type: icon_ref, required: false, default_from: "severity" }

  states:
    hidden:
      transitions_to: [entering]
    entering:
      transitions_to: [visible]
      duration: "motion.quick"
      animation: "variant-specific enter animation"
    visible:
      transitions_to: [exiting]
      duration: "props.duration (auto) or indefinite (manual dismiss)"
    exiting:
      transitions_to: [hidden]
      duration: "motion.quick"
      animation: "variant-specific exit animation"

  a11y:
    role:
      toast: "status"
      banner: "alert"
      dialog: "alertdialog"
      snackbar: "status"
      inline: "status"
    label: "props.title or props.message"
    live:
      error: "assertive"
      warning: "assertive"
      default: "polite"
    focus:
      dialog: "traps focus, returns on dismiss"
      toast: "does not steal focus"

  tokens:
    toast:
      background: "color.surface.primary"
      border: { width: 0.5, color: "color.border.default" }
      radius: "spacing.sm"
      padding: "spacing.md"
      shadow: "elevation.md"
      max_width: 400
      position: "bottom-center | top-center"
      message_style: "typography.body_sm"
    banner:
      padding_v: "spacing.sm"
      padding_h: "spacing.md"
      background_by_severity:
        info: "color.semantic.info (10% opacity)"
        success: "color.semantic.success (10% opacity)"
        warning: "color.semantic.warning (10% opacity)"
        error: "color.semantic.danger (10% opacity)"
      border_leading: { width: 3, color_from: "severity" }
      icon_size: 20
      message_style: "typography.body_sm"
    dialog:
      background: "color.surface.primary"
      radius: "spacing.md"
      padding: "spacing.lg"
      max_width: { range: [280, 400] }
      overlay_opacity: 0.5
      title_style: "typography.heading"
      message_style: "typography.body"
    snackbar:
      background: "color.text.primary"
      text: "color.surface.primary"
      radius: "spacing.sm"
      padding_v: "spacing.sm"
      padding_h: "spacing.md"
      position: "bottom"
      margin_bottom: "spacing.lg"

  platform_mapping:
    ios:
      toast: { pattern: "custom overlay" }
      banner: { pattern: "custom top banner" }
      dialog: { widget: "Alert or ConfirmationDialog" }
      snackbar: { pattern: "custom bottom overlay" }
    android:
      toast: { pattern: "custom composable" }
      banner: { pattern: "custom composable" }
      dialog: { composable: "AlertDialog" }
      snackbar: { composable: "Snackbar" }
    web:
      toast: { pattern: "toast container, aria-live region" }
      banner: { element: "div", role: "alert" }
      dialog: { element: "dialog" }
      snackbar: { pattern: "bottom fixed, aria-live region" }

  generation:
    must_handle:
      - "Severity-based icon and color mapping"
      - "Auto-dismiss timer for toast/snackbar variants"
      - "Accessible live region announcements"
      - "Dialog focus trap and return on dismiss"
      - "Enter/exit animations per variant"
    should_handle:
      - "Swipe-to-dismiss on mobile (toast/snackbar)"
      - "Stacking multiple toasts without overlap"
      - "Reduced motion: instant show/hide"
```

---

### 4.6 `surface`

Provides a contained UI layer — modals, sheets, panels, overlays. Unlike `data_display` (which shows content), `surface` *contains* other contracts.

```yaml
# contracts/surface.yaml
surface:
  semantic: "Provides a contained layer that hosts other components"

  props:
    variant:
      type: enum
      values: [modal, sheet, panel, popover, fullscreen]
      default: sheet
    title: { type: string, required: false }
    content: { type: "list<component_ref>", required: true }
    size:
      type: enum
      values: [sm, md, lg, full]
      default: md
      condition: "variant in [modal, sheet, panel]"
    dismissible: { type: bool, default: true }
    close_action: { type: action_ref, required: false }
    detents:
      type: "list<enum>"
      values: [small, medium, large, full]
      default: [medium, large]
      condition: "variant == sheet"

  states:
    hidden:
      transitions_to: [presenting]
    presenting:
      transitions_to: [visible]
      duration: "motion.normal"
      animation: "variant-specific"
    visible:
      transitions_to: [dismissing]
    dismissing:
      transitions_to: [hidden]
      duration: "motion.quick"
    resizing:
      condition: "variant == sheet"
      transitions_to: [visible]
      behavior: "Sheet transitions between detent sizes"

  a11y:
    role:
      modal: "dialog"
      sheet: "dialog"
      panel: "complementary"
      popover: "dialog"
      fullscreen: "dialog"
    label: "props.title"
    focus:
      modal: { trap: true, return_on_dismiss: true }
      sheet: { trap: true, return_on_dismiss: true }
      panel: { trap: false }
      popover: { trap: true, return_on_dismiss: true }
    dismiss:
      gesture: "swipe-down (sheet), tap-outside (modal, popover)"
      keyboard: "Escape"

  tokens:
    modal:
      background: "color.surface.primary"
      radius: "spacing.md"
      padding: "spacing.lg"
      overlay_opacity: 0.5
      max_width: { sm: 320, md: 480, lg: 640 }
      shadow: "elevation.lg"
    sheet:
      background: "color.surface.primary"
      radius_top: "spacing.md"
      padding: "spacing.md"
      drag_indicator:
        width: 36
        height: 4
        radius: 2
        color: "color.border.emphasis"
        margin_top: "spacing.sm"
    panel:
      background: "color.surface.secondary"
      border_leading: { width: 0.5, color: "color.border.default" }
      width: { sm: 280, md: 360, lg: 480 }
    popover:
      background: "color.surface.primary"
      radius: "spacing.sm"
      padding: "spacing.md"
      shadow: "elevation.md"
      arrow_size: 8
    fullscreen:
      background: "color.surface.primary"
      safe_area: true

  platform_mapping:
    ios:
      modal: { widget: "sheet(detents: [.medium])" }
      sheet: { widget: ".sheet with detents" }
      panel: { widget: "NavigationSplitView detail" }
      popover: { widget: ".popover" }
      fullscreen: { widget: ".fullScreenCover" }
    android:
      modal: { composable: "AlertDialog or Dialog" }
      sheet: { composable: "ModalBottomSheet" }
      panel: { composable: "custom side panel" }
      popover: { composable: "DropdownMenu or Popup" }
      fullscreen: { composable: "Dialog(fullscreen)" }
    web:
      modal: { element: "dialog" }
      sheet: { pattern: "bottom drawer with drag" }
      panel: { element: "aside" }
      popover: { element: "div", attribute: "popover" }
      fullscreen: { pattern: "full-viewport overlay" }

  generation:
    must_handle:
      - "Focus trap for modal/sheet/popover variants"
      - "Overlay/scrim with correct opacity"
      - "Dismiss via gesture, tap-outside, and Escape key"
      - "Return focus to trigger element on dismiss"
      - "Present/dismiss animations"
    should_handle:
      - "Sheet detent snapping with drag gesture"
      - "Keyboard avoidance when content includes input_field"
      - "Safe area insets (iOS notch, Android gesture bar)"
```

---

### 4.7 `collection`

Renders a repeating set of items. Handles lists, grids, tables, and carousels.

```yaml
# contracts/collection.yaml
collection:
  semantic: "Renders a repeating set of data items in a structured layout"

  props:
    data: { type: "list<any>", required: true, binding: true }
    item_contract: { type: contract_ref, required: true }
    item_props_map:
      type: "map<string, data_path>"
      required: true
      semantic: "Maps item_contract props to data fields"
    variant:
      type: enum
      values: [list, grid, table, carousel, chips]
      default: list
    header: { type: component_ref, required: false }
    footer: { type: component_ref, required: false }
    empty_state:
      type: component_ref
      required: false
      default_semantic: "Shown when data is empty"
    separator:
      type: enum
      values: [line, space, none]
      default: line
      condition: "variant == list"
    columns:
      type: int
      range: [2, 6]
      default: 2
      condition: "variant == grid"
    selectable: { type: bool, default: false }
    selection_mode: { type: enum, values: [single, multiple], default: single }
    searchable: { type: bool, default: false }
    sortable: { type: bool, default: false }
    paginated: { type: bool, default: false }
    page_size: { type: int, default: 20 }
    pull_to_refresh: { type: bool, default: false }

  states:
    idle:
      transitions_to: [loading, refreshing]
    loading:
      transitions_to: [idle, error]
      behavior: "Shows skeleton items matching item_contract shape"
      skeleton_count: 5
    refreshing:
      transitions_to: [idle, error]
      behavior: "Pull-to-refresh indicator, content stays visible"
    error:
      transitions_to: [idle, loading]
      behavior: "Shows error state with retry action"
    empty:
      transitions_to: [loading]
      behavior: "Shows empty_state component"
    paginating:
      transitions_to: [idle, error]
      behavior: "Loading indicator at bottom, existing items visible"

  a11y:
    role:
      list: "list"
      grid: "grid"
      table: "table"
      carousel: "region"
    item_role:
      list: "listitem"
      grid: "gridcell"
      table: "row"
    traits:
      selectable: { item_announces: "double-tap to select" }
      loading: { announces: "loading content" }
      empty: { announces: "no items" }
    focus:
      keyboard:
        list: "ArrowUp/ArrowDown to navigate items"
        grid: "Arrow keys for 2D navigation"
        carousel: "ArrowLeft/ArrowRight"

  tokens:
    list:
      item_min_height: [44, 48]
      separator_color: "color.border.default"
      separator_inset: "spacing.md"
      content_padding: "spacing.none"
    grid:
      gap: "spacing.md"
      item_radius: "spacing.sm"
      content_padding: "spacing.md"
    table:
      header_background: "color.surface.secondary"
      header_style: "typography.caption"
      header_weight: 600
      row_min_height: [44, 48]
      row_separator: { color: "color.border.default" }
      cell_padding_h: "spacing.md"
      cell_padding_v: "spacing.sm"
    carousel:
      item_gap: "spacing.md"
      peek_amount: 20
      snap: true
      content_padding_h: "spacing.md"
    chips:
      gap: "spacing.sm"
      item_height: 32
      item_padding_h: "spacing.md"
      item_radius: 16
      item_background: "color.surface.secondary"
      item_background_selected: "color.brand.primary"

  platform_mapping:
    ios:
      list: { widget: "List or LazyVStack" }
      grid: { widget: "LazyVGrid" }
      table: { widget: "Table (macOS) or custom (iOS)" }
      carousel: { widget: "ScrollView(.horizontal) + LazyHStack" }
    android:
      list: { composable: "LazyColumn" }
      grid: { composable: "LazyVerticalGrid" }
      table: { composable: "custom DataTable composable" }
      carousel: { composable: "LazyRow" }
    web:
      list: { element: "ul or ol" }
      grid: { element: "div", style: "CSS Grid" }
      table: { element: "table" }
      carousel: { element: "div", style: "scroll-snap" }

  generation:
    must_handle:
      - "Loading skeleton state with correct item count"
      - "Empty state rendering"
      - "Pull-to-refresh when enabled"
      - "Pagination / infinite scroll when enabled"
      - "Accessible list/grid roles and keyboard navigation"
    should_handle:
      - "Swipe-to-delete on list items (iOS)"
      - "Drag-to-reorder when sortable"
      - "Search/filter header integration"
      - "Section headers with sticky behavior"
      - "Item recycling / virtualization for large datasets"
```

---

## 5. Screen composition

Screens compose contracts into layouts. A screen never references platform widgets — only contracts with props.

```yaml
# Example: screens/order_detail.yaml
order_detail:
  semantic: "Displays detailed information about a single order"
  
  params:
    order_id: { type: string, required: true }
  
  data:
    order: { source: "api.orders.getById", params: { id: "params.order_id" } }
  
  layout:
    type: scroll_vertical
    safe_area: true
    padding: "spacing.page_margin"
    
    sections:
      - id: status_header
        contract: data_display
        variant: hero
        props:
          title: "Order #{order.id}"
          subtitle: "{order.status | format:status_label}"
          badge:
            text: "{order.status}"
            severity: "{order.status | map:status_severity}"
        
      - id: items_section
        margin_top: "spacing.section_gap"
        contract: collection
        variant: list
        props:
          data: "order.items"
          item_contract: data_display
          item_variant: compact
          item_props_map:
            title: "item.name"
            subtitle: "item.quantity × {item.unit_price | format:currency}"
            trailing: "{item.total | format:currency}"
          empty_state:
            message: "No items in this order"
            
      - id: total_row
        contract: data_display
        variant: inline
        emphasis: elevated
        props:
          title: "Total"
          trailing: "{order.total | format:currency}"
          
      - id: actions
        margin_top: "spacing.lg"
        layout:
          type: horizontal
          spacing: "spacing.sm"
        children:
          - contract: action_trigger
            variant: secondary
            size: md
            props:
              label: "Contact support"
              icon: "chat_bubble"
            action:
              type: navigate
              destination: "support_chat"
              params: { order_id: "order.id" }
              
          - contract: action_trigger
            variant: primary
            size: md
            props:
              label: "Track delivery"
              icon: "location_pin"
            action:
              type: navigate
              destination: "tracking_map"
              params: { order_id: "order.id" }
```

---

## 5.5 Adaptive layout

Screens must work across phones, tablets, and desktops. OpenUISpec provides a three-layer adaptive system: **size classes** (global vocabulary), **layout primitives** (building blocks), and **per-section adaptive overrides** (co-located in screen files).

### 5.5.1 Size classes

Size classes are the universal breakpoint vocabulary. Every platform maps to the same three semantic classes.

```yaml
# tokens/layout.yaml
layout:
  size_classes:
    compact:
      semantic: "Single-column, phone-first layout"
      width: { max: 600 }
      columns: 4
      margin: "spacing.md"

    regular:
      semantic: "Two-column capable, tablet and large phone layouts"
      width: { min: 601, max: 1024 }
      columns: 8
      margin: "spacing.lg"

    expanded:
      semantic: "Multi-column, desktop and large tablet layouts"
      width: { min: 1025 }
      columns: 12
      margin: "spacing.xl"

  platform_mapping:
    ios: { uses: "UIUserInterfaceSizeClass" }
    android: { uses: "WindowSizeClass" }
    web: { uses: "media queries" }
```

Screens and sections reference size classes by name (`compact`, `regular`, `expanded`), never by pixel values. This ensures the same spec works across platforms where pixel thresholds differ.

### 5.5.2 Layout primitives

Layout primitives are the building blocks for arranging content. They replace the informal `type: horizontal` / `type: vertical` patterns.

| Primitive | Behavior | iOS | Android | Web |
|-----------|----------|-----|---------|-----|
| `stack` | Vertical, top to bottom | `VStack` | `Column` | `flex-direction: column` |
| `row` | Horizontal, leading to trailing | `HStack` | `Row` | `flex-direction: row` |
| `grid` | 2D grid with columns | `LazyVGrid` | `LazyVerticalGrid` | `display: grid` |
| `scroll_vertical` | Scrollable content area | `ScrollView` | `LazyColumn` | `overflow-y: auto` |
| `split_view` | Side-by-side master-detail | `NavigationSplitView` | `ListDetailPaneScaffold` | CSS Grid |
| `adaptive` | Changes layout per size class | — | — | — |

Each primitive has typed props:

```yaml
stack:
  spacing: "token_ref"
  align: [leading, center, trailing, stretch]

row:
  spacing: "token_ref"
  align: [top, center, bottom, baseline, stretch]
  justify: [start, center, end, space-between]
  wrap: bool

grid:
  columns: "int or adaptive_map"
  gap: "token_ref"

split_view:
  primary_width: "fraction"
  collapse_at: "size_class"           # collapses to single-column below this
```

### 5.5.3 The `adaptive` key

Any section, contract instance, or layout in a screen file can include an `adaptive` key. It maps size classes to property overrides.

**On layouts** — changes the arrangement:

```yaml
- id: actions
  layout:
    adaptive:
      compact:
        type: stack
        spacing: "spacing.sm"
      regular:
        type: row
        spacing: "spacing.sm"
```

**On contract instances** — changes props per size class:

```yaml
- contract: action_trigger
  variant: primary
  props: { label: "Edit task" }
  adaptive:
    compact: { full_width: true }
    regular: { full_width: false }
```

**On screens** — changes the entire screen structure:

```yaml
layout:
  adaptive:
    compact:
      type: scroll_vertical
    expanded:
      type: split_view
      primary_width: 0.38
      primary: { sections: [list] }
      secondary: { sections: [detail] }
```

**On surfaces** — changes presentation mode:

```yaml
surfaces:
  picker:
    contract: surface
    adaptive:
      compact: { variant: sheet, detents: [medium] }
      expanded: { variant: panel, width: 360 }
```

### 5.5.4 Fallback behavior

If a size class is not specified, the system falls back to the nearest smaller class:
- `expanded` falls back to `regular`, then `compact`
- `regular` falls back to `compact`
- `compact` is always required when `adaptive` is used

This means you only need to specify overrides for size classes that differ from the default.

### 5.5.5 Reflow rules

Reflow rules define default adaptive behaviors that AI generators should apply automatically, even when screens don't explicitly declare `adaptive` overrides:

```yaml
reflow_rules:
  action_trigger:
    compact: { full_width: true }
    regular: { full_width: false }

  collection_grid:
    compact: { columns: 1 }
    regular: { columns: 2 }
    expanded: { columns: 3 }

  nav_container:
    compact: { variant: "tab_bar" }
    regular: { variant: "rail" }
    expanded: { variant: "sidebar" }

  surface_sheet:
    compact: { variant: "sheet" }
    expanded: { variant: "panel" }
```

Explicit `adaptive` overrides in screen files take precedence over reflow rules. Reflow rules serve as sensible defaults so that screens without adaptive annotations still behave reasonably across size classes.

### 5.5.6 AI generation requirements

For adaptive layout, AI generators:

**MUST:**
- Implement all three size classes (compact, regular, expanded)
- Map size classes to the correct platform API (`UIUserInterfaceSizeClass`, `WindowSizeClass`, media queries)
- Apply explicit `adaptive` overrides from screen files
- Apply reflow rules as defaults when no explicit override exists
- Handle `split_view.collapse_at` — collapse to single column below the specified class

**SHOULD:**
- Animate layout transitions smoothly when the size class changes (e.g., device rotation)
- Support `content_max_width` from size class definitions
- Apply `margin` from size class definitions as page-level padding

**MAY:**
- Support intermediate breakpoints beyond the three defined classes
- Implement `split_view` drag-to-resize on desktop


---

## 6. Navigation flows

Flows define multi-screen journeys. They are intent-based and platform-agnostic.

```yaml
# flows/checkout.yaml
checkout:
  semantic: "Guides user through order placement"
  
  entry: "cart_review"
  
  screens:
    cart_review:
      screen: "screens/cart_review"
      transitions:
        proceed: { to: "shipping_address", animation: "push" }
        back: { to: "$dismiss", animation: "pop" }
        
    shipping_address:
      screen: "screens/shipping_form"
      transitions:
        next: { to: "payment", animation: "push" }
        back: { to: "cart_review", animation: "pop" }
        
    payment:
      screen: "screens/payment_form"
      transitions:
        confirm: { to: "processing", animation: "push" }
        back: { to: "shipping_address", animation: "pop" }
        
    processing:
      screen: "screens/order_processing"
      blocking: true                    # no back gesture
      transitions:
        success: { to: "confirmation", animation: "fade" }
        failure: { to: "payment", animation: "pop", feedback: { variant: "banner", severity: "error" } }
        
    confirmation:
      screen: "screens/order_confirmation"
      terminal: true                    # replaces back stack
      transitions:
        done: { to: "$root", animation: "fade" }
        view_order: { to: "screens/order_detail", params_from: "result.order_id" }

  progress:
    show: true
    steps: ["Cart", "Address", "Payment", "Done"]
    style: "stepped_bar"

  platform_hints:
    ios: { presentation: "navigation_stack" }
    android: { presentation: "nav_host" }
    web: { presentation: "route_based", base_path: "/checkout" }
```

---

## 7. Platform adaptation

Platform files define overrides, behavioral preferences, and generation rules per target.

```yaml
# platform/ios.yaml
ios:
  framework: swiftui
  min_version: "17.0"
  
  overrides:
    nav_container:
      tab_bar: { height: 49, uses_system_tab_bar: true }
      sidebar: { uses_NavigationSplitView: true }
    surface:
      sheet: { detents: [.medium, .large], drag_indicator: true }
      modal: { prefers_sheet: true }
    feedback:
      toast: { position: "top" }
    input_field:
      date: { uses_system_picker: true, style: "wheel_or_graphical" }

  behaviors:
    haptics: true
    large_title_scroll: true
    swipe_back: true
    safe_area_respect: true
    dynamic_type: true

  generation:
    imports: ["SwiftUI", "Foundation"]
    architecture: "MVVM with @Observable"
    naming: "Swift conventions (camelCase, UpperCamelCase types)"
    
# platform/android.yaml
android:
  framework: compose
  min_sdk: 26
  target_sdk: 35
  
  overrides:
    nav_container:
      tab_bar: { height: 56, uses_NavigationBar: true }
    surface:
      sheet: { uses_ModalBottomSheet: true }
    feedback:
      snackbar: { uses_system_snackbar: true }
    action_trigger:
      primary: { ripple: true }

  behaviors:
    material_you: true
    predictive_back: true
    edge_to_edge: true
    dynamic_color: true
    
  generation:
    dependencies: ["material3", "navigation-compose"]
    architecture: "MVVM with ViewModel + StateFlow"
    naming: "Kotlin conventions (camelCase, PascalCase composables)"
    
# platform/web.yaml
web:
  framework: react
  language: typescript
  
  overrides:
    nav_container:
      variant_responsive:
        phone: "tab_bar"
        tablet: "rail"
        desktop: "sidebar"
    surface:
      sheet: { falls_back_to: "modal", reason: "no native sheet on web" }
    feedback:
      dialog: { uses_native_dialog_element: true }

  behaviors:
    prefers_color_scheme: true
    keyboard_navigation: true
    responsive_breakpoints:
      phone: { max: 640 }
      tablet: { min: 641, max: 1024 }
      desktop: { min: 1025 }
    
  generation:
    bundler: "vite"
    css: "css_modules or tailwind"
    routing: "react_router"
    state: "zustand or context"
    naming: "React conventions (PascalCase components, camelCase props)"
```

---

## 8. AI generation contract

This section defines the rules any AI code generator must follow when producing code from an OpenUISpec document.

### 8.1 Compliance levels

| Level | Label | Requirement |
|-------|-------|-------------|
| **MUST** | Required | Code will not pass validation without this |
| **SHOULD** | Recommended | Expected for production quality |
| **MAY** | Optional | Nice-to-have, platform-specific polish |

### 8.2 Universal MUSTs

Every AI generator, regardless of platform target, MUST:

1. Produce **compilable code** that builds without errors on the target platform.
2. Map every `contract` reference to the correct native widget per `platform_mapping`.
3. Apply all `tokens` values within their declared `range` constraints.
4. Implement every `state` declared in each used contract, including transitions.
5. Set correct `a11y.role` and `a11y.label` for every component instance.
6. Respect `themes` by generating light/dark mode support.
7. Handle `empty`, `loading`, and `error` states for `collection` contracts.
8. Wire all `action.navigate` declarations to the platform's navigation system.
9. Apply `motion.reduced_motion` preferences globally.
10. Implement all three size classes (`compact`, `regular`, `expanded`) and apply `adaptive` overrides from screen files.
11. Validate all `props` types and report spec errors before generating code.

### 8.3 Validation

A valid OpenUISpec document:

- Parses as valid YAML with no syntax errors
- Contains a root `openuispec.yaml` manifest with `spec_version`
- References only defined tokens, contracts, screens, and flows
- Has no circular `flow` transitions
- Has every `required: true` prop satisfied in screen compositions
- Has every `screen.params` satisfied by its callers

### 8.4 Drift detection

After initial generation, AI tools SHOULD support **drift detection**: comparing the current codebase against the spec to identify where manual platform refinements have diverged from the source of truth. Drift is expected and healthy — the goal is awareness, not enforcement.

---

## Appendix A: Type reference

| Type | Description | Example |
|------|-------------|---------|
| `string` | Text value | `"Submit order"` |
| `int` | Integer | `48` |
| `bool` | Boolean | `true` |
| `enum` | One of declared values | `primary \| secondary` |
| `icon_ref` | Icon identifier from icon set | `"chevron_right"` |
| `media_ref` | Image/video reference | `"assets/hero.jpg"` |
| `color_ref` | Token path | `"color.brand.primary"` |
| `component_ref` | Inline contract instance | `{ contract: data_display, ... }` |
| `contract_ref` | Contract family name | `"action_trigger"` |
| `screen_ref` | Screen identifier | `"screens/order_detail"` |
| `action_ref` | Navigation or mutation action | `{ type: navigate, destination: "..." }` |
| `data_path` | Dot-notation data binding | `"order.items[0].name"` |
| `badge_config` | `{ text?, count?, dot?, severity? }` | `{ count: 3, severity: "warning" }` |
| `range_config` | `{ min, max, step?, default? }` | `{ min: 0, max: 100, step: 1 }` |

## Appendix B: Format expression syntax

Props support inline format expressions for display:

```
{value | format:formatter_name}
{value | map:mapping_name}
{value1} literal text {value2}
```

Built-in formatters:
- `currency` — locale-aware currency formatting
- `date` — locale-aware date formatting
- `date_relative` — "2 hours ago", "yesterday"
- `number` — locale-aware number formatting
- `percentage` — value × 100 with % suffix
- `status_label` — maps status enum to display string
- `pluralize` — count-aware pluralization

Built-in mappers:
- `status_severity` — maps status values to severity enums
- `bool_to_label` — maps true/false to "Yes"/"No" or custom

---

*OpenUISpec v0.1 — Draft specification. Subject to revision.*
