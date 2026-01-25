-- Add full-text search indexes for better search performance
-- These indexes use PostgreSQL GIN indexes with tsvector for efficient text search

-- User search: name field
CREATE INDEX IF NOT EXISTS users_name_search_idx ON "User" USING GIN (to_tsvector('english', COALESCE(name, '')));

-- Profile search: headline, bio, location
CREATE INDEX IF NOT EXISTS profiles_search_idx ON "profiles" USING GIN (
  to_tsvector('english', COALESCE(headline, '') || ' ' || COALESCE(bio, '') || ' ' || COALESCE(location, ''))
);

-- Post search: content, title
CREATE INDEX IF NOT EXISTS posts_content_search_idx ON "posts" USING GIN (
  to_tsvector('english', COALESCE(content, '') || ' ' || COALESCE(title, ''))
);

-- Comment search: content
CREATE INDEX IF NOT EXISTS comments_content_search_idx ON "comments" USING GIN (to_tsvector('english', content));

-- Group search: name, description
CREATE INDEX IF NOT EXISTS groups_search_idx ON "groups" USING GIN (
  to_tsvector('english', name || ' ' || COALESCE(description, ''))
);

-- Skill search: name
CREATE INDEX IF NOT EXISTS skills_name_search_idx ON "skills" USING GIN (to_tsvector('english', name));

-- Experience search: title, company
CREATE INDEX IF NOT EXISTS experiences_search_idx ON "experiences" USING GIN (
  to_tsvector('english', title || ' ' || COALESCE(company, ''))
);
