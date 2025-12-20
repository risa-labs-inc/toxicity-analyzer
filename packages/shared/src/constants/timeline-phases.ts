/**
 * Treatment cycle phase definitions and rules
 */

import { CyclePhase } from '../types';

export interface PhaseWindow {
  start: number; // Day relative to infusion
  end: number;
  description: string;
}

export const PHASE_WINDOWS: Record<CyclePhase, PhaseWindow> = {
  pre_session: {
    start: -2,
    end: 0,
    description: 'Pre-infusion assessment for fitness clearance'
  },
  post_session: {
    start: 1,
    end: 3,
    description: 'Acute toxicity monitoring immediately after infusion'
  },
  recovery: {
    start: 4,
    end: 6,
    description: 'Peak toxicity assessment period'
  },
  nadir: {
    start: 7,
    end: 12,
    description: 'Nadir window - lowest blood cell counts (regimen-specific)'
  },
  inter_cycle: {
    start: 13,
    end: 21,
    description: 'Inter-cycle period between active treatment phases'
  }
};

// Symptoms to prioritize by phase
// Categories must match symptom_category values in proctcae_items table:
// constitutional, dermatological, neurological, gastrointestinal, hematological,
// infection_signs, musculoskeletal, oral, pain, cardiac, pulmonary
export const PHASE_SYMPTOM_PRIORITIES: Record<CyclePhase, string[]> = {
  pre_session: [
    'constitutional',     // fatigue, decreased appetite
    'pain',               // general pain assessment
    'neurological',       // peripheral neuropathy
    'cardiac'             // cardiotoxicity signs
  ],
  post_session: [
    'gastrointestinal',   // nausea, vomiting, diarrhea
    'pain',               // acute pain from infusion
    'constitutional'      // acute fatigue
  ],
  recovery: [
    'gastrointestinal',   // GI distress
    'constitutional',     // fatigue
    'pain',               // general pain
    'oral',               // mucositis, mouth sores
    'neurological'        // neuropathy
  ],
  nadir: [
    'infection_signs',    // fever, chills
    'hematological',      // bleeding, bruising, nosebleeds
    'constitutional',     // fatigue from low blood counts
    'musculoskeletal'     // aching muscles/joints
  ],
  inter_cycle: [
    'constitutional',     // cumulative fatigue
    'neurological',       // neuropathy
    'dermatological',     // hand-foot syndrome, skin changes, rash
    'pain',               // persistent pain
    'gastrointestinal'    // lingering GI issues
  ]
};

// Questionnaire type mapping to phase
export const PHASE_TO_QUESTIONNAIRE_TYPE: Record<CyclePhase, string> = {
  pre_session: 'pre_session',
  post_session: 'post_session',
  recovery: 'recovery',
  nadir: 'guardian',
  inter_cycle: 'on_demand'
};
