/**
 * Regimen constants and configuration
 */

export const REGIMEN_CODES = {
  AC_T: 'AC-T',
  TC: 'TC',
  T_DM1: 'T-DM1',
  CAPECITABINE: 'Capecitabine',
  PEMBROLIZUMAB: 'Pembrolizumab'
} as const;

export const REGIMEN_NAMES = {
  [REGIMEN_CODES.AC_T]: 'Doxorubicin + Cyclophosphamide → Taxane',
  [REGIMEN_CODES.TC]: 'Docetaxel + Cyclophosphamide',
  [REGIMEN_CODES.T_DM1]: 'Trastuzumab Emtansine',
  [REGIMEN_CODES.CAPECITABINE]: 'Capecitabine',
  [REGIMEN_CODES.PEMBROLIZUMAB]: 'Pembrolizumab'
} as const;

// Standard cycle lengths for each regimen
export const CYCLE_LENGTHS = {
  [REGIMEN_CODES.AC_T]: 21,           // 21-day cycles
  [REGIMEN_CODES.TC]: 21,             // 21-day cycles
  [REGIMEN_CODES.T_DM1]: 21,          // 21-day cycles
  [REGIMEN_CODES.CAPECITABINE]: 21,   // 21-day cycles (14 days on, 7 days off)
  [REGIMEN_CODES.PEMBROLIZUMAB]: 21   // 21-day cycles
} as const;

// Nadir windows (when neutrophil count is lowest)
export const NADIR_WINDOWS = {
  [REGIMEN_CODES.AC_T]: { start: 7, end: 12 },
  [REGIMEN_CODES.TC]: { start: 7, end: 12 },
  [REGIMEN_CODES.T_DM1]: { start: 7, end: 14 },
  [REGIMEN_CODES.CAPECITABINE]: { start: 10, end: 14 },
  [REGIMEN_CODES.PEMBROLIZUMAB]: { start: 0, end: 0 } // No significant nadir
} as const;
