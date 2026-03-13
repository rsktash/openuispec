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
│   ├── themes.yaml
│   └── icons.yaml
├── contracts/
│   ├── action_trigger.yaml
│   ├── data_display.yaml
│   ├── input_field.yaml
│   ├── nav_container.yaml
│   ├── feedback.yaml
│   ├── surface.yaml
│   ├── collection.yaml
│   └── x_media_player.yaml    # Custom contract (Section 12)
├── screens/
│   ├── home.yaml
│   ├── order_detail.yaml
│   └── settings.yaml
├── flows/
│   ├── onboarding.yaml
│   └── checkout.yaml
├── locales/
│   └── en.json
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
  locales: "./locales/"

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

### 3.5 Elevation tokens

Elevation tokens define shadow depth levels for layering surfaces. Each level has platform-specific shadow implementations.

```yaml
# tokens/elevation.yaml
elevation:
  none:
    semantic: "Flat, no shadow"
    value: "none"

  sm:
    semantic: "Subtle lift for hover states, input focus"
    platform:
      ios: { shadow: { color: "black", opacity: 0.04, radius: 2, y: 1 } }
      android: { elevation: 1 }
      web: { box_shadow: "0 1px 2px rgba(0,0,0,0.04)" }

  md:
    semantic: "Cards, toasts, popovers"
    platform:
      ios: { shadow: { color: "black", opacity: 0.08, radius: 8, y: 2 } }
      android: { elevation: 3 }
      web: { box_shadow: "0 2px 8px rgba(0,0,0,0.08)" }

  lg:
    semantic: "FABs, modals, sheets"
    platform:
      ios: { shadow: { color: "black", opacity: 0.12, radius: 16, y: 4 } }
      android: { elevation: 6 }
      web: { box_shadow: "0 4px 16px rgba(0,0,0,0.12)" }
```

Elevation tokens use a 4-level scale (none/sm/md/lg). Screens reference levels by name: `elevation: lg`. Platform implementations translate these into native shadow APIs — `UIKit`/`SwiftUI` shadow modifiers on iOS, `elevation` dp on Android, and CSS `box-shadow` on web.

### 3.6 Layout tokens

Layout tokens define the adaptive breakpoint vocabulary and layout primitives. See **Section 5.2** for the full adaptive layout system.

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

### 3.7 Themes

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

### 3.8 Icon tokens

Icon tokens provide a **semantic registry** that maps abstract icon names to platform-specific implementations. The registry is not an asset library — it is a lookup table that tells generators which native icon to use for each semantic concept.

#### Structure

```yaml
icons:
  sizes:
    sm: { semantic: "Inline indicators", value: 16 }
    md: { semantic: "Default actions and list items", value: 20 }
    lg: { semantic: "Prominent icons, section headers", value: 24 }
    xl: { semantic: "Hero icons, onboarding", value: 32 }

  variants:
    default: "outline"
    suffixes:
      _fill: "Filled/solid variant — selected or active states"

  fallback:
    strategy: "name_passthrough"   # or "error"
    missing_icon: "questionmark_circle"

  registry:
    navigation:
      chevron_right:
        semantic: "Navigate forward, disclosure indicator"
        platform:
          ios: "chevron.right"
          android: "chevron_right"
          web: "chevron-right"
    actions:
      checkmark:
        semantic: "Confirm, complete, done"
        variants: ["circle", "circle_fill", "list"]
        platform:
          ios: "checkmark"
          android: "check"
          web: "check"

  custom:
    my_app:
      custom_icon:
        semantic: "App-specific icon"
        platform:
          ios: "custom.symbol"
          android: "custom_icon"
          web: "custom-icon"
```

#### Registry categories

Icons are organized by semantic purpose:

| Category | Examples |
|----------|----------|
| `navigation` | chevron_right, chevron_left, arrow_uturn_left |
| `actions` | plus, pencil, trash, search, checkmark, square_arrow_up |
| `status` | flag, circle_fill, exclamationmark_triangle |
| `objects` | folder, calendar, clock, tag, gear, person |
| `content` | briefcase, rocket, star, heart, lightbulb |

#### Sizing scale

Four named sizes map to pixel values:

| Size | Value | Use case |
|------|-------|----------|
| `sm` | 16px | Inline indicators, badge icons |
| `md` | 20px | Default for actions and list items |
| `lg` | 24px | Section headers, empty states |
| `xl` | 32px | Hero icons, onboarding illustrations |

#### Variants

Icons default to the **outline** style. Suffixes modify the style:

- `_fill` — filled/solid, used for selected or active states (e.g. `folder_fill`, `flag_fill`)
- Additional suffixes (e.g. `_circle`, `_circle_fill`) are declared per icon in the `variants` array

When a variant suffix is appended, the generator applies the corresponding platform convention (e.g. `folder_fill` → SF Symbol `folder.fill` on iOS, `folder` with filled style on Android).

#### Fallback

Two strategies for icons not found in the registry:

- **`name_passthrough`** — pass the icon name directly to the native platform API. Useful during development and for platform-specific icons.
- **`error`** — fail validation if an icon is not registered. Useful for strict design systems.

The `missing_icon` field specifies a fallback icon to display when resolution fails at runtime.

#### Custom icons

The `custom` section follows the same shape as `registry` categories. App-specific icons are registered here to keep the canonical registry clean.

#### AI generation requirements

- **MUST** resolve every `icon_ref` string against the registry and use the platform-specific mapping for the target platform.
- **MUST** support all icons declared in the registry and custom sections.
- **SHOULD** apply the correct variant style based on suffix conventions.
- **SHOULD** use the sizing scale when no explicit size is provided.
- **MAY** use `name_passthrough` to support icons not in the registry when the fallback strategy allows it.

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
          type: row
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

### 5.1 Screen-level keys

Beyond contract props and layout primitives, screen files use several keys that modify how sections and contract instances behave. These keys are available on any section or contract instance within a screen's `sections:` array.

#### `tokens_override`

Locally overrides token values for a specific contract instance. The keys inside `tokens_override` correspond to the token names defined in the contract's `tokens:` block (Section 4).

```yaml
- contract: data_display
  variant: inline
  props:
    title: "Projects"
  tokens_override:
    title_style: "typography.heading_lg"      # override the default inline title style
    background: "color.surface.secondary"     # override background token
    radius: "spacing.sm"                      # override border radius
```

**Rules:**
- Keys must match token names defined in the contract's `tokens:` section for the active variant
- Values must be valid token references or literal values within the token's constraint range
- `tokens_override` on an `adaptive` block applies only to that size class
- Overrides are local — they do not propagate to child contracts

```yaml
# Adaptive tokens_override — larger title on expanded screens
adaptive:
  expanded:
    tokens_override:
      title_style: "typography.display"
```

#### `condition`

Controls whether a section or contract instance is rendered. When the expression evaluates to `false`, the element is excluded from layout (not hidden — fully removed from the render tree).

```yaml
- id: description
  condition: "task.description != null"
  contract: data_display
  variant: inline
  props:
    title: "{task.description}"
```

**Expression syntax:** Conditions use the same expression grammar as computed expressions (Section 10.5): `data_path comparator value`. Supported comparators: `==`, `!=`, `>`, `<`, `>=`, `<=`. Boolean data paths can be used directly: `condition: "preferences.notifications_enabled"`.

#### `position`

