-- 012_image_approvals.sql — IMAGE APPROVAL (owner order 2026-11-07 13:19 PKT)
--
-- Images are dangerous: a wrong picture under EduPlay's name is
-- EduPlay's responsibility. So NO picture goes public without the
-- owner's personal approval:
--   * Only teachers (role 'teacher') and the owner (role 'admin')
--     may add pictures. Kids/students NEVER.
--   * Every added/changed picture is filed here as PENDING. The
--     picture is NOT written into the game's content while pending,
--     and a game with a pending picture stays PRIVATE.
--   * The owner approves/rejects each picture in the review queue
--     (/[locale]/admin/image-reviews). Approve writes the picture
--     into the game and the game goes public (unless another picture
--     is still pending). Reject drops the picture; the game stays
--     private/imageless. The row STAYS as the approval record: who
--     approved/rejected what and when — rows are never deleted.
--
-- HOW TO RUN: paste this whole file into the Supabase SQL Editor
-- and press Run. "Success. No rows returned" is normal. Safe to
-- re-run: everything is IF NOT EXISTS.
--
-- OWNER SETUP (one line, once): the review queue opens only for
-- role 'admin'. Make yourself the admin with your own sign-in
-- email:
--   UPDATE public.users SET role = 'admin' WHERE email = '<your sign-in email>';
--
-- UNTIL THIS RUNS: the code answers "not set up yet" — new pictures
-- are NOT saved at all (the game still saves, without the picture)
-- and the creator is told to ask the owner to run this file. The
-- site never breaks and no unapproved picture ever goes public.

CREATE TABLE IF NOT EXISTS image_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  -- NULL = the game's one shared picture (labelled-diagram, map-quiz,
  -- jigsaw, video-quiz); a number = that item's own picture
  -- (picture-answer, one picture per question).
  item_index INTEGER NULL,
  image_url TEXT NOT NULL,
  image_credit TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- The visibility the teacher asked for when the picture was filed.
  -- Approve restores it (public stays public, private stays private)
  -- — approval never publishes a game the teacher wanted private.
  was_public BOOLEAN NOT NULL DEFAULT false,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT
);

CREATE INDEX IF NOT EXISTS idx_image_approvals_status
  ON image_approvals(status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_image_approvals_activity
  ON image_approvals(activity_id, status);

-- Row Level Security: the API uses the service-role client, which
-- bypasses RLS. No direct client access: pictures are reviewed only
-- through the server routes, which check the caller's role.
ALTER TABLE image_approvals ENABLE ROW LEVEL SECURITY;
