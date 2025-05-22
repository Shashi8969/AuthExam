// src/App.js
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/NavBar/Navbar';
import AuthForm from './components/AuthForm/AuthForm';
import EmployeeList from './components/EmployeeList';
import Home from './components/Home/Home';
import { AuthProvider } from './context/AuthContext';
import EmployeeForm from './components/EmployeeForm/EmployeeForm';
import ReferenceNameManager from './components/ReferenceNameManager/ReferenceNameManager';
import CenterManager from './components/CenterManager/CenterManager';
import NotFoundPage from './pages/NotFoundPage'; // Assuming this is already created
import PleaseLoginPage from './pages/PleaseLoginPage'; // Import the new page
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'; // Import the ProtectedRoute component
import ViewSavedAssignments from './components/ViewSavedAssignments';
import ProfilePage from './components/ProfilePage';



function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/login" element={<AuthForm type="login" />} />
          <Route path="/signup" element={<AuthForm type="signup" />} />
           <Route path="/please-login" element={<PleaseLoginPage />} />
          <Route path="/saved-assignments" element={<ViewSavedAssignments />} />
          <Route path="/profile" element={<ProfilePage />} />
          {/* Protected Routes */}
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
              <ProtectedRoute>
                <CenterManager />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} /> {/* Catch-all route */}
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;