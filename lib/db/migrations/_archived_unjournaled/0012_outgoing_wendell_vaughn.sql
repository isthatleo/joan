CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"device_fingerprint_id" uuid,
	"user_session_id" uuid,
	"action" text NOT NULL,
	"resource" text,
	"resource_id" uuid,
	"description" text,
	"status" text DEFAULT 'success',
	"error_message" text,
	"ip_address" text,
	"user_agent" text,
	"browser" text,
	"os" text,
	"device_type" text,
	"country" text,
	"city" text,
	"previous_data" jsonb,
	"new_data" jsonb,
	"metadata" jsonb,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "broadcast_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"broadcast_id" uuid,
	"user_id" uuid,
	"tenant_id" uuid,
	"read_at" timestamp,
	"dismissed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "broadcasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid,
	"created_by" uuid,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"target_roles" jsonb,
	"target_tenants" jsonb,
	"priority" text DEFAULT 'normal',
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"sent_at" timestamp,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "conversation_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid,
	"user_id" uuid,
	"role" text DEFAULT 'member',
	"joined_at" timestamp DEFAULT now(),
	"last_read_at" timestamp,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid,
	"type" text NOT NULL,
	"title" text,
	"created_by" uuid,
	"is_active" boolean DEFAULT true,
	"last_message_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "device_fingerprints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"fingerprint" text NOT NULL,
	"user_agent" text,
	"browser" text,
	"browser_version" text,
	"os" text,
	"os_version" text,
	"device_type" text,
	"device_brand" text,
	"ip_address" text,
	"country" text,
	"city" text,
	"timezone" text,
	"screen_resolution" text,
	"language" text,
	"is_vpn" boolean DEFAULT false,
	"is_proxy" boolean DEFAULT false,
	"is_bot_or_spider" boolean DEFAULT false,
	"metadata" jsonb,
	"last_seen_at" timestamp DEFAULT now(),
	CONSTRAINT "device_fingerprints_fingerprint_unique" UNIQUE("fingerprint")
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid,
	"user_id" uuid,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'open',
	"priority" text DEFAULT 'medium',
	"assigned_to" uuid,
	"resolved_at" timestamp,
	"resolution" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"device_fingerprint_id" uuid,
	"event_type" text NOT NULL,
	"severity" text DEFAULT 'medium',
	"description" text,
	"ip_address" text,
	"user_agent" text,
	"metadata" jsonb,
	"is_resolved" boolean DEFAULT false,
	"resolved_by" uuid,
	"resolved_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"device_fingerprint_id" uuid,
	"session_token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"is_active" boolean DEFAULT true,
	"last_activity_at" timestamp DEFAULT now(),
	"logout_at" timestamp,
	"expires_at" timestamp,
	"metadata" jsonb,
	CONSTRAINT "user_sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
ALTER TABLE "ai_logs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_logs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notifications" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "ai_logs" CASCADE;--> statement-breakpoint
DROP TABLE "audit_logs" CASCADE;--> statement-breakpoint
DROP TABLE "notifications" CASCADE;--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_receiver_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "message_receiver_idx";--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "message" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "conversation_id" uuid;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "message_type" text DEFAULT 'text';--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "file_url" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "file_name" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "file_size" integer;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "read_by" jsonb;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_device_fingerprint_id_device_fingerprints_id_fk" FOREIGN KEY ("device_fingerprint_id") REFERENCES "public"."device_fingerprints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_session_id_user_sessions_id_fk" FOREIGN KEY ("user_session_id") REFERENCES "public"."user_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_recipients" ADD CONSTRAINT "broadcast_recipients_broadcast_id_broadcasts_id_fk" FOREIGN KEY ("broadcast_id") REFERENCES "public"."broadcasts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_recipients" ADD CONSTRAINT "broadcast_recipients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_recipients" ADD CONSTRAINT "broadcast_recipients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_fingerprints" ADD CONSTRAINT "device_fingerprints_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_fingerprints" ADD CONSTRAINT "device_fingerprints_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_device_fingerprint_id_device_fingerprints_id_fk" FOREIGN KEY ("device_fingerprint_id") REFERENCES "public"."device_fingerprints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_device_fingerprint_id_device_fingerprints_id_fk" FOREIGN KEY ("device_fingerprint_id") REFERENCES "public"."device_fingerprints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_tenant_idx" ON "activity_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "activity_log_user_idx" ON "activity_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_log_device_idx" ON "activity_logs" USING btree ("device_fingerprint_id");--> statement-breakpoint
CREATE INDEX "activity_log_action_idx" ON "activity_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "activity_log_resource_idx" ON "activity_logs" USING btree ("resource");--> statement-breakpoint
CREATE INDEX "activity_log_timestamp_idx" ON "activity_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "broadcast_recip_broadcast_idx" ON "broadcast_recipients" USING btree ("broadcast_id");--> statement-breakpoint
CREATE INDEX "broadcast_recip_user_idx" ON "broadcast_recipients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "broadcast_tenant_idx" ON "broadcasts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "broadcast_type_idx" ON "broadcasts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "conv_part_conv_idx" ON "conversation_participants" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "conv_part_user_idx" ON "conversation_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversation_tenant_idx" ON "conversations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "conversation_type_idx" ON "conversations" USING btree ("type");--> statement-breakpoint
CREATE INDEX "device_fingerprint_tenant_idx" ON "device_fingerprints" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "device_fingerprint_user_idx" ON "device_fingerprints" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "device_fingerprint_fp_idx" ON "device_fingerprints" USING btree ("fingerprint");--> statement-breakpoint
CREATE INDEX "feedback_tenant_idx" ON "feedback" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "feedback_user_idx" ON "feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feedback_type_idx" ON "feedback" USING btree ("type");--> statement-breakpoint
CREATE INDEX "feedback_status_idx" ON "feedback" USING btree ("status");--> statement-breakpoint
CREATE INDEX "security_event_tenant_idx" ON "security_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "security_event_user_idx" ON "security_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "security_event_type_idx" ON "security_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "security_event_severity_idx" ON "security_events" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "user_sessions_tenant_idx" ON "user_sessions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "user_sessions_user_idx" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_sessions_device_idx" ON "user_sessions" USING btree ("device_fingerprint_id");--> statement-breakpoint
CREATE INDEX "user_sessions_active_idx" ON "user_sessions" USING btree ("is_active");--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_conv_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "receiver_id";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "read";