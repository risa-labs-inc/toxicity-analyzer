# Demo Patient Portfolio - Comprehensive Guide

**Version**: 1.0
**Last Updated**: December 20, 2025
**Purpose**: Internal reference for demo presentations
**Total Patients**: 17 across 5 regimens

---

## Overview

This guide documents all 17 demo patients in the ToxicityAnalyzer system, organized by treatment regimen. Each patient profile includes demographics, treatment details, symptom history, and specific demo value explanation.

### Patient Distribution by Regimen

| Regimen | Patient Count | Patient IDs |
|---------|---------------|-------------|
| **AC-T** (Doxorubicin + Cyclophosphamide → Paclitaxel) | 4 | P001, P002, P003, P016 |
| **TC** (Docetaxel + Cyclophosphamide) | 4 | P004, P005, P006, P017 |
| **T-DM1** (Trastuzumab Emtansine) | 3 | P007, P008, P009 |
| **Capecitabine** (Oral Chemotherapy) | 3 | P010, P011, P012 |
| **Pembrolizumab** (Immunotherapy) | 3 | P013, P014, P015 |

### Phase Distribution Summary

| Phase | Description | Patient Count | Key Demo Patients |
|-------|-------------|---------------|-------------------|
| **pre_session** | Approaching next infusion (Days ~20-21) | 2 | P016, P017 |
| **post_session** | Acute toxicity (Days 1-3) | 2 | P001, P013 |
| **recovery** | Early recovery (Days 4-6) | 4 | P004, P007, P010, P006 |
| **nadir** | Critical neutropenic window (Days 7-12) | 4 | P002, P005, P008, P011 |
| **inter_cycle** | Mid-cycle monitoring | 5 | P003, P009, P012, P014, P015 |

### Symptom Grade Distribution

| Grade | Count | Key Demo Patients | Alert Level |
|-------|-------|-------------------|-------------|
| **Grade 4** (Life-threatening) | 0 direct, 1 potential | P015 (Grade 3→4 fatigue) | RED |
| **Grade 3** (Severe) | 1 | P015 (Fatigue) | RED/YELLOW |
| **Grade 2** (Moderate) | 3 | P003, P004, P012 | YELLOW |
| **Grade 1** (Mild) | 11 | Most patients | GREEN |
| **Grade 0** (None) | 2 | P006, P009 | GREEN |

---

## AC-T Regimen (4 Patients)

**Full Regimen Name**: Doxorubicin + Cyclophosphamide (AC) followed by Paclitaxel (T)
**Indication**: Adjuvant breast cancer treatment
**Cycle Structure**: 4 cycles AC (q21 days) → 4 cycles T (q21 days or weekly)
**Total Duration**: ~20-24 weeks

### Toxicity Profile
- **High-risk categories**: Gastrointestinal, hematological, constitutional, neurological, cardiac
- **Phase-specific**:
  - **AC phase (Cycles 1-4)**: GI-dominant (nausea, vomiting), hematological, cardiac monitoring
  - **T phase (Cycles 5-8)**: Neurological (cumulative neuropathy), musculoskeletal (myalgia), hematological
- **Dose-limiting toxicities**: Neutropenia (AC), peripheral neuropathy (T), cardiomyopathy (cumulative doxorubicin)
- **Nadir**: Days 7-12

---

### P001 - Early AC Phase, Post-Session Patient

**Demographics**:
- Age: 45
- Gender: Female
- BMI: 24.2 (normal weight)
- Comorbidities: None
- ECOG Performance Status: 0 (fully active, no restrictions)

**Treatment Details**:
- Regimen: AC-T, Currently in **AC phase**
- Drugs: Doxorubicin 60mg/m² + Cyclophosphamide 600mg/m²
- Cycle: 1 of 4 (AC phase)
- Last Infusion: December 15, 2025
- Treatment Day (as of Dec 20): **Day 6** (recovery phase)
- Next Infusion: January 5, 2026

**Symptom History**:
- **Nausea**: Grade 1 (mild), stable trend
- No other significant symptoms reported

**Clinical Context**:
- First cycle of chemotherapy - establishing symptom baseline
- Classic CINV (chemotherapy-induced nausea/vomiting) presentation
- No concerning symptoms, tolerating treatment well
- AC phase typical toxicity profile (GI-dominant)

**Demo Value**:
1. **Early-cycle patient**: Demonstrates baseline symptom assessment for new chemotherapy patients
2. **Post-session/Recovery phase**: Shows how system prioritizes GI symptoms (nausea, vomiting) in Days 1-6 after AC infusion
3. **Minimal symptom burden**: Perfect example of adaptive branching efficiency - patient with few symptoms gets shortest questionnaire (~15-20 questions)
4. **AC phase toxicity**: Demonstrates GI-dominant toxicity profile (nausea) typical of anthracycline-based regimens
5. **Baseline functional status**: ECOG 0 shows patient maintaining full activity despite treatment
6. **Low-risk profile**: No comorbidities, ideal candidate for standard dosing and schedule

**Demo Scenarios**:
- Use to show how questionnaire adapts for patients with minimal symptoms (most questions skip branching)
- Demonstrate post-session phase question prioritization (GI, constitutional)
- Show GREEN alert generation for stable, mild symptoms

---

### P002 - Late T Phase, Nadir Period with Emerging Neuropathy

**Demographics**:
- Age: 58
- Gender: Female
- BMI: 28.5 (overweight)
- Comorbidities: Diabetes Type II
- ECOG Performance Status: 1 (restricted in strenuous activity, but ambulatory)

**Treatment Details**:
- Regimen: AC-T, Currently in **T phase**
- Drugs: Paclitaxel 175mg/m² q21 days
- Cycle: 6 of 8 (T phase, nearing completion)
- Last Infusion: December 7, 2025
- Treatment Day (as of Dec 20): **Day 13** (nadir→inter_cycle transition)
- Next Infusion: December 28, 2025

**Symptom History**:
- **Peripheral Neuropathy**: Grade 1 (mild), **worsening trend**
- No other significant symptoms reported

**Clinical Context**:
- Late in treatment course (Cycle 6/8) - cumulative taxane exposure
- Peripheral neuropathy emerging - classic dose-limiting toxicity of paclitaxel
- **Worsening trend** is concerning - may progress to Grade 2 (dose adjustment) or Grade 3 (treatment hold)
- Diabetes comorbidity increases neuropathy risk and severity
- ECOG 1 indicates some functional limitation

**Demo Value**:
1. **T phase toxicity differentiation**: Shows how AC→T phase transition changes symptom priorities (GI → neurological)
2. **Cumulative toxicity**: Demonstrates taxane-associated neuropathy emerging after multiple cycles (Cycle 6)
3. **Worsening trend escalation**: Shows how system assigns higher priority (+1 point) to worsening symptoms even at Grade 1
4. **Comorbidity impact**: Diabetes increases neuropathy risk - demonstrates need for closer monitoring
5. **Nadir phase monitoring**: Day 13 is tail end of nadir window - system prioritizes hematological + infection questions
6. **Dose-limiting toxicity watch**: Grade 1 worsening neuropathy may become Grade 2→3, triggering dose reduction
7. **ECOG functional decline**: ECOG 0→1 shows treatment impacting daily activities

