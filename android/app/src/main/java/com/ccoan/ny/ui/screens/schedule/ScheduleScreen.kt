package com.ccoan.ny.ui.screens.schedule

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ccoan.ny.data.models.ScheduleDefaults
import com.ccoan.ny.ui.theme.Primary
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScheduleScreen(
    viewModel: ScheduleViewModel = hiltViewModel()
) {
    val schedule by viewModel.schedule.collectAsState()
    val canEdit by viewModel.canEdit.collectAsState()
    val scheduleAdminName by viewModel.scheduleAdminName.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val displayedMonth by viewModel.displayedMonth.collectAsState()
    val calendarDays by viewModel.calendarDays.collectAsState()

    var selectedSunday by remember { mutableStateOf<Date?>(null) }
    var editingCell by remember { mutableStateOf<Pair<String, String>?>(null) }
    var editText by remember { mutableStateOf("") }

    val calendar = Calendar.getInstance()
    val daysOfWeek = listOf("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat")

    Column(modifier = Modifier.fillMaxSize()) {
        // Month navigation header
        Surface(
            color = MaterialTheme.colorScheme.surface,
            shadowElevation = 2.dp
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = { viewModel.goToPreviousMonth() }) {
                        Icon(Icons.Default.ChevronLeft, contentDescription = "Previous Month")
                    }

                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            viewModel.getMonthYearString(),
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.SemiBold
                        )
                        TextButton(onClick = { viewModel.goToCurrentMonth() }) {
                            Text("Today")
                        }
                    }

                    IconButton(onClick = { viewModel.goToNextMonth() }) {
                        Icon(Icons.Default.ChevronRight, contentDescription = "Next Month")
                    }
                }
            }
        }

        // Days of week header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.surfaceVariant)
        ) {
            daysOfWeek.forEach { day ->
                Text(
                    text = day,
                    modifier = Modifier
                        .weight(1f)
                        .padding(vertical = 8.dp),
                    textAlign = TextAlign.Center,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = if (day == "Sun") Primary else MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        // Calendar grid
        Column(modifier = Modifier.weight(1f)) {
            calendarDays.chunked(7).forEach { week ->
                Row(modifier = Modifier.fillMaxWidth()) {
                    week.forEach { date ->
                        CalendarDayCell(
                            date = date,
                            displayedMonth = displayedMonth,
                            isSelected = selectedSunday?.let {
                                isSameDay(it, date)
                            } ?: false,
                            modifier = Modifier.weight(1f),
                            onTap = {
                                calendar.time = date
                                if (calendar.get(Calendar.DAY_OF_WEEK) == Calendar.SUNDAY) {
                                    viewModel.selectDate(date)
                                    viewModel.loadSchedule()
                                    selectedSunday = date
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
                        "Sunday (tap to view)",
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

    // Schedule Detail Bottom Sheet
    selectedSunday?.let { date ->
        ScheduleDetailBottomSheet(
            date = date,
            schedule = schedule,
            canEdit = canEdit,
            scheduleAdminName = scheduleAdminName,
            isLoading = isLoading,
            viewModel = viewModel,
            onDismiss = { selectedSunday = null },
            onEditCell = { phase, department ->
                editText = viewModel.getAssignees(phase, department)
                editingCell = phase to department
            }
        )
    }

    // Edit cell dialog
    editingCell?.let { (phase, department) ->
        AlertDialog(
            onDismissRequest = { editingCell = null },
            title = { Text("Edit Assignment") },
            text = {
                Column {
                    Text("Phase: $phase", style = MaterialTheme.typography.labelMedium)
                    Text("Department: $department", style = MaterialTheme.typography.labelMedium)
                    Spacer(modifier = Modifier.height(16.dp))
                    OutlinedTextField(
                        value = editText,
                        onValueChange = { editText = it },
                        label = { Text("Assigned Members") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 3,
                        shape = RoundedCornerShape(12.dp)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Enter names separated by commas or new lines",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        viewModel.updateSlot(phase, department, editText)
                        editingCell = null
                    }
                ) {
                    Text("Save")
                }
            },
            dismissButton = {
                TextButton(onClick = { editingCell = null }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
private fun CalendarDayCell(
    date: Date,
    displayedMonth: Date,
    isSelected: Boolean,
    modifier: Modifier = Modifier,
    onTap: () -> Unit
) {
    val calendar = Calendar.getInstance()
    calendar.time = date

    val dayOfMonth = calendar.get(Calendar.DAY_OF_MONTH)
    val isSunday = calendar.get(Calendar.DAY_OF_WEEK) == Calendar.SUNDAY

    val displayCalendar = Calendar.getInstance()
    displayCalendar.time = displayedMonth
    val isCurrentMonth = calendar.get(Calendar.MONTH) == displayCalendar.get(Calendar.MONTH) &&
            calendar.get(Calendar.YEAR) == displayCalendar.get(Calendar.YEAR)

    val todayCalendar = Calendar.getInstance()
    val isToday = calendar.get(Calendar.DAY_OF_YEAR) == todayCalendar.get(Calendar.DAY_OF_YEAR) &&
            calendar.get(Calendar.YEAR) == todayCalendar.get(Calendar.YEAR)

    Box(
        modifier = modifier
            .aspectRatio(1f)
            .clickable(enabled = isSunday && isCurrentMonth) { onTap() }
            .background(
                when {
                    isSunday && isCurrentMonth && !isToday && !isSelected -> Primary.copy(alpha = 0.05f)
                    else -> Color.Transparent
                }
            ),
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
                    isSunday && isCurrentMonth -> {
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
                    fontWeight = if (isSunday) FontWeight.SemiBold else FontWeight.Normal,
                    color = when {
                        isToday || isSelected -> Color.White
                        !isCurrentMonth -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f)
                        isSunday -> Primary
                        else -> MaterialTheme.colorScheme.onSurface
                    }
                )
            }

            Spacer(modifier = Modifier.height(2.dp))

            if (isSunday && isCurrentMonth) {
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ScheduleDetailBottomSheet(
    date: Date,
    schedule: com.ccoan.ny.data.models.SundaySchedule?,
    canEdit: Boolean,
    scheduleAdminName: String?,
    isLoading: Boolean,
    viewModel: ScheduleViewModel,
    onDismiss: () -> Unit,
    onEditCell: (String, String) -> Unit
) {
    val dateFormatter = SimpleDateFormat("EEEE, MMMM d, yyyy", Locale.US)
    val phases = ScheduleDefaults.DEFAULT_PHASES
    val departments = ScheduleDefaults.DEFAULT_DEPARTMENTS

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.85f)
        ) {
            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    dateFormatter.format(date),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                TextButton(onClick = onDismiss) {
                    Text("Done")
                }
            }

            // Admin info
            scheduleAdminName?.let { name ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.AdminPanelSettings,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = Primary
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        "Schedule Admin: $name",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            if (isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            } else {
                // Schedule grid
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .horizontalScroll(rememberScrollState())
                        .verticalScroll(rememberScrollState())
                ) {
                    // Phase column (sticky)
                    Column {
                        // Header cell
                        Box(
                            modifier = Modifier
                                .width(120.dp)
                                .height(50.dp)
                                .background(MaterialTheme.colorScheme.surfaceVariant)
                                .border(0.5.dp, MaterialTheme.colorScheme.outline),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                "Phase",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.SemiBold
                            )
                        }

                        // Phase rows
                        phases.forEach { phase ->
                            Box(
                                modifier = Modifier
                                    .width(120.dp)
                                    .height(60.dp)
                                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
                                    .border(0.5.dp, MaterialTheme.colorScheme.outline),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    phase,
                                    style = MaterialTheme.typography.labelSmall,
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier.padding(4.dp),
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                    }

                    // Department columns
                    departments.forEach { department ->
                        Column {
                            // Header
                            Box(
                                modifier = Modifier
                                    .width(100.dp)
                                    .height(50.dp)
                                    .background(MaterialTheme.colorScheme.surfaceVariant)
                                    .border(0.5.dp, MaterialTheme.colorScheme.outline),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    department,
                                    style = MaterialTheme.typography.labelSmall,
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier.padding(4.dp),
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis,
                                    fontWeight = FontWeight.Medium
                                )
                            }

                            // Cells for each phase
                            phases.forEach { phase ->
                                val assignees = viewModel.getAssignees(phase, department)
                                Box(
                                    modifier = Modifier
                                        .width(100.dp)
                                        .height(60.dp)
                                        .background(MaterialTheme.colorScheme.surface)
                                        .border(0.5.dp, MaterialTheme.colorScheme.outline)
                                        .clickable(enabled = canEdit) {
                                            onEditCell(phase, department)
                                        },
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = assignees.ifEmpty { if (canEdit) "+" else "-" },
                                        style = MaterialTheme.typography.labelSmall,
                                        textAlign = TextAlign.Center,
                                        modifier = Modifier.padding(4.dp),
                                        color = if (assignees.isEmpty())
                                            MaterialTheme.colorScheme.onSurfaceVariant
                                        else
                                            MaterialTheme.colorScheme.onSurface,
                                        maxLines = 3,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun isSameDay(date1: Date, date2: Date): Boolean {
    val cal1 = Calendar.getInstance().apply { time = date1 }
    val cal2 = Calendar.getInstance().apply { time = date2 }
    return cal1.get(Calendar.YEAR) == cal2.get(Calendar.YEAR) &&
            cal1.get(Calendar.DAY_OF_YEAR) == cal2.get(Calendar.DAY_OF_YEAR)
}
