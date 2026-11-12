'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { createUser, deleteUser, fetchUsers, getApiErrorMessage, updateUser } from '@/lib/api';

const ALL_ROLES = ['ROLE_ADMIN', 'ROLE_STAFF', 'ROLE_CUSTOMER'];
type User = {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string | null;
  enabled: boolean;
  roles: string[];
};
type UserForm = {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
  enabled: boolean;
};
const emptyForm: UserForm = {
  fullName: '',
  email: '',
  password: '',
  phoneNumber: '',
  enabled: true,
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { isAdmin, isAuthenticated, userId: currentUserId } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['ROLE_CUSTOMER']);
  const [error, setError] = useState('');

  const load = () =>
    fetchUsers()
      .then((res) => setUsers(res.data || []))
      .catch((cause) => setError(getApiErrorMessage(cause, 'Unable to load users')))
      .finally(() => setLoading(false));

  useEffect(() => {
    if (!isAuthenticated() || !isAdmin()) {
      router.push('/login');
      return;
    }
    load();
  }, [isAuthenticated, isAdmin, router]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setSelectedRoles(['ROLE_CUSTOMER']);
    setFormOpen(true);
    setError('');
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setForm({
      fullName: user.fullName,
      email: user.email,
      password: '',
      phoneNumber: user.phoneNumber || '',
      enabled: user.enabled,
    });
    setSelectedRoles(user.roles || []);
    setFormOpen(true);
    setError('');
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRoles.length) {
      setError('Select at least one role.');
      return;
    }
    if (!editing && form.password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }
    if (editing?.id === currentUserId
      && (!form.enabled || !selectedRoles.includes('ROLE_ADMIN') || form.email.toLowerCase() !== editing.email.toLowerCase())) {
      setError('You cannot disable, demote, or change the email of your own account.');
      return;
    }

    setSaving(true);
    setError('');
    const data = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phoneNumber: form.phoneNumber.trim() || undefined,
      enabled: form.enabled,
      roles: selectedRoles,
      ...(form.password ? { password: form.password } : {}),
    };
    try {
      if (editing) await updateUser(editing.id, data);
      else await createUser({ ...data, password: form.password });
      setFormOpen(false);
      setEditing(null);
      await load();
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Unable to save user'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (user: User) => {
    if (user.id === currentUserId) {
      setError('You cannot delete your own account.');
      return;
    }
    if (!window.confirm(`Delete ${user.fullName}? Existing orders will remain and become guest orders.`)) return;
    setError('');
    try {
      await deleteUser(user.id);
      await load();
    } catch (cause) {
      setError(getApiErrorMessage(cause, 'Unable to delete user'));
    }
  };

  if (loading) return <div className="py-20 text-center">Loading…</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">User Management</h1>
        <div className="flex gap-2">
          <button onClick={openCreate} className="btn-primary text-sm">Add User</button>
          <Link href="/admin" className="btn-secondary text-sm">← Dashboard</Link>
        </div>
      </div>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Roles</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t">
                <td className="p-3">{user.id}</td>
                <td className="p-3 font-medium">{user.fullName}</td>
                <td className="p-3">{user.email}</td>
                <td className="p-3">{user.phoneNumber || '—'}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {(user.roles || []).map((role) => <span key={role} className="rounded bg-slate-100 px-2 py-0.5 text-xs">{role.replace('ROLE_', '')}</span>)}
                  </div>
                </td>
                <td className="p-3"><span className={user.enabled ? 'text-green-700' : 'text-slate-500'}>{user.enabled ? 'Active' : 'Disabled'}</span></td>
                <td className="whitespace-nowrap p-3">
                  <button onClick={() => openEdit(user)} className="text-teal-700 hover:underline">Edit</button>
                  {user.id !== currentUserId && <button onClick={() => remove(user)} className="ml-3 text-red-600 hover:underline">Delete</button>}
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td className="p-6 text-center text-slate-500" colSpan={7}>No users found.</td></tr>}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={save} className="card max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto p-6">
            <h2 className="text-lg font-bold">{editing ? `Edit ${editing.fullName}` : 'Add User'}</h2>
            <label className="label">Full name<input required minLength={2} maxLength={100} className="input mt-1" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label>
            <label className="label">Email<input required type="email" maxLength={100} className="input mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label className="label">Password{editing && <span className="ml-1 font-normal text-slate-500">(leave blank to keep current)</span>}<input required={!editing} minLength={6} maxLength={100} type="password" className="input mt-1" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
            <label className="label">Phone<input maxLength={20} className="input mt-1" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} /></label>
            <fieldset>
              <legend className="label">Roles</legend>
              <div className="flex flex-wrap gap-4">
                {ALL_ROLES.map((role) => (
                  <label key={role} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={selectedRoles.includes(role)} onChange={(event) => {
                      setSelectedRoles(event.target.checked ? [...selectedRoles, role] : selectedRoles.filter((selected) => selected !== role));
                    }} />
                    {role.replace('ROLE_', '')}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />Account enabled</label>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setFormOpen(false)}>Cancel</button>
              <button disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save User'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
