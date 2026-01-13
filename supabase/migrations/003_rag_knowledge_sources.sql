-- ============================================
-- Migration 003: RAG Knowledge Sources
-- ============================================

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- KNOWLEDGE SOURCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL, -- For anonymous demo sessions
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pdf', 'url')),
  source_url TEXT,
  file_path TEXT,
  file_size INTEGER,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for session lookups
CREATE INDEX idx_knowledge_sources_session ON knowledge_sources(session_id);
CREATE INDEX idx_knowledge_sources_status ON knowledge_sources(status);

-- ============================================
-- DOCUMENT CHUNKS TABLE
-- For storing text chunks with embeddings
-- ============================================
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  knowledge_source_id UUID REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimensions
  metadata JSONB DEFAULT '{}', -- page number, position, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(knowledge_source_id, chunk_index)
);

-- Vector similarity search index (using ivfflat for fast approximate search)
CREATE INDEX idx_document_chunks_embedding ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for source lookups
CREATE INDEX idx_document_chunks_source ON document_chunks(knowledge_source_id);

-- ============================================
-- CHAT SESSIONS TABLE
-- For demo chat history
-- ============================================
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  knowledge_source_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_sessions_session ON chat_sessions(session_id);

-- ============================================
-- CHAT MESSAGES TABLE
-- For storing chat history
-- ============================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  sources UUID[], -- References to document_chunks used
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session ON chat_messages(chat_session_id, created_at);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to search similar chunks
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  source_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  knowledge_source_id UUID,
  chunk_index INTEGER,
  content TEXT,
  similarity float,
  metadata JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.knowledge_source_id,
    dc.chunk_index,
    dc.content,
    (1 - (dc.embedding <=> query_embedding::vector))::float as similarity,
    dc.metadata
  FROM document_chunks dc
  WHERE 
    dc.embedding IS NOT NULL
    AND (source_ids IS NULL OR source_ids = ARRAY[]::UUID[] OR dc.knowledge_source_id = ANY(source_ids))
    AND (1 - (dc.embedding <=> query_embedding::vector)) > match_threshold
  ORDER BY dc.embedding <=> query_embedding::vector
  LIMIT match_count;
END;
$$;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read knowledge_sources (for demo)
CREATE POLICY "Knowledge sources are viewable by everyone"
  ON knowledge_sources FOR SELECT
  USING (true);

-- Policy: Anyone can insert knowledge_sources (for demo)
CREATE POLICY "Knowledge sources are insertable by everyone"
  ON knowledge_sources FOR INSERT
  WITH CHECK (true);

-- Policy: Anyone can read document_chunks (for demo)
CREATE POLICY "Document chunks are viewable by everyone"
  ON document_chunks FOR SELECT
  USING (true);

-- Policy: Anyone can insert document_chunks (for demo)
CREATE POLICY "Document chunks are insertable by everyone"
  ON document_chunks FOR INSERT
  WITH CHECK (true);

-- Policy: Chat sessions are accessible by session_id
CREATE POLICY "Chat sessions are accessible by session"
  ON chat_sessions FOR ALL
  USING (true);

-- Policy: Chat messages are accessible by session
CREATE POLICY "Chat messages are accessible by session"
  ON chat_messages FOR ALL
  USING (true);

