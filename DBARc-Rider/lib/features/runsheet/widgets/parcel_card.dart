import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/parcel_status.dart';
import '../../../models/parcel_model.dart';
import 'shipper_advise_banner.dart';

class ParcelCard extends StatelessWidget {
  final ParcelModel parcel;
  final VoidCallback onTap;
  final VoidCallback onDeliver;
  final VoidCallback onFailed;

  const ParcelCard({
    super.key,
    required this.parcel,
    required this.onTap,
    required this.onDeliver,
    required this.onFailed,
  });

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

  @override
  Widget build(BuildContext context) {
    final currencyFormatter = NumberFormat.currency(symbol: 'PKR ', decimalDigits: 0);
    final isDelivered = parcel.status == 'Delivered';
    final isReadyToReturn = parcel.status == 'Ready To Return';

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: parcel.hasActiveShipperAdvice
              ? AppColors.warning.withOpacity(0.6)
              : AppColors.border,
          width: parcel.hasActiveShipperAdvice ? 1.5 : 1,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Header: Tracking Number & Status Badge
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(LucideIcons.package, size: 16, color: AppColors.primaryLight),
                        const SizedBox(width: 6),
                        Text(
                          parcel.trackingNumber,
                          style: GoogleFonts.outfit(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        // Attempt counter badge if > 0
                        if (parcel.attemptCount > 0) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                            margin: const EdgeInsets.only(right: 6),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: Text(
                              'Attempt ${parcel.attemptCount}/3',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: AppColors.warning,
                              ),
                            ),
                          ),
                        ],

                        // Status Badge
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                          decoration: BoxDecoration(
                            color: parcel.deliveryStatus.subtleColor,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: parcel.deliveryStatus.color.withOpacity(0.3)),
                          ),
                          child: Text(
                            parcel.status,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: parcel.deliveryStatus.color,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Shipper Advise Banner if active
                if (parcel.hasActiveShipperAdvice) ...[
                  ShipperAdviseBanner(
                    adviceText: parcel.latestShipperAdvice!,
                    attemptCount: parcel.attemptCount == 0 ? 1 : parcel.attemptCount,
                  ),
                ],

                // Recipient Details
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(LucideIcons.user, size: 16, color: AppColors.textSecondary),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            parcel.recipientName,
                            style: GoogleFonts.inter(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            parcel.recipientAddress,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                              height: 1.3,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // COD & Service Row
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Text(
                            'COD: ',
                            style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                          ),
                          Text(
                            currencyFormatter.format(parcel.codAmount),
                            style: GoogleFonts.outfit(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: parcel.codAmount > 0 ? AppColors.success : AppColors.textPrimary,
                            ),
                          ),
                        ],
                      ),
                      Row(
                        children: [
                          if (parcel.allowToOpen == 'Yes') ...[
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              margin: const EdgeInsets.only(right: 8),
                              decoration: BoxDecoration(
                                color: AppColors.infoSubtle,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                'Open Allowed',
                                style: TextStyle(fontSize: 10, color: AppColors.info, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                          Text(
                            '${parcel.pieces} Pc (${parcel.weight} kg)',
                            style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Quick Action Bar
                Row(
                  children: [
                    // Call Button
                    IconButton.filledTonal(
                      onPressed: () => _makeCall(parcel.recipientPhone),
                      icon: const Icon(LucideIcons.phoneCall, size: 16, color: AppColors.primaryLight),
                      style: IconButton.styleFrom(
                        backgroundColor: AppColors.primary.withOpacity(0.15),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                    const SizedBox(width: 8),

                    // Map Navigation Button
                    IconButton.filledTonal(
                      onPressed: () => _openMap(parcel.recipientAddress),
                      icon: const Icon(LucideIcons.navigation, size: 16, color: AppColors.info),
                      style: IconButton.styleFrom(
                        backgroundColor: AppColors.info.withOpacity(0.15),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                    const SizedBox(width: 8),

                    // Failed Attempt Button (if not yet delivered or RTO)
                    if (!isDelivered && !isReadyToReturn) ...[
                      Expanded(
                        child: OutlinedButton(
                          onPressed: onFailed,
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.warning,
                            side: BorderSide(color: AppColors.warning.withOpacity(0.5)),
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: const Text('Failed', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Deliver (e-POD) Button
                      Expanded(
                        flex: 2,
                        child: ElevatedButton(
                          onPressed: onDeliver,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(LucideIcons.checkCircle, size: 15),
                              SizedBox(width: 6),
                              Text('Deliver', style: TextStyle(fontSize: 13)),
                            ],
                          ),
                        ),
                      ),
                    ] else ...[
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: isDelivered ? AppColors.successSubtle : AppColors.errorSubtle,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            isDelivered ? '✓ Completed & Delivered' : 'Return to Hub (RTO)',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: isDelivered ? AppColors.success : AppColors.error,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