Controls the positioning mode of a section. By default, sections flow in document order within their parent layout. The `position` key overrides this.

| Value | Behavior | Platform mapping |
|-------|----------|-----------------|
| (default) | Normal document flow | — |
| `"floating-bottom-trailing"` | Floats above content, anchored to bottom-trailing corner | iOS: overlay + alignment, Android: Scaffold FAB slot, Web: `position: fixed` |
| `"floating-bottom-center"` | Floats above content, anchored to bottom center | Same, centered |
| `"inline"` | Explicit normal flow (used in adaptive overrides to un-float an element) | — |

```yaml
- id: fab
  position: "floating-bottom-trailing"
  contract: action_trigger
  variant: primary
  props: { label: "New task", icon: "plus" }
  # Un-float on expanded screens:
  adaptive:
    expanded:
      position: "inline"
```

#### `item_variant`

Used alongside `item_contract` in collection props to specify which variant of the item contract to use for rendering each item.

```yaml
- contract: collection
  variant: list
  props:
    data: "tasks"
    item_contract: data_display
    item_variant: compact                     # each item renders as data_display.compact
    item_props_map:
      title: "item.title"
```

When omitted, the item contract's default variant is used.

#### `state_binding`

Binds a contract's state machine states to data paths. This allows screen-level data to drive contract states declaratively, without requiring an explicit action.

```yaml
- contract: action_trigger
  variant: primary
  props:
    label: "Save"
    loading_label: "Saving..."
  state_binding:
    loading: "state.is_submitting"            # button enters loading state when is_submitting is true
    disabled: "state.form_invalid"            # button enters disabled state when form_invalid is true
```

**Rules:**
- Keys must be valid states from the contract's `states:` definition
- Values must be data paths that resolve to `bool`
- When the bound value is `true`, the contract transitions to that state
- When the bound value returns to `false`, the contract transitions back to `default`
- If multiple state bindings are `true` simultaneously, priority follows the contract's state machine (e.g., `loading` takes precedence over `disabled`)

---

## 5.2 Adaptive layout

Screens must work across phones, tablets, and desktops. OpenUISpec provides a three-layer adaptive system: **size classes** (global vocabulary), **layout primitives** (building blocks), and **per-section adaptive overrides** (co-located in screen files).

### 5.2.1 Size classes

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

### 5.2.2 Layout primitives

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

### 5.2.3 The `adaptive` key

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

### 5.2.4 Fallback behavior

If a size class is not specified, the system falls back to the nearest smaller class:
- `expanded` falls back to `regular`, then `compact`
- `regular` falls back to `compact`
- `compact` is always required when `adaptive` is used

This means you only need to specify overrides for size classes that differ from the default.

### 5.2.5 Reflow rules

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

### 5.2.6 AI generation requirements

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
    # Navigation variant is handled by the adaptive key on nav_container
    # in screen files — no ad-hoc variant_responsive needed here.
    surface:
      sheet: { falls_back_to: "modal" }
    feedback:
      dialog: { uses_native_dialog_element: true }

  behaviors:
    prefers_color_scheme: true
    keyboard_navigation: true
    # Breakpoints reference layout.size_classes (defined in tokens/layout.yaml):
    # compact: max 600px, regular: 601-1024px, expanded: 1025px+
    keyboard_shortcuts:
      new_task: { key: "n", modifier: "cmd/ctrl" }
      search: { key: "k", modifier: "cmd/ctrl" }

  generation:
    bundler: "vite"
    css: "tailwind"
    routing: "react_router"
    state: "zustand"
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
12. Generate platform-native localization resources from JSON locale files when `i18n` config is present (see Section 11).

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

## 9. Action system

Actions define what happens when a user interacts with the UI. Every `action:` property in a screen file references this system. Actions are composable, typed, and have defined error handling semantics.

### 9.1 Action vocabulary

Every action has a `type` and typed parameters. The full vocabulary:

| Type | Purpose | Params |
|------|---------|--------|
| `navigate` | Move to a screen or flow | `destination`, `params`, `presentation`, `animation` |
| `api_call` | Call a backend endpoint | `endpoint`, `params`, `body`, `method`, `on_success`, `on_error` |
| `set_state` | Update local screen state | `target`, `value` (or shorthand `{ key: value }`) |
| `present` | Show a surface (sheet, modal, popover) | `surface` (reference to surfaces section) |
| `dismiss` | Close the current surface or flow | (none, or `{ animate: bool }`) |
| `submit_form` | Validate and submit a form | `form_id` |
| `confirm` | Show a confirmation before proceeding | `confirmation` (feedback contract instance) |
| `refresh` | Re-fetch a data source | `target` (data path, e.g., `"screens/home.tasks"`) |
| `open_url` | Open an external URL | `url`, `in_app: bool` |
| `share` | Invoke the platform share sheet | `content` (text, url, or data ref) |
| `copy` | Copy text to clipboard | `value`, `feedback` (optional toast) |
| `sequence` | Execute multiple actions in order | `actions: list<action>` |
| `conditional` | Branch based on a condition | `condition`, `then`, `else` |
| `feedback` | Emit a feedback contract instance (toast, banner, etc.) | `variant`, `message`, `severity`, `duration`, `title`, `icon` |

### 9.2 Action definitions

#### `navigate`

```yaml
action:
  type: navigate
  destination: "screens/task_detail"   # screen ref or flow ref
  params: { task_id: "item.id" }       # passed as screen params
  presentation: "push"                 # push | sheet | modal | fullscreen | replace
  animation: "default"                 # default | fade | none
```

**Presentation modes:**

| Mode | Behavior | iOS | Android | Web |
|------|----------|-----|---------|-----|
| `push` | Adds to navigation stack | `NavigationLink` | `NavController.navigate` | route push |
| `sheet` | Presents as bottom sheet | `.sheet` | `ModalBottomSheet` | modal or drawer |
| `modal` | Presents as centered dialog | `.sheet` or `.fullScreenCover` | `Dialog` | `<dialog>` |
| `fullscreen` | Covers entire screen | `.fullScreenCover` | fullscreen `Dialog` | full-viewport |
| `replace` | Replaces current screen (no back) | replaces stack | `popUpTo` + navigate | route replace |

**Special destinations:**
- `$back` — pop the current screen
- `$root` — return to the root of the navigation stack
- `$dismiss` — dismiss the current surface (sheet, modal)

#### `api_call`

```yaml
action:
  type: api_call
  endpoint: "api.tasks.create"
  method: "POST"                        # GET | POST | PUT | PATCH | DELETE (default: inferred from endpoint)
  params: { id: "task.id" }             # URL/query params
  body: "form"                          # request body (form data, or explicit object)
  headers: {}                           # optional additional headers
  
  on_success:
    type: sequence
    actions:
      - { type: set_state, is_submitting: false }
      - { type: feedback, variant: toast, message: "Task created", severity: success }
      - { type: dismiss }
      - { type: refresh, target: "screens/home.tasks" }
      
  on_error:
    type: sequence
    actions:
      - { type: set_state, is_submitting: false }
      - { type: feedback, variant: banner, title: "Couldn't create task", message: "{error.message}", severity: error }
```

**Error object shape:**
When an API call fails, the `on_error` handler receives an `error` object:
```yaml
error:
  message: string          # human-readable error message
  code: string             # error code (e.g., "VALIDATION_ERROR", "NOT_FOUND")
  status: int              # HTTP status code (e.g., 400, 404, 500)
  fields: map<string, string>  # per-field validation errors (optional)
```

