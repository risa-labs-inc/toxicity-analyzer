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
export const PHASE_SYMPTOM_PRIORITIES: Record<CyclePhase, string[]> = {
  pre_session: [
    'fatigue',
    'pain',
    'function',
    'peripheral_neuropathy',
    'cardiotoxicity_signs'
  ],
  post_session: [
    'nausea',
    'vomiting',
    'diarrhea',
    'acute_infusion_reaction',
    'injection_site_reaction'
  ],
  recovery: [
    'fatigue',
    'gastrointestinal',
    'pain',
    'mucositis',
    'neuropathy'
  ],
  nadir: [
    'infection_signs',
    'fever',
    'bleeding',
    'bruising',
    'neutropenia_symptoms'
  ],
  inter_cycle: [
    'cumulative_toxicities',
    'fatigue',
    'neuropathy',
    'hand_foot_syndrome',
    'skin_changes'
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
