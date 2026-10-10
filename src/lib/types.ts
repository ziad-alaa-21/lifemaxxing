export type UserProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bodyweight_kg: number | null;
  height_cm: number | null;
  academic_target_gpa: number | null;
  created_at: string;
  updated_at: string;
};

export type Pillar = 'today' | 'body' | 'mind' | 'school' | 'settings';

export interface TelemetryStatus {
  systemVersion: string;
  engineStatus: 'optimal' | 'calibrating' | 'syncing';
  activePillar: Pillar;
}
