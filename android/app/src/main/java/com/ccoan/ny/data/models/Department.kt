package com.ccoan.ny.data.models

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class Department(
    val id: String,
    val name: String,
    val adminIds: List<String> = emptyList(),
    val memberIds: List<String> = emptyList(),
    val projectCount: Int? = null,
    val metadata: MetadataTimestamps? = null
)

@JsonClass(generateAdapter = true)
data class MetadataTimestamps(
    val createdAt: String,
    val updatedAt: String
)

@JsonClass(generateAdapter = true)
data class CreateDepartmentRequest(
    val name: String
)

@JsonClass(generateAdapter = true)
data class UpdateDepartmentRequest(
    val id: String,
    val name: String
)

@JsonClass(generateAdapter = true)
data class AddMemberRequest(
    val userId: String
)
