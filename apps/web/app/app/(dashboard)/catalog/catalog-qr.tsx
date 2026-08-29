'use client';

import { Button, Card } from '@bahikhata/ui';
import { Check, Copy, Download, ExternalLink, Printer } from 'lucide-react';
import QRCode from 'qrcode';
import * as React from 'react';

/**
 * Catalog QR code. Build spec Phase 1f.
 *
 * Generated in the browser rather than on the server: the URL is public and
 * non-secret, the `qrcode` package is small, and doing it client-side means no
 * round trip and no image to store or invalidate when the slug changes.
 *
 * Error correction is deliberately high (`H`, ~30% recoverable). A poster taped
 * to a shop counter gets smudged, curled and partly covered by a card machine;
 * the denser code is worth it to keep it scanning.
 */
const QR_OPTIONS = { errorCorrectionLevel: 'H' as const, margin: 2 };

export function CatalogQr({
  url,
  businessName,
  live,
}: {
  url: string;
  businessName: string;
  live: boolean;
}) {
  const [dataUrl, setDataUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    void QRCode.toDataURL(url, { ...QR_OPTIONS, width: 720 })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [url]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is blocked in some in-app browsers; the URL is on screen and
      // selectable anyway, so there is nothing useful to say here.
    }
  }

  function downloadPng() {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${businessName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-catalog-qr.png`;
    a.click();
  }

  /**
   * A printable A4 poster.
   *
   * Opened as a standalone document rather than rendered into this page: a
   * shop wants one sheet with a big code on it, not the dashboard with print
   * styles bolted on.
   */
  function printPoster() {
    if (!dataUrl) return;
    const win = window.open('', '_blank', 'width=800,height=1000');
    if (!win) return;

    const esc = (s: string) =>
      s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

    win.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(businessName)} — catalog QR</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: ui-sans-serif, system-ui, sans-serif; color:#000; background:#fff; }
  .sheet { width:210mm; height:297mm; padding:24mm 20mm; display:flex; flex-direction:column;
           align-items:center; justify-content:center; text-align:center; }
  h1 { font-size:34pt; margin:0 0 4mm; }
  .lead { font-size:15pt; color:#333; margin:0 0 12mm; }
  img { width:118mm; height:118mm; }
  .url { margin-top:10mm; font-size:12pt; word-break:break-all; color:#333; }
  .how { margin-top:14mm; font-size:12pt; color:#555; }
  @media print { .noprint { display:none } }
</style></head><body>
<div class="sheet">
  <h1>${esc(businessName)}</h1>
  <p class="lead">Scan to see everything we sell</p>
  <img src="${dataUrl}" alt="Catalog QR code">
  <p class="url">${esc(url)}</p>
  <p class="how">Open your phone camera and point it at the code.</p>
  <p class="noprint" style="margin-top:10mm;font-size:11pt;color:#777">
    Use your browser's Print option, then choose A4.
  </p>
</div>
<script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };</${'script'}>
</body></html>`);
    win.document.close();
  }

  return (
    <Card className="space-y-4 p-6">
      <div>
        <h2 className="text-base font-semibold">Share your catalog</h2>
        <p className="text-sm text-muted-foreground">
          Print the QR and stick it on your counter. Customers scan it and see your products.
        </p>
      </div>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="shrink-0 rounded-xl border bg-white p-3 shadow-xs">
          {dataUrl ? (
            /* Plain <img>: a data URL has nothing for next/image to optimise. */
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt="Catalog QR code" className="size-40" />
          ) : (
            <div className="grid size-40 place-items-center text-xs text-muted-foreground">
              Generating…
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="rounded-lg border bg-muted/50 p-3">
            <p className="tabular text-sm break-all">{url}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={copy}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? 'Copied' : 'Copy link'}
            </Button>
            <Button variant="outline" size="sm" onClick={downloadPng} disabled={!dataUrl}>
              <Download className="size-4" />
              Download PNG
            </Button>
            <Button variant="outline" size="sm" onClick={printPoster} disabled={!dataUrl}>
              <Printer className="size-4" />
              Print poster
            </Button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-card px-3 text-xs font-medium shadow-xs transition-colors hover:border-primary/40 hover:bg-primary-subtle"
            >
              <ExternalLink className="size-4" />
              Open
            </a>
          </div>

          {!live && (
            <p className="text-xs text-warning">
              The link will show a 404 until you switch the catalog on.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
