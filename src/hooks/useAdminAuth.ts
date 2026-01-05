import { useState, useEffect, useCallback } from 'react';
import { User, Session, AuthenticatorAssuranceLevels, Factor } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface MFAInfo {
  currentLevel: AuthenticatorAssuranceLevels | null;
  nextLevel: AuthenticatorAssuranceLevels | null;
  currentAuthenticationMethods: string[];
  hasTOTPFactor: boolean;
  verifiedFactors: Factor[];
  unverifiedFactors: Factor[];
}

export const useAdminAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [mfaInfo, setMfaInfo] = useState<MFAInfo | null>(null);

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

  // Check MFA status
  const checkMFAStatus = useCallback(async (): Promise<MFAInfo | null> => {
    try {
      const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      if (aalError) {
        console.error('Error checking AAL:', aalError);
        return null;
      }

      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      
      if (factorsError) {
        console.error('Error listing factors:', factorsError);
        return null;
      }

      const verifiedFactors = factorsData?.totp?.filter(f => f.status === 'verified') || [];
      const unverifiedFactors = factorsData?.totp?.filter(f => f.status !== 'verified') || [];

      const info: MFAInfo = {
        currentLevel: aalData?.currentLevel || null,
        nextLevel: aalData?.nextLevel || null,
        currentAuthenticationMethods: aalData?.currentAuthenticationMethods?.map(m => m.method) || [],
        hasTOTPFactor: verifiedFactors.length > 0,
        verifiedFactors,
        unverifiedFactors
      };

      setMfaInfo(info);
      return info;
    } catch (err) {
      console.error('Error in checkMFAStatus:', err);
      return null;
    }
  }, []);

  // Check if user needs MFA verification (has factor but hasn't verified in this session)
  const needsMFAVerification = useCallback(async (): Promise<boolean> => {
    const info = await checkMFAStatus();
    if (!info) return false;
    
    // User has TOTP factor but current session is only aal1
    return info.hasTOTPFactor && info.currentLevel === 'aal1' && info.nextLevel === 'aal2';
  }, [checkMFAStatus]);

  // Verify TOTP code
  const verifyTOTP = useCallback(async (factorId: string, code: string) => {
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      
      if (challengeError) {
        return { error: challengeError };
      }

      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code
      });

      if (!error) {
        await checkMFAStatus();
      }

      return { data, error };
    } catch (err: any) {
      return { error: err };
    }
  }, [checkMFAStatus]);

  // Enroll TOTP factor
  const enrollTOTP = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App'
      });

      return { data, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  }, []);

  // Verify and complete TOTP enrollment
  const verifyTOTPEnrollment = useCallback(async (factorId: string, code: string) => {
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      
      if (challengeError) {
        return { error: challengeError };
      }

      const { data, error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code
      });

      if (!error) {
        await checkMFAStatus();
      }

      return { data, error };
    } catch (err: any) {
      return { error: err };
    }
  }, [checkMFAStatus]);

  // Unenroll TOTP factor (disable 2FA)
  const unenrollTOTP = useCallback(async (factorId: string) => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      
      if (!error) {
        await checkMFAStatus();
      }

      return { error };
    } catch (err: any) {
      return { error: err };
    }
  }, [checkMFAStatus]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Check if user is blocked, admin, and approved when they sign in - run in parallel
        if (event === 'SIGNED_IN' && session?.user) {
          checkIfBlocked();
          Promise.all([checkIfAdmin(), checkIfApproved(), checkMFAStatus()]);
        }
        
        if (event === 'SIGNED_OUT') {
          setIsAdmin(false);
          setIsApproved(false);
          setAdminLoading(false);
          setMfaInfo(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Check if existing user is blocked, admin, and approved - run in parallel for faster loading
      if (session?.user) {
        checkIfBlocked();
        // Run admin, approved, and MFA checks in parallel
        await Promise.all([
          checkIfAdmin(),
          checkIfApproved(),
          checkMFAStatus()
        ]);
      } else {
        setIsAdmin(false);
        setIsApproved(false);
        setAdminLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkIfBlocked, checkIfAdmin, checkIfApproved, checkMFAStatus]);

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
    mfaInfo,
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
    checkMFAStatus,
    needsMFAVerification,
    verifyTOTP,
    enrollTOTP,
    verifyTOTPEnrollment,
    unenrollTOTP,
    isAuthenticated: !!session
  };
};