-- Step 55.2: a link notice is always for one parent, and a tap's notification
-- never is (every guardian of the child sees it). The app's own parsing checks
-- this too; this makes it impossible, not just unlikely. Its own migration:
-- Postgres can't use an enum value in the transaction that added it.
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipient_matches_kind"
  CHECK (("kind" = 'guardian_linked') = ("recipientParentId" IS NOT NULL));
