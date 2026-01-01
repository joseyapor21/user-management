package com.ccoan.ny.ui.screens.meetings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ccoan.ny.data.models.Meeting
import com.ccoan.ny.ui.theme.Primary
import java.util.*

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterialApi::class)
@Composable
fun MeetingsScreen(
    isSuperUser: Boolean,
    viewModel: MeetingsViewModel = hiltViewModel()
) {
    val meetings by viewModel.meetings.collectAsState()
    val departments by viewModel.departments.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val selectedDepartmentId by viewModel.selectedDepartmentId.collectAsState()
    val weekDays by viewModel.weekDays.collectAsState()

    var showCreateMeeting by remember { mutableStateOf(false) }
    var editingMeeting by remember { mutableStateOf<Meeting?>(null) }
    var showDepartmentFilter by remember { mutableStateOf(false) }

    val pullRefreshState = rememberPullRefreshState(
        refreshing = isLoading,
        onRefresh = { viewModel.loadData() }
    )

    LaunchedEffect(Unit) {
        viewModel.loadData()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .pullRefresh(pullRefreshState)
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
        // Header with filter and create button
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
        } else {
            // Week navigation header
            Surface(
                color = MaterialTheme.colorScheme.surface,
                shadowElevation = 2.dp
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(onClick = { viewModel.goToPreviousWeek() }) {
                            Icon(Icons.Default.ChevronLeft, contentDescription = "Previous Week")
                        }

                        Text(
                            viewModel.getWeekRangeString(),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )

                        IconButton(onClick = { viewModel.goToNextWeek() }) {
                            Icon(Icons.Default.ChevronRight, contentDescription = "Next Week")
                        }
                    }

                    Box(
                        modifier = Modifier.fillMaxWidth(),
                        contentAlignment = Alignment.Center
                    ) {
                        TextButton(onClick = { viewModel.goToCurrentWeek() }) {
                            Text("Today")
                        }
                    }
                }
            }

            // Weekly view with meetings
            LazyColumn(
                modifier = Modifier.fillMaxSize()
            ) {
                items(weekDays) { date ->
                    WeekDayRow(
                        date = date,
                        meetings = viewModel.meetingsForDate(date),
                        isToday = viewModel.isToday(date),
                        isSuperUser = isSuperUser,
                        viewModel = viewModel,
                        onEdit = { editingMeeting = it },
                        onDelete = { viewModel.deleteMeeting(it) }
                    )
                }

                item {
                    Spacer(modifier = Modifier.height(16.dp))
                }
            }
        }
        }

        PullRefreshIndicator(
            refreshing = isLoading,
            state = pullRefreshState,
            modifier = Modifier.align(Alignment.TopCenter)
        )
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
private fun WeekDayRow(
    date: Date,
    meetings: List<Meeting>,
    isToday: Boolean,
    isSuperUser: Boolean,
    viewModel: MeetingsViewModel,
    onEdit: (Meeting) -> Unit,
    onDelete: (String) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface)
    ) {
        // Day header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Day badge
            Surface(
                color = if (isToday) Color(0xFF4CAF50) else Color.Transparent,
                shape = RoundedCornerShape(8.dp)
            ) {
                Column(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        viewModel.formatDayHeader(date),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Medium,
                        color = if (isToday) Color.White else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        viewModel.formatDayNumber(date),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = if (isToday) Color.White else MaterialTheme.colorScheme.onSurface
                    )
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            if (meetings.isEmpty()) {
                Text(
                    "No meetings",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        // Meetings for this day
        if (meetings.isNotEmpty()) {
            Column(
                modifier = Modifier.padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                meetings.forEach { meeting ->
                    MeetingItemCard(
                        meeting = meeting,
                        isSuperUser = isSuperUser,
                        onEdit = { onEdit(meeting) },
                        onDelete = { onDelete(meeting.id) }
                    )
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
        }

        HorizontalDivider(modifier = Modifier.padding(start = 16.dp))
    }
}

@Composable
private fun MeetingItemCard(
    meeting: Meeting,
    isSuperUser: Boolean,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    var showMenu by remember { mutableStateOf(false) }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        shape = RoundedCornerShape(10.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.Top
        ) {
            // Time column
            Column(
                horizontalAlignment = Alignment.End,
                modifier = Modifier.width(60.dp)
            ) {
                Text(
                    formatTime(meeting.startTime),
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    formatTime(meeting.endTime),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Meeting details
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    meeting.title,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                meeting.departmentName?.let { deptName ->
                    Spacer(modifier = Modifier.height(4.dp))
                    Surface(
                        color = Primary.copy(alpha = 0.1f),
                        shape = RoundedCornerShape(4.dp)
                    ) {
                        Text(
                            deptName,
                            style = MaterialTheme.typography.labelSmall,
                            color = Primary,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }

                if (meeting.location.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.LocationOn,
                            contentDescription = null,
                            modifier = Modifier.size(12.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Spacer(modifier = Modifier.width(2.dp))
                        Text(
                            meeting.location,
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }

            if (isSuperUser) {
                Box {
                    IconButton(
                        onClick = { showMenu = true },
                        modifier = Modifier.size(24.dp)
                    ) {
                        Icon(
                            Icons.Default.MoreVert,
                            contentDescription = "More options",
                            modifier = Modifier.size(16.dp),
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
    }
}

private fun formatTime(time: String): String {
    val parts = time.split(":")
    if (parts.size < 2) return time

    val hour = parts[0].toIntOrNull() ?: return time
    val minute = parts[1]
    val ampm = if (hour >= 12) "PM" else "AM"
    val hour12 = if (hour % 12 == 0) 12 else hour % 12

    return "$hour12:$minute $ampm"
}
