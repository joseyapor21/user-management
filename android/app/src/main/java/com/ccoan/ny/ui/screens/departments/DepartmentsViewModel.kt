package com.ccoan.ny.ui.screens.departments

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ccoan.ny.core.network.ApiService
import com.ccoan.ny.data.models.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class DepartmentsViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _departments = MutableStateFlow<List<Department>>(emptyList())
    val departments: StateFlow<List<Department>> = _departments.asStateFlow()

    private val _users = MutableStateFlow<List<User>>(emptyList())
    val users: StateFlow<List<User>> = _users.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    fun loadData() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            try {
                val deptResponse = apiService.getDepartments()
                if (deptResponse.isSuccessful) {
                    _departments.value = deptResponse.body()?.data ?: emptyList()
                }

                val usersResponse = apiService.getUsers()
                if (usersResponse.isSuccessful) {
                    _users.value = usersResponse.body()?.data ?: emptyList()
                }
            } catch (e: Exception) {
                _errorMessage.value = e.message
            }

            _isLoading.value = false
        }
    }

    fun createDepartment(name: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            try {
                val request = CreateDepartmentRequest(name = name)
                val response = apiService.createDepartment(request)
                if (response.isSuccessful && response.body()?.success == true) {
                    loadData()
                    onSuccess()
                } else {
                    _errorMessage.value = response.body()?.error ?: "Failed to create department"
                }
            } catch (e: Exception) {
                _errorMessage.value = e.message
            }
        }
    }

    fun updateDepartment(id: String, name: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            try {
                val request = UpdateDepartmentRequest(id = id, name = name)
                val response = apiService.updateDepartment(request)
                if (response.isSuccessful) {
                    loadData()
                    onSuccess()
                } else {
                    _errorMessage.value = "Failed to update department"
                }
            } catch (e: Exception) {
                _errorMessage.value = e.message
            }
        }
    }

    fun deleteDepartment(id: String) {
        viewModelScope.launch {
            try {
                val response = apiService.deleteDepartment(id)
                if (response.isSuccessful) {
                    _departments.value = _departments.value.filter { it.id != id }
                }
            } catch (e: Exception) {
                _errorMessage.value = e.message
            }
        }
    }

    fun addAdmin(departmentId: String, userId: String) {
        viewModelScope.launch {
            try {
                val request = AddMemberRequest(userId = userId)
                val response = apiService.addDepartmentAdmin(departmentId, request)
                if (response.isSuccessful) {
                    loadData()
                }
            } catch (e: Exception) {
                _errorMessage.value = e.message
            }
        }
    }

    fun removeAdmin(departmentId: String, userId: String) {
        viewModelScope.launch {
            try {
                val response = apiService.removeDepartmentAdmin(departmentId, userId)
                if (response.isSuccessful) {
                    loadData()
                }
            } catch (e: Exception) {
                _errorMessage.value = e.message
            }
        }
    }

    fun addMember(departmentId: String, userId: String) {
        viewModelScope.launch {
            try {
                val request = AddMemberRequest(userId = userId)
                val response = apiService.addDepartmentMember(departmentId, request)
                if (response.isSuccessful) {
                    loadData()
                }
            } catch (e: Exception) {
                _errorMessage.value = e.message
            }
        }
    }

    fun removeMember(departmentId: String, userId: String) {
        viewModelScope.launch {
            try {
                val response = apiService.removeDepartmentMember(departmentId, userId)
                if (response.isSuccessful) {
                    loadData()
                }
            } catch (e: Exception) {
                _errorMessage.value = e.message
            }
        }
    }

    fun getUsersNotInDepartment(department: Department): List<User> {
        val allMemberIds = (department.adminIds + department.memberIds).toSet()
        return _users.value.filter { it.id !in allMemberIds }
    }

    fun getAdmins(department: Department): List<User> {
        return _users.value.filter { it.id in department.adminIds }
    }

    fun getMembers(department: Department): List<User> {
        return _users.value.filter { it.id in department.memberIds }
    }
}
