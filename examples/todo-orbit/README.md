# Todo Orbit

Todo Orbit is a multi-platform sample project for OpenUISpec. It combines a source spec with generated iOS, Android, and web outputs so the repository can demonstrate the full workflow from semantic UI definition to platform-native code.

## What this sample covers

- Task management screens with search, filtering, and detail views
- Analytics and trend visualization
- Settings with language and theme preferences
- Create and edit task flows
- Recurring-rule creation with conditional fields and validation
- Bilingual localization with English and Russian
- Custom contracts for schedule preview and task trend charts

## Project layout

| Path | Purpose |
|------|---------|
| [`openuispec/`](./openuispec/) | Source OpenUISpec project: manifest, tokens, screens, flows, contracts, locales |
| [`generated/web/Todo Orbit/`](./generated/web/Todo%20Orbit/) | Generated React + Vite web app |
| [`generated/ios/Todo Orbit/`](./generated/ios/Todo%20Orbit/) | Generated SwiftUI iOS target |
| [`generated/android/Todo Orbit/`](./generated/android/Todo%20Orbit/) | Generated Jetpack Compose Android target |
| [`artifacts/screenshots/`](./artifacts/screenshots/) | Reference screenshots from generated outputs |

## Start here

If you want to understand the sample at the spec level, open [`openuispec/openuispec.yaml`](./openuispec/openuispec.yaml). That manifest defines the project structure, data model, API surface, localization setup, and generation targets.

For spec authoring details, see [`openuispec/README.md`](./openuispec/README.md).

## Running the generated web app

```bash
cd examples/todo-orbit/generated/web/'Todo Orbit'
npm install
npm run dev
```

## Opening the native targets

- iOS: open [`generated/ios/Todo Orbit/`](./generated/ios/Todo%20Orbit/) in Xcode using `TodoOrbit.xcodeproj`
- Android: open [`generated/android/Todo Orbit/`](./generated/android/Todo%20Orbit/) in Android Studio

Platform-specific notes are documented in:

- [`generated/ios/Todo Orbit/README.md`](./generated/ios/Todo%20Orbit/README.md)
- [`generated/android/Todo Orbit/README.md`](./generated/android/Todo%20Orbit/README.md)

## Screenshots

Examples of the generated output are available in [`artifacts/screenshots/`](./artifacts/screenshots/):

- `web-home.png`
- `web-analytics.png`
- `web-settings.png`
- `android-home.png`
- `android-analytics.png`
- `android-settings.png`

## Why this sample exists

TaskFlow is the compact reference example in this repository. Todo Orbit is the broader showcase: it exercises localization, custom contracts, richer flows, and generated outputs across all three supported targets.