#### `set_state`

```yaml
# Full form
action:
  type: set_state
  target: "state.active_filter"
  value: "today"

# Shorthand — multiple state updates
action:
  type: set_state
  is_submitting: true
  error_message: null

# Computed value
action:
  type: set_state
  target: "state.item_count"
  value: "{state.item_count + 1}"
```

#### `confirm`

Wraps a destructive or significant action in a confirmation dialog:

```yaml
action:
  type: confirm
  confirmation:
    contract: feedback
    variant: dialog
    props:
      title: "Delete task?"
      message: "This action cannot be undone."
      severity: error
      actions:
        - label: "Cancel"
          variant: secondary
          action: { type: dismiss }
        - label: "Delete"
          variant: destructive
          action:                         # the actual action, executed on confirm
            type: api_call
            endpoint: "api.tasks.delete"
            params: { id: "task.id" }
```

#### `sequence`

Executes actions in order. Each action completes before the next begins.

```yaml
action:
  type: sequence
  actions:
    - { type: set_state, is_submitting: true }
    - type: api_call
      endpoint: "api.tasks.create"
      body: "form"
    - { type: feedback, variant: toast, message: "Created", severity: success }
    - { type: dismiss }
```

**Sequence stops on failure.** If any action in a sequence fails (e.g., `api_call` returns an error), subsequent actions do not execute. The `on_error` handler of the failed action runs instead.

#### `conditional`

Branches based on a runtime condition:

```yaml
action:
  type: conditional
  condition: "task.status == done"
  then:
    type: api_call
    endpoint: "api.tasks.reopen"
    params: { id: "task.id" }
  else:
    type: api_call
    endpoint: "api.tasks.complete"
    params: { id: "task.id" }
```

#### `feedback`

Emits a feedback contract instance (toast, banner, snackbar) as a side effect. Unlike `present`, this does not block the action chain — the feedback displays while execution continues.

```yaml
action:
  type: feedback
  variant: toast                        # toast | banner | snackbar | inline
  message: "Task created"
  severity: success                     # info | success | warning | error | neutral
  title: null                           # optional title (used by banner and dialog)
  icon: "checkmark_circle"              # optional, defaults from severity
  duration: 3000                        # ms, null = manual dismiss
```

#### `present`

Shows a named surface (sheet, modal, popover) defined in the screen's `surfaces:` block:

```yaml
action:
  type: present
  surface: "assignee_picker"            # key from surfaces: block
```

#### `dismiss`

Closes the current surface or flow. If called from within a sheet/modal, dismisses it. If called from within a flow, exits the flow.

```yaml
action:
  type: dismiss
  animate: true                         # default true; false = instant dismiss
```

#### `submit_form`

Validates all fields in the referenced form, then triggers the form's `on_submit:` handler. If validation fails, error states are set on individual fields. See Section 13 for the full validation rule system.

```yaml
action:
  type: submit_form
  form_id: "task_form"                  # matches form_id on the form section

# With extended options (Section 13.8)
action:
  type: submit_form
  form_id: "task_form"
  validate_only: true                   # run validation without triggering on_submit
  on_validation_error:                  # action to run when validation fails
    type: feedback
    variant: toast
    message: "Please fix the errors above"
    severity: warning
```

**Validation behavior:**
1. All fields with `required: true` (or `required_when` evaluating to true) are checked for non-empty values
2. Fields with `max_length` prop are checked for length (shorthand; see also `validate.max_length`)
3. Fields with `input_type: email` are checked for email format (shorthand; see also `validate.format`)
4. Fields with a `validate` block have all declared rules checked in order (Section 13.2)
5. If any field fails, its state transitions to `error` with `error_text` set to the rule's `message`
6. If `validate_only: true`, stop here (do not run `on_submit:`)
7. If `on_validation_error` is set and validation failed, execute that action
8. If all fields pass, the `on_submit:` handler executes

#### `refresh`

Re-fetches a data source. The target is a data path pointing to a screen's data entry.

```yaml
action:
  type: refresh
  target: "screens/home.tasks"          # screen.data_key
```

#### `open_url`

Opens an external URL in the system browser or an in-app browser.

```yaml
action:
  type: open_url
  url: "https://example.com/help"
  in_app: false                         # true = in-app browser; false = system browser
```

#### `share`

Invokes the platform share sheet:

```yaml
action:
  type: share
  content:
    text: "Check out this task: {task.title}"
    url: "https://app.taskflow.io/tasks/{task.id}"
```

#### `copy`

Copies a value to the clipboard, with an optional feedback toast:

```yaml
action:
  type: copy
  value: "{task.id}"
  feedback: { variant: toast, message: "Copied to clipboard", severity: info, duration: 2000 }
```

### 9.3 Inline action shorthand

For common single-action cases, a shorthand form is allowed:

```yaml
# Full form
action:
  type: navigate
  destination: "screens/task_detail"
  params: { task_id: "item.id" }

# Shorthand for navigate
action: { navigate: "screens/task_detail", params: { task_id: "item.id" } }

# Shorthand for dismiss
action: { dismiss: true }

# Shorthand for set_state
action: { set_state: { is_loading: true } }

# Shorthand for feedback (inline in on_success)
on_success:
  feedback: { variant: toast, message: "Done", severity: success }
```

AI generators MUST support both the full form and shorthand form.

### 9.4 Optimistic updates

For actions that modify data, the spec supports optimistic UI updates:

```yaml
action:
  type: api_call
  endpoint: "api.tasks.toggleStatus"
  params: { id: "task.id" }
  
  optimistic:
    target: "task.status"
    value: "{task.status == done ? 'todo' : 'done'}"
    revert_on_error: true
```

**Behavior:**
1. The `target` data path is updated immediately with `value`
2. The UI re-renders with the new value (no loading state)
3. The API call executes in the background
4. On success: the optimistic value is confirmed (or replaced with the server response)
5. On error: if `revert_on_error` is true, the value reverts to its previous state and the `on_error` handler runs

### 9.5 Action composition patterns

Common patterns that AI generators should recognize:

**Submit with loading state:**
```yaml
action:
  type: sequence
  actions:
    - { type: set_state, is_submitting: true }
    - type: api_call
      endpoint: "api.tasks.create"
      body: "form"
      on_success:
        type: sequence
        actions:
          - { type: set_state, is_submitting: false }
          - { type: dismiss }
      on_error:
        type: sequence
        actions:
          - { type: set_state, is_submitting: false }
          - { type: feedback, variant: banner, severity: error, message: "{error.message}" }
```

**Delete with confirmation and navigation:**
```yaml
action:
  type: confirm
  confirmation:
    # ... dialog props ...
    actions:
      - label: "Delete"
        variant: destructive
        action:
          type: api_call
          endpoint: "api.tasks.delete"
          params: { id: "task.id" }
          on_success:
            type: sequence
            actions:
              - { type: navigate, destination: "$back" }
              - { type: feedback, variant: toast, message: "Deleted", severity: neutral }
```

**Toggle with optimistic update:**
```yaml
action:
  type: api_call
  endpoint: "api.tasks.toggleStatus"
  params: { id: "task.id" }
  optimistic:
    target: "task.status"
    value: "{task.status == done ? 'todo' : 'done'}"
    revert_on_error: true
  on_error:
    feedback: { variant: toast, message: "Couldn't update status", severity: error }
```

