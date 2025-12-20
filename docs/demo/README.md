# Demo Documentation Suite

**Created**: December 20, 2025
**Purpose**: Comprehensive documentation for product demonstrations

---

## What's Included

This directory contains complete demo documentation for the ToxicityAnalyzer intelligent questionnaire system:

### 1. System Logic Documentation (41KB, ~35 pages)
**File**: `system-logic-documentation.md`
**Audience**: Clinical stakeholders, technical teams, business stakeholders
**Purpose**: Technical explanation of the intelligent questionnaire system

**Contents**:
- Executive Summary (problem, solution, value propositions)
- System Architecture (6-component flow)
- The Profiler (timeline & phase calculation)
- The Orchestrator (6-step personalization algorithm)
- Adaptive Questionnaire Flow (branching logic examples)
- NCI Composite Grading Algorithm (Grade 0-4 calculation)
- Alert Engine (RED/YELLOW/GREEN alerts, triage prioritization)
- Complete End-to-End Example (P015 patient journey)

**Use for**:
- Explaining how the system works technically
- Demonstrating clinical validity (NCI standards)
- Showing value proposition (60-70% burden reduction)
- Walking through patient journey from questionnaire to clinician action

---

### 2. Patient Portfolio Guide (50KB, ~40 pages)
**File**: `patient-portfolio-guide.md`
**Audience**: Demo presenters (internal reference)
**Purpose**: Detailed profiles of all 17 demo patients

**Contents**:
- Overview (patient distribution by regimen, phase, grade)
- AC-T Regimen (4 patients: P001, P002, P003, P016)
- TC Regimen (4 patients: P004, P005, P006, P017)
- T-DM1 Regimen (3 patients: P007, P008, P009)
- Capecitabine Regimen (3 patients: P010, P011, P012)
- Pembrolizumab Regimen (3 patients: P013, P014, P015)
- 6 Demo Scenario Recommendations
- Quick Reference Patient Lookup Table

**Each patient includes**:
- Demographics (age, BMI, comorbidities, ECOG)
- Treatment details (regimen, cycle, drugs, dates, treatment day, phase)
- Symptom history (grade, trend)
- Clinical context
- Demo value explanation (what this patient demonstrates)
- Demo scenario suggestions (when/how to use in presentation)

**Use for**:
- Quick patient lookup during demo
- Understanding what each patient demonstrates
- Selecting patients for specific demo scenarios
- Explaining clinical context and decision-making

---

## Quick Start Guide

### For a 30-Minute Demo
**Recommended approach**: Complete patient journey walkthrough

1. **Use P015** (Pembrolizumab, Grade 3→4 fatigue irAE)
2. Start with System Logic Documentation Section 8 (End-to-End Example)
3. Walk through all 7 components:
   - Patient Profile → Profiler → Orchestrator → Questionnaire → Grading → Alert Engine → Clinician Queue
4. Show Patient Portfolio Guide P015 profile for clinical context
5. Discuss clinician workflow and patient outcome

**Time allocation**:
- Introduction (5 min): Executive summary, problem/solution
- Patient journey (20 min): Walk through all 7 system components
- Q&A (5 min): Address questions

---

### For a 60-Minute Demo
**Recommended approach**: Multiple patient scenarios

1. **Complete Journey** (20 min): Use P015 (as above)
2. **Phase Comparison** (10 min): Use P001 (post-session), P002 (nadir), P016 (pre-session)
3. **Regimen Comparison** (10 min): Use P001 (AC-T), P004 (TC), P008 (T-DM1), P012 (Capecitabine), P015 (Pembrolizumab)
4. **Grade-Based Triage** (10 min): Use P015 (RED), P012 (YELLOW), P016 (GREEN)
5. **Comorbidity Context** (5 min): Use P014 (COPD + pneumonitis risk)
6. **Q&A** (5 min)

---

### For a Technical Deep Dive (90+ minutes)
**Recommended approach**: System component focus

