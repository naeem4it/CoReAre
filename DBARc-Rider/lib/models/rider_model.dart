class RiderModel {
  final int id;
  final String name;
  final String phone;
  final String? email;
  final String? riderCode;
  final String status;
  final String? tenantName;
  final int? tenantId;

  RiderModel({
    required this.id,
    required this.name,
    required this.phone,
    this.email,
    this.riderCode,
    this.status = 'active',
    this.tenantName,
    this.tenantId,
  });

  factory RiderModel.fromJson(Map<String, dynamic> json) {
    final attributes = json['attributes'] ?? json;
    return RiderModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id']?.toString() ?? '0') ?? 0,
      name: attributes['name'] ?? '',
      phone: attributes['phone'] ?? '',
      email: attributes['email'],
      riderCode: attributes['rider_code'],
      status: attributes['status'] ?? 'active',
      tenantName: attributes['tenant']?['data']?['attributes']?['name'] ?? attributes['tenant_name'],
      tenantId: attributes['tenant']?['data']?['id'] ?? attributes['tenant_id'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'email': email,
      'rider_code': riderCode,
      'status': status,
      'tenant_name': tenantName,
      'tenant_id': tenantId,
    };
  }
}
