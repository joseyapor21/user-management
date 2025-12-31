package com.ccoan.ny.data.repository

import com.ccoan.ny.core.network.ApiService
import com.ccoan.ny.data.models.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ProjectRepository @Inject constructor(
    private val apiService: ApiService
) {
    private val _projects = MutableStateFlow<List<Project>>(emptyList())
    val projects: StateFlow<List<Project>> = _projects.asStateFlow()

    private val _departments = MutableStateFlow<List<Department>>(emptyList())
    val departments: StateFlow<List<Department>> = _departments.asStateFlow()

    suspend fun loadProjects(): Result<List<Project>> {
        return try {
            val response = apiService.getProjects()
            if (response.isSuccessful && response.body()?.success == true) {
                val projectList = response.body()?.data ?: emptyList()
                _projects.value = projectList
                Result.success(projectList)
            } else {
                Result.failure(Exception(response.body()?.error ?: "Failed to load projects"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun loadDepartments(): Result<List<Department>> {
        return try {
            val response = apiService.getDepartments()
            if (response.isSuccessful && response.body()?.success == true) {
                val deptList = response.body()?.data ?: emptyList()
                _departments.value = deptList
                Result.success(deptList)
            } else {
                Result.failure(Exception(response.body()?.error ?: "Failed to load departments"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createProject(request: CreateProjectRequest): Result<String> {
        return try {
            val response = apiService.createProject(request)
            if (response.isSuccessful && response.body()?.success == true) {
                loadProjects()
                Result.success(response.body()?.data?.id ?: "")
            } else {
                Result.failure(Exception(response.body()?.error ?: "Failed to create project"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateProject(request: UpdateProjectRequest): Result<Unit> {
        return try {
            val response = apiService.updateProject(request)
            if (response.isSuccessful && response.body()?.success == true) {
                loadProjects()
                Result.success(Unit)
            } else {
                Result.failure(Exception(response.body()?.error ?: "Failed to update project"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun reorderProject(projectId: String, newStatus: ProjectStatus, newOrder: Int): Result<Unit> {
        return try {
            val request = ReorderProjectRequest(
                projectId = projectId,
                newStatus = newStatus.name.lowercase(),
                newOrder = newOrder
            )
            val response = apiService.reorderProject(request)
            if (response.isSuccessful) {
                // Update locally
                _projects.value = _projects.value.map { project ->
                    if (project.id == projectId) {
                        project.copy(status = newStatus, order = newOrder)
                    } else project
                }
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to reorder"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteProject(id: String): Result<Unit> {
        return try {
            val response = apiService.deleteProject(id)
            if (response.isSuccessful) {
                _projects.value = _projects.value.filter { it.id != id }
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to delete"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun addComment(projectId: String, text: String): Result<Unit> {
        return try {
            val response = apiService.addComment(projectId, AddCommentRequest(text))
            if (response.isSuccessful) {
                loadProjects()
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed to add comment"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
