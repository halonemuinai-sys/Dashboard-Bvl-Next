-- Alter table inventory_valuation to add main_category and collection_name
-- Run this in your Supabase SQL Editor.

ALTER TABLE inventory_valuation 
ADD COLUMN IF NOT EXISTS main_category TEXT,
ADD COLUMN IF NOT EXISTS collection_name TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_val_main_cat ON inventory_valuation (main_category);
CREATE INDEX IF NOT EXISTS idx_inventory_val_coll_name ON inventory_valuation (collection_name);
