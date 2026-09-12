import { getBusiness, getInvoice, getSettings } from '@billwise/db';
import { INVOICE_KIND_LABELS, getGstStateName } from '@billwise/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireBusiness } from '@/lib/auth/require-business';
import { amountInWords } from '@/lib/amount-to-words';
import { PrintToolbar } from './print-toolbar';
import './print.css';

export const metadata: Metadata = { title: 'Print Invoice' };

/**
 * Modern, Executive Printable Invoice & PDF Document.
 *
 * Reads snapshot columns from the issued invoice for gapless audit accuracy.
 * Styled with crisp vector boundaries, exact color reproduction, and standard
 * Indian GST compliance (HSN summaries, Amount in words, Bank payment details).
 */
export default async function PrintInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ format?: string }>;
}) {
  const ctx = await requireBusiness();
  const { id } = await params;
  const { format } = await searchParams;

  const [invoice, business, settings] = await Promise.all([
    getInvoice(ctx, id),
    getBusiness(ctx),
    getSettings(ctx),
  ]);
  if (!invoice) notFound();

  const thermal = format === 'thermal';
  const showGst = invoice.kind === 'tax_invoice';
  const rawDue = Math.max(0, Number(invoice.grandTotal) - Number(invoice.amountPaid));
  const due = rawDue.toFixed(2);
  const isFullyPaid = Number(invoice.amountPaid) >= Number(invoice.grandTotal);
  const isPartiallyPaid = Number(invoice.amountPaid) > 0 && !isFullyPaid;

  // HSN Tax Breakdown Map for Indian GST Compliance
  type HsnSummary = {
    hsn: string;
    taxRate: string;
    taxable: number;
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    totalTax: number;
  };
  const hsnMap = new Map<string, HsnSummary>();

  for (const l of invoice.lines) {
    const key = `${l.hsnCode ?? 'N/A'}-${l.taxRate}`;
    const cur = hsnMap.get(key) ?? {
      hsn: l.hsnCode ?? 'Other',
      taxRate: l.taxRate,
      taxable: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      cess: 0,
      totalTax: 0,
    };
    cur.taxable += Number(l.taxableValue);
    cur.cgst += Number(l.cgstAmount);
    cur.sgst += Number(l.sgstAmount);
    cur.igst += Number(l.igstAmount);
    cur.cess += Number(l.cessAmount);
    cur.totalTax +=
      Number(l.cgstAmount) + Number(l.sgstAmount) + Number(l.igstAmount) + Number(l.cessAmount);
    hsnMap.set(key, cur);
  }
  const hsnSummaries = Array.from(hsnMap.values());

  // --------------------------------------------------------------------------
  // 80mm THERMAL POS RECEIPT LAYOUT
  // --------------------------------------------------------------------------
  if (thermal) {
    return (
      <>
        <PrintToolbar invoiceId={invoice.id} current="thermal" />
        <div className="print-sheet print-thermal">
          {/* Header */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: '11.5pt', color: '#0f172a' }}>
              {business?.name}
            </div>
            {business?.legalName && business.legalName !== business.name && (
              <div style={{ fontSize: '8pt', color: '#475569' }}>({business.legalName})</div>
            )}
            {business?.gstin && (
              <div style={{ fontWeight: 700, fontSize: '9pt', marginTop: '0.5mm' }}>
                GSTIN: {business.gstin}
              </div>
            )}
            {business?.addressLine1 && (
              <div style={{ fontSize: '7.5pt', color: '#334155' }}>{business.addressLine1}</div>
            )}
            {(business?.city || business?.pincode) && (
              <div style={{ fontSize: '7.5pt', color: '#334155' }}>
                {business?.city} {business?.stateCode ? `(${business.stateCode})` : ''}{' '}
                {business?.pincode}
              </div>
            )}
            {business?.phone && (
              <div style={{ fontSize: '7.5pt', color: '#334155' }}>Tel: {business.phone}</div>
            )}
          </div>

          <div className="rule-thick" />

          {/* Document Title & Number */}
          <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '9.5pt' }}>
            {INVOICE_KIND_LABELS[invoice.kind].toUpperCase()}
          </div>
          {invoice.status === 'cancelled' ? (
            <div
              style={{ textAlign: 'center', fontWeight: 800, color: '#991b1b', fontSize: '9pt' }}
            >
              ** CANCELLED INVOICE **
            </div>
          ) : isFullyPaid ? (
            <div
              style={{ textAlign: 'center', fontWeight: 700, color: '#065f46', fontSize: '8pt' }}
            >
              PAID IN FULL
            </div>
          ) : null}

          <div className="rule" />

          {/* Metadata */}
          <div style={{ fontSize: '8pt', display: 'flex', justifyContent: 'space-between' }}>
            <span>Bill No:</span>
            <span style={{ fontWeight: 700 }}>{invoice.invoiceNo ?? 'DRAFT'}</span>
          </div>
          <div style={{ fontSize: '8pt', display: 'flex', justifyContent: 'space-between' }}>
            <span>Date:</span>
            <span>{invoice.invoiceDate}</span>
          </div>
          <div style={{ fontSize: '8pt', display: 'flex', justifyContent: 'space-between' }}>
            <span>Customer:</span>
            <span style={{ fontWeight: 600 }}>{invoice.partyName}</span>
          </div>
          {invoice.partyGstin && (
            <div style={{ fontSize: '8pt', display: 'flex', justifyContent: 'space-between' }}>
              <span>Cust GSTIN:</span>
              <span className="font-mono">{invoice.partyGstin}</span>
            </div>
          )}

          <div className="rule" />

          {/* Item Table */}
          <table>
            <thead>
              <tr style={{ borderBottom: '1px dashed #475569', fontSize: '7.5pt' }}>
                <th style={{ textAlign: 'left' }}>Item</th>
                <th className="num" style={{ width: '16mm' }}>
                  Qty×Rate
                </th>
                <th className="num" style={{ width: '18mm' }}>
                  Total (₹)
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((l) => (
                <tr key={l.id}>
                  <td style={{ verticalAlign: 'top', paddingTop: '1mm', paddingBottom: '1mm' }}>
                    <span style={{ fontWeight: 600 }}>{l.name}</span>
                    {showGst && Number(l.taxRate) > 0 && (
                      <span style={{ fontSize: '7pt', color: '#475569', display: 'block' }}>
                        GST {l.taxRate}%
                      </span>
                    )}
                  </td>
                  <td className="num" style={{ verticalAlign: 'top', fontSize: '7.5pt' }}>
                    {l.qty} × {l.rate}
                  </td>
                  <td className="num" style={{ verticalAlign: 'top', fontWeight: 700 }}>
                    {l.lineTotal}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="rule" />

          {/* Totals Summary */}
          <table>
            <tbody>
              <tr>
                <td>Subtotal (Taxable)</td>
                <td className="num">₹{invoice.subtotal}</td>
              </tr>
              {showGst && invoice.isInterstate && Number(invoice.igstTotal) > 0 && (
                <tr>
                  <td>IGST</td>
                  <td className="num">₹{invoice.igstTotal}</td>
                </tr>
              )}
              {showGst && !invoice.isInterstate && Number(invoice.cgstTotal) > 0 && (
                <>
                  <tr>
                    <td>CGST</td>
                    <td className="num">₹{invoice.cgstTotal}</td>
                  </tr>
                  <tr>
                    <td>SGST</td>
                    <td className="num">₹{invoice.sgstTotal}</td>
                  </tr>
                </>
              )}
              {Number(invoice.cessTotal) > 0 && (
                <tr>
                  <td>Cess</td>
                  <td className="num">₹{invoice.cessTotal}</td>
                </tr>
              )}
              {Number(invoice.otherCharges) > 0 && (
                <tr>
                  <td>Other Charges</td>
                  <td className="num">₹{invoice.otherCharges}</td>
                </tr>
              )}
              {Number(invoice.roundOff) !== 0 && (
                <tr>
                  <td>Round off</td>
                  <td className="num">₹{invoice.roundOff}</td>
                </tr>
              )}
              <tr style={{ fontWeight: 800, fontSize: '10.5pt', borderTop: '1px solid #0f172a' }}>
                <td style={{ paddingTop: '1mm' }}>GRAND TOTAL</td>
                <td className="num" style={{ paddingTop: '1mm' }}>
                  ₹{invoice.grandTotal}
                </td>
              </tr>
              {Number(invoice.amountPaid) > 0 && (
                <>
                  <tr style={{ fontSize: '8pt', color: '#065f46' }}>
                    <td>Paid Amount</td>
                    <td className="num">₹{invoice.amountPaid}</td>
                  </tr>
                  <tr style={{ fontWeight: 700, fontSize: '8.5pt' }}>
                    <td>Balance Due</td>
                    <td className="num">₹{due}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>

          <div className="rule" />

          {/* Footer message */}
          {invoice.notes && (
            <div style={{ fontSize: '7.5pt', color: '#475569', marginBottom: '1.5mm' }}>
              <strong>Note:</strong> {invoice.notes}
            </div>
          )}
          {settings?.invoiceFooter && (
            <div style={{ textAlign: 'center', fontSize: '7.5pt', color: '#475569' }}>
              {settings.invoiceFooter}
            </div>
          )}
          <div
            style={{
              textAlign: 'center',
              marginTop: '2.5mm',
              fontSize: '8pt',
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            THANK YOU FOR SHOPPING!
          </div>
        </div>
      </>
    );
  }

  // --------------------------------------------------------------------------
  // FULL A4 STUNNING TAX INVOICE & PDF LAYOUT
  // --------------------------------------------------------------------------
  return (
    <>
      <PrintToolbar invoiceId={invoice.id} current="a4" />

      <div className="print-sheet print-a4">
        {/* Top Decorative Accent Bar */}
        <div className="top-accent-bar" />

        {/* 1. Header Row: Business Profile (Left) & Document Title Block (Right) */}
        <div className="sheet-row" style={{ marginTop: '2mm', gap: '8mm' }}>
          {/* Left: Supplier / Business Profile */}
          <div style={{ flex: '1 1 58%' }}>
            {business?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.logoUrl}
                alt={business.name}
                style={{
                  height: '14mm',
                  maxWidth: '50mm',
                  objectFit: 'contain',
                  marginBottom: '2.5mm',
                  display: 'block',
                }}
              />
            )}

            <div
              style={{
                fontWeight: 900,
                fontSize: '17pt',
                letterSpacing: '-0.025em',
                color: '#0f172a',
                lineHeight: 1.15,
              }}
            >
              {business?.name}
            </div>

            {business?.legalName && business.legalName !== business.name && (
              <div
                style={{ fontSize: '8.5pt', fontWeight: 600, color: '#475569', marginTop: '0.5mm' }}
              >
                Trade Name: {business.legalName}
              </div>
            )}

            {business?.gstin && (
              <div style={{ marginTop: '1.5mm' }}>
                <span
                  className="font-mono"
                  style={{
                    display: 'inline-block',
                    background: '#f1f5f9',
                    border: '0.3mm solid #cbd5e1',
                    borderRadius: '1.2mm',
                    padding: '0.6mm 2.2mm',
                    fontSize: '9pt',
                    fontWeight: 800,
                    color: '#0f172a',
                    letterSpacing: '0.04em',
                  }}
                >
                  GSTIN: {business.gstin}
                </span>
              </div>
            )}

            <div style={{ marginTop: '2mm', color: '#475569', fontSize: '8.5pt', lineHeight: 1.4 }}>
              {business?.addressLine1 && <div>{business.addressLine1}</div>}
              {business?.addressLine2 && <div>{business.addressLine2}</div>}
              {(business?.city || business?.pincode) && (
                <div>
                  {business?.city}
                  {business?.pincode ? ` - ${business.pincode}` : ''},{' '}
                  <strong>
                    {business?.stateCode
                      ? `${getGstStateName(business.stateCode)} (${business.stateCode})`
                      : ''}
                  </strong>
                </div>
              )}
              {(business?.phone || business?.email) && (
                <div style={{ marginTop: '0.8mm', color: '#334155' }}>
                  {[
                    business?.phone ? `Phone: ${business.phone}` : null,
                    business?.email ? `Email: ${business.email}` : null,
                  ]
                    .filter(Boolean)
                    .join('  |  ')}
                </div>
              )}
            </div>
          </div>

          {/* Right: Invoice Identity Card */}
          <div
            style={{
              flex: '1 1 42%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
            }}
          >
            <div
              style={{
                fontSize: '18pt',
                fontWeight: 900,
                letterSpacing: '-0.02em',
                color: '#0f172a',
                textTransform: 'uppercase',
              }}
            >
              {INVOICE_KIND_LABELS[invoice.kind]}
            </div>

            <div
              style={{
                fontSize: '7.5pt',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#64748b',
                marginTop: '-0.5mm',
              }}
            >
              Original for Recipient
            </div>

            {/* Status Stamp Badge */}
            <div style={{ marginTop: '2mm' }}>
              {invoice.status === 'cancelled' ? (
                <span className="invoice-badge invoice-badge-cancelled">✕ Cancelled Invoice</span>
              ) : isFullyPaid ? (
                <span className="invoice-badge invoice-badge-paid">✓ Paid in Full</span>
              ) : isPartiallyPaid ? (
                <span className="invoice-badge invoice-badge-partial">Partially Paid</span>
              ) : (
                <span className="invoice-badge invoice-badge-due">Payment Due</span>
              )}
            </div>

            {/* Invoice Details Table Box */}
            <div
              className="info-card"
              style={{ marginTop: '3mm', width: '100%', maxWidth: '75mm', background: '#f8fafc' }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderBottom: '0.25mm solid #e2e8f0',
                  paddingBottom: '1mm',
                  marginBottom: '1mm',
                }}
              >
                <span style={{ fontSize: '8pt', color: '#64748b', fontWeight: 600 }}>
                  Invoice No:
                </span>
                <span
                  className="font-mono"
                  style={{ fontSize: '9.5pt', fontWeight: 800, color: '#0f172a' }}
                >
                  {invoice.invoiceNo ?? 'DRAFT'}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderBottom: '0.25mm solid #e2e8f0',
                  paddingBottom: '1mm',
                  marginBottom: '1mm',
                }}
              >
                <span style={{ fontSize: '8pt', color: '#64748b', fontWeight: 600 }}>
                  Invoice Date:
                </span>
                <span style={{ fontSize: '8.5pt', fontWeight: 700, color: '#0f172a' }}>
                  {invoice.invoiceDate}
                </span>
              </div>

              {invoice.dueDate && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderBottom: '0.25mm solid #e2e8f0',
                    paddingBottom: '1mm',
                    marginBottom: '1mm',
                  }}
                >
                  <span style={{ fontSize: '8pt', color: '#64748b', fontWeight: 600 }}>
                    Due Date:
                  </span>
                  <span style={{ fontSize: '8.5pt', fontWeight: 700, color: '#92400e' }}>
                    {invoice.dueDate}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '8pt', color: '#64748b', fontWeight: 600 }}>
                  Place of Supply:
                </span>
                <span
                  style={{ fontSize: '8pt', fontWeight: 700, color: '#0f172a', textAlign: 'right' }}
                >
                  {invoice.placeOfSupply} - {getGstStateName(invoice.placeOfSupply)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Customer & Supply Details Cards (Two equal columns) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4mm',
            marginTop: '4.5mm',
          }}
        >
          {/* Bill To Card */}
          <div className="info-card">
            <div className="card-title">Billed To (Customer Details)</div>
            <div style={{ fontWeight: 800, fontSize: '10pt', color: '#0f172a' }}>
              {invoice.partyName}
            </div>

            {invoice.partyGstin && (
              <div style={{ marginTop: '1mm' }}>
                <span
                  className="font-mono"
                  style={{
                    fontSize: '8.5pt',
                    fontWeight: 700,
                    background: '#ffffff',
                    border: '0.25mm solid #cbd5e1',
                    borderRadius: '1mm',
                    padding: '0.3mm 1.8mm',
                    color: '#0f172a',
                  }}
                >
                  GSTIN: {invoice.partyGstin}
                </span>
              </div>
            )}

            <div
              style={{ marginTop: '1.5mm', fontSize: '8.5pt', color: '#475569', lineHeight: 1.35 }}
            >
              {invoice.partyAddress && <div>{invoice.partyAddress}</div>}
              {invoice.partyPhone && (
                <div style={{ marginTop: '0.8mm' }}>Phone: {invoice.partyPhone}</div>
              )}
            </div>
          </div>

          {/* Supply & Transport Details Card */}
          <div className="info-card">
            <div className="card-title">Dispatch & Supply Details</div>
            <div style={{ fontSize: '8.5pt', lineHeight: 1.45, color: '#334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Supplier State:</span>
                <span style={{ fontWeight: 600 }}>
                  {business?.stateCode
                    ? `${business.stateCode} - ${getGstStateName(business.stateCode)}`
                    : '-'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Place of Supply:</span>
                <span style={{ fontWeight: 600 }}>
                  {invoice.placeOfSupply} - {getGstStateName(invoice.placeOfSupply)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Supply Type:</span>
                <span style={{ fontWeight: 600 }}>
                  {invoice.isInterstate ? 'Interstate (IGST)' : 'Intrastate (CGST + SGST)'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Reverse Charge:</span>
                <span style={{ fontWeight: 600 }}>Applicable: No</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Main Itemized Invoice Table */}
        <table className="invoice-table">
          <thead>
            <tr>
              <th style={{ width: '8mm', textAlign: 'center' }}>#</th>
              <th style={{ textAlign: 'left' }}>Item Description</th>
              {showGst && <th style={{ width: '22mm', textAlign: 'center' }}>HSN/SAC</th>}
              <th className="num" style={{ width: '20mm' }}>
                Qty
              </th>
              <th className="num" style={{ width: '22mm' }}>
                Unit Rate (₹)
              </th>
              <th className="num" style={{ width: '24mm' }}>
                Taxable (₹)
              </th>
              {showGst && (
                <th className="num" style={{ width: '26mm' }}>
                  {invoice.isInterstate ? 'IGST' : 'CGST + SGST'}
                </th>
              )}
              <th className="num" style={{ width: '26mm' }}>
                Total (₹)
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((l) => (
              <tr key={l.id}>
                <td style={{ textAlign: 'center', color: '#64748b', fontSize: '8pt' }}>
                  {l.lineNo}
                </td>
                <td>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{l.name}</div>
                </td>
                {showGst && (
                  <td style={{ textAlign: 'center' }}>
                    <span className="font-mono" style={{ fontSize: '8pt', color: '#475569' }}>
                      {l.hsnCode ?? '-'}
                    </span>
                  </td>
                )}
                <td className="num">
                  <span style={{ fontWeight: 600 }}>{l.qty}</span>
                  {l.unit && (
                    <span style={{ fontSize: '7.5pt', color: '#64748b', marginLeft: '1mm' }}>
                      {l.unit}
                    </span>
                  )}
                </td>
                <td className="num">{l.rate}</td>
                <td className="num" style={{ fontWeight: 600 }}>
                  {l.taxableValue}
                </td>
                {showGst && (
                  <td className="num" style={{ fontSize: '8pt' }}>
                    <span style={{ color: '#64748b' }}>({l.taxRate}%)</span>{' '}
                    <span style={{ fontWeight: 600 }}>
                      {invoice.isInterstate
                        ? l.igstAmount
                        : (Number(l.cgstAmount) + Number(l.sgstAmount)).toFixed(2)}
                    </span>
                  </td>
                )}
                <td className="num" style={{ fontWeight: 800, color: '#0f172a' }}>
                  {l.lineTotal}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 4. GST HSN/SAC Tax Summary Table (Compliant with Indian Tax Standard) */}
        {showGst && hsnSummaries.length > 0 && (
          <div style={{ marginTop: '3mm' }}>
            <div
              style={{
                fontSize: '7.5pt',
                fontWeight: 800,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: '#64748b',
                marginBottom: '1mm',
              }}
            >
              Tax Summary (HSN / SAC Split)
            </div>
            <table className="tax-table">
              <thead>
                <tr>
                  <th>HSN/SAC</th>
                  <th style={{ textAlign: 'right' }}>Taxable Amt (₹)</th>
                  {invoice.isInterstate ? (
                    <>
                      <th style={{ textAlign: 'right' }}>IGST Rate</th>
                      <th style={{ textAlign: 'right' }}>IGST Amt (₹)</th>
                    </>
                  ) : (
                    <>
                      <th style={{ textAlign: 'right' }}>CGST (₹)</th>
                      <th style={{ textAlign: 'right' }}>SGST (₹)</th>
                    </>
                  )}
                  {Number(invoice.cessTotal) > 0 && (
                    <th style={{ textAlign: 'right' }}>Cess (₹)</th>
                  )}
                  <th style={{ textAlign: 'right' }}>Total Tax (₹)</th>
                </tr>
              </thead>
              <tbody>
                {hsnSummaries.map((h) => (
                  <tr key={`${h.hsn}-${h.taxRate}`}>
                    <td className="font-mono">{h.hsn}</td>
                    <td className="num">{h.taxable.toFixed(2)}</td>
                    {invoice.isInterstate ? (
                      <>
                        <td className="num">{h.taxRate}%</td>
                        <td className="num">{h.igst.toFixed(2)}</td>
                      </>
                    ) : (
                      <>
                        <td className="num">
                          <span style={{ fontSize: '7pt', color: '#64748b' }}>
                            ({(Number(h.taxRate) / 2).toFixed(1)}%)
                          </span>{' '}
                          {h.cgst.toFixed(2)}
                        </td>
                        <td className="num">
                          <span style={{ fontSize: '7pt', color: '#64748b' }}>
                            ({(Number(h.taxRate) / 2).toFixed(1)}%)
                          </span>{' '}
                          {h.sgst.toFixed(2)}
                        </td>
                      </>
                    )}
                    {Number(invoice.cessTotal) > 0 && <td className="num">{h.cess.toFixed(2)}</td>}
                    <td className="num" style={{ fontWeight: 700 }}>
                      {h.totalTax.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Totals Breakdown & Payment Instructions Section */}
        <div
          style={{ display: 'flex', justifyContent: 'space-between', gap: '5mm', marginTop: '4mm' }}
        >
          {/* Left: Amount in Words, Bank Details, Terms */}
          <div style={{ flex: '1 1 55%', display: 'flex', flexDirection: 'column', gap: '2.5mm' }}>
            {/* Amount in words card */}
            <div
              style={{
                background: '#f8fafc',
                border: '0.3mm solid #e2e8f0',
                borderRadius: '1.8mm',
                padding: '2.5mm 3.5mm',
              }}
            >
              <div
                style={{
                  fontSize: '7pt',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#64748b',
                }}
              >
                Total Invoice Amount in Words
              </div>
              <div
                style={{
                  fontSize: '8.5pt',
                  fontWeight: 800,
                  color: '#0f172a',
                  marginTop: '0.8mm',
                  fontStyle: 'italic',
                }}
              >
                {amountInWords(invoice.grandTotal)}
              </div>
            </div>

            {/* Terms and Notes */}
            {(invoice.terms || settings?.invoiceTerms || invoice.notes) && (
              <div
                style={{
                  background: '#ffffff',
                  border: '0.25mm solid #e2e8f0',
                  borderRadius: '1.8mm',
                  padding: '2.5mm 3.5mm',
                  fontSize: '7.5pt',
                  color: '#475569',
                  lineHeight: 1.4,
                }}
              >
                {invoice.notes && (
                  <p style={{ marginBottom: '1.5mm' }}>
                    <strong style={{ color: '#0f172a' }}>Note: </strong>
                    {invoice.notes}
                  </p>
                )}
                {(invoice.terms || settings?.invoiceTerms) && (
                  <p>
                    <strong style={{ color: '#0f172a' }}>Terms & Conditions: </strong>
                    {invoice.terms || settings?.invoiceTerms}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right: Calculations Totals Box */}
          <div className="totals-card">
            <table className="totals-table">
              <tbody>
                <tr>
                  <td style={{ color: '#64748b' }}>Taxable Subtotal</td>
                  <td className="num" style={{ fontWeight: 600 }}>
                    ₹{invoice.subtotal}
                  </td>
                </tr>

                {showGst && invoice.isInterstate && Number(invoice.igstTotal) > 0 && (
                  <tr>
                    <td style={{ color: '#64748b' }}>IGST</td>
                    <td className="num">₹{invoice.igstTotal}</td>
                  </tr>
                )}

                {showGst && !invoice.isInterstate && Number(invoice.cgstTotal) > 0 && (
                  <>
                    <tr>
                      <td style={{ color: '#64748b' }}>CGST</td>
                      <td className="num">₹{invoice.cgstTotal}</td>
                    </tr>
                    <tr>
                      <td style={{ color: '#64748b' }}>SGST</td>
                      <td className="num">₹{invoice.sgstTotal}</td>
                    </tr>
                  </>
                )}

                {Number(invoice.cessTotal) > 0 && (
                  <tr>
                    <td style={{ color: '#64748b' }}>Cess</td>
                    <td className="num">₹{invoice.cessTotal}</td>
                  </tr>
                )}

                {Number(invoice.otherCharges) > 0 && (
                  <tr>
                    <td style={{ color: '#64748b' }}>Other Charges</td>
                    <td className="num">₹{invoice.otherCharges}</td>
                  </tr>
                )}

                {Number(invoice.roundOff) !== 0 && (
                  <tr>
                    <td style={{ color: '#64748b' }}>Round off</td>
                    <td className="num">₹{invoice.roundOff}</td>
                  </tr>
                )}

                <tr className="grand-total-row">
                  <td>GRAND TOTAL</td>
                  <td className="num">₹{invoice.grandTotal}</td>
                </tr>

                {Number(invoice.amountPaid) > 0 && (
                  <tr>
                    <td style={{ color: '#065f46', fontWeight: 600 }}>Amount Paid</td>
                    <td className="num" style={{ color: '#065f46', fontWeight: 700 }}>
                      ₹{invoice.amountPaid}
                    </td>
                  </tr>
                )}

                <tr className="due-row">
                  <td>Balance Due</td>
                  <td className="num" style={{ fontSize: '10.5pt' }}>
                    ₹{due}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 6. Footer & Authorized Signatory Block */}
        <div
          className="sheet-footer sheet-row"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            borderTop: '0.25mm solid #e2e8f0',
            paddingTop: '4mm',
          }}
        >
          {/* Left legal notice & custom footer */}
          <div style={{ maxWidth: '100mm', fontSize: '7.5pt', color: '#64748b', lineHeight: 1.4 }}>
            {settings?.invoiceFooter && (
              <div style={{ fontWeight: 600, color: '#334155', marginBottom: '1mm' }}>
                {settings.invoiceFooter}
              </div>
            )}
            <div>
              This is a computer-generated tax invoice issued by {business?.name}. Valid without
              physical seal under IT Act.
            </div>
          </div>

          {/* Right Signature Stamp Box */}
          <div style={{ textAlign: 'center', width: '60mm' }}>
            {business?.signatureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.signatureUrl}
                alt="Authorized Signature"
                style={{
                  height: '14mm',
                  objectFit: 'contain',
                  margin: '0 auto 1.5mm',
                  display: 'block',
                }}
              />
            ) : (
              <div style={{ height: '14mm' }} />
            )}
            <div
              style={{
                borderTop: '0.3mm solid #0f172a',
                paddingTop: '1.5mm',
                fontSize: '8pt',
                fontWeight: 700,
                color: '#0f172a',
              }}
            >
              For {business?.name}
              <div style={{ fontSize: '7pt', fontWeight: 500, color: '#64748b' }}>
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
