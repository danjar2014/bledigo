-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('traveler', 'owner', 'agency', 'admin', 'agent', 'support');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'watched', 'limited', 'suspended', 'banned');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('apartment', 'villa', 'house', 'studio', 'riad', 'bungalow', 'penthouse', 'chalet');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('draft', 'pending', 'active', 'inactive', 'suspended', 'under_review');

-- CreateEnum
CREATE TYPE "CertificationLevel" AS ENUM ('none', 'bronze', 'silver', 'gold', 'diamond');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('pending', 'confirmed', 'checked_in', 'validated', 'completed', 'cancelled', 'disputed');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'held', 'captured', 'refunded', 'partial_refund', 'failed');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('pending', 'validated', 'auto_validated', 'disputed');

-- CreateEnum
CREATE TYPE "DisputeType" AS ENUM ('non_conform', 'dirty', 'missing_amenities', 'false_location', 'damage', 'payment', 'other');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('pending', 'analysis', 'missing_docs', 'amicable', 'bledigo_decision', 'refunded', 'rejected');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('photo', 'video', 'document', 'screenshot', 'message', 'invoice');

-- CreateEnum
CREATE TYPE "ReviewType" AS ENUM ('traveler_to_listing', 'traveler_to_owner', 'owner_to_traveler');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('text', 'photo', 'video', 'document', 'voice');

-- CreateEnum
CREATE TYPE "SubscriptionType" AS ENUM ('owner_pro', 'owner_premium', 'agency');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "InsuranceType" AS ENUM ('cancellation', 'damage', 'theft', 'assistance', 'liability');

-- CreateEnum
CREATE TYPE "InsuranceProvider" AS ENUM ('internal', 'axa', 'allianz', 'groupama');

-- CreateEnum
CREATE TYPE "InsuranceStatus" AS ENUM ('active', 'claimed', 'settled', 'expired');

-- CreateEnum
CREATE TYPE "SanctionType" AS ENUM ('watch', 'limit', 'suspend', 'ban');

