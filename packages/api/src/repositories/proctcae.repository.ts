import { Knex } from 'knex';
import { ProCTCAEItem } from '@toxicity-analyzer/shared';

export class ProCTCAERepository {
  constructor(private db: Knex) {}

  /**
   * Get all PRO-CTCAE items
   */
  async findAll(): Promise<ProCTCAEItem[]> {
    const rows = await this.db('proctcae_items')
      .orderBy('symptom_category', 'asc')
      .orderBy('attribute', 'asc');

    return rows.map(this.mapToItem);
  }

  /**
   * Find item by ID
   */
  async findById(itemId: string): Promise<ProCTCAEItem | null> {
    const row = await this.db('proctcae_items')
      .where('item_id', itemId)
      .first();

    if (!row) {
      return null;
    }

    return this.mapToItem(row);
  }

  /**
   * Find items by IDs
   *
   * IMPORTANT: Preserves the order of the input itemIds array
   * This is critical for maintaining correct question order in questionnaires
   */
  async findByIds(itemIds: string[]): Promise<ProCTCAEItem[]> {
    if (itemIds.length === 0) {
      return [];
    }

    const rows = await this.db('proctcae_items')
      .whereIn('item_id', itemIds);

    // Create a map for O(1) lookup
    const itemMap = new Map(rows.map(row => [row.item_id, this.mapToItem(row)]));

    // Return items in the same order as input itemIds
    return itemIds
      .map(id => itemMap.get(id))
      .filter((item): item is ProCTCAEItem => item !== undefined);
  }

  /**
   * Find items by symptom categories
   */
  async findByCategories(categories: string[]): Promise<ProCTCAEItem[]> {
    const rows = await this.db('proctcae_items')
      .whereIn('symptom_category', categories)
      .orderBy('symptom_category', 'asc')
      .orderBy('attribute', 'asc');

    return rows.map(this.mapToItem);
  }

  /**
   * Find items by symptom category and attribute
   */
  async findBySymptomAndAttribute(
    symptomCategory: string,
    attribute: string
  ): Promise<ProCTCAEItem | null> {
    const row = await this.db('proctcae_items')
      .where('symptom_category', symptomCategory)
      .where('attribute', attribute)
      .first();

    if (!row) {
      return null;
    }

    return this.mapToItem(row);
  }

  /**
   * Find items by item code pattern
   * Used to fetch related items for the same symptom (e.g., all NAUSEA_* items)
   */
  async findByItemCodePattern(pattern: string): Promise<ProCTCAEItem[]> {
    const rows = await this.db('proctcae_items')
      .where('item_code', 'like', `${pattern}%`)
      .orderBy('attribute', 'asc');

    return rows.map(this.mapToItem);
  }

  /**
   * Get all unique symptom categories
   */
  async getSymptomCategories(): Promise<string[]> {
    const rows = await this.db('proctcae_items')
      .distinct('symptom_category')
      .orderBy('symptom_category', 'asc');

    return rows.map((row) => row.symptom_category);
  }

  /**
   * Map database row to ProCTCAEItem
   */
  private mapToItem(row: any): ProCTCAEItem {
    return {
      itemId: row.item_id,
      itemCode: row.item_code,
      symptomCategory: row.symptom_category,
      attribute: row.attribute,
      questionText: row.question_text,
      responseType: row.response_type,
      responseOptions: typeof row.response_options === 'string' ? JSON.parse(row.response_options) : row.response_options,
      applicablePopulations: row.applicable_populations,
      ctcaeMapping: row.ctcae_mapping,
      createdAt: row.created_at,
    };
  }
}
