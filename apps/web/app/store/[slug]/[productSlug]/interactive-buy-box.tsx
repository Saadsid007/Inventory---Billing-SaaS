'use client';

import { whatsappEnquiryUrl } from '@billwise/shared';
import {
  Check,
  CreditCard,
  Minus,
  Plus,
  MessageCircle,
  Phone,
  Share2,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import * as React from 'react';

export function InteractiveBuyBox({
  businessName,
  businessPhone,
  catalogWhatsapp,
  productName,
  salePrice,
  showPrice,
  stockStatus,
}: {
  businessName: string;
  businessPhone: string | null;
  catalogWhatsapp: string | null;
  productName: string;
  salePrice: string;
  showPrice: boolean;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
}) {
  const [qty, setQty] = React.useState(1);
  const [copied, setCopied] = React.useState(false);

  const numericPrice = Number(salePrice) || 0;
  const totalPrice = (numericPrice * qty).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Dynamic WhatsApp text including exact quantity and calculated price
  const message = `Hi ${businessName}, I would like to order: ${qty}x ${productName}${
    showPrice ? ` (Total ₹${totalPrice})` : ''
  }. Please confirm availability and pickup/delivery!`;

  const whatsappUrl = whatsappEnquiryUrl(catalogWhatsapp, message);

  const handleShare = async () => {
    if (typeof window !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${productName} at ${businessName}`,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    if (typeof window !== 'undefined') {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const isAvailable = stockStatus !== 'out_of_stock';

  return (
    <div className="space-y-5 rounded-3xl border bg-card p-5 sm:p-7 shadow-xs">
      {/* Price & Quantity Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Price per unit
          </p>
          {showPrice ? (
            <div className="flex items-baseline gap-2 mt-1">
              <span className="tabular text-3xl sm:text-4xl font-extrabold text-foreground">
                ₹{numericPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                (Inclusive of all taxes)
              </span>
            </div>
          ) : (
            <p className="text-base font-semibold text-primary mt-1">
              Enquire on WhatsApp for best price
            </p>
          )}
        </div>

        {/* Quantity Controls */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground">Select Quantity</p>
          <div className="inline-flex items-center rounded-xl border bg-muted/40 p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              className="grid size-8 place-items-center rounded-lg bg-card text-foreground shadow-xs transition-colors hover:bg-muted disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Decrease quantity"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="tabular w-12 text-center text-sm font-bold text-foreground">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              className="grid size-8 place-items-center rounded-lg bg-card text-foreground shadow-xs transition-colors hover:bg-muted"
              aria-label="Increase quantity"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Total Calculation summary if qty > 1 */}
      {showPrice && qty > 1 && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-800 dark:text-emerald-300">
          <span className="font-medium">Subtotal for {qty} items:</span>
          <span className="tabular font-bold text-sm">₹{totalPrice}</span>
        </div>
      )}

      {/* Primary Action Buttons */}
      <div className="space-y-2.5 pt-1">
        {whatsappUrl && (
          isAvailable ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-emerald-600 px-6 py-4 text-sm sm:text-base font-bold text-white shadow-md transition-all hover:bg-emerald-700 active:scale-98"
            >
              <MessageCircle className="size-5" />
              <span>Order {qty} on WhatsApp</span>
              {showPrice && <span className="opacity-90 font-normal">· ₹{totalPrice}</span>}
            </a>
          ) : (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-muted border px-6 py-4 text-sm font-semibold text-muted-foreground transition-all hover:bg-muted/80"
            >
              <MessageCircle className="size-5" />
              <span>Enquire for Restock on WhatsApp</span>
            </a>
          )
        )}

        <div className="grid grid-cols-2 gap-2.5">
          {businessPhone && (
            <a
              href={`tel:${businessPhone}`}
              className="flex items-center justify-center gap-2 rounded-xl border bg-card px-4 py-3 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted transition-colors"
            >
              <Phone className="size-4 text-muted-foreground" />
              <span>Call Shop</span>
            </a>
          )}

          <button
            type="button"
            onClick={handleShare}
            className="flex items-center justify-center gap-2 rounded-xl border bg-card px-4 py-3 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted transition-colors"
          >
            {copied ? (
              <>
                <Check className="size-4 text-emerald-600" />
                <span className="text-emerald-600">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="size-4 text-muted-foreground" />
                <span>Share Item</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Trust & Guarantee points */}
      <div className="space-y-2.5 pt-2 border-t text-xs text-muted-foreground">
        <div className="flex items-center gap-2.5">
          <Truck className="size-4 text-emerald-600 shrink-0" />
          <span>Counter Pickup in 15 mins • Local Kanpur Delivery Available</span>
        </div>
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
          <span>100% Original Brand Sealed Packaging</span>
        </div>
        <div className="flex items-center gap-2.5">
          <CreditCard className="size-4 text-emerald-600 shrink-0" />
          <span>Pay at Counter or on Delivery with Cash / UPI</span>
        </div>
      </div>
    </div>
  );
}
