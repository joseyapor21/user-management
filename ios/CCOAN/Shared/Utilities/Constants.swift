import Foundation
import SwiftUI

enum Constants {
    enum Colors {
        static let primary = Color.blue
        static let background = Color(.systemGroupedBackground)
        static let cardBackground = Color(.systemBackground)

        // Priority colors
        static let priorityLow = Color.green
        static let priorityMedium = Color.yellow
        static let priorityHigh = Color.orange
        static let priorityUrgent = Color.red

        // Status colors
        static let statusBacklog = Color.gray
        static let statusTodo = Color.yellow
        static let statusInProgress = Color.blue
        static let statusDone = Color.green
    }

    enum Layout {
        static let cornerRadius: CGFloat = 12
        static let cardPadding: CGFloat = 16
        static let spacing: CGFloat = 12
    }

    enum Schedule {
        static let defaultPhases = [
            "Before the Service",
            "Opening",
            "Worship",
            "Testimonies",
            "Sermon",
            "Prayer Line Intro",
            "Prayer Line",
            "Laying of Hands",
            "Mass Prayer",
            "Offering",
            "Grace",
            "After Service"
        ]

        static let defaultDepartments = [
            "LAUNDROMAT", "CAMERA", "Sound Dept.", "Media/Display", "SERMON",
            "SUNDAY SERVICE OPENING", "TRANSPORTATION", "PROTOCOL", "Photo Dept.",
            "Confirmation", "Office", "Testimony interview", "Accounting",
            "Microphone", "Translation", "Emergency", "Sunday School",
            "Usher", "Cleaning", "Worship"
        ]
    }
}

// MARK: - Color Extensions

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

extension Priority {
    var swiftUIColor: Color {
        switch self {
        case .low: return Constants.Colors.priorityLow
        case .medium: return Constants.Colors.priorityMedium
        case .high: return Constants.Colors.priorityHigh
        case .urgent: return Constants.Colors.priorityUrgent
        }
    }
}

extension ProjectStatus {
    var swiftUIColor: Color {
        switch self {
        case .backlog: return Constants.Colors.statusBacklog
        case .todo: return Constants.Colors.statusTodo
        case .in_progress: return Constants.Colors.statusInProgress
        case .done: return Constants.Colors.statusDone
        case .archived: return Color.gray.opacity(0.5)
        }
    }
}
