import { describe, expect, it } from 'vitest';
import {
  appOrigin,
  catalogProductUrl,
  enquiryMessage,
  productSlug,
  shortIdFromProductSlug,
  whatsappEnquiryUrl,
} from './index';

const ID = '10c981f4-cc60-4f08-9479-94c4ed8ee186';

describe('product slugs', () => {
  it('puts the product name in the URL for SEO', () => {
    expect(productSlug('Tata Salt 1kg', ID)).toBe('tata-salt-1kg-10c981f4');
  });

  it('round-trips back to the short id', () => {
    expect(shortIdFromProductSlug(productSlug('Tata Salt 1kg', ID))).toBe('10c981f4');
  });

  it('gives two products with the same name different URLs', () => {
    const other = '99998888-cc60-4f08-9479-94c4ed8ee186';
    expect(productSlug('Salt', ID)).not.toBe(productSlug('Salt', other));
  });

  it('still produces a usable slug for a name with no latin characters', () => {
    const slug = productSlug('नमक', ID);
    expect(slug).toBe('10c981f4');
    expect(shortIdFromProductSlug(slug)).toBe('10c981f4');
  });

  it('returns undefined when a slug carries no id', () => {
    expect(shortIdFromProductSlug('just-a-name')).toBeUndefined();
  });

  it('builds a full product URL', () => {
    expect(catalogProductUrl('https://x.com/', 'my-shop', 'Tata Salt 1kg', ID)).toBe(
      'https://x.com/store/my-shop/tata-salt-1kg-10c981f4',
    );
  });
});

describe('whatsappEnquiryUrl', () => {
  it('adds the country code to a bare 10-digit mobile', () => {
    expect(whatsappEnquiryUrl('9876543210', 'hi')).toBe('https://wa.me/919876543210?text=hi');
  });

  it('keeps an existing country code and strips punctuation', () => {
    expect(whatsappEnquiryUrl('+91 98765-43210', 'hi')).toBe(
      'https://wa.me/919876543210?text=hi',
    );
  });

  it('returns undefined with no usable number, so no dead button renders', () => {
    expect(whatsappEnquiryUrl(null, 'hi')).toBeUndefined();
    expect(whatsappEnquiryUrl('', 'hi')).toBeUndefined();
    expect(whatsappEnquiryUrl('12345', 'hi')).toBeUndefined();
  });

  it('escapes the message', () => {
    const url = whatsappEnquiryUrl('9876543210', enquiryMessage('Sharma & Sons', 'Salt 1kg'))!;
    expect(url).toContain('%26'); // &
    expect(url).toContain('%22'); // "
  });
});

describe('appOrigin', () => {
  it('drops a trailing slash, however many were typed', () => {
    expect(appOrigin('https://shop.example.com/')).toBe('https://shop.example.com');
    expect(appOrigin('https://shop.example.com///')).toBe('https://shop.example.com');
  });

  it('leaves a clean origin alone', () => {
    expect(appOrigin('https://shop.example.com')).toBe('https://shop.example.com');
  });

  it('falls back to localhost when unset or blank', () => {
    expect(appOrigin(undefined)).toBe('http://localhost:3000');
    expect(appOrigin('   ')).toBe('http://localhost:3000');
  });
});
