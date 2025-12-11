import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useAdminAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

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

  const checkIfAdmin = useCallback(async () => {
    setAdminLoading(true);
    try {
      const { data, error } = await supabase.rpc('is_admin_authenticated');
      
      if (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        return false;
      }
      
      setIsAdmin(data === true);
      return data === true;
    } catch (err) {
      console.error('Error in checkIfAdmin:', err);
      setIsAdmin(false);
      return false;
    } finally {
      setAdminLoading(false);
    }
  }, []);

  const checkIfApproved = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('check_user_approved' as any);
      
      if (error) {
        console.error('Error checking approved status:', error);
        setIsApproved(false);
        return false;
      }
      
      setIsApproved(data === true);
      return data === true;
    } catch (err) {
      console.error('Error in checkIfApproved:', err);
      setIsApproved(false);
      return false;
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Check if user is blocked, admin, and approved when they sign in
        if (event === 'SIGNED_IN' && session?.user) {
          checkIfBlocked();
          checkIfAdmin();
          checkIfApproved();
        }
        
        if (event === 'SIGNED_OUT') {
          setIsAdmin(false);
          setIsApproved(false);
          setAdminLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Check if existing user is blocked, admin, and approved
      if (session?.user) {
        checkIfBlocked();
        await checkIfAdmin();
        await checkIfApproved();
      } else {
        setIsAdmin(false);
        setIsApproved(false);
        setAdminLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkIfBlocked, checkIfAdmin, checkIfApproved]);

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

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/admin/dashboard`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName || ''
        }
      }
    });

    // If signup successful and we have a user, create profile
    if (!error && data?.user && fullName) {
      await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          full_name: fullName
        }, { onConflict: 'id' });
    }

    return { error };
  };

  const sendOtpCode = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      }
    });
    return { error };
  };

  const verifyOtpCode = async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email'
    });
    return { data, error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
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
    loading: loading || adminLoading,
    isBlocked,
    isAdmin,
    isApproved,
    signIn,
    signUp,
    signOut,
    resetPassword,
    sendOtpCode,
    verifyOtpCode,
    updatePassword,
    checkIfBlocked,
    checkIfAdmin,
    checkIfApproved,
    isAuthenticated: !!session
  };
};