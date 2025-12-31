import Foundation

struct Meeting: Codable, Identifiable {
    let id: String
    var title: String
    var description: String
    var date: String
    var startTime: String
    var endTime: String
    var departmentId: String
    var departmentName: String?
    var location: String
    let createdBy: String
    var creatorName: String?
    let metadata: MetadataTimestamps?

    enum CodingKeys: String, CodingKey {
        case id, title, description, date, startTime, endTime
        case departmentId, departmentName, location, createdBy, creatorName, metadata
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = try container.decode(String.self, forKey: .id)
        self.title = try container.decode(String.self, forKey: .title)
        self.description = try container.decodeIfPresent(String.self, forKey: .description) ?? ""
        self.date = try container.decode(String.self, forKey: .date)
        self.startTime = try container.decode(String.self, forKey: .startTime)
        self.endTime = try container.decode(String.self, forKey: .endTime)
        self.departmentId = try container.decode(String.self, forKey: .departmentId)
        self.departmentName = try container.decodeIfPresent(String.self, forKey: .departmentName)
        self.location = try container.decodeIfPresent(String.self, forKey: .location) ?? ""
        self.createdBy = try container.decode(String.self, forKey: .createdBy)
        self.creatorName = try container.decodeIfPresent(String.self, forKey: .creatorName)
        self.metadata = try container.decodeIfPresent(MetadataTimestamps.self, forKey: .metadata)
    }

    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        if let date = formatter.date(from: date) {
            formatter.dateFormat = "EEE, MMM d, yyyy"
            return formatter.string(from: date)
        }
        return date
    }

    var formattedTimeRange: String {
        return "\(formatTime(startTime)) - \(formatTime(endTime))"
    }

    private func formatTime(_ time: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        if let date = formatter.date(from: time) {
            formatter.dateFormat = "h:mm a"
            return formatter.string(from: date)
        }
        return time
    }

    var isUpcoming: Bool {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd HH:mm"
        let dateTimeString = "\(date) \(startTime)"
        if let meetingDate = formatter.date(from: dateTimeString) {
            return meetingDate > Date()
        }
        return false
    }
}

struct CreateMeetingRequest: Encodable {
    let title: String
    let description: String?
    let date: String
    let startTime: String
    let endTime: String
    let departmentId: String
    let location: String?
}

struct UpdateMeetingRequest: Encodable {
    let id: String
    let title: String
    let description: String?
    let date: String
    let startTime: String
    let endTime: String
    let departmentId: String
    let location: String?
}
