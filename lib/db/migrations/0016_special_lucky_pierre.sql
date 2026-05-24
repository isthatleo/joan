CREATE TABLE "message_call_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid,
	"caller_id" uuid NOT NULL,
	"callee_id" uuid NOT NULL,
	"call_type" text NOT NULL,
	"status" text DEFAULT 'ringing' NOT NULL,
	"offer" jsonb,
	"answer" jsonb,
	"caller_candidates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"callee_candidates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_presence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"context" text DEFAULT 'messages' NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_typing_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"receiver_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message_call_sessions" ADD CONSTRAINT "message_call_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_call_sessions" ADD CONSTRAINT "message_call_sessions_caller_id_users_id_fk" FOREIGN KEY ("caller_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_call_sessions" ADD CONSTRAINT "message_call_sessions_callee_id_users_id_fk" FOREIGN KEY ("callee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_presence" ADD CONSTRAINT "message_presence_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_presence" ADD CONSTRAINT "message_presence_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_typing_states" ADD CONSTRAINT "message_typing_states_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_typing_states" ADD CONSTRAINT "message_typing_states_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_typing_states" ADD CONSTRAINT "message_typing_states_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_call_caller_idx" ON "message_call_sessions" USING btree ("caller_id");--> statement-breakpoint
CREATE INDEX "message_call_callee_idx" ON "message_call_sessions" USING btree ("callee_id");--> statement-breakpoint
CREATE INDEX "message_call_status_idx" ON "message_call_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "message_call_expires_idx" ON "message_call_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "message_presence_user_idx" ON "message_presence" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "message_presence_tenant_idx" ON "message_presence" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "message_presence_last_seen_idx" ON "message_presence" USING btree ("last_seen_at");--> statement-breakpoint
CREATE UNIQUE INDEX "message_typing_pair_idx" ON "message_typing_states" USING btree ("sender_id","receiver_id");--> statement-breakpoint
CREATE INDEX "message_typing_receiver_idx" ON "message_typing_states" USING btree ("receiver_id");--> statement-breakpoint
CREATE INDEX "message_typing_expires_idx" ON "message_typing_states" USING btree ("expires_at");