### 9.6 AI generation requirements

**MUST:**
- Implement all action types in the vocabulary
- Support both full form and shorthand syntax
- Execute sequences in order, stopping on failure
- Wire `on_success` and `on_error` handlers for every `api_call`
- Map `navigate` presentations to correct platform APIs
- Implement `confirm` as a blocking dialog before the inner action

**SHOULD:**
- Support optimistic updates with automatic revert
- Debounce rapid-fire actions (e.g., toggle tapped multiple times)
- Show loading indicators during `api_call` when no optimistic update is defined
- Handle network errors gracefully with retry affordances

**MAY:**
- Support action middleware (logging, analytics events)
- Queue actions when offline and replay on reconnection


---

## 10. Data binding & state management

Every screen in OpenUISpec connects to data: API responses, local state, user input, and derived values. This section formalizes how data flows through the spec.

### 10.1 Data sources

A screen's `data:` block declares its data dependencies. Each entry has a source, optional params, and defined refresh behavior.

```yaml
data:
  tasks:
    source: "api.tasks.list"
    params:
      filter: "state.active_filter"     # reactive — re-fetches when state changes
      sort: "state.sort_order"
    refresh:
      on: [screen_appear, pull_to_refresh]
      interval: null                     # no polling (use for real-time: 30000 = 30s)
    
  task_counts:
    source: "api.tasks.counts"
    refresh:
      on: [screen_appear]
      
  user:
    source: "api.auth.currentUser"
    cache: session                       # persists for the session
```

**Source types:**

| Source type | Syntax | Behavior |
|-------------|--------|----------|
| API endpoint | `"api.tasks.list"` | HTTP request, returns async data |
| Local state | `"state.active_filter"` | In-memory, synchronous |
| Derived | `"derived.overdue_count"` | Computed from other data sources |
| Static | inline value | Literal data, no fetching |
| Param | `"params.task_id"` | Passed from caller (navigate action) |

**API source resolution:**
API sources use dot-notation that maps to REST endpoints. The AI generator resolves these based on the project's API conventions:

```yaml
# These are equivalent — the generator infers the HTTP method and path
source: "api.tasks.list"          # → GET /api/tasks
source: "api.tasks.getById"       # → GET /api/tasks/:id
source: "api.tasks.create"        # → POST /api/tasks
source: "api.tasks.update"        # → PUT /api/tasks/:id
source: "api.tasks.delete"        # → DELETE /api/tasks/:id
```

The spec does not mandate a specific API format. AI generators adapt to REST, GraphQL, or any backend the project uses.

**Derived sources:**

```yaml
data:
  tasks:
    source: "api.tasks.list"
    
  overdue_count:
    source: derived
    expression: "tasks.filter(t => t.due_date < now && t.status != 'done').length"
    depends_on: [tasks]               # re-computes when tasks changes
```

### 10.2 Screen state

The `state:` block declares local, ephemeral state that lives only while the screen is mounted.

```yaml
state:
  active_filter:
    type: enum
    values: [all, today, upcoming, done]
    default: today
    
  sort_order:
    type: enum
    values: [due_date, priority, created_at]
    default: due_date
    
  search_query:
    type: string
    default: ""
    
  is_submitting:
    type: bool
    default: false
    
  selected_task_id:
    type: string
    default: null
```

**State is reactive.** When state changes (via `set_state` action), any data source or UI element that references that state value re-evaluates automatically. This drives the reactive update model.

### 10.3 Data path syntax

Data paths use dot-notation to traverse objects. They appear in props, conditions, format expressions, and action params.

**Grammar:**

```
data_path     := segment ('.' segment)*
segment       := identifier | indexed
identifier    := [a-zA-Z_][a-zA-Z0-9_]*
indexed       := identifier '[' (integer | '*') ']'
```

**Examples:**

| Path | Resolves to |
|------|------------|
| `task.title` | The title field of the task object |
| `task.project.name` | Nested object traversal |
| `order.items[0].name` | First item's name |
| `order.items[*].total` | Array of all items' totals |
| `state.active_filter` | Local screen state value |
| `params.task_id` | Screen parameter from caller |
| `form.title` | Form field value |
| `error.message` | Error object from `on_error` handler |
| `user.first_name` | Current user's first name |

**Special path prefixes:**

| Prefix | Scope | Lifetime |
|--------|-------|----------|
| `state.` | Local screen state | While screen is mounted |
| `params.` | Screen parameters | Passed from navigate action |
| `form.` | Form field values | While form exists |
| `data.` or bare name | Data source results | Fetched from API |
| `error.` | Error object | Within `on_error` handler only |
| `item.` | Current iteration item | Within collection `item_props_map` |

### 10.4 Binding direction

Props can be **read-only** (one-way) or **two-way bound** (read-write).

**One-way (default):** The prop displays a value but cannot modify it.

```yaml
props:
  title: "{task.title}"                 # displays task.title, read-only
  subtitle: "{task.due_date | format:date_relative}"
```

**Two-way binding:** The prop both displays and modifies a value. Indicated by `binding: true` in the contract prop definition, and `data_binding:` in the screen file.

```yaml
# In the contract definition:
props:
  value: { type: any, required: false, binding: true }

# In the screen file:
- contract: input_field
  input_type: text
  props:
    label: "Title"
    placeholder: "What needs to be done?"
  data_binding: "form.title"            # two-way: reads from and writes to form.title
```

**Two-way binding targets must be writable:** Only `state.*` and `form.*` paths are writable. API data paths are read-only — to modify API data, use an `api_call` action.

### 10.5 Format expressions

Format expressions transform values for display. They appear inside `{}` delimiters in string props.

**Syntax:**

```
interpolation  := '{' (piped_expr | computed_expr) '}'
piped_expr     := data_path ('|' pipe)*
pipe           := operation ':' argument
operation      := 'format' | 'map' | 'default'
computed_expr  := data_path comparator value '?' literal ':' literal
comparator     := '==' | '!=' | '>' | '<' | '>=' | '<='
locale_ref     := '$t:' locale_key
locale_key     := key_segment ('.' key_segment)*
key_segment    := identifier | interpolation
```

OpenUISpec supports three expression types for display strings:

1. **Piped expressions** — a data path optionally transformed by format/map/default pipes: `{task.due_date | format:date_relative}`
2. **Computed expressions** — ternary conditionals for inline logic: `{task.status == done ? 'Reopen' : 'Mark complete'}`
3. **Locale references** — `$t:key` strings resolved from locale JSON files (see Section 11): `"$t:home.new_task"`

Computed expressions are intentionally limited to single ternaries. Complex logic belongs in derived data sources (Section 10.1) or conditional actions (Section 9.2), not in display strings.

**Locale references with parameters:**

When a locale string contains ICU placeholders, supply data via a sibling `t_params` property:

```yaml
# Locale file: "home.task_count": "{count, plural, =0 {No tasks today} one {# task today} other {# tasks today}}"
subtitle: "$t:home.task_count"
t_params:
  count: "task_counts.today"
```

The `t_params` keys map to ICU placeholder names; the values are data paths resolved at runtime.

**Examples:**

