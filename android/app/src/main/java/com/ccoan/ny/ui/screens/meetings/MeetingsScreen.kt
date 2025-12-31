package com.ccoan.ny.ui.screens.meetings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ccoan.ny.data.models.Meeting
import com.ccoan.ny.ui.theme.Primary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MeetingsScreen(
    isSuperUser: Boolean,
    viewModel: MeetingsViewModel = hiltViewModel()
) {
    val meetings by viewModel.meetings.collectAsState()
    val departments by viewModel.departments.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val selectedDepartmentId by viewModel.selectedDepartmentId.collectAsState()

    var showCreateMeeting by remember { mutableStateOf(false) }
    var editingMeeting by remember { mutableStateOf<Meeting?>(null) }
    var showDepartmentFilter by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        viewModel.loadData()
    }

    val upcomingMeetings = meetings.filter { it.isUpcoming }
        .filter { selectedDepartmentId == null || it.departmentId == selectedDepartmentId }
        .sortedBy { it.date }

    val pastMeetings = meetings.filter { !it.isUpcoming }
        .filter { selectedDepartmentId == null || it.departmentId == selectedDepartmentId }
        .sortedByDescending { it.date }

    Column(modifier = Modifier.fillMaxSize()) {
        // Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.surface)
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Department filter
            ExposedDropdownMenuBox(
                expanded = showDepartmentFilter,
                onExpandedChange = { showDepartmentFilter = it }
            ) {
                FilterChip(
                    selected = selectedDepartmentId != null,
                    onClick = { showDepartmentFilter = true },
                    label = {
                        Text(
                            departments.find { it.id == selectedDepartmentId }?.name
                                ?: "All Departments"
                        )
                    },
                    trailingIcon = {
                        Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                    },
                    modifier = Modifier.menuAnchor()
                )
                ExposedDropdownMenu(
                    expanded = showDepartmentFilter,
                    onDismissRequest = { showDepartmentFilter = false }
                ) {
                    DropdownMenuItem(
                        text = { Text("All Departments") },
                        onClick = {
                            viewModel.setDepartmentFilter(null)
                            showDepartmentFilter = false
                        }
                    )
                    departments.forEach { dept ->
                        DropdownMenuItem(
                            text = { Text(dept.name) },
                            onClick = {
                                viewModel.setDepartmentFilter(dept.id)
                                showDepartmentFilter = false
                            }
                        )
                    }
                }
            }

            if (isSuperUser) {
                Button(onClick = { showCreateMeeting = true }) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Schedule")
                }
            }
        }

        if (isLoading && meetings.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else if (upcomingMeetings.isEmpty() && pastMeetings.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.EventBusy,
                        contentDescription = null,
                        modifier = Modifier.size(48.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("No Meetings", style = MaterialTheme.typography.titleMedium)
                    Text(
                        if (isSuperUser) "Schedule a meeting to get started"
                        else "No meetings scheduled",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (upcomingMeetings.isNotEmpty()) {
                    item {
                        Text(
                            "Upcoming",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                    items(upcomingMeetings) { meeting ->
                        MeetingCard(
                            meeting = meeting,
                            isSuperUser = isSuperUser,
                            onEdit = { editingMeeting = meeting },
                            onDelete = { viewModel.deleteMeeting(meeting.id) }
                        )
                    }
                }

                if (pastMeetings.isNotEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "Past",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                    items(pastMeetings) { meeting ->
                        MeetingCard(
                            meeting = meeting,
                            isSuperUser = isSuperUser,
                            isPast = true,
                            onEdit = { editingMeeting = meeting },
                            onDelete = { viewModel.deleteMeeting(meeting.id) }
                        )
                    }
                }
            }
        }
    }

    if (showCreateMeeting) {
        CreateMeetingBottomSheet(
            departments = departments,
            onDismiss = { showCreateMeeting = false },
            onCreate = { request ->
                viewModel.createMeeting(request) {
                    showCreateMeeting = false
                }
            }
        )
    }

    editingMeeting?.let { meeting ->
        EditMeetingBottomSheet(
            meeting = meeting,
            departments = departments,
            onDismiss = { editingMeeting = null },
            onUpdate = { request ->
                viewModel.updateMeeting(request) {
                    editingMeeting = null
                }
            }
        )
    }
}

@Composable
private fun MeetingCard(
    meeting: Meeting,
    isSuperUser: Boolean,
    isPast: Boolean = false,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    var showMenu by remember { mutableStateOf(false) }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(12.dp),
        shadowElevation = 1.dp,
        tonalElevation = if (isPast) 0.dp else 1.dp
    ) {
        Column(
            modifier = Modifier
                .padding(16.dp)
                .then(if (isPast) Modifier.fillMaxWidth() else Modifier)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = meeting.title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.weight(1f),
                    color = if (isPast)
                        MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    else
                        MaterialTheme.colorScheme.onSurface
                )

                if (isSuperUser) {
                    Box {
                        IconButton(onClick = { showMenu = true }) {
                            Icon(
                                Icons.Default.MoreVert,
                                contentDescription = "More options",
                                tint = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        DropdownMenu(
                            expanded = showMenu,
                            onDismissRequest = { showMenu = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("Edit") },
                                onClick = {
                                    showMenu = false
                                    onEdit()
                                },
                                leadingIcon = { Icon(Icons.Default.Edit, null) }
                            )
                            DropdownMenuItem(
                                text = { Text("Delete", color = MaterialTheme.colorScheme.error) },
                                onClick = {
                                    showMenu = false
                                    onDelete()
                                },
                                leadingIcon = {
                                    Icon(
                                        Icons.Default.Delete,
                                        null,
                                        tint = MaterialTheme.colorScheme.error
                                    )
                                }
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Date and time
            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.CalendarToday,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = meeting.formattedDate,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.Schedule,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = meeting.formattedTimeRange,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Department badge
            meeting.departmentName?.let { deptName ->
                Surface(
                    color = Primary.copy(alpha = 0.1f),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text(
                        text = deptName,
                        style = MaterialTheme.typography.labelSmall,
                        color = Primary,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }
            }

            // Location
            if (meeting.location.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = meeting.location,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Description
            if (meeting.description.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = meeting.description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2
                )
            }

            // Creator
            meeting.creatorName?.let { name ->
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Scheduled by $name",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
