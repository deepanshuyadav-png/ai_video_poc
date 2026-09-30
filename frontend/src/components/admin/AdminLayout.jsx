import { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import AvatarManager from './AvatarManager';
import VoiceManager from './VoiceManager';
import ProviderManager from './ProviderManager';
import '../../styles/admin/AdminLayout.css';

function AdminLayout({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('avatars');

  const renderContent = () => {
    switch (activeTab) {
      case 'avatars': return <AvatarManager />;
      case 'voices': return <VoiceManager />;
      case 'providers': return <ProviderManager />;
      default: return <AvatarManager />;
    }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
        onLogout={onLogout}
      />
      <main className="admin-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default AdminLayout;
