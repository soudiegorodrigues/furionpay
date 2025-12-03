import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useAdminAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  const checkIfBlocked = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('check_user_blocked' as any);
      
      if (error) {
        console.error('Error checking blocked status:', error);
        return false;
      }
      
      if (data === true) {
        setIsBlocked(true);
        await signOut();
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Error in checkIfBlocked:', err);
      return false;
    }
  }, [signOut]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Check if user is blocked when they sign in
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(() => {
            checkIfBlocked();
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Check if existing user is blocked
      if (session?.user) {
        setTimeout(() => {
          checkIfBlocked();
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkIfBlocked]);

  // Periodically check if user is blocked (every 30 seconds)
  useEffect(() => {
    if (!session?.user) return;
    
    const interval = setInterval(() => {
      checkIfBlocked();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [session?.user, checkIfBlocked]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/admin/dashboard`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/admin`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });
    return { error };
  };

  return {
    user,
    session,
    loading,
    isBlocked,
    signIn,
    signUp,
    signOut,
    resetPassword,
    checkIfBlocked,
    isAuthenticated: !!session
  };
};