
import { createClient, User } from '@supabase/supabase-js';
import { Trainer, TrainerFile } from '../types';

const SUPABASE_URL = 'https://vszdooyhquayizpqflzr.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_o46jC9sRLAeBppMlxHgd8A_nQI8rew9';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const db = {
  // --- Auth Operations ---
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // --- Trainer Operations ---
  async getTrainers(): Promise<Trainer[]> {
    try {
      const { data, error } = await supabase
        .from('trainers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Trainer[];
    } catch (err: any) {
      console.error("Supabase Fetch Error:", err.message);
      // Detailed error for "Failed to fetch"
      if (err.message === 'Failed to fetch') {
         throw new Error("Unable to connect to the secure registry. Please check your network or project status.");
      }
      return [];
    }
  },

  async createTrainer(trainer: Omit<Trainer, 'id' | 'certificationId'>): Promise<Trainer> {
    try {
      const { count } = await supabase.from('trainers').select('*', { count: 'exact', head: true });
      const nextNum = ((count || 0) + 1).toString().padStart(4, '0');
      const year = new Date().getFullYear();
      const certificationId = `ILA-CLT-${year}-${nextNum}`;

      const newTrainer = {
        ...trainer,
        id: crypto.randomUUID(),
        certificationId,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('trainers')
        .insert([newTrainer])
        .select()
        .single();

      if (error) throw error;
      return data as Trainer;
    } catch (err: any) {
      throw new Error(`Cloud Save Failed: ${err.message}`);
    }
  },

  async updateTrainer(id: string, updates: Partial<Trainer>): Promise<Trainer> {
    try {
      // CLEAN DATA: Remove immutable fields to prevent Supabase 400/403 errors
      const cleanUpdates = { ...updates };
      delete (cleanUpdates as any).id;
      delete (cleanUpdates as any).certificationId;
      delete (cleanUpdates as any).created_at;
      delete (cleanUpdates as any).files; // Skip complex objects if not properly handled

      const { data, error } = await supabase
        .from('trainers')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Trainer;
    } catch (err: any) {
      console.error("Update failed:", err);
      throw new Error(`Institutional Update Failed: ${err.message}`);
    }
  },

  async deleteTrainer(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('trainers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err: any) {
      throw new Error(`Cloud Deletion Failed: ${err.message}`);
    }
  },

  // Storage Operations for Official Certificates
  async uploadDocument(trainerId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${trainerId}/${Math.random()}.${fileExt}`;
    const filePath = `documents/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('trainer-vault')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('trainer-vault')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
};
