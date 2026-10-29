import { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import AvatarManager from './AvatarManager';
import VoiceManager from './VoiceManager';
import ProviderManager from './ProviderManager';
import UserManager from './UserManager';
import DiseaseManager from './DiseaseManager';
import ResearchFilterManager from './ResearchFilterManager';
import ResearchSettings from './ResearchSettings';
import '../../styles/admin/AdminLayout.css';

function AdminLayout({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('avatars');

  const renderContent = () => {
    switch (activeTab) {
      case 'avatars': return <AvatarManager />;
      case 'voices': return <VoiceManager />;
      case 'providers': return <ProviderManager />;
      case 'diseases': return <DiseaseManager />;
      case 'research-filters': return <ResearchFilterManager />;
      case 'research-settings': return <ResearchSettings />;
      case 'users': return <UserManager />;
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
