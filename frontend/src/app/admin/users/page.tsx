'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { fetchUsers, assignRoles } from '@/lib/api';

const ALL_ROLES = ['ROLE_ADMIN', 'ROLE_STAFF', 'ROLE_CUSTOMER'];

export default function AdminUsersPage() {
  const router = useRouter();
  const { isAdmin, isAuthenticated } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const load = () =>
    fetchUsers()
      .then((res) => setUsers(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));

  useEffect(() => {
    if (!isAuthenticated() || !isAdmin()) {
      router.push('/login');
      return;
    }
    load();
  }, [isAuthenticated, isAdmin, router]);

  const openEdit = (user: any) => {
    setEditing(user.id);
    setSelectedRoles(user.roles || []);
  };

  const saveRoles = async () => {
    if (editing == null) return;
    await assignRoles(editing, selectedRoles);
    setEditing(null);
    load();
  };

  if (loading) return <div className="py-20 text-center">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">User & Role Management</h1>
        <Link href="/admin" className="btn-secondary text-sm">← Dashboard</Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Roles</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3">{u.id}</td>
                <td className="p-3 font-medium">{u.fullName}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {(u.roles || []).map((r: string) => (
                      <span key={r} className="px-2 py-0.5 bg-slate-100 rounded text-xs">
                        {r.replace('ROLE_', '')}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-3">
                  <button onClick={() => openEdit(u)} className="text-teal-600 text-xs hover:underline">
                    Edit Roles
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing != null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-md">
            <h2 className="font-bold mb-4">Assign Roles</h2>
            <div className="space-y-2 mb-6">
              {ALL_ROLES.map((role) => (
                <label key={role} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRoles([...selectedRoles, role]);
                      } else {
                        setSelectedRoles(selectedRoles.filter((r) => r !== role));
                      }
                    }}
                  />
                  {role}
                </label>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditing(null)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={saveRoles} className="btn-primary">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
