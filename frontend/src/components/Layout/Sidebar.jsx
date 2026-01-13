import { NavLink } from 'react-router-dom';

const navigation = [
  {
    name: 'ダッシュボード',
    path: '/dashboard',
    icon: '📊'
  },
  {
    name: '情報収集',
    path: '/collector',
    icon: '🔍'
  },
  {
    name: 'Obsidian連携',
    path: '/obsidian',
    icon: '📝'
  },
  {
    name: 'コンテンツ生成',
    path: '/content',
    icon: '✨'
  },
  {
    name: '画像生成',
    path: '/image-generator',
    icon: '🎨'
  },
  {
    name: '設定',
    path: '/settings',
    icon: '⚙️'
  }
];

function Sidebar({ isOpen, onClose }) {
  return (
    <div
      className={`fixed z-30 inset-y-0 left-0 w-64 transition duration-300 transform bg-white shadow-lg overflow-y-auto lg:translate-x-0 lg:static lg:inset-0 ${isOpen ? 'translate-x-0 ease-out' : '-translate-x-full ease-in'
        }`}
    >
      <div className="flex items-center justify-between h-16 border-b border-secondary-200 px-6">
        <h1 className="text-xl font-bold text-primary-600">Dify Learning</h1>
        <button onClick={onClose} className="text-gray-500 lg:hidden">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <nav className="mt-6">
        {navigation.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center px-6 py-3 text-secondary-700 hover:bg-primary-50 hover:text-primary-600 transition-colors ${isActive ? 'bg-primary-50 text-primary-600 border-r-4 border-primary-600' : ''
              }`
            }
          >
            <span className="text-2xl mr-3">{item.icon}</span>
            <span className="font-medium">{item.name}</span>
          </NavLink>
        ))}
      </nav>
      <div className="absolute bottom-0 w-64 p-4 border-t border-secondary-200">
        <p className="text-xs text-secondary-500 text-center">
          v1.1.0 - Mobile Ready
        </p>
      </div>
    </div>
  );
}

export default Sidebar;