**Demo Scenarios**:
- Use to demonstrate historical escalation algorithm (worsening trend increases priority)
- Show nadir phase question selection (hematological, fever, infection signs prioritized)
- Demonstrate YELLOW alert potential if neuropathy progresses to Grade 2
- Highlight comorbidity-aware monitoring (diabetes + neuropathy = higher risk)

---

### P003 - T Phase with Grade 2 Dose-Limiting Neuropathy

**Demographics**:
- Age: 65
- Gender: Female
- BMI: 22.0 (normal weight, lower end)
- Comorbidities: Hypertension
- ECOG Performance Status: 1 (restricted in strenuous activity)

**Treatment Details**:
- Regimen: AC-T, Currently in **T phase**
- Drugs: Paclitaxel 175mg/m² q21 days
- Cycle: 5 of 8 (T phase, mid-treatment)
- Last Infusion: November 24, 2025
- Treatment Day (as of Dec 20): **Day 26** (inter_cycle, late cycle)
- Next Infusion: December 15, 2025 (actually past due - may be on treatment delay due to toxicity)

**Symptom History**:
- **Peripheral Neuropathy**: **Grade 2 (moderate), worsening trend** ← DOSE-LIMITING TOXICITY
- **Fatigue**: Grade 1 (mild), stable trend

**Clinical Context**:
- **ENHANCED PATIENT** - Selected specifically to demonstrate Grade 2 toxicity management
- Grade 2 neuropathy is **dose-limiting** for taxanes - typically triggers dose reduction (20% reduction common)
- **Worsening trend** at Grade 2 is urgent - risk of progression to Grade 3 (treatment hold/discontinuation)
- Multiple symptoms (neuropathy + fatigue) = cumulative toxicity burden
- Treatment day 26 suggests possible treatment delay due to toxicity management
- Older patient (65) may have reduced tolerance for cumulative taxane toxicity

**Demo Value**:
1. **ENHANCED PATIENT**: Specifically designed to show Grade 2 dose-limiting toxicity requiring intervention
2. **Severity-based escalation**: Demonstrates how Grade ≥2 history gets high priority (+2 points)
3. **Worsening trend + Grade 2**: Combination triggers **YELLOW alert** (urgent review within 24hr)
4. **Dose modification scenario**: Perfect case to discuss dose reduction decision-making
5. **Multiple symptoms**: Shows cumulative toxicity burden calculation (Grade 2 + Grade 1 = 8 + 3 = 11 points)
6. **AC→T phase differentiation**: Compare with AC phase patients (P001) - different toxicity profile (neurological vs. GI)
7. **Treatment delay implications**: Day 26 (past typical Day 21 next infusion) suggests active toxicity management
8. **Age-related considerations**: 65-year-old patient may have different tolerance than younger patients

**Demo Scenarios**:
- **PRIMARY USE**: Demonstrate YELLOW alert generation for Grade 2 + worsening toxicity
- Show clinician decision support: "Consider paclitaxel dose reduction to 140mg/m² (20% reduction)"
- Demonstrate cumulative symptom burden calculation across multiple toxicities
- Highlight when stable Grade 1 fatigue becomes concerning in context of Grade 2 neuropathy
- Use for discussing dose modification vs. treatment discontinuation decisions

---

### P016 - Pre-Session Patient (KEY PATIENT - NEW)

**Demographics**:
- Age: 53
- Gender: Female
- BMI: 25.6 (normal weight)
- Comorbidities: None
- ECOG Performance Status: 0 (fully active)

**Treatment Details**:
- Regimen: AC-T, Currently in **AC phase**
- Drugs: Doxorubicin 60mg/m² + Cyclophosphamide 600mg/m²
- Cycle: 1 of 4 (AC phase, first cycle)
- Last Infusion: November 5, 2025
- **Next Infusion**: **December 26, 2025** (6 days away)
- Treatment Day (as of Dec 20): **Day 45** (approaching next cycle)

**Symptom History**:
- **Nausea**: Grade 1 (mild), **improving trend**
- No other significant symptoms

**Clinical Context**:
- **KEY PATIENT**: Added specifically to fill **pre_session phase** gap in original dataset
- First cycle of AC-T - patient recovered well from initial treatment
- Nausea improving (likely resolved by now, 45 days post-infusion)
- Pre-session assessment = clearance check before Cycle 2
- Next infusion in 6 days - within pre_session window (Days -6 to 0 before next infusion)
- No concerning symptoms - patient likely cleared for next treatment

**Demo Value**:
1. **KEY PATIENT**: Fills critical pre_session phase representation gap
2. **Pre-session phase logic**: Demonstrates pre-infusion clearance assessment workflow
3. **Phase-specific priorities**: Shows how pre_session prioritizes:
   - Constitutional symptoms (fatigue - functional status check)
   - Pain (baseline pain level)
   - Neurological (neuropathy - safe for taxanes in T phase later)
   - Cardiac (doxorubicin cumulative monitoring)
4. **Improving trend = low priority**: Demonstrates how improving symptoms get lower priority scores (-0.5 points)
5. **Baseline clearance**: Perfect example of "patient cleared for next infusion" GREEN alert
6. **Treatment continuity**: Shows system supporting on-time treatment delivery (no delays due to toxicity)
7. **First-cycle tolerance prediction**: Good Cycle 1 tolerance predicts good overall tolerance

**Demo Scenarios**:
- **PRIMARY USE**: Demonstrate pre_session phase question selection and clearance workflow
- Show GREEN alert: "Patient cleared for next infusion (scheduled 2025-12-26)"
- Demonstrate improving trend de-prioritization (nausea improving = low priority)
- Use to explain clinical significance of pre-infusion assessment (safety check before proceeding)
- Highlight difference in question priorities: pre_session (baseline check) vs. post_session (acute toxicity) vs. nadir (emergency monitoring)

---

## TC Regimen (4 Patients)

**Full Regimen Name**: Docetaxel + Cyclophosphamide
**Indication**: Adjuvant breast cancer treatment (alternative to AC-T for lower cardiac risk patients)
**Cycle Structure**: 6 cycles, q21 days
**Total Duration**: ~18 weeks

### Toxicity Profile
- **High-risk categories**: Hematological (neutropenia), musculoskeletal (myalgia/arthralgia), neurological (neuropathy), dermatological (alopecia, nail changes)
- **Key toxicity**: Docetaxel-associated **myalgia** (muscle pain) - very common, typically Days 2-5 post-infusion
- **Dose-limiting toxicities**: Neutropenia (most common), peripheral neuropathy (cumulative)
- **Nadir**: Days 7-12
- **Advantages over AC-T**: Lower cardiac risk (no anthracycline), fewer cycles (6 vs. 8)

---

### P004 - Early Cycle, Recovery Phase with Grade 2 Myalgia

**Demographics**:
- Age: 52
- Gender: Female
- BMI: 26.1 (overweight)
- Comorbidities: None
- ECOG Performance Status: 1 (restricted in strenuous activity)

