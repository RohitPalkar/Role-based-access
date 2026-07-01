import {
  BRAND_PURAVANKARA,
  BRAND_PURVA_LAND,
  BRAND_PROVIDENT,
  BRAND_PROVIDENT_LAND,
  BrandType,
} from 'src/config/constants';

// Interface describing the assets and branding details for each brand used in email templates
interface BrandAssets {
  name: string; // Display name of the brand
  brandName: string; // Display name of the brand
  logoUrl: string; // Logo image URL for the brand
  website: string; // Official website URL
  socialLinks: {
    instagram: string; // Instagram profile link
    linkedin: string; // LinkedIn profile link
    facebook: string; // Facebook profile link
  };
  addressHtml: string; // Address and contact info in HTML format
}

// Mapping of each BrandType to its corresponding branding assets and details
// Used to dynamically render the correct branding in all outgoing emails
export const brandMap: Record<BrandType, BrandAssets> = {
  [BRAND_PURVA_LAND]: {
    name: 'PurvaLand',
    brandName: 'PurvaLand',
    logoUrl: `logos/purvaland-logo.png`,
    website: 'https://www.purvaland.com/',
    socialLinks: {
      instagram: 'https://www.instagram.com/purvaland/',
      linkedin: 'https://www.linkedin.com/company/purva-land/',
      facebook: 'https://www.facebook.com/PurvaLand/',
    },
    addressHtml: `Purva Land<br/>30/1, Ulsoor Road, Bengaluru, Karnataka - 560042`,
  },
  [BRAND_PURAVANKARA]: {
    name: 'Puravankara Limited',
    brandName: 'Puravankara Limited',
    logoUrl: `logos/puravankara-logo.png`,
    website: 'https://www.puravankara.com/',
    socialLinks: {
      instagram: 'https://www.instagram.com/puravankara_official/?hl=en',
      linkedin: 'https://in.linkedin.com/company/puravankara',
      facebook: 'https://www.facebook.com/Puravankara/',
    },
    addressHtml: `Puravankara Limited.<br/>#130/1, Ulsoor Road Bengaluru, Karnataka - 560 042<br/>Call: <a href="tel:08044555555" style="text-decoration:none; color:#000">080 44555555</a>`,
  },
  [BRAND_PROVIDENT]: {
    name: 'Provident Housing',
    brandName: 'Provident Housing',
    logoUrl: `logos/provident-logo.png`,
    website: 'https://www.providenthousing.com/',
    socialLinks: {
      instagram: 'https://www.instagram.com/ourprovidenthousing/',
      linkedin: 'https://www.linkedin.com/company/providenthousing/',
      facebook: 'https://www.facebook.com/providenthousing',
    },
    addressHtml: `Provident Housing Limited<br/>No.8, Ulsoor Road Bengaluru - 560042<br/>Call: <a href="tel:08044555544" style="text-decoration:none; color:#000">080 44555544</a>`,
  },
  [BRAND_PROVIDENT_LAND]: {
    name: 'Provident Housing',
    brandName: 'Provident Housing',
    logoUrl: `logos/provident-logo.png`,
    website: 'https://www.providenthousing.com/',
    socialLinks: {
      instagram: 'https://www.instagram.com/ourprovidenthousing/',
      linkedin: 'https://www.linkedin.com/company/providenthousing/',
      facebook: 'https://www.facebook.com/providenthousing',
    },
    addressHtml: `Provident Housing Limited<br/>No.8, Ulsoor Road Bengaluru - 560042<br/>Call: <a href="tel:08044555544" style="text-decoration:none; color:#000">080 44555544</a>`,
  },
};

// Utility function to safely resolve brand name to BrandType
export function resolveBrandType(brandName?: string): BrandType {
  const validBrands = [
    BRAND_PURAVANKARA,
    BRAND_PURVA_LAND,
    BRAND_PROVIDENT,
    BRAND_PROVIDENT_LAND,
  ];
  if (brandName && validBrands.includes(brandName)) {
    return brandName as BrandType;
  }
  return BRAND_PURAVANKARA;
}
