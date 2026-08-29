import { listSubscriptionPayments } from '@billwise/db';
import {
  MONTHLY_PRICE_INR,
  TRIAL_DAYS,
  subscriptionDaysRemaining,
  trialDaysRemaining,
} from '@billwise/shared';
import { hasRazorpay } from '@billwise/shared/env';
import {
  Alert,
  Badge,
  Card,
  Detail,
  DetailList,
  EmptyState,
  PageBody,
  PageHeader,
  Section,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from '@billwise/ui';
import { Check, Info, ReceiptText, TriangleAlert } from 'lucide-react';
import type { Metadata } from 'next';
import { requireMembership } from '@/lib/auth/require-business';
import { PayPanel } from './pay-panel';

export const metadata: Metadata = { title: 'Billing' };

const INCLUDED = [
  'Unlimited bills, products and customers',
  'GST and non-GST billing, with all five document types',
  'A4 and 80mm thermal printing',
  'Automatic stock tracking and low-stock alerts',
  'Customer khata with a running balance',
  'Your public catalog and QR code',
  'Sales, tax, stock and outstanding reports, with CSV exports',
];

const longDate = (d: Date) =>
  d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Everything about money, on one page.
 *
 * What the plan costs, what state this shop is in, when the next payment is
 * due, how to pay, and every payment made so far. A shopkeeper asking "am I
 * paid up?" should never have to ask us.
 */
export default async function BillingPage() {
  const { ctx, businessName, status, access, trialEndsAt, paidUntil } = await requireMembership();
  const payments = await listSubscriptionPayments(ctx);
  const paymentsEnabled = hasRazorpay();

  const trialDays = status === 'trial' && trialEndsAt ? trialDaysRemaining(trialEndsAt) : null;
  const paidDays = paidUntil ? subscriptionDaysRemaining(paidUntil) : null;

  const state =
    access === 'ok' && status === 'active'
      ? ('paid' as const)
      : access === 'ok' && status === 'trial'
        ? ('trial' as const)
        : access === 'payment_due'
          ? ('due' as const)
          : access === 'trial_expired'
            ? ('expired' as const)
            : ('blocked' as const);

  return (
    <PageBody className="mx-auto max-w-3xl">
      <PageHeader
        title="Billing"
        description="Your plan, what you have paid, and what happens next."
      />

      {state === 'expired' && (
        <Alert variant="warning" icon={TriangleAlert} title="Your free trial has ended">
          Your products, customers and bills are all exactly where you left them. Pay for a month
          and everything switches back on straight away.
        </Alert>
      )}
      {state === 'due' && (
        <Alert variant="warning" icon={TriangleAlert} title="Your last paid month has ended">
          Nothing has been deleted. Pay for another month to carry on billing.
        </Alert>
      )}
      {state === 'blocked' && (
        <Alert variant="destructive" icon={TriangleAlert} title="This account is on hold">
          Your data is safe. Get in touch with us and we will sort it out.
        </Alert>
      )}

      <Card className="overflow-hidden p-0">
        <div className="brand-wash p-5 text-white sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-white/80">Billwise, one plan</p>
              <p className="tabular mt-1 text-4xl font-semibold">
                ₹{MONTHLY_PRICE_INR}
                <span className="ml-1.5 text-base font-normal text-white/80">per month</span>
              </p>
            </div>
            {state === 'paid' ? (
              <Badge className="bg-white/20 ring-white/30" dot>
                Active
              </Badge>
            ) : state === 'trial' ? (
              <Badge className="bg-white/20 ring-white/30" dot>
                Free trial
              </Badge>
            ) : (
              <Badge className="bg-white/20 ring-white/30" dot>
                Payment due
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <DetailList>
            <Detail label="Business">{businessName}</Detail>
            <Detail label="Plan">Monthly, ₹{MONTHLY_PRICE_INR}</Detail>
            {status === 'trial' && trialEndsAt && (
              <Detail label="Trial ends">
                {longDate(trialEndsAt)}
                {trialDays !== null && trialDays > 0 && (
                  <span className="text-muted-foreground">
                    {' '}
                    ({trialDays} {trialDays === 1 ? 'day' : 'days'} left)
                  </span>
                )}
              </Detail>
            )}
            {paidUntil && (
              <Detail label={state === 'due' ? 'Ended on' : 'Paid until'}>
                {longDate(paidUntil)}
                {paidDays !== null && paidDays > 0 && (
                  <span className="text-muted-foreground">
                    {' '}
                    ({paidDays} {paidDays === 1 ? 'day' : 'days'} left)
                  </span>
                )}
              </Detail>
            )}
            {status === 'active' && !paidUntil && (
              <Detail label="Paid until">No end date set</Detail>
            )}
          </DetailList>

          <div className="border-t pt-5">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              What you get
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {INCLUDED.map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-relaxed">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t pt-5">
            <PayPanel monthlyPrice={MONTHLY_PRICE_INR} paymentsEnabled={paymentsEnabled} />
          </div>

          {!paymentsEnabled && (
            <Alert variant="info" icon={Info} title="Card and UPI payments are not live yet">
              Message us and we will send you UPI details. Your account is switched on the same
              day the money reaches us.
            </Alert>
          )}
        </div>
      </Card>

      <Section title="Payment history">
        {payments.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="No payments yet"
            description={
              status === 'trial'
                ? `You are on the ${TRIAL_DAYS} day free trial. Nothing has been charged.`
                : 'Payments you make will be listed here with the date and amount.'
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>Reference</TH>
                <TH>Method</TH>
                <TH numeric>Amount</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {payments.map((p) => (
                <TR key={p.id}>
                  <TD className="tabular whitespace-nowrap">
                    {longDate(p.paidAt ?? p.createdAt)}
                  </TD>
                  <TD className="tabular text-xs text-muted-foreground">
                    {p.paymentRef ?? p.providerRef}
                  </TD>
                  <TD className="text-muted-foreground uppercase">{p.method ?? '—'}</TD>
                  <TD numeric>₹{p.amount}</TD>
                  <TD>
                    {p.status === 'paid' ? (
                      <Badge variant="success" dot>
                        Paid
                      </Badge>
                    ) : p.status === 'created' ? (
                      <Badge variant="outline">Not completed</Badge>
                    ) : (
                      <Badge variant="outline" className="capitalize">
                        {p.status}
                      </Badge>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Section>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Payment is for one month at a time. Nothing renews on its own and no card is stored, so
        stopping means simply not paying again. If you do stop, your data stays where it is and
        comes back the day you return.
      </p>
    </PageBody>
  );
}