**Treatment Details**:
- Regimen: TC
- Drugs: Docetaxel 75mg/m² + Cyclophosphamide 600mg/m²
- Cycle: 2 of 6 (early treatment)
- Last Infusion: December 16, 2025
- Treatment Day (as of Dec 20): **Day 4** (recovery phase)
- Next Infusion: January 6, 2026

**Symptom History**:
- **Myalgia**: **Grade 2 (moderate), worsening trend**
- No other significant symptoms reported

**Clinical Context**:
- Day 4 is peak timing for docetaxel-associated myalgia (typically Days 2-5)
- Grade 2 myalgia is common with docetaxel, but worsening trend is concerning
- ECOG 1 suggests functional limitation (likely due to muscle pain limiting activity)
- Second cycle - myalgia may be cumulative (worse than Cycle 1)
- Recovery phase is appropriate time to capture musculoskeletal symptoms

**Demo Value**:
1. **Docetaxel-specific toxicity**: Classic presentation of taxane-associated myalgia/arthralgia
2. **Recovery phase prioritization**: Shows how Days 4-6 prioritize musculoskeletal and pain symptoms
3. **Grade 2 + worsening**: Demonstrates **YELLOW alert** potential (urgent review, possible intervention)
4. **Timing validation**: Day 4 is textbook timing for myalgia emergence post-docetaxel
5. **Regimen-specific toxicity profile**: Compare TC (musculoskeletal-dominant) vs. AC-T (GI/neuro-dominant)
6. **Functional impact**: ECOG 1 shows symptom limiting activity (not just discomfort)
7. **Supportive care opportunity**: Grade 2 myalgia benefits from NSAIDs, muscle relaxants, activity modification

**Demo Scenarios**:
- Use to demonstrate regimen-specific toxicity profiles (TC = myalgia, AC-T = nausea/neuropathy)
- Show recovery phase question prioritization (musculoskeletal, pain, constitutional)
- Demonstrate YELLOW alert generation for Grade 2 + worsening symptom
- Highlight supportive care recommendations: "Consider NSAIDs, gabapentin for myalgia management"
- Show how timing of assessment captures phase-specific toxicities

---

### P005 - Mid-Treatment, Nadir with Cardiac Comorbidity

**Demographics**:
- Age: 70
- Gender: Female
- BMI: 23.5 (normal weight)
- Comorbidities: **Heart Disease**
- ECOG Performance Status: 2 (ambulatory >50% waking hours, capable of self-care, but cannot work)

**Treatment Details**:
- Regimen: TC (selected over AC-T specifically to avoid anthracycline cardiac toxicity)
- Drugs: Docetaxel 75mg/m² + Cyclophosphamide 600mg/m²
- Cycle: 4 of 6 (mid-treatment)
- Last Infusion: December 5, 2025
- Treatment Day (as of Dec 20): **Day 15** (inter_cycle, post-nadir)
- Next Infusion: December 26, 2025

**Symptom History**:
- **Edema**: Grade 1 (mild), stable trend
- No other significant symptoms reported

**Clinical Context**:
- **Older patient** (70 years) - geriatric oncology considerations
- **Heart disease comorbidity** - likely why TC was chosen over AC-T (avoid doxorubicin cardiotoxicity)
- **ECOG 2** - Reduced baseline functional status (cannot work, but self-care capable)
- Edema monitoring crucial with heart disease (CHF exacerbation risk vs. docetaxel fluid retention)
- Day 15 is post-nadir - patient through highest-risk neutropenic window
- Mid-treatment (Cycle 4/6) - cumulative fatigue common in older patients

**Demo Value**:
1. **Geriatric oncology**: Demonstrates older patient (70) with reduced baseline functional status
2. **Comorbidity-aware regimen selection**: Shows why TC chosen over AC-T (avoid cardiac toxicity)
3. **Comorbidity-aware symptom prioritization**: Edema in heart disease patient requires closer monitoring
4. **ECOG 2 baseline**: Shows system accommodates patients with lower baseline functional status
5. **Stable symptom management**: Grade 1 edema stable suggests well-managed heart disease + docetaxel side effects
6. **Mid-treatment accumulation**: Cycle 4/6 demonstrates cumulative fatigue typical in older patients
7. **Post-nadir monitoring**: Day 15 shows transition from critical nadir monitoring to routine inter_cycle

**Demo Scenarios**:
- Use to demonstrate comorbidity-aware monitoring (heart disease + edema = elevated priority)
- Show how ECOG 2 baseline affects functional status interpretation
- Highlight regimen selection rationale (TC safer cardiac profile than AC-T for this patient)
- Demonstrate GREEN alert with special note: "Monitor edema closely given cardiac history"
- Use for discussing geriatric oncology considerations (age 70, ECOG 2, comorbidities)

---

### P006 - New Patient, Minimal Symptoms (Shortest Questionnaire)

**Demographics**:
- Age: 48
- Gender: Female
- BMI: 30.2 (obese)
- Comorbidities: None
- ECOG Performance Status: 0 (fully active)

**Treatment Details**:
- Regimen: TC
- Drugs: Docetaxel 75mg/m² + Cyclophosphamide 600mg/m²
- Cycle: 1 of 6 (first cycle)
- Last Infusion: December 14, 2025
- Treatment Day (as of Dec 20): **Day 6** (recovery phase)
- Next Infusion: January 4, 2026

**Symptom History**:
- **No symptoms reported yet** (first cycle, no baseline symptom history)

**Clinical Context**:
- First cycle of chemotherapy - no established symptom pattern yet
- No symptoms reported - patient tolerating treatment very well
- Higher BMI (30.2 = Class I obesity) - dosing considerations (body surface area-based)
- Recovery phase (Day 6) - typical timing for early toxicity emergence
- ECOG 0 - maintaining full activity despite first chemotherapy cycle

**Demo Value**:
1. **SHORTEST QUESTIONNAIRE**: Perfect example of maximum adaptive branching efficiency
2. **First-cycle baseline**: Shows how system establishes baseline symptom profile for future comparison
3. **Minimal symptom burden**: Patient with no symptoms gets ~12-18 questions (vs. 80+ traditional)
4. **Recovery phase question set**: All regimen-relevant symptoms asked, but most skip follow-ups
5. **Adaptive branching showcase**: Most frequency questions answered "0 - Not at all" → skip severity & interference
6. **Baseline functional status**: ECOG 0 despite chemotherapy shows good tolerance
7. **Obesity consideration**: BMI 30.2 - relevant for dose calculations and comorbidity risk

**Demo Scenarios**:
- **PRIMARY USE**: Demonstrate maximum burden reduction (asymptomatic patient gets shortest questionnaire)
- Show adaptive branching efficiency: 60+ potential questions → 15-18 actual questions (73-78% reduction)
- Use to explain baseline assessment value (future cycles will compare to this baseline)
- Demonstrate GREEN alert: "Routine monitoring - first cycle well-tolerated, no symptoms"
- Highlight how system still ensures comprehensive assessment (all regimen-relevant categories checked)

---

### P017 - Pre-Session Patient (KEY PATIENT - NEW)

**Demographics**:
- Age: 57
- Gender: Female
- BMI: 28.3 (overweight)
- Comorbidities: Hypertension
- ECOG Performance Status: 1 (restricted in strenuous activity)

