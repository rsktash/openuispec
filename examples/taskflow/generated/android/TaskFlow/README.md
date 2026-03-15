# TaskFlow Android Target

This Android target was generated directly from the local `openuispec/` TaskFlow specification, without copying another sample project's output.

## What is included

- A lean Jetpack Compose app scaffold under `app/`
- Adaptive navigation using spec breakpoints:
  - `compact`: bottom navigation
  - `regular` and `expanded`: navigation rail
- Spec-derived screens:
  - Home
  - Task detail
  - Projects
  - Project detail
  - Calendar stub
  - Settings
  - Profile edit
- Spec-derived flows:
  - Create task
  - Edit task
  - Assign task
  - New project
- Local sample data matching the spec's data model
- English string resources derived from `openuispec/locales/en.json`
- Theme colors based on `openuispec/tokens/color.yaml` and `themes.yaml`

## Project notes

- This is intentionally lean. It favors clear generated structure over a fully productionized architecture.
- The app uses local Compose state instead of wiring real API clients.
- The media-player custom contract is acknowledged in the spec but not implemented here because no screen in this minimal target renders a concrete media attachment asset.
- No Gradle wrapper is checked in. Use a local Gradle installation or import the project into Android Studio and let it create the wrapper if needed.

## Suggested verification

From this directory:

```bash
gradle :app:assembleDebug
```

Or open `generated/android/TaskFlow` in Android Studio and run the app on an emulator.
