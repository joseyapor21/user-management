package com.ccoan.ny.core.network

import com.ccoan.ny.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // Auth
    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<ApiResponse<LoginResponse>>

    @GET("api/auth/profile")
    suspend fun getProfile(): Response<ApiResponse<User>>

    @PUT("api/auth/profile")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): Response<ApiResponse<User>>

    // Users
    @GET("api/users")
    suspend fun getUsers(): Response<ApiResponse<List<User>>>

    @POST("api/users")
    suspend fun createUser(@Body request: Map<String, Any>): Response<ApiResponse<User>>

    @PUT("api/users")
    suspend fun updateUser(@Body request: Map<String, Any>): Response<ApiResponse<Unit>>

    @DELETE("api/users")
    suspend fun deleteUser(@Query("id") id: String): Response<ApiResponse<Unit>>

    // Departments
    @GET("api/departments")
    suspend fun getDepartments(): Response<ApiResponse<List<Department>>>

    @POST("api/departments")
    suspend fun createDepartment(@Body request: CreateDepartmentRequest): Response<ApiResponse<Department>>

    @PUT("api/departments")
    suspend fun updateDepartment(@Body request: UpdateDepartmentRequest): Response<ApiResponse<Unit>>

    @DELETE("api/departments")
    suspend fun deleteDepartment(@Query("id") id: String): Response<ApiResponse<Unit>>

    @GET("api/departments/{id}/admins")
    suspend fun getDepartmentAdmins(@Path("id") id: String): Response<ApiResponse<List<User>>>

    @POST("api/departments/{id}/admins")
    suspend fun addDepartmentAdmin(@Path("id") id: String, @Body request: AddMemberRequest): Response<ApiResponse<Unit>>

    @DELETE("api/departments/{id}/admins")
    suspend fun removeDepartmentAdmin(@Path("id") id: String, @Query("userId") userId: String): Response<ApiResponse<Unit>>

    @GET("api/departments/{id}/members")
    suspend fun getDepartmentMembers(@Path("id") id: String): Response<ApiResponse<List<User>>>

    @POST("api/departments/{id}/members")
    suspend fun addDepartmentMember(@Path("id") id: String, @Body request: AddMemberRequest): Response<ApiResponse<Unit>>

    @DELETE("api/departments/{id}/members")
    suspend fun removeDepartmentMember(@Path("id") id: String, @Query("userId") userId: String): Response<ApiResponse<Unit>>

    // Projects
    @GET("api/projects")
    suspend fun getProjects(
        @Query("departmentId") departmentId: String? = null,
        @Query("assignedToMe") assignedToMe: Boolean? = null,
        @Query("archived") archived: Boolean? = null
    ): Response<ApiResponse<List<Project>>>

    @GET("api/projects")
    suspend fun getProjectById(@Query("id") id: String): Response<ApiResponse<Project>>

    @POST("api/projects")
    suspend fun createProject(@Body request: CreateProjectRequest): Response<ApiResponse<CreateProjectResponse>>

    @PUT("api/projects")
    suspend fun updateProject(@Body request: UpdateProjectRequest): Response<ApiResponse<Unit>>

    @DELETE("api/projects")
    suspend fun deleteProject(@Query("id") id: String, @Query("permanent") permanent: Boolean? = null): Response<ApiResponse<Unit>>

    @PUT("api/projects/reorder")
    suspend fun reorderProject(@Body request: ReorderProjectRequest): Response<ApiResponse<Unit>>

    @POST("api/projects/restore")
    suspend fun restoreProject(@Body request: Map<String, String>): Response<ApiResponse<Unit>>

    @POST("api/projects/{id}/comments")
    suspend fun addComment(@Path("id") id: String, @Body request: AddCommentRequest): Response<ApiResponse<Unit>>

    @DELETE("api/projects/{id}/comments")
    suspend fun deleteComment(@Path("id") id: String, @Query("commentId") commentId: String): Response<ApiResponse<Unit>>

    // Meetings
    @GET("api/meetings")
    suspend fun getMeetings(@Query("departmentId") departmentId: String? = null): Response<ApiResponse<List<Meeting>>>

    @POST("api/meetings")
    suspend fun createMeeting(@Body request: CreateMeetingRequest): Response<ApiResponse<Meeting>>

    @PUT("api/meetings")
    suspend fun updateMeeting(@Body request: UpdateMeetingRequest): Response<ApiResponse<Unit>>

    @DELETE("api/meetings")
    suspend fun deleteMeeting(@Query("id") id: String): Response<ApiResponse<Unit>>

    // Schedules
    @GET("api/schedules")
    suspend fun getSchedule(@Query("date") date: String): Response<ScheduleResponse>

    @PUT("api/schedules")
    suspend fun updateSchedule(@Body request: UpdateScheduleRequest): Response<ApiResponse<Unit>>

    @GET("api/schedules/config")
    suspend fun getScheduleConfig(): Response<ApiResponse<ScheduleConfig>>

    @PUT("api/schedules/config")
    suspend fun updateScheduleConfig(@Body request: ScheduleConfig): Response<ApiResponse<Unit>>

    @PUT("api/schedules/admin")
    suspend fun setScheduleAdmin(@Body request: SetScheduleAdminRequest): Response<ApiResponse<Unit>>

    // Push Notifications
    @POST("api/push/subscribe")
    suspend fun subscribePush(@Body request: Map<String, Any>): Response<ApiResponse<Unit>>

    @DELETE("api/push/subscribe")
    suspend fun unsubscribePush(): Response<ApiResponse<Unit>>
}