**Treatment Details**:
- Regimen: TC
- Drugs: Docetaxel 75mg/m² + Cyclophosphamide 600mg/m²
- Cycle: 2 of 6 (early treatment)
- Last Infusion: November 5, 2025
- **Next Infusion**: **December 26, 2025** (6 days away)
- Treatment Day (as of Dec 20): **Day 45** (approaching next cycle, pre_session)

**Symptom History**:
- **Myalgia**: Grade 1 (mild), stable trend
- **Fatigue**: Grade 1 (mild), **improving trend**

**Clinical Context**:
- **KEY PATIENT**: Second pre_session phase example (along with P016)
- Cycle 2 patient with established treatment history (not first cycle like P016)
- Multiple mild symptoms from previous cycle (myalgia + fatigue) - both resolving
- **Improving fatigue** = positive recovery trajectory before next cycle
- Pre-session window (6 days before next infusion) - clearance assessment
- Hypertension comorbidity - monitor blood pressure stability

**Demo Value**:
1. **KEY PATIENT**: Second pre_session phase example, demonstrates with established patient (not first cycle)
2. **Pre-session clearance with history**: Shows pre-infusion assessment for patient with previous symptom history
3. **Improving trends = clearance**: Both symptoms stable/improving → safe to proceed with next cycle
4. **Established vs. new patient comparison**: Compare with P016 (first cycle) to show how history affects assessment
5. **Multiple symptoms resolved**: Demonstrates recovery monitoring (myalgia + fatigue from previous cycle resolved)
6. **Comorbidity monitoring**: Hypertension requires BP check before next infusion (part of pre-session clearance)
7. **ECOG 1 stable**: Functional status maintained despite treatment

**Demo Scenarios**:
- Use to demonstrate pre_session phase assessment for established patient with symptom history
- Show GREEN alert: "Patient cleared for next infusion - symptoms stable/improving"
- Compare with P016 (first cycle pre_session) to show how history affects question prioritization
- Demonstrate improving trend de-prioritization (fatigue improving = lower priority)
- Highlight complete recovery validation (myalgia + fatigue resolved since last cycle)
- Use for comorbidity clearance discussion (BP check, med review before next cycle)

---

## T-DM1 Regimen (3 Patients)

**Full Regimen Name**: Trastuzumab Emtansine (Ado-trastuzumab emtansine)
**Indication**: HER2+ metastatic breast cancer, adjuvant HER2+ breast cancer
**Cycle Structure**: q21 days, continue until progression or intolerable toxicity
**Mechanism**: Antibody-drug conjugate (trastuzumab linked to chemotherapy agent emtansine)

### Toxicity Profile
- **High-risk categories**: Hematological (**thrombocytopenia - LOW PLATELETS**, not neutropenia), hepatic (elevated LFTs), neurological (neuropathy), cardiac (left ventricular dysfunction)
- **KEY DIFFERENCE**: **Thrombocyte (platelet) nadir, NOT neutrophil nadir** - bleeding risk instead of infection risk
- **Nadir**: Days 7-14 (longer than traditional chemotherapy)
- **Dose-limiting toxicity**: Thrombocytopenia (platelets <25,000), elevated transaminases (AST/ALT >5x ULN)
- **Monitoring**: CBC with platelets, LFTs, LVEF (cardiac function) every 3-6 cycles

---

### P007 - Established Patient, Recovery Phase, Late Cycle

**Demographics**:
- Age: 55
- Gender: Female
- BMI: 25.0 (normal weight)
- Comorbidities: None
- ECOG Performance Status: 0 (fully active)

**Treatment Details**:
- Regimen: T-DM1 monotherapy
- Dose: 3.6mg/kg IV q21 days
- Cycle: 5 (established treatment, no specified total cycle count for metastatic disease)
- Last Infusion: December 16, 2025
- Treatment Day (as of Dec 20): **Day 4** (recovery phase)
- Next Infusion: January 6, 2026

**Symptom History**:
- **Fatigue**: Grade 1 (mild), stable trend
- No other significant symptoms reported

**Clinical Context**:
- Cycle 5 indicates good tolerance (continuing treatment without dose reductions or delays)
- Mild stable fatigue common with targeted therapy - less severe than traditional chemotherapy
- ECOG 0 maintained - excellent functional status despite metastatic disease and treatment
- Recovery phase (Day 4) - monitoring early antibody-related effects
- No thrombocytopenia symptoms (no bleeding, bruising) - platelets likely adequate

**Demo Value**:
1. **HER2+ targeted therapy profile**: Demonstrates different toxicity pattern from chemotherapy
2. **Late cycle tolerance**: Cycle 5 shows sustained tolerability (important for long-term metastatic treatment)
3. **Recovery phase for targeted therapy**: Shows Day 4 monitoring priorities (different from chemo)
4. **Stable low-grade symptoms**: Demonstrates chronic manageable toxicity (not cumulative worsening)
5. **ECOG 0 maintenance**: Shows quality of life preservation with targeted therapy
6. **Non-myelosuppressive regimen**: Lack of infection-related questions (not neutropenic like chemo)
7. **Long-term treatment success**: Good tolerance through multiple cycles = can continue treatment

**Demo Scenarios**:
- Use to demonstrate targeted therapy toxicity profile (less myelosuppression than chemo)
- Show how recovery phase priorities differ for T-DM1 (not GI-dominant like AC-T)
- Demonstrate GREEN alert for stable, well-managed chronic symptoms
- Highlight ECOG 0 maintenance as key quality of life metric in metastatic setting
- Compare with chemotherapy patients (AC-T, TC) to show less severe toxicity profile

---

### P008 - Mid-Treatment, Nadir with Thrombocytopenia Risk (CRITICAL PATIENT)

**Demographics**:
- Age: 62
- Gender: Female
- BMI: 27.4 (overweight)
- Comorbidities: Hypertension
- ECOG Performance Status: 1 (restricted in strenuous activity)

**Treatment Details**:
- Regimen: T-DM1 monotherapy
- Dose: 3.6mg/kg IV q21 days
- Cycle: 3 of unspecified total
- Last Infusion: December 10, 2025
- Treatment Day (as of Dec 20): **Day 10** (NADIR WINDOW for T-DM1)
- Next Infusion: December 31, 2025

**Symptom History**:
- **Epistaxis (nosebleed)**: Grade 1 (mild), **worsening trend**
- No other significant symptoms reported

**Clinical Context**:
- **CRITICAL PATIENT**: Day 10 is within T-DM1 nadir window (Days 7-14) for **thrombocytopenia**
- **Epistaxis (nosebleed)** is a **bleeding symptom** - direct manifestation of low platelets
- **Worsening trend** even at Grade 1 is concerning - may indicate dropping platelet count
- T-DM1 causes **thrombocytopenia** (low platelets), NOT neutropenia (low WBC)
- Bleeding risk, not infection risk - different monitoring priorities than traditional chemo
- Requires urgent CBC with platelets to quantify thrombocytopenia severity

