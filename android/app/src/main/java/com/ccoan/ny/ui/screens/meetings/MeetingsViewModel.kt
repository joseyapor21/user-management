package com.ccoan.ny.ui.screens.meetings

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
class MeetingsViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _meetings = MutableStateFlow<List<Meeting>>(emptyList())
    val meetings: StateFlow<List<Meeting>> = _meetings.asStateFlow()

    private val _departments = MutableStateFlow<List<Department>>(emptyList())
    val departments: StateFlow<List<Department>> = _departments.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _selectedDepartmentId = MutableStateFlow<String?>(null)
    val selectedDepartmentId: StateFlow<String?> = _selectedDepartmentId.asStateFlow()

    fun loadData() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            try {
                val meetingsResponse = apiService.getMeetings()
                if (meetingsResponse.isSuccessful) {
                    _meetings.value = meetingsResponse.body()?.data ?: emptyList()
                }

                val deptResponse = apiService.getDepartments()
                if (deptResponse.isSuccessful) {
                    _departments.value = deptResponse.body()?.data ?: emptyList()
                }
            } catch (e: Exception) {
                _errorMessage.value = e.message
            }

            _isLoading.value = false
        }
    }

    fun setDepartmentFilter(deptId: String?) {
        _selectedDepartmentId.value = deptId
    }

    fun createMeeting(request: CreateMeetingRequest, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val response = apiService.createMeeting(request)
                if (response.isSuccessful && response.body()?.success == true) {
                    loadData()
                    onSuccess()
                } else {
                    _errorMessage.value = response.body()?.error ?: "Failed to create meeting"
                }
            } catch (e: Exception) {
                _errorMessage.value = e.message
            }
            _isLoading.value = false
        }
    }

    fun updateMeeting(request: UpdateMeetingRequest, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val response = apiService.updateMeeting(request)
                if (response.isSuccessful) {
                    loadData()
                    onSuccess()
                } else {
                    _errorMessage.value = "Failed to update meeting"
                }
            } catch (e: Exception) {
                _errorMessage.value = e.message
            }
            _isLoading.value = false
        }
    }

    fun deleteMeeting(id: String) {
        viewModelScope.launch {
            try {
                val response = apiService.deleteMeeting(id)
                if (response.isSuccessful) {
                    _meetings.value = _meetings.value.filter { it.id != id }
                }
            } catch (e: Exception) {
                _errorMessage.value = e.message
            }
        }
    }
}
