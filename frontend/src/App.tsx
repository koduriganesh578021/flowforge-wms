import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { Dashboard } from './pages/Dashboard';
import { Orders } from './pages/Orders';
import { OrderDetail } from './pages/OrderDetail';
import { Inventory } from './pages/Inventory';
import { FulfillmentBoard } from './pages/FulfillmentBoard';
import { Exceptions } from './pages/Exceptions';
import { ScenarioSimulator } from './pages/ScenarioSimulator';

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
            <Route path="/fulfillment" element={<FulfillmentBoard />} />
            <Route path="/exceptions" element={<Exceptions />} />
            <Route path="/simulator" element={<ScenarioSimulator />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}

export default App;
