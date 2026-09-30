import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import AuthPage from './components/AuthPage';
import UserPanel from './components/UserPanel';
import AdminLayout from './components/admin/AdminLayout';
import './styles/App.css';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${localStorage.getItem('token')}`;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <Routes>
      {/* Auth Routes */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <AuthPage mode="login" onLogin={handleLogin} />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/" replace /> : <AuthPage mode="register" onLogin={handleLogin} />}
      />

      {/* Protected Routes */}
      <Route
        path="/"
        element={user ? <UserPanel user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/admin/*"
        element={
          !user ? (
            <Navigate to="/login" replace />
          ) : user.role === 'admin' ? (
            <AdminLayout user={user} onLogout={handleLogout} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      {/* Redirect unknown routes */}
      <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
    </Routes>
  );
}

export default App;
