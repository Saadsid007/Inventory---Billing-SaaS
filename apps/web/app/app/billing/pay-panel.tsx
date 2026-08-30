'use client';

import { Alert, Button, Card, FormError } from '@billwise/ui';
import { CheckCircle2, Loader2, QrCode, RefreshCw, Smartphone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import {
  cancelUpiPaymentAction,
  checkUpiPaymentAction,
  startUpiPaymentAction,
} from './actions';

/**
 * Pay by UPI, in one screen.
 *
 * Pressing Subscribe puts a QR on the page. No hosted checkout, no method
 * picker, no redirect away and back: the shopkeeper is already holding a phone
 * with a UPI app on it, so scanning a square is the whole flow.
 *
 * The screen polls every four seconds while the QR is up. That is only so the
 * page reacts while they are still looking at it; the webhook is what actually
 * credits the month, and crediting is idempotent so the two racing is harmless.
 */
const POLL_MS = 4000;

type Qr = { qrId: string; imageUrl: string; closeBy: number; amount: string };

export function PayPanel({
  monthlyPrice,
  paymentsEnabled,
}: {
  monthlyPrice: string;
  paymentsEnabled: boolean;
}) {
  const router = useRouter();
  const [qr, setQr] = React.useState<Qr | null>(null);
  const [error, setError] = React.useState<string | undefined>();
  const [paid, setPaid] = React.useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = React.useState(0);
  const [starting, startTransition] = React.useTransition();

  function start() {
    setError(undefined);
    startTransition(async () => {
      const result = await startUpiPaymentAction();
      if (result.ok) {
        setQr({
          qrId: result.qrId,
          imageUrl: result.imageUrl,
          closeBy: result.closeBy,
          amount: result.amount,
        });
      } else {
        setError(result.error);
      }
    });
  }

  function close() {
    if (qr) void cancelUpiPaymentAction(qr.qrId);
    setQr(null);
  }

  // Poll for the payment, and stop the moment it lands.
  React.useEffect(() => {
    if (!qr || paid) return;
    let cancelled = false;

    const timer = setInterval(async () => {
      const result = await checkUpiPaymentAction(qr.qrId);
      if (cancelled) return;
      if (result.status === 'paid') {
        setPaid(result.paidUntil);
        setQr(null);
        router.refresh();
      }
      // A failed poll is not shown. The QR is still valid, the webhook is still
      // coming, and an error toast every four seconds helps nobody.
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [qr, paid, router]);

  // Countdown, so an expired QR explains itself instead of silently failing.
  React.useEffect(() => {
    if (!qr) return;
    const tick = () => setSecondsLeft(Math.max(0, qr.closeBy * 1000 - Date.now()) / 1000);
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [qr]);

  if (paid) {
    return (
      <Alert variant="success" icon={CheckCircle2} title="Payment received. Thank you.">
        Your subscription runs until{' '}
        {new Date(paid).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
        . Everything is switched back on.
      </Alert>
    );
  }

  if (!qr) {
    return (
      <div className="space-y-3">
        <FormError>{error}</FormError>
        <Button size="lg" onClick={start} disabled={starting || !paymentsEnabled}>
          {starting ? (
            <>
              <Loader2 className="animate-spin" /> Making your QR
            </>
          ) : (
            <>
              <QrCode /> Pay ₹{monthlyPrice} by UPI
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          A QR appears here. Scan it with any UPI app: GPay, PhonePe, Paytm, or your bank app.
        </p>
      </div>
    );
  }

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = Math.floor(secondsLeft % 60);
  const expired = secondsLeft <= 0;

  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="mx-auto shrink-0 rounded-xl border bg-white p-2 shadow-xs sm:mx-0">
          {/* Plain <img>: the QR is generated per payment on Razorpay's own
              domain, so there is nothing for next/image to optimise.

              `h-auto` matters. Razorpay returns a portrait poster with its own
              branding around the code, and forcing that into a square squeezes
              the QR itself out of shape until a phone camera cannot lock onto
              it. Width is set, height follows. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qr.imageUrl}
            alt={`UPI QR for ₹${qr.amount}`}
            width={288}
            className="h-auto w-72 max-w-full"
          />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-sm font-medium">Scan to pay ₹{qr.amount}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Open any UPI app, scan this code, and approve the payment. This page switches over
              by itself the moment the money arrives, so there is nothing to click afterwards.
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Waiting for payment
            {!expired && (
              <span className="tabular">
                · expires in {minutes}:{String(seconds).padStart(2, '0')}
              </span>
            )}
          </div>

          {expired && (
            <Alert variant="warning" title="This QR has expired">
              No money was taken. Make a new one and scan that instead.
            </Alert>
          )}

          <div className="flex flex-wrap gap-2">
            {expired ? (
              <Button onClick={start} disabled={starting}>
                <RefreshCw /> New QR
              </Button>
            ) : (
              <Button variant="outline" onClick={close}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      <p className="flex items-start gap-2 border-t pt-3 text-xs text-muted-foreground">
        <Smartphone className="mt-0.5 size-3.5 shrink-0" />
        Paying from the same phone you are reading this on? Take a screenshot, then scan it from
        your UPI app&apos;s gallery.
      </p>
    </Card>
  );
}
