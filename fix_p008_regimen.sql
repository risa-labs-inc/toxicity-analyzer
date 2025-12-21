-- Fix P008 regimen to use T-DM1 as drug module name
UPDATE regimens
SET drug_module_composition = jsonb_set(
  drug_module_composition,
  '{steps,0,drugModules}',
  '["T-DM1"]'::jsonb
)
WHERE regimen_code = 'T-DM1';

-- Verify the update
SELECT regimen_code, regimen_name, drug_module_composition
FROM regimens
WHERE regimen_code = 'T-DM1';
