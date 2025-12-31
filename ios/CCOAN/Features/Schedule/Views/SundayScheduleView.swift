import SwiftUI

struct SundayScheduleView: View {
    @StateObject private var viewModel = ScheduleViewModel()
    @State private var selectedSunday: Date?
    @State private var editingCell: (phase: String, department: String)?
    @State private var editText = ""

    private let calendar = Calendar.current
    private let daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    var body: some View {
        VStack(spacing: 0) {
            // Month navigation header
            monthNavigationView

            // Calendar grid
            calendarGridView

            Spacer()
        }
        .sheet(item: $selectedSunday) { date in
            ScheduleDetailSheet(
                date: date,
                viewModel: viewModel,
                editingCell: $editingCell,
                editText: $editText
            )
            .presentationDetents([.large])
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

    private var monthNavigationView: some View {
        HStack {
            Button {
                viewModel.goToPreviousMonth()
            } label: {
                Image(systemName: "chevron.left")
                    .font(.title2)
                    .foregroundColor(.blue)
            }

            Spacer()

            VStack(spacing: 2) {
                Text(viewModel.monthYearString)
                    .font(.title2)
                    .fontWeight(.semibold)

                Button("Today") {
                    viewModel.goToCurrentMonth()
                }
                .font(.caption)
                .foregroundColor(.blue)
            }

            Spacer()

            Button {
                viewModel.goToNextMonth()
            } label: {
                Image(systemName: "chevron.right")
                    .font(.title2)
                    .foregroundColor(.blue)
            }
        }
        .padding()
        .background(Color(.systemBackground))
    }

    private var calendarGridView: some View {
        VStack(spacing: 0) {
            // Days of week header
            HStack(spacing: 0) {
                ForEach(daysOfWeek, id: \.self) { day in
                    Text(day)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(day == "Sun" ? .blue : .secondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                }
            }
            .background(Color(.systemGray6))

            // Calendar days grid
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 0), count: 7), spacing: 0) {
                ForEach(viewModel.calendarDays, id: \.self) { date in
                    CalendarDayCell(
                        date: date,
                        isCurrentMonth: viewModel.isCurrentMonth(date),
                        isSunday: calendar.component(.weekday, from: date) == 1,
                        isToday: calendar.isDateInToday(date),
                        isSelected: selectedSunday != nil && calendar.isDate(date, inSameDayAs: selectedSunday!),
                        onTap: {
                            if calendar.component(.weekday, from: date) == 1 {
                                viewModel.selectDate(date)
                                Task {
                                    await viewModel.loadSchedule()
                                    selectedSunday = date
                                }
                            }
                        }
                    )
                }
            }

            // Legend
            HStack(spacing: 16) {
                HStack(spacing: 4) {
                    Circle()
                        .fill(Color.blue)
                        .frame(width: 8, height: 8)
                    Text("Sunday (tap to view)")
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
            .padding(.vertical, 12)
        }
    }
}

struct CalendarDayCell: View {
    let date: Date
    let isCurrentMonth: Bool
    let isSunday: Bool
    let isToday: Bool
    let isSelected: Bool
    let onTap: () -> Void

    private let calendar = Calendar.current

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 4) {
                ZStack {
                    if isToday {
                        Circle()
                            .fill(Color.green)
                            .frame(width: 32, height: 32)
                    } else if isSelected {
                        Circle()
                            .fill(Color.blue)
                            .frame(width: 32, height: 32)
                    } else if isSunday && isCurrentMonth {
                        Circle()
                            .stroke(Color.blue, lineWidth: 2)
                            .frame(width: 32, height: 32)
                    }

                    Text("\(calendar.component(.day, from: date))")
                        .font(.system(size: 14, weight: isSunday ? .semibold : .regular))
                        .foregroundColor(textColor)
                }

                if isSunday && isCurrentMonth {
                    Circle()
                        .fill(Color.blue.opacity(0.6))
                        .frame(width: 4, height: 4)
                } else {
                    Circle()
                        .fill(Color.clear)
                        .frame(width: 4, height: 4)
                }
            }
            .frame(height: 50)
            .frame(maxWidth: .infinity)
            .background(backgroundColor)
        }
        .disabled(!isSunday || !isCurrentMonth)
    }

    private var textColor: Color {
        if isToday || isSelected {
            return .white
        } else if !isCurrentMonth {
            return .gray.opacity(0.4)
        } else if isSunday {
            return .blue
        } else {
            return .primary
        }
    }

    private var backgroundColor: Color {
        if isSunday && isCurrentMonth && !isToday && !isSelected {
            return Color.blue.opacity(0.05)
        }
        return Color.clear
    }
}

struct ScheduleDetailSheet: View {
    let date: Date
    @ObservedObject var viewModel: ScheduleViewModel
    @Binding var editingCell: (phase: String, department: String)?
    @Binding var editText: String
    @Environment(\.dismiss) private var dismiss

    private var dateFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMMM d, yyyy"
        return formatter
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Admin info
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
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.systemGray6))
                }

                if viewModel.isLoading {
                    Spacer()
                    ProgressView("Loading schedule...")
                    Spacer()
                } else {
                    // Schedule grid
                    ScrollView([.horizontal, .vertical]) {
                        VStack(spacing: 0) {
                            // Header row with departments
                            HStack(spacing: 0) {
                                Text("Phase")
                                    .font(.caption)
                                    .fontWeight(.semibold)
                                    .frame(width: 120, height: 50)
                                    .background(Color(.systemGray5))

                                ForEach(viewModel.departments, id: \.self) { dept in
                                    Text(dept)
                                        .font(.caption2)
                                        .fontWeight(.medium)
                                        .multilineTextAlignment(.center)
                                        .frame(width: 100, height: 50)
                                        .background(Color(.systemGray5))
                                        .border(Color(.systemGray4), width: 0.5)
                                }
                            }

                            // Rows for each phase
                            ForEach(viewModel.phases, id: \.self) { phase in
                                HStack(spacing: 0) {
                                    Text(phase)
                                        .font(.caption)
                                        .fontWeight(.medium)
                                        .multilineTextAlignment(.center)
                                        .frame(width: 120, height: 60)
                                        .background(Color(.systemGray6))
                                        .border(Color(.systemGray4), width: 0.5)

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
            .navigationTitle(dateFormatter.string(from: date))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
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
                .lineLimit(3)
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

// Extension to make Date Identifiable for sheet presentation
extension Date: @retroactive Identifiable {
    public var id: TimeInterval { timeIntervalSince1970 }
}

#Preview {
    SundayScheduleView()
}
