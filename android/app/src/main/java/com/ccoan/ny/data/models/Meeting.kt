package com.ccoan.ny.data.models

import com.squareup.moshi.JsonClass
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@JsonClass(generateAdapter = true)
data class Meeting(
    val id: String,
    var title: String,
    var description: String = "",
    var date: String,
    var startTime: String,
    var endTime: String,
    var departmentId: String,
    var departmentName: String? = null,
    var location: String = "",
    val createdBy: String,
    var creatorName: String? = null,
    val metadata: MetadataTimestamps? = null
) {
    val formattedDate: String
        get() {
            return try {
                val inputFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
                val outputFormat = SimpleDateFormat("EEE, MMM d, yyyy", Locale.US)
                val parsedDate = inputFormat.parse(date)
                parsedDate?.let { outputFormat.format(it) } ?: date
            } catch (e: Exception) {
                date
            }
        }

    val formattedTimeRange: String
        get() = "${formatTime(startTime)} - ${formatTime(endTime)}"

    private fun formatTime(time: String): String {
        return try {
            val inputFormat = SimpleDateFormat("HH:mm", Locale.US)
            val outputFormat = SimpleDateFormat("h:mm a", Locale.US)
            val parsedTime = inputFormat.parse(time)
            parsedTime?.let { outputFormat.format(it) } ?: time
        } catch (e: Exception) {
            time
        }
    }

    val isUpcoming: Boolean
        get() {
            return try {
                val dateTimeFormat = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.US)
                val meetingDateTime = dateTimeFormat.parse("$date $startTime")
                meetingDateTime?.after(Date()) ?: false
            } catch (e: Exception) {
                false
            }
        }
}

@JsonClass(generateAdapter = true)
data class CreateMeetingRequest(
    val title: String,
    val description: String? = null,
    val date: String,
    val startTime: String,
    val endTime: String,
    val departmentId: String,
    val location: String? = null
)

@JsonClass(generateAdapter = true)
data class UpdateMeetingRequest(
    val id: String,
    val title: String,
    val description: String? = null,
    val date: String,
    val startTime: String,
    val endTime: String,
    val departmentId: String,
    val location: String? = null
)
