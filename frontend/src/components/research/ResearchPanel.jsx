import { useState, useEffect } from 'react';
import axios from 'axios';
import ResearchForm from './ResearchForm';
import ResearchResult from './ResearchResult';
import '../../styles/Research.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function ResearchPanel() {
  const [catalog, setCatalog] = useState(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [history, setHistory] = useState([]);
  const [current, setCurrent] = useState(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetchCatalog();
    fetchHistory();
  }, []);

  const fetchCatalog = async () => {
    try {
      const res = await axios.get(`${API_URL}/research/catalog`);
      setCatalog(res.data.data);
    } catch (err) {
      console.error('Error fetching research catalog:', err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/research`);
      setHistory(res.data.data || []);
    } catch (err) {
      console.error('Error fetching research history:', err);
    }
  };

  const handleSubmit = async (payload) => {
    setRunning(true);
    // Optimistic "pending" view while the (synchronous) pipeline runs.
    setCurrent({
      status: 'building_query',
      disease_name: catalog?.diseases?.find((d) => d.id === payload.diseaseId)?.name,
      strain_name: payload.strainId
        ? catalog?.diseases
            ?.find((d) => d.id === payload.diseaseId)
            ?.strains?.find((s) => s.id === payload.strainId)?.name
        : null,
      papers: [],
    });

    try {
      const res = await axios.post(`${API_URL}/research`, payload);
      setCurrent(res.data.data);
      fetchHistory();
    } catch (err) {
      console.error('Error running research:', err);
      // The backend returns the failed request in err.response.data.data.
      const failed = err.response?.data?.data;
      setCurrent(
        failed || {
          status: 'failed',
          error_message: err.response?.data?.error || err.message,
          papers: [],
        }
      );
      fetchHistory();
    } finally {
      setRunning(false);
    }
  };

  const openHistoryItem = async (item) => {
    try {
      const res = await axios.get(`${API_URL}/research/${item.request_id}`);
      setCurrent(res.data.data);
    } catch (err) {
      console.error('Error opening research request:', err);
    }
  };

  const startNew = () => setCurrent(null);

  return (
    <div className="research-panel">
      <aside className="research-sidebar">
        <div className="research-sidebar-header">
          <h3>Research</h3>
          <button className="research-new-btn" onClick={startNew}>+ New</button>
        </div>

        {loadingCatalog ? (
          <p className="research-loading">Loading…</p>
        ) : (
          <ResearchForm catalog={catalog} onSubmit={handleSubmit} running={running} />
        )}

        <div className="research-history">
          <h4>Past runs</h4>
          {history.length === 0 ? (
            <p className="research-loading">No runs yet</p>
          ) : (
            history.map((h) => (
              <button
                key={h.id}
                className={`research-history-item ${current?.request_id === h.request_id ? 'active' : ''}`}
                onClick={() => openHistoryItem(h)}
              >
                <span className="history-title">
                  {h.disease_name}
                  {h.strain_name ? ` (${h.strain_name})` : ''}
                </span>
                <span className={`status-badge ${h.status}`}>{h.status}</span>
              </button>
            ))
          )}
        </div>
      </aside>

      <main className="research-main">
        <ResearchResult request={current} />
      </main>
    </div>
  );
}

export default ResearchPanel;
