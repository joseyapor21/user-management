import Foundation

struct User: Codable, Identifiable {
    let id: String
    let email: String
    let name: String
    let isAdmin: Bool
    let isSuperUser: Bool
    let departments: [String]?
    let createdAt: String?
    let updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id, email, name, isAdmin, isSuperUser, departments, createdAt, updatedAt
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = try container.decode(String.self, forKey: .id)
        self.email = try container.decode(String.self, forKey: .email)
        self.name = try container.decode(String.self, forKey: .name)
        self.isAdmin = try container.decodeIfPresent(Bool.self, forKey: .isAdmin) ?? false
        self.isSuperUser = try container.decodeIfPresent(Bool.self, forKey: .isSuperUser) ?? false
        self.departments = try container.decodeIfPresent([String].self, forKey: .departments)
        self.createdAt = try container.decodeIfPresent(String.self, forKey: .createdAt)
        self.updatedAt = try container.decodeIfPresent(String.self, forKey: .updatedAt)
    }
}

struct AuthUser: Codable, Identifiable {
    let id: String
    let email: String
    let name: String
    let isAdmin: Bool
    let isSuperUser: Bool
}

struct LoginRequest: Encodable {
    let email: String
    let password: String
}

struct LoginResponse: Decodable {
    let token: String
    let user: AuthUser
}

struct UpdateProfileRequest: Encodable {
    let name: String?
    let password: String?
}
