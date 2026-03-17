import XCTest

final class ScreenshotUITest: XCTestCase {

    func test_01_analytics() {
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages", "(en)"]
        app.launch()
        Thread.sleep(forTimeInterval: 2.0)

        let target_0_0 = app.descendants(matching: .any).matching(NSPredicate(format: "label ==[c] %@ OR title ==[c] %@", "Analytics", "Analytics")).firstMatch
        if target_0_0.waitForExistence(timeout: 5) {
            target_0_0.tap()
            Thread.sleep(forTimeInterval: 0.8)
        }
        Thread.sleep(forTimeInterval: 0.5)
        let screenshot = XCUIScreen.main.screenshot()
        try! screenshot.pngRepresentation.write(to: URL(fileURLWithPath: "/Users/rustam/Projects/openuispec/artifacts/todo-orbit/screenshots/ios-analytics.png"))
    }

    func test_02_settings() {
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages", "(en)"]
        app.launch()
        Thread.sleep(forTimeInterval: 2.0)

        let target_1_0 = app.descendants(matching: .any).matching(NSPredicate(format: "label ==[c] %@ OR title ==[c] %@", "Settings", "Settings")).firstMatch
        if target_1_0.waitForExistence(timeout: 5) {
            target_1_0.tap()
            Thread.sleep(forTimeInterval: 0.8)
        }
        Thread.sleep(forTimeInterval: 0.5)
        let screenshot = XCUIScreen.main.screenshot()
        try! screenshot.pngRepresentation.write(to: URL(fileURLWithPath: "/Users/rustam/Projects/openuispec/artifacts/todo-orbit/screenshots/ios-settings.png"))
    }
}
