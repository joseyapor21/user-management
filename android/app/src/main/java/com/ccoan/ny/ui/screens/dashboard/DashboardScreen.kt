package com.ccoan.ny.ui.screens.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ccoan.ny.ui.screens.departments.DepartmentsScreen
import com.ccoan.ny.ui.screens.meetings.MeetingsScreen
import com.ccoan.ny.ui.screens.projects.KanbanBoardScreen
import com.ccoan.ny.ui.screens.schedule.ScheduleScreen
import com.ccoan.ny.ui.theme.Primary

enum class DashboardTab(val title: String, val icon: ImageVector) {
    PROJECTS("Projects", Icons.Default.ViewList),
    MEETINGS("Meetings", Icons.Default.Event),
    SCHEDULE("Schedule", Icons.Default.CalendarMonth),
    DEPARTMENTS("Departments", Icons.Default.Business)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    isSuperUser: Boolean,
    initialTab: String? = null,
    initialTaskId: String? = null,
    onLogout: () -> Unit
) {
    var selectedTab by remember {
        mutableStateOf(
            when (initialTab) {
                "projects" -> DashboardTab.PROJECTS
                "meetings" -> DashboardTab.MEETINGS
                "schedule" -> DashboardTab.SCHEDULE
                "departments" -> DashboardTab.DEPARTMENTS
                else -> DashboardTab.PROJECTS
            }
        )
    }
    var showProfileMenu by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .background(Primary, RoundedCornerShape(6.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "C",
                                color = Color.White,
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Text(
                            text = "CCOAN NY",
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                },
                actions = {
                    Box {
                        IconButton(onClick = { showProfileMenu = true }) {
                            Icon(
                                imageVector = Icons.Default.AccountCircle,
                                contentDescription = "Profile",
                                tint = Primary,
                                modifier = Modifier.size(28.dp)
                            )
                        }
                        DropdownMenu(
                            expanded = showProfileMenu,
                            onDismissRequest = { showProfileMenu = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("Edit Profile") },
                                onClick = {
                                    showProfileMenu = false
                                    // TODO: Navigate to profile edit
                                },
                                leadingIcon = {
                                    Icon(Icons.Default.Person, contentDescription = null)
                                }
                            )
                            HorizontalDivider()
                            DropdownMenuItem(
                                text = { Text("Sign Out", color = MaterialTheme.colorScheme.error) },
                                onClick = {
                                    showProfileMenu = false
                                    onLogout()
                                },
                                leadingIcon = {
                                    Icon(
                                        Icons.Default.Logout,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.error
                                    )
                                }
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        bottomBar = {
            NavigationBar {
                DashboardTab.entries.forEach { tab ->
                    NavigationBarItem(
                        icon = { Icon(tab.icon, contentDescription = tab.title) },
                        label = { Text(tab.title) },
                        selected = selectedTab == tab,
                        onClick = { selectedTab = tab }
                    )
                }
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(MaterialTheme.colorScheme.background)
        ) {
            when (selectedTab) {
                DashboardTab.PROJECTS -> KanbanBoardScreen(
                    isSuperUser = isSuperUser,
                    initialTaskId = initialTaskId
                )
                DashboardTab.MEETINGS -> MeetingsScreen(isSuperUser = isSuperUser)
                DashboardTab.SCHEDULE -> ScheduleScreen()
                DashboardTab.DEPARTMENTS -> DepartmentsScreen(isSuperUser = isSuperUser)
            }
        }
    }
}
