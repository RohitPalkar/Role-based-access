import { BookingPDFTypeEnum } from 'src/enums/booking-documents.enum';
import { formatDate } from './dateFormat';
import { DATE_FORMAT_DMY } from 'src/config/constants';
import { logger } from 'src/logger/logger';

export function getBookingFileName(
  booking: any,
  oppId: string,
  formType: string = BookingPDFTypeEnum.BOOKING,
): string {
  try {
    if (!booking?.unitDetails) {
      return 'Booking_Application.pdf';
    }
    const { projectName, blockTower, unitNumber } = booking?.unitDetails || {};
    const date = formatDate(booking?.modifiedAt, DATE_FORMAT_DMY);
    const fileName = `${formType}_${projectName}_${blockTower}_${unitNumber}_${date}.pdf`;
    return fileName.replace(/ /g, '_');
  } catch (error) {
    logger.info('Pdf name not created', error);
    return `${formType}.pdf`;
  }
}
