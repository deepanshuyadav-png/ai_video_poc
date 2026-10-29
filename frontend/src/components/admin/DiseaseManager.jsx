import { useState, useEffect } from 'react';
import axios from 'axios';
import '../../styles/admin/Manager.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function DiseaseManager() {
  const [diseases, setDiseases] = useState([]);
  const [loading, setLoading] = useState(true);

  // Disease form
  const [showDiseaseForm, setShowDiseaseForm] = useState(false);
  const [editingDiseaseId, setEditingDiseaseId] = useState(null);
  const [diseaseForm, setDiseaseForm] = useState({ name: '', meshTerm: '' });

  // Strain form (scoped to a disease)
  const [strainForDisease, setStrainForDisease] = useState(null);
  const [editingStrainId, setEditingStrainId] = useState(null);
  const [strainForm, setStrainForm] = useState({ name: '', meshTerm: '' });

  useEffect(() => {
    fetchDiseases();
  }, []);

  const fetchDiseases = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/research/diseases`);
      setDiseases(res.data.data || []);
    } catch (err) {
      console.error('Error fetching diseases:', err);
    } finally {
      setLoading(false);
    }
  };

  // ---- Disease CRUD ----
  const submitDisease = async (e) => {
    e.preventDefault();
    try {
      if (editingDiseaseId) {
        await axios.put(`${API_URL}/admin/research/diseases/${editingDiseaseId}`, diseaseForm);
      } else {
        await axios.post(`${API_URL}/admin/research/diseases`, diseaseForm);
      }
      resetDiseaseForm();
      fetchDiseases();
    } catch (err) {
      console.error('Error saving disease:', err);
    }
  };

  const editDisease = (d) => {
    setEditingDiseaseId(d.id);
    setDiseaseForm({ name: d.name, meshTerm: d.mesh_term || '' });
    setShowDiseaseForm(true);
  };

  const deleteDisease = async (id) => {
    if (!confirm('Delete this disease and all its strains?')) return;
    try {
      await axios.delete(`${API_URL}/admin/research/diseases/${id}`);
      fetchDiseases();
    } catch (err) {
      console.error('Error deleting disease:', err);
    }
  };

  const toggleDisease = async (d) => {
    try {
      await axios.put(`${API_URL}/admin/research/diseases/${d.id}`, { isActive: !d.is_active });
      fetchDiseases();
    } catch (err) {
      console.error('Error toggling disease:', err);
    }
  };

  const resetDiseaseForm = () => {
    setShowDiseaseForm(false);
    setEditingDiseaseId(null);
    setDiseaseForm({ name: '', meshTerm: '' });
  };

  // ---- Strain CRUD ----
  const openAddStrain = (disease) => {
    setStrainForDisease(disease);
    setEditingStrainId(null);
    setStrainForm({ name: '', meshTerm: '' });
  };

  const editStrain = (disease, strain) => {
    setStrainForDisease(disease);
    setEditingStrainId(strain.id);
    setStrainForm({ name: strain.name, meshTerm: strain.mesh_term || '' });
  };

  const submitStrain = async (e) => {
    e.preventDefault();
    try {
      if (editingStrainId) {
        await axios.put(`${API_URL}/admin/research/strains/${editingStrainId}`, strainForm);
      } else {
        await axios.post(`${API_URL}/admin/research/strains`, {
          ...strainForm,
          diseaseId: strainForDisease.id,
        });
      }
      resetStrainForm();
      fetchDiseases();
    } catch (err) {
      console.error('Error saving strain:', err);
    }
  };

  const deleteStrain = async (id) => {
    if (!confirm('Delete this strain?')) return;
    try {
      await axios.delete(`${API_URL}/admin/research/strains/${id}`);
      fetchDiseases();
    } catch (err) {
      console.error('Error deleting strain:', err);
    }
  };

  const toggleStrain = async (strain) => {
    try {
      await axios.put(`${API_URL}/admin/research/strains/${strain.id}`, { isActive: !strain.is_active });
      fetchDiseases();
    } catch (err) {
      console.error('Error toggling strain:', err);
    }
  };

  const resetStrainForm = () => {
    setStrainForDisease(null);
    setEditingStrainId(null);
    setStrainForm({ name: '', meshTerm: '' });
  };

  if (loading) return <div className="manager-loading">Loading...</div>;

  return (
    <div className="manager">
      <div className="manager-header">
        <h1>Diseases &amp; Strains</h1>
        <button className="btn-primary" onClick={() => setShowDiseaseForm(true)}>
          + Add Disease
        </button>
      </div>

      {/* Disease modal */}
      {showDiseaseForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{editingDiseaseId ? 'Edit Disease' : 'Add Disease'}</h2>
            <form onSubmit={submitDisease}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={diseaseForm.name}
                  onChange={(e) => setDiseaseForm({ ...diseaseForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>MeSH Term</label>
                <input
                  type="text"
                  value={diseaseForm.meshTerm}
                  onChange={(e) => setDiseaseForm({ ...diseaseForm, meshTerm: e.target.value })}
                  placeholder="e.g. Influenza, Human"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={resetDiseaseForm}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingDiseaseId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Strain modal */}
      {strainForDisease && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>
              {editingStrainId ? 'Edit Strain' : 'Add Strain'} — {strainForDisease.name}
            </h2>
            <form onSubmit={submitStrain}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={strainForm.name}
                  onChange={(e) => setStrainForm({ ...strainForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>MeSH Term</label>
                <input
                  type="text"
                  value={strainForm.meshTerm}
                  onChange={(e) => setStrainForm({ ...strainForm, meshTerm: e.target.value })}
                  placeholder="e.g. Influenza A Virus, H1N1 Subtype"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={resetStrainForm}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingStrainId ? 'Update' : 'Create'}
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
              <th>Disease</th>
              <th>MeSH Term</th>
              <th>Strains</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {diseases.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-state">No diseases yet. Add your first disease!</td>
              </tr>
            ) : (
              diseases.map((d) => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td>{d.mesh_term || '-'}</td>
                  <td>
                    <div className="strain-chips">
                      {(d.strains || []).length === 0 ? (
                        <span className="strain-empty">No strains</span>
                      ) : (
                        d.strains.map((s) => (
                          <span
                            key={s.id}
                            className={`strain-chip ${s.is_active ? '' : 'inactive'}`}
                            title={s.mesh_term || ''}
                          >
                            {s.name}
                            <button
                              className="chip-btn"
                              onClick={() => toggleStrain(s)}
                              title={s.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {s.is_active ? '◉' : '○'}
                            </button>
                            <button className="chip-btn" onClick={() => editStrain(d, s)} title="Edit">
                              ✏️
                            </button>
                            <button className="chip-btn" onClick={() => deleteStrain(s.id)} title="Delete">
                              ✕
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                    <button className="btn-link" onClick={() => openAddStrain(d)}>
                      + Add strain
                    </button>
                  </td>
                  <td>
                    <button
                      className={`status-toggle ${d.is_active ? 'active' : 'inactive'}`}
                      onClick={() => toggleDisease(d)}
                    >
                      {d.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>
                    <button className="btn-icon" onClick={() => editDisease(d)}>✏️</button>
                    <button className="btn-icon" onClick={() => deleteDisease(d.id)}>🗑️</button>
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

export default DiseaseManager;
