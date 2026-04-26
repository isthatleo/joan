CREATE INDEX "appointment_patient_idx" ON "appointments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "audit_user_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "event_tenant_idx" ON "events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "invoice_patient_idx" ON "invoices" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "patient_tenant_idx" ON "patients" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "visit_patient_idx" ON "visits" USING btree ("patient_id");