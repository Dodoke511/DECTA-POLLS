-- Migration: Add Public Read Policies for Election URL Resolution
-- These policies allow the public 'anon' user to lookup tenants and elections by their slugs.

-- 1. Tenants: Allow public read for verified tenants
CREATE POLICY "Public read verified tenants" ON tenants
FOR SELECT TO anon
USING (is_verified = true);

-- 2. Election: Allow public read for all elections
-- Note: Draft elections are still protected by the application-level security gate in the layout
CREATE POLICY "Public read elections" ON election
FOR SELECT TO anon
USING (true);

-- 3. Site Config: Allow public read for site branding and settings
CREATE POLICY "Public read site config" ON election_site_config
FOR SELECT TO anon
USING (true);

-- 4. Election Phases: Allow public read for navigation building
CREATE POLICY "Public read election phases" ON election_phases
FOR SELECT TO anon
USING (true);
