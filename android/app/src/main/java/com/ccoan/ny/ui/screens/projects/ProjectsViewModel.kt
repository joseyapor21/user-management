package com.ccoan.ny.ui.screens.projects

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ccoan.ny.data.models.*
import com.ccoan.ny.data.repository.ProjectRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class ViewMode {
    KANBAN, LIST, CALENDAR
}

@HiltViewModel
class ProjectsViewModel @Inject constructor(
    private val repository: ProjectRepository
) : ViewModel() {

    val projects = repository.projects
    val departments = repository.departments

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _viewMode = MutableStateFlow(ViewMode.KANBAN)
    val viewMode: StateFlow<ViewMode> = _viewMode.asStateFlow()

    private val _selectedDepartmentId = MutableStateFlow<String?>(null)
    val selectedDepartmentId: StateFlow<String?> = _selectedDepartmentId.asStateFlow()

    private val _selectedPriority = MutableStateFlow<Priority?>(null)
    val selectedPriority: StateFlow<Priority?> = _selectedPriority.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    val filteredProjects: StateFlow<List<Project>> = combine(
        projects,
        _selectedDepartmentId,
        _selectedPriority,
        _searchQuery
    ) { projectList, deptId, priority, query ->
        projectList.filter { project ->
            // Department filter
            if (deptId != null && project.departmentId != deptId) return@filter false
            // Priority filter
            if (priority != null && project.priority != priority) return@filter false
            // Search filter
            if (query.isNotEmpty()) {
                val q = query.lowercase()
                if (!project.title.lowercase().contains(q) &&
                    !project.description.lowercase().contains(q)) {
                    return@filter false
                }
            }
            // Hide archived
            project.status != ProjectStatus.ARCHIVED
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun projectsForStatus(status: ProjectStatus): List<Project> {
        return filteredProjects.value
            .filter { it.status == status }
            .sortedBy { it.order }
    }

    fun loadData() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            val projectsResult = repository.loadProjects()
            val deptResult = repository.loadDepartments()

            projectsResult.onFailure { _errorMessage.value = it.message }
            deptResult.onFailure { _errorMessage.value = it.message }

            _isLoading.value = false
        }
    }

    fun setViewMode(mode: ViewMode) {
        _viewMode.value = mode
    }

    fun setDepartmentFilter(deptId: String?) {
        _selectedDepartmentId.value = deptId
    }

    fun setPriorityFilter(priority: Priority?) {
        _selectedPriority.value = priority
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun moveProject(projectId: String, newStatus: ProjectStatus) {
        viewModelScope.launch {
            repository.reorderProject(projectId, newStatus, 0)
        }
    }

    fun deleteProject(id: String) {
        viewModelScope.launch {
            repository.deleteProject(id)
        }
    }

    fun addComment(projectId: String, text: String) {
        viewModelScope.launch {
            repository.addComment(projectId, text)
        }
    }

    fun createProject(request: CreateProjectRequest, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            val result = repository.createProject(request)
            result.onSuccess { onSuccess() }
            result.onFailure { _errorMessage.value = it.message }
            _isLoading.value = false
        }
    }

    fun clearError() {
        _errorMessage.value = null
    }
}
