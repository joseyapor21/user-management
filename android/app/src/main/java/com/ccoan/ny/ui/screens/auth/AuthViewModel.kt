package com.ccoan.ny.ui.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ccoan.ny.core.network.ApiService
import com.ccoan.ny.core.storage.SecureStorage
import com.ccoan.ny.data.models.AuthUser
import com.ccoan.ny.data.models.LoginRequest
import com.ccoan.ny.data.models.UpdateProfileRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val apiService: ApiService,
    private val secureStorage: SecureStorage
) : ViewModel() {

    private val _isAuthenticated = MutableStateFlow(secureStorage.isAuthenticated())
    val isAuthenticated: StateFlow<Boolean> = _isAuthenticated.asStateFlow()

    private val _currentUser = MutableStateFlow(secureStorage.getCurrentUser())
    val currentUser: StateFlow<AuthUser?> = _currentUser.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    val isSuperUser: Boolean
        get() = _currentUser.value?.isSuperUser ?: false

    val isAdmin: Boolean
        get() = _currentUser.value?.isAdmin ?: false

    fun login(email: String, password: String) {
        if (email.isBlank() || password.isBlank()) {
            _errorMessage.value = "Please enter email and password"
            return
        }

        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            try {
                val response = apiService.login(LoginRequest(email, password))

                if (response.isSuccessful) {
                    val body = response.body()
                    if (body?.success == true && body.data != null) {
                        val loginData = body.data
                        secureStorage.saveAuthToken(loginData.token)
                        secureStorage.saveCurrentUser(loginData.user)
                        _currentUser.value = loginData.user
                        _isAuthenticated.value = true
                    } else {
                        _errorMessage.value = body?.error ?: "Login failed"
                    }
                } else {
                    val errorBody = response.errorBody()?.string()
                    _errorMessage.value = when (response.code()) {
                        401 -> "Invalid email or password"
                        404 -> "User not found"
                        else -> errorBody ?: "Login failed"
                    }
                }
            } catch (e: Exception) {
                _errorMessage.value = e.message ?: "Network error"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun logout() {
        secureStorage.clearAll()
        _currentUser.value = null
        _isAuthenticated.value = false
    }

    fun updateProfile(name: String?, password: String?, onSuccess: () -> Unit = {}) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null

            try {
                val response = apiService.updateProfile(
                    UpdateProfileRequest(name = name, password = password)
                )

                if (response.isSuccessful) {
                    val body = response.body()
                    if (body?.success == true && body.data != null) {
                        val user = body.data
                        val authUser = AuthUser(
                            id = user.id,
                            email = user.email,
                            name = user.name,
                            isAdmin = user.isAdmin,
                            isSuperUser = user.isSuperUser
                        )
                        secureStorage.saveCurrentUser(authUser)
                        _currentUser.value = authUser
                        onSuccess()
                    } else {
                        _errorMessage.value = body?.error ?: "Update failed"
                    }
                } else {
                    _errorMessage.value = "Update failed"
                }
            } catch (e: Exception) {
                _errorMessage.value = e.message ?: "Network error"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun clearError() {
        _errorMessage.value = null
    }
}
