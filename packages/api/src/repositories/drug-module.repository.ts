import { Knex } from 'knex';
import { DrugModule, SafetyProxyItem } from '@toxicity-analyzer/shared';
import { CyclePhase } from '@toxicity-analyzer/shared';

export class DrugModuleRepository {
  constructor(private db: Knex) {}

  /**
   * Get all drug modules
   */
  async findAll(): Promise<DrugModule[]> {
    const rows = await this.db('drug_modules')
      .orderBy('drug_name', 'asc');

    return rows.map(this.mapToModule);
  }

  /**
   * Find drug module by name
   */
  async findByName(drugName: string): Promise<DrugModule | null> {
    const row = await this.db('drug_modules')
      .where('drug_name', drugName)
      .first();

    if (!row) {
      return null;
    }

    return this.mapToModule(row);
  }

  /**
   * Find drug modules by names
   *
   * IMPORTANT: Preserves the order of the input drugNames array
   */
  async findByNames(drugNames: string[]): Promise<DrugModule[]> {
    if (drugNames.length === 0) {
      return [];
    }

    const rows = await this.db('drug_modules')
      .whereIn('drug_name', drugNames);

    // Create a map for O(1) lookup
    const moduleMap = new Map(rows.map(row => [row.drug_name, this.mapToModule(row)]));

    // Return modules in the same order as input drugNames
    return drugNames
      .map(name => moduleMap.get(name))
      .filter((module): module is DrugModule => module !== undefined);
  }

  /**
   * Find drug modules by drug class
   */
  async findByClass(drugClass: string): Promise<DrugModule[]> {
    const rows = await this.db('drug_modules')
      .where('drug_class', drugClass)
      .orderBy('drug_name', 'asc');

    return rows.map(this.mapToModule);
  }

  /**
   * Find myelosuppressive drug modules
   */
  async findMyelosuppressive(): Promise<DrugModule[]> {
    const rows = await this.db('drug_modules')
      .where('is_myelosuppressive', true)
      .orderBy('drug_name', 'asc');

    return rows.map(this.mapToModule);
  }

  /**
   * Create a new drug module
   */
  async create(module: Omit<DrugModule, 'drugModuleId' | 'createdAt'>): Promise<DrugModule> {
    const [row] = await this.db('drug_modules')
      .insert({
        drug_name: module.drugName,
        drug_class: module.drugClass,
        symptom_terms: JSON.stringify(module.symptomTerms),
        safety_proxy_items: JSON.stringify(module.safetyProxyItems),
        phase_filtering_rules: module.phaseFilteringRules ? JSON.stringify(module.phaseFilteringRules) : null,
        is_myelosuppressive: module.isMyelosuppressive,
        clinical_notes: module.clinicalNotes || null,
      })
      .returning('*');

    return this.mapToModule(row);
  }

  /**
   * Update a drug module
   */
  async update(drugName: string, updates: Partial<Omit<DrugModule, 'drugModuleId' | 'drugName' | 'createdAt'>>): Promise<DrugModule | null> {
    const updateData: any = {};

    if (updates.drugClass !== undefined) {
      updateData.drug_class = updates.drugClass;
    }
    if (updates.symptomTerms !== undefined) {
      updateData.symptom_terms = JSON.stringify(updates.symptomTerms);
    }
    if (updates.safetyProxyItems !== undefined) {
      updateData.safety_proxy_items = JSON.stringify(updates.safetyProxyItems);
    }
    if (updates.phaseFilteringRules !== undefined) {
      updateData.phase_filtering_rules = updates.phaseFilteringRules ? JSON.stringify(updates.phaseFilteringRules) : null;
    }
    if (updates.isMyelosuppressive !== undefined) {
      updateData.is_myelosuppressive = updates.isMyelosuppressive;
    }
    if (updates.clinicalNotes !== undefined) {
      updateData.clinical_notes = updates.clinicalNotes;
    }

    const [row] = await this.db('drug_modules')
      .where('drug_name', drugName)
      .update(updateData)
      .returning('*');

    if (!row) {
      return null;
    }

    return this.mapToModule(row);
  }

  /**
   * Delete a drug module
   */
  async delete(drugName: string): Promise<boolean> {
    const deleted = await this.db('drug_modules')
      .where('drug_name', drugName)
      .delete();

    return deleted > 0;
  }

  /**
   * Map database row to DrugModule
   */
  private mapToModule(row: any): DrugModule {
    return {
      drugModuleId: row.drug_module_id,
      drugName: row.drug_name,
      drugClass: row.drug_class,
      symptomTerms: typeof row.symptom_terms === 'string'
        ? JSON.parse(row.symptom_terms)
        : row.symptom_terms,
      safetyProxyItems: typeof row.safety_proxy_items === 'string'
        ? JSON.parse(row.safety_proxy_items)
        : row.safety_proxy_items,
      phaseFilteringRules: row.phase_filtering_rules
        ? (typeof row.phase_filtering_rules === 'string'
            ? JSON.parse(row.phase_filtering_rules)
            : row.phase_filtering_rules)
        : {},
      isMyelosuppressive: row.is_myelosuppressive,
      clinicalNotes: row.clinical_notes,
      createdAt: row.created_at,
    };
  }
}
