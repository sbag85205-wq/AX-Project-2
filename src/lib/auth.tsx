import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { loginEmail, supabase } from './supabase';
import type { Profile, Role } from './types';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** 로그인 직후 계정 유형을 확인하는 중. 이때는 로그인 화면을 그대로 둔다 */
  verifying: boolean;
  signIn: (loginId: string, password: string, expectedRole?: Role) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/** expectedRole을 주면 그 유형의 계정만 들어올 수 있다. 다르면 바로 로그아웃하고 맞는 탭을 안내한다.
 *  (냥대리 화면은 src/nyang/transport.ts에서 같은 확인을 한다) */
export async function signInAs(loginId: string, password: string, expectedRole?: Role) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail(loginId), password });
  if (error) throw new Error(error.message.includes('Invalid') ? '아이디 또는 비밀번호가 맞지 않아요.' : error.message);
  if (!expectedRole) return data.session;
  const { data: row } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
  const role = (row as { role: Role } | null)?.role;
  if (role !== expectedRole) {
    await supabase.auth.signOut();
    throw new Error(role === 'admin'
      ? '담당자 계정이에요. 담당자 탭에서 로그인해 주세요.'
      : '담당자 계정이 아니에요. 직원 탭에서 로그인해 주세요.');
  }
  return data.session;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) return;
    let stale = false;
    setLoading(true);
    supabase.from('profiles').select('*').eq('id', userId).single().then(({ data }) => {
      // 그사이 로그아웃·계정 변경이 있었으면 늦게 온 결과는 버린다
      if (stale) return;
      setProfile(data as Profile | null);
      setLoading(false);
    });
    return () => {
      stale = true;
    };
  }, [userId]);

  const signIn = async (loginId: string, password: string, expectedRole?: Role) => {
    setVerifying(true);
    try {
      await signInAs(loginId, password, expectedRole);
    } finally {
      setVerifying(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return <AuthContext.Provider value={{ session, profile, loading, verifying, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
