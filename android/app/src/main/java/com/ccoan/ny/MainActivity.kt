package com.ccoan.ny

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import com.ccoan.ny.ui.screens.auth.AuthViewModel
import com.ccoan.ny.ui.screens.auth.LoginScreen
import com.ccoan.ny.ui.screens.dashboard.DashboardScreen
import com.ccoan.ny.ui.theme.CCOANTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Handle deep link from notification
        val taskId = intent.getStringExtra("taskId")
        val tab = intent.getStringExtra("tab")

        setContent {
            CCOANTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val authViewModel: AuthViewModel = hiltViewModel()
                    val isAuthenticated by authViewModel.isAuthenticated.collectAsState()
                    val currentUser by authViewModel.currentUser.collectAsState()

                    if (isAuthenticated) {
                        DashboardScreen(
                            isSuperUser = currentUser?.isSuperUser ?: false,
                            initialTab = tab,
                            initialTaskId = taskId,
                            onLogout = { authViewModel.logout() }
                        )
                    } else {
                        LoginScreen(
                            viewModel = authViewModel,
                            onLoginSuccess = { /* Navigation handled by state */ }
                        )
                    }
                }
            }
        }
    }
}
