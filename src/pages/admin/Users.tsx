import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { callFunction, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import type { Department, Profile, Role } from '../../lib/types';

const empty = { login_id: '', display_name: '', department_id: '', role: 'employee' as Role, password: '' };

export default function Users() {
  const toast = useToast();
  const { profile: me } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [newDept, setNewDept] = useState('');
  const [resetFor, setResetFor] = useState<Profile | null>(null);
  const [newPw, setNewPw] = useState('');

  const load = useCallback(async () => {
    const [{ data: u }, { data: d }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at'),
      supabase.from('departments').select('id, name').order('name')
    ]);
    setUsers((u as Profile[]) ?? []);
    setDepts((d as Department[]) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await callFunction('admin-users', { action: 'create', ...form, department_id: form.department_id || null });
      toast(`'${form.login_id}' 계정을 만들었어요. 아이디와 초기 비밀번호를 직원에게 전달해 주세요.`);
      setForm(empty);
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const update = async (u: Profile, patch: Partial<Profile>) => {
    const { error: e } = await supabase.from('profiles').update(patch).eq('id', u.id);
    if (e) return toast('변경하지 못했어요.');
    toast('변경했어요.');
    load();
  };

  const remove = async (u: Profile) => {
    if (!window.confirm(`'${u.login_id}' 계정을 삭제할까요? 이 직원의 대화 기록도 함께 삭제돼요.`)) return;
    try {
      await callFunction('admin-users', { action: 'delete', user_id: u.id });
      toast('계정을 삭제했어요.');
      load();
    } catch (err) {
      toast(errorMessage(err));
    }
  };

  const resetPassword = async () => {
    if (!resetFor) return;
    try {
      await callFunction('admin-users', { action: 'reset_password', user_id: resetFor.id, password: newPw });
      toast('비밀번호를 바꿨어요.');
      setResetFor(null);
      setNewPw('');
    } catch (err) {
      toast(errorMessage(err));
    }
  };

  const addDept = async () => {
    if (!newDept.trim()) return;
    const { error: e } = await supabase.from('departments').insert({ name: newDept.trim() });
    if (e) return toast('부서를 추가하지 못했어요. 이름이 겹치는지 확인해 주세요.');
    setNewDept('');
    load();
  };

  const deptName = (id: string | null) => depts.find((d) => d.id === id)?.name ?? '미지정';

  return (
    <main className="admin-main">
      <div className="page-head">
        <div>
          <h1>사용자 관리</h1>
          <p>회원가입 없이 관리자가 계정을 발급해요. 부서 정보는 부서별 이용 통계에 쓰여요.</p>
        </div>
      </div>

      <div className="split">
        <form className="card panel" onSubmit={create} style={{ flex: '2 1 480px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2>계정 발급</h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="u-id">아이디</label>
              <input id="u-id" className="input" placeholder="영문 소문자·숫자" value={form.login_id} onChange={(e) => setForm({ ...form, login_id: e.target.value })} required />
            </div>
            <div className="field">
              <label htmlFor="u-name">이름</label>
              <input id="u-name" className="input" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} required />
            </div>
            <div className="field">
              <label htmlFor="u-dept">부서</label>
              <select id="u-dept" className="select" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                <option value="">미지정</option>
                {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="u-role">권한</label>
              <select id="u-role" className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                <option value="employee">직원</option>
                <option value="admin">관리자</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="u-pw">초기 비밀번호</label>
              <input id="u-pw" className="input" type="text" minLength={8} placeholder="8자 이상" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
          </div>
          {error && <div className="error-box" role="alert">{error}</div>}
          <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={busy}>{busy ? '만드는 중…' : '계정 만들기'}</button>
        </form>

        <section className="card panel" style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2>부서</h2>
          <div className="chips">{depts.map((d) => <span key={d.id} className="pill pill-hold">{d.name}</span>)}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <label htmlFor="new-dept" className="sr">새 부서 이름</label>
            <input id="new-dept" className="input" placeholder="새 부서 이름" value={newDept} onChange={(e) => setNewDept(e.target.value)} />
            <button type="button" className="btn" onClick={addDept}>추가</button>
          </div>
        </section>
      </div>

      <section className="card" aria-label="사용자 목록" style={{ overflow: 'hidden' }}>
        {users.map((u) => (
          <div key={u.id} className="list-row">
            <div className="list-main">
              <div className="list-title">{u.display_name} <span className="hint">({u.login_id})</span></div>
              <div className="list-meta">{deptName(u.department_id)}</div>
            </div>
            <label className="sr" htmlFor={`dept-${u.id}`}>{u.login_id} 부서</label>
            <select id={`dept-${u.id}`} className="select" style={{ width: 130, minHeight: 36 }} value={u.department_id ?? ''} onChange={(e) => update(u, { department_id: e.target.value || null })}>
              <option value="">미지정</option>
              {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <label className="sr" htmlFor={`role-${u.id}`}>{u.login_id} 권한</label>
            <select id={`role-${u.id}`} className="select" style={{ width: 110, minHeight: 36 }} value={u.role} disabled={u.id === me?.id} onChange={(e) => update(u, { role: e.target.value as Role })}>
              <option value="employee">직원</option>
              <option value="admin">관리자</option>
            </select>
            <button type="button" className="btn btn-sm" onClick={() => setResetFor(u)}>비밀번호 변경</button>
            {u.id !== me?.id && <button type="button" className="btn btn-sm btn-danger" onClick={() => remove(u)}>삭제</button>}
          </div>
        ))}
      </section>

      {resetFor && (
        <Modal
          title={`${resetFor.display_name} 비밀번호 변경`}
          onClose={() => setResetFor(null)}
          actions={
            <>
              <button type="button" className="btn" onClick={() => setResetFor(null)}>취소</button>
              <button type="button" className="btn btn-primary" disabled={newPw.length < 8} onClick={resetPassword}>변경</button>
            </>
          }
        >
          <div className="field">
            <label htmlFor="new-pw">새 비밀번호 (8자 이상)</label>
            <input id="new-pw" className="input" type="text" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          </div>
        </Modal>
      )}
    </main>
  );
}
