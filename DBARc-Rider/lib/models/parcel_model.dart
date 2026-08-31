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
  final List<DeliveryAttemptModel> deliveryAttempts;
  final String? latestShipperAdvice;
  final String? latestAdviceStatus;

  ParcelModel({
    required this.id,
    required this.trackingNumber,
    required this.status,
    required this.codAmount,
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
    this.deliveryAttempts = const [],
    this.latestShipperAdvice,
    this.latestAdviceStatus,
  });

  ParcelDeliveryStatus get deliveryStatus => ParcelDeliveryStatusX.fromString(status);

  int get attemptCount => deliveryAttempts.length;

  bool get hasActiveShipperAdvice =>
      latestShipperAdvice != null &&
      latestShipperAdvice!.isNotEmpty &&
      latestAdviceStatus != 'Failed';

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

    return ParcelModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      trackingNumber: attributes['tracking_number'] ?? '',
      status: attributes['status'] ?? 'Total Booking',
      codAmount: double.tryParse(attributes['cod_amount']?.toString() ?? '0') ?? 0.0,
      weight: double.tryParse(attributes['weight']?.toString() ?? '1') ?? 1.0,
      deliveryCharges: double.tryParse(attributes['delivery_charges']?.toString() ?? '0') ?? 0.0,
      recipientName: attributes['recipient_name'] ?? '',
      recipientPhone: attributes['recipient_phone'] ?? '',
      recipientAddress: attributes['recipient_address'] ?? '',
      consigneeEmail: attributes['consignee_email'],
      consigneeAltPhone: attributes['consignee_alt_phone'],
      allowToOpen: attributes['allow_to_open'] ?? 'No',
      comments: attributes['comments'],
      pieces: int.tryParse(attributes['pieces']?.toString() ?? '1') ?? 1,
      serviceType: attributes['service_type'] ?? 'Overnight',
      shipmentType: attributes['shipment_type'] ?? 'Parcel',
      referenceNumber: attributes['reference_number'],
      destinationCityName: attributes['destination_city']?['data']?['attributes']?['name'] ??
          attributes['destination_city']?['name'],
      shipperName: attributes['shipper']?['data']?['attributes']?['name'] ??
          attributes['shipper']?['name'],
      deliveryAttempts: attempts,
      latestShipperAdvice: latestAdvice ?? attributes['shipper_advice'],
      latestAdviceStatus: adviceStatus ?? attributes['advice_status'],
    );
  }

  ParcelModel copyWith({
    String? status,
    List<DeliveryAttemptModel>? deliveryAttempts,
    String? latestShipperAdvice,
    String? latestAdviceStatus,
  }) {
    return ParcelModel(
      id: id,
      trackingNumber: trackingNumber,
      status: status ?? this.status,
      codAmount: codAmount,
      weight: weight,
      deliveryCharges: deliveryCharges,
      recipientName: recipientName,
      recipientPhone: recipientPhone,
      recipientAddress: recipientAddress,
      consigneeEmail: consigneeEmail,
      consigneeAltPhone: consigneeAltPhone,
      allowToOpen: allowToOpen,
      comments: comments,
      pieces: pieces,
      serviceType: serviceType,
      shipmentType: shipmentType,
      referenceNumber: referenceNumber,
      destinationCityName: destinationCityName,
      shipperName: shipperName,
      deliveryAttempts: deliveryAttempts ?? this.deliveryAttempts,
      latestShipperAdvice: latestShipperAdvice ?? this.latestShipperAdvice,
      latestAdviceStatus: latestAdviceStatus ?? this.latestAdviceStatus,
    );
  }
}
