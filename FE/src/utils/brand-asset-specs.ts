import { CONFIG } from 'src/config-global';

/**
 * Brand / background image specs for CMS uploads (aligns with current UI slots).
 * Filenames are served from VITE_S3_BASE_URL (same as projectBrandImage).
 */

export const BRAND_ASSET_SPECS = {
  /** Main header wordmark (left in Header / cards) */
  headerBrandLogo: {
    displaySlotPx: { maxWidth: { xs: 200, sm: 200, md: 276 }, maxHeight: 32 },
    objectFit: 'contain' as const,
    /** Upload bounds (e.g. 494×25 assets must pass dropzone validation). */
    recommendedSourcePx: { minWidth: 265, minHeight: 25 },
  },
  /** KVM / partner mark (right side when test project + KVM layout) — JV partner upload */
  headerPartnerLogo: {
    displaySlotPx: { maxHeight: { xs: 36, sm: 40, md: 75 } },
    objectFit: 'contain' as const,
   recommendedSourcePx: { minWidth: 265, minHeight: 25 },
  },
  /** Full-page background (project image, full-bleed sections) */
  pageBackground: {
    css: 'background-size: cover; background-position: center',
    recommendedSourcePx: { width: 1920, height: 1080 },
    acceptableRangePx: {
      minWidth: 1600,
      minHeight: 900,
      maxWidth: 3840,
      maxHeight: 2220,
    },
  },
} as const;

/** Min/max used by `NewDropzone` image validation (must match spec intent). */
export const BRAND_ASSET_DROPZONE_BOUNDS = {
  headerBrandLogo: {
    imgMinWidth: BRAND_ASSET_SPECS.headerBrandLogo.recommendedSourcePx.minWidth,
    imgMaxWidth: 2000,
    imgMinHeight: BRAND_ASSET_SPECS.headerBrandLogo.recommendedSourcePx.minHeight,
    imgMaxHeight: 350,
  },
  headerPartnerLogo: {
    imgMinWidth: BRAND_ASSET_SPECS.headerPartnerLogo.recommendedSourcePx.minWidth,
    imgMaxWidth: 3840,
    imgMinHeight: BRAND_ASSET_SPECS.headerPartnerLogo.recommendedSourcePx.minHeight,
    imgMaxHeight: 2160,
  },
  pageBackground: {
    imgMinWidth: BRAND_ASSET_SPECS.pageBackground.acceptableRangePx.minWidth,
    imgMaxWidth: BRAND_ASSET_SPECS.pageBackground.acceptableRangePx.maxWidth,
    imgMinHeight: BRAND_ASSET_SPECS.pageBackground.acceptableRangePx.minHeight,
    imgMaxHeight: BRAND_ASSET_SPECS.pageBackground.acceptableRangePx.maxHeight,
  },
} as const;

export type BrandAssetSlot = keyof typeof BRAND_ASSET_SPECS;

export const BRAND_IMAGE_TOOLTIP_RECOMMENDED_FORMAT =
  'Recommended Image Format - Transparent Image';

/** Pixel range line for tooltip + errors (matches `BRAND_ASSET_DROPZONE_BOUNDS`). */
export function formatBrandAssetRequiredDimensionsLine(slot: BrandAssetSlot): string {
  const b = BRAND_ASSET_DROPZONE_BOUNDS[slot];
  return `Width : ${b.imgMinWidth}–${b.imgMaxWidth} px · Height : ${b.imgMinHeight}–${b.imgMaxHeight} px`;
}

export type BrandImageUploadTooltipSpec = {
  requiredDimensions: string;
  /** Shown as "Aspect ratio : …" (project background uses 16:9). */
  aspectRatio?: string;
  recommendedFormat?: string;
};

/** Pass to `NewDropzone` `dimensionSpecTooltip` for CMS brand / project / JV images. */
export function getBrandAssetUploadTooltipContent(
  slot: BrandAssetSlot
): BrandImageUploadTooltipSpec {
  const withTransparentLogos =
    slot === 'headerBrandLogo' || slot === 'headerPartnerLogo';
  return {
    requiredDimensions: formatBrandAssetRequiredDimensionsLine(slot),
    ...(slot === 'pageBackground' && { aspectRatio: '16:9' }),
    ...(withTransparentLogos && { recommendedFormat: BRAND_IMAGE_TOOLTIP_RECOMMENDED_FORMAT }),
  };
}

/** O(n) trim of `/` from the end — no regex backtracking. */
function stripTrailingSlashes(input: string): string {
  let end = input.length;
  while (end > 0 && input[end - 1] === '/') {
    end -= 1;
  }
  return end === input.length ? input : input.slice(0, end);
}

/** O(n) trim of `/` from the start — no regex backtracking. */
function stripLeadingSlashes(input: string): string {
  const len = input.length;
  let start = 0;
  while (start < len && input[start] === '/') {
    start += 1;
  }
  return start === 0 ? input : input.slice(start);
}

/**
 * @param filename - Filename from API (e.g. projectBrandImage, kvmLogo)
 * @param baseUrl - Usually VITE_S3_BASE_URL / CONFIG.site.s3BasePath
 */
export function resolveBrandCdnUrl(
  filename?: string | null,
  baseUrl: string = CONFIG.site.s3BasePath
): string | null {
  if (!filename || !baseUrl) return null;
  const base = stripTrailingSlashes(String(baseUrl));
  const path = stripLeadingSlashes(String(filename));
  return `${base}/${path}`;
}
