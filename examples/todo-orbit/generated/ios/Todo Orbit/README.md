# Todo Orbit iOS Target

This directory contains a generated SwiftUI target for the current OpenUISpec project.

## Structure

- `TodoOrbit.xcodeproj`: ready-to-open Xcode project
- `project.yml`: lightweight XcodeGen project definition kept as a secondary source
- `Sources/TodoOrbit/`: SwiftUI source tree
- `Resources/`: localized strings for English and Russian

## Coverage

The scaffold mirrors the current spec surface:

- Tasks home with search, filters, split-view detail, create and edit flows
- Analytics dashboard with native Swift Charts rendering
- Settings with language and theme switching
- Recurring-rule flow with validation and schedule preview
- Two custom components:
  - `TrendChartView` for `x_task_trend_chart`
  - `SchedulePreviewView` for `x_schedule_preview`

## Notes

- This target is intentionally compact and source-focused.
- `TodoOrbit.xcodeproj` is checked in and builds with `xcodebuild`.
- `project.yml` remains available if you want to regenerate the project structure with XcodeGen later.
- The existing `.openuispec-state.json` file was preserved.
