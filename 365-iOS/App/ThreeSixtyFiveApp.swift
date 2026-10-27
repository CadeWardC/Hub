import SwiftUI
import UserNotifications

@main
struct ThreeSixtyFiveApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var store = Store.shared

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
                .preferredColorScheme(.dark)
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { store.refresh() }
        }
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        Reminders.registerCategory()
        Reminders.requestPermissionIfNeeded()
        return true
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        [.banner, .list, .sound, .badge]
    }

    /// Tapping a reminder (or its Take photo button) opens the camera.
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
        guard response.notification.request.identifier.hasPrefix(Reminders.prefix) else { return }
        await MainActor.run {
            let store = Store.shared
            store.refresh()
            if !store.takenToday { store.cameraRequest = CameraRequest(day: store.today) }
        }
    }
}

struct RootView: View {
    @EnvironmentObject private var store: Store

    var body: some View {
        TabView {
            TodayView()
                .tabItem { Label("Today", systemImage: "camera") }
            HistoryView()
                .tabItem { Label("Photos", systemImage: "square.grid.3x3") }
            RegimenView()
                .tabItem { Label("Taking", systemImage: "pills") }
            SettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape") }
        }
        .fullScreenCover(item: $store.cameraRequest) { request in
            CameraScreen(day: request.day)
                .environmentObject(store)
        }
    }
}
