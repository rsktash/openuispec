# Todo Orbit Android

Generated Android target for the OpenUISpec Todo Orbit project.

## Structure

- `app/` — Android application module
- `app/src/main/java/uz/rsteam/todoorbit/MainActivity.kt` — Compose app scaffold
- `app/src/main/java/uz/rsteam/todoorbit/ui/theme/TodoOrbitTheme.kt` — light/dark theme mapped from spec tokens

## Notes

- The project models the current OpenUISpec surface: tasks, analytics, settings, create/edit flows, recurring rule flow, bilingual strings, theme switching, and the two custom contracts (`x_task_trend_chart`, `x_schedule_preview`).
- Build verification was limited by the local environment: `gradle`, `kotlinc`, and `sdkmanager` were not installed in the workspace session, so this target was generated as a credible Gradle/Compose project but not compiled here.
