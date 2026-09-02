import 'package:flutter/material.dart';
import 'app_colors.dart';

enum ParcelDeliveryStatus {
  totalBooking,
  notArrived,
  arrived,
  arrivedAtDestination,
  outForDelivery,
  delivered,
  failedAttempt,
  readyToReturn,
  returnDispatched,
  returnToShipper,
}

extension ParcelDeliveryStatusX on ParcelDeliveryStatus {
  String get value {
    switch (this) {
      case ParcelDeliveryStatus.totalBooking:
        return 'Total Booking';
      case ParcelDeliveryStatus.notArrived:
        return 'Not Arrived';
      case ParcelDeliveryStatus.arrived:
        return 'Arrived';
      case ParcelDeliveryStatus.arrivedAtDestination:
        return 'Arrived At Destination';
      case ParcelDeliveryStatus.outForDelivery:
        return 'Out For delivery';
      case ParcelDeliveryStatus.delivered:
        return 'Delivered';
      case ParcelDeliveryStatus.failedAttempt:
        return 'Failed Attempt';
      case ParcelDeliveryStatus.readyToReturn:
        return 'Ready To Return';
      case ParcelDeliveryStatus.returnDispatched:
        return 'Return Dispatched';
      case ParcelDeliveryStatus.returnToShipper:
        return 'Return to Shipper';
    }
  }

  static ParcelDeliveryStatus fromString(String? status) {
    if (status == null) return ParcelDeliveryStatus.totalBooking;
    switch (status.trim().toLowerCase()) {
      case 'out for delivery':
        return ParcelDeliveryStatus.outForDelivery;
      case 'delivered':
        return ParcelDeliveryStatus.delivered;
      case 'failed attempt':
        return ParcelDeliveryStatus.failedAttempt;
      case 'ready to return':
        return ParcelDeliveryStatus.readyToReturn;
      case 'return dispatched':
        return ParcelDeliveryStatus.returnDispatched;
      case 'return to shipper':
        return ParcelDeliveryStatus.returnToShipper;
      case 'arrived at destination':
        return ParcelDeliveryStatus.arrivedAtDestination;
      case 'arrived':
        return ParcelDeliveryStatus.arrived;
      case 'not arrived':
        return ParcelDeliveryStatus.notArrived;
      default:
        return ParcelDeliveryStatus.totalBooking;
    }
  }

  Color get color {
    switch (this) {
      case ParcelDeliveryStatus.delivered:
        return AppColors.success;
      case ParcelDeliveryStatus.outForDelivery:
        return AppColors.info;
      case ParcelDeliveryStatus.failedAttempt:
        return AppColors.warning;
      case ParcelDeliveryStatus.readyToReturn:
      case ParcelDeliveryStatus.returnDispatched:
      case ParcelDeliveryStatus.returnToShipper:
        return AppColors.error;
      default:
        return AppColors.textSecondary;
    }
  }

  Color get subtleColor {
    switch (this) {
      case ParcelDeliveryStatus.delivered:
        return AppColors.successSubtle;
      case ParcelDeliveryStatus.outForDelivery:
        return AppColors.infoSubtle;
      case ParcelDeliveryStatus.failedAttempt:
        return AppColors.warningSubtle;
      case ParcelDeliveryStatus.readyToReturn:
      case ParcelDeliveryStatus.returnDispatched:
      case ParcelDeliveryStatus.returnToShipper:
        return AppColors.errorSubtle;
      default:
        return AppColors.surfaceCard;
    }
  }
}