1. Use System Logic Documentation as primary reference
2. Deep dive into each component:
   - Section 3: The Profiler (10 min)
   - Section 4: The Orchestrator (20 min) - all 6 steps
   - Section 5: Adaptive Questionnaire (10 min)
   - Section 6: NCI Grading (10 min)
   - Section 7: Alert Engine (15 min)
3. Use Patient Portfolio examples for each component
4. Q&A throughout

---

## Key Demo Patients (Primary Use Cases)

### P015 - Pembrolizumab Grade 3→4 Fatigue irAE
**PRIMARY DEMO CASE**
- Complete patient journey documented in System Logic Documentation Section 8
- Shows RED alert generation, triage priority scoring, clinician workflow
- Demonstrates endocrine irAE (adrenal insufficiency) detection and management
- Priority Score 115 → Rank 1 in clinician queue

### P016 - AC-T Pre-Session Clearance
**KEY PATIENT - Pre-Session Phase**
- Demonstrates pre-infusion baseline assessment
- Shows improving symptom de-prioritization
- GREEN alert: "Patient cleared for next infusion"

### P017 - TC Pre-Session with History
**KEY PATIENT - Pre-Session Phase**
- Pre-session assessment for established patient
- Shows recovery monitoring (multiple symptoms resolved)

### P003 - AC-T Grade 2 Neuropathy
**ENHANCED PATIENT - Dose-Limiting Toxicity**
- Grade 2 moderate neuropathy with worsening trend
- YELLOW alert requiring dose reduction decision

### P012 - Capecitabine Grade 2 HFS
**ENHANCED PATIENT - Dose-Limiting Toxicity**
- Classic Hand-Foot Syndrome requiring dose reduction
- Multiple symptoms (HFS + diarrhea) cumulative burden

### P008 - T-DM1 Thrombocytopenia Risk
**CRITICAL PATIENT - Regimen-Specific Nadir**
- Demonstrates platelet nadir (not neutrophil)
- Bleeding symptom (epistaxis) in nadir window

### P014 - Pembrolizumab with COPD
**CRITICAL PATIENT - Comorbidity Escalation**
- Grade 1 cough escalated to YELLOW due to pneumonitis risk
- Shows context-aware escalation

### P006 - TC No Symptoms
**SHORTEST QUESTIONNAIRE**
- Demonstrates maximum adaptive burden reduction
- First-cycle patient with no symptoms = 15-18 questions (vs. 80+)

---

## Patient Distribution Summary

### By Treatment Regimen
- **AC-T**: 4 patients (P001, P002, P003, P016)
- **TC**: 4 patients (P004, P005, P006, P017)
- **T-DM1**: 3 patients (P007, P008, P009)
- **Capecitabine**: 3 patients (P010, P011, P012)
- **Pembrolizumab**: 3 patients (P013, P014, P015)

### By Treatment Phase
- **Pre-Session** (2): P016, P017 ← Approaching next infusion
- **Post-Session** (2): P001, P013 ← Days 1-3 acute toxicity
- **Recovery** (4): P004, P006, P007, P010 ← Days 4-6 subacute
- **Nadir** (4): P002, P005, P008, P011 ← Days 7-12 critical monitoring
- **Inter-Cycle** (5): P003, P009, P012, P014, P015 ← Mid-cycle

### By Symptom Grade
- **Grade 3-4**: 1 patient (P015) → RED alert
- **Grade 2**: 3 patients (P003, P004, P012) → YELLOW alert
- **Grade 1**: 11 patients → GREEN alert
- **Grade 0**: 2 patients (P006, P009) → GREEN alert

---

## Demo Scenario Recommendations

All demo scenarios are fully documented in Patient Portfolio Guide pages 42-44. Key scenarios:

1. **Complete Patient Journey** - P015 (30-60 min)
2. **Phase-Specific Monitoring** - P001, P002, P016 (15 min)
3. **Regimen-Specific Toxicity** - P001, P004, P008, P012, P015 (15 min)
4. **Grade-Based Triage** - P015, P012, P003, P016 (10 min)
5. **Comorbidity-Aware Monitoring** - P014, P005, P002, P012 (10 min)
6. **Adaptive Burden Reduction** - P006, P016, P012, P015 (10 min)

