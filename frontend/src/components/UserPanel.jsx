import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import ResearchPanel from './research/ResearchPanel';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function UserPanel({ user, onLogout }) {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [view, setView] = useState('generation'); // 'generation' | 'research'
  const navigate = useNavigate();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await axios.get(`${API_URL}/generation`);
      setRequests(res.data.data || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
      if (err.response?.status === 401) {
        onLogout();
      }
    }
  };

  const handleNewRequest = () => {
    setSelectedRequest(null);
    setView('generation');
  };

  const handleSelectRequest = (request) => {
    setSelectedRequest(request);
    setView('generation');
  };

  const handleGoToResearch = () => {
    setView('research');
  };

  const handleSubmit = async (inputType, text, file, avatarId, voiceId) => {
    // Show pending message immediately
    const pendingRequest = {
      id: 'pending-' + Date.now(),
      original_text: text,
      status: 'processing',
      created_at: new Date().toISOString()
    };
    setSelectedRequest(pendingRequest);

    try {
      const formData = new FormData();
      formData.append('inputType', inputType);
      if (inputType === 'text') {
        formData.append('originalText', text);
      } else if (file) {
        formData.append('document', file);
      }
      if (avatarId) formData.append('avatarId', avatarId);
      if (voiceId) formData.append('voiceId', voiceId);

      console.log('Submitting to:', `${API_URL}/generation`);
      const res = await axios.post(`${API_URL}/generation`, formData);
      console.log('Response:', res.data);
      
      // Update with actual response data
      if (res.data.data) {
        setSelectedRequest(res.data.data);
        setRequests(prev => [res.data.data, ...prev]);
      }
    } catch (err) {
      console.error('Error submitting:', err);
      console.error('Error response:', err.response?.data);
      setSelectedRequest({
        ...pendingRequest,
        status: 'failed',
        error_message: err.response?.data?.error || err.message
      });
    }
  };

  const handleGoToAdmin = () => {
    navigate('/admin');
  };

  return (
    <div className="app">
      <Sidebar
        requests={requests}
        selectedRequest={selectedRequest}
        onSelectRequest={handleSelectRequest}
        onNewRequest={handleNewRequest}
        user={user}
        onLogout={onLogout}
        onGoToAdmin={user.role === 'admin' ? handleGoToAdmin : null}
        onGoToResearch={handleGoToResearch}
        activeView={view}
      />
      {view === 'research' ? (
        <ResearchPanel />
      ) : (
        <ChatArea
          selectedRequest={selectedRequest}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

export default UserPanel;
