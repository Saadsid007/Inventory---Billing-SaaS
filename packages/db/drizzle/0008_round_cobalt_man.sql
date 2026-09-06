CREATE TABLE "service_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"party_id" uuid,
	"invoice_id" uuid,
	"service_id" uuid,
	"service_name" text NOT NULL,
	"party_name" text,
	"party_phone" text,
	"status" text DEFAULT 'applied' NOT NULL,
	"reference_no" text,
	"applied_on" date NOT NULL,
	"expected_on" date,
	"delivered_on" date,
	"documents_held" text,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "type" text DEFAULT 'retail' NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "public_token" text;--> statement-breakpoint
ALTER TABLE "service_applications" ADD CONSTRAINT "service_applications_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_applications" ADD CONSTRAINT "service_applications_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_applications" ADD CONSTRAINT "service_applications_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_applications" ADD CONSTRAINT "service_applications_service_id_products_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_applications" ADD CONSTRAINT "service_applications_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "service_applications_business_status_idx" ON "service_applications" USING btree ("business_id","status");--> statement-breakpoint
CREATE INDEX "service_applications_business_applied_idx" ON "service_applications" USING btree ("business_id","applied_on" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "service_applications_business_party_idx" ON "service_applications" USING btree ("business_id","party_id");--> statement-breakpoint
CREATE INDEX "service_applications_invoice_idx" ON "service_applications" USING btree ("invoice_id");--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_publicToken_unique" UNIQUE("public_token");