---

## Quick Reference: Patient Lookup

| ID | Regimen | Cycle | Day | Phase | Key Symptom | Grade | Demo Purpose |
|----|---------|-------|-----|-------|-------------|-------|--------------|
| **P015** | Pembro | 2 | 20 | Inter | Fatigue | 3↑ | **Grade 3-4 irAE (PRIMARY)** |
| **P016** | AC-T | 1 | 45 | **Pre** | Nausea | 1↓ | **Pre-session clearance** |
| **P017** | TC | 2 | 45 | **Pre** | Myalgia | 1 | **Pre-session with history** |
| **P003** | AC-T | 5 | 26 | Inter | Neuropathy | 2↑ | Grade 2 dose-limiting |
| **P012** | Cape | 3 | 19 | Inter | HFS | 2↑ | **Grade 2 HFS dose-limiting** |
| **P008** | T-DM1 | 3 | 10 | Nadir | Epistaxis | 1↑ | **Thrombocytopenia risk** |
| **P014** | Pembro | 5 | 15 | Inter | Cough | 1↑ | **COPD pneumonitis risk** |
| **P006** | TC | 1 | 6 | Recovery | None | 0 | Minimal symptoms (shortest) |

**Legend**: ↑ Worsening, ↓ Improving

---

## Tips for Effective Demos

### Preparation
1. Review System Logic Documentation Section 8 (P015 end-to-end example)
2. Familiarize with patient profiles for your selected scenario
3. Use Quick Reference table for patient lookup during demo
4. Have both documents open (System Logic for technical explanation, Patient Portfolio for clinical context)

### During Demo
1. Start with Executive Summary (System Logic Doc, Section 1) - establish value proposition
2. Use visual system architecture diagram (Section 2) to orient audience
3. Select patients based on audience interest (technical → P015 deep dive, clinical → regimen comparison)
4. Reference specific line numbers when showing code/logic (e.g., "The Profiler calculates treatment day using this formula...")
5. Show patient clinical context from Portfolio before diving into system logic

### Common Questions to Prepare For
1. **"How do you maintain clinical validity with fewer questions?"**
   - Answer: NCI PRO-CTCAE composite grading standard (Section 6)
   - Reference: All regimen-relevant symptoms still assessed, branching only skips follow-ups when not needed

2. **"What if a patient has a symptom you didn't ask about?"**
   - Answer: Regimen-specific toxicity profiles cover all high-risk symptoms for that chemotherapy
   - Reference: Section 4, Step 1 - regimen filtering based on literature/guidelines

3. **"How do you determine alert levels?"**
   - Answer: Grade-based thresholds + context escalation (Section 7)
   - Reference: RED (Grade 4 or Grade 3 critical), YELLOW (Grade 3 non-emergency or Grade 2 worsening), GREEN (Grade 1-2 stable)

4. **"Can patients report symptoms you didn't ask about?"**
   - Future feature: Free-text "other symptoms" field at end of questionnaire
   - Current: Comprehensive regimen coverage minimizes missed symptoms

---

## Document Maintenance

### Version History
- **v1.0** (2025-12-20): Initial creation
  - System Logic Documentation (35 pages, 8 sections)
  - Patient Portfolio Guide (40 pages, 17 patients)
  - README (this file)

### Future Enhancements
- Quick Reference Card (1-2 page PDF with diagrams)
- Demo Script (30-min and 60-min versions with talking points)
- Visual diagrams (system architecture, algorithm flowcharts)
- Patient lookup tables (printable reference sheets)

---

## Contact & Questions

For questions about these demo materials, contact:
- **Technical Questions**: [Dev Team]
- **Clinical Questions**: [Clinical Team]
- **Demo Requests**: [Product Team]

---

**Files in this directory**:
- `system-logic-documentation.md` (41KB, technical documentation)
- `patient-portfolio-guide.md` (50KB, patient profiles)
- `README.md` (this file, navigation guide)

**Last Updated**: December 20, 2025
