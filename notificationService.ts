
import { GoogleGenAI } from "@google/genai";
import { supabase } from "./database";
import { NotificationType, EmailLog } from "../types";

// Fix: Use named parameter for apiKey as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const notificationService = {
  /**
   * Generates a professional email body using Gemini
   */
  async draftEmail(type: NotificationType, trainerName: string, additionalInfo?: string) {
    try {
      const prompt = `Write a professional, executive email in Arabic for a legal trainer named ${trainerName}. 
      Type of email: ${type}. 
      Institutional Branding: International Legal Academy (ILA-CLT™).
      Context: ${additionalInfo || 'General communication'}.
      Format: Return ONLY the subject line on the first line, then the body. No placeholders like [Name], use the actual name.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      const text = response.text || "";
      const lines = text.split('\n');
      return {
        subject: lines[0].replace('Subject:', '').trim(),
        body: lines.slice(1).join('\n').trim()
      };
    } catch (error) {
      console.error("AI Email Drafting failed", error);
      return null;
    }
  },

  /**
   * Triggers a real email send via Supabase Edge Function
   */
  async sendEmail(trainerId: string, trainerName: string, trainerEmail: string, type: NotificationType, subject: string, body: string): Promise<EmailLog> {
    try {
      // 1. Invoke the Supabase Edge Function
      const { data: functionData, error: functionError } = await supabase.functions.invoke('send-email', {
        body: { 
          to: trainerEmail,
          subject: subject,
          html: body.replace(/\n/g, '<br>'),
          trainerName: trainerName
        }
      });

      if (functionError) {
         console.warn("Edge Function failed to transmit, but we will log the attempt:", functionError.message);
      }

      // 2. Log the attempt in our tracking table with a client-generated UUID to prevent key collisions
      const newLog: EmailLog = {
        id: crypto.randomUUID(), // Fix: Generate ID on client side
        trainerId,
        trainerName,
        type,
        subject,
        sentAt: new Date().toISOString(),
        status: functionError ? 'FAILED' : 'DELIVERED'
      };

      const { data, error } = await supabase
        .from('email_logs')
        .insert([newLog])
        .select()
        .single();

      if (error) {
        // If the error is still a duplicate key, it might be due to a race condition or table state
        if (error.code === '23505') {
            console.warn("Duplicate key detected, retrying with new UUID...");
            newLog.id = crypto.randomUUID();
            const retry = await supabase.from('email_logs').insert([newLog]).select().single();
            if (retry.error) throw retry.error;
            return retry.data as EmailLog;
        }
        throw error;
      }
      
      return data as EmailLog;
    } catch (err: any) {
      console.error("Email Sending/Logging failure:", err.message || err);
      throw err;
    }
  },

  async getLogs(): Promise<EmailLog[]> {
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('sentAt', { ascending: false });

      if (error) return [];
      return data as EmailLog[];
    } catch (e) {
      return [];
    }
  }
};
