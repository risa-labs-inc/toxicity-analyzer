# Intelligence Layer

Core business logic for the Toxicity Analyzer application. Implements treatment profiling, question orchestration, toxicity scoring, and alert detection.

## Components

### 1. The Profiler ✅

Calculates treatment context by analyzing patient position in their treatment cycle.

**Key Functions:**
- `calculateTimeline()` - Calculate treatment day, cycle phase, and nadir status
- `buildTreatmentContext()` - Build complete context for orchestration
- `analyzeNadirStatus()` - Detailed nadir window analysis
- `generateNadirGuidance()` - Patient-facing nadir guidance messages

**Cycle Phases:**
- `pre_session` - Days 20-22 (approaching next infusion)
- `post_session` - Days 1-3 (immediate post-infusion)
- `recovery` - Days 4-6 (early recovery)
- `nadir` - Days 7-12 (neutrophil nadir, regimen-specific)
- `inter_cycle` - Other days between cycles

**Usage Example:**

```typescript
import { calculateTimeline, buildTreatmentContext } from '@toxicity-analyzer/intelligence-layer';

const timeline = calculateTimeline({
  treatment: patientTreatment,
  regimen: acTRegimen,
  currentCycle: cycle3,
  currentDate: new Date()
});

console.log(timeline.phase); // 'nadir'
console.log(timeline.treatmentDay); // 9
console.log(timeline.inNadirWindow); // true

const context = buildTreatmentContext({
  treatment: patientTreatment,
  regimen: acTRegimen,
  currentCycle: cycle3,
  currentDate: new Date()
});
// Use context for question orchestration
```

**Nadir Detection:**

```typescript
import { analyzeNadirStatus, generateNadirGuidance } from '@toxicity-analyzer/intelligence-layer';

const nadirAnalysis = analyzeNadirStatus(9, acTRegimen);
// {
//   isInNadirWindow: true,
//   nadirDay: 9,
//   daysIntoNadir: 2,
//   daysUntilNadirEnd: 3,
//   nadirSeverity: 'peak'
// }

const guidance = generateNadirGuidance(nadirAnalysis);
// "⚠️ PEAK NADIR PERIOD: Your infection risk is at its highest..."
```

### 2. The Orchestrator ✅

Dynamic PRO-CTCAE question selection based on treatment context.

**Key Functions:**
- `selectQuestions()` - Filter and prioritize PRO-CTCAE items
- `filterByRegimenToxicity()` - Match high-risk symptoms for regimen
- `filterByCyclePhase()` - Select phase-appropriate symptoms
- `applyHistoricalEscalation()` - Prioritize recurring symptoms
- `evaluateBranching()` - Trigger interference questions when appropriate

**Selection Logic:**
1. Filter by regimen toxicity profile (high-risk symptoms)
2. Filter by cycle phase (phase-appropriate symptoms)
3. Apply historical escalation (prioritize previous Grade ≥ 2)
4. Ensure attribute completeness (frequency + severity minimum)
5. Prioritize and limit to 8-12 items
6. Add conditional branching (interference if freq/sev ≥ 2)

**Usage Example:**

```typescript
import { selectQuestions } from '@toxicity-analyzer/intelligence-layer';

const result = selectQuestions({
  context: treatmentContext,  // From The Profiler
  availableItems: proctcaeLibrary,
  patientHistory: symptomHistory,
  targetItemCount: 12
});

result.selectedQuestions.forEach(q => {
  console.log(q.item.questionText);
  if (q.requiresConditionalBranching) {
    console.log('  → May trigger follow-up question');
  }
});
```

### 3. Scoring Service ✅

NCI-validated composite scoring algorithm.

**Key Functions:**
- `calculateCompositeGrade()` - Calculate grade 0-4 from responses
- `calculateMultipleGrades()` - Process complete questionnaire
- `mapToCTCAE()` - Map PRO-CTCAE to CTCAE v5.0 equivalents
- `getHighestGrade()` - Identify worst symptom
- `calculateToxicityBurden()` - Overall burden score (0-100)

**Grading Algorithm:**
- Base grade = MAX(frequency, severity)
- Escalate if both frequency ≥ 3 AND severity ≥ 3
- Apply interference modifier (interference ≥ 3 → escalate)
- Cap at Grade 4

