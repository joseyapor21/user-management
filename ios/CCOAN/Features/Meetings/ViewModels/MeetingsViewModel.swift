import Foundation

@MainActor
class MeetingsViewModel: ObservableObject {
    @Published var meetings: [Meeting] = []
    @Published var departments: [Department] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var selectedDepartmentId: String?

    // Calendar state
    @Published var displayedMonth: Date = Date()
    @Published var selectedDate: Date?
    @Published var calendarDays: [Date] = []

    private let apiClient = APIClient.shared
    private let calendar = Calendar.current

    init() {
        updateCalendarDays()
    }

    // MARK: - Calendar Methods

    func updateCalendarDays() {
        var days: [Date] = []
        var cal = calendar
        cal.firstWeekday = 1 // Sunday

        // Go to first day of month
        var components = cal.dateComponents([.year, .month], from: displayedMonth)
        components.day = 1
        guard let firstOfMonth = cal.date(from: components) else { return }

        // Go back to Sunday of the first week
        let firstWeekday = cal.component(.weekday, from: firstOfMonth)
        guard let startDate = cal.date(byAdding: .day, value: -(firstWeekday - 1), to: firstOfMonth) else { return }

        // Generate 42 days (6 weeks)
        for i in 0..<42 {
            if let date = cal.date(byAdding: .day, value: i, to: startDate) {
                days.append(date)
            }
        }

        calendarDays = days
    }

    var monthYearString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: displayedMonth)
    }

    func goToPreviousMonth() {
        if let newDate = calendar.date(byAdding: .month, value: -1, to: displayedMonth) {
            displayedMonth = newDate
            updateCalendarDays()
        }
    }

    func goToNextMonth() {
        if let newDate = calendar.date(byAdding: .month, value: 1, to: displayedMonth) {
            displayedMonth = newDate
            updateCalendarDays()
        }
    }

    func goToCurrentMonth() {
        displayedMonth = Date()
        updateCalendarDays()
    }

    func selectDate(_ date: Date) {
        selectedDate = date
    }

    func isCurrentMonth(_ date: Date) -> Bool {
        calendar.component(.month, from: date) == calendar.component(.month, from: displayedMonth) &&
        calendar.component(.year, from: date) == calendar.component(.year, from: displayedMonth)
    }

    func isToday(_ date: Date) -> Bool {
        calendar.isDateInToday(date)
    }

    func isSelected(_ date: Date) -> Bool {
        guard let selected = selectedDate else { return false }
        return calendar.isDate(date, inSameDayAs: selected)
    }

    func hasMeetings(on date: Date) -> Bool {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let dateString = dateFormatter.string(from: date)
        return filteredMeetings.contains { $0.date == dateString }
    }

    func meetingsForDate(_ date: Date) -> [Meeting] {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let dateString = dateFormatter.string(from: date)
        return filteredMeetings.filter { $0.date == dateString }.sorted { $0.startTime < $1.startTime }
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