```yaml
# Simple interpolation
title: "{task.title}"

# With formatter
subtitle: "{task.due_date | format:date_relative}"

# With mapper
severity: "{task.status | map:status_severity}"

# With default
trailing: "{task.assignee.name | default:'Unassigned'}"

# Multiple interpolations
subtitle: "{item.project.name} · {item.due_date | format:date_relative}"

# Computed expression
label: "{task.status == done ? 'Reopen task' : 'Mark complete'}"

# Compound with format
subtitle: "{item.quantity} × {item.unit_price | format:currency}"
```

**Built-in formatters:**

| Formatter | Input | Output | Locale-aware |
|-----------|-------|--------|-------------|
| `currency` | number | "$1,234.56" | Yes |
| `date` | date/datetime | "Mar 13, 2026" | Yes |
| `date_relative` | date/datetime | "2 hours ago", "yesterday" | Yes |
| `date_short` | date/datetime | "Mar 13" | Yes |
| `time` | datetime | "3:45 PM" | Yes |
| `number` | number | "1,234" | Yes |
| `percentage` | number (0-1) | "45%" | No |
| `status_label` | enum string | "In Progress" (title case) | No |
| `pluralize` | number | "1 task" / "3 tasks" | Yes |
| `file_size` | number (bytes) | "2.4 MB" | No |

**Built-in mappers:**

| Mapper | Input → Output |
|--------|---------------|
| `status_severity` | status enum → severity enum (e.g., "done" → "success") |
| `priority_to_severity` | priority enum → severity enum (e.g., "urgent" → "error") |
| `bool_to_label` | true/false → "Yes"/"No" (or custom mapping) |

**Custom formatters and mappers** can be defined in the project manifest:

```yaml
# openuispec.yaml
formatters:
  weight:
    input: number
    output: string
    pattern: "{value} kg"
    
mappers:
  status_severity:
    todo: neutral
    in_progress: info
    done: success
    
  priority_to_severity:
    low: neutral
    medium: info
    high: warning
    urgent: error
```

### 10.6 Reactive update model

OpenUISpec uses a **pull-based reactive model**: when a data source or state value changes, all UI elements referencing it re-evaluate.

**Update triggers:**

| Trigger | What re-evaluates |
|---------|------------------|
| `set_state` action | All elements referencing the changed state path |
| `api_call` success | The data source that was refreshed |
| `refresh` action | The specified data source |
| `data_binding` change | The bound state/form path + any elements referencing it |
| Screen appear | All data sources with `refresh.on: [screen_appear]` |
| Pull-to-refresh gesture | All data sources with `refresh.on: [pull_to_refresh]` |

**Reactive dependency chain:** If `state.active_filter` changes, and `data.tasks` depends on `state.active_filter` as a param, then:
1. The state value updates
2. `data.tasks` re-fetches with the new filter param
3. The collection rendering `data.tasks` re-renders with new data
4. Any derived values depending on `data.tasks` re-compute

### 10.7 Caching & refresh

Data sources can declare caching and refresh behavior:

```yaml
data:
  tasks:
    source: "api.tasks.list"
    cache: none                         # always fetch fresh (default)
    refresh:
      on: [screen_appear, pull_to_refresh]
      
  user:
    source: "api.auth.currentUser"
    cache: session                      # cached for the app session
    refresh:
      on: [explicit]                    # only refreshes when explicitly told to
      
  config:
    source: "api.config.get"
    cache: persistent                   # survives app restart
    refresh:
      interval: 86400000               # refresh every 24 hours
```

**Cache levels:**

| Level | Lifetime | Survives navigation | Survives restart |
|-------|----------|-------------------|-----------------|
| `none` | Per-render | No | No |
| `screen` | While screen is mounted | No | No |
| `session` | While app is running | Yes | No |
| `persistent` | Indefinite | Yes | Yes |

### 10.8 Loading & error states

Every data source has implicit loading and error states. AI generators must handle these:

```yaml
data:
  tasks:
    source: "api.tasks.list"
    # Implicit states:
    # tasks.$loading: bool (true while fetching)
    # tasks.$error: error object (non-null if fetch failed)
    # tasks.$empty: bool (true if fetch succeeded but returned empty array)
```

These implicit states are available as data paths:

```yaml
# Show loading skeleton
condition: "tasks.$loading"

# Show error state
condition: "tasks.$error"
props:
  title: "Something went wrong"
  body: "{tasks.$error.message}"
  
# Show empty state
condition: "tasks.$empty"
```

Collection contracts handle `$loading`, `$error`, and `$empty` automatically via their state machines (see Section 4.7). For non-collection data, screens can use `condition:` to show appropriate UI.

### 10.9 AI generation requirements

**MUST:**
- Resolve all data paths correctly, including nested traversal and array indexing
- Implement two-way binding for `data_binding:` props
- Re-evaluate UI when state or data changes (reactive model)
- Handle `$loading`, `$error`, and `$empty` states for every data source
- Implement all built-in formatters with correct locale behavior
- Implement all built-in mappers (or generate them from project-defined maps)
- Resolve all `$t:` references against the active locale file and pass `t_params` to ICU placeholders
- Generate platform-native locale files from JSON source when `i18n` config is present (see Section 11)

**SHOULD:**
- Implement caching at declared levels
- Re-fetch data sources when their param dependencies change
- Support computed/derived data sources
- Debounce rapid state changes (e.g., search input) to avoid excessive re-renders
- Show skeleton/loading states during data fetches

**MAY:**
- Support offline data persistence with `cache: persistent`
- Implement stale-while-revalidate patterns
- Pre-fetch data for likely navigation targets


---

## 11. Internationalization (i18n)

### 11.1 Overview

OpenUISpec treats **JSON locale files as the single source of truth** for all user-facing strings. Platform generators convert these files into native localization resources (iOS `.xcstrings`, Android `strings.xml` + `plurals.xml`, web JSON bundles). The spec defines the source format and string referencing mechanism; platforms handle locale detection and runtime switching.

Key principles:
- All user-facing strings live in locale files, not in screen/flow YAML
- YAML files reference strings via `$t:key` syntax
- ICU MessageFormat handles plurals, selects, and interpolation within locale strings
- One JSON file per locale (e.g., `en.json`, `es.json`, `ja.json`)

### 11.2 Locale file format

Locale files use **flat keys with dot-namespacing** and live in the `locales/` directory:

```json
{
  "$locale": "en",
  "$direction": "ltr",

  "nav.tasks": "Tasks",
  "nav.projects": "Projects",

  "home.task_count": "{count, plural, =0 {No tasks today} one {# task today} other {# tasks today}}",
  "home.greeting.morning": "Good morning, {name}",

  "task_detail.toggle_status": "{is_done, select, true {Reopen task} other {Mark complete}}",
  "task_detail.delete_message": "This action cannot be undone. The task \"{title}\" will be permanently removed.",

  "common.cancel": "Cancel",
  "common.delete": "Delete"
}
```

**Metadata keys** (prefixed with `$`):
- `$locale` — BCP 47 language tag (e.g., `"en"`, `"es"`, `"ja"`)
- `$direction` — `"ltr"` or `"rtl"`

