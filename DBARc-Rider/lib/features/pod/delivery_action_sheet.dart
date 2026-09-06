import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/constants/app_colors.dart';
import '../../models/parcel_model.dart';
import 'signature_dialog.dart';

class DeliveryActionSheet extends StatefulWidget {
  final ParcelModel parcel;
  final Function({
    String? signatureBase64,
    String? photoPath,
    String? receiverName,
    String? receiverRelation,
  }) onConfirm;

  const DeliveryActionSheet({
    super.key,
    required this.parcel,
    required this.onConfirm,
  });

  @override
  State<DeliveryActionSheet> createState() => _DeliveryActionSheetState();
}

class _DeliveryActionSheetState extends State<DeliveryActionSheet> {
  final _receiverController = TextEditingController();
  final _otpController = TextEditingController();
  String _selectedRelation = 'Self';
  String? _signatureBase64;
  String? _photoPath;
  final ImagePicker _picker = ImagePicker();

  final List<String> _relations = ['Self', 'Family Member', 'Guard / Security', 'Colleague / Office', 'Neighbor'];

  @override
  void initState() {
    super.initState();
    _receiverController.text = widget.parcel.recipientName;
  }

  @override
  void dispose() {
    _receiverController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _capturePhoto() async {
    try {
      final XFile? photo = await _picker.pickImage(source: ImageSource.camera, imageQuality: 70);
      if (photo != null) {
        setState(() => _photoPath = photo.path);
      }
    } catch (e) {
      // Ignored / simulator without camera
    }
  }

  Future<void> _openSignaturePad() async {
    final result = await showDialog<String>(
      context: context,
      builder: (_) => const SignatureDialog(),
    );
    if (result != null) {
      setState(() => _signatureBase64 = result);
    }
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormatter = NumberFormat.currency(symbol: 'PKR ', decimalDigits: 0);

    return Container(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Handle Bar
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Confirm Delivery',
                      style: GoogleFonts.outfit(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Text(
                      'Tracking: ${widget.parcel.trackingNumber}',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: widget.parcel.isPaid ? AppColors.successSubtle : AppColors.primarySubtle.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: widget.parcel.isPaid ? AppColors.success.withOpacity(0.4) : AppColors.primaryLight.withOpacity(0.4),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        widget.parcel.isPaid ? 'PAID ORDER' : 'Collect COD',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: widget.parcel.isPaid ? AppColors.success : AppColors.primaryLight,
                        ),
                      ),
                      Text(
                        widget.parcel.isPaid ? 'PKR 0' : currencyFormatter.format(widget.parcel.codAmount),
                        style: GoogleFonts.outfit(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: widget.parcel.isPaid ? AppColors.success : AppColors.primaryLight,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Receiver Name & Relation
            Row(
              children: [
                Expanded(
                  flex: 3,
                  child: TextFormField(
                    controller: _receiverController,
                    decoration: const InputDecoration(
                      labelText: 'Receiver Name',
                      isDense: true,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 2,
                  child: DropdownButtonFormField<String>(
                    value: _selectedRelation,
                    decoration: const InputDecoration(
                      labelText: 'Relation',
                      isDense: true,
                    ),
                    dropdownColor: AppColors.surfaceCard,
                    items: _relations.map((r) => DropdownMenuItem(value: r, child: Text(r, style: const TextStyle(fontSize: 12)))).toList(),
                    onChanged: (val) => setState(() => _selectedRelation = val ?? 'Self'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // e-POD Proof: Signature & Camera Capture
            Row(
              children: [
                // Signature Button
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _openSignaturePad,
                    icon: Icon(
                      _signatureBase64 != null ? LucideIcons.checkCircle2 : LucideIcons.penTool,
                      size: 16,
                      color: _signatureBase64 != null ? AppColors.success : AppColors.textPrimary,
                    ),
                    label: Text(
                      _signatureBase64 != null ? 'Signature OK' : 'Get Signature',
                      style: TextStyle(
                        color: _signatureBase64 != null ? AppColors.success : AppColors.textPrimary,
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(
                        color: _signatureBase64 != null ? AppColors.success : AppColors.border,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),

                // Photo Button
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _capturePhoto,
                    icon: Icon(
                      _photoPath != null ? LucideIcons.checkCircle2 : LucideIcons.camera,
                      size: 16,
                      color: _photoPath != null ? AppColors.success : AppColors.textPrimary,
                    ),
                    label: Text(
                      _photoPath != null ? 'Photo Added' : 'Take Photo',
                      style: TextStyle(
                        color: _photoPath != null ? AppColors.success : AppColors.textPrimary,
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(
                        color: _photoPath != null ? AppColors.success : AppColors.border,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Submit Button
            ElevatedButton(
              onPressed: () {
                widget.onConfirm(
                  signatureBase64: _signatureBase64,
                  photoPath: _photoPath,
                  receiverName: _receiverController.text.trim(),
                  receiverRelation: _selectedRelation,
                );
                Navigator.of(context).pop();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(LucideIcons.check, size: 18),
                  SizedBox(width: 8),
                  Text('Complete Delivery (e-POD)', style: TextStyle(fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