-- CreateEnum
CREATE TYPE "ReverseSearchStatus" AS ENUM ('active', 'fulfilled', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "ReverseOfferStatus" AS ENUM ('pending', 'countered', 'accepted', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('EUR', 'TND', 'USD');

-- CreateEnum
CREATE TYPE "ContactAttemptType" AS ENUM ('phone', 'email', 'social', 'external_link', 'address');

-- CreateEnum
CREATE TYPE "InventoryCheckStatus" AS ENUM ('pending', 'check_in_done', 'check_out_done', 'completed', 'disputed');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "avatar_url" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "identity_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "identity_document" TEXT,
    "role" "UserRole" NOT NULL,
    "secondary_roles" JSONB NOT NULL DEFAULT '[]',
    "status" "UserStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traveler_passports" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "trust_score" INTEGER NOT NULL DEFAULT 50,
    "total_stays" INTEGER NOT NULL DEFAULT 0,
    "total_nights" INTEGER NOT NULL DEFAULT 0,
    "cancellation_rate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "recommendation_count" INTEGER NOT NULL DEFAULT 0,
    "incident_count" INTEGER NOT NULL DEFAULT 0,
    "dispute_count" INTEGER NOT NULL DEFAULT 0,
    "badges" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "no_show_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "traveler_passports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owner_passports" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "trust_score" INTEGER NOT NULL DEFAULT 50,
    "total_listings" INTEGER NOT NULL DEFAULT 0,
    "total_bookings" INTEGER NOT NULL DEFAULT 0,
    "total_revenue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "response_rate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "acceptance_rate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "incident_count" INTEGER NOT NULL DEFAULT 0,
    "dispute_count" INTEGER NOT NULL DEFAULT 0,
    "badges" JSONB NOT NULL DEFAULT '[]',
    "subscription_tier" TEXT NOT NULL DEFAULT 'free',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "avg_response_time" INTEGER NOT NULL DEFAULT 0,
    "off_platform_attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "owner_passports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listings" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "agency_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Tunisia',
    "postal_code" TEXT,
    "latitude" DECIMAL(65,30) NOT NULL,
    "longitude" DECIMAL(65,30) NOT NULL,
    "max_guests" INTEGER NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "price_per_night" DECIMAL(65,30) NOT NULL,
    "cleaning_fee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "service_fee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "trust_score" INTEGER NOT NULL DEFAULT 50,
    "quality_score" INTEGER NOT NULL DEFAULT 0,
    "cleanliness_score" INTEGER NOT NULL DEFAULT 0,
    "compliance_score" INTEGER NOT NULL DEFAULT 0,
    "safety_score" INTEGER NOT NULL DEFAULT 0,
    "certification_expires_at" TIMESTAMP(3),
    "total_bookings" INTEGER NOT NULL DEFAULT 0,
    "total_reviews" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "surface_m2" INTEGER,
    "floors" INTEGER DEFAULT 1,
    "year_built" INTEGER,
    "security_deposit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "location_score" INTEGER NOT NULL DEFAULT 0,
    "value_score" INTEGER NOT NULL DEFAULT 0,
    "avg_rating" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "is_editable" BOOLEAN NOT NULL DEFAULT true,
    "last_modified_at" TIMESTAMP(3),
    "modification_count" INTEGER NOT NULL DEFAULT 0,
    "rules" JSONB NOT NULL DEFAULT '{}',
    "amenities" JSONB NOT NULL DEFAULT '[]',
    "house_rules" JSONB NOT NULL DEFAULT '[]',
    "check_in_time" TEXT NOT NULL DEFAULT '15:00',
    "check_out_time" TEXT NOT NULL DEFAULT '11:00',
    "min_nights" INTEGER NOT NULL DEFAULT 1,
    "max_nights" INTEGER,
    "instant_book" BOOLEAN NOT NULL DEFAULT false,
    "property_type" "PropertyType" NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'TND',
    "status" "ListingStatus" NOT NULL DEFAULT 'draft',
    "certification_level" "CertificationLevel" NOT NULL DEFAULT 'none',

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_photos" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_certified" BOOLEAN NOT NULL DEFAULT false,
    "certification_date" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_passports" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "stay_count" INTEGER NOT NULL DEFAULT 0,
    "guest_count" INTEGER NOT NULL DEFAULT 0,
    "age_days" INTEGER NOT NULL DEFAULT 0,
    "certifications_history" JSONB NOT NULL DEFAULT '[]',
    "certified_photos_count" INTEGER NOT NULL DEFAULT 0,
    "videos_count" INTEGER NOT NULL DEFAULT 0,
    "control_visits_count" INTEGER NOT NULL DEFAULT 0,
    "incidents" JSONB NOT NULL DEFAULT '[]',
    "disputes" JSONB NOT NULL DEFAULT '[]',
    "dispute_resolutions" JSONB NOT NULL DEFAULT '[]',
    "scores_history" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listing_passports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "traveler_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "check_in" TIMESTAMP(3) NOT NULL,
    "check_out" TIMESTAMP(3) NOT NULL,
    "guests_count" INTEGER NOT NULL,
    "total_nights" INTEGER NOT NULL,
    "base_price" DECIMAL(65,30) NOT NULL,
    "cleaning_fee" DECIMAL(65,30) NOT NULL,
    "service_fee" DECIMAL(65,30) NOT NULL,
    "insurance_fee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "total_price" DECIMAL(65,30) NOT NULL,
    "validation_deadline" TIMESTAMP(3),
    "dispute_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "security_deposit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "validation_data" JSONB,
    "currency" "Currency" NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'pending',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "validation_status" "ValidationStatus" NOT NULL DEFAULT 'pending',

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "stripe_payment_intent_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "held_at" TIMESTAMP(3),
    "captured_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    "refund_amount" DECIMAL(65,30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "refund_reason" TEXT,
    "currency" "Currency" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "initiated_by" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "resolution_notes" TEXT,
    "decided_by" TEXT,
    "decided_at" TIMESTAMP(3),
    "refund_amount" DECIMAL(65,30),
    "sanctions" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "type" "DisputeType" NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'pending',

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute_evidence" (
    "id" TEXT NOT NULL,
    "dispute_id" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "EvidenceType" NOT NULL,

    CONSTRAINT "dispute_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "reviewee_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "cleanliness" INTEGER NOT NULL,
    "accuracy" INTEGER NOT NULL,
    "check_in" INTEGER NOT NULL,
    "communication" INTEGER NOT NULL,
    "location" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_flagged" BOOLEAN NOT NULL DEFAULT false,
    "flag_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "ai_score" DECIMAL(65,30),
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "type" "ReviewType" NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT,
    "participant_ids" TEXT[],
    "listing_id" TEXT,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "block_reason" TEXT,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "is_flagged" BOOLEAN NOT NULL DEFAULT false,
    "flag_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ai_analysis" JSONB,
    "type" "MessageType" NOT NULL DEFAULT 'text',

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certifications" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validated_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "validated_by" TEXT,
    "report" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "score_breakdown" JSONB NOT NULL DEFAULT '{}',
    "level" "CertificationLevel" NOT NULL,

    CONSTRAINT "certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "control_visits" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "checklist" JSONB NOT NULL DEFAULT '{}',
    "photos" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "gps_coordinates" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "videos" JSONB NOT NULL DEFAULT '[]',
    "weather_conditions" TEXT,

    CONSTRAINT "control_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sanctions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "duration_days" INTEGER,
    "expires_at" TIMESTAMP(3),
    "applied_by" TEXT NOT NULL,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_by" TEXT,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "SanctionType" NOT NULL,

    CONSTRAINT "sanctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reverse_searches" (
    "id" TEXT NOT NULL,
    "traveler_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "check_in" TIMESTAMP(3) NOT NULL,
    "check_out" TIMESTAMP(3) NOT NULL,
    "guests_count" INTEGER NOT NULL,
    "bedrooms" INTEGER,
    "budget_min" DECIMAL(65,30),
    "budget_max" DECIMAL(65,30),
    "requirements" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "city" TEXT,
    "region" TEXT,
    "bathrooms" INTEGER,
    "amenities_required" JSONB NOT NULL DEFAULT '[]',
    "property_types" JSONB NOT NULL DEFAULT '[]',
    "certification_min" TEXT,
    "min_trust_score" INTEGER,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "offer_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "status" "ReverseSearchStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "reverse_searches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reverse_offers" (
    "id" TEXT NOT NULL,
    "reverse_search_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "proposed_price" DECIMAL(65,30) NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "original_price" DECIMAL(65,30),
    "discount_percent" DECIMAL(65,30),
    "is_viewed" BOOLEAN NOT NULL DEFAULT false,
    "viewed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "counter_price" DECIMAL(65,30),
    "counter_at" TIMESTAMP(3),
    "negotiation_round" INTEGER NOT NULL DEFAULT 0,
    "status" "ReverseOfferStatus" NOT NULL DEFAULT 'pending',

    CONSTRAINT "reverse_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "interval" TEXT NOT NULL,
    "stripe_subscription_id" TEXT NOT NULL,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "features" JSONB NOT NULL DEFAULT '[]',
    "type" "SubscriptionType" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
    "currency" "Currency" NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_policies" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "premium_amount" DECIMAL(65,30) NOT NULL,
    "coverage_amount" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "claim_reason" TEXT,
    "claim_documents" JSONB NOT NULL DEFAULT '[]',
    "type" "InsuranceType" NOT NULL,
    "provider" "InsuranceProvider" NOT NULL DEFAULT 'internal',
    "status" "InsuranceStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "insurance_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_attempts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "detected_by" TEXT NOT NULL DEFAULT 'ai',
    "confidence" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "message_id" TEXT,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "ContactAttemptType" NOT NULL,

    CONSTRAINT "contact_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_checks" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "check_in_photos" JSONB NOT NULL DEFAULT '[]',
    "check_out_photos" JSONB NOT NULL DEFAULT '[]',
    "check_in_notes" TEXT,
    "check_out_notes" TEXT,
    "damages_found" JSONB NOT NULL DEFAULT '[]',
    "deposit_status" TEXT NOT NULL DEFAULT 'pending',
    "deposit_returned" DECIMAL(65,30),
    "deposit_kept" DECIMAL(65,30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "status" "InventoryCheckStatus" NOT NULL DEFAULT 'pending',

    CONSTRAINT "inventory_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_modifications" (
    "id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "modified_by" TEXT NOT NULL,
    "field_name" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_modifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reverse_search_credits" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "credits_total" INTEGER NOT NULL DEFAULT 0,
    "credits_used" INTEGER NOT NULL DEFAULT 0,
    "credits_remaining" INTEGER NOT NULL DEFAULT 0,
    "last_purchased_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reverse_search_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reverse_search_unlocks" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "reverse_search_id" TEXT NOT NULL,
    "credits_spent" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reverse_search_unlocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ConversationToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "traveler_passports_user_id_key" ON "traveler_passports"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "owner_passports_user_id_key" ON "owner_passports"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "listings_slug_key" ON "listings"("slug");

-- CreateIndex
CREATE INDEX "listings_owner_id_idx" ON "listings"("owner_id");

-- CreateIndex
CREATE INDEX "listings_status_idx" ON "listings"("status");

-- CreateIndex
CREATE INDEX "listings_certification_level_idx" ON "listings"("certification_level");

-- CreateIndex
CREATE INDEX "listings_latitude_longitude_idx" ON "listings"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "listings_city_idx" ON "listings"("city");

-- CreateIndex
CREATE INDEX "listing_photos_listing_id_idx" ON "listing_photos"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "listing_passports_listing_id_key" ON "listing_passports"("listing_id");

-- CreateIndex
CREATE INDEX "bookings_listing_id_idx" ON "bookings"("listing_id");

-- CreateIndex
CREATE INDEX "bookings_traveler_id_idx" ON "bookings"("traveler_id");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_check_in_check_out_idx" ON "bookings"("check_in", "check_out");

-- CreateIndex
CREATE UNIQUE INDEX "payments_booking_id_key" ON "payments"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "disputes_booking_id_key" ON "disputes"("booking_id");

-- CreateIndex
CREATE INDEX "disputes_status_idx" ON "disputes"("status");

-- CreateIndex
CREATE INDEX "dispute_evidence_dispute_id_idx" ON "dispute_evidence"("dispute_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_booking_id_key" ON "reviews"("booking_id");

-- CreateIndex
CREATE INDEX "reviews_listing_id_idx" ON "reviews"("listing_id");

-- CreateIndex
CREATE INDEX "reviews_reviewer_id_idx" ON "reviews"("reviewer_id");

-- CreateIndex
CREATE INDEX "reviews_reviewee_id_idx" ON "reviews"("reviewee_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_booking_id_key" ON "conversations"("booking_id");

-- CreateIndex
CREATE INDEX "conversations_listing_id_idx" ON "conversations"("listing_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_idx" ON "messages"("conversation_id");

-- CreateIndex
CREATE INDEX "messages_sender_id_idx" ON "messages"("sender_id");

-- CreateIndex
CREATE INDEX "certifications_listing_id_idx" ON "certifications"("listing_id");

-- CreateIndex
CREATE INDEX "control_visits_listing_id_idx" ON "control_visits"("listing_id");

-- CreateIndex
CREATE INDEX "control_visits_agent_id_idx" ON "control_visits"("agent_id");

-- CreateIndex
CREATE INDEX "sanctions_user_id_idx" ON "sanctions"("user_id");

-- CreateIndex
CREATE INDEX "sanctions_type_idx" ON "sanctions"("type");

-- CreateIndex
CREATE INDEX "reverse_searches_traveler_id_idx" ON "reverse_searches"("traveler_id");

-- CreateIndex
CREATE INDEX "reverse_searches_status_idx" ON "reverse_searches"("status");

-- CreateIndex
CREATE INDEX "reverse_offers_reverse_search_id_idx" ON "reverse_offers"("reverse_search_id");

-- CreateIndex
CREATE INDEX "reverse_offers_listing_id_idx" ON "reverse_offers"("listing_id");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "insurance_policies_booking_id_idx" ON "insurance_policies"("booking_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "contact_attempts_user_id_idx" ON "contact_attempts"("user_id");

-- CreateIndex
CREATE INDEX "contact_attempts_type_idx" ON "contact_attempts"("type");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_checks_booking_id_key" ON "inventory_checks"("booking_id");

-- CreateIndex
CREATE INDEX "listing_modifications_listing_id_idx" ON "listing_modifications"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "reverse_search_credits_user_id_key" ON "reverse_search_credits"("user_id");

-- CreateIndex
CREATE INDEX "reverse_search_unlocks_owner_id_idx" ON "reverse_search_unlocks"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "reverse_search_unlocks_owner_id_reverse_search_id_key" ON "reverse_search_unlocks"("owner_id", "reverse_search_id");

-- CreateIndex
CREATE UNIQUE INDEX "_ConversationToUser_AB_unique" ON "_ConversationToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_ConversationToUser_B_index" ON "_ConversationToUser"("B");

-- AddForeignKey
ALTER TABLE "traveler_passports" ADD CONSTRAINT "traveler_passports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_passports" ADD CONSTRAINT "owner_passports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_photos" ADD CONSTRAINT "listing_photos_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_passports" ADD CONSTRAINT "listing_passports_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_traveler_id_fkey" FOREIGN KEY ("traveler_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_evidence" ADD CONSTRAINT "dispute_evidence_dispute_id_fkey" FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewee_id_fkey" FOREIGN KEY ("reviewee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_visits" ADD CONSTRAINT "control_visits_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "control_visits" ADD CONSTRAINT "control_visits_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sanctions" ADD CONSTRAINT "sanctions_applied_by_fkey" FOREIGN KEY ("applied_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reverse_searches" ADD CONSTRAINT "reverse_searches_traveler_id_fkey" FOREIGN KEY ("traveler_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reverse_offers" ADD CONSTRAINT "reverse_offers_reverse_search_id_fkey" FOREIGN KEY ("reverse_search_id") REFERENCES "reverse_searches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reverse_offers" ADD CONSTRAINT "reverse_offers_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reverse_offers" ADD CONSTRAINT "reverse_offers_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_attempts" ADD CONSTRAINT "contact_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_checks" ADD CONSTRAINT "inventory_checks_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_modifications" ADD CONSTRAINT "listing_modifications_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reverse_search_credits" ADD CONSTRAINT "reverse_search_credits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reverse_search_unlocks" ADD CONSTRAINT "reverse_search_unlocks_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reverse_search_unlocks" ADD CONSTRAINT "reverse_search_unlocks_reverse_search_id_fkey" FOREIGN KEY ("reverse_search_id") REFERENCES "reverse_searches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConversationToUser" ADD CONSTRAINT "_ConversationToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConversationToUser" ADD CONSTRAINT "_ConversationToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

