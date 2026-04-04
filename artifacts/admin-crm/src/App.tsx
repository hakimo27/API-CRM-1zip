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
import BranchesPage from '@/pages/BranchesPage';
import CategoriesPage from '@/pages/CategoriesPage';
import SaleProductsPage from '@/pages/SaleProductsPage';
import ContentPage from '@/pages/ContentPage';
import LogsPage from '@/pages/LogsPage';
import MediaPage from '@/pages/MediaPage';
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
  return <AdminLayout>{children}</AdminLayout>;
}

function G({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}

function CrmRoutes() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/"><G><DashboardPage /></G></Route>
      <Route path="/orders"><G><OrdersPage /></G></Route>
      <Route path="/orders/:id">{(p) => <G><OrderDetailPage id={p.id} /></G>}</Route>
      <Route path="/inventory"><G><InventoryPage /></G></Route>
      <Route path="/products"><G><ProductsPage /></G></Route>
      <Route path="/sale-products"><G><SaleProductsPage /></G></Route>
      <Route path="/categories"><G><CategoriesPage /></G></Route>
      <Route path="/customers"><G><CustomersPage /></G></Route>
      <Route path="/tours"><G><ToursPage /></G></Route>
      <Route path="/branches"><G><BranchesPage /></G></Route>
      <Route path="/chat"><G><ChatPage /></G></Route>
      <Route path="/users"><G><UsersPage /></G></Route>
      <Route path="/content/:tab">{(p) => <G><ContentPage tab={p.tab} /></G>}</Route>
      <Route path="/content"><G><ContentPage tab="articles" /></G></Route>
      <Route path="/templates"><G><ContentPage tab="templates" /></G></Route>
      <Route path="/settings"><G><SettingsPage /></G></Route>
      <Route path="/logs"><G><LogsPage /></G></Route>
      <Route path="/media"><G><MediaPage /></G></Route>
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
