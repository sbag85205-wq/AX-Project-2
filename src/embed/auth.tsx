// src/lib/auth.tsx 대신 쓰인다(vite.embed.config.ts). 로그인은 냥대리가 하고, 여기서는 연결된 Knowly 계정의 프로필만 읽는다.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { sessionNow } from './session';
import type { Profile, Role } from '../lib/types';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  verifying: boolean;
  signIn: (loginId: string, password: string, expectedRole?: Role) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);
const unsupported = async () => { throw new Error('로그인과 로그아웃은 냥대리 화면에서 해 주세요.'); };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const id = sessionNow()?.user_id;
    if (!id) { setLoading(false); return; }
    supabase.from('profiles').select('*').eq('id', id).maybeSingle().then(({ data }) => {
      setProfile((data as Profile) ?? null);
      setLoading(false);
    });
  }, []);
  const session = (sessionNow() ? ({} as Session) : null);
  return <AuthContext.Provider value={{ session, profile, loading, verifying: false, signIn: unsupported, signOut: unsupported }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
