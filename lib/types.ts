export type RsvpStatus = "attending" | "maybe" | "declined";

export const RSVP_STATUSES: readonly RsvpStatus[] = ["attending", "maybe", "declined"] as const;

export const RSVP_STATUS_LABEL: Record<RsvpStatus, string> = {
  attending: "Attending",
  maybe: "Maybe",
  declined: "Can't make it",
};

export interface EventRecord {
  id: string;
  title: string;
  host_name: string;
  event_date: string | null;
  timezone: string;
  location_name: string;
  location_url: string | null;
  dress_code: string;
  description: string;
  rsvp_deadline: string | null;
  created_at: string;
  updated_at: string;
}

export interface GuestRecord {
  id: string;
  event_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RsvpRecord {
  id: string;
  guest_id: string;
  status: RsvpStatus;
  message: string | null;
  responded_at: string;
  updated_at: string;
}

/** Payload undangan publik. Tidak pernah memuat token atau token_hash. */
export interface InvitationView {
  guest: { id: string; name: string };
  event: {
    title: string;
    host_name: string;
    event_date: string | null;
    timezone: string;
    location_name: string;
    location_url: string | null;
    dress_code: string;
    description: string;
    rsvp_deadline: string | null;
  };
  rsvp: { status: RsvpStatus; message: string | null; updated_at: string } | null;
  deadline_passed: boolean;
}

export interface GuestSummaryRow {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  status: RsvpStatus | null;
  message: string | null;
  responded_at: string | null;
  updated_at: string | null;
}
