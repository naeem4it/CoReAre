import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/runsheet_provider.dart';
import '../parcel/parcel_detail_screen.dart';
import '../pod/delivery_action_sheet.dart';
import '../pod/failure_reason_sheet.dart';
import '../scanner/barcode_scanner_screen.dart';
import 'widgets/parcel_card.dart';

class RunsheetListScreen extends StatelessWidget {
  const RunsheetListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final runsheet = context.watch<RunsheetProvider>();
    final sheet = runsheet.activeSheet;
    final parcels = runsheet.filteredParcels;

    final tabs = ['All', 'Pending', 'Delivered', 'Failed'];

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              sheet?.sheetNumber ?? 'Delivery Sheet',
              style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            Text(
              sheet?.customName ?? 'Today\'s Dispatch',
              style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.scan, color: AppColors.primaryLight),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const BarcodeScannerScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(LucideIcons.refreshCw),
            onPressed: () => runsheet.fetchActiveRunsheet(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search & Filter Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            color: AppColors.surface,
            child: Column(
              children: [
                // Search Input
                TextField(
                  onChanged: (v) => runsheet.setSearchQuery(v),
                  decoration: InputDecoration(
                    isDense: true,
                    hintText: 'Search by tracking #, name, or phone...',
                    prefixIcon: const Icon(LucideIcons.search, size: 16, color: AppColors.textMuted),
                    suffixIcon: runsheet.searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(LucideIcons.x, size: 16),
                            onPressed: () => runsheet.setSearchQuery(''),
                          )
                        : null,
                  ),
                ),
                const SizedBox(height: 10),

                // Status Tabs
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: tabs.map((tab) {
                      final isSelected = runsheet.selectedTab == tab;
                      int count = 0;
                      if (sheet != null) {
                        if (tab == 'All') count = sheet.totalParcels;
                        if (tab == 'Pending') count = sheet.pendingCount;
                        if (tab == 'Delivered') count = sheet.deliveredCount;
                        if (tab == 'Failed') count = sheet.failedCount;
                      }

                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: FilterChip(
                          label: Text('$tab ($count)'),
                          selected: isSelected,
                          onSelected: (_) => runsheet.setSelectedTab(tab),
                          backgroundColor: AppColors.surfaceCard,
                          selectedColor: AppColors.primary.withOpacity(0.3),
                          checkmarkColor: AppColors.primaryLight,
                          labelStyle: TextStyle(
                            fontSize: 12,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                            color: isSelected ? AppColors.primaryLight : AppColors.textSecondary,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                            side: BorderSide(
                              color: isSelected ? AppColors.primary : AppColors.border,
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),

          // Parcel Manifest List
          Expanded(
            child: runsheet.isLoading
                ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                : parcels.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(LucideIcons.packageCheck, size: 48, color: AppColors.textMuted),
                            const SizedBox(height: 12),
                            Text(
                              'No shipments in this view',
                              style: GoogleFonts.outfit(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: parcels.length,
                        itemBuilder: (context, index) {
                          final p = parcels[index];
                          return ParcelCard(
                            parcel: p,
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => ParcelDetailScreen(parcel: p)),
                              );
                            },
                            onDeliver: () {
                              showModalBottomSheet(
                                context: context,
                                isScrollControlled: true,
                                backgroundColor: Colors.transparent,
                                builder: (_) => DeliveryActionSheet(
                                  parcel: p,
                                  onConfirm: ({signatureBase64, photoPath, receiverName, receiverRelation}) {
                                    runsheet.markParcelDelivered(
                                      parcelId: p.id,
                                      signatureBase64: signatureBase64,
                                      photoPath: photoPath,
                                      receiverName: receiverName,
                                      receiverRelation: receiverRelation,
                                    );
                                  },
                                ),
                              );
                            },
                            onFailed: () {
                              showModalBottomSheet(
                                context: context,
                                isScrollControlled: true,
                                backgroundColor: Colors.transparent,
                                builder: (_) => FailureReasonSheet(
                                  parcel: p,
                                  onSubmit: (reason, notes) {
                                    runsheet.markParcelFailedAttempt(
                                      parcelId: p.id,
                                      failureReason: reason,
                                      riderNotes: notes,
                                    );
                                  },
                                ),
                              );
                            },
                          );
                        },
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const BarcodeScannerScreen()),
          );
        },
        icon: const Icon(LucideIcons.scan, color: Colors.white, size: 18),
        label: const Text('Scan Parcel', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
    );
  }
}
