import SwiftUI

struct MeetingsListView: View {
    @StateObject private var viewModel = MeetingsViewModel()
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var showingCreateMeeting = false
    @State private var editingMeeting: Meeting?

    var body: some View {
        VStack(spacing: 0) {
            // Header with filter and create button
            HStack {
                Picker("Department", selection: $viewModel.selectedDepartmentId) {
                    Text("All Departments").tag(nil as String?)
                    ForEach(viewModel.departments) { dept in
                        Text(dept.name).tag(dept.id as String?)
                    }
                }
                .pickerStyle(.menu)

                Spacer()

                if authViewModel.isSuperUser {
                    Button {
                        showingCreateMeeting = true
                    } label: {
                        Label("Schedule", systemImage: "plus.circle.fill")
                    }
                }
            }
            .padding()
            .background(Color(.systemBackground))

            if viewModel.isLoading && viewModel.meetings.isEmpty {
                LoadingView(message: "Loading meetings...")
            } else if let error = viewModel.errorMessage, viewModel.meetings.isEmpty {
                ErrorView(message: error) {
                    Task { await viewModel.loadData() }
                }
            } else {
                // Weekly Calendar View
                weeklyCalendarView
            }
        }
        .sheet(isPresented: $showingCreateMeeting) {
            CreateMeetingView(viewModel: viewModel)
        }
        .sheet(item: $editingMeeting) { meeting in
            EditMeetingView(meeting: meeting, viewModel: viewModel)
        }
        .task {
            await viewModel.loadData()
        }
        .refreshable {
            await viewModel.loadData()
        }
    }

    // MARK: - Weekly Calendar View

    private var weeklyCalendarView: some View {
        VStack(spacing: 0) {
            // Week navigation
            HStack {
                Button {
                    viewModel.goToPreviousWeek()
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.title2)
                }

                Spacer()

                VStack {
                    Text(viewModel.weekRangeString)
                        .font(.headline)
                }

                Spacer()

                Button {
                    viewModel.goToNextWeek()
                } label: {
                    Image(systemName: "chevron.right")
                        .font(.title2)
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 12)
            .background(Color(.systemBackground))

            // Today button
            Button("Today") {
                viewModel.goToCurrentWeek()
            }
            .font(.caption)
            .padding(.bottom, 8)
            .background(Color(.systemBackground))

            // Week days with meetings
            ScrollView {
                VStack(spacing: 0) {
                    ForEach(viewModel.weekDays, id: \.self) { date in
                        WeekDayRow(
                            date: date,
                            meetings: viewModel.meetingsForDate(date),
                            isToday: viewModel.isToday(date),
                            isSuperUser: authViewModel.isSuperUser,
                            viewModel: viewModel,
                            onEdit: { meeting in editingMeeting = meeting },
                            onDelete: { meetingId in
                                Task { await viewModel.deleteMeeting(id: meetingId) }
                            }
                        )
                    }
                }
            }
        }
    }
}

// MARK: - Week Day Row

struct WeekDayRow: View {
    let date: Date
    let meetings: [Meeting]
    let isToday: Bool
    let isSuperUser: Bool
    let viewModel: MeetingsViewModel
    let onEdit: (Meeting) -> Void
    let onDelete: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Day header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(viewModel.formatDayHeader(date))
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(isToday ? .white : .secondary)
                    Text(viewModel.formatDayNumber(date))
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(isToday ? .white : .primary)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(isToday ? Color.green : Color.clear)
                .cornerRadius(8)

                Spacer()

                if meetings.isEmpty {
                    Text("No meetings")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(.trailing)
                }
            }
            .padding(.horizontal)
            .padding(.top, 12)
            .padding(.bottom, meetings.isEmpty ? 12 : 8)

            // Meetings for this day
            if !meetings.isEmpty {
                VStack(spacing: 8) {
                    ForEach(meetings) { meeting in
                        MeetingItemCard(
                            meeting: meeting,
                            isSuperUser: isSuperUser,
                            onEdit: { onEdit(meeting) },
                            onDelete: { onDelete(meeting.id) }
                        )
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 12)
            }

            Divider()
                .padding(.leading)
        }
        .background(Color(.systemBackground))
    }
}

// MARK: - Meeting Item Card (Compact)

