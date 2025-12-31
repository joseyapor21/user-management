import SwiftUI

struct CreateTaskView: View {
    @ObservedObject var viewModel: ProjectsViewModel
    @Environment(\.dismiss) var dismiss

    @State private var title = ""
    @State private var description = ""
    @State private var selectedDepartmentId: String?
    @State private var status: ProjectStatus = .backlog
    @State private var priority: Priority = .medium
    @State private var selectedAssigneeId: String?
    @State private var dueDate: Date?
    @State private var showDatePicker = false
    @State private var estimatedHours: String = ""
    @State private var isSaving = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Task Details") {
                    TextField("Title", text: $title)

                    TextField("Description", text: $description, axis: .vertical)
                        .lineLimit(3...6)
                }

                Section("Assignment") {
                    Picker("Department", selection: $selectedDepartmentId) {
                        Text("Select Department").tag(nil as String?)
                        ForEach(viewModel.departments) { dept in
                            Text(dept.name).tag(dept.id as String?)
                        }
                    }

                    Picker("Status", selection: $status) {
                        ForEach(ProjectStatus.allCases.filter { $0 != .archived }, id: \.self) { status in
                            Text(status.displayName).tag(status)
                        }
                    }

                    Picker("Priority", selection: $priority) {
                        ForEach(Priority.allCases, id: \.self) { priority in
                            HStack {
                                Circle()
                                    .fill(priority.swiftUIColor)
                                    .frame(width: 8, height: 8)
                                Text(priority.displayName)
                            }
                            .tag(priority)
                        }
                    }
                }

                Section("Due Date") {
                    Toggle("Set Due Date", isOn: $showDatePicker)

                    if showDatePicker {
                        DatePicker(
                            "Due Date",
                            selection: Binding(
                                get: { dueDate ?? Date() },
                                set: { dueDate = $0 }
                            ),
                            displayedComponents: [.date]
                        )
                    }
                }

                Section("Time Estimate") {
                    TextField("Estimated Hours", text: $estimatedHours)
                        .keyboardType(.decimalPad)
                }
            }
            .navigationTitle("New Task")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Create") {
                        createTask()
                    }
                    .disabled(title.isEmpty || selectedDepartmentId == nil || isSaving)
                    .fontWeight(.semibold)
                }
            }
        }
    }

    private func createTask() {
        guard let departmentId = selectedDepartmentId else { return }

        isSaving = true

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        let request = CreateProjectRequest(
            departmentId: departmentId,
            title: title,
            description: description.isEmpty ? nil : description,
            status: status.rawValue,
            priority: priority.rawValue,
            assigneeId: selectedAssigneeId,
            assigneeIds: nil,
            dueDate: dueDate.map { formatter.string(from: $0) },
            labels: nil,
            subtasks: nil,
            estimatedHours: Double(estimatedHours),
            recurrence: nil
        )

        Task {
            let success = await viewModel.createProject(request)
            if success {
                dismiss()
            }
            isSaving = false
        }
    }
}

#Preview {
    CreateTaskView(viewModel: ProjectsViewModel())
}
