-- Migration 023: notifications table + Realtime
-- Apply via Supabase Dashboard → SQL Editor

-- ─── Table ───
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  clinic_id   UUID        REFERENCES public.clinics(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL DEFAULT 'general'
                          CHECK (type IN ('protocol_step_due', 'patient_alert', 'staff_invite', 'general')),
  title       TEXT        NOT NULL,
  body        TEXT,
  read        BOOLEAN     NOT NULL DEFAULT FALSE,
  link        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Index for fast per-user queries ───
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications (user_id, created_at DESC);

-- ─── RLS ───
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "v23_notifications_select_own"  ON public.notifications;
DROP POLICY IF EXISTS "v23_notifications_update_own"  ON public.notifications;
DROP POLICY IF EXISTS "v23_notifications_insert_auth" ON public.notifications;

CREATE POLICY "v23_notifications_select_own"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "v23_notifications_update_own"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Staff can insert notifications for users in the same clinic
CREATE POLICY "v23_notifications_insert_auth"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ─── Grants ───
GRANT ALL ON public.notifications TO authenticated;

-- ─── Realtime ───
-- Run this only if not already in publication:
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
