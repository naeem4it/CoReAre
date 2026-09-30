import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/constants/app_colors.dart';
import '../../../models/parcel_model.dart';

class PickupParcelCard extends StatelessWidget {
  final ParcelModel parcel;
  final VoidCallback onTap;
  final VoidCallback onPickup;

  const PickupParcelCard({
    super.key,
    required this.parcel,
    required this.onTap,
    required this.onPickup,
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
    final isPickedUp = parcel.status == 'Picked up by rider';

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: AppColors.surfaceCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isPickedUp ? AppColors.success.withOpacity(0.5) : AppColors.border,
          width: isPickedUp ? 1.5 : 1,
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
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: isPickedUp
                                ? AppColors.success.withOpacity(0.15)
                                : AppColors.primary.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(
                            isPickedUp ? LucideIcons.checkCircle2 : LucideIcons.packagePlus,
                            size: 14,
                            color: isPickedUp ? AppColors.success : AppColors.primaryLight,
                          ),
                        ),
                        const SizedBox(width: 8),
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
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: isPickedUp
                            ? AppColors.success.withOpacity(0.15)
                            : AppColors.primary.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: isPickedUp ? AppColors.success.withOpacity(0.4) : AppColors.primaryLight.withOpacity(0.4),
                        ),
                      ),
                      child: Text(
                        isPickedUp ? 'Picked Up' : 'Ready for Pickup',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: isPickedUp ? AppColors.success : AppColors.primaryLight,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Shipper / Merchant Details
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                'Merchant / Shipper',
                                style: GoogleFonts.inter(
                                  fontSize: 11,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                decoration: BoxDecoration(
                                  color: AppColors.surface,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  '${parcel.pieces} pcs • ${parcel.weight.toStringAsFixed(1)} kg',
                                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.info),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 3),
                          Text(
                            parcel.shipperName ?? 'Merchant Shipper',
                            style: GoogleFonts.outfit(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          // Shipper Address
                          Row(
                            children: [
                              const Icon(LucideIcons.mapPin, size: 13, color: AppColors.textSecondary),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  parcel.shipperAddress ?? parcel.recipientAddress,
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    color: AppColors.textSecondary,
                                  ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    // Quick Actions (Call / Map)
                    Row(
                      children: [
                        if (parcel.shipperPhone != null && parcel.shipperPhone!.isNotEmpty)
                          IconButton(
                            onPressed: () => _makeCall(parcel.shipperPhone!),
                            icon: const Icon(LucideIcons.phoneCall, size: 18, color: AppColors.primaryLight),
                            style: IconButton.styleFrom(
                              backgroundColor: AppColors.surface,
                              padding: const EdgeInsets.all(8),
                            ),
                          ),
                        IconButton(
                          onPressed: () => _openMap(parcel.shipperAddress ?? parcel.recipientAddress),
                          icon: const Icon(LucideIcons.navigation, size: 18, color: AppColors.info),
                          style: IconButton.styleFrom(
                            backgroundColor: AppColors.surface,
                            padding: const EdgeInsets.all(8),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Destination info line
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Deliver To: ${parcel.recipientName}',
                        style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary),
                      ),
                      Text(
                        'Dest: ${parcel.destinationCityName ?? "Lahore"}',
                        style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Bottom Action: Pickup Button or Completion info
                if (!isPickedUp) ...[
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: onPickup,
                      icon: const Icon(LucideIcons.penTool, size: 16),
                      label: const Text('Pick Up & Take Sender Signature'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        textStyle: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ] else ...[
                  Row(
                    children: [
                      const Icon(LucideIcons.checkCheck, size: 16, color: AppColors.success),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          parcel.comments ?? 'Picked up from sender successfully with signature.',
                          style: const TextStyle(fontSize: 12, color: AppColors.success, fontWeight: FontWeight.w600),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
