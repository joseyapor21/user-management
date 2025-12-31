package com.ccoan.ny.data.models

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class ScheduleSlot(
    var phase: String,
    var department: String,
    var assignees: String
)

@JsonClass(generateAdapter = true)
data class SundaySchedule(
    val id: String? = null,
    val date: String,
    var slots: List<ScheduleSlot> = emptyList(),
    val createdBy: String? = null,
    val lastModifiedBy: String? = null,
    val metadata: MetadataTimestamps? = null
)

@JsonClass(generateAdapter = true)
data class ScheduleConfig(
    var departments: List<String>,
    var phases: List<String>
)

@JsonClass(generateAdapter = true)
data class ScheduleResponse(
    val success: Boolean,
    val data: SundaySchedule? = null,
    val canEdit: Boolean = false,
    val scheduleAdminId: String? = null,
    val scheduleAdminName: String? = null
)

@JsonClass(generateAdapter = true)
data class UpdateScheduleRequest(
    val date: String,
    val slots: List<ScheduleSlot>
)

@JsonClass(generateAdapter = true)
data class SetScheduleAdminRequest(
    val userId: String
)

object ScheduleDefaults {
    val DEFAULT_PHASES = listOf(
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
    )

    val DEFAULT_DEPARTMENTS = listOf(
        "LAUNDROMAT", "CAMERA", "Sound Dept.", "Media/Display", "SERMON",
        "SUNDAY SERVICE OPENING", "TRANSPORTATION", "PROTOCOL", "Photo Dept.",
        "Confirmation", "Office", "Testimony interview", "Accounting",
        "Microphone", "Translation", "Emergency", "Sunday School",
        "Usher", "Cleaning", "Worship"
    )
}