**String values** use [ICU MessageFormat](https://unicode-org.github.io/icu/userguide/format_parse/messages/) for:
- **Plurals:** `{count, plural, =0 {No items} one {# item} other {# items}}`
- **Selects:** `{status, select, active {Active} archived {Archived} other {Unknown}}`
- **Simple interpolation:** `{name}` placeholder filled from `t_params`

**Key conventions:**
- Flat, dot-namespaced: `screen_name.element` (not nested JSON objects)
- Grouped by screen/flow: `home.*`, `task_detail.*`, `create_task.*`
- Shared strings under `common.*`
- Enum labels under their enum name: `priority.*`, `status.*`

### 11.3 String references

YAML files reference locale strings with the `$t:` prefix:

```yaml
# Simple reference
label: "$t:common.cancel"

# Reference with ICU parameters
subtitle: "$t:home.task_count"
t_params:
  count: "task_counts.today"

# Dynamic key (using format expression in the key path)
title: "$t:home.greeting.{time_of_day | format:greeting}"
t_params:
  name: "user.first_name"
```

**Rules:**
- `$t:key` is a standalone string value — it cannot be mixed with other text in the same string
- `t_params` is a sibling property of the `$t:` string, mapping ICU placeholder names to data paths
- `t_params` values are data paths (see Section 10.3), resolved at runtime
- Formatter mappings may also reference locale keys: `mapping: { todo: "$t:status.todo" }`
- **Dynamic key validation:** When a locale key contains interpolation segments (e.g., `$t:home.greeting.{time_of_day | format:greeting}`), the key is resolved at runtime. Static validation tools should expand all possible values from the formatter mapping and verify that each resolved key exists in the locale file (e.g., `home.greeting.morning`, `home.greeting.afternoon`, `home.greeting.evening`).

### 11.4 Formatter localization

Custom formatters defined in `openuispec.yaml` can reference locale keys in their mappings:

```yaml
formatters:
  status_label:
    input: enum
    output: string
    mapping:
      todo: "$t:status.todo"
      in_progress: "$t:status.in_progress"
      done: "$t:status.done"
```

This keeps display labels localized while preserving the enum-to-string mapping structure. Built-in locale-aware formatters (`currency`, `date`, `number`, `pluralize`) use the active locale automatically.

### 11.5 Layout direction

OpenUISpec already uses **logical directions** (`leading`/`trailing` instead of `left`/`right`). For RTL locales:

1. Declare direction in the locale file: `"$direction": "rtl"`
2. The `i18n` config in the manifest declares which locales are supported
3. Platform generators map logical directions to physical directions based on the active locale

```yaml
# Already in the spec — no changes needed
icon: { ref: "search", position: leading }    # leading = left in LTR, right in RTL
trailing: { icon: "chevron_right" }           # trailing = right in LTR, left in RTL
```

**Platform mapping:**
| Logical | LTR physical | RTL physical |
|---------|-------------|-------------|
| `leading` | `left` / `start` | `right` / `end` |
| `trailing` | `right` / `end` | `left` / `start` |
| `floating-bottom-trailing` | Bottom-right | Bottom-left |

### 11.6 Platform mapping

Generators produce platform-native localization resources from the JSON source:

| Platform | Output format | Plurals | Notes |
|----------|--------------|---------|-------|
| **iOS** | `.xcstrings` (Xcode 15+) | Built-in plural rules | ICU plurals map to `.stringsdict` entries within `.xcstrings` |
| **Android** | `res/values-{locale}/strings.xml` + `plurals.xml` | `<plurals>` element | ICU selects map to conditional logic in generated code |
| **Web** | JSON bundles per locale | `react-intl` / `i18next` ICU plugin | Direct ICU MessageFormat — no conversion needed |

The `i18n` config in the project manifest controls generation:

```yaml
i18n:
  default_locale: "en"
  supported_locales: [en, es, ja, ar]
  fallback_strategy: "default"    # fall back to default_locale for missing keys
```

### 11.7 AI generation requirements

**MUST:**
- Resolve every `$t:key` reference to the corresponding locale string
- Generate platform-native locale files from JSON sources for each supported locale
- Pass `t_params` data paths to ICU placeholders at runtime
- Apply `$direction` from the active locale to layout direction
- Use the `fallback_strategy` for missing keys (default: fall back to `default_locale`)

**SHOULD:**
- Validate that all `$t:` keys in YAML files exist in every supported locale file
- Warn when a locale file has keys not referenced by any YAML file
- Support locale switching at runtime without app restart (hot swap)
- Use platform-native locale detection for initial locale selection

**MAY:**
- Support right-to-left layout preview in development tools
- Generate translation key extraction reports
- Support pluralization categories beyond `=0`, `one`, `other` (e.g., `two`, `few`, `many` for languages that need them)
- Support nested ICU messages (selects within plurals)

---

## 12. Custom contract extensions

Custom contracts allow spec authors to define domain-specific component families — media players, charts, maps, code editors — that follow the same anatomy as built-in contracts but are not part of the core spec. The 7 built-in families cover general UI; custom contracts handle specialized, app-specific components.

### 12.1 Purpose

Use a custom contract when the component:

- Has domain-specific behavior that doesn't map cleanly to any built-in family
- Requires a dedicated state machine (e.g., play/pause/seek for media)
- Needs platform-specific libraries or frameworks not covered by core contracts
- Would clutter the core spec if included as a built-in

Do **not** use a custom contract when a built-in family with the right variant already covers the use case. A data card is `data_display`, not `x_data_card`.

### 12.2 Naming

Custom contract names **MUST**:

- Start with the `x_` prefix
- Use lowercase `snake_case`
- Be descriptive of the component's role: `x_media_player`, `x_chart`, `x_code_editor`, `x_map_view`

The `x_` prefix is reserved for custom contracts. Future spec versions will never define built-in families starting with `x_`.

### 12.3 Contract definition format

Custom contracts follow the same anatomy as built-in contracts (Section 4):

```yaml
# contracts/x_media_player.yaml
x_media_player:
  semantic: "Plays audio and video media with transport controls"

  props:
    source: { type: string, required: true }
    media_type: { type: enum, values: [audio, video], required: true }
    variant: { type: enum, values: [inline, fullscreen, mini], default: inline }
    autoplay: { type: bool, default: false }
    # ... additional props

  states:
    idle:
      transitions_to: [loading]
      visual: "Shows poster or placeholder"
    loading:
      transitions_to: [playing, error]
      feedback: "Loading indicator visible"
    playing:
      transitions_to: [paused, ended, loading, error]
    paused:
      transitions_to: [playing, loading]
    ended:
      transitions_to: [playing, loading]
    error:
      transitions_to: [loading]
      feedback: "Error message with retry"

  a11y:
    role: "media"
    label: "props.title"
    focus:
      keyboard:
        play_pause: "Space"
        seek_forward: "ArrowRight"

  tokens:
    inline:
      min_height: [200, 280]
      radius: "spacing.md"
      # ... variant-specific tokens

  platform_mapping:
    ios:
      inline: { component: "VideoPlayer", framework: "AVKit" }
    android:
      inline: { component: "PlayerView", library: "androidx.media3" }
    web:
      inline: { element: "video" }

  # -- Fields unique to custom contracts --

  dependencies:
    ios:
      frameworks: [AVKit, AVFoundation]
    android:
      libraries: ["androidx.media3:media3-ui", "androidx.media3:media3-exoplayer"]
    web:
      packages: []

  generation:
    must_handle:
      - "All declared states with correct transitions"
      - "Keyboard shortcuts for accessibility"
    should_handle:
      - "Progress bar with seek"
    may_handle:
      - "Picture-in-picture"

  test_cases:
    - id: play_pause_toggle
      description: "Play/pause toggles playback state"
      given: "Player is in idle state with a valid source"
      when: "User taps play"
      then: "State transitions to loading, then playing"
```

**Required fields:** `semantic`, `props`, `states`, `a11y`, `tokens`, `platform_mapping`

**Optional fields:** `dependencies`, `generation`, `test_cases`

The `dependencies` field is unique to custom contracts — since custom components may require platform-specific libraries that are not part of the standard framework imports.

### 12.4 Registration

Custom contracts are registered in the root manifest via the `custom_contracts` array:

```yaml
# openuispec.yaml
spec_version: "0.1"
project:
  name: "MyApp"

custom_contracts:
  - "./contracts/x_media_player.yaml"
  - "./contracts/x_chart.yaml"

includes:
  tokens: "./tokens/"
  contracts: "./contracts/"
  # ...
```

Each entry is a path (relative to the manifest) to a custom contract YAML file. The file must contain exactly one root key matching the `x_` naming convention.

### 12.5 Usage in screens

Custom contracts are used in screens identically to built-in contracts:

```yaml
# screens/task_detail.yaml
- contract: x_media_player
  variant: inline
  props:
    source: "{task.attachment.url}"
    media_type: "{task.attachment.media_type}"
    title: "{task.attachment.filename}"
    show_controls: true
  tokens_override:
    radius: "spacing.md"
  adaptive:
    compact: { variant: inline }
    expanded: { variant: inline, max_width: 640 }
```

The `contract` field accepts both built-in family names (`action_trigger`, `data_display`, etc.) and custom contract names (`x_media_player`, `x_chart`).

### 12.6 Platform overrides

Custom contracts support the same platform override pattern as built-in families (Section 7):

```yaml
# platform/ios.yaml
ios:
  overrides:
    x_media_player:
      inline:
        uses_native_player: true
        pip_enabled: true
```

### 12.7 AI generation requirements

**MUST:**
- Read and parse all registered custom contract definitions before generating code
- Handle every declared state in the state machine
- Apply `platform_mapping` to select the correct native component
- Include all `dependencies` in the generated project configuration (Package.swift, build.gradle, package.json)
- Implement all items listed in `generation.must_handle`

**SHOULD:**
- Implement items listed in `generation.should_handle`
- Apply token bindings from the `tokens` section per variant
- Generate accessibility support matching the `a11y` definition

**MAY:**
- Implement items listed in `generation.may_handle`
- Generate test code based on `test_cases`
- Add platform-specific enhancements beyond what the contract specifies

---

## 13. Form validation and field dependencies

Form validation extends the `input_field` contract with co-located validation rules, field dependencies, and i18n-integrated error messages. Rules are declared inline on each field — there are no separate validation files.

### 13.1 Overview

Existing shorthand properties (`required`, `max_length`, `input_type: email`) continue to work unchanged. The `validate` block adds structured rules with explicit error messages and i18n support. Both can coexist on the same field — shorthands are checked first, then `validate` rules in declaration order.

```yaml
- contract: input_field
  input_type: text
  props:
    label: "Username"
    required: true                         # shorthand — still works
  validate:                                # structured rules — additive
    min_length: { value: 3, message: "$t:validation.min_length" }
    pattern: { regex: "^[a-z0-9_]+$", message: "Lowercase letters, numbers, and underscores only" }
    async: { endpoint: "api.users.check_username", debounce: 500, message: "Username already taken" }
  data_binding: "form.username"
```

### 13.2 Validation rules

Each rule is an object with a value/config and an optional `message`. If `message` is omitted, the platform uses a sensible default. Messages support `$t:` locale references (Section 11).

#### `pattern`

Validates the field value against a regular expression.

```yaml
validate:
  pattern:
    regex: "^[A-Z]{2}\\d{6}$"
    message: "$t:validation.pattern"
```

The `regex` value is a standard regular expression string. Backslashes must be escaped in YAML (`\\d` for `\d`).

#### `min_length`

Validates minimum string length.

```yaml
validate:
  min_length:
    value: 3
    message: "$t:validation.min_length"    # receives {min} placeholder
```

#### `max_length`

Validates maximum string length. This is the structured equivalent of the `max_length` prop shorthand.

```yaml
validate:
  max_length:
    value: 200
    message: "$t:validation.max_length"    # receives {max} placeholder
```

When both `props.max_length` and `validate.max_length` are present, the `validate` version takes precedence (its message is used for errors).

#### `min`

Validates minimum numeric value. Use with `input_type: number`, `slider`, or `stepper`.

```yaml
validate:
  min:
    value: 0
    message: "$t:validation.min_value"     # receives {min} placeholder
```

#### `max`

Validates maximum numeric value.

```yaml
validate:
  max:
    value: 100
    message: "$t:validation.max_value"     # receives {max} placeholder
```

#### `format`

Validates against a built-in format type. This is the structured equivalent of `input_type: email` implicit validation, extended to more formats.

```yaml
validate:
  format:
    type: email                            # email | url | phone | uuid
    message: "$t:validation.format.email"
```

| Format | Validates |
|--------|-----------|
| `email` | Standard email format |
| `url` | Valid URL with scheme |
| `phone` | E.164 or common phone formats |
| `uuid` | UUID v4 format |

#### `match_field`

Cross-field equality check. The `field` value is the `data_binding` path of the field to match.

```yaml
# Password confirmation example
- contract: input_field
  input_type: password
  props: { label: "Password" }
  data_binding: "form.password"

- contract: input_field
  input_type: password
  props: { label: "Confirm password" }
  validate:
    match_field:
      field: "form.password"
      message: "$t:validation.match_field"
  data_binding: "form.password_confirm"
```

#### `custom`

Expression-based validation using the same condition grammar as `condition` (Section 5). The expression has access to the current field value as `$value` and the full form data via `form.*` paths.

```yaml
validate:
  custom:
    expression: "form.end_date > form.start_date"
    message: "End date must be after start date"
```

#### `async`

Server-side validation via an API call. The endpoint receives the field value and returns a boolean or error message.

```yaml
validate:
  async:
    endpoint: "api.users.check_username"   # same format as api_call endpoint
    debounce: 500                          # ms, default 300
    message: "Username already taken"
```

**Async behavior:**
1. After the debounce period, the platform sends the field value to the endpoint
2. While waiting, the field shows a loading indicator (the `validating` state)
3. The endpoint returns `{ valid: true }` or `{ valid: false, message?: "..." }`
4. If the endpoint returns a message, it overrides the local `message`

### 13.3 Validation messages

Every rule accepts an optional `message` property:

- **Plain string:** `"Must be at least 3 characters"`
- **Locale reference:** `"$t:validation.min_length"` — resolved via the i18n system (Section 11)
- **With placeholders:** Locale strings can use ICU MessageFormat. The validation system passes rule parameters as named values: `{min}`, `{max}`, `{value}`, `{field}`.

```json
{
  "validation.min_length": "Must be at least {min} characters",
  "validation.max_length": "Must be no more than {max} characters",
  "validation.min_value": "Must be at least {min}",
  "validation.max_value": "Must be no more than {max}"
}
```

If no `message` is provided, the platform uses a built-in default appropriate to the rule type and locale.

### 13.4 Validation triggers

The `validate_trigger` property controls when validation runs for a field:

| Trigger | Behavior | Use case |
|---------|----------|----------|
| `on_blur` (default) | Validates when the field loses focus | Most text fields |
| `on_change` | Validates on every value change | Real-time feedback (e.g., password strength) |
| `on_submit` | Validates only when the form is submitted | Fields where intermediate states are valid |

```yaml
- contract: input_field
  input_type: text
  props:
    label: "Username"
    required: true
  validate:
    pattern: { regex: "^[a-z0-9_]+$", message: "Lowercase letters and numbers only" }
  validate_trigger: on_change              # validate on every keystroke
  data_binding: "form.username"
```

If not specified, `on_blur` is the default. The `submit_form` action always runs all validation rules regardless of trigger setting.

### 13.5 Field dependencies

Field dependencies control whether a field is required or enabled based on the values of other fields.

#### Visibility: `condition`

The existing `condition` property (Section 5) already handles field visibility. No new syntax is needed:

```yaml
# Show "Other" text field only when category is "other"
- contract: input_field
  input_type: select
  props: { label: "Category", options: [...] }
  data_binding: "form.category"

- contract: input_field
  input_type: text
  props: { label: "Please specify" }
  condition: "form.category == 'other'"
  data_binding: "form.category_other"
```

#### Conditional requirement: `required_when`

Makes a field required based on a condition expression:

```yaml
- contract: input_field
  input_type: text
  props: { label: "Company name" }
  required_when: "form.account_type == 'business'"
  data_binding: "form.company_name"
```

When the condition is true, the field behaves as if `required: true` is set. When false, the field is optional. The condition uses the same expression grammar as `condition`.

#### Conditional enablement: `enabled_when`

Controls whether a field is editable:

```yaml
- contract: input_field
  input_type: date
  props: { label: "Custom date" }
  enabled_when: "form.schedule_type == 'custom'"
  data_binding: "form.custom_date"
```

When the condition is false, the field is rendered in a disabled state — visible but not interactive.

### 13.6 Cross-field validation

Two mechanisms support validation that depends on multiple fields:

**`match_field`** — for simple equality checks (see 13.2):

```yaml
validate:
  match_field:
    field: "form.password"
    message: "$t:validation.match_field"
```

**`custom` expression** — for arbitrary cross-field logic:

```yaml
validate:
  custom:
    expression: "form.max_budget >= form.min_budget"
    message: "Maximum budget must be at least the minimum"
```

Cross-field validation rules are re-evaluated whenever any referenced field changes (not just the field they're declared on). The platform tracks dependencies by parsing the expression paths.

### 13.7 Async validation

Async validation calls a server endpoint to validate a field value. Common uses: username availability, invite code validation, address verification.

```yaml
- contract: input_field
  input_type: text
  props: { label: "Username" }
  validate:
    min_length: { value: 3, message: "$t:validation.min_length" }
    async:
      endpoint: "api.users.check_username"
      debounce: 500
      message: "$t:validation.username_taken"
  validate_trigger: on_change
  data_binding: "form.username"
```

**Lifecycle:**

1. **Debounce** — after the user stops typing for `debounce` ms (default 300), the request fires
2. **Loading** — the field enters the `validating` state; platforms SHOULD show a spinner or "Checking…" text
3. **Response** — the endpoint returns `{ valid: true }` or `{ valid: false, message?: "..." }`
4. **Result** — if invalid, the field enters `error` state with the message; if valid, the field clears any error

Sync rules (pattern, min_length, etc.) run first. Async validation only fires if all sync rules pass.

### 13.8 `submit_form` enhancements

The `submit_form` action (Section 9) is extended with two optional properties:

#### `validate_only`

When `true`, runs all validation rules but does **not** trigger the form's `on_submit:` handler. Useful for multi-step forms where you validate one step before advancing:

```yaml
action:
  type: submit_form
  form_id: "step_1_form"
  validate_only: true
```

#### `on_validation_error`

An action to execute when validation fails. Runs after field-level error states are set:

```yaml
action:
  type: submit_form
  form_id: "checkout_form"
  on_validation_error:
    type: feedback
    variant: toast
    message: "$t:validation.fix_errors"
    severity: warning
```

**Full validation flow:**

1. Collect all fields in the form (matched by `form_id`)
2. For each field, evaluate `required_when` → determine if required
3. Check shorthand rules: `required`, `max_length`, `input_type` format
4. Check `validate` block rules in declaration order
5. For any failed field, set its state to `error` with `error_text`
6. If any field failed and `on_validation_error` is set, execute it
7. If `validate_only: true`, stop
8. If all fields passed, execute the form's `on_submit:` handler

### 13.9 AI generation requirements

**MUST:**
- Implement all `validate` rules declared on `input_field` instances
- Evaluate `required_when` and `enabled_when` expressions reactively
- Show `error_text` on fields that fail validation
- Run all validation rules on `submit_form`, regardless of `validate_trigger`
- Support `$t:` locale references in `message` properties
- Respect validation rule order: shorthands first, then `validate` rules in declaration order

**SHOULD:**
- Implement `validate_trigger` per field (default: `on_blur`)
- Re-evaluate cross-field rules (`match_field`, `custom` with external paths) when referenced fields change
- Show a loading indicator during `async` validation
- Implement `validate_only` for multi-step form flows
- Pass rule parameters (`{min}`, `{max}`) to locale message strings
- Debounce `async` validation requests

**MAY:**
- Animate field error state transitions
- Scroll to the first invalid field on form submission
- Show a summary count of validation errors
- Cache async validation results for previously checked values
- Implement client-side equivalents of `format` rules (email, url, phone, uuid) using platform-native validators

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
| `action` | Action definition (see Section 9) | `{ type: navigate, destination: "..." }` |
| `data_path` | Dot-notation path to a value (see Section 10.3) | `"task.project.name"` |
| `format_expr` | String with `{}` interpolation (see Section 10.5) | `"{value | format:currency}"` |
| `badge_config` | `{ text?, count?, dot?, severity? }` | `{ count: 3, severity: "warning" }` |
| `range_config` | `{ min, max, step?, default? }` | `{ min: 0, max: 100, step: 1 }` |
| `data_source` | Data dependency declaration (see Section 10.1) | `{ source: "api.tasks.list", params: {...} }` |
| `cache_level` | Data caching strategy | `none \| screen \| session \| persistent` |
| `size_class` | Adaptive layout breakpoint | `compact \| regular \| expanded` |
| `layout_ref` | Layout primitive definition | `{ type: stack, spacing: "spacing.md" }` |
| `locale_ref` | Locale string reference (see Section 11) | `"$t:common.cancel"` |

## Appendix B: Format expression quick reference

> Full specification in Section 10.5.

**Syntax:** `{data_path | pipe}` or `{condition ? 'value_a' : 'value_b'}` or `$t:locale_key`

**Pipes:** `format:name`, `map:name`, `default:'fallback'`

**Locale references:** `$t:key` with optional `t_params:` sibling for ICU placeholders (see Section 11)

**Built-in formatters:** `currency`, `date`, `date_relative`, `date_short`, `time`, `number`, `percentage`, `status_label`, `pluralize`, `file_size`

**Built-in mappers:** `status_severity`, `priority_to_severity`, `bool_to_label`

**Custom formatters and mappers** are defined in the project's `openuispec.yaml` manifest.

---

*OpenUISpec v0.1 — Draft specification. Subject to revision.*
