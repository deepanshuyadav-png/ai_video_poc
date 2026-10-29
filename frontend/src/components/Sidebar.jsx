import '../styles/Sidebar.css';

function Sidebar({ requests, selectedRequest, onSelectRequest, onNewRequest, user, onLogout, onGoToAdmin, onGoToResearch, activeView }) {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getPreview = (request) => {
    if (request.original_text) {
      return request.original_text.slice(0, 30) + (request.original_text.length > 30 ? '...' : '');
    }
    if (request.input_document_path) {
      return '📄 Document uploaded';
    }
    return 'New request';
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Medical Video POC</h2>
      </div>

      <button className="new-request-btn" onClick={onNewRequest}>
        <span>+</span> New Request
      </button>

      <div className="sidebar-nav">
        <button
          className={`sidebar-nav-btn ${activeView === 'generation' ? 'active' : ''}`}
          onClick={onNewRequest}
        >
          🎬 Video Generation
        </button>
        <button
          className={`sidebar-nav-btn ${activeView === 'research' ? 'active' : ''}`}
          onClick={onGoToResearch}
        >
          🔬 PubMed Research
        </button>
      </div>

      <div className="requests-list">
        {requests.length === 0 ? (
          <p className="no-requests">No requests yet</p>
        ) : (
          requests.map((request) => (
            <div
              key={request.id}
              className={`request-item ${selectedRequest?.id === request.id ? 'active' : ''}`}
              onClick={() => onSelectRequest(request)}
            >
              <div className="request-preview">{getPreview(request)}</div>
              <div className="request-meta">
                <span className={`status-badge ${request.status}`}>{request.status}</span>
                <span className="request-date">{formatDate(request.created_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="sidebar-footer">
        {onGoToAdmin && (
          <button className="admin-link-btn" onClick={onGoToAdmin}>
            ⚙️ Admin Panel
          </button>
        )}
        <div className="user-info">
          <span className="user-email">{user?.email}</span>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
