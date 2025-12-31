package com.ccoan.ny.ui.screens.schedule

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
class ScheduleViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _schedule = MutableStateFlow<SundaySchedule?>(null)
    val schedule: StateFlow<SundaySchedule?> = _schedule.asStateFlow()

    private val _canEdit = MutableStateFlow(false)
    val canEdit: StateFlow<Boolean> = _canEdit.asStateFlow()

    private val _scheduleAdminName = MutableStateFlow<String?>(null)
    val scheduleAdminName: StateFlow<String?> = _scheduleAdminName.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _currentDate = MutableStateFlow(nearestSunday(Date()))

    private val _displayedMonth = MutableStateFlow(Date())
    val displayedMonth: StateFlow<Date> = _displayedMonth.asStateFlow()

    private val _calendarDays = MutableStateFlow<List<Date>>(emptyList())
    val calendarDays: StateFlow<List<Date>> = _calendarDays.asStateFlow()

    private val calendar = Calendar.getInstance()

    init {
        updateCalendarDays()
    }

    private fun nearestSunday(date: Date): Date {
        val cal = Calendar.getInstance()
        cal.time = date
        val dayOfWeek = cal.get(Calendar.DAY_OF_WEEK)
        // Sunday is 1 in Calendar
        val daysUntilSunday = if (dayOfWeek == Calendar.SUNDAY) 0 else (8 - dayOfWeek)
        cal.add(Calendar.DAY_OF_MONTH, daysUntilSunday)
        return cal.time
    }

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

    private val dateString: String
        get() {
            val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            return formatter.format(_currentDate.value)
        }

    fun selectDate(date: Date) {
        _currentDate.value = date
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
        updateCalendarDays()
    }

    fun loadSchedule() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val response = apiService.getSchedule(dateString)
                if (response.isSuccessful) {
                    val body = response.body()
                    _schedule.value = body?.data
                    _canEdit.value = body?.canEdit ?: false
                    _scheduleAdminName.value = body?.scheduleAdminName
                }
            } catch (e: Exception) {
                // Handle error
            }
            _isLoading.value = false
        }
    }

    fun getAssignees(phase: String, department: String): String {
        return _schedule.value?.slots?.find {
            it.phase == phase && it.department == department
        }?.assignees ?: ""
    }

    fun updateSlot(phase: String, department: String, assignees: String) {
        viewModelScope.launch {
            val currentSlots = _schedule.value?.slots?.toMutableList() ?: mutableListOf()

            val existingIndex = currentSlots.indexOfFirst {
                it.phase == phase && it.department == department
            }

            if (existingIndex >= 0) {
                currentSlots[existingIndex] = currentSlots[existingIndex].copy(assignees = assignees)
            } else {
                currentSlots.add(ScheduleSlot(phase, department, assignees))
            }

            try {
                val request = UpdateScheduleRequest(date = dateString, slots = currentSlots)
                val response = apiService.updateSchedule(request)
                if (response.isSuccessful) {
                    _schedule.value = _schedule.value?.copy(slots = currentSlots)
                }
            } catch (e: Exception) {
                loadSchedule()
            }
        }
    }

    fun goToPreviousSunday() {
        val cal = Calendar.getInstance()
        cal.time = _currentDate.value
        cal.add(Calendar.DAY_OF_MONTH, -7)
        _currentDate.value = cal.time
        loadSchedule()
    }

    fun goToNextSunday() {
        val cal = Calendar.getInstance()
        cal.time = _currentDate.value
        cal.add(Calendar.DAY_OF_MONTH, 7)
        _currentDate.value = cal.time
        loadSchedule()
    }

    fun goToToday() {
        _currentDate.value = nearestSunday(Date())
        loadSchedule()
    }
}
