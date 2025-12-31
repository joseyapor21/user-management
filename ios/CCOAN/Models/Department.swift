import Foundation

struct Department: Codable, Identifiable {
    let id: String
    let name: String
    let adminIds: [String]
    let memberIds: [String]
    let metadata: MetadataTimestamps?

    enum CodingKeys: String, CodingKey {
        case id, name, adminIds, memberIds, metadata
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = try container.decode(String.self, forKey: .id)
        self.name = try container.decode(String.self, forKey: .name)
        self.adminIds = try container.decodeIfPresent([String].self, forKey: .adminIds) ?? []
        self.memberIds = try container.decodeIfPresent([String].self, forKey: .memberIds) ?? []
        self.metadata = try container.decodeIfPresent(MetadataTimestamps.self, forKey: .metadata)
    }
}

struct MetadataTimestamps: Codable {
    let createdAt: String
    let updatedAt: String
}

struct CreateDepartmentRequest: Encodable {
    let name: String
}

struct UpdateDepartmentRequest: Encodable {
    let id: String
    let name: String
}

struct AddMemberRequest: Encodable {
    let userId: String
}
