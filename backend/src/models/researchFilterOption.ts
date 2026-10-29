import pool from '../config/db';

export interface ResearchFilterOption {
  id: number;
  filter_group: string;
  label: string;
  value: string;
  pubmed_filter?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateFilterOptionData {
  filterGroup: string;
  label: string;
  value: string;
  pubmedFilter?: string;
}

const ResearchFilterOptionModel = {
  async create(data: CreateFilterOptionData): Promise<ResearchFilterOption> {
    const result = await pool.query(
      `INSERT INTO research_filter_options (filter_group, label, value, pubmed_filter)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.filterGroup, data.label, data.value, data.pubmedFilter]
    );
    return result.rows[0];
  },

  async findAll(): Promise<ResearchFilterOption[]> {
    const result = await pool.query(
      'SELECT * FROM research_filter_options ORDER BY filter_group, label'
    );
    return result.rows;
  },

  async findActive(): Promise<ResearchFilterOption[]> {
    const result = await pool.query(
      'SELECT * FROM research_filter_options WHERE is_active = true ORDER BY filter_group, label'
    );
    return result.rows;
  },

  async findById(id: number): Promise<ResearchFilterOption | null> {
    const result = await pool.query('SELECT * FROM research_filter_options WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async update(
    id: number,
    data: Partial<CreateFilterOptionData & { isActive: boolean }>
  ): Promise<ResearchFilterOption> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.filterGroup !== undefined) {
      fields.push(`filter_group = $${paramCount++}`);
      values.push(data.filterGroup);
    }
    if (data.label !== undefined) {
      fields.push(`label = $${paramCount++}`);
      values.push(data.label);
    }
    if (data.value !== undefined) {
      fields.push(`value = $${paramCount++}`);
      values.push(data.value);
    }
    if (data.pubmedFilter !== undefined) {
      fields.push(`pubmed_filter = $${paramCount++}`);
      values.push(data.pubmedFilter);
    }
    if (data.isActive !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(data.isActive);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE research_filter_options SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM research_filter_options WHERE id = $1', [id]);
  },
};

export default ResearchFilterOptionModel;
