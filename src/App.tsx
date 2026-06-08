import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.js';
import TicketList from './pages/TicketList.js';
import TicketDetail from './pages/TicketDetail.js';
import ArbitrationCenter from './pages/ArbitrationCenter.js';
import UsersPage from './pages/UsersPage.js';
import Layout from './components/Layout.js';
import ProtectedRoute from './components/ProtectedRoute.js';
import { useAuthStore } from './store/authStore.js';

function App() {
  const { isAuthenticated, user, loadCurrentUser } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && !user) {
      loadCurrentUser();
    }
  }, [isAuthenticated, user, loadCurrentUser]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/tickets"
          element={
            <ProtectedRoute>
              <Layout>
                <TicketList />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/tickets/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <TicketDetail />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/escalated"
          element={
            <ProtectedRoute allowedRoles={['supervisor', 'arbitrator', 'admin']}>
              <Layout>
                <ArbitrationCenter />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <UsersPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Navigate to="/tickets" replace />} />

        <Route
          path="*"
          element={
            <ProtectedRoute>
              <Layout>
                <div className="text-center py-20">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">404</h2>
                  <p className="text-gray-500">页面不存在</p>
                </div>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
