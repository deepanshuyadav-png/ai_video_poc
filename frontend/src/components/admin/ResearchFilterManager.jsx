import { useState, useEffect } from 'react';
import axios from 'axios';
import '../../styles/admin/Manager.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function ResearchFilterManager() {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ filterGroup: '', label: '', value: '', pubmedFilter: '' });

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/research/filters`);
      setOptions(res.data.data || []);
    } catch (err) {
      console.error('Error fetching filter options:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`${API_URL}/admin/research/filters/${editingId}`, form);
      } else {
        await axios.post(`${API_URL}/admin/research/filters`, form);
      }
      resetForm();
      fetchOptions();
    } catch (err) {
      console.error('Error saving filter option:', err);
    }
  };

  const handleEdit = (o) => {
    setEditingId(o.id);
    setForm({
      filterGroup: o.filter_group,
      label: o.label,
      value: o.value,
      pubmedFilter: o.pubmed_filter || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this filter option?')) return;
    try {
      await axios.delete(`${API_URL}/admin/research/filters/${id}`);
      fetchOptions();
    } catch (err) {
      console.error('Error deleting filter option:', err);
    }
  };

  const handleToggle = async (o) => {
    try {
      await axios.put(`${API_URL}/admin/research/filters/${o.id}`, { isActive: !o.is_active });
      fetchOptions();
    } catch (err) {
      console.error('Error toggling filter option:', err);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ filterGroup: '', label: '', value: '', pubmedFilter: '' });
  };

  if (loading) return <div className="manager-loading">Loading...</div>;

  return (
    <div className="manager">
      <div className="manager-header">
        <h1>Research Filters</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + Add Filter Option
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{editingId ? 'Edit Filter Option' : 'Add Filter Option'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Filter Group *</label>
                <input
                  type="text"
                  value={form.filterGroup}
                  onChange={(e) => setForm({ ...form, filterGroup: e.target.value })}
                  placeholder="e.g. sex, age"
                  required
                />
              </div>
              <div className="form-group">
                <label>Label *</label>
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="e.g. Male only"
                  required
                />
              </div>
              <div className="form-group">
                <label>Value *</label>
                <input
                  type="text"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  placeholder="e.g. male"
                  required
                />
              </div>
              <div className="form-group">
                <label>PubMed Filter Expression</label>
                <input
                  type="text"
                  value={form.pubmedFilter}
                  onChange={(e) => setForm({ ...form, pubmedFilter: e.target.value })}
                  placeholder="e.g. male[MeSH Terms] — leave blank for 'all'"
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
              <th>Group</th>
              <th>Label</th>
              <th>Value</th>
              <th>PubMed Filter</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {options.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-state">No filter options yet.</td>
              </tr>
            ) : (
              options.map((o) => (
                <tr key={o.id}>
                  <td>{o.filter_group}</td>
                  <td>{o.label}</td>
                  <td>{o.value}</td>
                  <td><code className="filter-expr">{o.pubmed_filter || '(none)'}</code></td>
                  <td>
                    <button
                      className={`status-toggle ${o.is_active ? 'active' : 'inactive'}`}
                      onClick={() => handleToggle(o)}
                    >
                      {o.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>
                    <button className="btn-icon" onClick={() => handleEdit(o)}>✏️</button>
                    <button className="btn-icon" onClick={() => handleDelete(o.id)}>🗑️</button>
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

export default ResearchFilterManager;
