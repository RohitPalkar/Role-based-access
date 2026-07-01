// Configuration for booking form URLs based on project brand names

import { COMPARE_VALUE } from "src/utils/constant";

export type ProjectBrandName = typeof COMPARE_VALUE[keyof typeof COMPARE_VALUE];

export interface BookingFormUrlConfig {
  [key: string]: string;
}

// Get booking form URLs from environment variables
const getBookingFormUrls = (): BookingFormUrlConfig => ({
    [COMPARE_VALUE.Puravankara]: import.meta.env.VITE_BOOKING_FORM_URL || import.meta.env.VITE_DEFAULT_BOOKING_FORM_URL,
    [COMPARE_VALUE.Provident]: import.meta.env.VITE_PROVIDENT_BOOKING_FORM_URL ||import.meta.env.VITE_DEFAULT_BOOKING_FORM_URL,
    [COMPARE_VALUE.PurvaLand]: import.meta.env.VITE_PURVALAND_BOOKING_FORM_URL || import.meta.env.VITE_DEFAULT_BOOKING_FORM_URL,
  });

export const BOOKING_FORM_URLS: BookingFormUrlConfig = getBookingFormUrls();
 

export const generateBookingFormUrl = (
  projectBrandName: string,
  opportunityId: string,
  groupId?: string
): string => {
  // ✅ Group listing must NEVER depend on booking-form URL
  if (groupId) {
    const groupListingBaseUrl = import.meta.env.VITE_GROUP_LISTING_URL;

    if (!groupListingBaseUrl) {
      console.error('VITE_GROUP_LISTING_URL is not defined');
      return '';
    }

    return `${groupListingBaseUrl}/${groupId}`;
  }

  const baseUrl = BOOKING_FORM_URLS[projectBrandName];

  if (!baseUrl) {
    const defaultUrl = BOOKING_FORM_URLS[COMPARE_VALUE.Puravankara];
    return `${defaultUrl}/${opportunityId}`;
  }

  return `${baseUrl}/${opportunityId}`;
};


/**
 * Get all available project brand names
 * @returns Array of project brand names
 */
export const getAvailableProjectBrands = (): string[] => Object.keys(BOOKING_FORM_URLS);