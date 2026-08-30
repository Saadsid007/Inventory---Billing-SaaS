import { MONTHLY_PRICE_INR, TRIAL_DAYS } from '@billwise/shared';
import { ImageResponse } from 'next/og';

/**
 * The card that appears when somebody shares a link.
 *
 * Generated rather than designed as a file, so the price and trial length can
 * never drift from the constants the rest of the product reads. A share card
 * advertising an old price is worse than no share card.
 *
 * Deliberately no custom font. Fetching one at render time is a network call
 * that can fail, and a preview scraper does not wait around: the system stack
 * renders instantly and looks the same to WhatsApp either way.
 */
export const alt = 'Billwise: billing, stock and khata for Indian shops';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          background: 'linear-gradient(135deg, #1d4fd8 0%, #2f6bed 55%, #4f46e5 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 20,
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* The mark, drawn flat: this renders in a satori context, which
                has no gradients on paths and no CSS variables. */}
            <svg width="46" height="46" viewBox="0 0 32 32">
              <path
                d="M10 7.5h12a1 1 0 0 1 1 1v15.8l-2.4-1.5-2.3 1.5-2.3-1.5-2.3 1.5-2.4-1.5V8.5a1 1 0 0 1 1-1Z"
                fill="#2f6bed"
              />
              <rect x="12.6" y="11.6" width="6.8" height="1.9" rx="0.95" fill="#fff" />
              <rect x="12.6" y="15.6" width="4.4" height="1.9" rx="0.95" fill="#fff" />
            </svg>
          </div>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>Billwise</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Two divs rather than one with a <br>. Satori refuses any element
              with more than one child that is not explicitly a flex container,
              and a line break counts as a child. */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: -2,
            }}
          >
            <div style={{ display: 'flex' }}>Billing, stock and khata</div>
            <div style={{ display: 'flex' }}>for your shop</div>
          </div>
          <div style={{ fontSize: 30, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
            GST and non-GST bills in seconds. Stock that keeps itself. Know who owes you money.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 26 }}>
          <div
            style={{
              padding: '12px 24px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.18)',
              display: 'flex',
            }}
          >
            {TRIAL_DAYS} days free
          </div>
          <div
            style={{
              padding: '12px 24px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.18)',
              display: 'flex',
            }}
          >
            ₹{MONTHLY_PRICE_INR} a month
          </div>
          <div
            style={{
              padding: '12px 24px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.18)',
              display: 'flex',
            }}
          >
            No card needed
          </div>
        </div>
      </div>
    ),
    size,
  );
}
