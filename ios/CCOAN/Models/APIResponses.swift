import Foundation

struct APIResponse<T: Decodable>: Decodable {
    let success: Bool
    let data: T?
    let error: String?
    let message: String?
}

struct EmptyResponse: Decodable {}

struct CreateProjectResponse: Decodable {
    let id: String
    let message: String?
}

struct VapidKeyResponse: Decodable {
    let configured: Bool
    let publicKey: String?
}
