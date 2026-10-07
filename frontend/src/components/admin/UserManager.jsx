import { useState, useEffect } from 'react';
import axios from 'axios';
import '../../styles/admin/Manager.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function UserManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', role: 'user' });
  const [editingUser, setEditingUser] = useState(null);
  const [editData, setEditData] = useState({ role: 'user', isActive: true });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/users`);
      setUsers(res.data.data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await axios.post(`${API_URL}/admin/users`, {
        email: formData.email,
        password: formData.password,
        role: formData.role
      });
      resetForm();
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Error creating user');
    }
  };

  const handleEdit = (user) => {
    setError('');
    setEditingUser(user);
    setEditData({ role: user.role === 'admin' ? 'admin' : 'user', isActive: !!user.is_active });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await axios.put(`${API_URL}/admin/users/${editingUser.id}`, {
        role: editData.role,
        isActive: editData.isActive
      });
      closeEdit();
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Error updating user');
    }
  };

  const handleDelete = async (user) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    setError('');
    try {
      await axios.delete(`${API_URL}/admin/users/${user.id}`);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Error deleting user');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setFormData({ email: '', password: '', role: 'user' });
    setError('');
  };

  const closeEdit = () => {
    setEditingUser(null);
    setError('');
  };

  if (loading) return <div className="manager-loading">Loading...</div>;

  return (
    <div className="manager">
      <div className="manager-header">
        <h1>Users</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + Add User
        </button>
      </div>

      {error && !showForm && !editingUser && (
        <div style={{ color: '#dc2626', margin: '0 0 16px', fontSize: '14px' }}>{error}</div>
      )}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Add User</h2>
            {error && (
              <div style={{ color: '#dc2626', margin: '0 0 16px', fontSize: '14px' }}>{error}</div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Edit User</h2>
            {error && (
              <div style={{ color: '#dc2626', margin: '0 0 16px', fontSize: '14px' }}>{error}</div>
            )}
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={editingUser.email} disabled />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select
                  value={editData.role}
                  onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={editData.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setEditData({ ...editData, isActive: e.target.value === 'active' })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeEdit}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="manager-table">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-state">No users yet. Add your first user!</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>
                    <span className={`status-toggle ${user.role === 'admin' ? 'active' : 'inactive'}`}>
                      {user.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-toggle ${user.is_active ? 'active' : 'inactive'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{new Date(user.created_at).toLocaleString()}</td>
                  <td>
                    <button className="btn-icon" onClick={() => handleEdit(user)}>✏️</button>
                    <button className="btn-icon" onClick={() => handleDelete(user)}>🗑️</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default UserManager;
