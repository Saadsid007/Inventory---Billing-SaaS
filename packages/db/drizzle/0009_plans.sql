-- Pricing moves out of the code and into a table an admin can edit.
--
-- Written by hand on top of drizzle-kit's output so it is safe to run twice —
-- the same reason 0007 was. This has to apply cleanly to production and to a
-- Neon branch made from it after the fact.

CREATE TABLE IF NOT EXISTS "plans" (
	"business_type" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"tagline" text,
	"monthly_price" numeric(12, 2) NOT NULL,
	"trial_days" integer DEFAULT 10 NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "plans" ADD CONSTRAINT "plans_updated_by_users_id_fk"
		FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id")
		ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

-- Seed both verticals at their intended prices. ON CONFLICT DO NOTHING so a
-- re-run never overwrites a price an admin has since changed — the whole point
-- of the table is that the panel wins over the migration.
INSERT INTO "plans" ("business_type", "label", "tagline", "monthly_price", "trial_days", "features")
VALUES
	(
		'retail',
		'Shop or business',
		'Billing, stock and GST for a shop that sells goods.',
		299.00,
		10,
		'["Unlimited bills, products and customers","GST and non-GST billing, with all five document types","A4 and 80mm thermal printing","Automatic stock tracking and low-stock alerts","Customer ledger with a running balance","Your public catalog and QR code","Sales, tax, stock and outstanding reports, with CSV exports"]'::jsonb
	),
	(
		'jan_seva',
		'Jan Seva Kendra / CSC',
		'Receipts and a work register for a service counter.',
		149.00,
		10,
		'["Unlimited receipts, services and customers","Work register — applied, in process, ready, delivered","Part payment today, the rest on collection — both tracked","Send the receipt on WhatsApp, and a message when the work is ready","A4 and 80mm slips with the reference number on them","One screen for who owes you what","Earnings report, after the government fee is taken out"]'::jsonb
	)
ON CONFLICT ("business_type") DO NOTHING;
