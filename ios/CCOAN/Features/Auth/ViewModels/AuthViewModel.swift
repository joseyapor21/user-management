import Foundation
import SwiftUI

@MainActor
class AuthViewModel: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: AuthUser?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let apiClient = APIClient.shared

    init() {
        checkAuthentication()
    }

    func checkAuthentication() {
        if let user = KeychainManager.shared.getUser(),
           KeychainManager.shared.getToken() != nil {
            self.currentUser = user
            self.isAuthenticated = true
        }
    }

    func login(email: String, password: String) async {
        guard !email.isEmpty, !password.isEmpty else {
            errorMessage = "Please enter email and password"
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            let request = LoginRequest(email: email, password: password)
            let response: APIResponse<LoginResponse> = try await apiClient.post(
                endpoint: .login,
                body: request
            )

            if let loginData = response.data {
                await apiClient.setAuthToken(loginData.token)
                KeychainManager.shared.saveUser(loginData.user)
                self.currentUser = loginData.user
                self.isAuthenticated = true
            } else {
                errorMessage = response.error ?? "Login failed"
            }
        } catch let error as NetworkError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func logout() async {
        await apiClient.setAuthToken(nil)
        KeychainManager.shared.clearAll()
        currentUser = nil
        isAuthenticated = false
    }

    func updateProfile(name: String?, password: String?) async -> Bool {
        isLoading = true
        errorMessage = nil

        do {
            let request = UpdateProfileRequest(name: name, password: password)
            let response: APIResponse<User> = try await apiClient.put(
                endpoint: .profile,
                body: request
            )

            if response.success, let user = response.data {
                let authUser = AuthUser(
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    isAdmin: user.isAdmin,
                    isSuperUser: user.isSuperUser
                )
                KeychainManager.shared.saveUser(authUser)
                self.currentUser = authUser
                isLoading = false
                return true
            } else {
                errorMessage = response.error ?? "Update failed"
            }
        } catch let error as NetworkError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
        return false
    }

    var isSuperUser: Bool {
        currentUser?.isSuperUser ?? false
    }

    var isAdmin: Bool {
        currentUser?.isAdmin ?? false
    }
}
