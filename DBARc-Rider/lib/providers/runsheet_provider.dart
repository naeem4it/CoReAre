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

enum RiderOperationMode { delivery, pickup }

class RunsheetProvider extends ChangeNotifier {
  final ApiClient _api = ApiClient();

  RiderOperationMode _mode = RiderOperationMode.delivery;
  DeliverySheetModel? _activeSheet;
  List<ParcelModel> _pickupParcels = [];
  bool _isLoading = false;
  String? _errorMessage;
  String _selectedTab = 'All'; // 'All', 'Pending', 'Delivered'/'Completed', 'Failed'
  String _searchQuery = '';

  RiderOperationMode get mode => _mode;
  bool get isDeliveryMode => _mode == RiderOperationMode.delivery;
  bool get isPickupMode => _mode == RiderOperationMode.pickup;

  DeliverySheetModel? get activeSheet => _activeSheet;
  List<ParcelModel> get pickupParcels => _pickupParcels;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String get selectedTab => _selectedTab;
  String get searchQuery => _searchQuery;

  // Toggle between Deliveries and Pickups
  void setMode(RiderOperationMode newMode) {
    if (_mode != newMode) {
      _mode = newMode;
      _selectedTab = 'All';
      notifyListeners();
    }
  }

  // Delivery Parcels
  List<ParcelModel> get deliveryParcels => _activeSheet?.parcels ?? [];

