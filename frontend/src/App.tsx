import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { Dashboard } from './pages/Dashboard';
import { Orders } from './pages/Orders';
import { OrderDetail } from './pages/OrderDetail';
import { Inventory } from './pages/Inventory';
import { FulfillmentBoard } from './pages/FulfillmentBoard';
import { Exceptions } from './pages/Exceptions';
import { SimulateEvent } from './pages/SimulateEvent';
import { Intro } from './pages/Intro';

function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/intro" element={<Intro />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:orderId" element={<OrderDetail />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/fulfillment" element={<FulfillmentBoard />} />
            <Route path="/exceptions" element={<Exceptions />} />
            <Route path="/simulator" element={<Navigate to="/simulate" replace />} />
            <Route path="/simulate" element={<SimulateEvent />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}

export default App;
