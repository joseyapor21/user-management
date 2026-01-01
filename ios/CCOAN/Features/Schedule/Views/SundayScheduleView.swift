import SwiftUI

struct SundayScheduleView: View {
    @StateObject private var viewModel = ScheduleViewModel()
    @State private var editingCell: (phase: String, department: String)?
    @State private var editText = ""

    var body: some View {
        VStack(spacing: 0) {
            // Date navigation
            dateNavigationView

            if viewModel.isLoading && viewModel.schedule == nil {
                LoadingView(message: "Loading schedule...")
            } else if let error = viewModel.errorMessage, viewModel.schedule == nil {
                ErrorView(message: error) {
                    Task { await viewModel.loadSchedule() }
                }
            } else {
                // Schedule admin info
                if let adminName = viewModel.scheduleAdminName {
                    HStack {
                        Image(systemName: "person.badge.key")
                            .foregroundColor(.blue)
                        Text("Schedule Admin: \(adminName)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding(.horizontal)
                    .padding(.vertical, 8)
                }

                // Schedule grid
                scheduleGridView
            }
        }
        .task {
            await viewModel.loadSchedule()
        }
        .sheet(item: Binding(
            get: { editingCell.map { EditingCell(phase: $0.phase, department: $0.department) } },
            set: { editingCell = $0.map { ($0.phase, $0.department) } }
        )) { cell in
            EditCellSheet(
                phase: cell.phase,
                department: cell.department,
                text: $editText,
                onSave: {
                    Task {
                        await viewModel.updateSlot(
                            phase: cell.phase,
                            department: cell.department,
                            assignees: editText
                        )
                        editingCell = nil
                    }
                },
                onCancel: {
                    editingCell = nil
                }
            )
            .presentationDetents([.medium])
        }
    }

    private var dateNavigationView: some View {
        VStack(spacing: 8) {
            HStack {
                Button {
                    viewModel.goToPreviousSunday()
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.title2)
                }

                Spacer()

                VStack {
                    Text("Sunday")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(viewModel.displayDate)
                        .font(.headline)
                }

                Spacer()

                Button {
                    viewModel.goToNextSunday()
                } label: {
                    Image(systemName: "chevron.right")
                        .font(.title2)
                }
            }
            .padding(.horizontal)
            .padding(.top)

            Button("Today") {
                viewModel.goToToday()
            }
            .font(.caption)
            .padding(.bottom, 8)
        }
        .background(Color(.systemBackground))
    }

    private var scheduleGridView: some View {
        ScrollView([.horizontal, .vertical]) {
            VStack(spacing: 0) {
                // Header row with departments
                HStack(spacing: 0) {
                    // Empty corner cell
                    Text("Phase")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .frame(width: 120, height: 50)
                        .background(Color(.systemGray5))

                    ForEach(viewModel.departments, id: \.self) { dept in
                        Text(dept)
                            .font(.caption2)
                            .fontWeight(.medium)
                            .frame(width: 100, height: 50)
                            .background(Color(.systemGray5))
                            .border(Color(.systemGray4), width: 0.5)
                    }
                }

                // Rows for each phase
                ForEach(viewModel.phases, id: \.self) { phase in
                    HStack(spacing: 0) {
                        // Phase name (sticky column)
                        Text(phase)
                            .font(.caption)
                            .fontWeight(.medium)
                            .frame(width: 120, height: 60)
                            .background(Color(.systemGray6))
                            .border(Color(.systemGray4), width: 0.5)

                        // Department cells
                        ForEach(viewModel.departments, id: \.self) { dept in
                            ScheduleCell(
                                text: viewModel.getAssignees(phase: phase, department: dept),
                                canEdit: viewModel.canEdit,
                                onTap: {
                                    if viewModel.canEdit {
                                        editText = viewModel.getAssignees(phase: phase, department: dept)
                                        editingCell = (phase, dept)
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}

struct ScheduleCell: View {
    let text: String
    let canEdit: Bool
    let onTap: () -> Void

    var body: some View {
        Button {
            onTap()
        } label: {
            Text(text.isEmpty ? (canEdit ? "+" : "-") : text)
                .font(.caption2)
                .foregroundColor(text.isEmpty ? .gray : .primary)
                .frame(width: 100, height: 60)
                .background(Color(.systemBackground))
                .border(Color(.systemGray4), width: 0.5)
        }
        .disabled(!canEdit)
    }
}

struct EditingCell: Identifiable {
    let id = UUID()
    let phase: String
    let department: String
}

struct EditCellSheet: View {
    let phase: String
    let department: String
    @Binding var text: String
    let onSave: () -> Void
    let onCancel: () -> Void

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Phase")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(phase)
                        .font(.headline)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("Department")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(department)
                        .font(.headline)
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("Assigned Members")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    TextEditor(text: $text)
                        .frame(minHeight: 100)
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(Color(.systemGray4), lineWidth: 1)
                        )

                    Text("Enter names separated by commas or new lines")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }

                Spacer()
            }
            .padding()
            .navigationTitle("Edit Assignment")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        onCancel()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        onSave()
                    }
                    .fontWeight(.semibold)
                }
            }
        }
    }
}

#Preview {
    SundayScheduleView()
}
