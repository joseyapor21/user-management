import Foundation
import SwiftUI

@MainActor
class ProjectsViewModel: ObservableObject {
    @Published var projects: [Project] = []
    @Published var departments: [Department] = []
    @Published var users: [User] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    // Filters
    @Published var selectedDepartmentId: String? = nil
    @Published var selectedPriority: Priority? = nil
    @Published var showMyTasksOnly = false
    @Published var searchQuery = ""
    @Published var viewMode: ViewMode = .kanban

    enum ViewMode: String, CaseIterable {
        case kanban = "Board"
        case list = "List"
        case calendar = "Calendar"
    }

    private let apiClient = APIClient.shared

    var filteredProjects: [Project] {
        projects.filter { project in
            // Department filter
            if let deptId = selectedDepartmentId, project.departmentId != deptId {
                return false
            }

            // Priority filter
            if let priority = selectedPriority, project.priority != priority {
                return false
            }

            // Search filter
            if !searchQuery.isEmpty {
                let query = searchQuery.lowercased()
                if !project.title.lowercased().contains(query) &&
                   !project.description.lowercased().contains(query) {
                    return false
                }
            }

            // Don't show archived in normal view
            if project.status == .archived {
                return false
            }

            return true
        }
    }

    func projectsForStatus(_ status: ProjectStatus) -> [Project] {
        filteredProjects
            .filter { $0.status == status }
            .sorted { $0.order < $1.order }
    }

    var taskStats: (total: Int, completed: Int, overdue: Int) {
        let total = filteredProjects.count
        let completed = filteredProjects.filter { $0.status == .done }.count
        let overdue = filteredProjects.filter { project in
            guard let dueDate = project.dueDate else { return false }
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            guard let date = formatter.date(from: dueDate) else { return false }
            return date < Date() && project.status != .done
        }.count
        return (total, completed, overdue)
    }

    func loadData() async {
        isLoading = true
        errorMessage = nil

        do {
            async let projectsResponse: APIResponse<[Project]> = apiClient.get(endpoint: .projects)
            async let departmentsResponse: APIResponse<[Department]> = apiClient.get(endpoint: .departments)

            let (projRes, deptRes) = try await (projectsResponse, departmentsResponse)

            if let projectsData = projRes.data {
                self.projects = projectsData
            }
            if let departmentsData = deptRes.data {
                self.departments = departmentsData
            }
        } catch let error as NetworkError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func loadUsers() async {
        do {
            let response: APIResponse<[User]> = try await apiClient.get(endpoint: .users)
            if let usersData = response.data {
                self.users = usersData
            }
        } catch {
            // Users might not be accessible for non-superusers
        }
    }

    func createProject(_ request: CreateProjectRequest) async -> Bool {
        do {
            let response: APIResponse<CreateProjectResponse> = try await apiClient.post(
                endpoint: .projects,
                body: request
            )
            if response.success {
                await loadData()
                return true
            } else {
                errorMessage = response.error ?? "Failed to create task"
            }
        } catch let error as NetworkError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
        return false
    }

    func updateProject(_ request: UpdateProjectRequest) async -> Bool {
        do {
            let response: APIResponse<EmptyResponse> = try await apiClient.put(
                endpoint: .projects,
                body: request
            )
            if response.success {
                await loadData()
                return true
            } else {
                errorMessage = response.error ?? "Failed to update task"
            }
        } catch let error as NetworkError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
        return false
    }

    func moveProject(projectId: String, to status: ProjectStatus, order: Int = 0) async {
        do {
            let request = ReorderProjectRequest(
                projectId: projectId,
                newStatus: status.rawValue,
                newOrder: order
            )
            let _: APIResponse<EmptyResponse> = try await apiClient.put(
                endpoint: .projectsReorder,
                body: request
            )

            // Update locally for immediate feedback
            if let index = projects.firstIndex(where: { $0.id == projectId }) {
                projects[index].status = status
                projects[index].order = order
            }
        } catch {
            await loadData() // Reload on error
        }
    }

    func deleteProject(id: String) async -> Bool {
        do {
            let response: APIResponse<EmptyResponse> = try await apiClient.delete(
                endpoint: .projects,
                queryParams: ["id": id]
            )
            if response.success {
                projects.removeAll { $0.id == id }
                return true
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        return false
    }

    func addComment(projectId: String, text: String) async -> Bool {
        do {
            let request = AddCommentRequest(text: text)
            let response: APIResponse<EmptyResponse> = try await apiClient.post(
                endpoint: .projectComments(projectId),
                body: request
            )
            if response.success {
                await loadData()
                return true
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        return false
    }
}
