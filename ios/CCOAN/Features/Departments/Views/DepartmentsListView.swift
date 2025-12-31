import SwiftUI

struct DepartmentsListView: View {
    @StateObject private var viewModel = DepartmentsViewModel()
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var showingCreateDepartment = false
    @State private var newDepartmentName = ""
    @State private var expandedDepartment: String?

    var body: some View {
        VStack(spacing: 0) {
            // Header
            if authViewModel.isSuperUser {
                HStack {
                    Spacer()
                    Button {
                        showingCreateDepartment = true
                    } label: {
                        Label("New Department", systemImage: "plus.circle.fill")
                    }
                }
                .padding()
                .background(Color(.systemBackground))
            }

            if viewModel.isLoading && viewModel.departments.isEmpty {
                LoadingView(message: "Loading departments...")
            } else if let error = viewModel.errorMessage, viewModel.departments.isEmpty {
                ErrorView(message: error) {
                    Task { await viewModel.loadDepartments() }
                }
            } else if viewModel.departments.isEmpty {
                EmptyStateView(
                    icon: "building.2",
                    title: "No Departments",
                    message: authViewModel.isSuperUser ?
                        "Create a department to get started" :
                        "You're not assigned to any departments"
                )
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(viewModel.departments) { department in
                            DepartmentCard(
                                department: department,
                                admins: viewModel.departmentAdmins[department.id] ?? [],
                                members: viewModel.departmentMembers[department.id] ?? [],
                                isExpanded: expandedDepartment == department.id,
                                isSuperUser: authViewModel.isSuperUser,
                                availableUsers: viewModel.users,
                                onToggle: {
                                    withAnimation {
                                        if expandedDepartment == department.id {
                                            expandedDepartment = nil
                                        } else {
                                            expandedDepartment = department.id
                                            Task {
                                                await viewModel.loadDepartmentDetails(departmentId: department.id)
                                            }
                                        }
                                    }
                                },
                                onDelete: {
                                    Task { await viewModel.deleteDepartment(id: department.id) }
                                },
                                onAddAdmin: { userId in
                                    Task { await viewModel.addAdmin(departmentId: department.id, userId: userId) }
                                },
                                onRemoveAdmin: { userId in
                                    Task { await viewModel.removeAdmin(departmentId: department.id, userId: userId) }
                                },
                                onAddMember: { userId in
                                    Task { await viewModel.addMember(departmentId: department.id, userId: userId) }
                                },
                                onRemoveMember: { userId in
                                    Task { await viewModel.removeMember(departmentId: department.id, userId: userId) }
                                }
                            )
                        }
                    }
                    .padding()
                }
            }
        }
        .alert("New Department", isPresented: $showingCreateDepartment) {
            TextField("Department Name", text: $newDepartmentName)
            Button("Cancel", role: .cancel) {
                newDepartmentName = ""
            }
            Button("Create") {
                Task {
                    await viewModel.createDepartment(name: newDepartmentName)
                    newDepartmentName = ""
                }
            }
            .disabled(newDepartmentName.isEmpty)
        }
        .task {
            await viewModel.loadDepartments()
        }
        .refreshable {
            await viewModel.loadDepartments()
        }
    }
}

struct DepartmentCard: View {
    let department: Department
    let admins: [User]
    let members: [User]
    let isExpanded: Bool
    let isSuperUser: Bool
    let availableUsers: [User]
    let onToggle: () -> Void
    let onDelete: () -> Void
    let onAddAdmin: (String) -> Void
    let onRemoveAdmin: (String) -> Void
    let onAddMember: (String) -> Void
    let onRemoveMember: (String) -> Void

    @State private var showingAddAdmin = false
    @State private var showingAddMember = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Text(department.name)
                    .font(.headline)

                Spacer()

                if isSuperUser {
                    Button(role: .destructive) {
                        onDelete()
                    } label: {
                        Image(systemName: "trash")
                            .font(.caption)
                    }
                }

