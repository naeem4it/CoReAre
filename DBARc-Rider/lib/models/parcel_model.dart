import '../core/constants/parcel_status.dart';
import 'delivery_attempt_model.dart';

class ParcelModel {
  final int id;
  final String trackingNumber;
  final String status;
  final double codAmount;
  final double weight;
  final double deliveryCharges;
  final String recipientName;
  final String recipientPhone;
  final String recipientAddress;
  final String? consigneeEmail;
  final String? consigneeAltPhone;
  final String allowToOpen; // 'Yes' or 'No'
  final String? comments;
  final int pieces;
  final String serviceType;
  final String shipmentType;
  final String? referenceNumber;
  final String? destinationCityName;
  final String? shipperName;
  final String? shipperPhone;
  final String? shipperAddress;
  final String paymentType; // 'COD' or 'PAID'
  final List<DeliveryAttemptModel> deliveryAttempts;
  final String? latestShipperAdvice;
  final String? latestAdviceStatus;

  ParcelModel({
    required this.id,
    required this.trackingNumber,
    required this.status,
    required this.codAmount,
    this.paymentType = 'COD',
    required this.weight,
    required this.deliveryCharges,
    required this.recipientName,
    required this.recipientPhone,
    required this.recipientAddress,
    this.consigneeEmail,
    this.consigneeAltPhone,
    this.allowToOpen = 'No',
    this.comments,
    this.pieces = 1,
    this.serviceType = 'Overnight',
    this.shipmentType = 'Parcel',
    this.referenceNumber,
    this.destinationCityName,
    this.shipperName,
    this.shipperPhone,
    this.shipperAddress,
    this.deliveryAttempts = const [],
    this.latestShipperAdvice,
    this.latestAdviceStatus,
  });

  ParcelDeliveryStatus get deliveryStatus => ParcelDeliveryStatusX.fromString(status);

  int get attemptCount => deliveryAttempts.length;

  bool get isPaid => paymentType.toUpperCase() == 'PAID' || codAmount <= 0;
  bool get isCod => !isPaid;

  // Lifecycle status helpers
  bool get isPickupReady => status == 'Booked' || status == 'Total Booking';
  bool get isPickedUp => status == 'Picked up by rider';
  bool get isOutForDelivery => status == 'Out for Delivery' || status == 'Out For delivery';
  bool get isDelivered => status == 'Delivered';
  bool get isFailedAttempt => status == 'Failed Attempt' || status == 'Ready To Return' || status == 'Delivery Failed';

  bool get hasActiveShipperAdvice =>
      latestShipperAdvice != null &&
      latestShipperAdvice!.isNotEmpty &&
      latestAdviceStatus != 'Failed';

  static String _extractCity(dynamic destCity, String recipientAddress) {
    if (destCity is Map) {
      final name = destCity['CityName'] ?? destCity['city_name'] ?? destCity['name'] ?? destCity['attributes']?['CityName'] ?? destCity['attributes']?['name'];
      if (name != null && name.toString().trim().isNotEmpty && name.toString().trim().toLowerCase() != 'destination') {
        return name.toString().trim();
      }
    } else if (destCity is String && destCity.trim().isNotEmpty && destCity.trim().toLowerCase() != 'destination') {
      return destCity.trim();
    }

    if (recipientAddress.isNotEmpty) {
      const commonCities = [
        'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan',
        'Peshawar', 'Quetta', 'Gujranwala', 'Sialkot', 'Hyderabad', 'Sukkur',
        'Bahawalpur', 'Sargodha', 'Abbottabad', 'Mardan', 'Gujrat', 'Sahiwal',
        'Larkana', 'Sheikhupura', 'Jhelum', 'Okara', 'Rahim Yar Khan', 'Kasur'
      ];
      final parts = recipientAddress.split(',').map((s) => s.trim()).toList();
      for (int i = parts.length - 1; i >= 0; i--) {
        final p = parts[i];
        for (final c in commonCities) {
          if (RegExp('\\b$c\\b', caseSensitive: false).hasMatch(p)) {
            return c;
          }
        }
      }
      if (parts.isNotEmpty) {
        final last = parts.last;
        if (last.length <= 25 && !RegExp(r'^\d+$').hasMatch(last) && last.toLowerCase() != 'pakistan') {
          return last;
        }
      }
    }
    return 'Lahore';
  }

