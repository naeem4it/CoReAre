import 'dart:convert';
import 'package:dio/dio.dart';

void main() async {
  final dio = Dio();
  try {
    final loginRes = await dio.post('http://127.0.0.1:1337/api/auth/local', data: {
      'identifier': 'ginjeeerider#1',
      'password': 'Password123!',
    });
    final token = loginRes.data['jwt'];
    print('Logged in successfully!');

    final res = await dio.get(
      'http://127.0.0.1:1337/api/delivery-sheets?populate[0]=parcels&populate[1]=parcels.destination_city&populate[2]=parcels.shipper&populate[3]=rider&sort[0]=id:desc',
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    print('Got delivery sheets: ${res.data['data'].length}');
    final sheetJson = res.data['data'][0];
    print('Sheet ID: ${sheetJson['id']}, Parcels count: ${sheetJson['parcels']?.length}');

    final rawParcels = sheetJson['parcels'] as List;
    for (int i = 0; i < rawParcels.length; i++) {
      final p = rawParcels[i];
      print('\nTesting parcel index $i (id: ${p['id']}):');
      try {
        // Test parsing fields
        final cod = double.tryParse(p['cod_amount']?.toString() ?? '0') ?? 0.0;
        final rawPaymentType = (p['payment_type']?.toString() ?? (cod == 0 ? 'PAID' : 'COD')).toUpperCase();
        final weight = double.tryParse(p['weight']?.toString() ?? '1') ?? 1.0;
        final deliveryCharges = double.tryParse(p['delivery_charges']?.toString() ?? '0') ?? 0.0;
        final pieces = int.tryParse(p['pieces']?.toString() ?? '1') ?? 1;
        print('  Tracking: ${p['tracking_number']}, status: ${p['status']}, dest: ${p['destination_city']}');
        print('  cod: $cod, weight: $weight, charges: $deliveryCharges, pieces: $pieces');
        
        // Test destinationCityName
        final destName = p['destination_city']?['CityName'] ?? p['destination_city']?['city_name'] ?? p['destination_city']?['name'];
        print('  Resolved dest name: $destName');
        
        // Test attempts
        final rawAttempts = p['delivery_attempts'];
        print('  rawAttempts: $rawAttempts');
      } catch (err, stack) {
        print('  ERROR parsing parcel $i: $err\n$stack');
      }
    }
  } catch (e, stack) {
    print('Top level error: $e\n$stack');
  }
}