**Usage Example:**

```typescript
import { calculateCompositeGrade, mapToCTCAE } from '@toxicity-analyzer/intelligence-layer';

const result = calculateCompositeGrade({
  symptomCategory: 'nausea',
  frequency: 3,
  severity: 2,
  interference: null
});
// { compositeGrade: 3, gradingRationale: "Base grade: MAX(3,2) = 3" }

const ctcae = mapToCTCAE('nausea', result.compositeGrade);
// { ctcaeGrade: 3, ctcaeTermDraft: "Nausea - Grade 3", ... }
```

### 4. Alert Engine ✅

Emergency and triage alert detection.

**Key Functions:**
- `detectEmergencyAlerts()` - Flag Grade 3/4 toxicities
- `generatePatientSummary()` - Patient-facing summary
- `prioritizeTriageQueue()` - Sort patients by urgency
- `getQueueStatistics()` - Dashboard overview stats

**Alert Types:**
- **Red (Emergency)**: Grade 4, neutropenic fever, severe bleeding
- **Yellow (Urgent)**: Grade 3, concerning trends, multiple Grade 2
- **Green (Routine)**: Grade 1-2, routine monitoring

**Triage Prioritization:**
- Red alerts: +100 points each
- Yellow alerts: +25 points each
- Nadir window: +15 points
- Recent completion: +10 points

**Usage Example:**

```typescript
import { detectEmergencyAlerts, prioritizeTriageQueue } from '@toxicity-analyzer/intelligence-layer';

const alerts = detectEmergencyAlerts({
  grades: gradingResults,
  patientContext: { inNadirWindow: true }
});

alerts.forEach(alert => {
  console.log(`${alert.severity.toUpperCase()}: ${alert.alertMessage}`);
  console.log(`Patient: ${alert.patientInstructions}`);
  console.log(`Clinician: ${alert.clinicianInstructions}`);
});

const queue = prioritizeTriageQueue(patientsWithAlerts);
// Sorted by urgency, ready for dashboard display
```

## Development

### Run Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Coverage Report

```bash
npm test -- --coverage
```

### Build

```bash
npm run build
```

## Architecture

```
packages/intelligence-layer/
├── src/
│   ├── profiler/              # ✅ Timeline calculation & nadir detection
│   │   ├── timeline-calculator.ts
│   │   ├── nadir-detector.ts
│   │   ├── index.ts
│   │   └── __tests__/
│   │       ├── timeline-calculator.test.ts
│   │       └── nadir-detector.test.ts
│   ├── orchestrator/          # 🚧 Question selection logic
│   │   ├── question-selector.ts
│   │   ├── conditional-branching.ts
│   │   └── index.ts
│   ├── scoring/               # 🚧 NCI grading algorithm
│   │   ├── nci-grading-algorithm.ts
│   │   ├── ctcae-mapper.ts
│   │   └── index.ts
│   ├── alerting/              # 🚧 Emergency detection
│   │   ├── emergency-detector.ts
│   │   ├── triage-prioritizer.ts
│   │   └── index.ts
│   └── index.ts
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## Test Coverage

The Profiler has comprehensive unit tests with >90% coverage:

- ✅ Timeline calculation for all cycle phases
- ✅ Nadir detection and severity classification
- ✅ Edge cases (cycle boundaries, missing nadir windows)
- ✅ Date calculations across month boundaries
- ✅ Infection risk level mapping
- ✅ Patient guidance message generation

## Dependencies

- `@toxicity-analyzer/shared` - Shared TypeScript types

## Status

1. ✅ **The Profiler** - Timeline calculation and nadir detection (COMPLETE)
2. ✅ **The Orchestrator** - Question selection and conditional branching (COMPLETE)
3. ✅ **Scoring Service** - NCI composite grading algorithm (COMPLETE)
4. ✅ **Alert Engine** - Emergency detection and triage prioritization (COMPLETE)

## Phase 2 Complete!

All four intelligence layer components are fully implemented and ready for integration with the API layer.

## Contributing

When adding new components:

1. Create module directory under `src/`
2. Implement core logic with full TypeScript types
3. Write comprehensive unit tests (>80% coverage)
4. Export functions from module index
5. Update main `src/index.ts`
6. Document usage in this README

## License

Proprietary - Risa Labs Inc.
