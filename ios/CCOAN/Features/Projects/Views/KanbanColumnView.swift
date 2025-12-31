import SwiftUI

struct KanbanColumnView: View {
    let status: ProjectStatus
    let projects: [Project]
    let onTaskTap: (Project) -> Void
    let onMoveTask: (String, ProjectStatus) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack {
                Circle()
                    .fill(status.swiftUIColor)
                    .frame(width: 10, height: 10)

                Text(status.displayName)
                    .font(.headline)

                Spacer()

                Text("\(projects.count)")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(Color(.systemGray5))
                    .cornerRadius(10)
            }
            .padding()
            .background(Color(.systemGray6))

            // Tasks
            ScrollView {
                LazyVStack(spacing: 8) {
                    ForEach(projects) { project in
                        TaskCardView(task: project)
                            .onTapGesture {
                                onTaskTap(project)
                            }
                            .contextMenu {
                                ForEach(ProjectStatus.allCases.filter { $0 != status && $0 != .archived }, id: \.self) { newStatus in
                                    Button {
                                        onMoveTask(project.id, newStatus)
                                    } label: {
                                        Label("Move to \(newStatus.displayName)", systemImage: "arrow.right")
                                    }
                                }
                            }
                    }
                }
                .padding(8)
            }
        }
        .frame(width: 280)
        .background(Color(.systemGray6).opacity(0.5))
        .cornerRadius(12)
    }
}

struct TaskCardView: View {
    let task: Project

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Title
            Text(task.title)
                .font(.subheadline)
                .fontWeight(.medium)
                .lineLimit(2)

            // Labels
            if !task.labels.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 4) {
                        ForEach(task.labels.prefix(3)) { label in
                            Text(label.name)
                                .font(.caption2)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color(hex: label.color.hexColor).opacity(0.2))
                                .foregroundColor(Color(hex: label.color.hexColor))
                                .cornerRadius(4)
                        }
                        if task.labels.count > 3 {
                            Text("+\(task.labels.count - 3)")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }

            // Bottom row
            HStack {
                // Priority
                PriorityBadge(priority: task.priority)

                Spacer()

                // Due date
                if let dueDate = task.dueDate {
                    DueDateBadge(dateString: dueDate, status: task.status)
                }
            }

            // Subtasks progress
            if !task.subtasks.isEmpty {
                let completed = task.subtasks.filter { $0.completed }.count
                HStack(spacing: 4) {
                    ProgressView(value: Double(completed), total: Double(task.subtasks.count))
                        .tint(.blue)
                    Text("\(completed)/\(task.subtasks.count)")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }

            // Assignee and comments
            HStack {
                if let assigneeName = task.assigneeName ?? task.assigneeNames?.first {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(Color.blue.opacity(0.2))
                            .frame(width: 20, height: 20)
                            .overlay(
                                Text(String(assigneeName.prefix(1)).uppercased())
                                    .font(.caption2)
                                    .fontWeight(.medium)
                                    .foregroundColor(.blue)
                            )
                        Text(assigneeName)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                }

                Spacer()

                if !task.comments.isEmpty {
                    HStack(spacing: 2) {
                        Image(systemName: "bubble.right")
                            .font(.caption2)
                        Text("\(task.comments.count)")
                            .font(.caption2)
                    }
                    .foregroundColor(.secondary)
                }
            }
        }
        .padding(12)
        .background(Color(.systemBackground))
        .cornerRadius(10)
        .shadow(color: .black.opacity(0.05), radius: 2, y: 1)
    }
}

struct PriorityBadge: View {
    let priority: Priority

    var body: some View {
        Text(priority.displayName)
            .font(.caption2)
            .fontWeight(.medium)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(priority.swiftUIColor.opacity(0.15))
            .foregroundColor(priority.swiftUIColor)
            .cornerRadius(4)
    }
}

struct DueDateBadge: View {
    let dateString: String
    let status: ProjectStatus

    var isOverdue: Bool {
        guard status != .done else { return false }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: dateString) else { return false }
        return date < Date()
    }

    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        guard let date = formatter.date(from: dateString) else { return dateString }
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }

    var body: some View {
        HStack(spacing: 2) {
            Image(systemName: "calendar")
                .font(.caption2)
            Text(formattedDate)
                .font(.caption2)
        }
        .foregroundColor(isOverdue ? .red : .secondary)
    }
}

struct TaskRowView: View {
    let task: Project

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(task.priority.swiftUIColor)
                .frame(width: 8, height: 8)

            VStack(alignment: .leading, spacing: 4) {
                Text(task.title)
                    .font(.subheadline)

                HStack(spacing: 8) {
                    if let dueDate = task.dueDate {
                        DueDateBadge(dateString: dueDate, status: task.status)
                    }

                    if let assignee = task.assigneeName {
                        Text(assignee)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    KanbanColumnView(
        status: .todo,
        projects: [],
        onTaskTap: { _ in },
        onMoveTask: { _, _ in }
    )
}