**Demo Value**:
1. **CRITICAL PATIENT**: Demonstrates T-DM1-specific **thrombocytopenia nadir**, not neutropenia
2. **Regimen-specific nadir focus**: Shows platelet monitoring vs. neutrophil monitoring (AC-T, TC)
3. **Bleeding symptom escalation**: Epistaxis (nosebleed) as indicator of thrombocytopenia
4. **Worsening trend = urgent**: Grade 1 worsening bleeding symptom triggers **YELLOW alert** (check platelets within 24hr)
5. **Context-aware escalation**: Same Grade 1 epistaxis would be routine in other contexts, but urgent in T-DM1 nadir
6. **Nadir window timing**: Day 10 is peak nadir for T-DM1 (Days 7-14)
7. **Different emergency criteria**: Fever NOT a nadir emergency (not neutropenic), bleeding IS an emergency

**Demo Scenarios**:
- **PRIMARY USE**: Demonstrate T-DM1 thrombocytopenia nadir vs. traditional chemotherapy neutropenia nadir
- Show YELLOW alert: "Urgent - Check CBC with platelets within 24hr. Grade 1 bleeding in T-DM1 nadir suggests thrombocytopenia."
- Highlight nadir phase question differences: T-DM1 asks bleeding questions, not infection questions
- Use for regimen-specific toxicity education (platelets vs. neutrophils)
- Demonstrate context-aware escalation (Grade 1 epistaxis → urgent in this specific context)
- Show clinician action recommendation: "If platelets <50,000, consider dose reduction; if <25,000, hold dose"

---

### P009 - Long-Term Treatment, Inter-Cycle, No Symptoms

**Demographics**:
- Age: 41
- Gender: Female
- BMI: 22.8 (normal weight)
- Comorbidities: None
- ECOG Performance Status: 0 (fully active)

**Treatment Details**:
- Regimen: T-DM1 monotherapy
- Dose: 3.6mg/kg IV q21 days
- Cycle: 8 (late-stage treatment)
- Last Infusion: December 1, 2025
- Treatment Day (as of Dec 20): **Day 19** (inter_cycle, late cycle)
- Next Infusion: December 22, 2025 (2 days away)

**Symptom History**:
- **No symptoms reported** (excellent tolerance through 8 cycles)

**Clinical Context**:
- **Cycle 8** indicates long-term stable disease control on T-DM1
- No toxicities reported - exceptional tolerance for this duration of treatment
- ECOG 0 maintained - quality of life preserved despite metastatic disease and treatment
- Day 19 approaching next infusion (Day 21) - will transition to pre_session soon
- Young patient (41) with no comorbidities - ideal candidate for targeted therapy

**Demo Value**:
1. **Long-term treatment success**: Cycle 8 demonstrates sustained disease control + excellent tolerance
2. **No symptoms = minimal burden**: Another shortest questionnaire example (alongside P006)
3. **Inter_cycle monitoring**: Shows routine cumulative toxicity assessment in late treatment
4. **Quality of life maintenance**: ECOG 0 through 8 cycles = treatment not impacting function
5. **Targeted therapy advantage**: Less cumulative toxicity than chemotherapy (compare with P003 AC-T Cycle 5 with Grade 2 neuropathy)
6. **Metastatic disease context**: Long-term tolerability enables continued disease control
7. **Younger patient**: Age 41 shows targeted therapy suitable across age ranges

**Demo Scenarios**:
- Use to demonstrate long-term targeted therapy success (8 cycles well-tolerated)
- Show GREEN alert: "Routine monitoring - continued excellent tolerance, no action needed"
- Demonstrate shortest questionnaire for asymptomatic patient (adaptive efficiency)
- Compare with chemotherapy late-cycle patients (P002, P003) to show cumulative toxicity differences
- Highlight quality of life preservation (ECOG 0 through 8 cycles)
- Use for metastatic disease treatment goal discussion (prolonged disease control + preserved QOL)

---

## Capecitabine Regimen (3 Patients)

**Full Regimen Name**: Capecitabine (Xeloda)
**Indication**: Metastatic breast cancer, adjuvant colon cancer, other solid tumors
**Cycle Structure**: 14 days on (BID dosing), 7 days off, q21 days
**Mechanism**: Oral fluoropyrimidine prodrug (converted to 5-FU in tumor tissue)

### Toxicity Profile
- **High-risk categories**: Dermatological (**Hand-Foot Syndrome**), gastrointestinal (diarrhea, nausea), hematological (less severe than IV chemo)
- **KEY TOXICITY**: **Hand-Foot Syndrome (HFS)** - palmar-plantar erythrodysesthesia, dose-limiting, cumulative
- **HFS Characteristics**:
  - Typically emerges Cycle 3-4
  - Peak timing: Days 14-34 of each cycle
  - Cumulative (worsens with continued treatment)
  - Grade 2 = dose-limiting (painful, limits instrumental ADLs)
  - Grade 3 = severe (blistering, cannot walk, severe pain)
- **Nadir**: Days 7-14 (less severe neutropenia than IV chemotherapy)
- **Advantages**: Oral administration (no infusion center visits), home-based treatment

---

### P010 - Early Cycle, Recovery Phase with GI Toxicity

**Demographics**:
- Age: 67
- Gender: Female
- BMI: 21.5 (normal weight, lower end)
- Comorbidities: None
- ECOG Performance Status: 1 (restricted in strenuous activity)

**Treatment Details**:
- Regimen: Capecitabine monotherapy
- Dose: 1250mg/m² BID, Days 1-14 q21 days
- Cycle: 2 of unspecified total
- Last "Infusion": December 15, 2025 (oral therapy - using as cycle start date)
- Treatment Day (as of Dec 20): **Day 5** (recovery phase, during "on" period)
- Next Cycle: January 5, 2026

**Symptom History**:
- **Diarrhea**: Grade 1 (mild), stable trend
- No HFS reported yet (expected Cycle 3-4)

**Clinical Context**:
- Day 5 of oral dosing (still taking medication, Days 1-14 "on" period)
- Mild diarrhea common with oral fluoropyrimidines (capecitabine, 5-FU)
- Stable symptom suggests manageable with loperamide/dietary modifications
- Older patient (67) with lower BMI (21.5) - nutritional monitoring important with diarrhea
- ECOG 1 may be baseline for older metastatic patient
- No HFS yet in Cycle 2 (typical emergence Cycle 3-4)

**Demo Value**:
1. **Oral chemotherapy profile**: Demonstrates GI toxicity pattern for oral agents
2. **Recovery phase during "on" period**: Shows Day 5 monitoring during active drug administration
3. **GI toxicity management**: Grade 1 diarrhea = routine supportive care (loperamide, hydration, diet)
4. **Older patient considerations**: Age 67 with lower BMI (21.5) = nutritional risk with diarrhea
5. **Early cycle (Cycle 2)**: Before typical HFS emergence (Cycle 3-4) - baseline skin assessment
6. **Oral therapy monitoring**: Different schedule than IV chemo (daily medication vs. q21 day infusions)

**Demo Scenarios**:
- Use to demonstrate oral chemotherapy toxicity profile (GI-dominant)
- Show recovery phase question selection during oral therapy "on" period
- Demonstrate GREEN alert with supportive care recommendation: "Continue loperamide PRN, monitor hydration"
- Highlight nutritional considerations (older age, lower BMI, diarrhea)
- Use for patient education about HFS (not present yet, but will monitor in future cycles)

