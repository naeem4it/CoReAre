class AppConstants {
  static const String appName = 'DBARc Rider';
  static const String appVersion = '1.0.0';

  // Default Base URL for Strapi backend (Production / TestFlight)
  static const String defaultBaseUrl = 'https://api.dbarc.mashrue.com/api';
  static const String defaultLocalhostUrl = 'http://127.0.0.1:1337/api';

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
