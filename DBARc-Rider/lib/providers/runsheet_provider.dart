import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/network/api_client.dart';
import '../core/network/api_endpoints.dart';
import '../core/constants/shipper_advise_reasons.dart';
import '../models/delivery_sheet_model.dart';
import '../models/parcel_model.dart';
import '../models/delivery_attempt_model.dart';

class RunsheetProvider extends ChangeNotifier {
  final ApiClient _api = ApiClient();

  DeliverySheetModel? _activeSheet;
  bool _isLoading = false;
  String? _errorMessage;
  String _selectedTab = 'All'; // 'All', 'Pending', 'Delivered', 'Failed'
  String _searchQuery = '';

  DeliverySheetModel? get activeSheet => _activeSheet;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String get selectedTab => _selectedTab;
  String get searchQuery => _searchQuery;

  // Filtered parcels based on search and selected tab
  List<ParcelModel> get filteredParcels {
    if (_activeSheet == null) return [];
    
    var list = _activeSheet!.parcels;

    // Filter by tab
    if (_selectedTab == 'Pending') {
      list = list.where((p) => p.status != 'Delivered' && p.status != 'Ready To Return').toList();
    } else if (_selectedTab == 'Delivered') {
      list = list.where((p) => p.status == 'Delivered').toList();
    } else if (_selectedTab == 'Failed') {
      list = list.where((p) => p.status == 'Failed Attempt' || p.status == 'Ready To Return').toList();
    }

    // Filter by search query (tracking number, recipient name, phone, city)
    if (_searchQuery.trim().isNotEmpty) {
      final q = _searchQuery.trim().toLowerCase();
      list = list.where((p) =>
        p.trackingNumber.toLowerCase().contains(q) ||
        p.recipientName.toLowerCase().contains(q) ||
        p.recipientPhone.toLowerCase().contains(q) ||
        p.recipientAddress.toLowerCase().contains(q) ||
        (p.referenceNumber != null && p.referenceNumber!.toLowerCase().contains(q))
      ).toList();
    }

    return list;
  }

