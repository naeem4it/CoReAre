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
import '../pod/failure_reason_sheet.dart';
import '../profile/profile_screen.dart';
import '../runsheet/runsheet_list_screen.dart';
import '../runsheet/widgets/parcel_card.dart';
import '../scanner/barcode_scanner_screen.dart';
import 'widgets/metrics_card.dart';
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
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      context.read<RunsheetProvider>().fetchActiveRunsheet(riderId: auth.rider?.id);
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final runsheet = context.watch<RunsheetProvider>();
    final sheet = runsheet.activeSheet;
    final currencyFormatter = NumberFormat.currency(symbol: 'PKR ', decimalDigits: 0);

    // Urgent Parcels: Parcels with active Shipper Advice or Pending Stops
    final urgentParcels = sheet?.parcels
        .where((p) => p.status != 'Delivered' && p.status != 'Ready To Return')
        .toList() ?? [];

    final pages = [
      // 1. Dashboard View
      RefreshIndicator(
        onRefresh: () => runsheet.fetchActiveRunsheet(riderId: auth.rider?.id),
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
              const SizedBox(height: 20),

              // Active Runsheet Banner
              if (sheet != null) ...[
                RunsheetBanner(
                  sheet: sheet,
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const RunsheetListScreen()),
                    );
                  },
                ),
                const SizedBox(height: 20),
              ],

              // Metrics Grid
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
                    subtitle: 'Assigned shipments',
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
              const SizedBox(height: 24),

              // Action Shortcuts
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const BarcodeScannerScreen()),
                        );
                      },
                      icon: const Icon(LucideIcons.scan, size: 18),
                      label: const Text('Scan Parcel'),
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
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const RunsheetListScreen()),
                        );
                      },
                      icon: const Icon(LucideIcons.listOrdered, size: 18),
                      label: const Text('Run Sheet'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 28),

              // Active / Priority Deliveries Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Upcoming Stops (${urgentParcels.length})',
                    style: GoogleFonts.outfit(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
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

              // Urgent Parcel Cards (showing top 3)
              urgentParcels.isEmpty
                  ? Container(
                      padding: const EdgeInsets.all(24),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: AppColors.surfaceCard,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: const Text(
                        'All stops for today have been completed!',
                        style: TextStyle(color: AppColors.success, fontWeight: FontWeight.bold),
                      ),
                    )
                  : ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: urgentParcels.length > 4 ? 4 : urgentParcels.length,
                      itemBuilder: (context, index) {
                        final p = urgentParcels[index];
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
