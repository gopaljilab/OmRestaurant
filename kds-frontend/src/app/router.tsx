import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { OverviewPage } from '../features/dashboard/OverviewPage';
import { OrdersPage } from '../features/orders/OrdersPage';
import { StationsPage } from '../features/kitchen/StationsPage';
import { MenuAvailabilityPage } from '../features/menu/MenuAvailabilityPage';
import { HistoryPage } from '../features/history/HistoryPage';
import { SettingsPage } from '../features/settings/SettingsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <OverviewPage />,
      },
      {
        path: 'overview',
        element: <Navigate to="/" replace />,
      },
      {
        path: 'orders',
        element: <OrdersPage />,
      },
      {
        path: 'stations',
        element: <StationsPage />,
      },
      {
        path: 'menu-availability',
        element: <MenuAvailabilityPage />,
      },
      {
        path: 'history',
        element: <HistoryPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
