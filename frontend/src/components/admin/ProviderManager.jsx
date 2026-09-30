import { useState, useEffect } from 'react';
import axios from 'axios';
import '../../styles/admin/Manager.css';
import '../../styles/admin/ProviderManager.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  { value: 'anthropic', label: 'Anthropic', models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'] },
  { value: 'google-genai', label: 'Google Gemini', models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'] },
];

function ProviderManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeConfigId, setActiveConfigId] = useState(null);
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({ provider: '', model: '', apiKey: '' });

  useEffect(() => { fetchActiveConfig(); }, []);

  const fetchActiveConfig = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/providers`);
      const active = (res.data.data || []).find(c => c.is_active);
      if (active) {
        setActiveConfigId(active.id);
        setFormData({ provider: active.provider, model: active.model, apiKey: '' });
      }
    } catch (err) {
      console.error('Error fetching config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (provider) => {
    setFormData({ ...formData, provider, model: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let id = activeConfigId;
      if (id) {
        await axios.put(`${API_URL}/admin/providers/${id}`, formData);
      } else {
        const res = await axios.post(`${API_URL}/admin/providers`, { ...formData, name: formData.provider });
        id = res.data.data.id;
        await axios.patch(`${API_URL}/admin/providers/${id}/activate`);
        setActiveConfigId(id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      // re-fetch to sync
      fetchActiveConfig();
    } catch (err) {
      console.error('Error saving config:', err);
    } finally {
      setSaving(false);
    }
  };

  const selectedProvider = PROVIDERS.find(p => p.value === formData.provider);

  if (loading) return <div className="manager-loading">Loading...</div>;

  return (
    <div className="manager">
      <div className="manager-header">
        <h1>Configurations</h1>
        {activeConfigId && (
          <span className="config-active-badge">✓ Active</span>
        )}
      </div>

      <div className="config-form-card">
        <p className="config-description">
          Configure the LLM provider and model that will be used for medical text simplification.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="config-form-grid">
            <div className="form-group">
              <label>LLM Provider</label>
              <select
                value={formData.provider}
                onChange={(e) => handleProviderChange(e.target.value)}
                required
              >
                <option value="">Select Provider</option>
                {PROVIDERS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Model</label>
              <select
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                required
                disabled={!selectedProvider}
              >
                <option value="">Select Model</option>
                {selectedProvider?.models.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="form-group form-group-full">
              <label>
                API Key
                {activeConfigId && <span className="label-hint"> — leave blank to keep existing</span>}
              </label>
              <input
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder={activeConfigId ? '••••••••••••  (already set)' : 'Enter API key'}
                required={!activeConfigId}
              />
            </div>
          </div>

          <div className="config-form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : activeConfigId ? 'Update Configuration' : 'Save Configuration'}
            </button>
            {saved && <span className="config-saved-msg">✓ Saved successfully</span>}
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProviderManager;
