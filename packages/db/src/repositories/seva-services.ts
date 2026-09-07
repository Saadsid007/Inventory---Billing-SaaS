import type { TenantCtx } from '@billwise/shared';
import { and, asc, eq, sql } from 'drizzle-orm';
import { getDb } from '../client';
import { products } from '../schema/index';

/**
 * The rate list at a Jan Seva Kendra.
 *
 * ## Why these are products
 *
 * A CSC sells work, not goods, but the shape is identical to a product for
 * everything billing needs: a name, a price, and a line on a receipt. Giving
 * them their own table would have meant a second invoice-line path, a second
 * export, a second everything — for a row with fewer columns.
 *
 * So a service is a product with `track_inventory = false`, and this file is
 * the vocabulary that sits over it:
 *
 *   sale_price      → what the customer pays in total
 *   purchase_price  → the government fee, which genuinely is the cost
 *
 * That second mapping is the useful one. UIDAI's ₹50 on a ₹150 Aadhaar update
 * is money the shop collects and passes on, so treating it as cost makes
 * "earned" come out right in every report that already existed, with no new
 * column and no special case.
 *
 * ## What lives in customFields
 *
 * Whether the work takes days, and roughly how many. Two facts that matter
 * only to this trade, kept in the jsonb column that exists for exactly this —
 * a photocopy is finished before the customer turns around, a PAN card is not,
 * and the receipt screen needs to know which without being told every time.
 */

export type SevaService = {
  id: string;
  name: string;
  sku: string | null;
  /** What the customer pays. */
  price: string;
  /** What goes to the government. '0.00' when there is none. */
  govtFee: string;
  /** price − govtFee. What the shop actually earns. */
  earns: string;
  /** True when this runs for days and belongs on the work register. */
  tracked: boolean;
  /** Usual turnaround, used to suggest a promised date. */
  days: number;
  isActive: boolean;
};

type CustomFields = { tracked?: boolean; days?: number };

function toService(row: {
  id: string;
  name: string;
  sku: string | null;
  salePrice: string;
  purchasePrice: string | null;
  customFields: unknown;
  isActive: boolean;
}): SevaService {
  const custom = (row.customFields ?? {}) as CustomFields;
  const price = Number(row.salePrice);
  const govtFee = Number(row.purchasePrice ?? 0);
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    price: price.toFixed(2),
    govtFee: govtFee.toFixed(2),
    earns: Math.max(0, price - govtFee).toFixed(2),
    tracked: custom.tracked === true,
    days: typeof custom.days === 'number' ? custom.days : 7,
    isActive: row.isActive,
  };
}

export async function listSevaServices(
  ctx: TenantCtx,
  opts: { includeInactive?: boolean } = {},
): Promise<SevaService[]> {
  const where = [eq(products.businessId, ctx.businessId)];
  if (!opts.includeInactive) where.push(eq(products.isActive, true));

  const rows = await getDb()
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      salePrice: products.salePrice,
      purchasePrice: products.purchasePrice,
      customFields: products.customFields,
      isActive: products.isActive,
    })
    .from(products)
    .where(and(...where))
    .orderBy(asc(products.name));

  return rows.map(toService);
}

export type SevaServiceInput = {
  name: string;
  sku?: string | null;
  price: string;
  govtFee?: string | null;
  tracked: boolean;
  days: number;
};

export async function createSevaService(ctx: TenantCtx, input: SevaServiceInput) {
  const [row] = await getDb()
    .insert(products)
    .values({
      businessId: ctx.businessId,
      name: input.name.trim(),
      sku: input.sku?.trim() || null,
      salePrice: input.price,
      purchasePrice: input.govtFee && Number(input.govtFee) > 0 ? input.govtFee : null,
      // Nothing here sits on a shelf, so no stock and no opening movement.
      trackInventory: false,
      showInCatalog: true,
      customFields: { tracked: input.tracked, days: input.days },
    })
    .returning({ id: products.id });
  return row;
}

