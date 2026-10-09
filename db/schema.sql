-- THIEPN Control P0 authoritative schema proposal (NOT applied).
-- Requires Supabase Auth (auth.users) and PostgreSQL with pgcrypto/gen_random_uuid().
-- Owner-scoped composite foreign keys prevent cross-user attachment/mutation.
-- Run only after P1 project setup, migration generation and independent security review.
BEGIN;

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 160),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  summary text,
  category text,
  lifecycle text NOT NULL DEFAULT 'inbox' CHECK (lifecycle IN ('inbox','planned','active','waiting','paused','completed','archived')),
  priority text CHECK (priority IN ('P0','P1','P2','P3')),
  manual_rank numeric(18,6),
  deadline_date date,
  deadline_kind text CHECK (deadline_kind IN ('hard','target')),
  next_action text,
  next_action_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  UNIQUE(owner_id,id), UNIQUE(owner_id,slug),
  CONSTRAINT deadline_pair CHECK ((deadline_date IS NULL) = (deadline_kind IS NULL))
);

CREATE TABLE public.project_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  project_id uuid NOT NULL,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  definition_of_done text NOT NULL CHECK (length(trim(definition_of_done)) > 0),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  is_current boolean NOT NULL DEFAULT false,
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft','approved','superseded','completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id,id),
  FOREIGN KEY (owner_id,project_id) REFERENCES public.projects(owner_id,id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX project_one_current_target ON public.project_targets(owner_id,project_id) WHERE is_current;

CREATE TABLE public.milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  target_id uuid NOT NULL,
  title text NOT NULL CHECK (length(trim(title)) > 0),
  sort_index integer NOT NULL DEFAULT 0,
  weight numeric(10,4) NOT NULL CHECK (weight > 0),
  completion_fraction numeric(6,5) CHECK (completion_fraction BETWEEN 0 AND 1),
  evidence_grade text NOT NULL DEFAULT 'unassessed' CHECK (evidence_grade IN ('unassessed','user_reported','ai_estimate','verified')),
  release_gate text NOT NULL DEFAULT 'none' CHECK (release_gate IN ('none','automated','human')),
  gate_passed boolean,
  verified_by text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id,id),
  FOREIGN KEY (owner_id,target_id) REFERENCES public.project_targets(owner_id,id) ON DELETE CASCADE,
  CONSTRAINT no_verification_without_source CHECK (evidence_grade <> 'verified' OR (verified_by IS NOT NULL AND verified_at IS NOT NULL)),
  CONSTRAINT no_100pct_failed_gate CHECK (NOT (completion_fraction = 1 AND release_gate <> 'none' AND gate_passed IS DISTINCT FROM true))
);

CREATE TABLE public.github_repositories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  github_repository_id bigint NOT NULL CHECK (github_repository_id > 0),
  full_name text NOT NULL,
  default_branch text,
  visibility text CHECK (visibility IN ('public','private','internal')),
  github_archived boolean,
  last_reconciled_at timestamptz,
  last_webhook_at timestamptz,
  UNIQUE(owner_id,id), UNIQUE(owner_id,github_repository_id)
);

CREATE TABLE public.project_repository_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  project_id uuid NOT NULL,
  repository_id uuid NOT NULL,
  link_role text NOT NULL DEFAULT 'primary' CHECK (link_role IN ('primary','related','deployment','legacy')),
  UNIQUE(owner_id,id), UNIQUE(owner_id,project_id,repository_id),
  -- A repository can appear in multiple projects only after explicit redesign; P0 disallows this.
  UNIQUE(owner_id,repository_id),
  FOREIGN KEY (owner_id,project_id) REFERENCES public.projects(owner_id,id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id,repository_id) REFERENCES public.github_repositories(owner_id,id) ON DELETE CASCADE
);

CREATE TABLE public.development_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  project_id uuid NOT NULL,
  phase_key text NOT NULL,
  title text,
  state text NOT NULL DEFAULT 'planned' CHECK (state IN ('planned','in_progress','verification','blocked','qualified','released')),
  head_sha text CHECK (head_sha IS NULL OR head_sha ~ '^[0-9a-f]{40}$'),
  head_branch text,
  pr_url text,
  release_sha text CHECK (release_sha IS NULL OR release_sha ~ '^[0-9a-f]{40}$'),
  review_needed boolean NOT NULL DEFAULT true,
  notes text,
  UNIQUE(owner_id,id), UNIQUE(owner_id,project_id,phase_key),
  FOREIGN KEY (owner_id,project_id) REFERENCES public.projects(owner_id,id) ON DELETE CASCADE
);

CREATE TABLE public.evidence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  repository_id uuid NOT NULL,
  project_id uuid,
  provider text NOT NULL CHECK (provider IN ('github','manual','deployment')),
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  event_sha text,
  observed_at timestamptz NOT NULL DEFAULT now(),
  occurred_at timestamptz,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(owner_id,id), UNIQUE(owner_id,provider,provider_event_id),
  FOREIGN KEY (owner_id,repository_id) REFERENCES public.github_repositories(owner_id,id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id,project_id) REFERENCES public.projects(owner_id,id) ON DELETE SET NULL (project_id)
);

CREATE TABLE public.focus_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id,id), UNIQUE(owner_id,week_start)
);
CREATE TABLE public.focus_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  project_id uuid NOT NULL,
  slot smallint NOT NULL CHECK (slot BETWEEN 1 AND 3),
  objective text NOT NULL CHECK (length(trim(objective)) > 0),
  UNIQUE(owner_id,id), UNIQUE(owner_id,plan_id,slot), UNIQUE(owner_id,plan_id,project_id),
  FOREIGN KEY (owner_id,plan_id) REFERENCES public.focus_plans(owner_id,id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id,project_id) REFERENCES public.projects(owner_id,id) ON DELETE CASCADE
);

CREATE TABLE public.ai_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  project_id uuid NOT NULL,
  proposal_type text NOT NULL CHECK (proposal_type IN ('priority','phase','progress','next_action','status','deadline','classification')),
  before_value jsonb NOT NULL,
  proposed_value jsonb NOT NULL,
  rationale text NOT NULL,
  evidence_event_ids uuid[] NOT NULL DEFAULT '{}',
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','accepted','rejected','superseded')),
  model_info text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  UNIQUE(owner_id,id),
  FOREIGN KEY (owner_id,project_id) REFERENCES public.projects(owner_id,id) ON DELETE CASCADE
);

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid,
  actor text NOT NULL CHECK (actor IN ('user','sync','ai_proposal_approved','system')),
  action text NOT NULL,
  previous_data jsonb,
  new_data jsonb,
  source_ref text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id,id),
  FOREIGN KEY (owner_id,project_id) REFERENCES public.projects(owner_id,id) ON DELETE SET NULL (project_id)
);

-- Client role may read only its own rows. Writes are server-only through
-- authenticated, ownership-checked endpoints and a private Supabase secret key.
-- This prevents clients from fabricating evidence, audits or approvals.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'projects','project_targets','milestones','github_repositories',
    'project_repository_links','development_phases','evidence_events',
    'focus_plans','focus_items','ai_proposals','audit_log'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('CREATE POLICY owner_select ON public.%I FOR SELECT TO authenticated USING ((select auth.uid()) = owner_id)',table_name);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated',table_name);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated',table_name);
  END LOOP;
END $$;
COMMIT;
