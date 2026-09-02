class AppConstants {
  static const String appName = 'DBARc Rider';
  static const String appVersion = '1.0.0';

  // Default Base URL for Strapi backend
  // For Android Emulator: http://10.0.2.2:1337/api
  // For Physical Device / LAN: User can override in settings
  static const String defaultBaseUrl = 'http://10.0.2.2:1337/api';
  static const String defaultLocalhostUrl = 'http://localhost:1337/api';

  // Storage Keys
  static const String keyAuthToken = 'dbarc_jwt_token';
  static const String keyUserData = 'dbarc_user_data';
  static const String keyRiderData = 'dbarc_rider_data';
  static const String keyCustomBaseUrl = 'dbarc_custom_base_url';
  static const String keyOfflineQueue = 'dbarc_offline_queue';

  // Business Rules
  static const int maxDeliveryAttempts = 3;
  static const int shipperAdviseSlaHours = 48;
}
