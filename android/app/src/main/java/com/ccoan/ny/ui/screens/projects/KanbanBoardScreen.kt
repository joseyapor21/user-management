package com.ccoan.ny.ui.screens.projects

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ccoan.ny.data.models.*
import com.ccoan.ny.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KanbanBoardScreen(
    isSuperUser: Boolean = false,
    initialTaskId: String? = null,
    viewModel: ProjectsViewModel = hiltViewModel()
) {
    val isLoading by viewModel.isLoading.collectAsState()
    val projects by viewModel.filteredProjects.collectAsState()
    val departments by viewModel.departments.collectAsState()
    val viewMode by viewModel.viewMode.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()

    var showCreateTask by remember { mutableStateOf(false) }
    var selectedTask by remember { mutableStateOf<Project?>(null) }
    var showFilters by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.loadData()
    }

    // Handle initial task ID from notification
    LaunchedEffect(initialTaskId, projects) {
        if (initialTaskId != null && projects.isNotEmpty()) {
            val task = projects.find { it.id == initialTaskId }
            if (task != null && selectedTask == null) {
                selectedTask = task
            }
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        // Toolbar
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.surface)
                .padding(16.dp)
        ) {
            // View mode and actions
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // View mode selector
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    ViewMode.entries.forEach { mode ->
                        FilterChip(
                            selected = viewMode == mode,
                            onClick = { viewModel.setViewMode(mode) },
                            label = { Text(mode.name.lowercase().replaceFirstChar { it.uppercase() }) }
                        )
                    }
                }

                Row {
                    IconButton(onClick = { showFilters = !showFilters }) {
                        Icon(Icons.Default.FilterList, contentDescription = "Filters")
                    }
                    if (isSuperUser) {
                        IconButton(onClick = { showCreateTask = true }) {
                            Icon(Icons.Default.Add, contentDescription = "Add Task", tint = Primary)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Search bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { viewModel.setSearchQuery(it) },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Search tasks...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )

            // Stats
            Spacer(modifier = Modifier.height(8.dp))
            val total = projects.size
            val done = projects.count { it.status == ProjectStatus.DONE }
            val overdue = projects.count { project ->
                project.dueDate != null && project.status != ProjectStatus.DONE
                // Simplified overdue check
            }

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                StatChip("Total", total, Primary)
                StatChip("Done", done, StatusDone)
                StatChip("Overdue", overdue, PriorityUrgent)
            }
        }

        // Content
        if (isLoading && projects.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else {
            when (viewMode) {
                ViewMode.KANBAN -> KanbanView(
                    viewModel = viewModel,
                    onTaskClick = { selectedTask = it }
                )
                ViewMode.LIST -> ListView(
                    viewModel = viewModel,
                    onTaskClick = { selectedTask = it }
                )
                ViewMode.CALENDAR -> CalendarPlaceholder()
            }
        }
    }

    // Create task bottom sheet
    if (showCreateTask) {
        CreateTaskBottomSheet(
            departments = departments,
            onDismiss = { showCreateTask = false },
            onCreate = { request ->
                viewModel.createProject(request) {
                    showCreateTask = false
                }
            }
        )
    }

    // Task detail bottom sheet
    selectedTask?.let { task ->
        TaskDetailBottomSheet(
            task = task,
            onDismiss = { selectedTask = null },
            onStatusChange = { newStatus ->
                viewModel.moveProject(task.id, newStatus)
            },
            onAddComment = { text ->
                viewModel.addComment(task.id, text)
            }
        )
    }
}

