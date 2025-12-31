import Foundation

enum ProjectStatus: String, Codable, CaseIterable {
    case backlog
    case todo
    case in_progress
    case done
    case archived

    var displayName: String {
        switch self {
        case .backlog: return "Backlog"
        case .todo: return "To Do"
        case .in_progress: return "In Progress"
        case .done: return "Done"
        case .archived: return "Archived"
        }
    }
}

enum Priority: String, Codable, CaseIterable {
    case low
    case medium
    case high
    case urgent

    var displayName: String {
        rawValue.capitalized
    }

    var color: String {
        switch self {
        case .low: return "#22c55e"
        case .medium: return "#eab308"
        case .high: return "#f97316"
        case .urgent: return "#ef4444"
        }
    }
}

enum LabelColor: String, Codable, CaseIterable {
    case red, orange, yellow, green, blue, purple, pink, gray

    var hexColor: String {
        switch self {
        case .red: return "#ef4444"
        case .orange: return "#f97316"
        case .yellow: return "#eab308"
        case .green: return "#22c55e"
        case .blue: return "#3b82f6"
        case .purple: return "#a855f7"
        case .pink: return "#ec4899"
        case .gray: return "#6b7280"
        }
    }
}

struct Label: Codable, Identifiable {
    let id: String
    let name: String
    let color: LabelColor
}

struct Subtask: Codable, Identifiable {
    let id: String
    let title: String
    var completed: Bool
}

struct Comment: Codable, Identifiable {
    let id: String
    let userId: String
    let userName: String
    let text: String
    let createdAt: String
}

struct Attachment: Codable, Identifiable {
    let id: String
    let name: String
    let url: String
    let type: String
    let size: Int
    let uploadedAt: String
    let uploadedBy: String
    let uploadedByName: String?
}

struct ActivityLogEntry: Codable, Identifiable {
    let id: String
    let userId: String
    let userName: String
    let action: String
    let details: String?
    let timestamp: String
}

struct RecurrenceConfig: Codable {
    let type: RecurrenceType
    let endDate: String?
    let lastGenerated: String?
}

enum RecurrenceType: String, Codable, CaseIterable {
    case none
    case daily
    case weekly
    case biweekly
    case monthly
}

struct Project: Codable, Identifiable {
    let id: String
    let departmentId: String
    var departmentName: String?
    var title: String
    var description: String
    var status: ProjectStatus
    var priority: Priority
    var assigneeId: String?
    var assigneeName: String?
    var assigneeIds: [String]?
    var assigneeNames: [String]?
    let createdBy: String
    var creatorName: String?
    var dueDate: String?
    var labels: [Label]
    var subtasks: [Subtask]
    var attachments: [Attachment]
    var comments: [Comment]
    var activityLog: [ActivityLogEntry]
    var estimatedHours: Double?
    var loggedHours: Double?
    var blockedBy: [String]?
    var order: Int
    var recurrence: RecurrenceConfig?
    let metadata: MetadataTimestamps?

    enum CodingKeys: String, CodingKey {
        case id, departmentId, departmentName, title, description, status, priority
        case assigneeId, assigneeName, assigneeIds, assigneeNames
        case createdBy, creatorName, dueDate, labels, subtasks, attachments
        case comments, activityLog, estimatedHours, loggedHours, blockedBy
        case order, recurrence, metadata
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = try container.decode(String.self, forKey: .id)
        self.departmentId = try container.decode(String.self, forKey: .departmentId)
        self.departmentName = try container.decodeIfPresent(String.self, forKey: .departmentName)
        self.title = try container.decode(String.self, forKey: .title)
        self.description = try container.decodeIfPresent(String.self, forKey: .description) ?? ""
        self.status = try container.decode(ProjectStatus.self, forKey: .status)
        self.priority = try container.decodeIfPresent(Priority.self, forKey: .priority) ?? .medium
        self.assigneeId = try container.decodeIfPresent(String.self, forKey: .assigneeId)
        self.assigneeName = try container.decodeIfPresent(String.self, forKey: .assigneeName)
        self.assigneeIds = try container.decodeIfPresent([String].self, forKey: .assigneeIds)
        self.assigneeNames = try container.decodeIfPresent([String].self, forKey: .assigneeNames)
        self.createdBy = try container.decode(String.self, forKey: .createdBy)
        self.creatorName = try container.decodeIfPresent(String.self, forKey: .creatorName)
        self.dueDate = try container.decodeIfPresent(String.self, forKey: .dueDate)
        self.labels = try container.decodeIfPresent([Label].self, forKey: .labels) ?? []
        self.subtasks = try container.decodeIfPresent([Subtask].self, forKey: .subtasks) ?? []
        self.attachments = try container.decodeIfPresent([Attachment].self, forKey: .attachments) ?? []
        self.comments = try container.decodeIfPresent([Comment].self, forKey: .comments) ?? []
        self.activityLog = try container.decodeIfPresent([ActivityLogEntry].self, forKey: .activityLog) ?? []
        self.estimatedHours = try container.decodeIfPresent(Double.self, forKey: .estimatedHours)
        self.loggedHours = try container.decodeIfPresent(Double.self, forKey: .loggedHours)
        self.blockedBy = try container.decodeIfPresent([String].self, forKey: .blockedBy)
        self.order = try container.decodeIfPresent(Int.self, forKey: .order) ?? 0
        self.recurrence = try container.decodeIfPresent(RecurrenceConfig.self, forKey: .recurrence)
        self.metadata = try container.decodeIfPresent(MetadataTimestamps.self, forKey: .metadata)
    }
}

struct CreateProjectRequest: Encodable {
    let departmentId: String
    let title: String
    let description: String?
    let status: String
    let priority: String
    let assigneeId: String?
    let assigneeIds: [String]?
    let dueDate: String?
    let labels: [Label]?
    let subtasks: [SubtaskInput]?
    let estimatedHours: Double?
    let recurrence: RecurrenceInput?
}

struct SubtaskInput: Encodable {
    let title: String
}

struct RecurrenceInput: Encodable {
    let type: String
    let endDate: String?
}

struct UpdateProjectRequest: Encodable {
    let id: String
    let title: String?
    let description: String?
    let status: String?
    let priority: String?
    let assigneeId: String?
    let assigneeIds: [String]?
    let dueDate: String?
    let labels: [Label]?
    let subtasks: [Subtask]?
    let estimatedHours: Double?
    let loggedHours: Double?
    let blockedBy: [String]?
}

struct ReorderProjectRequest: Encodable {
    let projectId: String
    let newStatus: String
    let newOrder: Int
}

struct AddCommentRequest: Encodable {
    let text: String
}
