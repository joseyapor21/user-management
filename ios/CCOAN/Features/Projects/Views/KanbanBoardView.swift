import SwiftUI

struct KanbanBoardView: View {
    @StateObject private var viewModel = ProjectsViewModel()
    @State private var showingCreateTask = false
    @State private var selectedTask: Project?
    @State private var showingFilters = false

    let columns: [ProjectStatus] = [.backlog, .todo, .in_progress, .done]

    var body: some View {
        VStack(spacing: 0) {
            // Toolbar
            toolbarView

            // Content
            if viewModel.isLoading && viewModel.projects.isEmpty {
                LoadingView(message: "Loading tasks...")
            } else if let error = viewModel.errorMessage, viewModel.projects.isEmpty {
                ErrorView(message: error) {
                    Task { await viewModel.loadData() }
                }
            } else {
                switch viewModel.viewMode {
                case .kanban:
                    kanbanView
                case .list:
                    listView
                case .calendar:
                    calendarPlaceholder
                }
            }
        }
        .sheet(isPresented: $showingCreateTask) {
            CreateTaskView(viewModel: viewModel)
        }
        .sheet(item: $selectedTask) { task in
            TaskDetailView(task: task, viewModel: viewModel)
        }
        .task {
            await viewModel.loadData()
        }
        .refreshable {
            await viewModel.loadData()
        }
    }

    private var toolbarView: some View {
        VStack(spacing: 12) {
            // View mode picker and filters
            HStack {
                Picker("View", selection: $viewModel.viewMode) {
                    ForEach(ProjectsViewModel.ViewMode.allCases, id: \.self) { mode in
                        Text(mode.rawValue).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
                .frame(maxWidth: 200)

                Spacer()

                Button {
                    showingFilters.toggle()
                } label: {
                    Image(systemName: "line.3.horizontal.decrease.circle")
                        .foregroundColor(hasActiveFilters ? .blue : .gray)
                }

                Button {
                    showingCreateTask = true
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                        .foregroundColor(.blue)
                }
            }
            .padding(.horizontal)

            // Search bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(.gray)
                TextField("Search tasks...", text: $viewModel.searchQuery)
            }
            .padding(10)
            .background(Color(.systemGray6))
            .cornerRadius(10)
            .padding(.horizontal)

            // Filters (collapsible)
            if showingFilters {
                filtersView
            }

            // Stats
            statsView
        }
        .padding(.vertical, 8)
        .background(Color(.systemBackground))
    }

    private var hasActiveFilters: Bool {
        viewModel.selectedDepartmentId != nil ||
        viewModel.selectedPriority != nil ||
        viewModel.showMyTasksOnly
    }

    private var filtersView: some View {
        VStack(spacing: 12) {
            // Department filter
            HStack {
                Text("Department:")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Picker("Department", selection: $viewModel.selectedDepartmentId) {
                    Text("All").tag(nil as String?)
                    ForEach(viewModel.departments) { dept in
                        Text(dept.name).tag(dept.id as String?)
                    }
                }
                .pickerStyle(.menu)
            }

            // Priority filter
            HStack {
                Text("Priority:")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                Picker("Priority", selection: $viewModel.selectedPriority) {
                    Text("All").tag(nil as Priority?)
                    ForEach(Priority.allCases, id: \.self) { priority in
                        Text(priority.displayName).tag(priority as Priority?)
                    }
                }
                .pickerStyle(.menu)
            }
        }
        .padding(.horizontal)
    }

    private var statsView: some View {
        let stats = viewModel.taskStats
        return HStack(spacing: 16) {
            StatBadge(label: "Total", value: stats.total, color: .blue)
            StatBadge(label: "Done", value: stats.completed, color: .green)
            StatBadge(label: "Overdue", value: stats.overdue, color: .red)
        }
        .padding(.horizontal)
    }

    private var kanbanView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(alignment: .top, spacing: 12) {
                ForEach(columns, id: \.self) { status in
                    KanbanColumnView(
                        status: status,
                        projects: viewModel.projectsForStatus(status),
                        onTaskTap: { task in selectedTask = task },
                        onMoveTask: { taskId, newStatus in
                            Task {
                                await viewModel.moveProject(projectId: taskId, to: newStatus)
                            }
                        }
                    )
                }
            }
            .padding()
        }
    }

    private var listView: some View {
        List {
            ForEach(columns, id: \.self) { status in
                Section(header: Text(status.displayName)) {
                    ForEach(viewModel.projectsForStatus(status)) { project in
                        TaskRowView(task: project)
                            .onTapGesture {
                                selectedTask = project
                            }
                            .swipeActions(edge: .trailing) {
                                if status != .done {
                                    Button {
                                        Task {
                                            await viewModel.moveProject(
                                                projectId: project.id,
                                                to: status == .backlog ? .todo :
                                                    status == .todo ? .in_progress : .done
                                            )
                                        }
                                    } label: {
                                        Label("Next", systemImage: "arrow.right")
                                    }
                                    .tint(.blue)
                                }
                            }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
    }

    private var calendarPlaceholder: some View {
        VStack {
            Image(systemName: "calendar")
                .font(.system(size: 48))
                .foregroundColor(.gray)
            Text("Calendar View")
                .font(.title2)
            Text("Coming soon...")
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct StatBadge: View {
    let label: String
    let value: Int
    let color: Color

    var body: some View {
        VStack(spacing: 2) {
            Text("\(value)")
                .font(.headline)
                .foregroundColor(color)
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(color.opacity(0.1))
        .cornerRadius(8)
    }
}

#Preview {
    NavigationStack {
        KanbanBoardView()
    }
}
