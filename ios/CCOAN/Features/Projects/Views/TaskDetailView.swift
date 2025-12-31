import SwiftUI

struct TaskDetailView: View {
    let task: Project
    @ObservedObject var viewModel: ProjectsViewModel
    @Environment(\.dismiss) var dismiss

    @State private var selectedTab = 0
    @State private var isEditing = false
    @State private var commentText = ""
    @State private var isSendingComment = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Quick status buttons
                statusButtonsView

                // Tab picker
                Picker("Tab", selection: $selectedTab) {
                    Text("Details").tag(0)
                    Text("Subtasks").tag(1)
                    Text("Comments").tag(2)
                    Text("Activity").tag(3)
                }
                .pickerStyle(.segmented)
                .padding()

                // Content
                TabView(selection: $selectedTab) {
                    detailsTab.tag(0)
                    subtasksTab.tag(1)
                    commentsTab.tag(2)
                    activityTab.tag(3)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            }
            .navigationTitle(task.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button {
                            isEditing = true
                        } label: {
                            Label("Edit", systemImage: "pencil")
                        }

                        Button(role: .destructive) {
                            Task {
                                await viewModel.deleteProject(id: task.id)
                                dismiss()
                            }
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
        }
    }

    private var statusButtonsView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(ProjectStatus.allCases.filter { $0 != .archived }, id: \.self) { status in
                    Button {
                        Task {
                            await viewModel.moveProject(projectId: task.id, to: status)
                        }
                    } label: {
                        Text(status.displayName)
                            .font(.caption)
                            .fontWeight(task.status == status ? .semibold : .regular)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(task.status == status ? status.swiftUIColor : Color(.systemGray5))
                            .foregroundColor(task.status == status ? .white : .primary)
                            .cornerRadius(16)
                    }
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
        }
        .background(Color(.systemGray6))
    }

    private var detailsTab: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // Description
                if !task.description.isEmpty {
                    DetailSection(title: "Description") {
                        Text(task.description)
                            .font(.body)
                    }
                }

                // Priority
                DetailSection(title: "Priority") {
                    PriorityBadge(priority: task.priority)
                }

                // Due Date
                if let dueDate = task.dueDate {
                    DetailSection(title: "Due Date") {
                        DueDateBadge(dateString: dueDate, status: task.status)
                    }
                }

                // Assignee
                if let assignee = task.assigneeName ?? task.assigneeNames?.joined(separator: ", ") {
                    DetailSection(title: "Assignee") {
                        HStack {
                            Circle()
                                .fill(Color.blue.opacity(0.2))
                                .frame(width: 32, height: 32)
                                .overlay(
                                    Text(String(assignee.prefix(1)).uppercased())
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                        .foregroundColor(.blue)
                                )
                            Text(assignee)
                        }
                    }
                }

                // Time Tracking
                if task.estimatedHours != nil || task.loggedHours != nil {
                    DetailSection(title: "Time Tracking") {
                        VStack(alignment: .leading, spacing: 8) {
                            if let estimated = task.estimatedHours {
                                Text("Estimated: \(String(format: "%.1f", estimated)) hours")
                            }
                            if let logged = task.loggedHours {
                                Text("Logged: \(String(format: "%.1f", logged)) hours")
                            }
                            if let estimated = task.estimatedHours, let logged = task.loggedHours, estimated > 0 {
                                ProgressView(value: min(logged / estimated, 1.0))
                                    .tint(logged > estimated ? .red : .blue)
                            }
                        }
                    }
                }

                // Labels
                if !task.labels.isEmpty {
                    DetailSection(title: "Labels") {
                        FlowLayout(spacing: 6) {
                            ForEach(task.labels) { label in
                                Text(label.name)
                                    .font(.caption)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color(hex: label.color.hexColor).opacity(0.2))
                                    .foregroundColor(Color(hex: label.color.hexColor))
                                    .cornerRadius(6)
                            }
                        }
                    }
                }

                // Metadata
                DetailSection(title: "Created") {
                    VStack(alignment: .leading, spacing: 4) {
                        if let creatorName = task.creatorName {
                            Text("By \(creatorName)")
                        }
                        if let createdAt = task.metadata?.createdAt {
                            Text(formatDate(createdAt))
                                .foregroundColor(.secondary)
                        }
                    }
                    .font(.subheadline)
                }
            }
            .padding()
        }
    }

    private var subtasksTab: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                if task.subtasks.isEmpty {
                    EmptyStateView(
                        icon: "checklist",
                        title: "No Subtasks",
                        message: "Add subtasks to break down this task"
                    )
                } else {
                    let completed = task.subtasks.filter { $0.completed }.count

                    // Progress
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Progress")
                                .font(.headline)
                            Spacer()
                            Text("\(completed)/\(task.subtasks.count)")
                                .foregroundColor(.secondary)
                        }
                        ProgressView(value: Double(completed), total: Double(task.subtasks.count))
                            .tint(.blue)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .cornerRadius(12)

                    // Subtasks list
                    ForEach(task.subtasks) { subtask in
                        HStack {
                            Image(systemName: subtask.completed ? "checkmark.circle.fill" : "circle")
                                .foregroundColor(subtask.completed ? .green : .gray)

                            Text(subtask.title)
                                .strikethrough(subtask.completed)
                                .foregroundColor(subtask.completed ? .secondary : .primary)

                            Spacer()
                        }
                        .padding()
                        .background(Color(.systemBackground))
                        .cornerRadius(8)
                    }
                }
            }
            .padding()
        }
    }

    private var commentsTab: some View {
        VStack(spacing: 0) {
            if task.comments.isEmpty {
                Spacer()
                EmptyStateView(
                    icon: "bubble.right",
                    title: "No Comments",
                    message: "Start the conversation"
                )
                Spacer()
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(task.comments) { comment in
                            CommentBubble(comment: comment)
                        }
                    }
                    .padding()
                }
            }

            // Comment input
            HStack(spacing: 8) {
                TextField("Add a comment...", text: $commentText, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(1...4)

                Button {
                    sendComment()
                } label: {
                    Image(systemName: "paperplane.fill")
                        .foregroundColor(commentText.isEmpty ? .gray : .blue)
                }
                .disabled(commentText.isEmpty || isSendingComment)
            }
            .padding()
            .background(Color(.systemBackground))
        }
    }

    private var activityTab: some View {
        ScrollView {
            if task.activityLog.isEmpty {
                EmptyStateView(
                    icon: "clock.arrow.circlepath",
                    title: "No Activity",
                    message: "Activity will appear here"
                )
            } else {
                LazyVStack(alignment: .leading, spacing: 16) {
                    ForEach(task.activityLog) { entry in
                        HStack(alignment: .top, spacing: 12) {
                            Circle()
                                .fill(Color.blue.opacity(0.2))
                                .frame(width: 32, height: 32)
                                .overlay(
                                    Text(String(entry.userName.prefix(1)).uppercased())
                                        .font(.caption)
                                        .fontWeight(.medium)
                                        .foregroundColor(.blue)
                                )

                            VStack(alignment: .leading, spacing: 4) {
                                Text(entry.userName)
                                    .font(.subheadline)
                                    .fontWeight(.medium)

                                Text(entry.action)
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)

                                if let details = entry.details {
                                    Text(details)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }

                                Text(formatDate(entry.timestamp))
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }
                .padding()
            }
        }
    }

    private func sendComment() {
        guard !commentText.isEmpty else { return }
        isSendingComment = true
        let text = commentText
        commentText = ""

        Task {
            await viewModel.addComment(projectId: task.id, text: text)
            isSendingComment = false
        }
    }

    private func formatDate(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: isoString) else { return isoString }

        let displayFormatter = DateFormatter()
        displayFormatter.dateStyle = .medium
        displayFormatter.timeStyle = .short
        return displayFormatter.string(from: date)
    }
}

