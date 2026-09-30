import { useNavigate } from 'react-router-dom';
import '../../styles/admin/AdminSidebar.css';

function AdminSidebar({ activeTab, onTabChange, user, onLogout }) {
  const navigate = useNavigate();

  const menuItems = [
    { id: 'avatars', label: 'Avatars', icon: '👤' },
    { id: 'voices', label: 'Voices', icon: '🎙️' },
    { id: 'providers', label: 'Configurations', icon: '⚙️' },
  ];

  return (
    <div className="admin-sidebar">
      <div className="admin-sidebar-header">
        <h2>Admin Panel</h2>
      </div>

      <button className="back-to-app-btn" onClick={() => navigate('/')}>
        ← Back to App
      </button>

      <nav className="admin-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`admin-nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="admin-sidebar-footer">
        <div className="admin-user-info">
          <span className="admin-badge">Admin</span>
          <span className="admin-email">{user?.email}</span>
        </div>
        <button className="admin-logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

export default AdminSidebar;
