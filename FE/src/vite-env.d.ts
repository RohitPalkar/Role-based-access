/// <reference types="vite/client" />

// Global constants defined in vite.config.ts
declare const __APP_ENV__: string;
declare const __BUILD_TIME__: string;

interface ImportMetaEnv {
  readonly VITE_APP_ENV: string;
  readonly VITE_BASE_PATH: string;
  readonly VITE_SERVER_URL: string;
  readonly VITE_ASSET_URL: string;
  readonly VITE_S3_BASE_URL: string;
  readonly VITE_REFERRAL_FORM_URL: string;
  readonly VITE_LOGIN_URL: string;
  readonly VITE_BOOKING_FORM_URL: string;
  readonly VITE_PURVALAND_BOOKING_FORM_URL: string;
  readonly VITE_PROVIDENT_BOOKING_FORM_URL: string;
  readonly VITE_DEFAULT_BOOKING_FORM_URL: string;
  readonly VITE_CHANNEL_PARTNER_LINK: string;
  readonly VITE_VOUCHER_FORM_LINK: string;
  readonly VITE_VOUCHER_THANKYOU_LINK: string;
  readonly REACT_APP_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_WEB_SOCKET_URL: string;
  readonly VITE_APP_CLOUDFLARE_SITE_KEY: string;
  /** `'true'` | `'false'` — Turnstile widget + CTA gate (dev usually false; UAT/prod true) */
  readonly VITE_APP_TURNSTILE_ENABLED: string;
  readonly VITE_GROUP_LISTING_URL: string;

}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