export async function updateSevaService(
  ctx: TenantCtx,
  serviceId: string,
  input: SevaServiceInput,
): Promise<void> {
  await getDb()
    .update(products)
    .set({
      name: input.name.trim(),
      sku: input.sku?.trim() || null,
      salePrice: input.price,
      purchasePrice: input.govtFee && Number(input.govtFee) > 0 ? input.govtFee : null,
      customFields: { tracked: input.tracked, days: input.days },
    })
    .where(and(eq(products.id, serviceId), eq(products.businessId, ctx.businessId)));
}

/**
 * Retire a service.
 *
 * Deactivated, never deleted: receipts snapshot the name but the line still
 * points at the row, and a rate that vanishes takes its history with it.
 */
export async function setSevaServiceActive(
  ctx: TenantCtx,
  serviceId: string,
  isActive: boolean,
): Promise<void> {
  await getDb()
    .update(products)
    .set({ isActive })
    .where(and(eq(products.id, serviceId), eq(products.businessId, ctx.businessId)));
}

export type SevaEarnings = {
  collected: string;
  /** Total billed, whether or not the money has come in. */
  billed: string;
  /** Government fees inside that, which the shop never keeps. */
  govtFees: string;
  /** billed − govtFees. The shop's own earning. */
  earned: string;
  receipts: number;
};

/**
 * What the shop actually made over a range.
 *
 * Reported separately from turnover on purpose. A CSC that billed ₹1,00,000
 * may have handed ₹22,000 straight to the government, and a "sales" figure
 * that hides that is the one number an owner would most like to be told
 * correctly.
 *
 * The government fee is read from the service master rather than snapshotted
 * on the line — a rate change therefore restates history, which is wrong in
 * principle and irrelevant in practice at this size. Worth revisiting only if
 * somebody starts filing accounts from it.
 */
export async function getSevaEarnings(
  ctx: TenantCtx,
  range: { from: string; to: string },
): Promise<SevaEarnings> {
  const [row] = await getDb().execute<{
    collected: string;
    billed: string;
    govt: string;
    receipts: number;
  }>(sql`
    select
      coalesce(sum(i.amount_paid), 0)::numeric(12,2)::text as "collected",
      coalesce(sum(i.grand_total), 0)::numeric(12,2)::text as "billed",
      coalesce((
        select sum(l.qty * coalesce(p.purchase_price, 0))
        from invoice_lines l
        join invoices i2 on i2.id = l.invoice_id
        left join products p on p.id = l.product_id
        where i2.business_id = ${ctx.businessId}::uuid
          and i2.status = 'issued'
          and i2.invoice_date between ${range.from}::date and ${range.to}::date
      ), 0)::numeric(12,2)::text as "govt",
      count(*)::int as "receipts"
    from invoices i
    where i.business_id = ${ctx.businessId}::uuid
      and i.status = 'issued'
      and i.invoice_date between ${range.from}::date and ${range.to}::date
  `);

  const billed = Number(row?.billed ?? 0);
  const govt = Number(row?.govt ?? 0);

  return {
    collected: Number(row?.collected ?? 0).toFixed(2),
    billed: billed.toFixed(2),
    govtFees: govt.toFixed(2),
    earned: Math.max(0, billed - govt).toFixed(2),
    receipts: row?.receipts ?? 0,
  };
}

export type SevaTopService = {
  name: string;
  count: number;
  total: string;
};

/** Which work paid the bills this month. */
export async function getSevaTopServices(
  ctx: TenantCtx,
  range: { from: string; to: string },
  limit = 10,
): Promise<SevaTopService[]> {
  const rows = await getDb().execute<SevaTopService>(sql`
    select l.name as "name",
           count(*)::int as "count",
           sum(l.line_total)::numeric(12,2)::text as "total"
    from invoice_lines l
    join invoices i on i.id = l.invoice_id
    where i.business_id = ${ctx.businessId}::uuid
      and i.status = 'issued'
      and i.invoice_date between ${range.from}::date and ${range.to}::date
    group by l.name
    order by sum(l.line_total) desc
    limit ${limit}
  `);
  return [...rows];
}
