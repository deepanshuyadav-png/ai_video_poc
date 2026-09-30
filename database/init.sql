-- Users table with role
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
