import SwiftUI

struct MeetingsListView: View {
    @StateObject private var viewModel = MeetingsViewModel()
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var showingCreateMeeting = false
    @State private var editingMeeting: Meeting?

    private let daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

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
                ScrollView {
                    VStack(spacing: 0) {
                        // Calendar View
                        calendarView
                            .padding(.bottom, 16)

                        // Meetings for selected date or all meetings
                        if let selectedDate = viewModel.selectedDate {
                            selectedDateMeetingsView(selectedDate)
                        } else {
                            allMeetingsView
                        }
                    }
                }
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

    // MARK: - Calendar View

    private var calendarView: some View {
        VStack(spacing: 0) {
            // Month navigation
            HStack {
                Button {
                    viewModel.goToPreviousMonth()
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.title2)
                }

                Spacer()

                VStack {
                    Text(viewModel.monthYearString)
                        .font(.title3)
                        .fontWeight(.semibold)
                }

                Spacer()

                Button {
                    viewModel.goToNextMonth()
                } label: {
                    Image(systemName: "chevron.right")
                        .font(.title2)
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 12)

            // Today button
            Button("Today") {
                viewModel.goToCurrentMonth()
                viewModel.selectedDate = nil
            }
            .font(.caption)
            .padding(.bottom, 8)

            // Days of week header
            HStack(spacing: 0) {
                ForEach(daysOfWeek, id: \.self) { day in
                    Text(day)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(day == "Sun" ? .blue : .secondary)
                        .frame(maxWidth: .infinity)
                }
            }
            .padding(.horizontal, 8)
            .padding(.bottom, 8)

            // Calendar grid
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 0), count: 7), spacing: 0) {
                ForEach(viewModel.calendarDays, id: \.self) { date in
                    CalendarDayCell(
                        date: date,
                        isCurrentMonth: viewModel.isCurrentMonth(date),
                        isToday: viewModel.isToday(date),
                        isSelected: viewModel.isSelected(date),
                        hasMeetings: viewModel.hasMeetings(on: date)
                    )
                    .onTapGesture {
                        if viewModel.isCurrentMonth(date) {
                            if viewModel.isSelected(date) {
                                viewModel.selectedDate = nil
                            } else {
                                viewModel.selectDate(date)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 8)

            // Legend
            HStack(spacing: 16) {
                HStack(spacing: 4) {
                    Circle()
                        .fill(Color.blue)
                        .frame(width: 8, height: 8)
                    Text("Has meetings")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                HStack(spacing: 4) {
                    Circle()
                        .fill(Color.green)
                        .frame(width: 8, height: 8)
                    Text("Today")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.top, 12)
        }
        .background(Color(.systemBackground))
    }

    // MARK: - Selected Date Meetings

    private func selectedDateMeetingsView(_ date: Date) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(formatSelectedDate(date))
                    .font(.headline)

                Spacer()

                Button("Show All") {
                    viewModel.selectedDate = nil
                }
                .font(.caption)
            }
            .padding(.horizontal)

            let meetings = viewModel.meetingsForDate(date)
            if meetings.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "calendar.badge.exclamationmark")
                        .font(.largeTitle)
                        .foregroundColor(.secondary)
                    Text("No meetings on this day")
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 40)
            } else {
                ForEach(meetings) { meeting in
                    MeetingCard(
                        meeting: meeting,
                        isSuperUser: authViewModel.isSuperUser,
                        onEdit: { editingMeeting = meeting },
                        onDelete: {
                            Task { await viewModel.deleteMeeting(id: meeting.id) }
                        }
                    )
                    .padding(.horizontal)
                }
            }
        }
        .padding(.vertical)
    }

    private func formatSelectedDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMMM d, yyyy"
        return formatter.string(from: date)
    }

    // MARK: - All Meetings View

    private var allMeetingsView: some View {
        LazyVStack(alignment: .leading, spacing: 16) {
            // Upcoming meetings
            if !viewModel.upcomingMeetings.isEmpty {
                Text("Upcoming")
                    .font(.headline)
                    .padding(.horizontal)

                ForEach(viewModel.upcomingMeetings) { meeting in
                    MeetingCard(
                        meeting: meeting,
                        isSuperUser: authViewModel.isSuperUser,
                        onEdit: { editingMeeting = meeting },
                        onDelete: {
                            Task { await viewModel.deleteMeeting(id: meeting.id) }
                        }
                    )
                    .padding(.horizontal)
                }
            }

            // Past meetings
            if !viewModel.pastMeetings.isEmpty {
                Text("Past")
                    .font(.headline)
                    .padding(.horizontal)
                    .padding(.top, viewModel.upcomingMeetings.isEmpty ? 0 : 16)

                ForEach(viewModel.pastMeetings) { meeting in
                    MeetingCard(
                        meeting: meeting,
                        isSuperUser: authViewModel.isSuperUser,
                        isPast: true,
                        onEdit: { editingMeeting = meeting },
                        onDelete: {
                            Task { await viewModel.deleteMeeting(id: meeting.id) }
                        }
                    )
                    .padding(.horizontal)
                }
            }

            if viewModel.upcomingMeetings.isEmpty && viewModel.pastMeetings.isEmpty {
                EmptyStateView(
                    icon: "calendar.badge.exclamationmark",
                    title: "No Meetings",
                    message: authViewModel.isSuperUser ?
                        "Schedule a meeting to get started" :
                        "No meetings scheduled for your departments"
                )
                .padding(.top, 60)
            }
        }
        .padding(.vertical)
    }
}

// MARK: - Calendar Day Cell

struct CalendarDayCell: View {
    let date: Date
    let isCurrentMonth: Bool
    let isToday: Bool
    let isSelected: Bool
    let hasMeetings: Bool

    private var dayOfMonth: Int {
        Calendar.current.component(.day, from: date)
    }

    var body: some View {
        VStack(spacing: 2) {
            ZStack {
                if isToday {
                    Circle()
                        .fill(Color.green)
                        .frame(width: 32, height: 32)
                } else if isSelected {
                    Circle()
                        .fill(Color.blue)
                        .frame(width: 32, height: 32)
                } else if hasMeetings && isCurrentMonth {
                    Circle()
                        .stroke(Color.blue, lineWidth: 2)
                        .frame(width: 32, height: 32)
                }

                Text("\(dayOfMonth)")
                    .font(.subheadline)
                    .fontWeight(hasMeetings ? .semibold : .regular)
                    .foregroundColor(
                        isToday || isSelected ? .white :
                        !isCurrentMonth ? .gray.opacity(0.3) :
                        hasMeetings ? .blue : .primary
                    )
            }

            if hasMeetings && isCurrentMonth {
                Circle()
                    .fill(Color.blue.opacity(0.6))
                    .frame(width: 4, height: 4)
            } else {
                Spacer().frame(height: 4)
            }
        }
        .frame(height: 44)
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