                Button {
                    onToggle()
                } label: {
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            // Stats row
            HStack(spacing: 16) {
                HStack(spacing: 4) {
                    Image(systemName: "person.badge.key")
                        .font(.caption)
                    Text("\(department.adminIds.count) Admins")
                        .font(.caption)
                }
                .foregroundColor(.blue)

                HStack(spacing: 4) {
                    Image(systemName: "person.2")
                        .font(.caption)
                    Text("\(department.memberIds.count) Members")
                        .font(.caption)
                }
                .foregroundColor(.secondary)
            }

            // Expanded content
            if isExpanded {
                Divider()

                // Admins section
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Admins")
                            .font(.subheadline)
                            .fontWeight(.medium)
                        Spacer()
                        if isSuperUser {
                            Button {
                                showingAddAdmin = true
                            } label: {
                                Image(systemName: "plus.circle")
                                    .font(.caption)
                            }
                        }
                    }

                    if admins.isEmpty {
                        Text("No admins assigned")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    } else {
                        ForEach(admins) { admin in
                            UserRow(
                                user: admin,
                                canRemove: isSuperUser,
                                onRemove: { onRemoveAdmin(admin.id) }
                            )
                        }
                    }
                }

                Divider()

                // Members section
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Members")
                            .font(.subheadline)
                            .fontWeight(.medium)
                        Spacer()
                        if isSuperUser {
                            Button {
                                showingAddMember = true
                            } label: {
                                Image(systemName: "plus.circle")
                                    .font(.caption)
                            }
                        }
                    }

                    if members.isEmpty {
                        Text("No members assigned")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    } else {
                        ForEach(members) { member in
                            UserRow(
                                user: member,
                                canRemove: isSuperUser,
                                onRemove: { onRemoveMember(member.id) }
                            )
                        }
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 2, y: 1)
        .sheet(isPresented: $showingAddAdmin) {
            UserPickerSheet(
                title: "Add Admin",
                users: availableUsers.filter { user in
                    !admins.contains { $0.id == user.id }
                },
                onSelect: { userId in
                    onAddAdmin(userId)
                    showingAddAdmin = false
                }
            )
            .presentationDetents([.medium])
        }
        .sheet(isPresented: $showingAddMember) {
            UserPickerSheet(
                title: "Add Member",
                users: availableUsers.filter { user in
                    !members.contains { $0.id == user.id }
                },
                onSelect: { userId in
                    onAddMember(userId)
                    showingAddMember = false
                }
            )
            .presentationDetents([.medium])
        }
    }
}

struct UserRow: View {
    let user: User
    let canRemove: Bool
    let onRemove: () -> Void

    var body: some View {
        HStack {
            Circle()
                .fill(Color.blue.opacity(0.2))
                .frame(width: 28, height: 28)
                .overlay(
                    Text(String(user.name.prefix(1)).uppercased())
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.blue)
                )

            VStack(alignment: .leading) {
                Text(user.name)
                    .font(.subheadline)
                Text(user.email)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            if canRemove {
                Button {
                    onRemove()
                } label: {
                    Image(systemName: "xmark.circle")
                        .foregroundColor(.red)
                }
            }
        }
    }
}

struct UserPickerSheet: View {
    let title: String
    let users: [User]
    let onSelect: (String) -> Void

    @Environment(\.dismiss) var dismiss
    @State private var searchText = ""

    var filteredUsers: [User] {
        if searchText.isEmpty {
            return users
        }
        return users.filter {
            $0.name.localizedCaseInsensitiveContains(searchText) ||
            $0.email.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        NavigationStack {
            List {
                ForEach(filteredUsers) { user in
                    Button {
                        onSelect(user.id)
                    } label: {
                        HStack {
                            Circle()
                                .fill(Color.blue.opacity(0.2))
                                .frame(width: 32, height: 32)
                                .overlay(
                                    Text(String(user.name.prefix(1)).uppercased())
                                        .font(.caption)
                                        .fontWeight(.medium)
                                        .foregroundColor(.blue)
                                )

                            VStack(alignment: .leading) {
                                Text(user.name)
                                    .foregroundColor(.primary)
                                Text(user.email)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }
            }
            .searchable(text: $searchText, prompt: "Search users")
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
}

#Preview {
    DepartmentsListView()
        .environmentObject(AuthViewModel())
}
