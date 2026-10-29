import pool from '../config/db';

export interface ResearchRequest {
  id: number;
  user_id: number;
  request_id: string;
  disease_id?: number;
  strain_id?: number;
  filters: Record<string, any>;
  pubmed_query?: string;
  synthesized_summary?: string;
  ppt_path?: string;
  status: string;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
  disease_name?: string;
  strain_name?: string;
}

export interface CreateResearchRequestData {
  userId: number;
  diseaseId?: number;
  strainId?: number;
  filters?: Record<string, any>;
}

const WITH_DETAILS = `
  SELECT rr.*,
    d.name AS disease_name,
    s.name AS strain_name
  FROM research_requests rr
  LEFT JOIN diseases d ON rr.disease_id = d.id
  LEFT JOIN strains s ON rr.strain_id = s.id
`;

const ResearchRequestModel = {
  async create(data: CreateResearchRequestData): Promise<ResearchRequest> {
    const result = await pool.query(
      `INSERT INTO research_requests (user_id, disease_id, strain_id, filters, status)
       VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
      [data.userId, data.diseaseId, data.strainId, JSON.stringify(data.filters || {})]
    );
    return result.rows[0];
  },

  async findById(id: number): Promise<ResearchRequest | null> {
    const result = await pool.query('SELECT * FROM research_requests WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async findByIdWithDetails(id: number): Promise<ResearchRequest | null> {
    const result = await pool.query(`${WITH_DETAILS} WHERE rr.id = $1`, [id]);
    return result.rows[0] || null;
  },

  async findByRequestIdWithDetails(requestId: string): Promise<ResearchRequest | null> {
    const result = await pool.query(`${WITH_DETAILS} WHERE rr.request_id = $1`, [requestId]);
    return result.rows[0] || null;
  },

  async findByUserIdWithDetails(userId: number): Promise<ResearchRequest[]> {
    const result = await pool.query(
      `${WITH_DETAILS} WHERE rr.user_id = $1 ORDER BY rr.created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async updateStatus(id: number, status: string, errorMessage?: string | null): Promise<ResearchRequest> {
    const result = await pool.query(
      `UPDATE research_requests SET status = $1, error_message = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING *`,
      [status, errorMessage ?? null, id]
    );
    return result.rows[0];
  },

  async updateQuery(id: number, pubmedQuery: string): Promise<ResearchRequest> {
    const result = await pool.query(
      `UPDATE research_requests SET pubmed_query = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING *`,
      [pubmedQuery, id]
    );
    return result.rows[0];
  },

  async updateSummary(id: number, summary: string): Promise<ResearchRequest> {
    const result = await pool.query(
      `UPDATE research_requests SET synthesized_summary = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING *`,
      [summary, id]
    );
    return result.rows[0];
  },

  async updatePptPath(id: number, pptPath: string): Promise<ResearchRequest> {
    const result = await pool.query(
      `UPDATE research_requests SET ppt_path = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING *`,
      [pptPath, id]
    );
    return result.rows[0];
  },
};

export default ResearchRequestModel;
