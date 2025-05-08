// src/App.js
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import AuthForm from './components/AuthForm';
import EmployeeList from './components/EmployeeList';
import Home from './components/Home';
import { AuthProvider } from './context/AuthContext';
import EmployeeForm from './components/EmployeeForm';
import AdminProfilePage from './pages/AdminProfilePage';
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
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;