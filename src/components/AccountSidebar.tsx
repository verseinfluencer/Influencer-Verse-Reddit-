import React from 'react';
import { User as UserIcon, Settings, HeartHandshake } from 'lucide-react';

interface AccountSidebarProps {
  activeTab: 'profile' | 'settings' | 'tickets';
  onNavigate: (page: string) => void;
}

export const AccountSidebar: React.FC<AccountSidebarProps> = ({ activeTab, onNavigate }) => {
  const menu = [
    { id: 'profile', label: 'My Profile', icon: UserIcon },
    { id: 'settings', label: 'Platform Settings', icon: Settings },
    { id: 'tickets', label: 'Help Support', icon: HeartHandshake },
  ];

  return (
    <div className="flex flex-col sm:flex-row md:flex-col gap-1.5 w-full md:w-64 bg-white border border-gray-200 rounded-2xl p-2 h-auto md:h-fit shadow-sm shrink-0">
      {menu.map((item) => {
        const isActive = activeTab === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-full text-xs sm:text-sm font-semibold transition-all w-full cursor-pointer border border-transparent ${
              isActive
                ? 'bg-purple-50 text-purple-700 font-bold'
                : 'bg-transparent text-gray-700 hover:bg-purple-50 hover:text-purple-700'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-purple-600' : 'text-gray-400'}`} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};
