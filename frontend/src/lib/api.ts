import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ---------- Auth ----------
export const login = (email: string, password: string) =>
  api.post('/api/v1/auth/login', { email, password });

export const register = (data: { fullName: string; email: string; password: string; phoneNumber?: string }) =>
  api.post('/api/v1/auth/register', data);

// ---------- Products ----------
export const fetchProducts = (page = 0, size = 12) =>
  api.get(`/api/v1/products?page=${page}&size=${size}`);

export const fetchProduct = (id: number | string) =>
  api.get(`/api/v1/products/${id}`);

export const createProduct = (data: any) =>
  api.post('/api/v1/products', data);

export const updateProduct = (id: number, data: any) =>
  api.put(`/api/v1/products/${id}`, data);

export const deleteProduct = (id: number) =>
  api.delete(`/api/v1/products/${id}`);

export const fetchAllProductsAdmin = (page = 0, size = 20) =>
  api.get(`/api/v1/products/admin/all?page=${page}&size=${size}`);

// ---------- Checkout ----------
export const createKhqrCheckout = (data: any) =>
  api.post('/api/v1/checkout/khqr', data);

export const verifyPayment = (md5: string) =>
  api.get(`/api/v1/checkout/verify/${md5}`);

export const simulatePaymentSuccess = (md5: string) =>
  api.post(`/api/v1/checkout/simulate-success/${md5}`);

// ---------- Admin ----------
export const fetchDashboardSummary = () =>
  api.get('/api/v1/admin/dashboard/summary');

export const fetchTopProducts = () =>
  api.get('/api/v1/admin/dashboard/top-products');

export const fetchTransactions = (status?: string, page = 0) =>
  api.get(`/api/v1/admin/transactions?page=${page}${status ? `&status=${status}` : ''}`);

export const fetchTransactionAnalytics = () =>
  api.get('/api/v1/admin/transactions/analytics');

export const fetchUsers = () =>
  api.get('/api/v1/admin/users');

export const assignRoles = (userId: number, roles: string[]) =>
  api.post(`/api/v1/admin/users/${userId}/roles`, { roles });

export const fetchOrders = (page = 0) =>
  api.get(`/api/v1/orders?page=${page}`);

export const fetchOrder = (id: number) =>
  api.get(`/api/v1/orders/${id}`);

export const updateOrderStatus = (id: number, data: { orderStatus?: string; paymentStatus?: string }) =>
  api.patch(`/api/v1/orders/${id}/status`, data);

// Format KHR
export const formatKhr = (amount: number | string) => {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('km-KH', {
    style: 'currency',
    currency: 'KHR',
    maximumFractionDigits: 0,
  }).format(n);
};
