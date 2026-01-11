
import { TrainerStatus } from './types';

export const COLORS = {
  primary: '#0a192f', // Dark Navy
  secondary: '#3b82f6', // Electric Blue
  surface: '#112240', // Elevated Navy
  accent: '#ffffff',
  success: '#10b981',
  warning: '#fbbf24',
  danger: '#ef4444',
  text: {
    primary: '#ffffff',
    secondary: '#94a3b8',
    muted: '#64748b'
  }
};

export const STATUS_COLORS: Record<TrainerStatus, string> = {
  [TrainerStatus.ACTIVE]: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  [TrainerStatus.RENEWAL_DUE]: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  [TrainerStatus.EXPIRED]: 'bg-red-500/10 text-red-400 border-red-500/20',
  [TrainerStatus.SUSPENDED]: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};