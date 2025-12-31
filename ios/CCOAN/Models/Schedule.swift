import Foundation

struct ScheduleSlot: Codable {
    var phase: String
    var department: String
    var assignees: String
}

struct SundaySchedule: Codable, Identifiable {
    let id: String?
    let date: String
    var slots: [ScheduleSlot]
    let createdBy: String?
    let lastModifiedBy: String?
    let metadata: MetadataTimestamps?

    enum CodingKeys: String, CodingKey {
        case id, date, slots, createdBy, lastModifiedBy, metadata
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = try container.decodeIfPresent(String.self, forKey: .id)
        self.date = try container.decode(String.self, forKey: .date)
        self.slots = try container.decodeIfPresent([ScheduleSlot].self, forKey: .slots) ?? []
        self.createdBy = try container.decodeIfPresent(String.self, forKey: .createdBy)
        self.lastModifiedBy = try container.decodeIfPresent(String.self, forKey: .lastModifiedBy)
        self.metadata = try container.decodeIfPresent(MetadataTimestamps.self, forKey: .metadata)
    }
}

struct ScheduleConfig: Codable {
    var departments: [String]
    var phases: [String]
}

struct ScheduleResponse: Decodable {
    let success: Bool
    let data: SundaySchedule?
    let canEdit: Bool
    let scheduleAdminId: String?
    let scheduleAdminName: String?
}

struct UpdateScheduleRequest: Encodable {
    let date: String
    let slots: [ScheduleSlot]
}

struct SetScheduleAdminRequest: Encodable {
    let userId: String
}
