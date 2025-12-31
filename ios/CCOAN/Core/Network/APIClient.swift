import Foundation

actor APIClient {
    static let shared = APIClient()

    private let baseURL: String
    private let session: URLSession
    private var authToken: String?

    init() {
        // Update this to your production URL
        self.baseURL = ProcessInfo.processInfo.environment["API_BASE_URL"] ?? "https://your-api-url.com"

        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)

        // Load token from keychain on init
        Task {
            self.authToken = KeychainManager.shared.getToken()
        }
    }

    func setAuthToken(_ token: String?) {
        self.authToken = token
        if let token = token {
            KeychainManager.shared.saveToken(token)
        } else {
            KeychainManager.shared.deleteToken()
        }
    }

    func getAuthToken() -> String? {
        return authToken
    }

    func request<T: Decodable>(
        endpoint: APIEndpoint,
        method: HTTPMethod = .get,
        body: Encodable? = nil,
        queryParams: [String: String]? = nil
    ) async throws -> T {
        var urlString = baseURL + endpoint.path

        if let queryParams = queryParams, !queryParams.isEmpty {
            let queryString = queryParams.map { "\($0.key)=\($0.value)" }.joined(separator: "&")
            if urlString.contains("?") {
                urlString += "&\(queryString)"
            } else {
                urlString += "?\(queryString)"
            }
        }

        guard let url = URL(string: urlString) else {
            throw NetworkError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = body {
            do {
                request.httpBody = try JSONEncoder().encode(body)
            } catch {
                throw NetworkError.encodingError(error)
            }
        }

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.invalidResponse
        }

        if httpResponse.statusCode == 401 {
            throw NetworkError.unauthorized
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            // Try to parse error message from response
            if let errorResponse = try? JSONDecoder().decode(APIResponse<EmptyResponse>.self, from: data),
               let errorMessage = errorResponse.error ?? errorResponse.message {
                throw NetworkError.serverError(errorMessage)
            }
            throw NetworkError.httpError(statusCode: httpResponse.statusCode)
        }

        do {
            let decoder = JSONDecoder()
            return try decoder.decode(T.self, from: data)
        } catch {
            throw NetworkError.decodingError(error)
        }
    }

    // Convenience methods for common operations

    func get<T: Decodable>(
        endpoint: APIEndpoint,
        queryParams: [String: String]? = nil
    ) async throws -> T {
        return try await request(endpoint: endpoint, method: .get, queryParams: queryParams)
    }

    func post<T: Decodable>(
        endpoint: APIEndpoint,
        body: Encodable? = nil
    ) async throws -> T {
        return try await request(endpoint: endpoint, method: .post, body: body)
    }

    func put<T: Decodable>(
        endpoint: APIEndpoint,
        body: Encodable? = nil
    ) async throws -> T {
        return try await request(endpoint: endpoint, method: .put, body: body)
    }

    func delete<T: Decodable>(
        endpoint: APIEndpoint,
        queryParams: [String: String]? = nil
    ) async throws -> T {
        return try await request(endpoint: endpoint, method: .delete, queryParams: queryParams)
    }
}
