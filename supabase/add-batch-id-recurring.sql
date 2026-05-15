-- Add batch_id to recurring_transactions so import-created schedules can be grouped and deleted together
-- Run in Supabase SQL editor on both production and staging
-- Safe to run multiple times

alter table recurring_transactions
  add column if not exists batch_id uuid;
