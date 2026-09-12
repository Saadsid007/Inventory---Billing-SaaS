-- Batch and expiry tracking, for the medical vertical.
--
-- Every statement here is ADDITIVE. One new table, and nullable columns on
-- three existing ones. No column changes type, changes meaning, or gains a
-- NOT NULL — a kirana store and a Jan Seva Kendra are live on these tables and
-- must not notice this ran.
--
-- Hand-written on top of drizzle-kit's output so it applies cleanly twice, the
-- same as 0007 and 0009. That matters here more than usual: this runs against
-- production while people are billing.

CREATE TABLE IF NOT EXISTS "product_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"batch_no" text NOT NULL,
	"expiry_date" date,
	"mfg_date" date,
	"mrp" numeric(12, 2),
	"purchase_price" numeric(12, 2),
	"quantity" numeric(12, 3) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Pharmacy detail on an item. Null for every business that is not a chemist.
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "salt_composition" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "generic_name" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "manufacturer" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "pack_size" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "drug_schedule" text;--> statement-breakpoint

-- Which lot moved, and which lot was sold. Null everywhere else.
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "batch_id" uuid;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD COLUMN IF NOT EXISTS "batch_id" uuid;--> statement-breakpoint
-- Snapshotted onto the line, like every other printable field on it: a batch
-- row may be tidied away once empty, and a bill must still say what it said.
ALTER TABLE "invoice_lines" ADD COLUMN IF NOT EXISTS "batch_no" text;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD COLUMN IF NOT EXISTS "expiry_date" date;--> statement-breakpoint

DO $$ BEGIN
	ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_business_id_businesses_id_fk"
		FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id")
		ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "product_batches" ADD CONSTRAINT "product_batches_product_id_products_id_fk"
		FOREIGN KEY ("product_id") REFERENCES "public"."products"("id")
		ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_batch_id_product_batches_id_fk"
		FOREIGN KEY ("batch_id") REFERENCES "public"."product_batches"("id")
		ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_batch_id_product_batches_id_fk"
		FOREIGN KEY ("batch_id") REFERENCES "public"."product_batches"("id")
		ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

-- The FEFO picker reads this one on every billing line.
CREATE INDEX IF NOT EXISTS "product_batches_business_product_expiry_idx"
	ON "product_batches" USING btree ("business_id","product_id","expiry_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_batches_business_expiry_idx"
	ON "product_batches" USING btree ("business_id","expiry_date");--> statement-breakpoint
-- Receiving the same lot twice must add to the batch that exists rather than
-- create a second row that splits its quantity.
CREATE UNIQUE INDEX IF NOT EXISTS "product_batches_product_batch_unq"
	ON "product_batches" USING btree ("business_id","product_id","batch_no");
