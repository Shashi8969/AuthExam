// src/App.js
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/NavBar/Navbar';
import AuthForm from './components/AuthForm/AuthForm';
import EmployeeList from './components/EmployeeList';
import Home from './components/Home/Home';
import { AuthProvider } from './context/AuthContext';
import EmployeeForm from './components/EmployeeForm';
import AdminProfilePage from './pages/AdminProfilePage';
import ReferenceNameManager from './components/ReferenceNameManager';
import CenterManager from './components/CenterManager';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/employees" element={<EmployeeList />} />
          <Route path="/add-employee" element={<EmployeeForm />} />
          <Route path="/login" element={<AuthForm type="login" />} />
          <Route path="/signup" element={<AuthForm type="signup" />} />
          <Route path="/profile" element={<AdminProfilePage type="profile-page" />} />
          <Route path="/reference-names" element={<ReferenceNameManager />} />
          <Route path="/admin/manage-centers" element={<CenterManager />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;