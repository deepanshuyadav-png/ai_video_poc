import pool from '../config/db';

export interface Disease {
  id: number;
  name: string;
  mesh_term?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateDiseaseData {
  name: string;
  meshTerm?: string;
}

const DiseaseModel = {
  async create(data: CreateDiseaseData): Promise<Disease> {
    const result = await pool.query(
      `INSERT INTO diseases (name, mesh_term) VALUES ($1, $2) RETURNING *`,
      [data.name, data.meshTerm]
    );
    return result.rows[0];
  },

  async findAll(): Promise<Disease[]> {
    const result = await pool.query('SELECT * FROM diseases ORDER BY name');
    return result.rows;
  },

  async findActive(): Promise<Disease[]> {
    const result = await pool.query('SELECT * FROM diseases WHERE is_active = true ORDER BY name');
    return result.rows;
  },

  async findById(id: number): Promise<Disease | null> {
    const result = await pool.query('SELECT * FROM diseases WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async update(id: number, data: Partial<CreateDiseaseData & { isActive: boolean }>): Promise<Disease> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.meshTerm !== undefined) {
      fields.push(`mesh_term = $${paramCount++}`);
      values.push(data.meshTerm);
    }
    if (data.isActive !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(data.isActive);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE diseases SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM diseases WHERE id = $1', [id]);
  },
};

export default DiseaseModel;
