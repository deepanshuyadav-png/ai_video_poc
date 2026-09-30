import pool from '../config/db';

export interface GenerationRequest {
  id: number;
  user_id: number;
  request_id: string;
  input_type: string;
  original_text?: string;
  input_document_path?: string;
  extracted_text?: string;
  normalized_text?: string;
  simplified_text?: string;
  generated_script?: string;
  avatar_id?: number;
  voice_id?: number;
  llm_provider?: string;
  tts_provider?: string;
  video_provider?: string;
  audio_path?: string;
  video_path?: string;
  status: string;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
  avatar?: { id: number; name: string; thumbnail_path?: string };
  voice?: { id: number; name: string; sample_audio_path?: string };
}

export interface CreateRequestData {
  userId: number;
  inputType: string;
  originalText?: string;
  inputDocumentPath?: string;
  avatarId?: number;
  voiceId?: number;
  llmProvider?: string;
  ttsProvider?: string;
  videoProvider?: string;
}

const GenerationRequestModel = {
  async create(data: CreateRequestData): Promise<GenerationRequest> {
    const { userId, inputType, originalText, inputDocumentPath, avatarId, voiceId, llmProvider, ttsProvider, videoProvider } = data;
    const result = await pool.query(
      `INSERT INTO generation_requests 
        (user_id, input_type, original_text, input_document_path, avatar_id, voice_id, llm_provider, tts_provider, video_provider, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
       RETURNING *`,
      [userId, inputType, originalText, inputDocumentPath, avatarId, voiceId, llmProvider, ttsProvider, videoProvider]
    );
    return result.rows[0];
  },

  async findById(id: number): Promise<GenerationRequest | null> {
    const result = await pool.query('SELECT * FROM generation_requests WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findByIdWithDetails(id: number): Promise<GenerationRequest | null> {
    const result = await pool.query(`
      SELECT gr.*, 
        json_build_object('id', a.id, 'name', a.name, 'thumbnail_path', a.thumbnail_path) as avatar,
        json_build_object('id', v.id, 'name', v.name, 'sample_audio_path', v.sample_audio_path) as voice
      FROM generation_requests gr
      LEFT JOIN avatars a ON gr.avatar_id = a.id
      LEFT JOIN voices v ON gr.voice_id = v.id
      WHERE gr.id = $1
    `, [id]);
    return result.rows[0] || null;
  },

  async findByRequestId(requestId: string): Promise<GenerationRequest | null> {
    const result = await pool.query('SELECT * FROM generation_requests WHERE request_id = $1', [requestId]);
    return result.rows[0] || null;
  },

  async findByRequestIdWithDetails(requestId: string): Promise<GenerationRequest | null> {
    const result = await pool.query(`
      SELECT gr.*, 
        json_build_object('id', a.id, 'name', a.name, 'thumbnail_path', a.thumbnail_path) as avatar,
        json_build_object('id', v.id, 'name', v.name, 'sample_audio_path', v.sample_audio_path) as voice
      FROM generation_requests gr
      LEFT JOIN avatars a ON gr.avatar_id = a.id
      LEFT JOIN voices v ON gr.voice_id = v.id
      WHERE gr.request_id = $1
    `, [requestId]);
    return result.rows[0] || null;
  },

  async findByUserId(userId: number): Promise<GenerationRequest[]> {
    const result = await pool.query(
      'SELECT * FROM generation_requests WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  },

  async findByUserIdWithDetails(userId: number): Promise<GenerationRequest[]> {
    const result = await pool.query(`
      SELECT gr.*, 
        json_build_object('id', a.id, 'name', a.name, 'thumbnail_path', a.thumbnail_path) as avatar,
        json_build_object('id', v.id, 'name', v.name, 'sample_audio_path', v.sample_audio_path) as voice
      FROM generation_requests gr
      LEFT JOIN avatars a ON gr.avatar_id = a.id
      LEFT JOIN voices v ON gr.voice_id = v.id
      WHERE gr.user_id = $1
      ORDER BY gr.created_at DESC
    `, [userId]);
    return result.rows;
  },

  async updateStatus(id: number, status: string, errorMessage?: string): Promise<GenerationRequest> {
    const result = await pool.query(
      'UPDATE generation_requests SET status = $1, error_message = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [status, errorMessage, id]
    );
    return result.rows[0];
  },

  async updateExtractedText(id: number, extractedText: string): Promise<GenerationRequest> {
    const result = await pool.query(
      'UPDATE generation_requests SET extracted_text = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [extractedText, id]
    );
    return result.rows[0];
  },

  async updateSimplifiedText(id: number, simplifiedText: string): Promise<GenerationRequest> {
    const result = await pool.query(
      'UPDATE generation_requests SET simplified_text = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [simplifiedText, 'completed', id]
    );
    return result.rows[0];
  },

  async updateVideoPath(id: number, videoPath: string): Promise<GenerationRequest> {
    const result = await pool.query(
      'UPDATE generation_requests SET video_path = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [videoPath, id]
    );
    return result.rows[0];
  }
};

export default GenerationRequestModel;
