import { describe, expect, it } from 'vitest';
import { productSchema } from './product';

describe('productSchema', () => {
  it('parses empty default product with name and sale price', () => {
    const empty = {
      name: 'Apple',
      sku: '',
      barcode: '',
      categoryId: '',
      subcategoryId: '',
      unitId: '',
      hsnCode: '',
      taxRateId: '',
      salePrice: '100',
      purchasePrice: '',
      openingStock: '',
      lowStockAlert: '',
      trackInventory: true,
      description: '',
      showInCatalog: true,
      customFields: {},
      saltComposition: '',
      genericName: '',
      manufacturer: '',
      packSize: '',
      drugSchedule: '',
    };
    const res = productSchema.safeParse(empty);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.name).toBe('Apple');
      expect(res.data.salePrice).toBe('100.00');
      expect(res.data.drugSchedule).toBeUndefined();
      expect(res.data.sku).toBeUndefined();
    }
  });

  it('accepts valid drug schedule and transforms none to undefined', () => {
    const withH = productSchema.safeParse({
      name: 'Crocin',
      salePrice: '50',
      drugSchedule: 'H',
    });
    expect(withH.success).toBe(true);
    if (withH.success) {
      expect(withH.data.drugSchedule).toBe('H');
    }

    const withNone = productSchema.safeParse({
      name: 'Crocin',
      salePrice: '50',
      drugSchedule: 'none',
    });
    expect(withNone.success).toBe(true);
    if (withNone.success) {
      expect(withNone.data.drugSchedule).toBeUndefined();
    }
  });

  it('handles null and empty values gracefully', () => {
    const withNulls = productSchema.safeParse({
      name: 'Item',
      salePrice: '20',
      sku: null,
      barcode: null,
      categoryId: null,
      subcategoryId: null,
      unitId: null,
      hsnCode: null,
      taxRateId: null,
      purchasePrice: null,
      openingStock: null,
      lowStockAlert: null,
      description: null,
      saltComposition: null,
      genericName: null,
      manufacturer: null,
      packSize: null,
      drugSchedule: null,
    });
    expect(withNulls.success).toBe(true);
  });

  it('rejects missing name and salePrice', () => {
    const noName = productSchema.safeParse({
      name: '',
      salePrice: '20',
    });
    expect(noName.success).toBe(false);

    const noPrice = productSchema.safeParse({
      name: 'Item',
      salePrice: '',
    });
    expect(noPrice.success).toBe(false);
  });
});
