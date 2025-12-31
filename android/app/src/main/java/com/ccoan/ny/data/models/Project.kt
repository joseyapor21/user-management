package com.ccoan.ny.data.models

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

enum class ProjectStatus {
    @Json(name = "backlog") BACKLOG,
    @Json(name = "todo") TODO,
    @Json(name = "in_progress") IN_PROGRESS,
    @Json(name = "done") DONE,
    @Json(name = "archived") ARCHIVED;

    val displayName: String
        get() = when (this) {
            BACKLOG -> "Backlog"
            TODO -> "To Do"
            IN_PROGRESS -> "In Progress"
            DONE -> "Done"
            ARCHIVED -> "Archived"
        }

    companion object {
        fun fromString(value: String): ProjectStatus {
            return entries.find { it.name.equals(value, ignoreCase = true) } ?: BACKLOG
        }
    }
}

enum class Priority {
    @Json(name = "low") LOW,
    @Json(name = "medium") MEDIUM,
    @Json(name = "high") HIGH,
    @Json(name = "urgent") URGENT;

    val displayName: String
        get() = name.lowercase().replaceFirstChar { it.uppercase() }

    val colorHex: String
        get() = when (this) {
            LOW -> "#22C55E"
            MEDIUM -> "#EAB308"
            HIGH -> "#F97316"
            URGENT -> "#EF4444"
        }
}

enum class LabelColor {
    @Json(name = "red") RED,
    @Json(name = "orange") ORANGE,
    @Json(name = "yellow") YELLOW,
    @Json(name = "green") GREEN,
    @Json(name = "blue") BLUE,
    @Json(name = "purple") PURPLE,
    @Json(name = "pink") PINK,
    @Json(name = "gray") GRAY;

    val hexColor: String
        get() = when (this) {
            RED -> "#EF4444"
            ORANGE -> "#F97316"
            YELLOW -> "#EAB308"
            GREEN -> "#22C55E"
            BLUE -> "#3B82F6"
            PURPLE -> "#A855F7"
            PINK -> "#EC4899"
            GRAY -> "#6B7280"
        }
}

@JsonClass(generateAdapter = true)
data class Label(
    val id: String,
    val name: String,
    val color: LabelColor
)

@JsonClass(generateAdapter = true)
data class Subtask(
    val id: String,
    val title: String,
    var completed: Boolean
)

@JsonClass(generateAdapter = true)
data class Comment(
    val id: String,
    val userId: String,
    val userName: String,
    val text: String,
    val createdAt: String
)

@JsonClass(generateAdapter = true)
data class Attachment(
    val id: String,
    val name: String,
    val url: String,
    val type: String,
    val size: Int,
    val uploadedAt: String,
    val uploadedBy: String,
    val uploadedByName: String? = null
)

@JsonClass(generateAdapter = true)
data class ActivityLogEntry(
    val id: String,
    val userId: String,
    val userName: String,
    val action: String,
    val details: String? = null,
    val timestamp: String
)

enum class RecurrenceType {
    @Json(name = "none") NONE,
    @Json(name = "daily") DAILY,
    @Json(name = "weekly") WEEKLY,
    @Json(name = "biweekly") BIWEEKLY,
    @Json(name = "monthly") MONTHLY
}

@JsonClass(generateAdapter = true)
data class RecurrenceConfig(
    val type: RecurrenceType,
    val endDate: String? = null,
    val lastGenerated: String? = null
)

@JsonClass(generateAdapter = true)
data class Project(
    val id: String,
    val departmentId: String,
    val departmentName: String? = null,
    var title: String,
    var description: String = "",
    var status: ProjectStatus = ProjectStatus.BACKLOG,
    var priority: Priority = Priority.MEDIUM,
    var assigneeId: String? = null,
    var assigneeName: String? = null,
    var assigneeIds: List<String>? = null,
    var assigneeNames: List<String>? = null,
    val createdBy: String,
    var creatorName: String? = null,
    var dueDate: String? = null,
    var labels: List<Label> = emptyList(),
    var subtasks: List<Subtask> = emptyList(),
    var attachments: List<Attachment> = emptyList(),
    var comments: List<Comment> = emptyList(),
    var activityLog: List<ActivityLogEntry> = emptyList(),
    var estimatedHours: Double? = null,
    var loggedHours: Double? = null,
    var blockedBy: List<String>? = null,
    var order: Int = 0,
    var recurrence: RecurrenceConfig? = null,
    val metadata: MetadataTimestamps? = null
)

@JsonClass(generateAdapter = true)
data class CreateProjectRequest(
    val departmentId: String,
    val title: String,
    val description: String? = null,
    val status: String = "backlog",
    val priority: String = "medium",
    val assigneeId: String? = null,
    val assigneeIds: List<String>? = null,
    val dueDate: String? = null,
    val labels: List<Label>? = null,
    val subtasks: List<SubtaskInput>? = null,
    val estimatedHours: Double? = null,
    val recurrence: RecurrenceInput? = null
)

@JsonClass(generateAdapter = true)
data class SubtaskInput(
    val title: String
)

@JsonClass(generateAdapter = true)
data class RecurrenceInput(
    val type: String,
    val endDate: String? = null
)

@JsonClass(generateAdapter = true)
data class UpdateProjectRequest(
    val id: String,
    val title: String? = null,
    val description: String? = null,
    val status: String? = null,
    val priority: String? = null,
    val assigneeId: String? = null,
    val assigneeIds: List<String>? = null,
    val dueDate: String? = null,
    val labels: List<Label>? = null,
    val subtasks: List<Subtask>? = null,
    val estimatedHours: Double? = null,
    val loggedHours: Double? = null,
    val blockedBy: List<String>? = null
)

@JsonClass(generateAdapter = true)
data class ReorderProjectRequest(
    val projectId: String,
    val newStatus: String,
    val newOrder: Int
)

@JsonClass(generateAdapter = true)
data class AddCommentRequest(
    val text: String
)
