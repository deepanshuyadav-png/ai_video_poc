import { useState, useEffect } from 'react';
import axios from 'axios';
import '../../styles/admin/Manager.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function VoiceManager() {
  const [voices, setVoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', provider: '', providerVoiceId: '' });
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetchVoices();
  }, []);

  const fetchVoices = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/voices`);
      setVoices(res.data.data || []);
    } catch (err) {
      console.error('Error fetching voices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('name', formData.name);
    data.append('provider', formData.provider);
    data.append('providerVoiceId', formData.providerVoiceId);
    if (file) data.append('sample', file);

    try {
      if (editingId) {
        await axios.put(`${API_URL}/admin/voices/${editingId}`, data);
      } else {
        await axios.post(`${API_URL}/admin/voices`, data);
      }
      resetForm();
      fetchVoices();
    } catch (err) {
      console.error('Error saving voice:', err);
    }
  };

  const handleEdit = (voice) => {
    setEditingId(voice.id);
    setFormData({
      name: voice.name,
      provider: voice.provider || '',
      providerVoiceId: voice.provider_voice_id || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this voice?')) return;
    try {
      await axios.delete(`${API_URL}/admin/voices/${id}`);
      fetchVoices();
    } catch (err) {
      console.error('Error deleting voice:', err);
    }
  };

  const handleToggleActive = async (voice) => {
    try {
      const data = new FormData();
      data.append('isActive', !voice.is_active);
      await axios.put(`${API_URL}/admin/voices/${voice.id}`, data);
      fetchVoices();
    } catch (err) {
      console.error('Error toggling voice:', err);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', provider: '', providerVoiceId: '' });
    setFile(null);
  };

  if (loading) return <div className="manager-loading">Loading...</div>;

  return (
    <div className="manager">
      <div className="manager-header">
        <h1>Voices</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + Add Voice
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{editingId ? 'Edit Voice' : 'Add Voice'}</h2>
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
                <label>Sample Audio</label>
                <input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files[0])} />
              </div>
              <div className="form-group">
                <label>Provider</label>
                <select
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                >
                  <option value="">Select Provider</option>
                  <option value="elevenlabs">ElevenLabs</option>
                  <option value="aws-polly">AWS Polly</option>
                  <option value="google-tts">Google TTS</option>
                </select>
              </div>
              <div className="form-group">
                <label>Provider Voice ID</label>
                <input
                  type="text"
                  value={formData.providerVoiceId}
                  onChange={(e) => setFormData({ ...formData, providerVoiceId: e.target.value })}
                  placeholder="External voice reference"
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
              <th>Sample</th>
              <th>Name</th>
              <th>Provider</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {voices.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-state">No voices yet. Add your first voice!</td>
              </tr>
            ) : (
              voices.map((voice) => (
                <tr key={voice.id}>
                  <td>
                    {voice.sample_audio_path ? (
                      <audio controls className="audio-preview">
                        <source src={`${API_URL.replace('/api', '')}/files/${voice.sample_audio_path}`} />
                      </audio>
                    ) : (
                      <div className="audio-placeholder">🎙️</div>
                    )}
                  </td>
                  <td>{voice.name}</td>
                  <td>{voice.provider || '-'}</td>
                  <td>
                    <button
                      className={`status-toggle ${voice.is_active ? 'active' : 'inactive'}`}
                      onClick={() => handleToggleActive(voice)}
                    >
                      {voice.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>
                    <button className="btn-icon" onClick={() => handleEdit(voice)}>✏️</button>
                    <button className="btn-icon" onClick={() => handleDelete(voice.id)}>🗑️</button>
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

export default VoiceManager;
