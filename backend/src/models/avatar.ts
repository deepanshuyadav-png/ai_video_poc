import pool from '../config/db';

export interface Avatar {
  id: number;
  name: string;
  thumbnail_path?: string;
  provider?: string;
  provider_avatar_id?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAvatarData {
  name: string;
  thumbnailPath?: string;
  provider?: string;
  providerAvatarId?: string;
}

const AvatarModel = {
  async create(data: CreateAvatarData): Promise<Avatar> {
    const { name, thumbnailPath, provider, providerAvatarId } = data;
    const result = await pool.query(
      `INSERT INTO avatars (name, thumbnail_path, provider, provider_avatar_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, thumbnailPath, provider, providerAvatarId]
    );
    return result.rows[0];
  },

  async findAll(): Promise<Avatar[]> {
    const result = await pool.query('SELECT * FROM avatars ORDER BY created_at DESC');
    return result.rows;
  },

  async findActive(): Promise<Avatar[]> {
    const result = await pool.query('SELECT * FROM avatars WHERE is_active = true ORDER BY name');
    return result.rows;
  },

  async findById(id: number): Promise<Avatar | null> {
    const result = await pool.query('SELECT * FROM avatars WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async update(id: number, data: Partial<CreateAvatarData & { isActive: boolean }>): Promise<Avatar> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.thumbnailPath !== undefined) {
      fields.push(`thumbnail_path = $${paramCount++}`);
      values.push(data.thumbnailPath);
    }
    if (data.provider !== undefined) {
      fields.push(`provider = $${paramCount++}`);
      values.push(data.provider);
    }
    if (data.providerAvatarId !== undefined) {
      fields.push(`provider_avatar_id = $${paramCount++}`);
      values.push(data.providerAvatarId);
    }
    if (data.isActive !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(data.isActive);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE avatars SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM avatars WHERE id = $1', [id]);
  }
};

export default AvatarModel;
