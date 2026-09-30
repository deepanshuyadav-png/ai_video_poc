import pool from '../config/db';

export interface Voice {
  id: number;
  name: string;
  sample_audio_path?: string;
  provider?: string;
  provider_voice_id?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateVoiceData {
  name: string;
  sampleAudioPath?: string;
  provider?: string;
  providerVoiceId?: string;
}

const VoiceModel = {
  async create(data: CreateVoiceData): Promise<Voice> {
    const { name, sampleAudioPath, provider, providerVoiceId } = data;
    const result = await pool.query(
      `INSERT INTO voices (name, sample_audio_path, provider, provider_voice_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, sampleAudioPath, provider, providerVoiceId]
    );
    return result.rows[0];
  },

  async findAll(): Promise<Voice[]> {
    const result = await pool.query('SELECT * FROM voices ORDER BY created_at DESC');
    return result.rows;
  },

  async findActive(): Promise<Voice[]> {
    const result = await pool.query('SELECT * FROM voices WHERE is_active = true ORDER BY name');
    return result.rows;
  },

  async findById(id: number): Promise<Voice | null> {
    const result = await pool.query('SELECT * FROM voices WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async update(id: number, data: Partial<CreateVoiceData & { isActive: boolean }>): Promise<Voice> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.sampleAudioPath !== undefined) {
      fields.push(`sample_audio_path = $${paramCount++}`);
      values.push(data.sampleAudioPath);
    }
    if (data.provider !== undefined) {
      fields.push(`provider = $${paramCount++}`);
      values.push(data.provider);
    }
    if (data.providerVoiceId !== undefined) {
      fields.push(`provider_voice_id = $${paramCount++}`);
      values.push(data.providerVoiceId);
    }
    if (data.isActive !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      values.push(data.isActive);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE voices SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM voices WHERE id = $1', [id]);
  }
};

export default VoiceModel;
