import 'dart:convert';
import 'package:dio/dio.dart';
import 'lib/models/delivery_sheet_model.dart';
import 'lib/models/parcel_model.dart';

void main() async {
  final dio = Dio();
  try {
    final loginRes = await dio.post('http://127.0.0.1:1337/api/auth/local', data: {
      'identifier': 'ginjeeerider#1',
      'password': 'Password123!',
    });
    final token = loginRes.data['jwt'];

    final res = await dio.get(
      'http://127.0.0.1:1337/api/delivery-sheets?populate[0]=parcels&populate[1]=parcels.destination_city&populate[2]=parcels.shipper&populate[3]=rider&sort[0]=id:desc',
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    final sheetJson = res.data['data'][0];
    print('Testing DeliverySheetModel.fromJson...');
    final model = DeliverySheetModel.fromJson(sheetJson);
    print('SUCCESS! Sheet ID: ${model.id}');
    print('Total parcels: ${model.totalParcels}');
    print('Delivered count: ${model.deliveredCount}');
    print('Pending count: ${model.pendingCount}');
    for (final p in model.parcels) {
      print('Parcel: ${p.trackingNumber}, status: ${p.status}, dest: ${p.destinationCityName}');
    }
  } catch (e, stack) {
    print('ERROR IN MODEL PARSING: $e\n$stack');
  }
}
