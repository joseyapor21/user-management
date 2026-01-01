import Foundation

@MainActor
class ScheduleViewModel: ObservableObject {
    @Published var schedule: SundaySchedule?
    @Published var config: ScheduleConfig?
    @Published var canEdit = false
    @Published var scheduleAdminName: String?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var currentDate: Date

    private let apiClient = APIClient.shared

    init() {
        // Start with the nearest Sunday
        self.currentDate = ScheduleViewModel.nearestSunday(from: Date())
    }

    static func nearestSunday(from date: Date) -> Date {
        let calendar = Calendar.current
        let weekday = calendar.component(.weekday, from: date)
        // Sunday is 1 in Calendar
        let daysUntilSunday = weekday == 1 ? 0 : (8 - weekday)
        return calendar.date(byAdding: .day, value: daysUntilSunday, to: date) ?? date
    }

    var dateString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: currentDate)
    }

    var displayDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMMM d, yyyy"
        return formatter.string(from: currentDate)
    }

    var phases: [String] {
        config?.phases ?? Constants.Schedule.defaultPhases
    }

    var departments: [String] {
        config?.departments ?? Constants.Schedule.defaultDepartments
    }

    func loadSchedule() async {
        isLoading = true
        errorMessage = nil

        do {
            let response: ScheduleResponse = try await apiClient.get(
                endpoint: .schedules,
                queryParams: ["date": dateString]
            )

            self.schedule = response.data
            self.canEdit = response.canEdit
            self.scheduleAdminName = response.scheduleAdminName

            // Load config
            let configResponse: APIResponse<ScheduleConfig> = try await apiClient.get(endpoint: .schedulesConfig)
            self.config = configResponse.data
        } catch let error as NetworkError {
            errorMessage = error.errorDescription
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func getAssignees(phase: String, department: String) -> String {
        guard let slots = schedule?.slots else { return "" }
        return slots.first { $0.phase == phase && $0.department == department }?.assignees ?? ""
    }

    func updateSlot(phase: String, department: String, assignees: String) async {
        var currentSlots = schedule?.slots ?? []

        // Find and update or add the slot
        if let index = currentSlots.firstIndex(where: { $0.phase == phase && $0.department == department }) {
            currentSlots[index].assignees = assignees
        } else {
            currentSlots.append(ScheduleSlot(phase: phase, department: department, assignees: assignees))
        }

        let request = UpdateScheduleRequest(date: dateString, slots: currentSlots)

        do {
            let _: APIResponse<EmptyResponse> = try await apiClient.put(
                endpoint: .schedules,
                body: request
            )
            // Update local state
            schedule?.slots = currentSlots
        } catch {
            errorMessage = error.localizedDescription
            await loadSchedule() // Reload on error
        }
    }

    func goToPreviousSunday() {
        let calendar = Calendar.current
        if let newDate = calendar.date(byAdding: .day, value: -7, to: currentDate) {
            currentDate = newDate
            Task { await loadSchedule() }
        }
    }

    func goToNextSunday() {
        let calendar = Calendar.current
        if let newDate = calendar.date(byAdding: .day, value: 7, to: currentDate) {
            currentDate = newDate
            Task { await loadSchedule() }
        }
    }

    func goToToday() {
        currentDate = ScheduleViewModel.nearestSunday(from: Date())
        Task { await loadSchedule() }
    }
}
