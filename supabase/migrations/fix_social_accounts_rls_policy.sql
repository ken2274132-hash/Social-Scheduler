-- Fix Pinterest Connection Error: Update RLS policies for social_accounts table
-- Problem: The "FOR ALL" policy with only USING clause blocks INSERT operations
-- Solution: Split into separate INSERT/UPDATE/DELETE policies with proper clauses

-- Drop the old "FOR ALL" policy that was blocking inserts
DROP POLICY IF EXISTS "Workspace admins can manage social accounts" ON social_accounts;

-- Create separate policies with proper USING and WITH CHECK clauses
CREATE POLICY "Workspace admins can insert social accounts"
    ON social_accounts FOR INSERT
    WITH CHECK (check_is_workspace_admin(workspace_id));

CREATE POLICY "Workspace admins can update social accounts"
    ON social_accounts FOR UPDATE
    USING (check_is_workspace_admin(workspace_id));

CREATE POLICY "Workspace admins can delete social accounts"
    ON social_accounts FOR DELETE
    USING (check_is_workspace_admin(workspace_id));
