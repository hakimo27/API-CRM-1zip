import { Switch, Route, Router as WouterRouter, useLocation } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import AdminLayout from '@/components/AdminLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import OrdersPage from '@/pages/OrdersPage';
import OrderDetailPage from '@/pages/OrderDetailPage';
import InventoryPage from '@/pages/InventoryPage';
import ProductsPage from '@/pages/ProductsPage';
import CustomersPage from '@/pages/CustomersPage';
import ToursPage from '@/pages/ToursPage';
import ChatPage from '@/pages/ChatPage';
import UsersPage from '@/pages/UsersPage';
import SettingsPage from '@/pages/SettingsPage';
import { useEffect } from 'react';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return null;
  return (
    <AdminLayout>
      {children}
    </AdminLayout>
  );
}

function CrmRoutes() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/">
        <AuthGuard>
          <DashboardPage />
        </AuthGuard>
      </Route>
      <Route path="/orders">
        <AuthGuard>
          <OrdersPage />
        </AuthGuard>
      </Route>
      <Route path="/orders/:id">
        {(params) => (
          <AuthGuard>
            <OrderDetailPage id={params.id} />
          </AuthGuard>
        )}
      </Route>
      <Route path="/inventory">
        <AuthGuard>
          <InventoryPage />
        </AuthGuard>
      </Route>
      <Route path="/products">
        <AuthGuard>
          <ProductsPage />
        </AuthGuard>
      </Route>
      <Route path="/customers">
        <AuthGuard>
          <CustomersPage />
        </AuthGuard>
      </Route>
      <Route path="/tours">
        <AuthGuard>
          <ToursPage />
        </AuthGuard>
      </Route>
      <Route path="/chat">
        <AuthGuard>
          <ChatPage />
        </AuthGuard>
      </Route>
      <Route path="/users">
        <AuthGuard>
          <UsersPage />
        </AuthGuard>
      </Route>
      <Route path="/settings">
        <AuthGuard>
          <SettingsPage />
        </AuthGuard>
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <CrmRoutes />
        </WouterRouter>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
