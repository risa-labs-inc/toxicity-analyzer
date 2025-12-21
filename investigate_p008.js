const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

async function investigateP008() {
  try {
    console.log('🔍 INVESTIGATING P008 (T-DM1) - 0 QUESTIONS GENERATED\n');
    console.log('═'.repeat(80));

    const headers = { Authorization: 'Demo P008' };

    // Get comparison results
    console.log('\n1️⃣ Getting comparison results...');
    const comparison = await axios.post(
      `${API_BASE}/patient/questionnaires/compare`,
      {},
      { headers }
    );

    const { regimenApproach, drugModuleApproach } = comparison.data.comparison;

    console.log('\n📊 REGIMEN APPROACH:');
    console.log(`   Questions Generated: ${regimenApproach.items.length}`);
    console.log(`   Symptoms:`);
    const regimenSymptoms = new Set();
    regimenApproach.items.forEach(item => {
      const parts = item.itemCode.split('_');
      const lastPart = parts[parts.length - 1];
      const symptom = ['FREQ', 'SEV', 'INTERF', 'PRESENT', 'AMOUNT'].includes(lastPart)
        ? parts.slice(0, -1).join('_')
        : item.itemCode;
      regimenSymptoms.add(symptom);
    });
    regimenSymptoms.forEach(s => console.log(`     - ${s}`));

    console.log('\n📊 DRUG-MODULE APPROACH:');
    console.log(`   Questions Generated: ${drugModuleApproach.items.length}`);
    console.log(`   Active Drugs: ${drugModuleApproach.metadata.activeDrugs.join(', ')}`);

    if (drugModuleApproach.items.length === 0) {
      console.log('\n⚠️  NO QUESTIONS GENERATED! Investigating why...');

      // Get T-DM1 drug module
      console.log('\n2️⃣ Checking T-DM1 drug module definition...');
      const drugModulesData = require('./data/drug-modules.json');
      const tdm1Module = drugModulesData.drugModules.find(d => d.drugName === 'T-DM1');

      if (!tdm1Module) {
        console.log('   ❌ T-DM1 module not found!');
        return;
      }

      console.log(`   ✅ T-DM1 module found`);
      console.log(`   Symptom Terms (${tdm1Module.symptomTerms.length}):`);
      tdm1Module.symptomTerms.forEach(s => console.log(`     - ${s}`));

      console.log(`\n   Safety Proxy Items:`);
      tdm1Module.safetyProxyItems.forEach(proxy => {
        console.log(`     ${proxy.type}:`);
        proxy.symptoms.forEach(s => console.log(`       - ${s}`));
      });

      // Get all symptoms from T-DM1 module
      const allTDM1Symptoms = new Set([
        ...tdm1Module.symptomTerms,
        ...tdm1Module.safetyProxyItems.flatMap(p => p.symptoms)
      ]);

      console.log(`\n   Total Unique Symptoms: ${allTDM1Symptoms.size}`);
      console.log(`   All Symptoms:`);
      Array.from(allTDM1Symptoms).sort().forEach(s => console.log(`     - ${s}`));

      // Check PRO-CTCAE library
      console.log('\n3️⃣ Checking PRO-CTCAE library...');
      const proctcaeResponse = await axios.get(
        'http://localhost:3000/api/v1/test/proctcae',
        { headers }
      );

      const proctcaeItems = proctcaeResponse.data.items || [];
      console.log(`   Total PRO-CTCAE items: ${proctcaeItems.length}`);

      // Extract symptom terms from PRO-CTCAE
      const proctcaeSymptoms = new Set();
      proctcaeItems.forEach(item => {
        const parts = item.itemCode.split('_');
        const lastPart = parts[parts.length - 1];
        const symptom = ['FREQ', 'SEV', 'INTERF', 'PRESENT', 'AMOUNT'].includes(lastPart)
          ? parts.slice(0, -1).join('_').toLowerCase()
          : item.itemCode.toLowerCase();
        proctcaeSymptoms.add(symptom);
      });

      console.log(`   Unique symptom terms: ${proctcaeSymptoms.size}`);
      console.log(`   Available symptoms:`);
      Array.from(proctcaeSymptoms).sort().forEach(s => console.log(`     - ${s}`));

      // Compare
      console.log('\n4️⃣ MISMATCH ANALYSIS:');
      console.log('\n   ❌ T-DM1 symptoms NOT in PRO-CTCAE library:');
      Array.from(allTDM1Symptoms).sort().forEach(symptom => {
        if (!proctcaeSymptoms.has(symptom.toLowerCase())) {
          console.log(`     - ${symptom}`);
        }
      });

      console.log('\n   ✅ T-DM1 symptoms AVAILABLE in PRO-CTCAE library:');
      const matches = Array.from(allTDM1Symptoms).filter(symptom =>
        proctcaeSymptoms.has(symptom.toLowerCase())
      );
      matches.forEach(symptom => {
        console.log(`     - ${symptom}`);
      });

      if (matches.length === 0) {
        console.log('     (NONE - This is why 0 questions were generated!)');
      }

      console.log('\n5️⃣ ROOT CAUSE:');
      if (matches.length === 0) {
        console.log('   ❌ NONE of the T-DM1 symptom terms match PRO-CTCAE library terms');
        console.log('   📝 The PRO-CTCAE test library is incomplete and missing critical symptoms');
      } else {
        console.log('   ⚠️  Some matches exist but phase filtering may have excluded them');
      }

      // Check patient context
      console.log('\n6️⃣ Checking patient treatment context...');
      const timeline = await axios.get(
        `${API_BASE}/patient/treatment/timeline`,
        { headers }
      );
      console.log(`   Current Phase: ${timeline.data.timeline.phase}`);
      console.log(`   Treatment Day: ${timeline.data.timeline.treatmentDay}`);
      console.log(`   In Nadir Window: ${timeline.data.timeline.inNadirWindow}`);
    }

    console.log('\n═'.repeat(80));
    console.log('✅ Investigation complete');

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response?.data?.stack) {
      console.error('\nStack:', error.response.data.stack);
    }
  }
}

investigateP008();
