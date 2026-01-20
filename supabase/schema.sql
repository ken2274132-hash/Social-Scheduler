-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Workspaces Table
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workspace Members Table
CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- Social Accounts Table (Instagram only for MVP)
CREATE TABLE IF NOT EXISTS social_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    platform TEXT NOT NULL DEFAULT 'instagram' CHECK (platform IN ('instagram', 'facebook')),
    account_name TEXT,
    account_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    token_expires_at TIMESTAMPTZ,
    profile_picture_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, account_id)
);

-- Media Assets Table
CREATE TABLE IF NOT EXISTS media_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('image', 'video')),
    file_size_bytes BIGINT,
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Generations Table
CREATE TABLE IF NOT EXISTS ai_generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    media_id UUID REFERENCES media_assets(id) ON DELETE CASCADE,
    hooks JSONB,
    captions JSONB,
    hashtags JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Posts Table
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    social_account_id UUID REFERENCES social_accounts(id) ON DELETE SET NULL,
    media_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
    caption TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
    platform_post_id TEXT,
    error_message TEXT,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post Logs Table
CREATE TABLE IF NOT EXISTS post_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    event TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_logs ENABLE ROW LEVEL SECURITY;

-- Workspaces Policies
CREATE POLICY "Users can view their own workspaces"
    ON workspaces FOR SELECT
    USING (
        owner_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM workspace_members 
            WHERE workspace_id = workspaces.id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create workspaces"
    ON workspaces FOR INSERT
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Workspace owners can update their workspaces"
    ON workspaces FOR UPDATE
    USING (owner_id = auth.uid());

CREATE POLICY "Workspace owners can delete their workspaces"
    ON workspaces FOR DELETE
    USING (owner_id = auth.uid());

-- Workspace Members Policies
CREATE POLICY "Users can view workspace members"
    ON workspace_members FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Workspace admins can manage members"
    ON workspace_members FOR ALL
    USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Social Accounts Policies
CREATE POLICY "Users can view social accounts in their workspaces"
    ON social_accounts FOR SELECT
    USING (
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()) OR
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Workspace admins can manage social accounts"
    ON social_accounts FOR ALL
    USING (
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()) OR
        workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role = 'admin')
    );

-- Media Assets Policies
CREATE POLICY "Users can view media in their workspaces"
    ON media_assets FOR SELECT
    USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create media in their workspaces"
    ON media_assets FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
        )
    );

-- AI Generations Policies
CREATE POLICY "Users can view AI generations for their media"
    ON ai_generations FOR SELECT
    USING (
        media_id IN (
            SELECT id FROM media_assets WHERE workspace_id IN (
                SELECT id FROM workspaces WHERE owner_id = auth.uid()
                UNION
                SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create AI generations"
    ON ai_generations FOR INSERT
    WITH CHECK (true);

-- Posts Policies
CREATE POLICY "Users can view posts in their workspaces"
    ON posts FOR SELECT
    USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create posts in their workspaces"
    ON posts FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
        )
    );

CREATE POLICY "Users can update posts in their workspaces"
    ON posts FOR UPDATE
    USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role IN ('admin', 'editor')
        )
    );

-- Post Logs Policies
CREATE POLICY "Users can view post logs"
    ON post_logs FOR SELECT
    USING (
        post_id IN (
            SELECT id FROM posts WHERE workspace_id IN (
                SELECT id FROM workspaces WHERE owner_id = auth.uid()
                UNION
                SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
            )
        )
    );

-- Create indexes for better performance
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX idx_social_accounts_workspace_id ON social_accounts(workspace_id);
CREATE INDEX idx_media_assets_workspace_id ON media_assets(workspace_id);
CREATE INDEX idx_posts_workspace_id ON posts(workspace_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_scheduled_at ON posts(scheduled_at);
CREATE INDEX idx_post_logs_post_id ON post_logs(post_id);

-- Function to auto-create workspace on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.workspaces (name, owner_id)
    VALUES (
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'My') || '''s Workspace',
        NEW.id
    );
    RETURN NEW;
END;
$$;

-- Trigger to call function on new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
