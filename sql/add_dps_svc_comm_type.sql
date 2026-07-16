-- Alter bvlgari_sales table to support card commission and item type for DPS and SVC transactions
-- Run this in the Supabase SQL Editor to apply the schema changes.

ALTER TABLE bvlgari_sales ADD COLUMN IF NOT EXISTS card_comm NUMERIC DEFAULT 0;
ALTER TABLE bvlgari_sales ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'Regular';
