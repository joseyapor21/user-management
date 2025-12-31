import Foundation

@MainActor
class MeetingsViewModel: ObservableObject {
    @Published var meetings: [Meeting] = []
    @Published var departments: [Department] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var selectedDepartmentId: String?

    private let apiClient = APIClient.shared

    var upcomingMeetings: [Meeting] {
        meetings
            .filter { $0.isUpcoming }
            .filter { meeting in
                if let deptId = selectedDepartmentId {
                    return meeting.departmentId == deptId
                }
                return true
            }
            .sorted { $0.date < $1.date }
    }

    var pastMeetings: [Meeting] {
        meetings
            .filter { !$0.isUpcoming }
            .filter { meeting in
                if let deptId = selectedDepartmentId {
                    return meeting.departmentId == deptId
                }
                return true
            }
            .sorted { $0.date > $1.date }
    }

    func loadData() async {
        isLoading = true
        errorMessage = nil

        do {
            async let meetingsResponse: APIResponse<[Meeting]> = apiClient.get(endpoint: .meetings)
            async let departmentsResponse: APIResponse<[Department]> = apiClient.get(endpoint: .departments)

            let (meetRes, deptRes) = try await (meetingsResponse, departmentsResponse)

            if let meetingsData = meetRes.data {
                self.meetings = meetingsData
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

    func createMeeting(_ request: CreateMeetingRequest) async -> Bool {
        do {
            let response: APIResponse<Meeting> = try await apiClient.post(
                endpoint: .meetings,
                body: request
            )
            if response.success {
                await loadData()
                return true
            } else {
                errorMessage = response.error ?? "Failed to create meeting"
            }
        } catch let error as NetworkError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
        return false
    }

    func updateMeeting(_ request: UpdateMeetingRequest) async -> Bool {
        do {
            let response: APIResponse<EmptyResponse> = try await apiClient.put(
                endpoint: .meetings,
                body: request
            )
            if response.success {
                await loadData()
                return true
            } else {
                errorMessage = response.error ?? "Failed to update meeting"
            }
        } catch let error as NetworkError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }
        return false
    }

    func deleteMeeting(id: String) async -> Bool {
        do {
            let response: APIResponse<EmptyResponse> = try await apiClient.delete(
                endpoint: .meetings,
                queryParams: ["id": id]
            )
            if response.success {
                meetings.removeAll { $0.id == id }
                return true
            }
        } catch {
            errorMessage = error.localizedDescription
        }
        return false
    }
}
