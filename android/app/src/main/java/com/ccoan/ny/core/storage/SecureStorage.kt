package com.ccoan.ny.core.storage

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.ccoan.ny.data.models.AuthUser
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SecureStorage @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val sharedPreferences: SharedPreferences = EncryptedSharedPreferences.create(
        context,
        "ccoan_secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    companion object {
        private const val KEY_AUTH_TOKEN = "auth_token"
        private const val KEY_CURRENT_USER = "current_user"
        private const val KEY_FCM_TOKEN = "fcm_token"
    }

    // Auth Token
    fun saveAuthToken(token: String) {
        sharedPreferences.edit().putString(KEY_AUTH_TOKEN, token).apply()
    }

    fun getAuthToken(): String? {
        return sharedPreferences.getString(KEY_AUTH_TOKEN, null)
    }

    fun deleteAuthToken() {
        sharedPreferences.edit().remove(KEY_AUTH_TOKEN).apply()
    }

    // Current User
    fun saveCurrentUser(user: AuthUser) {
        val adapter = moshi.adapter(AuthUser::class.java)
        val json = adapter.toJson(user)
        sharedPreferences.edit().putString(KEY_CURRENT_USER, json).apply()
    }

    fun getCurrentUser(): AuthUser? {
        val json = sharedPreferences.getString(KEY_CURRENT_USER, null) ?: return null
        return try {
            val adapter = moshi.adapter(AuthUser::class.java)
            adapter.fromJson(json)
        } catch (e: Exception) {
            null
        }
    }

    fun deleteCurrentUser() {
        sharedPreferences.edit().remove(KEY_CURRENT_USER).apply()
    }

    // FCM Token
    fun saveFcmToken(token: String) {
        sharedPreferences.edit().putString(KEY_FCM_TOKEN, token).apply()
    }

    fun getFcmToken(): String? {
        return sharedPreferences.getString(KEY_FCM_TOKEN, null)
    }

    // Clear all
    fun clearAll() {
        sharedPreferences.edit().clear().apply()
    }

    // Check if authenticated
    fun isAuthenticated(): Boolean {
        return getAuthToken() != null && getCurrentUser() != null
    }
}
