import 'parcel_model.dart';
import 'rider_model.dart';

class DeliverySheetModel {
  final int id;
  final String sheetNumber;
  final String sheetDate;
  final String? routeCode;
  final String? customName;
  final String status;
  final RiderModel? rider;
  final List<ParcelModel> parcels;

  DeliverySheetModel({
    required this.id,
    required this.sheetNumber,
    required this.sheetDate,
    this.routeCode,
    this.customName,
    this.status = 'Pending',
    this.rider,
    this.parcels = const [],
  });

  // Derived KPIs
  int get totalParcels => parcels.length;
  int get deliveredCount => parcels.where((p) => p.status == 'Delivered').length;
  int get pendingCount => parcels.where((p) => p.status != 'Delivered' && p.status != 'Ready To Return').length;
  int get failedCount => parcels.where((p) => p.status == 'Failed Attempt' || p.status == 'Ready To Return').length;
  
  double get totalExpectedCod => parcels.fold(0.0, (sum, p) => sum + p.codAmount);
  double get totalCollectedCod => parcels
      .where((p) => p.status == 'Delivered')
      .fold(0.0, (sum, p) => sum + p.codAmount);

  factory DeliverySheetModel.fromJson(Map<String, dynamic> json) {
    final attributes = json['attributes'] ?? json;

    // Parse parcels
    final rawParcels = attributes['parcels']?['data'] ?? attributes['parcels'];
    List<ParcelModel> parsedParcels = [];
    if (rawParcels is List) {
      parsedParcels = rawParcels.map((item) => ParcelModel.fromJson(item)).toList();
    }

    // Parse rider
    RiderModel? parsedRider;
    final rawRider = attributes['rider']?['data'] ?? attributes['rider'];
    if (rawRider != null && rawRider is Map<String, dynamic>) {
      parsedRider = RiderModel.fromJson(rawRider);
    }

    return DeliverySheetModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      sheetNumber: attributes['sheet_number'] ?? '',
      sheetDate: attributes['sheet_date'] ?? '',
      routeCode: attributes['route_code'],
      customName: attributes['custom_name'],
      status: attributes['status'] ?? 'Pending',
      rider: parsedRider,
      parcels: parsedParcels,
    );
  }
}
