import Foundation

@MainActor
class MeetingsViewModel: ObservableObject {
    @Published var meetings: [Meeting] = []
    @Published var departments: [Department] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var selectedDepartmentId: String?

    // Calendar state - weekly view
    @Published var currentWeekStart: Date = Date()
    @Published var weekDays: [Date] = []
    @Published var selectedDate: Date?

    private let apiClient = APIClient.shared
    private let calendar = Calendar.current

    init() {
        currentWeekStart = getWeekStart(from: Date())
        updateWeekDays()
    }

    // MARK: - Calendar Methods

    private func getWeekStart(from date: Date) -> Date {
        var cal = calendar
        cal.firstWeekday = 1 // Sunday
        let components = cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: date)
        return cal.date(from: components) ?? date
    }

    func updateWeekDays() {
        var days: [Date] = []
        for i in 0..<7 {
            if let date = calendar.date(byAdding: .day, value: i, to: currentWeekStart) {
                days.append(date)
            }
        }
        weekDays = days
    }

    var weekRangeString: String {
        guard let firstDay = weekDays.first, let lastDay = weekDays.last else { return "" }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        let startStr = formatter.string(from: firstDay)
        formatter.dateFormat = "MMM d, yyyy"
        let endStr = formatter.string(from: lastDay)
        return "\(startStr) - \(endStr)"
    }

    func goToPreviousWeek() {
        if let newStart = calendar.date(byAdding: .day, value: -7, to: currentWeekStart) {
            currentWeekStart = newStart
            updateWeekDays()
        }
    }

    func goToNextWeek() {
        if let newStart = calendar.date(byAdding: .day, value: 7, to: currentWeekStart) {
            currentWeekStart = newStart
            updateWeekDays()
        }
    }

    func goToCurrentWeek() {
        currentWeekStart = getWeekStart(from: Date())
        updateWeekDays()
        selectedDate = nil
    }

    func selectDate(_ date: Date?) {
        selectedDate = date
    }

    func isToday(_ date: Date) -> Bool {
        calendar.isDateInToday(date)
    }

    func isSelected(_ date: Date) -> Bool {
        guard let selected = selectedDate else { return false }
        return calendar.isDate(date, inSameDayAs: selected)
    }

    func meetingsForDate(_ date: Date) -> [Meeting] {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let dateString = dateFormatter.string(from: date)
        return filteredMeetings.filter { $0.date == dateString }.sorted { $0.startTime < $1.startTime }
    }

    func formatDayHeader(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"
        return formatter.string(from: date)
    }

    func formatDayNumber(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "d"
        return formatter.string(from: date)
    }

    func formatFullDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMMM d, yyyy"
        return formatter.string(from: date)
    }

    // MARK: - Filtering

    private var filteredMeetings: [Meeting] {
        meetings.filter { meeting in
            if let deptId = selectedDepartmentId {
                return meeting.departmentId == deptId
            }
            return true
        }
    }

    var upcomingMeetings: [Meeting] {
        filteredMeetings
            .filter { $0.isUpcoming }
            .sorted { $0.date < $1.date }
    }

    var pastMeetings: [Meeting] {
        filteredMeetings
            .filter { !$0.isUpcoming }
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
