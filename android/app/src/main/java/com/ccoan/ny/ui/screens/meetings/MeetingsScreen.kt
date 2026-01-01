package com.ccoan.ny.ui.screens.meetings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ccoan.ny.data.models.Meeting
import com.ccoan.ny.ui.theme.Primary
import java.util.*

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
    val displayedMonth by viewModel.displayedMonth.collectAsState()
    val calendarDays by viewModel.calendarDays.collectAsState()
    val selectedDate by viewModel.selectedDate.collectAsState()

    var showCreateMeeting by remember { mutableStateOf(false) }
    var editingMeeting by remember { mutableStateOf<Meeting?>(null) }
    var showDepartmentFilter by remember { mutableStateOf(false) }

    val daysOfWeek = listOf("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat")

    LaunchedEffect(Unit) {
        viewModel.loadData()
    }

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
            LazyColumn(
                modifier = Modifier.fillMaxSize()
            ) {
                // Calendar section
                item {
                    CalendarView(
                        displayedMonth = displayedMonth,
                        calendarDays = calendarDays,
                        selectedDate = selectedDate,
                        daysOfWeek = daysOfWeek,
                        viewModel = viewModel
                    )
                }

                // Meetings section
                if (selectedDate != null) {
                    // Show meetings for selected date
                    item {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                viewModel.formatSelectedDate(selectedDate!!),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold
                            )
                            TextButton(onClick = { viewModel.selectDate(null) }) {
                                Text("Show All")
                            }
                        }
                    }

                    val dateMeetings = viewModel.meetingsForDate(selectedDate!!)
                    if (dateMeetings.isEmpty()) {
                        item {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 40.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Icon(
                                    Icons.Default.EventBusy,
                                    contentDescription = null,
                                    modifier = Modifier.size(48.dp),
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    "No meetings on this day",
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    } else {
                        items(dateMeetings) { meeting ->
                            MeetingCard(
                                meeting = meeting,
                                isSuperUser = isSuperUser,
                                onEdit = { editingMeeting = meeting },
                                onDelete = { viewModel.deleteMeeting(meeting.id) },
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                            )
                        }
                    }
                } else {
                    // Show all meetings grouped by upcoming/past
                    val upcomingMeetings = viewModel.getUpcomingMeetings()
                    val pastMeetings = viewModel.getPastMeetings()

                    if (upcomingMeetings.isEmpty() && pastMeetings.isEmpty()) {
                        item {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 60.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
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
                    }

                    if (upcomingMeetings.isNotEmpty()) {
                        item {
                            Text(
                                "Upcoming",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                            )
                        }
                        items(upcomingMeetings) { meeting ->
                            MeetingCard(
                                meeting = meeting,
                                isSuperUser = isSuperUser,
                                onEdit = { editingMeeting = meeting },
                                onDelete = { viewModel.deleteMeeting(meeting.id) },
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                            )
                        }
                    }

                    if (pastMeetings.isNotEmpty()) {
                        item {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                "Past",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                            )
                        }
                        items(pastMeetings) { meeting ->
                            MeetingCard(
                                meeting = meeting,
                                isSuperUser = isSuperUser,
                                isPast = true,
                                onEdit = { editingMeeting = meeting },
                                onDelete = { viewModel.deleteMeeting(meeting.id) },
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
                            )
                        }
                    }
                }

                item {
                    Spacer(modifier = Modifier.height(16.dp))
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
private fun CalendarView(
    displayedMonth: Date,
    calendarDays: List<Date>,
    selectedDate: Date?,
    daysOfWeek: List<String>,
    viewModel: MeetingsViewModel
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface)
    ) {
        // Month navigation
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = { viewModel.goToPreviousMonth() }) {
                Icon(Icons.Default.ChevronLeft, contentDescription = "Previous Month")
            }

            Text(
                viewModel.getMonthYearString(),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold
            )

            IconButton(onClick = { viewModel.goToNextMonth() }) {
                Icon(Icons.Default.ChevronRight, contentDescription = "Next Month")
            }
        }

        // Today button
        Box(
            modifier = Modifier.fillMaxWidth(),
            contentAlignment = Alignment.Center
        ) {
            TextButton(onClick = { viewModel.goToCurrentMonth() }) {
                Text("Today")
            }
        }

        // Days of week header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp)
        ) {
            daysOfWeek.forEach { day ->
                Text(
                    text = day,
                    modifier = Modifier.weight(1f),
                    textAlign = TextAlign.Center,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = if (day == "Sun") Primary else MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Calendar grid
        calendarDays.chunked(7).forEach { week ->
            Row(modifier = Modifier.fillMaxWidth()) {
                week.forEach { date ->
                    CalendarDayCell(
                        date = date,
                        isCurrentMonth = viewModel.isCurrentMonth(date),
                        isToday = viewModel.isToday(date),
                        isSelected = viewModel.isSelected(date),
                        hasMeetings = viewModel.hasMeetings(date),
                        modifier = Modifier.weight(1f),
                        onTap = {
                            if (viewModel.isCurrentMonth(date)) {
                                if (viewModel.isSelected(date)) {
                                    viewModel.selectDate(null)
                                } else {
                                    viewModel.selectDate(date)
                                }
                            }
                        }
                    )
                }
            }
        }

        // Legend
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(Primary)
                )
                Text(
                    "Has meetings",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Spacer(modifier = Modifier.width(16.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF4CAF50))
                )
                Text(
                    "Today",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun CalendarDayCell(
    date: Date,
    isCurrentMonth: Boolean,
    isToday: Boolean,
    isSelected: Boolean,
    hasMeetings: Boolean,
    modifier: Modifier = Modifier,
    onTap: () -> Unit
) {
    val calendar = Calendar.getInstance()
    calendar.time = date
    val dayOfMonth = calendar.get(Calendar.DAY_OF_MONTH)

    Box(
        modifier = modifier
            .aspectRatio(1f)
            .clickable(enabled = isCurrentMonth) { onTap() },
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(contentAlignment = Alignment.Center) {
                when {
                    isToday -> {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(Color(0xFF4CAF50))
                        )
                    }
                    isSelected -> {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(Primary)
                        )
                    }
                    hasMeetings && isCurrentMonth -> {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .border(2.dp, Primary, CircleShape)
                        )
                    }
                }

                Text(
                    text = dayOfMonth.toString(),
                    fontSize = 14.sp,
                    fontWeight = if (hasMeetings) FontWeight.SemiBold else FontWeight.Normal,
                    color = when {
                        isToday || isSelected -> Color.White
                        !isCurrentMonth -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f)
                        hasMeetings -> Primary
                        else -> MaterialTheme.colorScheme.onSurface
                    }
                )
            }

            Spacer(modifier = Modifier.height(2.dp))

            if (hasMeetings && isCurrentMonth) {
                Box(
                    modifier = Modifier
                        .size(4.dp)
                        .clip(CircleShape)
                        .background(Primary.copy(alpha = 0.6f))
                )
            } else {
                Spacer(modifier = Modifier.height(4.dp))
            }
        }
    }
}

@Composable
private fun MeetingCard(
    meeting: Meeting,
    isSuperUser: Boolean,
    isPast: Boolean = false,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier
) {
    var showMenu by remember { mutableStateOf(false) }

    Surface(
        modifier = modifier.fillMaxWidth(),
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
