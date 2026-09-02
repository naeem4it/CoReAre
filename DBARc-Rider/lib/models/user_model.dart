class UserModel {
  final int id;
  final String username;
  final String email;
  final String? tenantName;
  final int? tenantId;

  UserModel({
    required this.id,
    required this.username,
    required this.email,
    this.tenantName,
    this.tenantId,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      username: json['username'] ?? '',
      email: json['email'] ?? '',
      tenantName: json['tenant']?['name'] ?? json['tenant_name'],
      tenantId: json['tenant']?['id'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'email': email,
      'tenant_name': tenantName,
      'tenant_id': tenantId,
    };
  }
}
