class ApiEndpoints {
  // Auth & Profile
  static const String login = '/auth/local';
  static const String me = '/users/me';
  
  // Delivery Sheets (Run Sheets)
  static const String deliverySheets = '/delivery-sheets';
  static String deliverySheetById(int id) => '/delivery-sheets/$id';

  // Parcels
  static const String parcels = '/parcels';
  static String parcelById(int id) => '/parcels/$id';

  // Delivery Attempts (Shipper Advise & Failure Telemetry)
  static const String deliveryAttempts = '/delivery-attempts';
  static String deliveryAttemptById(int id) => '/delivery-attempts/$id';

  // Riders
  static const String riders = '/riders';
  static String riderById(int id) => '/riders/$id';
}
