# TaskFlow iOS Target

This directory contains a lightweight SwiftUI interpretation of the local `openuispec/` source for TaskFlow.

What is included:
- SwiftUI app shell with adaptive compact vs regular navigation
- Spec-derived screens: home, task detail, projects, project detail, calendar, settings, profile edit
- Spec-derived create/edit task sheets
- Sample data matching the TaskFlow entities in `openuispec/openuispec.yaml`
- English localization from the local OpenUISpec locale file
- `project.yml` for XcodeGen-based project creation

Notes:
- This target is generated only from the local TaskFlow spec and does not depend on other sample outputs.
- The implementation is intentionally lean: API calls are represented with local sample state mutations.
- `NavigationSplitView` is used for regular-width devices to reflect the adaptive nav and home split-view intent from the spec.

Suggested next steps:
1. Install XcodeGen if needed.
2. Run `xcodegen generate` in this directory.
3. Open the generated Xcode project in Xcode 16+ and run on iOS 17+.
