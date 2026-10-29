import pool from './config/db';
import bcrypt from 'bcryptjs';

export const ensureSchema = async (): Promise<void> => {
  try {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true');
    console.log('Schema ensured: users.is_active');
  } catch (error) {
    console.error('Error ensuring schema:', error);
  }

  await ensureResearchSchema();
};

// Idempotent schema + seed for the PubMed research feature so a running DB
// (not freshly bootstrapped from init.sql) also gets these tables.
export const ensureResearchSchema = async (): Promise<void> => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS research_settings (
        id SERIAL PRIMARY KEY,
        top_k INTEGER NOT NULL DEFAULT 10,
        ncbi_api_key TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      INSERT INTO research_settings (top_k)
      SELECT 10 WHERE NOT EXISTS (SELECT 1 FROM research_settings)
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS diseases (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        mesh_term VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS strains (
        id SERIAL PRIMARY KEY,
        disease_id INTEGER NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        mesh_term VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS research_filter_options (
        id SERIAL PRIMARY KEY,
        filter_group VARCHAR(100) NOT NULL,
        label VARCHAR(255) NOT NULL,
        value VARCHAR(255) NOT NULL,
        pubmed_filter TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS research_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        request_id UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
        disease_id INTEGER REFERENCES diseases(id),
        strain_id INTEGER REFERENCES strains(id),
        filters JSONB DEFAULT '{}'::jsonb,
        pubmed_query TEXT,
        synthesized_summary TEXT,
        ppt_path VARCHAR(500),
        status VARCHAR(50) DEFAULT 'pending',
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS research_papers (
        id SERIAL PRIMARY KEY,
        research_request_id INTEGER NOT NULL REFERENCES research_requests(id) ON DELETE CASCADE,
        pmid VARCHAR(50),
        title TEXT,
        authors TEXT,
        journal TEXT,
        pub_year VARCHAR(10),
        abstract TEXT,
        url TEXT,
        rank INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query('CREATE INDEX IF NOT EXISTS idx_strains_disease_id ON strains(disease_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_research_requests_user_id ON research_requests(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_research_papers_request_id ON research_papers(research_request_id)');

    await seedResearchCatalog();

    console.log('Schema ensured: research feature tables');
  } catch (error) {
    console.error('Error ensuring research schema:', error);
  }
};

const seedResearchCatalog = async (): Promise<void> => {
  // Diseases
  await pool.query(`
    INSERT INTO diseases (name, mesh_term)
    SELECT 'Influenza', 'Influenza, Human'
    WHERE NOT EXISTS (SELECT 1 FROM diseases WHERE name = 'Influenza')
  `);
  await pool.query(`
    INSERT INTO diseases (name, mesh_term)
    SELECT 'Tuberculosis', 'Tuberculosis'
    WHERE NOT EXISTS (SELECT 1 FROM diseases WHERE name = 'Tuberculosis')
  `);

  // Strains for Influenza
  await pool.query(`
    INSERT INTO strains (disease_id, name, mesh_term)
    SELECT d.id, 'H1N1', 'Influenza A Virus, H1N1 Subtype'
    FROM diseases d
    WHERE d.name = 'Influenza'
      AND NOT EXISTS (SELECT 1 FROM strains s WHERE s.name = 'H1N1' AND s.disease_id = d.id)
  `);
  await pool.query(`
    INSERT INTO strains (disease_id, name, mesh_term)
    SELECT d.id, 'H3N2', 'Influenza A Virus, H3N2 Subtype'
    FROM diseases d
    WHERE d.name = 'Influenza'
      AND NOT EXISTS (SELECT 1 FROM strains s WHERE s.name = 'H3N2' AND s.disease_id = d.id)
  `);

  // Filter options
  const filters: Array<[string, string, string, string | null]> = [
    ['sex', 'All', 'all', null],
    ['sex', 'Male only', 'male', 'male[MeSH Terms]'],
    ['sex', 'Female only', 'female', 'female[MeSH Terms]'],
    ['age', 'All ages', 'all', null],
    ['age', 'Adult (19+)', 'adult', 'adult[MeSH Terms]'],
    ['age', 'Pediatric (0-18)', 'pediatric', 'child[MeSH Terms]'],
    ['age', 'Aged (65+)', 'aged', 'aged[MeSH Terms]'],
  ];
  for (const [group, label, value, pubmedFilter] of filters) {
    await pool.query(
      `INSERT INTO research_filter_options (filter_group, label, value, pubmed_filter)
       SELECT $1, $2, $3, $4
       WHERE NOT EXISTS (
         SELECT 1 FROM research_filter_options WHERE filter_group = $1 AND value = $3
       )`,
      [group, label, value, pubmedFilter]
    );
  }
};

export const seedAdmin = async (): Promise<void> => {
  try {
    const email = 'admin@example.com';
    const password = 'admin123';

    // Check if admin exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (existing.rows.length > 0) {
      console.log('Admin user already exists');
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      'INSERT INTO users (email, password, role) VALUES ($1, $2, $3)',
      [email, hashedPassword, 'admin']
    );

    console.log('Admin user created:');
    console.log('  Email: admin@example.com');
    console.log('  Password: admin123');
  } catch (error) {
    console.error('Error seeding admin:', error);
  }
};
