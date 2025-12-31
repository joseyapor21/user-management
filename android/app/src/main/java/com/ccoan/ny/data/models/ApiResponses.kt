package com.ccoan.ny.data.models

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class ApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val error: String? = null,
    val message: String? = null
)

@JsonClass(generateAdapter = true)
data class CreateProjectResponse(
    val id: String,
    val message: String? = null
)

@JsonClass(generateAdapter = true)
data class VapidKeyResponse(
    val configured: Boolean,
    val publicKey: String? = null
)
