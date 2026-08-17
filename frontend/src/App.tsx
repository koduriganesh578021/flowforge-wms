import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { Dashboard } from './pages/Dashboard';
import { Orders } from './pages/Orders';
import { OrderDetail } from './pages/OrderDetail';
import { Inventory } from './pages/Inventory';
import { Fulfillment } from './pages/Fulfillment';
import { Exceptions } from './pages/Exceptions';

function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:orderId" element={<OrderDetail />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/fulfillment" element={<Fulfillment />} />
            <Route path="/exceptions" element={<Exceptions />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}

export default App;
