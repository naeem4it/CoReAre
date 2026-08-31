class DeliveryAttemptModel {
  final int id;
  final String attemptTime;
  final String status; // 'Attempt 1', 'Attempt 2', 'Attempt 3'
  final String failureReason;
  final String? shipperAdvice;
  final String adviceStatus; // 'Awaiting advice', 'Resolved', 'Failed'
  final String? riderNotes;
  final String? createdAt;

  DeliveryAttemptModel({
    required this.id,
    required this.attemptTime,
    required this.status,
    required this.failureReason,
    this.shipperAdvice,
    this.adviceStatus = 'Awaiting advice',
    this.riderNotes,
    this.createdAt,
  });

  factory DeliveryAttemptModel.fromJson(Map<String, dynamic> json) {
    final attributes = json['attributes'] ?? json;
    return DeliveryAttemptModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      attemptTime: attributes['attempt_time'] ?? attributes['createdAt'] ?? '',
      status: attributes['status'] ?? 'Attempt 1',
      failureReason: attributes['failure_reason'] ?? 'Not specified',
      shipperAdvice: attributes['shipper_advice'],
      adviceStatus: attributes['advice_status'] ?? 'Awaiting advice',
      riderNotes: attributes['rider_notes'],
      createdAt: attributes['createdAt'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'attempt_time': attemptTime,
      'status': status,
      'failure_reason': failureReason,
      'shipper_advice': shipperAdvice,
      'advice_status': adviceStatus,
      'rider_notes': riderNotes,
    };
  }
}