struct MeetingItemCard: View {
    let meeting: Meeting
    let isSuperUser: Bool
    let onEdit: () -> Void
    let onDelete: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Time column
            VStack(alignment: .trailing, spacing: 2) {
                Text(formatTime(meeting.startTime))
                    .font(.caption)
                    .fontWeight(.medium)
                Text(formatTime(meeting.endTime))
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .frame(width: 55)

            // Meeting details
            VStack(alignment: .leading, spacing: 4) {
                Text(meeting.title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .lineLimit(1)

                if let deptName = meeting.departmentName {
                    Text(deptName)
                        .font(.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.blue.opacity(0.1))
                        .foregroundColor(.blue)
                        .cornerRadius(4)
                }

                if !meeting.location.isEmpty {
                    HStack(spacing: 2) {
                        Image(systemName: "mappin")
                            .font(.caption2)
                        Text(meeting.location)
                            .font(.caption2)
                    }
                    .foregroundColor(.secondary)
                }
            }

            Spacer()

            if isSuperUser {
                Menu {
                    Button { onEdit() } label: {
                        Label("Edit", systemImage: "pencil")
                    }
                    Button(role: .destructive) { onDelete() } label: {
                        Label("Delete", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(8)
                }
            }
        }
        .padding(12)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(10)
    }

    private func formatTime(_ time: String) -> String {
        let parts = time.split(separator: ":")
        guard parts.count >= 2, let hour = Int(parts[0]) else { return time }
        let minute = parts[1]
        let ampm = hour >= 12 ? "PM" : "AM"
        let hour12 = hour % 12 == 0 ? 12 : hour % 12
        return "\(hour12):\(minute) \(ampm)"
    }
}

struct MeetingCard: View {
    let meeting: Meeting
    let isSuperUser: Bool
    var isPast: Bool = false
    let onEdit: () -> Void
    let onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(meeting.title)
                    .font(.headline)

                Spacer()

                if isSuperUser {
                    Menu {
                        Button {
                            onEdit()
                        } label: {
                            Label("Edit", systemImage: "pencil")
                        }

                        Button(role: .destructive) {
                            onDelete()
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    } label: {
                        Image(systemName: "ellipsis")
                            .foregroundColor(.secondary)
                    }
                }
            }

            // Date and time
            HStack(spacing: 16) {
                HStack(spacing: 4) {
                    Image(systemName: "calendar")
                        .font(.caption)
                    Text(meeting.formattedDate)
                        .font(.subheadline)
                }

                HStack(spacing: 4) {
                    Image(systemName: "clock")
                        .font(.caption)
                    Text(meeting.formattedTimeRange)
                        .font(.subheadline)
                }
            }
            .foregroundColor(.secondary)

            // Department
            if let deptName = meeting.departmentName {
                Text(deptName)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.blue.opacity(0.1))
                    .foregroundColor(.blue)
                    .cornerRadius(6)
            }

            // Location
            if !meeting.location.isEmpty {
                HStack(spacing: 4) {
                    Image(systemName: "mappin")
                        .font(.caption)
                    Text(meeting.location)
                        .font(.subheadline)
                }
                .foregroundColor(.secondary)
            }

            // Description
            if !meeting.description.isEmpty {
                Text(meeting.description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }

            // Creator
            if let creatorName = meeting.creatorName {
                Text("Scheduled by \(creatorName)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 2, y: 1)
        .opacity(isPast ? 0.6 : 1)
    }
}

struct CreateMeetingView: View {
    @ObservedObject var viewModel: MeetingsViewModel
    @Environment(\.dismiss) var dismiss

    @State private var title = ""
    @State private var description = ""
    @State private var selectedDepartmentId: String?
    @State private var date = Date()
    @State private var startTime = Date()
    @State private var endTime = Date().addingTimeInterval(3600)
    @State private var location = ""
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Meeting Details") {
                    TextField("Title", text: $title)

                    TextField("Description", text: $description, axis: .vertical)
                        .lineLimit(2...4)
                }

                Section("Department") {
                    Picker("Department", selection: $selectedDepartmentId) {
                        Text("Select Department").tag(nil as String?)
                        ForEach(viewModel.departments) { dept in
                            Text(dept.name).tag(dept.id as String?)
                        }
                    }
                }

                Section("Date & Time") {
                    DatePicker("Date", selection: $date, displayedComponents: .date)
                    DatePicker("Start Time", selection: $startTime, displayedComponents: .hourAndMinute)
                    DatePicker("End Time", selection: $endTime, displayedComponents: .hourAndMinute)
                }

                Section("Location") {
                    TextField("Location (optional)", text: $location)
                }
            }
            .navigationTitle("Schedule Meeting")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Create") {
                        createMeeting()
                    }
                    .disabled(title.isEmpty || selectedDepartmentId == nil || isSaving)
                    .fontWeight(.semibold)
                }
            }
        }
    }

    private func createMeeting() {
        guard let departmentId = selectedDepartmentId else { return }
        isSaving = true

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"

        let timeFormatter = DateFormatter()
        timeFormatter.dateFormat = "HH:mm"

        let request = CreateMeetingRequest(
            title: title,
            description: description.isEmpty ? nil : description,
            date: dateFormatter.string(from: date),
            startTime: timeFormatter.string(from: startTime),
            endTime: timeFormatter.string(from: endTime),
            departmentId: departmentId,
            location: location.isEmpty ? nil : location
        )

        Task {
            let success = await viewModel.createMeeting(request)
            if success {
                dismiss()
            }
            isSaving = false
        }
    }
}

