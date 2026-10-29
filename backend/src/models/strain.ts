import pool from '../config/db';

export interface Strain {
  id: number;
  disease_id: number;
  name: string;
  mesh_term?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateStrainData {
  diseaseId: number;
  name: string;
  meshTerm?: string;
}

const StrainModel = {
  async create(data: CreateStrainData): Promise<Strain> {
    const result = await pool.query(
      `INSERT INTO strains (disease_id, name, mesh_term) VALUES ($1, $2, $3) RETURNING *`,
      [data.diseaseId, data.name, data.meshTerm]
    );
    return result.rows[0];
  },

  async findAll(): Promise<Strain[]> {
    const result = await pool.query('SELECT * FROM strains ORDER BY name');
    return result.rows;
  },

  async findByDisease(diseaseId: number): Promise<Strain[]> {
    const result = await pool.query('SELECT * FROM strains WHERE disease_id = $1 ORDER BY name', [diseaseId]);
    return result.rows;
  },

  async findActiveByDisease(diseaseId: number): Promise<Strain[]> {
    const result = await pool.query(
      'SELECT * FROM strains WHERE disease_id = $1 AND is_active = true ORDER BY name',
      [diseaseId]
    );
    return result.rows;
  },

  async findById(id: number): Promise<Strain | null> {
    const result = await pool.query('SELECT * FROM strains WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async update(id: number, data: Partial<CreateStrainData & { isActive: boolean }>): Promise<Strain> {
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
      `UPDATE strains SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM strains WHERE id = $1', [id]);
  },
};

export default StrainModel;