@Composable
private fun StatChip(label: String, value: Int, color: Color) {
    Surface(
        color = color.copy(alpha = 0.1f),
        shape = RoundedCornerShape(8.dp)
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "$value",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = color
            )
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun KanbanView(
    viewModel: ProjectsViewModel,
    onTaskClick: (Project) -> Unit
) {
    val columns = listOf(
        ProjectStatus.BACKLOG,
        ProjectStatus.TODO,
        ProjectStatus.IN_PROGRESS,
        ProjectStatus.DONE
    )

    Row(
        modifier = Modifier
            .fillMaxSize()
            .horizontalScroll(rememberScrollState())
            .padding(16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        columns.forEach { status ->
            KanbanColumn(
                status = status,
                projects = viewModel.projectsForStatus(status),
                onTaskClick = onTaskClick,
                onMoveTask = { taskId, newStatus ->
                    viewModel.moveProject(taskId, newStatus)
                }
            )
        }
    }
}

@Composable
private fun KanbanColumn(
    status: ProjectStatus,
    projects: List<Project>,
    onTaskClick: (Project) -> Unit,
    onMoveTask: (String, ProjectStatus) -> Unit
) {
    val statusColor = when (status) {
        ProjectStatus.BACKLOG -> StatusBacklog
        ProjectStatus.TODO -> StatusTodo
        ProjectStatus.IN_PROGRESS -> StatusInProgress
        ProjectStatus.DONE -> StatusDone
        ProjectStatus.ARCHIVED -> Color.Gray
    }

    Surface(
        modifier = Modifier
            .width(280.dp)
            .fillMaxHeight(),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column {
            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surfaceVariant)
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .clip(CircleShape)
                        .background(statusColor)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = status.displayName,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.weight(1f))
                Surface(
                    color = MaterialTheme.colorScheme.surface,
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text(
                        text = "${projects.size}",
                        style = MaterialTheme.typography.labelMedium,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                    )
                }
            }

            // Tasks
            LazyColumn(
                modifier = Modifier.padding(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(projects) { project ->
                    TaskCard(
                        task = project,
                        onClick = { onTaskClick(project) }
                    )
                }
            }
        }
    }
}

@Composable
private fun TaskCard(
    task: Project,
    onClick: () -> Unit
) {
    val priorityColor = when (task.priority) {
        Priority.LOW -> PriorityLow
        Priority.MEDIUM -> PriorityMedium
        Priority.HIGH -> PriorityHigh
        Priority.URGENT -> PriorityUrgent
    }

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        color = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(10.dp),
        shadowElevation = 1.dp
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                text = task.title,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Labels
            if (task.labels.isNotEmpty()) {
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    task.labels.take(3).forEach { label ->
                        val labelColor = when (label.color) {
                            LabelColor.RED -> LabelRed
                            LabelColor.ORANGE -> LabelOrange
                            LabelColor.YELLOW -> LabelYellow
                            LabelColor.GREEN -> LabelGreen
                            LabelColor.BLUE -> LabelBlue
                            LabelColor.PURPLE -> LabelPurple
                            LabelColor.PINK -> LabelPink
                            LabelColor.GRAY -> LabelGray
                        }
                        Surface(
                            color = labelColor.copy(alpha = 0.2f),
                            shape = RoundedCornerShape(4.dp)
                        ) {
                            Text(
                                text = label.name,
                                style = MaterialTheme.typography.labelSmall,
                                color = labelColor,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
            }

            // Priority and due date
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Surface(
                    color = priorityColor.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(4.dp)
                ) {
                    Text(
                        text = task.priority.displayName,
                        style = MaterialTheme.typography.labelSmall,
                        color = priorityColor,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }

                task.dueDate?.let { dueDate ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.CalendarToday,
                            contentDescription = null,
                            modifier = Modifier.size(12.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = dueDate,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }

            // Subtasks progress
            if (task.subtasks.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                val completed = task.subtasks.count { it.completed }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    LinearProgressIndicator(
                        progress = { completed.toFloat() / task.subtasks.size },
                        modifier = Modifier
                            .weight(1f)
                            .height(4.dp)
                            .clip(RoundedCornerShape(2.dp)),
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "$completed/${task.subtasks.size}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Assignee and comments
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                task.assigneeName?.let { name ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(20.dp)
                                .clip(CircleShape)
                                .background(Primary.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = name.first().uppercase(),
                                style = MaterialTheme.typography.labelSmall,
                                color = Primary
                            )
                        }
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = name,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                if (task.comments.isNotEmpty()) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.ChatBubbleOutline,
                            contentDescription = null,
                            modifier = Modifier.size(12.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.width(2.dp))
                        Text(
                            text = "${task.comments.size}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ListView(
    viewModel: ProjectsViewModel,
    onTaskClick: (Project) -> Unit
) {
    val projects by viewModel.filteredProjects.collectAsState()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        ProjectStatus.entries.filter { it != ProjectStatus.ARCHIVED }.forEach { status ->
            val statusProjects = projects.filter { it.status == status }
            if (statusProjects.isNotEmpty()) {
                item {
                    Text(
                        text = status.displayName,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(vertical = 8.dp)
                    )
                }
                items(statusProjects) { project ->
                    TaskCard(task = project, onClick = { onTaskClick(project) })
                }
            }
        }
    }
}

@Composable
private fun CalendarPlaceholder() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                Icons.Default.CalendarMonth,
                contentDescription = null,
                modifier = Modifier.size(48.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text("Calendar View", style = MaterialTheme.typography.titleMedium)
            Text(
                "Coming soon...",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
