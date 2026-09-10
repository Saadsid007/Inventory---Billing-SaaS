-- A third vertical: the medical store.
--
-- No schema change. `businesses.type` is plain text precisely so that adding a
-- kind of business is a constant in code plus a row here, rather than an
-- ALTER TYPE against a live database while people are billing.
--
-- ON CONFLICT DO NOTHING so a re-run never overwrites a price an admin has
-- since changed from the panel. The panel wins over the migration; that is the
-- entire point of the table.

INSERT INTO "plans" ("business_type", "label", "tagline", "monthly_price", "trial_days", "features")
VALUES (
	'medical',
	'Medical store / pharmacy',
	'Billing, stock and GST for a chemist.',
	249.00,
	10,
	'["Unlimited bills, medicines and customers","GST billing with HSN, on every bill","A4 and 80mm thermal printing","Stock goes down by itself, with low-stock alerts","Customer ledger with a running balance","Your medicine list online, with a QR code","Sales, tax, stock and outstanding reports, with CSV exports"]'::jsonb
)
ON CONFLICT ("business_type") DO NOTHING;
