-- Add batch_id column to transactions for import batch tracking
-- Run this in the Supabase SQL editor on both production and staging projects
-- Safe to run multiple times

alter table transactions
  add column if not exists batch_id uuid;
