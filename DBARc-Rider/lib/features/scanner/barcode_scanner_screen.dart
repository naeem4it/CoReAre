import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../models/parcel_model.dart';
import '../../providers/runsheet_provider.dart';
import '../pod/delivery_action_sheet.dart';
import '../pod/pickup_action_sheet.dart';

class BarcodeScannerScreen extends StatefulWidget {
  final RiderOperationMode? initialMode;

  const BarcodeScannerScreen({
    super.key,
    this.initialMode,
  });

  @override
  State<BarcodeScannerScreen> createState() => _BarcodeScannerScreenState();
}

class _BarcodeScannerScreenState extends State<BarcodeScannerScreen> {
  final MobileScannerController _controller = MobileScannerController();
  final _manualController = TextEditingController();
  late RiderOperationMode _scanMode;
  bool _isProcessing = false;
  bool _torchOn = false;

  @override
  void initState() {
    super.initState();
    _scanMode = widget.initialMode ?? RiderOperationMode.delivery;
  }

  @override
  void dispose() {
    _controller.dispose();
    _manualController.dispose();
    super.dispose();
  }

  Future<void> _handleBarcode(String rawCode) async {
    if (_isProcessing) return;
    setState(() => _isProcessing = true);

    final runsheet = context.read<RunsheetProvider>();
    final code = rawCode.trim().toUpperCase();

    // 1. Check local runsheet & pickup cache
    ParcelModel? parcel = runsheet.findParcelByTracking(code);

    // 2. Fallback: dynamic lookup from backend database
    if (parcel == null) {
      parcel = await runsheet.lookupParcelFromBackend(code);
    }

    if (parcel != null && mounted) {
      final targetParcel = parcel;
      if (_scanMode == RiderOperationMode.delivery) {
        // DELIVERY FLOW: Receiver Signature
        if (targetParcel.status == 'Delivered') {
          _showAlert('Notice', 'Shipment #$code is already marked as Delivered.');
          setState(() => _isProcessing = false);
          return;
        }

        await showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          builder: (_) => DeliveryActionSheet(
            parcel: targetParcel,
            onConfirm: ({signatureBase64, photoPath, receiverName, receiverRelation}) {
              runsheet.markParcelDelivered(
                parcelId: targetParcel.id,
                signatureBase64: signatureBase64,
                photoPath: photoPath,
                receiverName: receiverName,
                receiverRelation: receiverRelation,
              );
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  backgroundColor: AppColors.success,
                  content: Text('Successfully Delivered #${targetParcel.trackingNumber} with Receiver Signature!'),
                ),
              );
            },
          ),
        );
      } else {
        // PICKUP FLOW: Sender Signature
        if (targetParcel.status == 'Picked up by rider') {
          _showAlert('Notice', 'Shipment #$code is already marked as Picked Up.');
          setState(() => _isProcessing = false);
          return;
        }

        await showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          backgroundColor: Colors.transparent,
          builder: (_) => PickupActionSheet(
            parcel: targetParcel,
            onConfirm: ({signatureBase64, photoPath, senderName, senderPhone, actualPieces, actualWeight}) {
              runsheet.markParcelPickedUp(
                parcelId: targetParcel.id,
                signatureBase64: signatureBase64,
                photoPath: photoPath,
                senderName: senderName,
                senderPhone: senderPhone,
                actualPieces: actualPieces,
                actualWeight: actualWeight,
              );
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  backgroundColor: AppColors.success,
                  content: Text('Successfully Picked Up #${targetParcel.trackingNumber} with Sender Signature!'),
                ),
              );
            },
          ),
        );
      }

      if (mounted) {
        setState(() => _isProcessing = false);
      }
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.surfaceCard,
          content: Text('Shipment #$code not found in database.'),
          duration: const Duration(seconds: 3),
        ),
      );
      Future.delayed(const Duration(seconds: 1), () {
        if (mounted) setState(() => _isProcessing = false);
      });
    }
  }

  void _showAlert(String title, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: AppColors.surfaceCard,
        content: Text(message, style: const TextStyle(color: Colors.white)),
        duration: const Duration(seconds: 3),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDelivery = _scanMode == RiderOperationMode.delivery;

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black.withOpacity(0.8),
        title: Text(
          isDelivery ? 'Scan for Delivery' : 'Scan for Pickup',
          style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: Icon(_torchOn ? LucideIcons.zap : LucideIcons.zapOff, color: _torchOn ? Colors.amber : Colors.white),
            onPressed: () async {
              await _controller.toggleTorch();
              setState(() => _torchOn = !_torchOn);
            },
          ),
          IconButton(
            icon: const Icon(LucideIcons.switchCamera, color: Colors.white),
            onPressed: () => _controller.switchCamera(),
          ),
        ],
      ),
      body: Stack(
        children: [
          // Camera Stream
          MobileScanner(
            controller: _controller,
            onDetect: (capture) {
              final barcodes = capture.barcodes;
              if (barcodes.isNotEmpty && barcodes.first.rawValue != null) {
                _handleBarcode(barcodes.first.rawValue!);
              }
            },
          ),

          // Top Mode Switcher Bar in Scanner
          Positioned(
            top: 16,
            left: 20,
            right: 20,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.75),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _scanMode = RiderOperationMode.delivery),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: isDelivery ? AppColors.primary : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(LucideIcons.truck, size: 14, color: isDelivery ? Colors.white : AppColors.textSecondary),
                            const SizedBox(width: 6),
                            Text(
                              'Delivery Mode',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: isDelivery ? Colors.white : AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _scanMode = RiderOperationMode.pickup),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: !isDelivery ? AppColors.primary : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(LucideIcons.packagePlus, size: 14, color: !isDelivery ? Colors.white : AppColors.textSecondary),
                            const SizedBox(width: 6),
                            Text(
                              'Pickup Mode',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: !isDelivery ? Colors.white : AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Scan Reticle Overlay
          Center(
            child: Container(
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                border: Border.all(
                  color: isDelivery ? AppColors.primaryLight : AppColors.info,
                  width: 2.5,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: (isDelivery ? AppColors.primary : AppColors.info).withOpacity(0.25),
                    blurRadius: 30,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    isDelivery ? LucideIcons.scan : LucideIcons.packagePlus,
                    size: 48,
                    color: isDelivery ? AppColors.primaryLight : AppColors.info,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    isDelivery ? 'Align delivery barcode inside' : 'Align pickup barcode inside',
                    style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    isDelivery ? 'Takes Receiver Signature' : 'Takes Sender Signature',
                    style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 11),
                  ),
                ],
              ),
            ),
          ),

          // Processing Indicator
          if (_isProcessing)
            Container(
              color: Colors.black.withOpacity(0.6),
              child: const Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              ),
            ),

          // Bottom Manual Input Bar
          Positioned(
            left: 20,
            right: 20,
            bottom: 30,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface.withOpacity(0.95),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _manualController,
                          style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
                          decoration: InputDecoration(
                            isDense: true,
                            hintText: isDelivery ? 'Enter Delivery Tracking # (e.g. DBA-ZOIJMNZ)' : 'Enter Pickup Tracking # (e.g. DBA-401COZR)',
                            prefixIcon: const Icon(LucideIcons.search, size: 16, color: AppColors.textSecondary),
                          ),
                          onSubmitted: (val) {
                            if (val.trim().isNotEmpty) _handleBarcode(val.trim());
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton.filled(
                        onPressed: () {
                          if (_manualController.text.trim().isNotEmpty) {
                            _handleBarcode(_manualController.text.trim());
                          }
                        },
                        style: IconButton.styleFrom(backgroundColor: AppColors.primary),
                        icon: const Icon(LucideIcons.arrowRight, size: 18),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
