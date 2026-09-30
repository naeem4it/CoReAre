import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../providers/runsheet_provider.dart';
import '../cod/cod_summary_screen.dart';
import '../parcel/parcel_detail_screen.dart';
import '../pod/delivery_action_sheet.dart';
import '../pod/pickup_action_sheet.dart';
import '../pod/failure_reason_sheet.dart';
import '../profile/profile_screen.dart';
import '../runsheet/runsheet_list_screen.dart';
import '../runsheet/widgets/parcel_card.dart';
import '../scanner/barcode_scanner_screen.dart';
import 'widgets/metrics_card.dart';
import 'widgets/pickup_parcel_card.dart';
import 'widgets/runsheet_banner.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final auth = context.read<AuthProvider>();
      if (auth.rider == null && auth.user != null) {
        await auth.refreshRider();
      }
      if (mounted) {
        context.read<RunsheetProvider>().fetchActiveRunsheet(riderId: auth.rider?.id ?? auth.user?.id);
      }
    });
  }

  void _openDeliverySheet(dynamic parcel) {
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
        },
      ),
    );
  }

  void _openPickupSheet(dynamic parcel) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => PickupActionSheet(
        parcel: parcel,
        onConfirm: ({signatureBase64, photoPath, senderName, senderPhone, actualPieces, actualWeight}) {
          context.read<RunsheetProvider>().markParcelPickedUp(
            parcelId: parcel.id,
            signatureBase64: signatureBase64,
            photoPath: photoPath,
            senderName: senderName,
            senderPhone: senderPhone,
            actualPieces: actualPieces,
            actualWeight: actualWeight,
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final runsheet = context.watch<RunsheetProvider>();
    final sheet = runsheet.activeSheet;
    final isDelivery = runsheet.isDeliveryMode;
    final currencyFormatter = NumberFormat.currency(symbol: 'PKR ', decimalDigits: 0);

    // Urgent Delivery Parcels
    final urgentDeliveries = sheet?.parcels
        .where((p) => p.status.toLowerCase() != 'delivered' && p.status.toLowerCase() != 'ready to return')
        .toList() ?? [];

    // Pending Pickups
    final pendingPickups = runsheet.pickupParcels
        .where((p) => p.status.toLowerCase().contains('book'))
        .toList();

    final pages = [
      // 1. Dashboard View
      RefreshIndicator(
        onRefresh: () => runsheet.fetchActiveRunsheet(riderId: auth.rider?.id ?? auth.user?.id),
        color: AppColors.primary,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Bar Greeting
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Welcome back,',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      Text(
                        auth.rider?.name ?? auth.user?.username ?? 'Courier Rider',
                        style: GoogleFonts.outfit(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                  GestureDetector(
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const ProfileScreen()),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceCard,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: const Row(
                        children: [
                          Icon(LucideIcons.radio, size: 13, color: AppColors.success),
                          SizedBox(width: 6),
                          Text(
                            'On Duty',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: AppColors.success,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),

              // DUAL MODE TOGGLE: DELIVER PARCELS vs PICK UP PARCELS
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: AppColors.surfaceCard,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    // Delivery Tab
                    Expanded(
                      child: GestureDetector(
                        onTap: () => runsheet.setMode(RiderOperationMode.delivery),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: isDelivery ? AppColors.primary : Colors.transparent,
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: isDelivery
                                ? [BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 2))]
                                : [],
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                LucideIcons.truck,
                                size: 16,
                                color: isDelivery ? Colors.white : AppColors.textSecondary,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Deliveries (${sheet?.totalParcels ?? 0})',
                                style: GoogleFonts.outfit(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: isDelivery ? Colors.white : AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),

                    // Pickup Tab
                    Expanded(
                      child: GestureDetector(
                        onTap: () => runsheet.setMode(RiderOperationMode.pickup),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: !isDelivery ? AppColors.primary : Colors.transparent,
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: !isDelivery
                                ? [BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 2))]
                                : [],
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                LucideIcons.packagePlus,
                                size: 16,
                                color: !isDelivery ? Colors.white : AppColors.textSecondary,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Pickups (${runsheet.totalPickups})',
                                style: GoogleFonts.outfit(
                                  fontSize: 14,
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
              const SizedBox(height: 18),

              // Active Runsheet Banner (in delivery mode)
              if (isDelivery && sheet != null) ...[
                RunsheetBanner(
                  sheet: sheet,
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const RunsheetListScreen()),
                    );
                  },
                ),
                const SizedBox(height: 18),
              ],

              // Metrics Grid (Delivery vs Pickup)
              if (isDelivery) ...[
                GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 2,
                  crossAxisSpacing: 14,
                  mainAxisSpacing: 14,
                  childAspectRatio: 1.25,
                  children: [
                    MetricsCard(
                      title: 'Total Manifest',
                      value: '${sheet?.totalParcels ?? 0}',
                      subtitle: 'Assigned deliveries',
                      icon: LucideIcons.package,
                      accentColor: AppColors.info,
                      onTap: () {
                        runsheet.setSelectedTab('All');
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const RunsheetListScreen()),
                        );
                      },
                    ),
                    MetricsCard(
                      title: 'Delivered',
                      value: '${sheet?.deliveredCount ?? 0}',
                      subtitle: 'Successful e-PODs',
                      icon: LucideIcons.checkCircle2,
                      accentColor: AppColors.success,
                      onTap: () {
                        runsheet.setSelectedTab('Delivered');
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const RunsheetListScreen()),
                        );
                      },
                    ),
                    MetricsCard(
                      title: 'Pending Stops',
                      value: '${sheet?.pendingCount ?? 0}',
                      subtitle: 'Remaining deliveries',
                      icon: LucideIcons.clock,
                      accentColor: AppColors.warning,
                      onTap: () {
                        runsheet.setSelectedTab('Pending');
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const RunsheetListScreen()),
                        );
                      },
                    ),
                    MetricsCard(
                      title: 'COD Collected',
                      value: currencyFormatter.format(sheet?.totalCollectedCod ?? 0),
                      subtitle: 'Cash in wallet',
                      icon: LucideIcons.banknote,
                      accentColor: AppColors.primaryLight,
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const CodSummaryScreen()),
                        );
                      },
                    ),
                  ],
                ),
              ] else ...[
                GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 2,
                  crossAxisSpacing: 14,
                  mainAxisSpacing: 14,
                  childAspectRatio: 1.25,
                  children: [
                    MetricsCard(
                      title: 'Total Pickups',
                      value: '${runsheet.totalPickups}',
                      subtitle: 'Merchant orders',
                      icon: LucideIcons.packagePlus,
                      accentColor: AppColors.primaryLight,
                      onTap: () => runsheet.setSelectedTab('All'),
                    ),
                    MetricsCard(
                      title: 'Picked Up',
                      value: '${runsheet.completedPickupsCount}',
                      subtitle: 'Collected & signed',
                      icon: LucideIcons.checkCircle2,
                      accentColor: AppColors.success,
                      onTap: () => runsheet.setSelectedTab('Completed'),
                    ),
                    MetricsCard(
                      title: 'Pending Pickups',
                      value: '${runsheet.pendingPickupsCount}',
                      subtitle: 'Awaiting collection',
                      icon: LucideIcons.clock,
                      accentColor: AppColors.warning,
                      onTap: () => runsheet.setSelectedTab('Pending'),
                    ),
                    MetricsCard(
                      title: 'Total Pieces',
                      value: '${runsheet.totalPickupPieces} pcs',
                      subtitle: 'Parcel volume',
                      icon: LucideIcons.boxes,
                      accentColor: AppColors.info,
                      onTap: () {},
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 20),

              // Action Shortcuts: Scan Parcel + List view
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => BarcodeScannerScreen(
                              initialMode: runsheet.mode,
                            ),
                          ),
                        );
                      },
                      icon: const Icon(LucideIcons.scan, size: 18),
                      label: Text(isDelivery ? 'Scan for Delivery' : 'Scan for Pickup'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        if (isDelivery) {
                          Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => const RunsheetListScreen()),
                          );
                        } else {
                          runsheet.setSelectedTab('All');
                        }
                      },
                      icon: Icon(isDelivery ? LucideIcons.listOrdered : LucideIcons.refreshCw, size: 18),
                      label: Text(isDelivery ? 'Run Sheet' : 'Refresh Pickups'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Active Stops Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    isDelivery
                        ? 'Upcoming Deliveries (${urgentDeliveries.length})'
                        : 'Merchant Pickups (${pendingPickups.length})',
                    style: GoogleFonts.outfit(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  if (isDelivery)
                    TextButton(
                      onPressed: () {
                        runsheet.setSelectedTab('Pending');
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const RunsheetListScreen()),
                        );
                      },
                      child: const Text('View All', style: TextStyle(color: AppColors.primaryLight, fontWeight: FontWeight.bold)),
                    ),
                ],
              ),
              const SizedBox(height: 10),

              // Stops List (Deliveries vs Pickups)
              if (isDelivery) ...[
                urgentDeliveries.isEmpty
                    ? Container(
                        padding: const EdgeInsets.all(24),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: AppColors.surfaceCard,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: const Text(
                          'All deliveries completed for today!',
                          style: TextStyle(color: AppColors.success, fontWeight: FontWeight.bold),
                        ),
                      )
                    : ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: urgentDeliveries.length > 5 ? 5 : urgentDeliveries.length,
                        itemBuilder: (context, index) {
                          final p = urgentDeliveries[index];
                          return ParcelCard(
                            parcel: p,
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => ParcelDetailScreen(parcel: p)),
                              );
                            },
                            onDeliver: () => _openDeliverySheet(p),
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
              ] else ...[
                runsheet.filteredPickupParcels.isEmpty
                    ? Container(
                        padding: const EdgeInsets.all(24),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: AppColors.surfaceCard,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: const Text(
                          'No pending merchant pickups in queue.',
                          style: TextStyle(color: AppColors.success, fontWeight: FontWeight.bold),
                        ),
                      )
                    : ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: runsheet.filteredPickupParcels.length,
                        itemBuilder: (context, index) {
                          final p = runsheet.filteredPickupParcels[index];
                          return PickupParcelCard(
                            parcel: p,
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => ParcelDetailScreen(parcel: p)),
                              );
                            },
                            onPickup: () => _openPickupSheet(p),
                          );
                        },
                      ),
              ],
            ],
          ),
        ),
      ),

      // 2. Full Run Sheet View
      const RunsheetListScreen(),

      // 3. COD Reconciliation View
      const CodSummaryScreen(),

      // 4. Profile & Settings View
      const ProfileScreen(),
    ];

    return Scaffold(
      body: SafeArea(child: pages[_currentIndex]),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
        backgroundColor: AppColors.surface,
        indicatorColor: AppColors.primary.withOpacity(0.25),
        destinations: const [
          NavigationDestination(
            icon: Icon(LucideIcons.layoutDashboard),
            selectedIcon: Icon(LucideIcons.layoutDashboard, color: AppColors.primaryLight),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(LucideIcons.listOrdered),
            selectedIcon: Icon(LucideIcons.listOrdered, color: AppColors.primaryLight),
            label: 'Run Sheet',
          ),
          NavigationDestination(
            icon: Icon(LucideIcons.wallet),
            selectedIcon: Icon(LucideIcons.wallet, color: AppColors.primaryLight),
            label: 'COD Wallet',
          ),
          NavigationDestination(
            icon: Icon(LucideIcons.user),
            selectedIcon: Icon(LucideIcons.user, color: AppColors.primaryLight),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