struct DetailSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
                .textCase(.uppercase)

            content()
        }
    }
}

struct CommentBubble: View {
    let comment: Comment

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(comment.userName)
                    .font(.caption)
                    .fontWeight(.medium)
                Spacer()
                Text(formatDate(comment.createdAt))
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }

            Text(comment.text)
                .font(.subheadline)
        }
        .padding(12)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private func formatDate(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: isoString) else { return "" }
        let displayFormatter = RelativeDateTimeFormatter()
        displayFormatter.unitsStyle = .short
        return displayFormatter.localizedString(for: date, relativeTo: Date())
    }
}

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(in: proposal.width ?? 0, subviews: subviews, spacing: spacing)
        return CGSize(width: proposal.width ?? 0, height: result.height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(in: bounds.width, subviews: subviews, spacing: spacing)
        for (index, subview) in subviews.enumerated() {
            subview.place(at: CGPoint(x: bounds.minX + result.positions[index].x,
                                      y: bounds.minY + result.positions[index].y),
                         proposal: .unspecified)
        }
    }

    struct FlowResult {
        var positions: [CGPoint] = []
        var height: CGFloat = 0

        init(in width: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var x: CGFloat = 0
            var y: CGFloat = 0
            var rowHeight: CGFloat = 0

            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)
                if x + size.width > width && x > 0 {
                    x = 0
                    y += rowHeight + spacing
                    rowHeight = 0
                }
                positions.append(CGPoint(x: x, y: y))
                rowHeight = max(rowHeight, size.height)
                x += size.width + spacing
            }
            height = y + rowHeight
        }
    }
}

#Preview {
    TaskDetailView(
        task: Project(
            id: "1",
            departmentId: "dept1",
            title: "Sample Task",
            description: "This is a sample task description",
            status: .in_progress,
            priority: .high,
            createdBy: "user1",
            labels: [],
            subtasks: [],
            attachments: [],
            comments: [],
            activityLog: [],
            order: 0,
            metadata: nil
        ),
        viewModel: ProjectsViewModel()
    )
}
