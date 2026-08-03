// src/App.js
import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Navbar from './components/NavBar/Navbar';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import PageLoader from './components/PageLoader/PageLoader';

// Route-level code splitting: each page is fetched only when it is visited,
// which keeps the initial bundle small and speeds up first load.
const Home = lazy(() => import('./components/Home/Home'));
const AuthForm = lazy(() => import('./components/AuthForm/AuthForm'));
const AdminLogin = lazy(() => import('./components/AdminLogin/AdminLogin'));
const EmployeeList = lazy(() => import('./components/EmployeeList/EmployeeList'));
const EmployeeForm = lazy(() => import('./components/EmployeeForm/EmployeeForm'));
const ReferenceNameManager = lazy(() => import('./components/ReferenceNameManager/ReferenceNameManager'));
const CenterManager = lazy(() => import('./components/CenterManager/CenterManager'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const PleaseLoginPage = lazy(() => import('./pages/PleaseLoginPage'));
const ViewSavedAssignments = lazy(() => import('./components/ViewSavedAssignments'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const BlogManager = lazy(() => import('./components/Blog/BlogManager'));
const BlogPublic = lazy(() => import('./components/Blog/BlogPublic'));
const PendingApprovals = lazy(() => import('./components/Approvals/PendingApprovals'));
const InvoiceManager = lazy(() => import('./components/Invoices/InvoiceManager'));

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />

            <Route path="/login" element={<AuthForm type="login" />} />
            <Route path="/signup" element={<AuthForm type="signup" />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/please-login" element={<PleaseLoginPage />} />
            <Route path="/saved-assignments" element={<ViewSavedAssignments />} />
            <Route path="/profile" element={<ProfilePage />} />

            {/* Public blog/notices page */}
            <Route path="/notices" element={<BlogPublic />} />

            {/* Protected Routes (any signed-in member) */}
            <Route
              path="/employees"
              element={
                <ProtectedRoute>
                  <EmployeeList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/add-employee"
              element={
                <ProtectedRoute>
                  <EmployeeForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reference-names"
              element={
                <ProtectedRoute>
                  <ReferenceNameManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/manage-centers"
              element={
                <ProtectedRoute adminOnly>
                  <CenterManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices"
              element={
                <ProtectedRoute>
                  <InvoiceManager />
                </ProtectedRoute>
              }
            />

            {/* Admin-only routes */}
            <Route
              path="/admin/approvals"
              element={
                <ProtectedRoute adminOnly>
                  <PendingApprovals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/blog"
              element={
                <ProtectedRoute adminOnly>
                  <BlogManager />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