---

### P011 - Mid-Treatment, Nadir Phase, Emerging HFS

**Demographics**:
- Age: 50
- Gender: Female
- BMI: 26.5 (overweight)
- Comorbidities: None
- ECOG Performance Status: 0 (fully active)

**Treatment Details**:
- Regimen: Capecitabine monotherapy
- Dose: 1250mg/m² BID, Days 1-14 q21 days
- Cycle: 4 of unspecified total
- Last Cycle Start: December 12, 2025
- Treatment Day (as of Dec 20): **Day 8** (nadir phase, still in "on" period)
- Next Cycle: January 2, 2026

**Symptom History**:
- **Hand-Foot Syndrome (HFS)**: Grade 1 (mild), **worsening trend**
- No other significant symptoms

**Clinical Context**:
- **Cycle 4** is classic timing for HFS emergence (typically Cycle 3-4)
- **Worsening trend** at Grade 1 is early warning - may progress to Grade 2 (dose-limiting)
- Day 8 is within Days 1-14 "on" period - still taking daily medication
- Current Grade 1 HFS = mild redness/tingling, not functionally limiting yet
- **Watch closely** - Grade 2 HFS (pain, limits walking/hand use) triggers dose reduction
- ECOG 0 maintained - not yet functionally impacted

**Demo Value**:
1. **Classic HFS emergence**: Demonstrates typical timing (Cycle 4) and presentation
2. **Worsening trend = early warning**: Shows Grade 1→2 risk, proactive monitoring opportunity
3. **Nadir phase monitoring**: Day 8 nadir for capecitabine (less neutropenic than IV chemo)
4. **Dose-limiting toxicity watch**: Grade 1 worsening → potential Grade 2 → dose reduction needed
5. **Cumulative toxicity**: Shows how HFS emerges after multiple cycles (not Cycle 1-2)
6. **Functional status preserved**: ECOG 0 shows not yet limiting activities (Grade 1 not dose-limiting)

**Demo Scenarios**:
- Use to demonstrate HFS emergence at expected timing (Cycle 4)
- Show **YELLOW alert** potential if worsening continues: "Monitor HFS closely - trending toward Grade 2"
- Demonstrate proactive management recommendations: "Prescribe urea cream, advise on hand/foot care, avoid heat exposure"
- Highlight importance of worsening trend monitoring (catch Grade 2 early for dose adjustment)
- Use for patient education about HFS prevention (moisturizers, avoid heat, protective footwear)

---

### P012 - Grade 2 HFS + Multiple Symptoms (ENHANCED PATIENT)

**Demographics**:
- Age: 59
- Gender: Female
- BMI: 29.0 (overweight)
- Comorbidities: Diabetes Type II
- ECOG Performance Status: 1 (restricted in strenuous activity)

**Treatment Details**:
- Regimen: Capecitabine monotherapy
- Dose: 1250mg/m² BID, Days 1-14 q21 days (likely needs dose reduction)
- Cycle: 3 of unspecified total
- Last Cycle Start: December 1, 2025
- Treatment Day (as of Dec 20): **Day 19** (inter_cycle, in "off" period Days 15-21)
- Next Cycle: December 22, 2025 (2 days away - may be delayed for HFS management)

**Symptom History**:
- **Hand-Foot Syndrome (HFS)**: **Grade 2 (moderate), worsening trend** ← DOSE-LIMITING TOXICITY
- **Diarrhea**: Grade 1 (mild), stable trend

**Clinical Context**:
- **ENHANCED PATIENT**: Selected specifically to demonstrate Grade 2 dose-limiting HFS
- **Grade 2 HFS** = painful erythema/swelling, limits instrumental ADLs (cooking, walking, gripping)
- Day 19 is within Days 14-34 peak HFS timing - symptom at maximum severity
- **Worsening trend** at Grade 2 is urgent - risk of Grade 3 (blistering, cannot walk)
- **DOSE REDUCTION REQUIRED**: Standard approach is 20% dose reduction (1250 → 1000 mg/m²)
- Multiple symptoms (HFS + diarrhea) = cumulative burden from capecitabine
- Diabetes comorbidity worsens HFS (impaired wound healing, microvascular disease)
- ECOG 1 reflects functional limitation from HFS (pain limits activity)
- Next cycle (Day 22) should be **delayed** until HFS improves to Grade ≤1

**Demo Value**:
1. **ENHANCED PATIENT**: Demonstrates Grade 2 dose-limiting HFS requiring intervention
2. **Dose-limiting toxicity**: Classic scenario requiring dose reduction (1250 → 1000 mg/m²)
3. **Peak HFS timing**: Day 19 within Days 14-34 expected peak severity window
4. **Multiple symptoms**: Cumulative burden (Grade 2 HFS + Grade 1 diarrhea = 8 + 3 = 11 burden points)
5. **YELLOW alert**: Grade 2 + worsening trend triggers urgent review within 24hr
6. **Comorbidity impact**: Diabetes worsens HFS (poor wound healing, microvascular disease)
7. **Treatment delay decision**: Shows when to hold next cycle (HFS must improve to ≤Grade 1)
8. **Functional impact**: ECOG 1 from HFS pain limiting activities

**Demo Scenarios**:
- **PRIMARY USE**: Demonstrate YELLOW alert for Grade 2 dose-limiting toxicity (HFS)
- Show clinician decision support: "URGENT - Schedule call within 24hr. Grade 2 HFS requires dose reduction to 1000mg/m² BID. Hold next cycle until improved to Grade ≤1."
- Demonstrate multiple symptom cumulative burden calculation (HFS + diarrhea)
- Highlight comorbidity impact (diabetes worsens HFS severity and healing)
- Use for dose modification discussion (20% reduction is standard for Grade 2 HFS)
- Show treatment delay decision-making (next cycle Dec 22 should be delayed)

---

## Pembrolizumab Regimen (3 Patients)

**Full Regimen Name**: Pembrolizumab (Keytruda)
**Indication**: Melanoma, NSCLC, TNBC, MSI-H/dMMR solid tumors, many others
**Cycle Structure**: 200mg IV q21 days OR 400mg IV q6 weeks
**Mechanism**: PD-1 immune checkpoint inhibitor (immunotherapy)

### Toxicity Profile
- **High-risk categories**: Constitutional (fatigue), dermatological (rash, pruritus), GI (diarrhea, colitis), pulmonary (pneumonitis), endocrine (thyroid, adrenal, pituitary)
- **KEY CONCEPT**: **Immune-related adverse events (irAEs)** - can affect any organ system, can occur anytime (not phase-specific)
- **Timing**: irAEs can emerge Cycle 1 through months after treatment discontinuation (not predictable like chemotherapy toxicities)
- **Management**: Grade 2-3 irAEs typically require corticosteroids; Grade 4 requires permanent treatment discontinuation
- **Nadir**: N/A (non-myelosuppressive - does not cause neutropenia/thrombocytopenia)
- **Life-threatening irAEs**: Pneumonitis, colitis, hepatitis, endocrinopathies (adrenal crisis), myocarditis

