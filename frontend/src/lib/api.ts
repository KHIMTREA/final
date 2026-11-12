import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
};

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

export const createProduct = (data: Record<string, unknown>) =>
  api.post('/api/v1/products', data);

export const updateProduct = (id: number, data: Record<string, unknown>) =>
  api.put(`/api/v1/products/${id}`, data);

export const deleteProduct = (id: number) =>
  api.delete(`/api/v1/products/${id}`);

export const fetchAllProductsAdmin = (page = 0, size = 20) =>
  api.get(`/api/v1/products/admin/all?page=${page}&size=${size}`);

// ---------- Checkout ----------
export const createKhqrCheckout = (data: Record<string, unknown>) =>
  api.post('/api/v1/checkout/khqr', data);

export const verifyPayment = (md5: string) =>
  api.get(`/api/v1/checkout/verify/${md5}`);

// ---------- Admin ----------
export const fetchDashboardSummary = () =>
  api.get('/api/v1/admin/dashboard/summary');

export const fetchTopProducts = () =>
  api.get('/api/v1/admin/dashboard/top-products');

export const fetchTransactions = (status?: string, page = 0) =>
  api.get(`/api/v1/admin/transactions?page=${page}${status ? `&status=${status}` : ''}`);

export const fetchTransactionAnalytics = () =>
  api.get('/api/v1/admin/transactions/analytics');

export const createTransaction = (data: {
  orderId: number;
  khqrMd5: string;
  amountKhr: number;
  status: string;
  currency: string;
  fromAccount?: string;
  bakongHash?: string;
}) => api.post('/api/v1/admin/transactions', data);

export const updateTransaction = (id: number, data: {
  orderId: number;
  khqrMd5: string;
  amountKhr: number;
  status: string;
  currency: string;
  fromAccount?: string;
  bakongHash?: string;
}) => api.put(`/api/v1/admin/transactions/${id}`, data);

export const deleteTransaction = (id: number) =>
  api.delete(`/api/v1/admin/transactions/${id}`);

export const fetchUsers = () =>
  api.get('/api/v1/admin/users');

export const createUser = (data: {
  fullName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  enabled: boolean;
  roles: string[];
}) => api.post('/api/v1/admin/users', data);

export const updateUser = (id: number, data: {
  fullName: string;
  email: string;
  password?: string;
  phoneNumber?: string;
  enabled: boolean;
  roles: string[];
}) => api.put(`/api/v1/admin/users/${id}`, data);

export const deleteUser = (id: number) =>
  api.delete(`/api/v1/admin/users/${id}`);

export const assignRoles = (userId: number, roles: string[]) =>
  api.post(`/api/v1/admin/users/${userId}/roles`, { roles });

export const fetchOrders = (page = 0) =>
  api.get(`/api/v1/orders?page=${page}`);

export const createOrder = (data: {
  customerName: string;
  email: string;
  phone: string;
  shippingAddress: string;
  items: { productId: number; quantity: number }[];
}) => api.post('/api/v1/orders', data);

export const updateOrder = (id: number, data: {
  customerName: string;
  email: string;
  phone: string;
  shippingAddress: string;
  orderStatus: string;
}) => api.put(`/api/v1/orders/${id}`, data);

export const deleteOrder = (id: number) =>
  api.delete(`/api/v1/orders/${id}`);

export const fetchOrder = (id: number) =>
  api.get(`/api/v1/orders/${id}`);

export const updateOrderStatus = (id: number, data: { orderStatus?: string }) =>
  api.patch(`/api/v1/orders/${id}/status`, data);

// Format KHR
export const formatKhr = (amount: number | string) => {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(n)} KHR`;
};
