import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/app_constants.dart';

class StorageService {
  static final StorageService _instance = StorageService._internal();
  factory StorageService() => _instance;
  StorageService._internal();

  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();
  SharedPreferences? _prefs;

  Future<void> init() async {
    try {
      _prefs ??= await SharedPreferences.getInstance();
    } catch (e) {
      debugPrint('SharedPreferences init error: $e');
    }
  }

  // Auth Token (Web-safe fallback)
  Future<void> saveToken(String token) async {
    await init();
    try {
      if (!kIsWeb) {
        await _secureStorage.write(key: AppConstants.keyAuthToken, value: token);
      }
    } catch (_) {}
    await _prefs?.setString(AppConstants.keyAuthToken, token);
  }

  Future<String?> getToken() async {
    await init();
    try {
      if (!kIsWeb) {
        final secure = await _secureStorage.read(key: AppConstants.keyAuthToken);
        if (secure != null && secure.isNotEmpty) return secure;
      }
    } catch (_) {}
    return _prefs?.getString(AppConstants.keyAuthToken);
  }

  Future<void> clearToken() async {
    await init();
    try {
      if (!kIsWeb) {
        await _secureStorage.delete(key: AppConstants.keyAuthToken);
      }
    } catch (_) {}
    await _prefs?.remove(AppConstants.keyAuthToken);
  }

  // Base URL
  Future<void> saveBaseUrl(String url) async {
    await init();
    await _prefs?.setString(AppConstants.keyCustomBaseUrl, url);
  }

  String getBaseUrl() {
    return _prefs?.getString(AppConstants.keyCustomBaseUrl) ?? 
      (kIsWeb ? AppConstants.defaultLocalhostUrl : AppConstants.defaultBaseUrl);
  }

  // User & Rider info
  Future<void> saveUserData(String jsonString) async {
    await init();
    await _prefs?.setString(AppConstants.keyUserData, jsonString);
  }

  String? getUserData() {
    return _prefs?.getString(AppConstants.keyUserData);
  }

  Future<void> saveRiderData(String jsonString) async {
    await init();
    await _prefs?.setString(AppConstants.keyRiderData, jsonString);
  }

  String? getRiderData() {
    return _prefs?.getString(AppConstants.keyRiderData);
  }

  // Clear session
  Future<void> clearAll() async {
    await clearToken();
    await init();
    await _prefs?.remove(AppConstants.keyUserData);
    await _prefs?.remove(AppConstants.keyRiderData);
  }
}
