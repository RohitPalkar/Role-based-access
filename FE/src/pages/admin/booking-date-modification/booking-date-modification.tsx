import { useAppDispatch } from "src/hooks/use-redux";

import { setTitleAsync } from "src/redux/slices/admin/title-slice";

import { BookingDateModificationView } from "src/sections/admin/booking-date-modification/booking-date-modification-view";

function BookingDateModification() {
  const dispatch = useAppDispatch();
  
  dispatch(setTitleAsync('Modify Booking Dates'));
  return <BookingDateModificationView />;
}

export default BookingDateModification;