import { getBusiness, getInvoice, getSettings } from '@billwise/db';
import { INVOICE_KIND_LABELS, getGstStateName } from '@billwise/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireBusiness } from '@/lib/auth/require-business';
import { PrintToolbar } from './print-toolbar';
import './print.css';

export const metadata: Metadata = { title: 'Print invoice' };

/**
 * Printable invoice. Build spec Phase 1e.
 *
 * **This template reads only the invoice's own snapshot columns.** It never
 * joins back to `products` or `parties`: a price change or a corrected address
 * must not alter a document that was printed and handed over months ago.
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
  const due = (Number(invoice.grandTotal) - Number(invoice.amountPaid)).toFixed(2);

  const header = (
    <>
      <div style={{ fontWeight: 800, fontSize: thermal ? '11pt' : '17pt', letterSpacing: '-0.02em', color: '#0f172a' }}>
        {business?.name}
      </div>
      {business?.legalName && business.legalName !== business.name && (
        <div style={{ fontSize: '9pt', color: '#475569' }}>({business.legalName})</div>
      )}
      {business?.gstin && (
        <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '9.5pt', color: '#0f172a', marginTop: '1mm' }}>
          GSTIN: {business.gstin}
        </div>
      )}
      {business?.addressLine1 && <div style={{ color: '#475569', fontSize: '9pt' }}>{business.addressLine1}</div>}
      {(business?.city || business?.pincode) && (
        <div style={{ color: '#475569', fontSize: '9pt' }}>
          {business?.city} {business?.stateCode ? `State (${business.stateCode})` : ''} {business?.pincode}
        </div>
      )}
      {(business?.phone || business?.email) && (
        <div style={{ color: '#475569', fontSize: '9pt' }}>
          {[business?.phone ? `Ph: ${business.phone}` : null, business?.email ? `Email: ${business.email}` : null].filter(Boolean).join(' • ')}
        </div>
      )}
    </>
  );

  if (thermal) {
    return (
      <>
        <PrintToolbar invoiceId={invoice.id} current="thermal" />
        <div className="print-sheet print-thermal">
          <div style={{ textAlign: 'center' }}>{header}</div>
          <div className="rule" />
          <div style={{ textAlign: 'center', fontWeight: 700 }}>
            {INVOICE_KIND_LABELS[invoice.kind].toUpperCase()}
          </div>
          {invoice.status === 'cancelled' && (
            <div style={{ textAlign: 'center', fontWeight: 700 }}>** CANCELLED **</div>
          )}
          <div className="rule" />

          <div>No: {invoice.invoiceNo ?? 'DRAFT'}</div>
          <div>Date: {invoice.invoiceDate}</div>
          <div>To: {invoice.partyName}</div>
          {invoice.partyGstin && <div>GSTIN: {invoice.partyGstin}</div>}

          <div className="rule" />

          <table>
            <tbody>
              {invoice.lines.map((l) => (
                <tr key={l.id}>
                  <td colSpan={2}>
                    {l.name}
                    <br />
                    <span style={{ fontSize: '8pt' }}>
                      {l.qty} {l.unit ?? ''} × {l.rate}
                      {showGst && Number(l.taxRate) > 0 ? ` (${l.taxRate}%)` : ''}
                    </span>
                  </td>
                  <td className="num" style={{ verticalAlign: 'bottom' }}>
                    {l.lineTotal}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="rule" />

          <table>
            <tbody>
              <tr>
                <td>Taxable</td>
                <td className="num">{invoice.subtotal}</td>
              </tr>
              {showGst && invoice.isInterstate && Number(invoice.igstTotal) > 0 && (
                <tr>
                  <td>IGST</td>
                  <td className="num">{invoice.igstTotal}</td>
                </tr>
              )}
              {showGst && !invoice.isInterstate && Number(invoice.cgstTotal) > 0 && (
                <>
                  <tr>
                    <td>CGST</td>
                    <td className="num">{invoice.cgstTotal}</td>
                  </tr>
                  <tr>
                    <td>SGST</td>
                    <td className="num">{invoice.sgstTotal}</td>
                  </tr>
                </>
              )}
              {Number(invoice.cessTotal) > 0 && (
                <tr>
                  <td>Cess</td>
                  <td className="num">{invoice.cessTotal}</td>
                </tr>
              )}
              {Number(invoice.otherCharges) > 0 && (
                <tr>
                  <td>Other</td>
                  <td className="num">{invoice.otherCharges}</td>
                </tr>
              )}
              {Number(invoice.roundOff) !== 0 && (
                <tr>
                  <td>Round off</td>
                  <td className="num">{invoice.roundOff}</td>
                </tr>
              )}
              <tr style={{ fontWeight: 700, fontSize: '10pt' }}>
                <td>TOTAL</td>
                <td className="num">₹{invoice.grandTotal}</td>
              </tr>
              {Number(invoice.amountPaid) > 0 && (
                <>
                  <tr>
                    <td>Paid</td>
                    <td className="num">{invoice.amountPaid}</td>
                  </tr>
                  <tr>
                    <td>Due</td>
                    <td className="num">{due}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>

          <div className="rule" />
          {invoice.notes && <div style={{ fontSize: '8pt' }}>{invoice.notes}</div>}
          {settings?.invoiceFooter && (
            <div style={{ textAlign: 'center', marginTop: '2mm', fontSize: '8pt' }}>
              {settings.invoiceFooter}
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: '2mm', fontSize: '8pt' }}>
            Thank you!
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PrintToolbar invoiceId={invoice.id} current="a4" />
      <div className="print-sheet print-a4">
        <div className="sheet-row" style={{ display: 'flex', gap: '8mm' }}>
          <div>{header}</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14pt', fontWeight: 700 }}>
              {INVOICE_KIND_LABELS[invoice.kind]}
            </div>
            <div>
              No: <strong>{invoice.invoiceNo ?? 'DRAFT'}</strong>
            </div>
            <div>Date: {invoice.invoiceDate}</div>
            {invoice.dueDate && <div>Due: {invoice.dueDate}</div>}
            {invoice.status === 'cancelled' && (
              <div style={{ marginTop: '2mm', fontWeight: 700 }}>** CANCELLED **</div>
            )}
          </div>
        </div>

        <div
          className="sheet-row"
          style={{ marginTop: '8mm', display: 'flex', gap: '8mm' }}
        >
          <div>
            <div style={{ fontSize: '9pt', fontWeight: 600 }}>BILL TO</div>
            <div style={{ fontWeight: 600 }}>{invoice.partyName}</div>
            {invoice.partyAddress && <div>{invoice.partyAddress}</div>}
            {invoice.partyPhone && <div>Ph: {invoice.partyPhone}</div>}
            {invoice.partyGstin && <div>GSTIN: {invoice.partyGstin}</div>}
          </div>
          <div style={{ textAlign: 'right', fontSize: '9.5pt' }}>
            <div>
              Place of supply: {invoice.placeOfSupply},{' '}
              {getGstStateName(invoice.placeOfSupply)}
            </div>
            {showGst && <div>{invoice.isInterstate ? 'Interstate (IGST)' : 'Intrastate'}</div>}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style={{ width: '8mm' }}>#</th>
              <th>Item</th>
              {showGst && <th style={{ width: '20mm' }}>HSN</th>}
              <th className="num" style={{ width: '18mm' }}>
                Qty
              </th>
              <th className="num" style={{ width: '20mm' }}>
                Rate
              </th>
              <th className="num" style={{ width: '22mm' }}>
                Taxable
              </th>
              {showGst && (
                <th className="num" style={{ width: '24mm' }}>
                  {invoice.isInterstate ? 'IGST' : 'CGST + SGST'}
                </th>
              )}
              <th className="num" style={{ width: '24mm' }}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((l) => (
              <tr key={l.id}>
                <td>{l.lineNo}</td>
                <td>{l.name}</td>
                {showGst && <td>{l.hsnCode ?? '-'}</td>}
                <td className="num">
                  {l.qty} {l.unit ?? ''}
                </td>
                <td className="num">{l.rate}</td>
                <td className="num">{l.taxableValue}</td>
                {showGst && (
                  <td className="num">
                    {l.taxRate}%
                    <br />
                    {invoice.isInterstate
                      ? l.igstAmount
                      : (Number(l.cgstAmount) + Number(l.sgstAmount)).toFixed(2)}
                  </td>
                )}
                <td className="num">{l.lineTotal}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: '5mm', display: 'flex', justifyContent: 'flex-end' }}>
          <table style={{ width: '75mm', marginTop: 0 }}>
            <tbody>
              <tr>
                <td>Taxable value</td>
                <td className="num">{invoice.subtotal}</td>
              </tr>
              {showGst && invoice.isInterstate && (
                <tr>
                  <td>IGST</td>
                  <td className="num">{invoice.igstTotal}</td>
                </tr>
              )}
              {showGst && !invoice.isInterstate && (
                <>
                  <tr>
                    <td>CGST</td>
                    <td className="num">{invoice.cgstTotal}</td>
                  </tr>
                  <tr>
                    <td>SGST</td>
                    <td className="num">{invoice.sgstTotal}</td>
                  </tr>
                </>
              )}
              {Number(invoice.cessTotal) > 0 && (
                <tr>
                  <td>Cess</td>
                  <td className="num">{invoice.cessTotal}</td>
                </tr>
              )}
              {Number(invoice.otherCharges) > 0 && (
                <tr>
                  <td>Other charges</td>
                  <td className="num">{invoice.otherCharges}</td>
                </tr>
              )}
              {Number(invoice.roundOff) !== 0 && (
                <tr>
                  <td>Round off</td>
                  <td className="num">{invoice.roundOff}</td>
                </tr>
              )}
              <tr style={{ fontWeight: 700 }}>
                <td>Grand total</td>
                <td className="num">₹{invoice.grandTotal}</td>
              </tr>
              {Number(invoice.amountPaid) > 0 && (
                <>
                  <tr>
                    <td>Paid</td>
                    <td className="num">{invoice.amountPaid}</td>
                  </tr>
                  <tr style={{ fontWeight: 700 }}>
                    <td>Balance due</td>
                    <td className="num">₹{due}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {(invoice.notes || invoice.terms) && (
          <div style={{ marginTop: '8mm', fontSize: '9pt' }}>
            {invoice.notes && (
              <p style={{ whiteSpace: 'pre-wrap' }}>
                <strong>Notes: </strong>
                {invoice.notes}
              </p>
            )}
            {invoice.terms && (
              <p style={{ whiteSpace: 'pre-wrap', marginTop: '3mm' }}>
                <strong>Terms: </strong>
                {invoice.terms}
              </p>
            )}
          </div>
        )}

        {/* Pushed to the bottom of the sheet by `.sheet-footer`, so a short
            invoice fills the page instead of trailing off halfway down. */}
        <div
          className="sheet-footer sheet-row"
          style={{ display: 'flex', gap: '8mm', fontSize: '9pt' }}
        >
          <div style={{ alignSelf: 'flex-end' }}>{settings?.invoiceFooter}</div>
          <div style={{ textAlign: 'center', minWidth: '55mm' }}>
            {business?.signatureUrl ? (
              /* Plain <img>: this is a print template, and next/image adds a
                 wrapper and lazy loading that a printer has no use for. */
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.signatureUrl}
                alt=""
                style={{ height: '16mm', objectFit: 'contain', margin: '0 auto 1mm' }}
              />
            ) : (
              <div style={{ height: '17mm' }} />
            )}
            <div style={{ borderTop: '0.3mm solid #000', paddingTop: '1.5mm' }}>
              For {business?.name}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
