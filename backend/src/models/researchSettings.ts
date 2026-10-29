import pool from '../config/db';

export interface ResearchSettings {
  id: number;
  top_k: number;
  ncbi_api_key?: string;
  created_at: Date;
  updated_at: Date;
}

const ResearchSettingsModel = {
  // Returns the single settings row, creating a default one if missing.
  async get(): Promise<ResearchSettings> {
    let result = await pool.query('SELECT * FROM research_settings ORDER BY id LIMIT 1');
    if (!result.rows[0]) {
      result = await pool.query(
        'INSERT INTO research_settings (top_k) VALUES ($1) RETURNING *',
        [10]
      );
    }
    return result.rows[0];
  },

  async update(data: { topK?: number; ncbiApiKey?: string | null }): Promise<ResearchSettings> {
    const current = await this.get();

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.topK !== undefined) {
      fields.push(`top_k = $${paramCount++}`);
      values.push(data.topK);
    }
    if (data.ncbiApiKey !== undefined) {
      fields.push(`ncbi_api_key = $${paramCount++}`);
      values.push(data.ncbiApiKey === '' ? null : data.ncbiApiKey);
    }

    if (fields.length === 0) {
      return current;
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(current.id);

    const result = await pool.query(
      `UPDATE research_settings SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  },
};

export default ResearchSettingsModel;