struct EditMeetingView: View {
    let meeting: Meeting
    @ObservedObject var viewModel: MeetingsViewModel
    @Environment(\.dismiss) var dismiss

    @State private var title: String
    @State private var description: String
    @State private var selectedDepartmentId: String?
    @State private var date: Date
    @State private var startTime: Date
    @State private var endTime: Date
    @State private var location: String
    @State private var isSaving = false

    init(meeting: Meeting, viewModel: MeetingsViewModel) {
        self.meeting = meeting
        self.viewModel = viewModel

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"

        let timeFormatter = DateFormatter()
        timeFormatter.dateFormat = "HH:mm"

        _title = State(initialValue: meeting.title)
        _description = State(initialValue: meeting.description)
        _selectedDepartmentId = State(initialValue: meeting.departmentId)
        _date = State(initialValue: dateFormatter.date(from: meeting.date) ?? Date())
        _startTime = State(initialValue: timeFormatter.date(from: meeting.startTime) ?? Date())
        _endTime = State(initialValue: timeFormatter.date(from: meeting.endTime) ?? Date())
        _location = State(initialValue: meeting.location)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Meeting Details") {
                    TextField("Title", text: $title)
                    TextField("Description", text: $description, axis: .vertical)
                        .lineLimit(2...4)
                }

                Section("Department") {
                    Picker("Department", selection: $selectedDepartmentId) {
                        ForEach(viewModel.departments) { dept in
                            Text(dept.name).tag(dept.id as String?)
                        }
                    }
                }

                Section("Date & Time") {
                    DatePicker("Date", selection: $date, displayedComponents: .date)
                    DatePicker("Start Time", selection: $startTime, displayedComponents: .hourAndMinute)
                    DatePicker("End Time", selection: $endTime, displayedComponents: .hourAndMinute)
                }

                Section("Location") {
                    TextField("Location", text: $location)
                }
            }
            .navigationTitle("Edit Meeting")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        updateMeeting()
                    }
                    .disabled(title.isEmpty || selectedDepartmentId == nil || isSaving)
                    .fontWeight(.semibold)
                }
            }
        }
    }

    private func updateMeeting() {
        guard let departmentId = selectedDepartmentId else { return }
        isSaving = true

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"

        let timeFormatter = DateFormatter()
        timeFormatter.dateFormat = "HH:mm"

        let request = UpdateMeetingRequest(
            id: meeting.id,
            title: title,
            description: description.isEmpty ? nil : description,
            date: dateFormatter.string(from: date),
            startTime: timeFormatter.string(from: startTime),
            endTime: timeFormatter.string(from: endTime),
            departmentId: departmentId,
            location: location.isEmpty ? nil : location
        )

        Task {
            let success = await viewModel.updateMeeting(request)
            if success {
                dismiss()
            }
            isSaving = false
        }
    }
}

#Preview {
    MeetingsListView()
        .environmentObject(AuthViewModel())
}
