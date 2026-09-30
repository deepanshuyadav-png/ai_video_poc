import pool from '../config/db';

export interface ProviderConfig {
  id: number;
  name: string;
  provider: string;
  model: string;
  api_key: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const ProviderConfigModel = {
  async findAll(): Promise<ProviderConfig[]> {
    const result = await pool.query('SELECT * FROM provider_configs ORDER BY created_at DESC');
    return result.rows;
  },

  async findActive(): Promise<ProviderConfig | null> {
    const result = await pool.query('SELECT * FROM provider_configs WHERE is_active = true LIMIT 1');
    return result.rows[0] || null;
  },

  async create(data: { name: string; provider: string; model: string; apiKey: string }): Promise<ProviderConfig> {
    const result = await pool.query(
      `INSERT INTO provider_configs (name, provider, model, api_key) VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.name, data.provider, data.model, data.apiKey]
    );
    return result.rows[0];
  },

  async update(id: number, data: { name?: string; provider?: string; model?: string; apiKey?: string }): Promise<ProviderConfig> {
    const result = await pool.query(
      `UPDATE provider_configs SET name = COALESCE($1, name), provider = COALESCE($2, provider), model = COALESCE($3, model), api_key = COALESCE($4, api_key), updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *`,
      [data.name, data.provider, data.model, data.apiKey, id]
    );
    return result.rows[0];
  },

  async setActive(id: number): Promise<ProviderConfig> {
    await pool.query('UPDATE provider_configs SET is_active = false, updated_at = CURRENT_TIMESTAMP');
    const result = await pool.query(
      'UPDATE provider_configs SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  },

  async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM provider_configs WHERE id = $1', [id]);
  },
};

export default ProviderConfigModel;