---

### P013 - Early Treatment, Recovery Phase, Combination Therapy

**Demographics**:
- Age: 54
- Gender: Female
- BMI: 24.8 (normal weight)
- Comorbidities: None
- ECOG Performance Status: 0 (fully active)

**Treatment Details**:
- Regimen: Pembrolizumab + Paclitaxel + Carboplatin (combination immunotherapy-chemotherapy)
- Dose: Pembrolizumab 200mg q21 days + paclitaxel 175mg/m² + carboplatin AUC 5-6
- Cycle: 3 of planned 4-6 cycles combination, then pembrolizumab maintenance
- Last Infusion: December 16, 2025
- Treatment Day (as of Dec 20): **Day 4** (recovery phase)
- Next Infusion: January 6, 2026

**Symptom History**:
- **Rash**: Grade 1 (mild), stable trend
- No other significant symptoms

**Clinical Context**:
- Combination therapy (immunotherapy + chemotherapy) - dual toxicity profile
- Grade 1 rash is common early irAE - **sentinel symptom** (may indicate early immune activation)
- Stable rash = manageable with topical steroids/antihistamines
- Day 4 recovery phase captures both chemo effects (GI, fatigue) and early irAEs (rash)
- ECOG 0 maintained - excellent tolerance of combination regimen
- Early cycle (Cycle 3) - most severe irAEs emerge later (Cycles 3-6 or after)

**Demo Value**:
1. **Combination immunotherapy-chemotherapy**: Shows dual toxicity profile (chemo + irAEs)
2. **Early irAE indicator**: Grade 1 rash as sentinel symptom (dermatologic irAEs often first)
3. **Recovery phase for immunotherapy**: Day 4 monitoring captures early irAE emergence
4. **Stable mild irAE management**: Demonstrates Grade 1 irAE not requiring treatment hold
5. **ECOG 0 maintenance**: Shows good tolerance of combination regimen
6. **irAE monitoring initiation**: Early cycle establishes baseline for future irAE detection

**Demo Scenarios**:
- Use to demonstrate immunotherapy toxicity profile (irAEs vs. traditional chemo side effects)
- Show recovery phase question priorities for immunotherapy (constitutional, dermatological, GI, pulmonary)
- Demonstrate GREEN alert with monitoring note: "Monitor rash - early dermatologic irAE, may indicate immune activation"
- Highlight combination therapy complexity (monitor both chemo and irAE toxicities)
- Use for irAE education (rash often first irAE, sentinel for other potential irAEs)

---

### P014 - Mid-Treatment with Pulmonary Risk (CRITICAL PATIENT)

**Demographics**:
- Age: 49
- Gender: Female
- BMI: 23.1 (normal weight)
- Comorbidities: **COPD (Chronic Obstructive Pulmonary Disease)**
- ECOG Performance Status: 1 (restricted in strenuous activity)

**Treatment Details**:
- Regimen: Pembrolizumab monotherapy
- Dose: 200mg IV q21 days
- Cycle: 5 of potentially long-term treatment
- Last Infusion: December 5, 2025
- Treatment Day (as of Dec 20): **Day 15** (inter_cycle)
- Next Infusion: December 26, 2025

**Symptom History**:
- **Cough**: Grade 1 (mild), **worsening trend**
- No other significant symptoms

**Clinical Context**:
- **CRITICAL PATIENT**: COPD comorbidity + immunotherapy = **HIGH PNEUMONITIS RISK**
- **Worsening cough** even at Grade 1 is concerning - may indicate **pneumonitis** (life-threatening irAE)
- Pneumonitis = immune-mediated lung inflammation, presents as cough, dyspnea, hypoxia
- **COPD** = reduced respiratory reserve → pneumonitis more dangerous
- Grade 1 cough in COPD patient might be baseline, BUT **worsening trend** suggests new process
- Requires urgent evaluation: chest X-ray, oxygen saturation, pulmonary exam
- If pneumonitis confirmed (even Grade 1-2), requires **corticosteroids + treatment hold**
- ECOG 1 may be COPD baseline or related to worsening cough

**Demo Value**:
1. **CRITICAL PATIENT**: Demonstrates comorbidity-aware escalation (COPD + immunotherapy = pneumonitis risk)
2. **Context-aware prioritization**: Grade 1 cough normally routine, but urgent in this context
3. **Worsening trend escalation**: Symptom progression even at low grade triggers concern
4. **Comorbidity amplification**: COPD increases both pneumonitis risk and severity if occurs
5. **Pulmonary irAE monitoring**: Shows pulmonary symptom prioritization for immunotherapy
6. **Life-threatening irAE potential**: Pneumonitis can be fatal if not caught early
7. **YELLOW alert despite Grade 1**: Context escalates routine symptom to urgent

**Demo Scenarios**:
- **PRIMARY USE**: Demonstrate context-aware escalation (Grade 1 → YELLOW alert due to COPD + immunotherapy)
- Show YELLOW alert: "URGENT - Worsening cough in COPD patient on immunotherapy. Assess for pneumonitis (life-threatening irAE). Order chest X-ray, oxygen saturation, pulmonary exam. Consider holding next infusion pending workup."
- Highlight comorbidity impact on symptom interpretation (COPD baseline vs. new pneumonitis)
- Use for irAE education (pneumonitis presentation, risk factors, management)
- Demonstrate when Grade 1 symptom requires urgent action (context > absolute grade)

---

### P015 - Grade 3 Fatigue irAE (ENHANCED PATIENT - PRIMARY DEMO CASE)

**Demographics**:
- Age: 61
- Gender: Female
- BMI: 27.0 (overweight)
- Comorbidities: None
- ECOG Performance Status: 2 (ambulatory >50% waking hours, capable of self-care, but cannot work)

**Treatment Details**:
- Regimen: Pembrolizumab monotherapy
- Dose: 200mg IV q21 days
- Cycle: 2 of potentially long-term treatment
- Last Infusion: November 30, 2025
- Treatment Day (as of Dec 20): **Day 20** (inter_cycle, approaching next cycle)
- Next Infusion: December 21, 2025 (**HOLD RECOMMENDED** pending irAE workup)

**Symptom History**:
- **Fatigue**: **Grade 3 (severe), worsening trend** ← POTENTIAL GRADE 4, URGENT irAE
- **Rash**: Grade 1 (mild), stable trend

**Clinical Context**:
- **ENHANCED PATIENT**: Selected specifically for Grade 3→4 constitutional irAE demonstration
- **Grade 3 fatigue** = severe, limiting self-care ADLs (bathing, dressing, eating difficult)
- **Worsening trend** (previous Grade 3 → current potentially Grade 4) = progressive irAE
- **ECOG 2** reflects functional decline from fatigue (cannot work, needs rest >50% of day)
- Multiple potential endocrine irAEs present as severe fatigue:
  - **Adrenal insufficiency** (low cortisol) - can be life-threatening (adrenal crisis)
  - **Hypothyroidism** (low thyroid) - fatigue, weight gain, cold intolerance
  - **Hypophysitis** (pituitary inflammation) - fatigue, headache, vision changes