  // Filtered Delivery Parcels
  List<ParcelModel> get filteredParcels {
    if (_activeSheet == null) return [];
    var list = _activeSheet!.parcels;

    if (_selectedTab == 'Pending') {
      list = list.where((p) => p.status.toLowerCase() != 'delivered' && p.status.toLowerCase() != 'ready to return').toList();
    } else if (_selectedTab == 'Delivered') {
      list = list.where((p) => p.status.toLowerCase() == 'delivered').toList();
    } else if (_selectedTab == 'Failed') {
      list = list.where((p) => p.status.toLowerCase().contains('fail') || p.status.toLowerCase().contains('return')).toList();
    }

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

  // Filtered Pickup Parcels
  List<ParcelModel> get filteredPickupParcels {
    var list = _pickupParcels;

    if (_selectedTab == 'Pending') {
      list = list.where((p) => p.status.toLowerCase().contains('book')).toList();
    } else if (_selectedTab == 'Delivered' || _selectedTab == 'Picked Up' || _selectedTab == 'Completed') {
      list = list.where((p) => p.status.toLowerCase().contains('pick')).toList();
    }

    if (_searchQuery.trim().isNotEmpty) {
      final q = _searchQuery.trim().toLowerCase();
      list = list.where((p) =>
        p.trackingNumber.toLowerCase().contains(q) ||
        (p.shipperName != null && p.shipperName!.toLowerCase().contains(q)) ||
        (p.shipperPhone != null && p.shipperPhone!.toLowerCase().contains(q)) ||
        (p.shipperAddress != null && p.shipperAddress!.toLowerCase().contains(q)) ||
        p.recipientName.toLowerCase().contains(q) ||
        (p.referenceNumber != null && p.referenceNumber!.toLowerCase().contains(q))
      ).toList();
    }

    return list;
  }

  // Active list based on current Mode
  List<ParcelModel> get currentParcels =>
      _mode == RiderOperationMode.delivery ? filteredParcels : filteredPickupParcels;

  // Pickup KPI Metrics
  int get totalPickups => _pickupParcels.length;
  int get completedPickupsCount => _pickupParcels.where((p) => p.status.toLowerCase().contains('pick')).length;
  int get pendingPickupsCount => _pickupParcels.where((p) => p.status.toLowerCase().contains('book')).length;
  int get totalPickupPieces => _pickupParcels.fold(0, (sum, p) => sum + p.pieces);

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

  // Offline queue
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

  Future<void> syncOfflineActions() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final queue = prefs.getStringList('rider_offline_queue') ?? [];
      if (queue.isEmpty) return;

      final remaining = <String>[];
      for (final raw in queue) {
        try {
          final action = jsonDecode(raw) as Map<String, dynamic>;
          final type = action['type'];
          final parcelId = action['parcelId'];

          if (type == 'DELIVER') {
            await _api.dio.put(ApiEndpoints.parcelById(parcelId), data: action['payload']);
          } else if (type == 'PICKUP') {
            await _api.dio.put(ApiEndpoints.parcelById(parcelId), data: action['payload']);
          } else if (type == 'ATTEMPT') {
            await _api.dio.post(ApiEndpoints.deliveryAttempts, data: action['payload']);
            await _api.dio.put(ApiEndpoints.parcelById(parcelId), data: {'data': {'status': action['status']}});
          }
        } catch (_) {
          remaining.add(raw);
        }
      }
      await prefs.setStringList('rider_offline_queue', remaining);
    } catch (_) {}
  }

  // Primary loader: Fetches both Deliveries and Pickups bound to the logged-in Rider
  Future<void> fetchActiveRunsheet({int? riderId}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    // Trigger offline sync in background
    syncOfflineActions();

    try {
      // 1. FETCH DELIVERIES (Explicit populate parameters to avoid Strapi 5 circular validation error)
      final Map<String, dynamic> sheetParams = {
        'populate[0]': 'parcels',
        'populate[1]': 'parcels.destination_city',
        'populate[2]': 'parcels.shipper',
        'populate[3]': 'parcels.assigned_route',
        'populate[4]': 'rider',
        'populate[5]': 'route',
        'sort[0]': 'id:desc',
      };

      if (riderId != null) {
        sheetParams['filters[rider][id][\$eq]'] = riderId;
      }

      var res = await _api.dio.get(ApiEndpoints.deliverySheets, queryParameters: sheetParams);
      var sheets = res.data?['data'] ?? [];

      if ((sheets is! List || sheets.isEmpty) && riderId != null) {
        // Fallback: search all recent sheets
        final fallbackRes = await _api.dio.get(
          ApiEndpoints.deliverySheets,
          queryParameters: {
            'populate[0]': 'parcels',
            'populate[1]': 'parcels.destination_city',
            'populate[2]': 'parcels.shipper',
            'populate[3]': 'parcels.assigned_route',
            'populate[4]': 'rider',
            'populate[5]': 'route',
            'sort[0]': 'id:desc',
            'pagination[pageSize]': 10,
          },
        );
        final all = fallbackRes.data?['data'] ?? [];
        if (all is List && all.isNotEmpty) {
          final matched = all.where((s) => s['rider']?['id'] == riderId).toList();
          sheets = matched.isNotEmpty ? matched : all;
        }
      }

      if (sheets is List && sheets.isNotEmpty) {
        _activeSheet = DeliverySheetModel.fromJson(sheets.first);
      } else {
        _activeSheet = null;
      }

      // Also merge any parcels directly assigned in rider-assignments
      if (riderId != null) {
        try {
          final assignRes = await _api.dio.get(
            '/rider-assignments',
            queryParameters: {
              'filters[rider][id][\$eq]': riderId,
              'populate[0]': 'parcel',
              'populate[1]': 'parcel.destination_city',
              'populate[2]': 'parcel.shipper',
              'populate[3]': 'parcel.assigned_route',
              'populate[4]': 'rider',
              'sort[0]': 'id:desc',
              'pagination[pageSize]': 100,
            },
          );
          final rawAssignments = assignRes.data?['data'] ?? [];
          if (rawAssignments is List && rawAssignments.isNotEmpty) {
            final List<ParcelModel> extraDeliveries = [];
            final List<ParcelModel> assignedPickups = [];

            for (final a in rawAssignments) {
              final rawP = a['parcel'];
              if (rawP != null && rawP is Map<String, dynamic>) {
                final pm = ParcelModel.fromJson(rawP);
                final sLower = pm.status.toLowerCase();
                final isPickupStatus = sLower.contains('book') || sLower.contains('pick');
                final isDeliveryStatus = sLower.contains('out') ||
                    sLower.contains('deliver') ||
                    sLower.contains('attempt') ||
                    sLower.contains('return');

                if (isPickupStatus) {
                  if (!assignedPickups.any((x) => x.id == pm.id)) {
                    assignedPickups.add(pm);
                  }
                } else if (isDeliveryStatus) {
                  if (!extraDeliveries.any((x) => x.id == pm.id) &&
                      !(_activeSheet?.parcels.any((x) => x.id == pm.id) ?? false)) {
                    extraDeliveries.add(pm);
                  }
                }
              }
            }

            // Merge extra deliveries with existing active sheet parcels (deduped)
            if (extraDeliveries.isNotEmpty) {
              final currentList = _activeSheet?.parcels ?? [];
              final Map<int, ParcelModel> parcelMap = {};
              for (final p in currentList) {
                parcelMap[p.id] = p;
              }
              for (final p in extraDeliveries) {
                parcelMap[p.id] = p;
              }
              final combined = parcelMap.values.toList();

              _activeSheet = DeliverySheetModel(
                id: _activeSheet?.id ?? 1,
                sheetNumber: _activeSheet?.sheetNumber ?? 'DS-RUNSHEET',
                sheetDate: _activeSheet?.sheetDate ?? DateFormat('yyyy-MM-dd').format(DateTime.now()),
                routeCode: _activeSheet?.routeCode ?? 'DEFAULT',
                customName: _activeSheet?.customName ?? 'Today\'s Dispatch',
                status: _activeSheet?.status ?? 'Out For Delivery',
                rider: _activeSheet?.rider,
                parcels: combined,
              );
            }

            if (assignedPickups.isNotEmpty) {
              _pickupParcels = assignedPickups;
            }
          }
        } catch (assignErr) {
          debugPrint('[Runsheet] Rider assignments fetch note: $assignErr');
        }
      }

      // 2. DIRECT FALLBACK: If active sheet is still empty, query all Out for Delivery parcels
      if (_activeSheet == null || _activeSheet!.parcels.isEmpty) {
        try {
          final outRes = await _api.dio.get(
            ApiEndpoints.parcels,
            queryParameters: {
              'filters[status][\$in][0]': 'Out for Delivery',
              'filters[status][\$in][1]': 'Out For delivery',
              'populate[0]': 'destination_city',
              'populate[1]': 'shipper',
              'populate[2]': 'assigned_route',
              'sort[0]': 'updatedAt:desc',
              'pagination[pageSize]': 100,
            },
          );
          final rawOut = outRes.data?['data'] ?? [];
          if (rawOut is List && rawOut.isNotEmpty) {
            final directDeliveries = rawOut.map<ParcelModel>((item) => ParcelModel.fromJson(item)).toList();
            _activeSheet = DeliverySheetModel(
              id: 1,
              sheetNumber: 'DS-DISPATCH',
              sheetDate: DateFormat('yyyy-MM-dd').format(DateTime.now()),
              routeCode: 'CITY-WIDE',
              customName: 'City-Wide Out for Delivery',
              status: 'Out For Delivery',
              parcels: directDeliveries,
            );
          }
        } catch (directErr) {
          debugPrint('[Runsheet] Direct out of delivery fetch: $directErr');
        }
      }

      // 3. FETCH PICKUPS (Booked parcels ready for rider collection from merchants)
      try {
        final pickupRes = await _api.dio.get(
          ApiEndpoints.parcels,
          queryParameters: {
            'filters[status][\$in][0]': 'Booked',
            'filters[status][\$in][1]': 'Total Booking',
            'filters[status][\$in][2]': 'Picked up by rider',
            'populate[0]': 'destination_city',
            'populate[1]': 'shipper',
            'populate[2]': 'pickup_location',
            'sort[0]': 'updatedAt:desc',
            'pagination[pageSize]': 100,
          },
        );
        final rawPickups = pickupRes.data?['data'] ?? [];
        if (rawPickups is List && rawPickups.isNotEmpty) {
          final fetched = rawPickups.map<ParcelModel>((item) => ParcelModel.fromJson(item)).toList();
          
          // Merge with any assigned pickups without duplicates
          final Map<int, ParcelModel> pickupMap = {};
          for (final p in _pickupParcels) {
            pickupMap[p.id] = p;
          }
          for (final p in fetched) {
            pickupMap[p.id] = p;
          }
          _pickupParcels = pickupMap.values.toList();
        }
      } catch (pickupErr) {
        debugPrint('[Runsheet] Error fetching pickups: $pickupErr');
      }

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      debugPrint('[Runsheet] Error fetching data: $e');
      _errorMessage = 'Unable to fetch runsheet data: $e';
      _isLoading = false;
      notifyListeners();
    }
  }

  // Mark parcel as DELIVERED (Receiver e-POD)
  Future<bool> markParcelDelivered({
    required int parcelId,
    String? signatureBase64,
    String? photoPath,
    String? receiverName,
    String? receiverRelation,
  }) async {
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
      await _api.dio.put(
        ApiEndpoints.parcelById(parcelId),
        data: payload,
      );
    } catch (e) {
      await _queueOfflineAction({
        'type': 'DELIVER',
        'parcelId': parcelId,
        'payload': payload,
        'timestamp': DateTime.now().toIso8601String(),
      });
    }

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

  // Mark parcel as PICKED UP (Sender Handover Verification & Signature)
  Future<bool> markParcelPickedUp({
    required int parcelId,
    String? signatureBase64,
    String? photoPath,
    String? senderName,
    String? senderPhone,
    int? actualPieces,
    double? actualWeight,
  }) async {
    int? photoId;
    if (photoPath != null && photoPath.isNotEmpty) {
      photoId = await uploadMediaFile(photoPath);
    }

    final commentMsg = 'Picked up from Sender: ${senderName ?? "Merchant"} (${senderPhone ?? ""})${photoId != null ? " [Pickup Photo #$photoId attached]" : ""}';

    final payload = {
      'data': {
        'status': 'Picked up by rider',
        'comments': commentMsg,
        if (actualPieces != null) 'pieces': actualPieces,
        if (actualWeight != null) 'weight': actualWeight,
      }
    };

    try {
      await _api.dio.put(
        ApiEndpoints.parcelById(parcelId),
        data: payload,
      );
    } catch (e) {
      await _queueOfflineAction({
        'type': 'PICKUP',
        'parcelId': parcelId,
        'payload': payload,
        'timestamp': DateTime.now().toIso8601String(),
      });
    }

    // Update local pickup list
    _pickupParcels = _pickupParcels.map<ParcelModel>((p) {
      if (p.id == parcelId) {
        return p.copyWith(
          status: 'Picked up by rider',
          comments: commentMsg,
        );
      }
      return p;
    }).toList();

    notifyListeners();
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
      await _api.dio.post(
        ApiEndpoints.deliveryAttempts,
        data: attemptPayload,
      );

      await _api.dio.put(
        ApiEndpoints.parcelById(parcelId),
        data: {
          'data': {
            'status': newStatus,
          }
        },
      );
    } catch (e) {
      await _queueOfflineAction({
        'type': 'ATTEMPT',
        'parcelId': parcelId,
        'payload': attemptPayload,
        'status': newStatus,
        'timestamp': DateTime.now().toIso8601String(),
      });
    }

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

  // Find parcel by barcode across both Deliveries and Pickups
  ParcelModel? findParcelByTracking(String scannedCode) {
    final code = scannedCode.trim().toLowerCase();

    // Check delivery parcels
    if (_activeSheet != null) {
      try {
        final found = _activeSheet!.parcels.firstWhere(
          (p) => p.trackingNumber.toLowerCase() == code ||
                 (p.referenceNumber != null && p.referenceNumber!.toLowerCase() == code),
        );
        return found;
      } catch (_) {}
    }

    // Check pickup parcels
    try {
      final found = _pickupParcels.firstWhere(
        (p) => p.trackingNumber.toLowerCase() == code ||
               (p.referenceNumber != null && p.referenceNumber!.toLowerCase() == code),
      );
      return found;
    } catch (_) {}

    return null;
  }

  // Dynamic backend lookup for barcodes not in local memory
  Future<ParcelModel?> lookupParcelFromBackend(String trackingNumber) async {
    final code = trackingNumber.trim();
    try {
      final res = await _api.dio.get(
        ApiEndpoints.parcels,
        queryParameters: {
          'filters[tracking_number][\$eq]': code,
          'populate': '*',
        },
      );
      final list = res.data?['data'];
      if (list is List && list.isNotEmpty) {
        final p = ParcelModel.fromJson(list.first);
        return p;
      }
    } catch (e) {
      debugPrint('[Lookup] Error looking up parcel #$code: $e');
    }
    return null;
  }
}
