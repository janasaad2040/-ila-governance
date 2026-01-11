
export enum TrainerStatus {
  ACTIVE = 'Active',
  RENEWAL_DUE = 'Renewal Due',
  EXPIRED = 'Expired',
  SUSPENDED = 'Suspended'
}

export enum NotificationType {
  WELCOME = 'Welcome Email',
  RENEWAL_REMINDER = 'Renewal Reminder',
  STATUS_CHANGE = 'Status Update',
  CUSTOM = 'Custom Message'
}

export interface EmailLog {
  id: string;
  trainerId: string;
  trainerName: string;
  type: NotificationType;
  sentAt: string;
  status: 'DELIVERED' | 'FAILED' | 'PENDING';
  subject: string;
}

export interface Trainer {
  id: string; 
  certificationId: string; 
  fullName: string;
  email: string;
  specialties: string[];
  issueDate: string | null;
  expiryDate: string | null;
  renewalDueDate: string | null;
  status: TrainerStatus;
  photoUrl?: string;
  bio?: string;
  files: TrainerFile[];
}

export interface TrainerFile {
  name: string;
  url: string;
  type: 'PDF' | 'IMAGE' | 'DOC';
  uploadedAt: string;
}

export interface DashboardStats {
  totalTrainers: number;
  activeTrainers: number;
  renewalDueCount: number;
  expiredCount: number;
  pendingCommunications: number;
}
