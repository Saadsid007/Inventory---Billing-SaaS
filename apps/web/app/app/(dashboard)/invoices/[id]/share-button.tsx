'use client';

import { Button, FormError } from '@billwise/ui';
import { Check, Copy, MessageCircle } from 'lucide-react';
import * as React from 'react';
import { shareInvoiceAction } from '../actions';

/**
 * Send this bill to the customer on WhatsApp.
 *
 * The message names what is still owed, which is the whole point: a customer
 * who paid ₹100 of ₹200 needs the balance, not the total they already know.
 *
 * ## Two paths, on purpose
 *
 * With a phone number saved, this opens WhatsApp on that chat with the text
 * ready — one tap to send. Without one (every walk-in customer), there is
 * nothing to open, so the message is copied instead and the shopkeeper pastes
 * it wherever they like. Hiding the button in that case would be worse: the
 * bill is still shareable, we just don't know where to.
 *
 * Nothing is sent from the server. `wa.me` needs no Meta account, no template
 * approval and no per-message fee, and the person who took the money always
 * sees the message before it goes.
 */
export function ShareButton({ invoiceId }: { invoiceId: string }) {
  const [error, setError] = React.useState<string | undefined>();
  const [copied, setCopied] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function share() {
    setError(undefined);
    setCopied(false);

    startTransition(async () => {
      const result = await shareInvoiceAction(invoiceId);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (result.whatsappUrl) {
        // A named target rather than _blank: tapping Send twice should reuse
        // the same tab instead of stacking WhatsApp windows on a phone.
        window.open(result.whatsappUrl, 'billwise-share');
        return;
      }

      try {
        await navigator.clipboard.writeText(result.message);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 4000);
      } catch {
        // Clipboard is blocked on insecure origins and in some in-app
        // browsers. Show the link rather than failing silently.
        setError(`No phone number saved. Bill link: ${result.link}`);
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" onClick={share} disabled={pending}>
        {copied ? <Check /> : pending ? <Copy /> : <MessageCircle />}
        {copied ? 'Message copied' : pending ? 'Preparing…' : 'Send on WhatsApp'}
      </Button>
      <FormError>{error}</FormError>
    </div>
  );
}
