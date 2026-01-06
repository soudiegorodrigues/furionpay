import { useState, useCallback } from 'react';
import { AuthenticatorAssuranceLevels, Factor } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuthSession, useUserStatus } from './useAuthSession';

interface MFAInfo {
  currentLevel: AuthenticatorAssuranceLevels | null;
  nextLevel: AuthenticatorAssuranceLevels | null;
  currentAuthenticationMethods: string[];
  hasTOTPFactor: boolean;
  verifiedFactors: Factor[];
  unverifiedFactors: Factor[];
}

export const useAdminAuth = () => {
  // Use cached session hook instead of local state
  const { session, user, loading: sessionLoading } = useAuthSession();
  
  // Use cached user status hook (isBlocked, isAdmin, isApproved)
  const { 
    isBlocked, 
    isAdmin, 
    isApproved, 
    loading: statusLoading,
    refresh: refreshStatus 
  } = useUserStatus(user?.id);
  
  const [mfaInfo, setMfaInfo] = useState<MFAInfo | null>(null);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  // Keep these for compatibility but they now just trigger cache refresh
  const checkIfBlocked = useCallback(async () => {
    refreshStatus();
    return isBlocked;
  }, [refreshStatus, isBlocked]);

  const checkIfAdmin = useCallback(async () => {
    refreshStatus();
    return isAdmin;
  }, [refreshStatus, isAdmin]);

  const checkIfApproved = useCallback(async () => {
    refreshStatus();
    return isApproved;
  }, [refreshStatus, isApproved]);

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

  // MFA status is checked only when needed, not on every render

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
    loading: sessionLoading || statusLoading,
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