-- ============================================================================
-- SBALT Database Setup Script
-- Complete setup including tables, RLS policies, indexes, and triggers
-- Execute this script in Supabase SQL Editor
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. CREATE TABLES
-- ============================================================================

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  league TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  position TEXT,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  jersey_number INTEGER,
  avatar_url TEXT,
  bio TEXT,
  stats JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league TEXT NOT NULL,
  home_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  away_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'live', 'finished', 'cancelled')),
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  venue TEXT,
  external_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- News table
CREATE TABLE IF NOT EXISTS news (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT,
  source TEXT NOT NULL,
  url TEXT,
  image_url TEXT,
  tags TEXT[],
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  organizer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT NOT NULL,
  quota INTEGER NOT NULL CHECK (quota > 0),
  fee NUMERIC(10, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'cancelled', 'finished')),
  form_schema JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Registrations table
CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  form_data JSONB,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('game', 'team', 'player', 'news', 'event')),
  entity_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('game', 'team', 'player', 'news', 'event', 'comment')),
  entity_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, entity_type, entity_id)
);

-- ============================================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Teams indexes
CREATE INDEX IF NOT EXISTS idx_teams_league ON teams(league);

-- Players indexes
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);

-- Games indexes
CREATE INDEX IF NOT EXISTS idx_games_home_team_id ON games(home_team_id);
CREATE INDEX IF NOT EXISTS idx_games_away_team_id ON games(away_team_id);
CREATE INDEX IF NOT EXISTS idx_games_scheduled_at ON games(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_league ON games(league);
CREATE INDEX IF NOT EXISTS idx_games_external_id ON games(external_id) WHERE external_id IS NOT NULL;

-- News indexes
CREATE INDEX IF NOT EXISTS idx_news_published_at ON news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_tags ON news USING GIN(tags);

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_scheduled_at ON events(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- Registrations indexes
CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Likes indexes
CREATE INDEX IF NOT EXISTS idx_likes_entity ON likes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);

-- ============================================================================
-- 3. CREATE TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at column
DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_players_updated_at ON players;
CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_games_updated_at ON games;
CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_registrations_updated_at ON registrations;
CREATE TRIGGER update_registrations_updated_at
  BEFORE UPDATE ON registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. CREATE RLS POLICIES
-- ============================================================================

-- Drop existing policies if they exist (for re-running the script)
DROP POLICY IF EXISTS "Public read access" ON teams;
DROP POLICY IF EXISTS "Public read access" ON players;
DROP POLICY IF EXISTS "Public read access" ON games;
DROP POLICY IF EXISTS "Public read access" ON news;
DROP POLICY IF EXISTS "Public read access" ON events;
DROP POLICY IF EXISTS "Public read access" ON registrations;
DROP POLICY IF EXISTS "Public read access" ON comments;
DROP POLICY IF EXISTS "Public read access" ON likes;

-- Public read access for all tables (anyone can read)
CREATE POLICY "Public read access" ON teams FOR SELECT USING (true);
CREATE POLICY "Public read access" ON players FOR SELECT USING (true);
CREATE POLICY "Public read access" ON games FOR SELECT USING (true);
CREATE POLICY "Public read access" ON news FOR SELECT USING (true);
CREATE POLICY "Public read access" ON events FOR SELECT USING (true);
CREATE POLICY "Public read access" ON registrations FOR SELECT USING (true);
CREATE POLICY "Public read access" ON comments FOR SELECT USING (true);
CREATE POLICY "Public read access" ON likes FOR SELECT USING (true);

-- Teams: Only authenticated users can insert/update (for admin use later)
CREATE POLICY "Authenticated users can manage teams" ON teams
  FOR ALL USING (auth.role() = 'authenticated');

-- Players: Only authenticated users can insert/update (for admin use later)
CREATE POLICY "Authenticated users can manage players" ON players
  FOR ALL USING (auth.role() = 'authenticated');

-- Games: Only authenticated users can insert/update (for admin use later)
CREATE POLICY "Authenticated users can manage games" ON games
  FOR ALL USING (auth.role() = 'authenticated');

-- News: Only authenticated users can insert/update (for admin use later)
CREATE POLICY "Authenticated users can manage news" ON news
  FOR ALL USING (auth.role() = 'authenticated');

-- Events: Users can create and manage their own events
DROP POLICY IF EXISTS "Users can create events" ON events;
CREATE POLICY "Users can create events" ON events
  FOR INSERT WITH CHECK (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "Organizers can update their events" ON events;
CREATE POLICY "Organizers can update their events" ON events
  FOR UPDATE USING (auth.uid() = organizer_id);

DROP POLICY IF EXISTS "Organizers can delete their events" ON events;
CREATE POLICY "Organizers can delete their events" ON events
  FOR DELETE USING (auth.uid() = organizer_id);

-- Registrations: Users can create and manage their own registrations
DROP POLICY IF EXISTS "Users can create registrations" ON registrations;
CREATE POLICY "Users can create registrations" ON registrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their registrations" ON registrations;
CREATE POLICY "Users can update their registrations" ON registrations
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their registrations" ON registrations;
CREATE POLICY "Users can delete their registrations" ON registrations
  FOR DELETE USING (auth.uid() = user_id);

-- Event organizers can view all registrations for their events
CREATE POLICY "Organizers can view event registrations" ON registrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = registrations.event_id
      AND events.organizer_id = auth.uid()
    )
  );

-- Comments: Users can create, update, and delete their own comments
DROP POLICY IF EXISTS "Users can create comments" ON comments;
CREATE POLICY "Users can create comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their comments" ON comments;
CREATE POLICY "Users can update their comments" ON comments
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their comments" ON comments;
CREATE POLICY "Users can delete their comments" ON comments
  FOR DELETE USING (auth.uid() = user_id);

-- Likes: Users can create and delete their own likes
DROP POLICY IF EXISTS "Users can create likes" ON likes;
CREATE POLICY "Users can create likes" ON likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their likes" ON likes;
CREATE POLICY "Users can delete their likes" ON likes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 6. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get like count for an entity
CREATE OR REPLACE FUNCTION get_like_count(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM likes
    WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has liked an entity
CREATE OR REPLACE FUNCTION has_user_liked(
  p_user_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM likes
    WHERE user_id = p_user_id
    AND entity_type = p_entity_type
    AND entity_id = p_entity_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get registration count for an event
CREATE OR REPLACE FUNCTION get_registration_count(
  p_event_id UUID
)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM registrations
    WHERE event_id = p_event_id
    AND status = 'registered'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. CREATE USEFUL VIEWS
-- ============================================================================

-- View for games with team names
CREATE OR REPLACE VIEW games_with_teams AS
SELECT
  g.*,
  ht.name AS home_team_name,
  ht.logo_url AS home_team_logo,
  at.name AS away_team_name,
  at.logo_url AS away_team_logo
FROM games g
LEFT JOIN teams ht ON g.home_team_id = ht.id
LEFT JOIN teams at ON g.away_team_id = at.id;

-- View for events with organizer info and registration count
CREATE OR REPLACE VIEW events_with_details AS
SELECT
  e.*,
  get_registration_count(e.id) AS registration_count,
  (e.quota - get_registration_count(e.id)) AS available_spots
FROM events e;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Database setup completed successfully!';
  RAISE NOTICE '📊 Tables created: teams, players, games, news, events, registrations, comments, likes';
  RAISE NOTICE '🔒 RLS policies configured';
  RAISE NOTICE '📈 Indexes created for optimal performance';
  RAISE NOTICE '⚡ Triggers set up for auto-updating timestamps';
END $$;

