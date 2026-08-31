import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/parcel_status.dart';
import '../../models/parcel_model.dart';
import '../../providers/runsheet_provider.dart';
import '../pod/delivery_action_sheet.dart';
import '../pod/failure_reason_sheet.dart';
import '../runsheet/widgets/shipper_advise_banner.dart';

class ParcelDetailScreen extends StatelessWidget {
  final ParcelModel parcel;

  const ParcelDetailScreen({super.key, required this.parcel});

  Future<void> _makeCall(String phone) async {
    final cleanPhone = phone.replaceAll(RegExp(r'[^\d+]'), '');
    final uri = Uri.parse('tel:$cleanPhone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  Future<void> _openMap(String address) async {
    final encoded = Uri.encodeComponent(address);
    final uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=$encoded');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _openDeliverySheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => DeliveryActionSheet(
        parcel: parcel,
        onConfirm: ({signatureBase64, photoPath, receiverName, receiverRelation}) {
          context.read<RunsheetProvider>().markParcelDelivered(
            parcelId: parcel.id,
            signatureBase64: signatureBase64,
            photoPath: photoPath,
            receiverName: receiverName,
            receiverRelation: receiverRelation,
          );
          Navigator.of(context).pop(); // Back to runsheet
        },
      ),
    );
  }

  void _openFailureSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => FailureReasonSheet(
        parcel: parcel,
        onSubmit: (reason, notes) {
          context.read<RunsheetProvider>().markParcelFailedAttempt(
            parcelId: parcel.id,
            failureReason: reason,
            riderNotes: notes,
          );
          Navigator.of(context).pop(); // Back to runsheet
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormatter = NumberFormat.currency(symbol: 'PKR ', decimalDigits: 0);
    final isDelivered = parcel.status == 'Delivered';
    final isReadyToReturn = parcel.status == 'Ready To Return';

    return Scaffold(
      appBar: AppBar(
        title: Text(parcel.trackingNumber),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: parcel.deliveryStatus.subtleColor,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: parcel.deliveryStatus.color.withOpacity(0.4)),
            ),
            child: Text(
              parcel.status,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: parcel.deliveryStatus.color,
              ),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Shipper Advise Alert Banner if active
            if (parcel.hasActiveShipperAdvice) ...[
              ShipperAdviseBanner(
                adviceText: parcel.latestShipperAdvice!,
                attemptCount: parcel.attemptCount == 0 ? 1 : parcel.attemptCount,
              ),
            ],

            // COD Header Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [AppColors.surfaceCard, AppColors.surface],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'CASH ON DELIVERY (COD)',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        currencyFormatter.format(parcel.codAmount),
                        style: GoogleFonts.outfit(
                          fontSize: 26,
                          fontWeight: FontWeight.bold,
                          color: parcel.codAmount > 0 ? AppColors.success : AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: parcel.allowToOpen == 'Yes' ? AppColors.infoSubtle : AppColors.surface,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Text(
                      'Open Box: ${parcel.allowToOpen}',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: parcel.allowToOpen == 'Yes' ? AppColors.info : AppColors.textSecondary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Recipient Information Section
            _buildSectionHeader('Recipient Information', LucideIcons.user),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surfaceCard,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  _buildInfoRow('Name', parcel.recipientName),
                  const Divider(color: AppColors.border),
                  _buildInfoRow('Phone', parcel.recipientPhone, isPhone: true),
                  if (parcel.consigneeAltPhone != null && parcel.consigneeAltPhone!.isNotEmpty) ...[
                    const Divider(color: AppColors.border),
                    _buildInfoRow('Alternate Phone', parcel.consigneeAltPhone!, isPhone: true),
                  ],
                  const Divider(color: AppColors.border),
                  _buildInfoRow('Delivery Address', parcel.recipientAddress, isAddress: true),
                  if (parcel.destinationCityName != null) ...[
                    const Divider(color: AppColors.border),
                    _buildInfoRow('City', parcel.destinationCityName!),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Shipment Specifications
            _buildSectionHeader('Shipment Specifications', LucideIcons.box),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surfaceCard,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  _buildInfoRow('Pieces & Weight', '${parcel.pieces} Pc / ${parcel.weight} KG'),
                  const Divider(color: AppColors.border),
                  _buildInfoRow('Service Type', parcel.serviceType),
                  const Divider(color: AppColors.border),
                  _buildInfoRow('Shipper / Merchant', parcel.shipperName ?? 'Direct Merchant'),
                  if (parcel.comments != null && parcel.comments!.isNotEmpty) ...[
                    const Divider(color: AppColors.border),
                    _buildInfoRow('Special Instructions', parcel.comments!),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Delivery Attempt History (Shipper Advise Telemetry)
            if (parcel.deliveryAttempts.isNotEmpty) ...[
              _buildSectionHeader('Attempt History (Shipper Advise)', LucideIcons.history),
              const SizedBox(height: 10),
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: parcel.deliveryAttempts.length,
                itemBuilder: (context, idx) {
                  final attempt = parcel.deliveryAttempts[idx];
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              attempt.status,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.warning),
                            ),
                            Text(
                              attempt.adviceStatus,
                              style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Reason: ${attempt.failureReason}',
                          style: const TextStyle(fontSize: 12, color: AppColors.textPrimary),
                        ),
                        if (attempt.shipperAdvice != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            'Shipper Note: ${attempt.shipperAdvice}',
                            style: const TextStyle(fontSize: 12, color: AppColors.primaryLight, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ],
                    ),
                  );
                },
              ),
              const SizedBox(height: 20),
            ],

            const SizedBox(height: 40),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          border: const Border(top: BorderSide(color: AppColors.border)),
        ),
        child: SafeArea(
          child: isDelivered || isReadyToReturn
              ? Container(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: isDelivered ? AppColors.successSubtle : AppColors.errorSubtle,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    isDelivered ? '✓ Delivered & Completed' : 'Marked for Return (RTO)',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: isDelivered ? AppColors.success : AppColors.error,
                    ),
                  ),
                )
              : Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _openFailureSheet(context),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.warning,
                          side: BorderSide(color: AppColors.warning.withOpacity(0.5)),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        child: const Text('Log Failure', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 2,
                      child: ElevatedButton(
                        onPressed: () => _openDeliverySheet(context),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        child: const Text('Complete Delivery (POD)'),
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 16, color: AppColors.primaryLight),
        const SizedBox(width: 8),
        Text(
          title,
          style: GoogleFonts.outfit(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
      ],
    );
  }

  Widget _buildInfoRow(String label, String value, {bool isPhone = false, bool isAddress = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            flex: 2,
            child: Text(
              label,
              style: const TextStyle(fontSize: 13, color: AppColors.textSecondary),
            ),
          ),
          Expanded(
            flex: 3,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Expanded(
                  child: Text(
                    value,
                    textAlign: TextAlign.right,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                if (isPhone) ...[
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: () => _makeCall(value),
                    child: const Icon(LucideIcons.phoneCall, size: 16, color: AppColors.primaryLight),
                  ),
                ],
                if (isAddress) ...[
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: () => _openMap(value),
                    child: const Icon(LucideIcons.navigation, size: 16, color: AppColors.info),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
