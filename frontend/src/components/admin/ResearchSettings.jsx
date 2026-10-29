import { useState, useEffect } from 'react';
import axios from 'axios';
import '../../styles/admin/Manager.css';
import '../../styles/admin/ProviderManager.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function ResearchSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [form, setForm] = useState({ topK: 10, ncbiApiKey: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/research/settings`);
      const data = res.data.data;
      if (data) {
        setForm({ topK: data.top_k, ncbiApiKey: '' });
        setHasKey(!!data.ncbi_api_key);
      }
    } catch (err) {
      console.error('Error fetching research settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (payload) => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/admin/research/settings`, payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await fetchSettings();
      setForm((f) => ({ ...f, ncbiApiKey: '' }));
    } catch (err) {
      console.error('Error saving research settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { topK: form.topK };
    // Only send the key if the admin typed one (blank keeps existing).
    if (form.ncbiApiKey !== '') {
      payload.ncbiApiKey = form.ncbiApiKey;
    }
    await saveSettings(payload);
  };

  // Explicitly clear a stored key (send empty string -> backend stores NULL).
  const handleClearKey = async () => {
    if (!confirm('Remove the stored NCBI API key? PubMed will run without a key (3 req/sec).')) return;
    await saveSettings({ topK: form.topK, ncbiApiKey: '' });
  };

  if (loading) return <div className="manager-loading">Loading...</div>;

  return (
    <div className="manager">
      <div className="manager-header">
        <h1>Research Settings</h1>
      </div>

      <div className="config-form-card">
        <p className="config-description">
          Controls the PubMed research feature. <strong>Top-K</strong> is how many papers are
          fetched and synthesized per request. The NCBI API key is optional — it only raises the
          PubMed rate limit.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="config-form-grid">
            <div className="form-group">
              <label>Top-K papers (1–100)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={form.topK}
                onChange={(e) => setForm({ ...form, topK: e.target.value })}
                required
              />
            </div>

            <div className="form-group form-group-full">
              <label>
                NCBI API Key (optional)
                {hasKey && <span className="label-hint"> — leave blank to keep existing</span>}
              </label>
              <input
                type="password"
                value={form.ncbiApiKey}
                onChange={(e) => setForm({ ...form, ncbiApiKey: e.target.value })}
                placeholder={hasKey ? '••••••••••••  (already set)' : 'Enter NCBI API key (leave blank to run without one)'}
              />
              {hasKey && (
                <button type="button" className="btn-secondary clear-key-btn" onClick={handleClearKey}>
                  Clear stored key
                </button>
              )}
            </div>
          </div>

          <div className="config-form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            {saved && <span className="config-saved-msg">✓ Saved successfully</span>}
          </div>
        </form>
      </div>
    </div>
  );
}

export default ResearchSettings;
