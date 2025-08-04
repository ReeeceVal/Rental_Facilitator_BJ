-- Cleanup script to remove duplicate equipment entries
-- This script keeps the first (oldest) entry for each equipment name (case-insensitive)

-- Step 1: Create a temporary table with equipment to keep (first occurrence of each name)
CREATE TEMP TABLE equipment_to_keep AS
SELECT DISTINCT ON (LOWER(name)) id, name
FROM equipment
ORDER BY LOWER(name), id ASC;

-- Step 2: Update any invoice_items that reference duplicate equipment to use the kept equipment
UPDATE invoice_items 
SET equipment_id = etk.id
FROM equipment_to_keep etk, equipment e
WHERE invoice_items.equipment_id = e.id
  AND LOWER(e.name) = LOWER(etk.name)
  AND e.id != etk.id;

-- Step 3: Delete duplicate equipment (keep only the ones in equipment_to_keep)
DELETE FROM equipment 
WHERE id NOT IN (SELECT id FROM equipment_to_keep);

-- Step 4: Show summary of remaining equipment
SELECT 
  'Equipment cleanup completed' as status,
  COUNT(*) as total_equipment_remaining
FROM equipment;

-- Step 5: Verify no duplicates remain
SELECT 
  LOWER(name) as normalized_name, 
  COUNT(*) as count,
  string_agg(name, ', ') as variations
FROM equipment 
GROUP BY LOWER(name) 
HAVING COUNT(*) > 1
ORDER BY count DESC;