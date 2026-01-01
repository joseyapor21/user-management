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

    // Calendar state
    private val _displayedMonth = MutableStateFlow(Date())
    val displayedMonth: StateFlow<Date> = _displayedMonth.asStateFlow()

    private val _selectedDate = MutableStateFlow<Date?>(null)
    val selectedDate: StateFlow<Date?> = _selectedDate.asStateFlow()

    private val _calendarDays = MutableStateFlow<List<Date>>(emptyList())
    val calendarDays: StateFlow<List<Date>> = _calendarDays.asStateFlow()

    private val calendar = Calendar.getInstance()

    init {
        updateCalendarDays()
    }

    // MARK: - Calendar Methods

    private fun updateCalendarDays() {
        val days = mutableListOf<Date>()
        val cal = Calendar.getInstance()
        cal.time = _displayedMonth.value

        // Go to first day of month
        cal.set(Calendar.DAY_OF_MONTH, 1)

        // Go back to Sunday of the first week
        val firstDayOfWeek = cal.get(Calendar.DAY_OF_WEEK)
        cal.add(Calendar.DAY_OF_MONTH, -(firstDayOfWeek - Calendar.SUNDAY))

        // Generate 42 days (6 weeks)
        repeat(42) {
            days.add(cal.time)
            cal.add(Calendar.DAY_OF_MONTH, 1)
        }

        _calendarDays.value = days
    }

    fun getMonthYearString(): String {
        val formatter = SimpleDateFormat("MMMM yyyy", Locale.US)
        return formatter.format(_displayedMonth.value)
    }

    fun goToPreviousMonth() {
        val cal = Calendar.getInstance()
        cal.time = _displayedMonth.value
        cal.add(Calendar.MONTH, -1)
        _displayedMonth.value = cal.time
        updateCalendarDays()
    }

    fun goToNextMonth() {
        val cal = Calendar.getInstance()
        cal.time = _displayedMonth.value
        cal.add(Calendar.MONTH, 1)
        _displayedMonth.value = cal.time
        updateCalendarDays()
    }

    fun goToCurrentMonth() {
        _displayedMonth.value = Date()
        _selectedDate.value = null
        updateCalendarDays()
    }

    fun selectDate(date: Date?) {
        _selectedDate.value = date
    }

    fun isCurrentMonth(date: Date): Boolean {
        val displayCal = Calendar.getInstance().apply { time = _displayedMonth.value }
        val dateCal = Calendar.getInstance().apply { time = date }
        return displayCal.get(Calendar.MONTH) == dateCal.get(Calendar.MONTH) &&
                displayCal.get(Calendar.YEAR) == dateCal.get(Calendar.YEAR)
    }

    fun isToday(date: Date): Boolean {
        val todayCal = Calendar.getInstance()
        val dateCal = Calendar.getInstance().apply { time = date }
        return todayCal.get(Calendar.YEAR) == dateCal.get(Calendar.YEAR) &&
                todayCal.get(Calendar.DAY_OF_YEAR) == dateCal.get(Calendar.DAY_OF_YEAR)
    }

    fun isSelected(date: Date): Boolean {
        val selected = _selectedDate.value ?: return false
        val selectedCal = Calendar.getInstance().apply { time = selected }
        val dateCal = Calendar.getInstance().apply { time = date }
        return selectedCal.get(Calendar.YEAR) == dateCal.get(Calendar.YEAR) &&
                selectedCal.get(Calendar.DAY_OF_YEAR) == dateCal.get(Calendar.DAY_OF_YEAR)
    }

    fun hasMeetings(date: Date): Boolean {
        val dateFormatter = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val dateString = dateFormatter.format(date)
        return getFilteredMeetings().any { it.date == dateString }
    }

    fun meetingsForDate(date: Date): List<Meeting> {
        val dateFormatter = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val dateString = dateFormatter.format(date)
        return getFilteredMeetings()
            .filter { it.date == dateString }
            .sortedBy { it.startTime }
    }

    fun formatSelectedDate(date: Date): String {
        val formatter = SimpleDateFormat("EEEE, MMMM d, yyyy", Locale.US)
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

    fun getUpcomingMeetings(): List<Meeting> {
        return getFilteredMeetings()
            .filter { it.isUpcoming }
            .sortedBy { it.date }
    }

    fun getPastMeetings(): List<Meeting> {
        return getFilteredMeetings()
            .filter { !it.isUpcoming }
            .sortedByDescending { it.date }
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
