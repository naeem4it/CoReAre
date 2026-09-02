import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../core/network/api_client.dart';
import '../core/network/api_endpoints.dart';
import '../core/storage/storage_service.dart';
import '../models/user_model.dart';
import '../models/rider_model.dart';

enum AuthStatus { initial, authenticating, authenticated, unauthenticated, error }

class AuthProvider extends ChangeNotifier {
  final ApiClient _api = ApiClient();
  final StorageService _storage = StorageService();

  AuthStatus _status = AuthStatus.initial;
  UserModel? _user;
  RiderModel? _rider;
  String? _errorMessage;

  AuthStatus get status => _status;
  UserModel? get user => _user;
  RiderModel? get rider => _rider;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _status == AuthStatus.authenticated;

  Future<void> tryAutoLogin() async {
    final token = await _storage.getToken();
    if (token == null || token.isEmpty) {
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return;
    }

    try {
      final userJson = _storage.getUserData();
      final riderJson = _storage.getRiderData();

      if (userJson != null) {
        _user = UserModel.fromJson(jsonDecode(userJson));
      }
      if (riderJson != null) {
        _rider = RiderModel.fromJson(jsonDecode(riderJson));
      }

      // Verify token with backend /users/me
      final res = await _api.dio.get(ApiEndpoints.me, queryParameters: {'populate': '*'});
      if (res.statusCode == 200) {
        _user = UserModel.fromJson(res.data);
        await _storage.saveUserData(jsonEncode(_user!.toJson()));
        _status = AuthStatus.authenticated;
      } else {
        await logout();
      }
    } catch (e) {
      // In offline scenario, keep cached auth if available
      if (_user != null) {
        _status = AuthStatus.authenticated;
      } else {
        _status = AuthStatus.unauthenticated;
      }
    }
    notifyListeners();
  }

  Future<bool> login(String identifier, String password) async {
    _status = AuthStatus.authenticating;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await _api.dio.post(
        ApiEndpoints.login,
        data: {
          'identifier': identifier.trim(),
          'password': password,
        },
      );

      if (res.statusCode == 200 && res.data != null) {
        final jwt = res.data['jwt'];
        final userMap = res.data['user'];

        await _storage.saveToken(jwt);
        _user = UserModel.fromJson(userMap);
        await _storage.saveUserData(jsonEncode(_user!.toJson()));

        // Fetch associated Rider record
        await _fetchAssociatedRider(_user!);

        _status = AuthStatus.authenticated;
        notifyListeners();
        return true;
      } else {
        _errorMessage = 'Invalid response from server.';
        _status = AuthStatus.error;
        notifyListeners();
        return false;
      }
    } on DioException catch (dioErr) {
      _status = AuthStatus.error;
      if (dioErr.response?.data != null && dioErr.response?.data['error'] != null) {
        _errorMessage = dioErr.response?.data['error']['message'] ?? 'Authentication failed.';
      } else if (dioErr.type == DioExceptionType.connectionTimeout ||
                 dioErr.type == DioExceptionType.connectionError) {
        _errorMessage = 'Cannot connect to server. Check IP/Base URL.';
      } else {
        _errorMessage = dioErr.message ?? 'An error occurred during login.';
      }
      notifyListeners();
      return false;
    } catch (e) {
      _status = AuthStatus.error;
      _errorMessage = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<void> _fetchAssociatedRider(UserModel user) async {
    try {
      final res = await _api.dio.get(
        ApiEndpoints.riders,
        queryParameters: {
          'filters[\$or][0][email][\$eq]': user.email,
          'filters[\$or][1][rider_code][\$eq]': user.username,
          'populate': '*',
        },
      );
      final list = res.data?['data'] ?? [];
      if (list is List && list.isNotEmpty) {
        _rider = RiderModel.fromJson(list.first);
        await _storage.saveRiderData(jsonEncode(_rider!.toJson()));
      } else {
        // Fallback rider object from user
        _rider = RiderModel(
          id: user.id,
          name: user.username,
          phone: '',
          email: user.email,
          riderCode: user.username,
        );
      }
    } catch (e) {
      // Fallback
      _rider = RiderModel(
        id: user.id,
        name: user.username,
        phone: '',
        email: user.email,
        riderCode: user.username,
      );
    }
  }

  Future<void> logout() async {
    await _storage.clearAll();
    _user = null;
    _rider = null;
    _status = AuthStatus.unauthenticated;
    _errorMessage = null;
    notifyListeners();
  }
}
