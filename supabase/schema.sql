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

-- Users Table (RBAC - extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'super_admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'banned', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Super Admin Check Function (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Users Table Policies
CREATE POLICY "Users can view their own profile"
    ON public.users FOR SELECT
    USING (id = auth.uid() OR is_super_admin());

CREATE POLICY "Super admins can view all users"
    ON public.users FOR SELECT
    USING (is_super_admin());

CREATE POLICY "Super admins can update users"
    ON public.users FOR UPDATE
    USING (is_super_admin());

-- Sync auth.users to public.users on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id, email, role, status)
    VALUES (NEW.id, NEW.email, 'user', 'active')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();


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

-- Helper function to check workspace membership without recursion
CREATE OR REPLACE FUNCTION public.check_is_workspace_admin(target_workspace_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.workspaces w
        WHERE w.id = target_workspace_id AND w.owner_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = target_workspace_id 
        AND wm.user_id = auth.uid() 
        AND wm.role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.check_is_workspace_member(target_workspace_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.workspaces w
        WHERE w.id = target_workspace_id AND w.owner_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = target_workspace_id 
        AND wm.user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Workspace Members Policies
CREATE POLICY "Users can view workspace members"
    ON workspace_members FOR SELECT
    USING (user_id = auth.uid() OR check_is_workspace_member(workspace_id));

CREATE POLICY "Workspace admins can manage members"
    ON workspace_members FOR ALL
    USING (check_is_workspace_admin(workspace_id));

-- Social Accounts Policies
CREATE POLICY "Users can view social accounts in their workspaces"
    ON social_accounts FOR SELECT
    USING (check_is_workspace_member(workspace_id));

CREATE POLICY "Workspace admins can manage social accounts"
    ON social_accounts FOR ALL
    USING (check_is_workspace_admin(workspace_id));

-- Media Assets Policies
CREATE POLICY "Users can view media in their workspaces"
    ON media_assets FOR SELECT
    USING (check_is_workspace_member(workspace_id));

CREATE POLICY "Users can create media in their workspaces"
    ON media_assets FOR INSERT
    WITH CHECK (check_is_workspace_member(workspace_id));

-- AI Generations Policies
CREATE POLICY "Users can view AI generations for their media"
    ON ai_generations FOR SELECT
    USING (
        media_id IN (
            SELECT id FROM media_assets WHERE check_is_workspace_member(workspace_id)
        )
    );

CREATE POLICY "Users can create AI generations"
    ON ai_generations FOR INSERT
    WITH CHECK (true);

-- Posts Policies
CREATE POLICY "Users can view posts in their workspaces"
    ON posts FOR SELECT
    USING (check_is_workspace_member(workspace_id));

CREATE POLICY "Users can create posts in their workspaces"
    ON posts FOR INSERT
    WITH CHECK (check_is_workspace_member(workspace_id));

CREATE POLICY "Users can update posts in their workspaces"
    ON posts FOR UPDATE
    USING (check_is_workspace_member(workspace_id));

-- Post Logs Policies
CREATE POLICY "Users can view post logs"
    ON post_logs FOR SELECT
    USING (
        post_id IN (
            SELECT id FROM posts WHERE check_is_workspace_member(workspace_id)
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

-- STORAGE POLICIES
-- Ensure the 'media' bucket exists and is public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on objects (it usually is, but good to ensure)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow users to upload to folders named after their workspace ID
CREATE POLICY "Users can upload media to their workspace"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'media' AND
    auth.role() = 'authenticated' AND
    public.check_is_workspace_member( (SPLIT_PART(name, '/', 1))::uuid )
);

-- Allow users to view media in their workspace (and public access)
CREATE POLICY "Users can view media in their workspace"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'media'
    -- Since it's public, we technically don't need restricted SELECT, 
    -- but this helps if we ever make it private.
    -- For now, just allow bucket access.
);

-- Allow users to update/delete their media
CREATE POLICY "Users can update their media"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'media' AND
    auth.role() = 'authenticated' AND
    public.check_is_workspace_member( (SPLIT_PART(name, '/', 1))::uuid )
);

CREATE POLICY "Users can delete their media"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'media' AND
    auth.role() = 'authenticated' AND
    public.check_is_workspace_member( (SPLIT_PART(name, '/', 1))::uuid )
);
