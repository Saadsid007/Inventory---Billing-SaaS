CREATE TYPE "public"."invoice_kind" AS ENUM('tax_invoice', 'bill_of_supply', 'cash_memo', 'estimate', 'delivery_challan');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'issued', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'partial', 'paid');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "categories_business_name_unq" UNIQUE("business_id","name")
);
--> statement-breakpoint
CREATE TABLE "custom_field_defs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"entity" text NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"type" text NOT NULL,
	"options" jsonb,
	"required" boolean DEFAULT false NOT NULL,
	"show_in_catalog" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "custom_field_defs_business_entity_key_unq" UNIQUE("business_id","entity","key")
);
--> statement-breakpoint
CREATE TABLE "tax_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid,
	"name" text NOT NULL,
	"rate" numeric(5, 2) NOT NULL,
	"cess_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	CONSTRAINT "units_business_short_unq" UNIQUE("business_id","short_name")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"type" text DEFAULT 'simple' NOT NULL,
	"name" text NOT NULL,
	"sku" text,
	"barcode" text,
	"category_id" uuid,
	"unit_id" uuid,
	"hsn_code" text,
	"tax_rate_id" uuid,
	"sale_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"purchase_price" numeric(12, 2),
	"opening_stock" numeric(12, 3) DEFAULT '0' NOT NULL,
	"current_stock" numeric(12, 3) DEFAULT '0' NOT NULL,
	"low_stock_alert" numeric(12, 3),
	"track_inventory" boolean DEFAULT true NOT NULL,
	"description" text,
	"image_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"show_in_catalog" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"qty_change" numeric(12, 3) NOT NULL,
	"reason" text NOT NULL,
	"ref_type" text,
	"ref_id" uuid,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"type" text DEFAULT 'customer' NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"gstin" text,
	"state_code" text,
	"address_line1" text,
	"city" text,
	"pincode" text,
	"opening_balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_views" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"business_id" uuid NOT NULL,
	"product_id" uuid,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"referrer" text
);
--> statement-breakpoint
CREATE TABLE "invoice_audit" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"business_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"action" text NOT NULL,
	"changed_by" uuid,
	"snapshot" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"line_no" integer NOT NULL,
	"product_id" uuid,
	"name" text NOT NULL,
	"hsn_code" text,
	"unit" text,
	"qty" numeric(12, 3) NOT NULL,
	"rate" numeric(12, 2) NOT NULL,
	"discount_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"taxable_value" numeric(12, 2) NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"cess_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"cgst_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"sgst_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"igst_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"cess_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"line_total" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"kind" "invoice_kind" NOT NULL,
	"fy" text NOT NULL,
	"prefix" text DEFAULT '' NOT NULL,
	"next_number" integer DEFAULT 1 NOT NULL,
	"padding" integer DEFAULT 3 NOT NULL,
	CONSTRAINT "invoice_series_business_kind_fy_unq" UNIQUE("business_id","kind","fy")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"kind" "invoice_kind" NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"fy" text NOT NULL,
	"invoice_no" text,
	"invoice_date" date NOT NULL,
	"due_date" date,
	"party_id" uuid,
	"party_name" text NOT NULL,
	"party_gstin" text,
	"party_phone" text,
	"party_address" text,
	"supplier_state_code" text NOT NULL,
	"place_of_supply" text NOT NULL,
	"is_interstate" boolean NOT NULL,
	"tax_mode" text DEFAULT 'exclusive' NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"discount_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"cgst_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"sgst_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"igst_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"cess_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"other_charges" numeric(12, 2) DEFAULT '0' NOT NULL,
	"round_off" numeric(12, 2) DEFAULT '0' NOT NULL,
	"grand_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"amount_paid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"notes" text,
	"terms" text,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"party_id" uuid,
	"invoice_id" uuid,
	"amount" numeric(12, 2) NOT NULL,
	"direction" text NOT NULL,
	"method" text NOT NULL,
	"reference" text,
	"paid_on" date NOT NULL,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_field_defs" ADD CONSTRAINT "custom_field_defs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_tax_rate_id_tax_rates_id_fk" FOREIGN KEY ("tax_rate_id") REFERENCES "public"."tax_rates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_views" ADD CONSTRAINT "catalog_views_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_views" ADD CONSTRAINT "catalog_views_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_series" ADD CONSTRAINT "invoice_series_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tax_rates_business_active_idx" ON "tax_rates" USING btree ("business_id","is_active");--> statement-breakpoint
CREATE INDEX "products_business_active_idx" ON "products" USING btree ("business_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "products_business_sku_unq" ON "products" USING btree ("business_id","sku") WHERE "products"."sku" is not null;--> statement-breakpoint
CREATE INDEX "products_business_catalog_idx" ON "products" USING btree ("business_id","show_in_catalog");--> statement-breakpoint
CREATE INDEX "stock_movements_business_product_time_idx" ON "stock_movements" USING btree ("business_id","product_id","created_at");--> statement-breakpoint
CREATE INDEX "stock_movements_ref_idx" ON "stock_movements" USING btree ("ref_type","ref_id");--> statement-breakpoint
CREATE INDEX "parties_business_type_idx" ON "parties" USING btree ("business_id","type");--> statement-breakpoint
CREATE INDEX "parties_business_name_idx" ON "parties" USING btree ("business_id","name");--> statement-breakpoint
CREATE INDEX "parties_business_phone_idx" ON "parties" USING btree ("business_id","phone");--> statement-breakpoint
CREATE INDEX "catalog_views_business_time_idx" ON "catalog_views" USING btree ("business_id","viewed_at");--> statement-breakpoint
CREATE INDEX "invoice_audit_business_invoice_idx" ON "invoice_audit" USING btree ("business_id","invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_lines_invoice_idx" ON "invoice_lines" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "invoice_lines_business_product_idx" ON "invoice_lines" USING btree ("business_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_business_kind_fy_no_unq" ON "invoices" USING btree ("business_id","kind","fy","invoice_no") WHERE "invoices"."invoice_no" is not null;--> statement-breakpoint
CREATE INDEX "invoices_business_date_idx" ON "invoices" USING btree ("business_id","invoice_date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "invoices_business_party_idx" ON "invoices" USING btree ("business_id","party_id");--> statement-breakpoint
CREATE INDEX "invoices_business_status_idx" ON "invoices" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "invoices_business_payment_idx" ON "invoices" USING btree ("business_id","payment_status");--> statement-breakpoint
CREATE INDEX "payments_business_party_date_idx" ON "payments" USING btree ("business_id","party_id","paid_on");--> statement-breakpoint
CREATE INDEX "payments_business_invoice_idx" ON "payments" USING btree ("business_id","invoice_id");