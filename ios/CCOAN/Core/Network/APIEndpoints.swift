import Foundation

enum APIEndpoint {
    // Auth
    case login
    case signup
    case profile

    // Users
    case users

    // Departments
    case departments
    case departmentAdmins(String)
    case departmentMembers(String)
    case departmentColumns(String)

    // Projects
    case projects
    case projectById(String)
    case projectComments(String)
    case projectAttachments(String)
    case projectsReorder
    case projectsRestore
    case projectsRecurring

    // Meetings
    case meetings
    case meetingReminders

    // Schedules
    case schedules
    case schedulesAdmin
    case schedulesConfig

    // Push
    case pushSubscribe
    case pushSend
    case configVapid

    // Templates
    case templates
    case templatesApply

    // Invites
    case invites

    var path: String {
        switch self {
        case .login:
            return "/api/auth/login"
        case .signup:
            return "/api/auth/signup"
        case .profile:
            return "/api/auth/profile"
        case .users:
            return "/api/users"
        case .departments:
            return "/api/departments"
        case .departmentAdmins(let id):
            return "/api/departments/\(id)/admins"
        case .departmentMembers(let id):
            return "/api/departments/\(id)/members"
        case .departmentColumns(let id):
            return "/api/departments/\(id)/columns"
        case .projects:
            return "/api/projects"
        case .projectById(let id):
            return "/api/projects?id=\(id)"
        case .projectComments(let id):
            return "/api/projects/\(id)/comments"
        case .projectAttachments(let id):
            return "/api/projects/\(id)/attachments"
        case .projectsReorder:
            return "/api/projects/reorder"
        case .projectsRestore:
            return "/api/projects/restore"
        case .projectsRecurring:
            return "/api/projects/recurring"
        case .meetings:
            return "/api/meetings"
        case .meetingReminders:
            return "/api/meetings/reminders"
        case .schedules:
            return "/api/schedules"
        case .schedulesAdmin:
            return "/api/schedules/admin"
        case .schedulesConfig:
            return "/api/schedules/config"
        case .pushSubscribe:
            return "/api/push/subscribe"
        case .pushSend:
            return "/api/push/send"
        case .configVapid:
            return "/api/config/vapid"
        case .templates:
            return "/api/templates"
        case .templatesApply:
            return "/api/templates/apply"
        case .invites:
            return "/api/invites"
        }
    }
}
