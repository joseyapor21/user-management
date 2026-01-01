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
import java.text.SimpleDateFormat
import java.util.*
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

    // Calendar state - weekly view
    private val _currentWeekStart = MutableStateFlow(getWeekStart(Date()))
    val currentWeekStart: StateFlow<Date> = _currentWeekStart.asStateFlow()

    private val _weekDays = MutableStateFlow<List<Date>>(emptyList())
    val weekDays: StateFlow<List<Date>> = _weekDays.asStateFlow()

    private val calendar = Calendar.getInstance()

    init {
        updateWeekDays()
    }

    // MARK: - Calendar Methods

    private fun getWeekStart(date: Date): Date {
        val cal = Calendar.getInstance()
        cal.time = date
        cal.firstDayOfWeek = Calendar.SUNDAY
        cal.set(Calendar.DAY_OF_WEEK, Calendar.SUNDAY)
        cal.set(Calendar.HOUR_OF_DAY, 0)
        cal.set(Calendar.MINUTE, 0)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        return cal.time
    }

    private fun updateWeekDays() {
        val days = mutableListOf<Date>()
        val cal = Calendar.getInstance()
        cal.time = _currentWeekStart.value

        for (i in 0 until 7) {
            days.add(cal.time)
            cal.add(Calendar.DAY_OF_MONTH, 1)
        }

        _weekDays.value = days
    }

    fun getWeekRangeString(): String {
        val days = _weekDays.value
        if (days.isEmpty()) return ""

        val startFormatter = SimpleDateFormat("MMM d", Locale.US)
        val endFormatter = SimpleDateFormat("MMM d, yyyy", Locale.US)

        return "${startFormatter.format(days.first())} - ${endFormatter.format(days.last())}"
    }

    fun goToPreviousWeek() {
        val cal = Calendar.getInstance()
        cal.time = _currentWeekStart.value
        cal.add(Calendar.DAY_OF_MONTH, -7)
        _currentWeekStart.value = cal.time
        updateWeekDays()
    }

    fun goToNextWeek() {
        val cal = Calendar.getInstance()
        cal.time = _currentWeekStart.value
        cal.add(Calendar.DAY_OF_MONTH, 7)
        _currentWeekStart.value = cal.time
        updateWeekDays()
    }

    fun goToCurrentWeek() {
        _currentWeekStart.value = getWeekStart(Date())
        updateWeekDays()
    }

    fun isToday(date: Date): Boolean {
        val todayCal = Calendar.getInstance()
        val dateCal = Calendar.getInstance().apply { time = date }
        return todayCal.get(Calendar.YEAR) == dateCal.get(Calendar.YEAR) &&
                todayCal.get(Calendar.DAY_OF_YEAR) == dateCal.get(Calendar.DAY_OF_YEAR)
    }

    fun meetingsForDate(date: Date): List<Meeting> {
        val dateFormatter = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val dateString = dateFormatter.format(date)
        return getFilteredMeetings()
            .filter { it.date == dateString }
            .sortedBy { it.startTime }
    }

    fun formatDayHeader(date: Date): String {
        val formatter = SimpleDateFormat("EEE", Locale.US)
        return formatter.format(date)
    }

    fun formatDayNumber(date: Date): String {
        val formatter = SimpleDateFormat("d", Locale.US)
        return formatter.format(date)
    }

    // MARK: - Filtering

    private fun getFilteredMeetings(): List<Meeting> {
        val deptId = _selectedDepartmentId.value
        return if (deptId != null) {
            _meetings.value.filter { it.departmentId == deptId }
        } else {
            _meetings.value
        }
    }

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
