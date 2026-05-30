import { supabase } from './supabase';

export interface CoachingResult {
  content: string;
  cached: boolean;
}

export async function getCoachingNudge(): Promise<CoachingResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-coaching');
    if (error || !data?.content) return null;
    return { content: data.content, cached: data.cached ?? false };
  } catch {
    return null;
  }
}

export async function getReflection(period: 'weekly' | 'monthly'): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-reflection', {
      body: { period },
    });
    if (error || !data?.content) return null;
    return data.content as string;
  } catch {
    return null;
  }
}
