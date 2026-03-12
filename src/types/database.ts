// Database types matching supabase/schema.sql

export type AppRole = 'visitor' | 'analyst' | 'editor' | 'team_lead' | 'admin';
export type ClaimStatus = 'pending' | 'investigating' | 'verified' | 'debunked' | 'escalated';
export type EvidenceType = 'screenshot' | 'archive' | 'document' | 'social_post' | 'other';
export type ProfileStatus = 'pending_approval' | 'approved' | 'rejected' | 'suspended';
export type NotificationType = 'claim_assigned' | 'evidence_added' | 'status_changed' | 'team_mention' | 'registration' | 'system';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  status: ProfileStatus;
  language_pref: 'en' | 'sq';
  impact_score: number;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'member' | 'lead';
  joined_at: string;
}

export interface Claim {
  id: string;
  title: string;
  description: string | null;
  source_url: string | null;
  language: 'en' | 'sq';
  status: ClaimStatus;
  team_id: string | null;
  created_by: string;
  assigned_to: string | null;
  sbunker_source_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Evidence {
  id: string;
  claim_id: string;
  title: string;
  type: EvidenceType;
  file_url: string | null;
  uploaded_by: string;
  tags: string[];
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  team_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CampaignClaim {
  id: string;
  campaign_id: string;
  claim_id: string;
}

export interface Comment {
  id: string;
  claim_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface IntegrationConnection {
  id: string;
  user_id: string;
  provider: string;
  access_token: string | null;
  created_at: string;
}

export interface FeatureFlag {
  key: string;
  value: unknown;
  updated_by: string | null;
  updated_at: string;
}

export interface SbunkerFeedItem {
  id: string;
  title: string;
  url: string;
  excerpt: string | null;
  thumbnail_url: string | null;
  author: string | null;
  published_at: string | null;
  fetched_at: string;
  language: string | null;
  imported_claim_id: string | null;
}