  void setSelectedTab(String tab) {
    _selectedTab = tab;
    notifyListeners();
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  // Upload e-POD Photo / Media to Strapi Media Library
  Future<int?> uploadMediaFile(String filePath) async {
    try {
      final fileName = filePath.split(RegExp(r'[/\\]')).last;
      final formData = FormData.fromMap({
        'files': await MultipartFile.fromFile(filePath, filename: fileName),
      });

      final res = await _api.dio.post('/upload', data: formData);
      if (res.data is List && (res.data as List).isNotEmpty) {
        return res.data[0]['id'];
      }
    } catch (e) {
      debugPrint('[POD] Media upload warning: $e');
    }
    return null;
  }

  // Save offline sync queue in SharedPreferences
  Future<void> _queueOfflineAction(Map<String, dynamic> action) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final currentQueue = prefs.getStringList('rider_offline_queue') ?? [];
      currentQueue.add(jsonEncode(action));
      await prefs.setStringList('rider_offline_queue', currentQueue);
      debugPrint('[Offline Queue] Action queued: ${action['type']}');
    } catch (e) {
      debugPrint('[Offline Queue] Failed to queue action: $e');
    }
  }

  // Sync pending offline actions when connectivity resumes
  Future<void> syncOfflineActions() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final queue = prefs.getStringList('rider_offline_queue') ?? [];
      if (queue.isEmpty) return;

      debugPrint('[Offline Sync] Processing ${queue.length} pending actions...');
      final remainingQueue = <String>[];

      for (final actionStr in queue) {
        try {
          final action = jsonDecode(actionStr);
          if (action['type'] == 'DELIVER') {
            await _api.dio.put(
              ApiEndpoints.parcelById(action['parcelId']),
              data: action['payload'],
            );
          } else if (action['type'] == 'ATTEMPT') {
            await _api.dio.post(
              ApiEndpoints.deliveryAttempts,
              data: action['payload'],
            );
            await _api.dio.put(
              ApiEndpoints.parcelById(action['parcelId']),
              data: {'data': {'status': action['status']}},
            );
          }
        } catch (e) {
          remainingQueue.add(actionStr);
        }
      }

      await prefs.setStringList('rider_offline_queue', remainingQueue);
      debugPrint('[Offline Sync] Remaining queue: ${remainingQueue.length}');
    } catch (e) {
      debugPrint('[Offline Sync] Sync error: $e');
    }
  }

  // Fetch today's delivery sheet for the rider
  Future<void> fetchActiveRunsheet({int? riderId}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    // Trigger offline sync first
    syncOfflineActions();

    try {
      final todayStr = DateFormat('yyyy-MM-dd').format(DateTime.now());
      
      final Map<String, dynamic> params = {
        'populate[0]': 'parcels',
        'populate[1]': 'parcels.delivery_attempts',
        'populate[2]': 'parcels.destination_city',
        'populate[3]': 'parcels.shipper',
        'populate[4]': 'rider',
        'sort[0]': 'id:desc',
      };

      if (riderId != null) {
        params['filters[rider][id][\$eq]'] = riderId;
      }

      final res = await _api.dio.get(ApiEndpoints.deliverySheets, queryParameters: params);
      final list = res.data?['data'] ?? [];

      if (list is List && list.isNotEmpty) {
        _activeSheet = DeliverySheetModel.fromJson(list.first);
      } else {
        _activeSheet = null;
      }
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _activeSheet = null;
      _errorMessage = 'Unable to fetch runsheet: $e';
      _isLoading = false;
      notifyListeners();
    }
  }

  // Mark parcel as DELIVERED (e-POD)
  Future<bool> markParcelDelivered({
    required int parcelId,
    String? signatureBase64,
    String? photoPath,
    String? receiverName,
    String? receiverRelation,
  }) async {
    // 1. Upload photo if present
    int? photoId;
    if (photoPath != null && photoPath.isNotEmpty) {
      photoId = await uploadMediaFile(photoPath);
    }

    final commentMsg = 'Delivered to ${receiverName ?? "Recipient"} (${receiverRelation ?? "Self"})${photoId != null ? " [POD Photo #$photoId attached]" : ""}';

    final payload = {
      'data': {
        'status': 'Delivered',
        'delivered_date': DateTime.now().toIso8601String(),
        'comments': commentMsg,
      }
    };

    try {
      // 2. Update on backend
      await _api.dio.put(
        ApiEndpoints.parcelById(parcelId),
        data: payload,
      );
    } catch (e) {
      // Queue offline
      await _queueOfflineAction({
        'type': 'DELIVER',
        'parcelId': parcelId,
        'payload': payload,
        'timestamp': DateTime.now().toIso8601String(),
      });
    }

    // 3. Update local state
    if (_activeSheet != null) {
      final updatedList = _activeSheet!.parcels.map<ParcelModel>((p) {
        if (p.id == parcelId) {
          return p.copyWith(status: 'Delivered', comments: commentMsg);
        }
        return p;
      }).toList();

      _activeSheet = DeliverySheetModel(
        id: _activeSheet!.id,
        sheetNumber: _activeSheet!.sheetNumber,
        sheetDate: _activeSheet!.sheetDate,
        routeCode: _activeSheet!.routeCode,
        customName: _activeSheet!.customName,
        status: _activeSheet!.status,
        rider: _activeSheet!.rider,
        parcels: updatedList,
      );
      notifyListeners();
    }
    return true;
  }

  // Mark parcel as FAILED ATTEMPT (Shipper Advise Rules)
  Future<bool> markParcelFailedAttempt({
    required int parcelId,
    required String failureReason,
    String? riderNotes,
    int? riderId,
  }) async {
    if (_activeSheet == null) return false;

    final parcel = _activeSheet!.parcels.firstWhere((p) => p.id == parcelId);
    final nextAttemptCount = parcel.deliveryAttempts.length + 1;
    final isMaxReached = ShipperAdviseConstants.isMaxAttemptsReached(nextAttemptCount);
    
    final newStatus = isMaxReached ? 'Ready To Return' : 'Failed Attempt';
    final attemptLabel = ShipperAdviseConstants.getAttemptLabel(parcel.deliveryAttempts.length);

    final attemptPayload = {
      'data': {
        'attempt_time': DateTime.now().toIso8601String(),
        'status': attemptLabel,
        'failure_reason': failureReason,
        'rider_notes': riderNotes,
        'advice_status': ShipperAdviseConstants.statusAwaitingAdvice,
        'parcel': parcelId,
        if (riderId != null) 'rider': riderId,
      }
    };

    try {
      // 1. Create delivery_attempt record in Strapi backend for Shipper Advise
      await _api.dio.post(
        ApiEndpoints.deliveryAttempts,
        data: attemptPayload,
      );

      // 2. Update parcel status
      await _api.dio.put(
        ApiEndpoints.parcelById(parcelId),
        data: {
          'data': {
            'status': newStatus,
          }
        },
      );
    } catch (e) {
      // Queue offline
      await _queueOfflineAction({
        'type': 'ATTEMPT',
        'parcelId': parcelId,
        'payload': attemptPayload,
        'status': newStatus,
        'timestamp': DateTime.now().toIso8601String(),
      });
    }

    // 3. Update local state
    final newAttempt = DeliveryAttemptModel(
      id: DateTime.now().millisecondsSinceEpoch,
      attemptTime: DateTime.now().toIso8601String(),
      status: attemptLabel,
      failureReason: failureReason,
      adviceStatus: ShipperAdviseConstants.statusAwaitingAdvice,
      riderNotes: riderNotes,
    );

    final updatedList = _activeSheet!.parcels.map<ParcelModel>((p) {
      if (p.id == parcelId) {
        final attempts = List<DeliveryAttemptModel>.from(p.deliveryAttempts)..add(newAttempt);
        return p.copyWith(
          status: newStatus,
          deliveryAttempts: attempts,
        );
      }
      return p;
    }).toList();

    _activeSheet = DeliverySheetModel(
      id: _activeSheet!.id,
      sheetNumber: _activeSheet!.sheetNumber,
      sheetDate: _activeSheet!.sheetDate,
      routeCode: _activeSheet!.routeCode,
      customName: _activeSheet!.customName,
      status: _activeSheet!.status,
      rider: _activeSheet!.rider,
      parcels: updatedList,
    );

    notifyListeners();
    return true;
  }

  // Find parcel by barcode or QR tracking number
  ParcelModel? findParcelByTracking(String scannedCode) {
    if (_activeSheet == null) return null;
    final code = scannedCode.trim().toLowerCase();
    try {
      return _activeSheet!.parcels.firstWhere(
        (p) => p.trackingNumber.toLowerCase() == code ||
               (p.referenceNumber != null && p.referenceNumber!.toLowerCase() == code),
      );
    } catch (e) {
      return null;
    }
  }

  // Realistic sample demonstration runsheet
  DeliverySheetModel _generateDemoSheet(String dateStr) {
    return DeliverySheetModel(
      id: 101,
      sheetNumber: 'DS-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
      sheetDate: dateStr,
      routeCode: 'KHI-DEF-04',
      customName: 'DHA Phase 5 & 6 Route',
      status: 'Out For Delivery',
      parcels: [
        ParcelModel(
          id: 1001,
          trackingNumber: 'DBA-98231',
          status: 'Out For delivery',
          codAmount: 3450.0,
          weight: 1.5,
          deliveryCharges: 250.0,
          recipientName: 'Zeeshan Ahmed',
          recipientPhone: '0300-1234567',
          recipientAddress: 'Flat 402, Al-Rehman Heights, DHA Phase 5, Karachi',
          allowToOpen: 'Yes',
          pieces: 1,
          serviceType: 'Overnight',
          shipperName: 'Outfitters Store',
          destinationCityName: 'Karachi, PK',
          comments: 'Call before arriving',
          deliveryAttempts: [
            DeliveryAttemptModel(
              id: 1,
              attemptTime: DateTime.now().subtract(const Duration(days: 1)).toIso8601String(),
              status: 'Attempt 1',
              failureReason: 'Consignee Not Available / Phone Unreachable',
              shipperAdvice: 'Customer requested evening delivery after 4:00 PM. Call alternate: 0333-7654321',
              adviceStatus: 'Resolved',
            )
          ],
          latestShipperAdvice: 'Customer requested evening delivery after 4:00 PM. Call alternate: 0333-7654321',
          latestAdviceStatus: 'Resolved',
        ),
        ParcelModel(
          id: 1002,
          trackingNumber: 'DBA-98105',
          status: 'Out For delivery',
          codAmount: 1850.0,
          weight: 0.8,
          deliveryCharges: 200.0,
          recipientName: 'Mariam Khan',
          recipientPhone: '0321-9876543',
          recipientAddress: 'House 42, Street 5, Phase 6, Defence, Karachi',
          allowToOpen: 'No',
          pieces: 1,
          serviceType: 'Overnight',
          shipperName: 'Sana Safinaz Official',
          destinationCityName: 'Karachi, PK',
          comments: 'Ring second gate bell',
          deliveryAttempts: [],
        ),
        ParcelModel(
          id: 1003,
          trackingNumber: 'DBA-97992',
          status: 'Failed Attempt',
          codAmount: 5200.0,
          weight: 2.2,
          deliveryCharges: 300.0,
          recipientName: 'Dr. Faisal Qureshi',
          recipientPhone: '0312-5551234',
          recipientAddress: 'Consultant Clinic 4, Medical Complex, Sunset Blvd, Karachi',
          allowToOpen: 'No',
          pieces: 2,
          serviceType: 'Rush',
          shipperName: 'Khaadi Healthcare',
          destinationCityName: 'Karachi, PK',
          comments: 'Deliver between 10am - 2pm',
          deliveryAttempts: [
            DeliveryAttemptModel(
              id: 2,
              attemptTime: DateTime.now().subtract(const Duration(hours: 3)).toIso8601String(),
              status: 'Attempt 1',
              failureReason: 'Consignee Refused (COD Dispute)',
              adviceStatus: 'Awaiting advice',
              riderNotes: 'Customer claims price should be 4500 PKR not 5200 PKR',
            )
          ],
        ),
        ParcelModel(
          id: 1004,
          trackingNumber: 'DBA-97881',
          status: 'Delivered',
          codAmount: 4100.0,
          weight: 1.0,
          deliveryCharges: 200.0,
          recipientName: 'Imran Shah',
          recipientPhone: '0345-8889900',
          recipientAddress: 'Office 12, Saima Trade Tower, I.I. Chundrigar Road, Karachi',
          allowToOpen: 'Yes',
          pieces: 1,
          serviceType: 'Overnight',
          shipperName: 'J. Junaid Jamshed',
          destinationCityName: 'Karachi, PK',
          deliveryAttempts: [],
        ),
      ],
    );
  }
}
