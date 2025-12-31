import Foundation

@MainActor
class DepartmentsViewModel: ObservableObject {
    @Published var departments: [Department] = []
    @Published var users: [User] = []
    @Published var departmentMembers: [String: [User]] = [:]
    @Published var departmentAdmins: [String: [User]] = [:]
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let apiClient = APIClient.shared

    func loadDepartments() async {
        isLoading = true
        errorMessage = nil

        do {
            let response: APIResponse<[Department]> = try await apiClient.get(endpoint: .departments)
            if let data = response.data {
                self.departments = data
            }

            // Try to load users (might fail for non-superusers)
            do {
                let usersResponse: APIResponse<[User]> = try await apiClient.get(endpoint: .users)
                if let usersData = usersResponse.data {
                    self.users = usersData
                }
            } catch {
                // Users list not available for non-superusers
            }
        } catch let error as NetworkError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func loadDepartmentDetails(departmentId: String) async {
        do {
            async let adminsResponse: APIResponse<[User]> = apiClient.get(
                endpoint: .departmentAdmins(departmentId)
            )
            async let membersResponse: APIResponse<[User]> = apiClient.get(
                endpoint: .departmentMembers(departmentId)
            )

            let (admins, members) = try await (adminsResponse, membersResponse)

            if let adminsData = admins.data {
                departmentAdmins[departmentId] = adminsData
            }
            if let membersData = members.data {
                departmentMembers[departmentId] = membersData
            }
        } catch {
            // Handle silently
        }
    }

    func createDepartment(name: String) async -> Bool {
        do {
            let request = CreateDepartmentRequest(name: name)
            let response: APIResponse<Department> = try await apiClient.post(
                endpoint: .departments,
                body: request
            )
            if response.success {
                await loadDepartments()
                return true
            } else {
                errorMessage = response.error ?? "Failed to create department"
            }
        } catch let error as NetworkError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
        return false
    }

    func deleteDepartment(id: String) async -> Bool {
        do {
            let response: APIResponse<EmptyResponse> = try await apiClient.delete(
                endpoint: .departments,
                queryParams: ["id": id]
            )
            if response.success {
                departments.removeAll { $0.id == id }
                return true
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        return false
    }

    func addMember(departmentId: String, userId: String) async -> Bool {
        do {
            let request = AddMemberRequest(userId: userId)
            let response: APIResponse<EmptyResponse> = try await apiClient.post(
                endpoint: .departmentMembers(departmentId),
                body: request
            )
            if response.success {
                await loadDepartmentDetails(departmentId: departmentId)
                return true
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        return false
    }

    func removeMember(departmentId: String, userId: String) async -> Bool {
        do {
            let response: APIResponse<EmptyResponse> = try await apiClient.delete(
                endpoint: .departmentMembers(departmentId),
                queryParams: ["userId": userId]
            )
            if response.success {
                departmentMembers[departmentId]?.removeAll { $0.id == userId }
                return true
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        return false
    }

    func addAdmin(departmentId: String, userId: String) async -> Bool {
        do {
            let request = AddMemberRequest(userId: userId)
            let response: APIResponse<EmptyResponse> = try await apiClient.post(
                endpoint: .departmentAdmins(departmentId),
                body: request
            )
            if response.success {
                await loadDepartmentDetails(departmentId: departmentId)
                return true
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        return false
    }

    func removeAdmin(departmentId: String, userId: String) async -> Bool {
        do {
            let response: APIResponse<EmptyResponse> = try await apiClient.delete(
                endpoint: .departmentAdmins(departmentId),
                queryParams: ["userId": userId]
            )
            if response.success {
                departmentAdmins[departmentId]?.removeAll { $0.id == userId }
                return true
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        return false
    }

    func getAvailableUsers(excluding: [User]) -> [User] {
        let excludedIds = Set(excluding.map { $0.id })
        return users.filter { !excludedIds.contains($0.id) }
    }
}
