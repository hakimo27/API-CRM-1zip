import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import PublicLayout from "@/components/PublicLayout";
import AdminLayout from "@/components/AdminLayout";
import HomePage from "@/pages/HomePage";
import CatalogPage from "@/pages/CatalogPage";
import ProductPage from "@/pages/ProductPage";
import CartPage from "@/pages/CartPage";
import CheckoutPage from "@/pages/CheckoutPage";
import OrderConfirmPage from "@/pages/OrderConfirmPage";
import StaticPage from "@/pages/StaticPage";
import DashboardPage from "@/pages/admin/DashboardPage";
import OrdersPage from "@/pages/admin/OrdersPage";
import OrderDetailPage from "@/pages/admin/OrderDetailPage";
import CustomersPage from "@/pages/admin/CustomersPage";
import CustomerDetailPage from "@/pages/admin/CustomerDetailPage";
import InventoryPage from "@/pages/admin/InventoryPage";
import AdminChatPage from "@/pages/admin/ChatPage";
import ReportsPage from "@/pages/admin/ReportsPage";
import AdminProductsPage from "@/pages/admin/ProductsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function AdminSection() {
  return (
    <AdminLayout>
      <Switch>
        <Route path="/admin" component={DashboardPage} />
        <Route path="/admin/orders" component={OrdersPage} />
        <Route path="/admin/orders/:id" component={OrderDetailPage} />
        <Route path="/admin/customers" component={CustomersPage} />
        <Route path="/admin/customers/:id" component={CustomerDetailPage} />
        <Route path="/admin/inventory" component={InventoryPage} />
        <Route path="/admin/chat" component={AdminChatPage} />
        <Route path="/admin/reports" component={ReportsPage} />
        <Route path="/admin/products" component={AdminProductsPage} />
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
}

function PublicSection() {
  return (
    <PublicLayout>
      <Switch>
        <Route path="/" component={HomePage} />
        <Route path="/catalog" component={CatalogPage} />
        <Route path="/catalog/:slug" component={ProductPage} />
        <Route path="/cart" component={CartPage} />
        <Route path="/checkout" component={CheckoutPage} />
        <Route path="/order/:id" component={OrderConfirmPage} />
        <Route path="/pages/:slug" component={StaticPage} />
        <Route component={NotFound} />
      </Switch>
    </PublicLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/admin" component={AdminSection} />
      <Route path="/admin/:rest*" component={AdminSection} />
      <Route component={PublicSection} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