  factory ParcelModel.fromJson(Map<String, dynamic> json) {
    final attributes = json['attributes'] ?? json;
    
    // Parse attempts
    final rawAttempts = attributes['delivery_attempts']?['data'] ?? attributes['delivery_attempts'];
    List<DeliveryAttemptModel> attempts = [];
    if (rawAttempts is List) {
      attempts = rawAttempts.map((item) => DeliveryAttemptModel.fromJson(item)).toList();
    }

    String? latestAdvice;
    String? adviceStatus;
    if (attempts.isNotEmpty) {
      final latest = attempts.last;
      latestAdvice = latest.shipperAdvice;
      adviceStatus = latest.adviceStatus;
    }

    final double cod = double.tryParse(attributes['cod_amount']?.toString() ?? '0') ?? 0.0;
    final String rawPaymentType = (attributes['payment_type']?.toString() ?? (cod == 0 ? 'PAID' : 'COD')).toUpperCase();

    final rawShipper = attributes['shipper']?['data']?['attributes'] ?? attributes['shipper'];
    final String sName = (rawShipper is Map ? (rawShipper['name'] ?? rawShipper['shipper_name']) : null) ?? 'Shipper';
    final String? sPhone = rawShipper is Map ? (rawShipper['phone'] ?? rawShipper['contact_number']) : null;
    final String? sAddress = rawShipper is Map ? (rawShipper['address'] ?? rawShipper['city']) : null;

    final rawDestCity = attributes['destination_city']?['data']?['attributes'] ?? attributes['destination_city'];
    final String addr = attributes['recipient_address']?.toString() ?? '';

    return ParcelModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      trackingNumber: attributes['tracking_number'] ?? '',
      status: attributes['status'] ?? 'Booked',
      codAmount: cod,
      paymentType: rawPaymentType == 'PAID' ? 'PAID' : 'COD',
      weight: double.tryParse(attributes['weight']?.toString() ?? '1') ?? 1.0,
      deliveryCharges: double.tryParse(attributes['delivery_charges']?.toString() ?? '0') ?? 0.0,
      recipientName: attributes['recipient_name'] ?? '',
      recipientPhone: attributes['recipient_phone'] ?? '',
      recipientAddress: addr,
      consigneeEmail: attributes['consignee_email'],
      consigneeAltPhone: attributes['consignee_alt_phone'],
      allowToOpen: attributes['allow_to_open'] ?? 'No',
      comments: attributes['comments'],
      pieces: int.tryParse(attributes['pieces']?.toString() ?? '1') ?? 1,
      serviceType: attributes['service_type'] ?? 'Overnight',
      shipmentType: attributes['shipment_type'] ?? 'Parcel',
      referenceNumber: attributes['reference_number'],
      destinationCityName: _extractCity(rawDestCity, addr),
      shipperName: sName,
      shipperPhone: sPhone,
      shipperAddress: sAddress,
      deliveryAttempts: attempts,
      latestShipperAdvice: latestAdvice ?? attributes['shipper_advice'],
      latestAdviceStatus: adviceStatus ?? attributes['advice_status'],
    );
  }

  ParcelModel copyWith({
    String? status,
    String? comments,
    String? paymentType,
    List<DeliveryAttemptModel>? deliveryAttempts,
    String? latestShipperAdvice,
    String? latestAdviceStatus,
    String? shipperName,
    String? shipperPhone,
    String? shipperAddress,
  }) {
    return ParcelModel(
      id: id,
      trackingNumber: trackingNumber,
      status: status ?? this.status,
      codAmount: codAmount,
      paymentType: paymentType ?? this.paymentType,
      weight: weight,
      deliveryCharges: deliveryCharges,
      recipientName: recipientName,
      recipientPhone: recipientPhone,
      recipientAddress: recipientAddress,
      consigneeEmail: consigneeEmail,
      consigneeAltPhone: consigneeAltPhone,
      allowToOpen: allowToOpen,
      comments: comments ?? this.comments,
      pieces: pieces,
      serviceType: serviceType,
      shipmentType: shipmentType,
      referenceNumber: referenceNumber,
      destinationCityName: destinationCityName,
      shipperName: shipperName ?? this.shipperName,
      shipperPhone: shipperPhone ?? this.shipperPhone,
      shipperAddress: shipperAddress ?? this.shipperAddress,
      deliveryAttempts: deliveryAttempts ?? this.deliveryAttempts,
      latestShipperAdvice: latestShipperAdvice ?? this.latestShipperAdvice,
      latestAdviceStatus: latestAdviceStatus ?? this.latestAdviceStatus,
    );
  }
}
