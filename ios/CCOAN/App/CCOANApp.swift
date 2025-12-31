import SwiftUI

@main
struct CCOANApp: App {
    @StateObject private var authViewModel = AuthViewModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authViewModel)
        }
    }
}

struct ContentView: View {
    @EnvironmentObject var authViewModel: AuthViewModel

    var body: some View {
        Group {
            if authViewModel.isAuthenticated {
                DashboardView()
            } else {
                LoginView()
            }
        }
        .onAppear {
            authViewModel.checkAuthentication()
        }
    }
}
