-- Users table with role
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure is_active exists on pre-existing users tables (idempotent)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Avatars table
CREATE TABLE IF NOT EXISTS avatars (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    thumbnail_path VARCHAR(500),
    provider VARCHAR(100),
    provider_avatar_id VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Voices table
CREATE TABLE IF NOT EXISTS voices (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sample_audio_path VARCHAR(500),
    provider VARCHAR(100),
    provider_voice_id VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Generation requests table
CREATE TABLE IF NOT EXISTS generation_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    request_id UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    
    -- Input details
    input_type VARCHAR(50) NOT NULL,
    original_text TEXT,
    input_document_path VARCHAR(500),
    
    -- Processing results
    extracted_text TEXT,
    normalized_text TEXT,
    simplified_text TEXT,
    generated_script TEXT,
    
    -- Avatar and voice settings
    avatar_id INTEGER REFERENCES avatars(id),
    voice_id INTEGER REFERENCES voices(id),
    
    -- Provider settings
    llm_provider VARCHAR(100),
    tts_provider VARCHAR(100),
    video_provider VARCHAR(100),
    
    -- Generated media paths
    audio_path VARCHAR(500),
    video_path VARCHAR(500),
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Provider configs table
CREATE TABLE IF NOT EXISTS provider_configs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    model VARCHAR(255) NOT NULL,
    api_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_generation_requests_user_id ON generation_requests(user_id);
CREATE INDEX idx_generation_requests_status ON generation_requests(status);
CREATE INDEX idx_generation_requests_request_id ON generation_requests(request_id);
CREATE INDEX idx_avatars_is_active ON avatars(is_active);
CREATE INDEX idx_voices_is_active ON voices(is_active);
CREATE INDEX idx_provider_configs_is_active ON provider_configs(is_active);

-- =====================================================================
-- PubMed Research → Safety Protocol PPT feature (Phase 1, standalone)
-- =====================================================================

-- Single-row admin settings for the research feature
CREATE TABLE IF NOT EXISTS research_settings (
    id SERIAL PRIMARY KEY,
    top_k INTEGER NOT NULL DEFAULT 10,
    ncbi_api_key TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed the single settings row if the table is empty
INSERT INTO research_settings (top_k)
SELECT 10
WHERE NOT EXISTS (SELECT 1 FROM research_settings);

-- Curated diseases
CREATE TABLE IF NOT EXISTS diseases (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    mesh_term VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Curated strains (belong to a disease)
CREATE TABLE IF NOT EXISTS strains (
    id SERIAL PRIMARY KEY,
    disease_id INTEGER NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    mesh_term VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Curated demographic/other filter options.
-- filter_group examples: 'sex', 'age'
-- pubmed_filter is the raw PubMed expression appended to the query.
CREATE TABLE IF NOT EXISTS research_filter_options (
    id SERIAL PRIMARY KEY,
    filter_group VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    value VARCHAR(255) NOT NULL,
    pubmed_filter TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Per-run research requests
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
);

-- Fetched top-K papers per request
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
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_strains_disease_id ON strains(disease_id);
CREATE INDEX IF NOT EXISTS idx_diseases_is_active ON diseases(is_active);
CREATE INDEX IF NOT EXISTS idx_strains_is_active ON strains(is_active);
CREATE INDEX IF NOT EXISTS idx_research_filter_options_group ON research_filter_options(filter_group);
CREATE INDEX IF NOT EXISTS idx_research_requests_user_id ON research_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_research_requests_status ON research_requests(status);
CREATE INDEX IF NOT EXISTS idx_research_requests_request_id ON research_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_research_papers_request_id ON research_papers(research_request_id);

-- Seed sample disease + strain so the feature is demoable immediately
INSERT INTO diseases (name, mesh_term)
SELECT 'Influenza', 'Influenza, Human'
WHERE NOT EXISTS (SELECT 1 FROM diseases WHERE name = 'Influenza');

INSERT INTO strains (disease_id, name, mesh_term)
SELECT d.id, 'H1N1', 'Influenza A Virus, H1N1 Subtype'
FROM diseases d
WHERE d.name = 'Influenza'
  AND NOT EXISTS (SELECT 1 FROM strains s WHERE s.name = 'H1N1' AND s.disease_id = d.id);

INSERT INTO strains (disease_id, name, mesh_term)
SELECT d.id, 'H3N2', 'Influenza A Virus, H3N2 Subtype'
FROM diseases d
WHERE d.name = 'Influenza'
  AND NOT EXISTS (SELECT 1 FROM strains s WHERE s.name = 'H3N2' AND s.disease_id = d.id);

INSERT INTO diseases (name, mesh_term)
SELECT 'Tuberculosis', 'Tuberculosis'
WHERE NOT EXISTS (SELECT 1 FROM diseases WHERE name = 'Tuberculosis');

-- Seed sample filter options (sex + age)
INSERT INTO research_filter_options (filter_group, label, value, pubmed_filter)
SELECT 'sex', 'All', 'all', NULL
WHERE NOT EXISTS (SELECT 1 FROM research_filter_options WHERE filter_group = 'sex' AND value = 'all');

INSERT INTO research_filter_options (filter_group, label, value, pubmed_filter)
SELECT 'sex', 'Male only', 'male', 'male[MeSH Terms]'
WHERE NOT EXISTS (SELECT 1 FROM research_filter_options WHERE filter_group = 'sex' AND value = 'male');

INSERT INTO research_filter_options (filter_group, label, value, pubmed_filter)
SELECT 'sex', 'Female only', 'female', 'female[MeSH Terms]'
WHERE NOT EXISTS (SELECT 1 FROM research_filter_options WHERE filter_group = 'sex' AND value = 'female');

INSERT INTO research_filter_options (filter_group, label, value, pubmed_filter)
SELECT 'age', 'All ages', 'all', NULL
WHERE NOT EXISTS (SELECT 1 FROM research_filter_options WHERE filter_group = 'age' AND value = 'all');

INSERT INTO research_filter_options (filter_group, label, value, pubmed_filter)
SELECT 'age', 'Adult (19+)', 'adult', 'adult[MeSH Terms]'
WHERE NOT EXISTS (SELECT 1 FROM research_filter_options WHERE filter_group = 'age' AND value = 'adult');

INSERT INTO research_filter_options (filter_group, label, value, pubmed_filter)
SELECT 'age', 'Pediatric (0-18)', 'pediatric', 'child[MeSH Terms]'
WHERE NOT EXISTS (SELECT 1 FROM research_filter_options WHERE filter_group = 'age' AND value = 'pediatric');

INSERT INTO research_filter_options (filter_group, label, value, pubmed_filter)
SELECT 'age', 'Aged (65+)', 'aged', 'aged[MeSH Terms]'
WHERE NOT EXISTS (SELECT 1 FROM research_filter_options WHERE filter_group = 'age' AND value = 'aged');
