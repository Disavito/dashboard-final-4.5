import { createBrowserRouter, Navigate } from 'react-router-dom';
import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import ProtectedRoute from './components/auth/ProtectedRoute'; 

// Componente de carga ultra ligero
const LoadingFallback = () => (
  <div className="flex h-screen w-full items-center justify-center bg-[#F8F9FC]">
    <Loader2 className="h-10 w-10 animate-spin text-[#9E7FFF]" />
  </div>
);

// Helper para carga diferida (Lazy Loading)
const Load = (Component: React.LazyExoticComponent<any>) => (
  <Suspense fallback={<LoadingFallback />}>
    <Component />
  </Suspense>
);

// Importaciones Dinámicas (Solo se cargan cuando se necesitan)
const AuthPage = React.lazy(() => import('./pages/Auth'));
const DashboardLayout = React.lazy(() => import('./layouts/DashboardLayout'));
const DashboardPage = React.lazy(() => import('./pages/Dashboard'));
const SociosPage = React.lazy(() => import('./pages/People'));
const EditSocioPage = React.lazy(() => import('./pages/EditSocioPage'));
const InvoicingLayout = React.lazy(() => import('./pages/invoicing/InvoicingLayout'));
const BoletasPage = React.lazy(() => import('./pages/invoicing/BoletasPage'));
const ResumenDiarioPage = React.lazy(() => import('./pages/invoicing/ResumenDiarioPage'));
const NotasCreditoPage = React.lazy(() => import('./pages/invoicing/NotasCreditoPage'));
const RecibosPage = React.lazy(() => import('@/pages/invoicing/RecibosPage'));
const IngresosPage = React.lazy(() => import('./pages/Income'));
const EgresosPage = React.lazy(() => import('./pages/Expenses'));
const CuentasPage = React.lazy(() => import('./pages/Accounts'));
const AccountDetails = React.lazy(() => import('./pages/AccountDetails'));
const PartnerDocumentsPage = React.lazy(() => import('@/pages/PartnerDocuments'));
// const DeletionRequestsPage = React.lazy(() => import('@/pages/DeletionRequestsPage')); // REMOVED: DeletionRequestsPage is no longer a separate route
const SettingsPage = React.lazy(() => import('./pages/Settings'));
const JornadaPage = React.lazy(() => import('./pages/JornadaPage'));

const router = createBrowserRouter([
  {
    path: '/auth',
    element: Load(AuthPage),
  },
  {
    path: '/',
    element: <ProtectedRoute resourcePath="/">{Load(DashboardLayout)}</ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: Load(DashboardPage) },
      { path: 'people', element: Load(SociosPage) },
      { path: 'people/:id', element: Load(EditSocioPage) },
      { path: 'partner-documents', element: Load(PartnerDocumentsPage) },
      // { path: 'deletion-requests', element: <ProtectedRoute resourcePath="/deletion-requests">{Load(DeletionRequestsPage)}</ProtectedRoute> }, // REMOVED: Deletion Requests Page is now a tab
      {
        path: 'invoicing',
        element: Load(InvoicingLayout),
        children: [
          { index: true, element: <Navigate to="boletas" replace /> },
          { path: 'boletas', element: Load(BoletasPage) },
          { path: 'resumen-diario', element: Load(ResumenDiarioPage) },
          { path: 'notas-credito', element: Load(NotasCreditoPage) },
          { path: 'recibos', element: Load(RecibosPage) },
        ],
      },
      { path: 'income', element: Load(IngresosPage) },
      { path: 'expenses', element: Load(EgresosPage) },
      { path: 'accounts', element: Load(CuentasPage) },
      { path: 'accounts/:id', element: Load(AccountDetails) },
      { path: 'jornada', element: Load(JornadaPage) },
      { path: 'settings', element: Load(SettingsPage) },
    ],
  },
]);

export default router;
