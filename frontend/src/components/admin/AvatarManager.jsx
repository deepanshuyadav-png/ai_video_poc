import { useState, useEffect } from 'react';
import axios from 'axios';
import '../../styles/admin/Manager.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function AvatarManager() {
  const [avatars, setAvatars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', provider: '', providerAvatarId: '' });
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetchAvatars();
  }, []);

  const fetchAvatars = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/avatars`);
      setAvatars(res.data.data || []);
    } catch (err) {
      console.error('Error fetching avatars:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('name', formData.name);
    data.append('provider', formData.provider);
    data.append('providerAvatarId', formData.providerAvatarId);
    if (file) data.append('thumbnail', file);

    try {
      if (editingId) {
        await axios.put(`${API_URL}/admin/avatars/${editingId}`, data);
      } else {
        await axios.post(`${API_URL}/admin/avatars`, data);
      }
      resetForm();
      fetchAvatars();
    } catch (err) {
      console.error('Error saving avatar:', err);
    }
  };

  const handleEdit = (avatar) => {
    setEditingId(avatar.id);
    setFormData({
      name: avatar.name,
      provider: avatar.provider || '',
      providerAvatarId: avatar.provider_avatar_id || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this avatar?')) return;
    try {
      await axios.delete(`${API_URL}/admin/avatars/${id}`);
      fetchAvatars();
    } catch (err) {
      console.error('Error deleting avatar:', err);
    }
  };

  const handleToggleActive = async (avatar) => {
    try {
      const data = new FormData();
      data.append('isActive', !avatar.is_active);
      await axios.put(`${API_URL}/admin/avatars/${avatar.id}`, data);
      fetchAvatars();
    } catch (err) {
      console.error('Error toggling avatar:', err);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', provider: '', providerAvatarId: '' });
    setFile(null);
  };

  if (loading) return <div className="manager-loading">Loading...</div>;

  return (
    <div className="manager">
      <div className="manager-header">
        <h1>Avatars</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + Add Avatar
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{editingId ? 'Edit Avatar' : 'Add Avatar'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Thumbnail Image</label>
                <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
              </div>
              <div className="form-group">
                <label>Provider</label>
                <select
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                >
                  <option value="">Select Provider</option>
                  <option value="d-id">D-ID</option>
                  <option value="heygen">HeyGen</option>
                  <option value="synthesia">Synthesia</option>
                </select>
              </div>
              <div className="form-group">
                <label>Provider Avatar ID</label>
                <input
                  type="text"
                  value={formData.providerAvatarId}
                  onChange={(e) => setFormData({ ...formData, providerAvatarId: e.target.value })}
                  placeholder="External avatar reference"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingId ? 'Update' : 'Create'}
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
              <th>Preview</th>
              <th>Name</th>
              <th>Provider</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {avatars.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-state">No avatars yet. Add your first avatar!</td>
              </tr>
            ) : (
              avatars.map((avatar) => (
                <tr key={avatar.id}>
                  <td>
                    {avatar.thumbnail_path ? (
                      <img
                        src={`${API_URL.replace('/api', '')}/files/${avatar.thumbnail_path}`}
                        alt={avatar.name}
                        className="thumbnail"
                      />
                    ) : (
                      <div className="thumbnail-placeholder">👤</div>
                    )}
                  </td>
                  <td>{avatar.name}</td>
                  <td>{avatar.provider || '-'}</td>
                  <td>
                    <button
                      className={`status-toggle ${avatar.is_active ? 'active' : 'inactive'}`}
                      onClick={() => handleToggleActive(avatar)}
                    >
                      {avatar.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>
                    <button className="btn-icon" onClick={() => handleEdit(avatar)}>✏️</button>
                    <button className="btn-icon" onClick={() => handleDelete(avatar.id)}>🗑️</button>
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

export default AvatarManager;
