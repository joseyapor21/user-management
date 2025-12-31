import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var selectedTab: Tab = .projects
    @State private var showingProfile = false

    enum Tab: String, CaseIterable {
        case projects = "Projects"
        case meetings = "Meetings"
        case schedule = "Schedule"
        case departments = "Departments"

        var icon: String {
            switch self {
            case .projects: return "list.bullet.rectangle"
            case .meetings: return "calendar.badge.clock"
            case .schedule: return "calendar"
            case .departments: return "building.2"
            }
        }
    }

    var body: some View {
        NavigationStack {
            TabView(selection: $selectedTab) {
                ProjectsView()
                    .tabItem {
                        Label(Tab.projects.rawValue, systemImage: Tab.projects.icon)
                    }
                    .tag(Tab.projects)

                MeetingsView()
                    .tabItem {
                        Label(Tab.meetings.rawValue, systemImage: Tab.meetings.icon)
                    }
                    .tag(Tab.meetings)

                ScheduleView()
                    .tabItem {
                        Label(Tab.schedule.rawValue, systemImage: Tab.schedule.icon)
                    }
                    .tag(Tab.schedule)

                DepartmentsView()
                    .tabItem {
                        Label(Tab.departments.rawValue, systemImage: Tab.departments.icon)
                    }
                    .tag(Tab.departments)
            }
            .navigationTitle(selectedTab.rawValue)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    HStack(spacing: 8) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 6)
                                .fill(Color.blue)
                                .frame(width: 28, height: 28)

                            Text("C")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(.white)
                        }

                        Text("CCOAN NY")
                            .font(.headline)
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button {
                            showingProfile = true
                        } label: {
                            Label("Edit Profile", systemImage: "person.circle")
                        }

                        Divider()

                        Button(role: .destructive) {
                            Task {
                                await authViewModel.logout()
                            }
                        } label: {
                            Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                        }
                    } label: {
                        Image(systemName: "person.circle.fill")
                            .font(.title2)
                            .foregroundColor(.blue)
                    }
                }
            }
            .sheet(isPresented: $showingProfile) {
                ProfileEditView()
            }
        }
    }
}

// Wrapper views to use actual implementations
struct ProjectsView: View {
    var body: some View {
        KanbanBoardView()
    }
}

struct MeetingsView: View {
    var body: some View {
        MeetingsListView()
    }
}

struct ScheduleView: View {
    var body: some View {
        SundayScheduleView()
    }
}

struct DepartmentsView: View {
    var body: some View {
        DepartmentsListView()
    }
}

struct ProfileEditView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @Environment(\.dismiss) var dismiss
    @State private var name = ""
    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @State private var showSuccess = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Profile Information") {
                    TextField("Name", text: $name)
                }

                Section("Change Password") {
                    SecureField("New Password", text: $newPassword)
                    SecureField("Confirm Password", text: $confirmPassword)
                }

                if let error = authViewModel.errorMessage {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                    }
                }

                if showSuccess {
                    Section {
                        Text("Profile updated successfully!")
                            .foregroundColor(.green)
                    }
                }
            }
            .navigationTitle("Edit Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        save()
                    }
                    .disabled(authViewModel.isLoading)
                }
            }
            .onAppear {
                name = authViewModel.currentUser?.name ?? ""
            }
        }
    }

    private func save() {
        guard newPassword.isEmpty || newPassword == confirmPassword else {
            return
        }

        Task {
            let success = await authViewModel.updateProfile(
                name: name.isEmpty ? nil : name,
                password: newPassword.isEmpty ? nil : newPassword
            )
            if success {
                showSuccess = true
                DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                    dismiss()
                }
            }
        }
    }
}

#Preview {
    DashboardView()
        .environmentObject(AuthViewModel())
}
