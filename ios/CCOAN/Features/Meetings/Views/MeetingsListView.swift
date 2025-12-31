import SwiftUI

struct MeetingsListView: View {
    @StateObject private var viewModel = MeetingsViewModel()
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var showingCreateMeeting = false
    @State private var editingMeeting: Meeting?

    var body: some View {
        VStack(spacing: 0) {
            // Header with filter
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
