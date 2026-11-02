export type AppSettingsData = {
  companyName: string;
  companyAddress: string;
  contactEmail: string;
  prepDaysDefault: number;
  returnDaysDefault: number;
  currency: string;
  notifyCheckoutTomorrow: boolean;
  notifyReturnTomorrow: boolean;
  notifyOverdueReturn: boolean;
  notifyNewBooking: boolean;
  notifyBookingConflict: boolean;
  notifyMaintenanceDue: boolean;
};

export const DEFAULT_APP_SETTINGS: AppSettingsData = {
  companyName: "Darda GmbH",
  companyAddress: "Darda-Straße 1, 78199 Bräunlingen",
  contactEmail: "info@darda.de",
  prepDaysDefault: 1,
  returnDaysDefault: 1,
  currency: "EUR",
  notifyCheckoutTomorrow: true,
  notifyReturnTomorrow: true,
  notifyOverdueReturn: true,
  notifyNewBooking: true,
  notifyBookingConflict: true,
  notifyMaintenanceDue: true,
};
