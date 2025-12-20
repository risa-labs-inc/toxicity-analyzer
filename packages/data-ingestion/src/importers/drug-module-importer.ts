import { Knex } from 'knex';
import * as fs from 'fs';
import { getDataPath } from '../db-connection';

interface DrugModuleData {
  drugName: string;
  drugClass: string;
  alternativeNames?: string[];
  symptomTerms: string[];
  safetyProxyItems: Array<{
    type: string;
    symptoms: string[];
    rationale: string;
  }>;
  phaseFilteringRules: Record<string, string[]>;
  isMyelosuppressive: boolean;
  clinicalNotes?: string;
}

interface RegimenCompositionData {
  regimenCode: string;
  regimenName: string;
  drugModuleComposition: {
    steps: Array<{
      stepName: string | null;
      cycles: number[] | 'all';
      drugModules: string[];
    }>;
    safetyProfile?: {
      myelosuppressive?: boolean;
      cardiotoxic?: boolean;
      hepatotoxic?: boolean;
      nephrotoxic?: boolean;
    };
  };
}

export async function importDrugModules(db: Knex): Promise<void> {
  const filePath = getDataPath('drug-modules.json');

  if (!fs.existsSync(filePath)) {
    throw new Error(`Drug modules file not found at: ${filePath}`);
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  console.log(`   Loading ${data.drugModules.length} drug modules...`);

  // Check if data already exists
  const existingCount = await db('drug_modules').count('* as count').first();
  if (existingCount && Number(existingCount.count) > 0) {
    console.log(`   ⚠️  ${existingCount.count} drug modules already exist. Skipping import.`);
    return;
  }

  // Insert all drug modules
  let imported = 0;
  for (const module of data.drugModules) {
    await db('drug_modules').insert({
      drug_name: module.drugName,
      drug_class: module.drugClass,
      symptom_terms: JSON.stringify(module.symptomTerms),
      safety_proxy_items: JSON.stringify(module.safetyProxyItems),
      phase_filtering_rules: JSON.stringify(module.phaseFilteringRules),
      is_myelosuppressive: module.isMyelosuppressive,
      clinical_notes: module.clinicalNotes || null,
    });
    imported++;
    console.log(`   ✓ ${module.drugName} (${module.drugClass})`);
  }

  console.log(`   ✅ Imported ${imported} drug modules`);

  // Update regimens with drug module compositions
  if (data.regimenCompositions && data.regimenCompositions.length > 0) {
    console.log(`\n   Updating ${data.regimenCompositions.length} regimens with drug module compositions...`);

    let updated = 0;
    for (const composition of data.regimenCompositions) {
      const result = await db('regimens')
        .where('regimen_code', composition.regimenCode)
        .update({
          drug_module_composition: JSON.stringify(composition.drugModuleComposition),
        });

      if (result > 0) {
        updated++;
        console.log(`   ✓ ${composition.regimenCode}: Updated with drug module composition`);
      } else {
        console.log(`   ⚠️  ${composition.regimenCode}: Regimen not found, skipping`);
      }
    }

    console.log(`   ✅ Updated ${updated} regimens`);
  }
}
