import { UnitStatusEnum } from 'src/enums/booking-list.enums';

export function getDateFieldByUnitStatus(unitStatus: UnitStatusEnum): string {
  switch (unitStatus) {
    case UnitStatusEnum.UNREGULARIZED:
      return 'booking.bookingDate';
    case UnitStatusEnum.REGULARIZED:
      return 'booking.bookingDate';
    case UnitStatusEnum.QUALIFIED:
      return 'booking.payableReceivedDate';
    case UnitStatusEnum.CANCELLED:
      return 'booking.bookingDate';
    case UnitStatusEnum.DISQUALIFIED:
      return 'booking.disqualifiedDate';
    default:
      return 'booking.bookingDate';
  }
}