- Requires **URGENT workup**: TSH, free T4, cortisol, ACTH, CBC, CMP
- Next infusion (Dec 21) should be **HELD** pending irAE evaluation and treatment
- Depending on etiology, may need **permanent pembrolizumab discontinuation** (Grade 4 irAE)

**Demo Value**:
1. **ENHANCED PATIENT - PRIMARY DEMO CASE**: Used in end-to-end example in System Logic Documentation
2. **Grade 3→4 constitutional irAE**: Demonstrates severe life-threatening irAE requiring urgent intervention
3. **RED ALERT trigger**: Grade 3-4 = emergency contact within 30 minutes
4. **Endocrine irAE presentation**: Shows how adrenal/thyroid/pituitary dysfunction presents as fatigue
5. **Triage priority score**: Score 115 (100 for RED + 5 for GREEN rash + 10 recent completion) = Rank 1
6. **Worsening trend at high grade**: Grade 3 worsening = imminent Grade 4 = emergency
7. **Functional impact**: ECOG 2 shows severe limitation (cannot work, needs rest >50% day)
8. **Treatment hold decision**: Demonstrates when to hold next infusion pending workup
9. **Multiple symptoms context**: Rash (Grade 1) + fatigue (Grade 3) = dual irAEs (immune system highly activated)

**Demo Scenarios**:
- **PRIMARY USE - COMPLETE PATIENT JOURNEY**: Walk through entire system from questionnaire → alert → clinician action (documented in System Logic Documentation Section 8)
- Show **RED ALERT**: "🚨 EMERGENCY - Grade 4 Constitutional Fatigue - Contact patient immediately within 30 minutes"
- Demonstrate priority scoring placing patient at **Rank 1** (top of clinician queue)
- Show clinician decision support: "Assess for irAE: Order TSH, cortisol, ACTH labs. Hold next infusion (Dec 21). Evaluate need for ED referral or admission. Consider endocrinology consult."
- Use for irAE education (endocrine irAEs commonly present as severe fatigue)
- Demonstrate urgent workflow: Phone call → STAT labs → Diagnosis (e.g., adrenal insufficiency) → Treatment (steroids) → Admission
- Show treatment outcome: Example case resulted in adrenal insufficiency diagnosis, hydrocortisone treatment, improvement within 48hr, permanent treatment discontinuation

---

## Demo Scenario Recommendations

### Scenario 1: Complete Patient Journey (30-60 minutes)
**Use Patient: P015 (Pembrolizumab Grade 3→4 fatigue)**
- Walk through all 7 system components
- Show questionnaire adaptive branching
- Demonstrate NCI grading calculation
- Show RED alert generation and triage priority scoring
- Display clinician dashboard
- Discuss clinician workflow and patient outcome

### Scenario 2: Phase-Specific Monitoring (15 minutes)
**Use Patients**:
- P001 (Post-session, AC-T) - GI focus
- P002 (Nadir, AC-T) - Hematological/infection focus
- P016 (Pre-session, AC-T) - Baseline clearance

Compare question priorities across phases for same regimen.

### Scenario 3: Regimen-Specific Toxicity Profiles (15 minutes)
**Use Patients**:
- P001 (AC-T) - GI + hematological
- P004 (TC) - Musculoskeletal + hematological
- P008 (T-DM1) - Thrombocytopenia + bleeding
- P012 (Capecitabine) - Hand-Foot Syndrome
- P015 (Pembrolizumab) - irAEs (constitutional, endocrine)

Show how system adapts questions to regimen-specific risks.

### Scenario 4: Grade-Based Triage (10 minutes)
**Use Patients**:
- P015 (Grade 3-4) - RED alert
- P012 (Grade 2 HFS) - YELLOW alert
- P003 (Grade 2 neuropathy) - YELLOW alert
- P016 (Grade 1 improving) - GREEN alert

Demonstrate alert engine and triage priority scoring.

### Scenario 5: Comorbidity-Aware Monitoring (10 minutes)
**Use Patients**:
- P014 (COPD + pembrolizumab) - Pneumonitis risk escalation
- P005 (Heart disease + TC) - Edema monitoring
- P002 (Diabetes + AC-T) - Neuropathy risk amplification
- P012 (Diabetes + capecitabine) - HFS wound healing concerns

Show context-aware escalation for high-risk comorbidities.

### Scenario 6: Adaptive Burden Reduction (10 minutes)
**Use Patients**:
- P006 (No symptoms) - Shortest questionnaire (~15 questions)
- P016 (Mild improving) - Short questionnaire (~20 questions)
- P012 (Multiple symptoms) - Longer questionnaire (~35 questions)
- P015 (Severe symptoms) - Full assessment (~40+ questions)

Demonstrate adaptive branching efficiency across symptom burdens.

---

## Quick Reference: Patient Lookup Table

| Patient ID | Regimen | Cycle | Day | Phase | Key Symptom | Grade | Demo Purpose |
|------------|---------|-------|-----|-------|-------------|-------|--------------|
| **P001** | AC-T (AC) | 1 | 6 | Recovery | Nausea | 1 | Post-session GI focus |
| **P002** | AC-T (T) | 6 | 13 | Nadir | Neuropathy | 1↑ | Cumulative toxicity, nadir |
| **P003** | AC-T (T) | 5 | 26 | Inter | Neuropathy | 2↑ | Grade 2 dose-limiting |
| **P016** | AC-T (AC) | 1 | 45 | **Pre** | Nausea | 1↓ | **Pre-session clearance** |
| **P004** | TC | 2 | 4 | Recovery | Myalgia | 2↑ | Docetaxel myalgia |
| **P005** | TC | 4 | 15 | Inter | Edema | 1 | Cardiac comorbidity |
| **P006** | TC | 1 | 6 | Recovery | None | 0 | Minimal symptoms (shortest) |
| **P017** | TC | 2 | 45 | **Pre** | Myalgia | 1 | **Pre-session with history** |
| **P007** | T-DM1 | 5 | 4 | Recovery | Fatigue | 1 | Late cycle tolerance |
| **P008** | T-DM1 | 3 | 10 | Nadir | Epistaxis | 1↑ | **Thrombocytopenia risk** |
| **P009** | T-DM1 | 8 | 19 | Inter | None | 0 | Long-term success |
| **P010** | Cape | 2 | 5 | Recovery | Diarrhea | 1 | Oral chemo GI |
| **P011** | Cape | 4 | 8 | Nadir | HFS | 1↑ | Emerging HFS |
| **P012** | Cape | 3 | 19 | Inter | HFS | 2↑ | **Grade 2 HFS dose-limiting** |
| **P013** | Pembro+CT | 3 | 4 | Recovery | Rash | 1 | Early irAE, combination |
| **P014** | Pembro | 5 | 15 | Inter | Cough | 1↑ | **COPD pneumonitis risk** |
| **P015** | Pembro | 2 | 20 | Inter | Fatigue | 3↑ | **Grade 3-4 irAE (PRIMARY)** |

**Legend**: ↑ Worsening, ↓ Improving, **Bold** = Key demo patients

---

**Document Version**: 1.0
**Last Updated**: December 20, 2025
**For Questions**: Contact [Product/Clinical Team]
