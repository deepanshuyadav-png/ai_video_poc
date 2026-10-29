import pool from '../config/db';

export interface ResearchPaper {
  id: number;
  research_request_id: number;
  pmid?: string;
  title?: string;
  authors?: string;
  journal?: string;
  pub_year?: string;
  abstract?: string;
  url?: string;
  rank?: number;
  created_at: Date;
}

export interface PaperInput {
  pmid?: string;
  title?: string;
  authors?: string;
  journal?: string;
  pubYear?: string;
  abstract?: string;
  url?: string;
  rank?: number;
}

const ResearchPaperModel = {
  // Bulk-insert the fetched papers for a request.
  async createMany(requestId: number, papers: PaperInput[]): Promise<ResearchPaper[]> {
    const created: ResearchPaper[] = [];
    for (const p of papers) {
      const result = await pool.query(
        `INSERT INTO research_papers
           (research_request_id, pmid, title, authors, journal, pub_year, abstract, url, rank)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [requestId, p.pmid, p.title, p.authors, p.journal, p.pubYear, p.abstract, p.url, p.rank]
      );
      created.push(result.rows[0]);
    }
    return created;
  },

  async findByRequest(requestId: number): Promise<ResearchPaper[]> {
    const result = await pool.query(
      'SELECT * FROM research_papers WHERE research_request_id = $1 ORDER BY rank ASC, id ASC',
      [requestId]
    );
    return result.rows;
  },

  async deleteByRequest(requestId: number): Promise<void> {
    await pool.query('DELETE FROM research_papers WHERE research_request_id = $1', [requestId]);
  },
};

export default ResearchPaperModel;
