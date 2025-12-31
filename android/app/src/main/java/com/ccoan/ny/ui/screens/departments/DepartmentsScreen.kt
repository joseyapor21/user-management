package com.ccoan.ny.ui.screens.departments

import androidx.compose.foundation.background
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.ccoan.ny.data.models.Department
import com.ccoan.ny.data.models.User
import com.ccoan.ny.ui.theme.Primary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DepartmentsScreen(
    isSuperUser: Boolean,
    viewModel: DepartmentsViewModel = hiltViewModel()
) {
    val departments by viewModel.departments.collectAsState()
    val users by viewModel.users.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    var showCreateDialog by remember { mutableStateOf(false) }
    var editingDepartment by remember { mutableStateOf<Department?>(null) }
    var managingDepartment by remember { mutableStateOf<Department?>(null) }

    LaunchedEffect(Unit) {
        viewModel.loadData()
    }

    Column(modifier = Modifier.fillMaxSize()) {
        // Header
        if (isSuperUser) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(16.dp),
                horizontalArrangement = Arrangement.End
            ) {
                Button(onClick = { showCreateDialog = true }) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Add Department")
                }
            }
        }

        if (isLoading && departments.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator()
            }
        } else if (departments.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.Business,
                        contentDescription = null,
                        modifier = Modifier.size(48.dp),
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("No Departments", style = MaterialTheme.typography.titleMedium)
                    if (isSuperUser) {
                        Text(
                            "Create a department to get started",
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(departments) { department ->
                    DepartmentCard(
                        department = department,
                        admins = viewModel.getAdmins(department),
                        members = viewModel.getMembers(department),
                        isSuperUser = isSuperUser,
                        onEdit = { editingDepartment = department },
                        onDelete = { viewModel.deleteDepartment(department.id) },
                        onManageMembers = { managingDepartment = department }
                    )
                }
            }
        }
    }

    // Create Department Dialog
    if (showCreateDialog) {
        CreateDepartmentDialog(
            onDismiss = { showCreateDialog = false },
            onCreate = { name ->
                viewModel.createDepartment(name) {
                    showCreateDialog = false
                }
            }
        )
    }

    // Edit Department Dialog
    editingDepartment?.let { department ->
        EditDepartmentDialog(
            department = department,
            onDismiss = { editingDepartment = null },
            onUpdate = { name ->
                viewModel.updateDepartment(department.id, name) {
                    editingDepartment = null
                }
            }
        )
    }

    // Manage Members Bottom Sheet
    managingDepartment?.let { department ->
        ManageMembersBottomSheet(
            department = department,
            admins = viewModel.getAdmins(department),
            members = viewModel.getMembers(department),
            availableUsers = viewModel.getUsersNotInDepartment(department),
            onDismiss = { managingDepartment = null },
            onAddAdmin = { userId -> viewModel.addAdmin(department.id, userId) },
            onRemoveAdmin = { userId -> viewModel.removeAdmin(department.id, userId) },
            onAddMember = { userId -> viewModel.addMember(department.id, userId) },
            onRemoveMember = { userId -> viewModel.removeMember(department.id, userId) }
        )
    }
}

