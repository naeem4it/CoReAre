import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:image_picker/image_picker.dart';
import 'package:signature/signature.dart';
import '../../core/constants/app_colors.dart';
import '../../models/parcel_model.dart';

class PickupActionSheet extends StatefulWidget {
  final ParcelModel parcel;
  final Function({
    String? signatureBase64,
    String? photoPath,
    String? senderName,
    String? senderPhone,
    int? actualPieces,
    double? actualWeight,
  }) onConfirm;

  const PickupActionSheet({
    super.key,
    required this.parcel,
    required this.onConfirm,
  });

  @override
  State<PickupActionSheet> createState() => _PickupActionSheetState();
}

class _PickupActionSheetState extends State<PickupActionSheet> {
  final _senderController = TextEditingController();
  final _phoneController = TextEditingController();
  final _piecesController = TextEditingController();
  final _weightController = TextEditingController();
  String? _photoPath;
  late SignatureController _sigController;
  final ImagePicker _picker = ImagePicker();
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _senderController.text = widget.parcel.shipperName ?? 'Sender / Merchant';
    _phoneController.text = widget.parcel.shipperPhone ?? '';
    _piecesController.text = '${widget.parcel.pieces}';
    _weightController.text = '${widget.parcel.weight}';
    _sigController = SignatureController(
      penStrokeWidth: 3,
      penColor: Colors.black,
      exportBackgroundColor: Colors.white,
    );
  }

  @override
  void dispose() {
    _senderController.dispose();
    _phoneController.dispose();
    _piecesController.dispose();
    _weightController.dispose();
    _sigController.dispose();
    super.dispose();
  }

  Future<void> _capturePhoto() async {
    try {
      final XFile? photo = await _picker.pickImage(source: ImageSource.camera, imageQuality: 70);
      if (photo != null) {
        setState(() => _photoPath = photo.path);
      }
    } catch (e) {
      // Ignored on web/simulator without webcam
    }
  }

  Future<void> _handleConfirm() async {
    if (_sigController.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppColors.warning,
          content: Text('Please collect sender signature to verify pickup handover.'),
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    String? signatureBase64;
    try {
      final bytes = await _sigController.toPngBytes();
      if (bytes != null) {
        signatureBase64 = base64Encode(bytes);
      }
    } catch (_) {}

    widget.onConfirm(
      signatureBase64: signatureBase64,
      photoPath: _photoPath,
      senderName: _senderController.text.trim().isEmpty ? widget.parcel.shipperName : _senderController.text.trim(),
      senderPhone: _phoneController.text.trim(),
      actualPieces: int.tryParse(_piecesController.text) ?? widget.parcel.pieces,
      actualWeight: double.tryParse(_weightController.text) ?? widget.parcel.weight,
    );

    if (mounted) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
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
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(LucideIcons.packagePlus, color: AppColors.primaryLight, size: 20),
                    ),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Confirm Sender Pickup',
                          style: GoogleFonts.outfit(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        Text(
                          'Parcel #${widget.parcel.trackingNumber}',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(LucideIcons.x, color: AppColors.textSecondary, size: 20),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Merchant / Shipper Card
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.surfaceCard,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Merchant / Shipper:',
                        style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'Ready for Pickup',
                          style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primaryLight),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    widget.parcel.shipperName ?? 'Merchant Shipper',
                    style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                  if (widget.parcel.shipperAddress != null && widget.parcel.shipperAddress!.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(LucideIcons.mapPin, size: 12, color: AppColors.textSecondary),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            widget.parcel.shipperAddress!,
                            style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 8),
                  const Divider(color: AppColors.border, height: 1),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Destination: ${widget.parcel.destinationCityName ?? "Lahore"}',
                        style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.info),
                      ),
                      Text(
                        'Recipient: ${widget.parcel.recipientName}',
                        style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Handover Person & Contact
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Handover Person Name', style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary)),
                      const SizedBox(height: 4),
                      TextField(
                        controller: _senderController,
                        style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
                        decoration: InputDecoration(
                          hintText: 'e.g. Store Manager',
                          prefixIcon: const Icon(LucideIcons.user, size: 16, color: AppColors.textSecondary),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                          filled: true,
                          fillColor: AppColors.surfaceCard,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.border)),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Sender Phone', style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary)),
                      const SizedBox(height: 4),
                      TextField(
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
                        decoration: InputDecoration(
                          hintText: '0300-1234567',
                          prefixIcon: const Icon(LucideIcons.phone, size: 16, color: AppColors.textSecondary),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                          filled: true,
                          fillColor: AppColors.surfaceCard,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.border)),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Pieces & Weight Verification
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Pieces Count', style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary)),
                      const SizedBox(height: 4),
                      TextField(
                        controller: _piecesController,
                        keyboardType: TextInputType.number,
                        style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
                        decoration: InputDecoration(
                          prefixIcon: const Icon(LucideIcons.boxes, size: 16, color: AppColors.textSecondary),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                          filled: true,
                          fillColor: AppColors.surfaceCard,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.border)),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Weight (KG)', style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary)),
                      const SizedBox(height: 4),
                      TextField(
                        controller: _weightController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        style: const TextStyle(fontSize: 13, color: AppColors.textPrimary),
                        decoration: InputDecoration(
                          prefixIcon: const Icon(LucideIcons.scale, size: 16, color: AppColors.textSecondary),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                          filled: true,
                          fillColor: AppColors.surfaceCard,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.border)),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Sender Signature Pad
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Sender / Shipper Signature *',
                  style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
                TextButton.icon(
                  onPressed: () => _sigController.clear(),
                  icon: const Icon(LucideIcons.rotateCcw, size: 13, color: AppColors.textSecondary),
                  label: const Text('Clear', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                ),
              ],
            ),
            const SizedBox(height: 4),
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Container(
                height: 140,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Signature(
                  controller: _sigController,
                  backgroundColor: Colors.white,
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Optional Handover Photo Button
            OutlinedButton.icon(
              onPressed: _capturePhoto,
              icon: Icon(_photoPath != null ? LucideIcons.checkCircle : LucideIcons.camera, size: 16, color: _photoPath != null ? AppColors.success : AppColors.textSecondary),
              label: Text(_photoPath != null ? 'Handover Photo Attached' : 'Attach Parcel Photo (Optional)'),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 10),
                foregroundColor: _photoPath != null ? AppColors.success : AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 18),

            // Confirm Button
            ElevatedButton.icon(
              onPressed: _isSubmitting ? null : _handleConfirm,
              icon: _isSubmitting
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(LucideIcons.check, size: 18),
              label: Text(
                _isSubmitting ? 'Confirming Pickup...' : 'Confirm Pickup & Handover',
                style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
