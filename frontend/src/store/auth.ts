'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userId: number | null;
  fullName: string | null;
  email: string | null;
  roles: string[];
  setAuth: (data: {
    accessToken: string;
    refreshToken: string;
    userId: number;
    fullName: string;
    email: string;
    roles: string[];
  }) => void;
  logout: () => void;
  isAdmin: () => boolean;
  isStaff: () => boolean;
  isAuthenticated: () => boolean;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      userId: null,
      fullName: null,
      email: null,
      roles: [],
      setAuth: (data) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', data.accessToken);
        }
        set(data);
      },
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
        }
        set({
          accessToken: null,
          refreshToken: null,
          userId: null,
          fullName: null,
          email: null,
          roles: [],
        });
      },
      isAdmin: () => get().roles.includes('ROLE_ADMIN'),
      isStaff: () => get().roles.includes('ROLE_STAFF') || get().roles.includes('ROLE_ADMIN'),
      isAuthenticated: () => !!get().accessToken,
    }),
    { name: 'bakong-auth' }
  )
);
