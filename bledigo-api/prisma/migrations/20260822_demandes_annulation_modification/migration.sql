-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "cancellation_policy" TEXT;

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "cancellation_deadline_days" INTEGER,
ADD COLUMN     "cancellation_policy" TEXT;

-- CreateTable
CREATE TABLE "change_requests" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "booking_id" TEXT,
    "service_booking_id" TEXT,
    "requested_by_id" TEXT NOT NULL,
    "requested_by_role" TEXT NOT NULL,
    "new_start_date" TIMESTAMP(3),
    "new_end_date" TIMESTAMP(3),
    "new_price" DOUBLE PRECISION,
    "reason_code" TEXT NOT NULL,
    "reason_text" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "auto_accept_at" TIMESTAMP(3) NOT NULL,
    "responded_at" TIMESTAMP(3),
    "responded_by_id" TEXT,
    "response_note" TEXT,
    "policy_snapshot" TEXT,
    "was_late" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "change_requests_booking_id_idx" ON "change_requests"("booking_id");

-- CreateIndex
CREATE INDEX "change_requests_service_booking_id_idx" ON "change_requests"("service_booking_id");

-- CreateIndex
CREATE INDEX "change_requests_requested_by_id_idx" ON "change_requests"("requested_by_id");

-- CreateIndex
CREATE INDEX "change_requests_status_idx" ON "change_requests"("status");

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_service_booking_id_fkey" FOREIGN KEY ("service_booking_id") REFERENCES "service_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