@Composable
private fun DepartmentCard(
    department: Department,
    admins: List<User>,
    members: List<User>,
    isSuperUser: Boolean,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onManageMembers: () -> Unit
) {
    var showMenu by remember { mutableStateOf(false) }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(12.dp),
        shadowElevation = 1.dp
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(Primary.copy(alpha = 0.1f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.Business,
                            contentDescription = null,
                            tint = Primary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = department.name,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                }

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
                                text = { Text("Manage Members") },
                                onClick = {
                                    showMenu = false
                                    onManageMembers()
                                },
                                leadingIcon = { Icon(Icons.Default.People, null) }
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

            Spacer(modifier = Modifier.height(12.dp))

            // Stats row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                StatItem(
                    icon = Icons.Default.AdminPanelSettings,
                    label = "Admins",
                    count = admins.size
                )
                StatItem(
                    icon = Icons.Default.People,
                    label = "Members",
                    count = members.size
                )
                department.projectCount?.let { count ->
                    StatItem(
                        icon = Icons.Default.Assignment,
                        label = "Tasks",
                        count = count
                    )
                }
            }

            // Admins
            if (admins.isNotEmpty()) {
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    "Admins",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    admins.take(3).forEach { admin ->
                        UserChip(user = admin)
                    }
                    if (admins.size > 3) {
                        Surface(
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Text(
                                "+${admins.size - 3}",
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                style = MaterialTheme.typography.labelSmall
                            )
                        }
                    }
                }
            }

            // Members
            if (members.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "Members",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    members.take(3).forEach { member ->
                        UserChip(user = member)
                    }
                    if (members.size > 3) {
                        Surface(
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Text(
                                "+${members.size - 3}",
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                style = MaterialTheme.typography.labelSmall
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StatItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    count: Int
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            icon,
            contentDescription = null,
            modifier = Modifier.size(14.dp),
            tint = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            "$count $label",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun UserChip(user: User) {
    Surface(
        color = Primary.copy(alpha = 0.1f),
        shape = RoundedCornerShape(16.dp)
    ) {
        Text(
            user.name,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall,
            color = Primary
        )
    }
}

@Composable
private fun CreateDepartmentDialog(
    onDismiss: () -> Unit,
    onCreate: (String) -> Unit
) {
    var name by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Create Department") },
        text = {
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Department Name") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )
        },
        confirmButton = {
            TextButton(
                onClick = { onCreate(name) },
                enabled = name.isNotBlank()
            ) {
                Text("Create")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

@Composable
private fun EditDepartmentDialog(
    department: Department,
    onDismiss: () -> Unit,
    onUpdate: (String) -> Unit
) {
    var name by remember { mutableStateOf(department.name) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Edit Department") },
        text = {
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Department Name") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                shape = RoundedCornerShape(12.dp)
            )
        },
        confirmButton = {
            TextButton(
                onClick = { onUpdate(name) },
                enabled = name.isNotBlank()
            ) {
                Text("Save")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ManageMembersBottomSheet(
    department: Department,
    admins: List<User>,
    members: List<User>,
    availableUsers: List<User>,
    onDismiss: () -> Unit,
    onAddAdmin: (String) -> Unit,
    onRemoveAdmin: (String) -> Unit,
    onAddMember: (String) -> Unit,
    onRemoveMember: (String) -> Unit
) {
    var showAddAdminDropdown by remember { mutableStateOf(false) }
    var showAddMemberDropdown by remember { mutableStateOf(false) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Text(
                "Manage ${department.name}",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Admins Section
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Admins",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )

                Box {
                    IconButton(onClick = { showAddAdminDropdown = true }) {
                        Icon(Icons.Default.PersonAdd, contentDescription = "Add Admin")
                    }
                    DropdownMenu(
                        expanded = showAddAdminDropdown,
                        onDismissRequest = { showAddAdminDropdown = false }
                    ) {
                        if (availableUsers.isEmpty()) {
                            DropdownMenuItem(
                                text = { Text("No available users") },
                                onClick = {},
                                enabled = false
                            )
                        } else {
                            availableUsers.forEach { user ->
                                DropdownMenuItem(
                                    text = { Text(user.name) },
                                    onClick = {
                                        onAddAdmin(user.id)
                                        showAddAdminDropdown = false
                                    }
                                )
                            }
                        }
                    }
                }
            }

            admins.forEach { admin ->
                MemberRow(
                    user = admin,
                    onRemove = { onRemoveAdmin(admin.id) }
                )
            }

            if (admins.isEmpty()) {
                Text(
                    "No admins assigned",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(vertical = 8.dp)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Members Section
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Members",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )

                Box {
                    IconButton(onClick = { showAddMemberDropdown = true }) {
                        Icon(Icons.Default.PersonAdd, contentDescription = "Add Member")
                    }
                    DropdownMenu(
                        expanded = showAddMemberDropdown,
                        onDismissRequest = { showAddMemberDropdown = false }
                    ) {
                        if (availableUsers.isEmpty()) {
                            DropdownMenuItem(
                                text = { Text("No available users") },
                                onClick = {},
                                enabled = false
                            )
                        } else {
                            availableUsers.forEach { user ->
                                DropdownMenuItem(
                                    text = { Text(user.name) },
                                    onClick = {
                                        onAddMember(user.id)
                                        showAddMemberDropdown = false
                                    }
                                )
                            }
                        }
                    }
                }
            }

            members.forEach { member ->
                MemberRow(
                    user = member,
                    onRemove = { onRemoveMember(member.id) }
                )
            }

            if (members.isEmpty()) {
                Text(
                    "No members assigned",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(vertical = 8.dp)
                )
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
private fun MemberRow(
    user: User,
    onRemove: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .background(Primary.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    user.name.take(1).uppercase(),
                    style = MaterialTheme.typography.labelMedium,
                    color = Primary
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(user.name, style = MaterialTheme.typography.bodyMedium)
                Text(
                    user.email,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        IconButton(onClick = onRemove) {
            Icon(
                Icons.Default.RemoveCircleOutline,
                contentDescription = "Remove",
                tint = MaterialTheme.colorScheme.error
            )
        }
    }
}
