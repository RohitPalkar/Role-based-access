import { it, expect, describe } from 'vitest';

import {
  BRAND_ASSET_SPECS,
  resolveBrandCdnUrl,
  BRAND_ASSET_DROPZONE_BOUNDS,
  getBrandAssetUploadTooltipContent,
  formatBrandAssetRequiredDimensionsLine,
  BRAND_IMAGE_TOOLTIP_RECOMMENDED_FORMAT,
} from './brand-asset-specs';

describe('BRAND_ASSET_SPECS', () => {
  it('exposes the expected slots', () => {
    expect(Object.keys(BRAND_ASSET_SPECS).sort()).toEqual(
      ['headerBrandLogo', 'headerPartnerLogo', 'pageBackground'].sort()
    );
  });

  it('headerBrandLogo has the documented source bounds', () => {
    expect(BRAND_ASSET_SPECS.headerBrandLogo.recommendedSourcePx).toEqual({
      minWidth: 265,
      minHeight: 25,
    });
    expect(BRAND_ASSET_SPECS.headerBrandLogo.objectFit).toBe('contain');
  });

  it('pageBackground has the documented acceptable ranges', () => {
    expect(BRAND_ASSET_SPECS.pageBackground.acceptableRangePx).toEqual({
      minWidth: 1600,
      minHeight: 900,
      maxWidth: 3840,
      maxHeight: 2220,
    });
  });
});

describe('BRAND_ASSET_DROPZONE_BOUNDS', () => {
  it('derives logo bounds from recommendedSourcePx min values', () => {
    expect(BRAND_ASSET_DROPZONE_BOUNDS.headerBrandLogo.imgMinWidth).toBe(
      BRAND_ASSET_SPECS.headerBrandLogo.recommendedSourcePx.minWidth
    );
    expect(BRAND_ASSET_DROPZONE_BOUNDS.headerBrandLogo.imgMinHeight).toBe(
      BRAND_ASSET_SPECS.headerBrandLogo.recommendedSourcePx.minHeight
    );
    expect(BRAND_ASSET_DROPZONE_BOUNDS.headerPartnerLogo.imgMinWidth).toBe(
      BRAND_ASSET_SPECS.headerPartnerLogo.recommendedSourcePx.minWidth
    );
  });

  it('derives pageBackground bounds from acceptableRangePx', () => {
    expect(BRAND_ASSET_DROPZONE_BOUNDS.pageBackground).toEqual({
      imgMinWidth: BRAND_ASSET_SPECS.pageBackground.acceptableRangePx.minWidth,
      imgMaxWidth: BRAND_ASSET_SPECS.pageBackground.acceptableRangePx.maxWidth,
      imgMinHeight: BRAND_ASSET_SPECS.pageBackground.acceptableRangePx.minHeight,
      imgMaxHeight: BRAND_ASSET_SPECS.pageBackground.acceptableRangePx.maxHeight,
    });
  });
});

describe('formatBrandAssetRequiredDimensionsLine', () => {
  it('formats the dimension hint string per slot', () => {
    const b = BRAND_ASSET_DROPZONE_BOUNDS.headerBrandLogo;
    expect(formatBrandAssetRequiredDimensionsLine('headerBrandLogo')).toBe(
      `Width : ${b.imgMinWidth}–${b.imgMaxWidth} px · Height : ${b.imgMinHeight}–${b.imgMaxHeight} px`
    );
  });

  it('uses the page-background bounds for pageBackground', () => {
    const b = BRAND_ASSET_DROPZONE_BOUNDS.pageBackground;
    expect(formatBrandAssetRequiredDimensionsLine('pageBackground')).toBe(
      `Width : ${b.imgMinWidth}–${b.imgMaxWidth} px · Height : ${b.imgMinHeight}–${b.imgMaxHeight} px`
    );
  });
});

describe('getBrandAssetUploadTooltipContent', () => {
  it('attaches recommended format for logo slots and omits aspectRatio', () => {
    const brand = getBrandAssetUploadTooltipContent('headerBrandLogo');
    expect(brand.recommendedFormat).toBe(BRAND_IMAGE_TOOLTIP_RECOMMENDED_FORMAT);
    expect(brand.aspectRatio).toBeUndefined();
    expect(brand.requiredDimensions).toBe(
      formatBrandAssetRequiredDimensionsLine('headerBrandLogo')
    );

    const partner = getBrandAssetUploadTooltipContent('headerPartnerLogo');
    expect(partner.recommendedFormat).toBe(BRAND_IMAGE_TOOLTIP_RECOMMENDED_FORMAT);
    expect(partner.aspectRatio).toBeUndefined();
  });

  it('attaches 16:9 aspectRatio for pageBackground and omits recommendedFormat', () => {
    const bg = getBrandAssetUploadTooltipContent('pageBackground');
    expect(bg.aspectRatio).toBe('16:9');
    expect(bg.recommendedFormat).toBeUndefined();
    expect(bg.requiredDimensions).toBe(formatBrandAssetRequiredDimensionsLine('pageBackground'));
  });
});

describe('resolveBrandCdnUrl', () => {
  it('returns null when filename is missing', () => {
    expect(resolveBrandCdnUrl(null, 'https://cdn.example.com')).toBeNull();
    expect(resolveBrandCdnUrl(undefined, 'https://cdn.example.com')).toBeNull();
    expect(resolveBrandCdnUrl('', 'https://cdn.example.com')).toBeNull();
  });

  it('returns null when baseUrl is empty', () => {
    expect(resolveBrandCdnUrl('logo.png', '')).toBeNull();
  });

  it('joins baseUrl and filename with a single slash', () => {
    expect(resolveBrandCdnUrl('logo.png', 'https://cdn.example.com')).toBe(
      'https://cdn.example.com/logo.png'
    );
  });

  it('trims trailing slashes from the base URL', () => {
    expect(resolveBrandCdnUrl('logo.png', 'https://cdn.example.com///')).toBe(
      'https://cdn.example.com/logo.png'
    );
  });

  it('trims leading slashes from the filename', () => {
    expect(resolveBrandCdnUrl('///path/logo.png', 'https://cdn.example.com')).toBe(
      'https://cdn.example.com/path/logo.png'
    );
  });

  it('handles both trailing and leading slashes together', () => {
    expect(resolveBrandCdnUrl('//nested/logo.png', 'https://cdn.example.com//')).toBe(
      'https://cdn.example.com/nested/logo.png'
    );
  });
});
