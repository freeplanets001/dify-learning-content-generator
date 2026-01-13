import { useState, useEffect } from 'react';

function Header({ onMenuClick }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-white shadow-sm border-b border-secondary-200 flex items-center justify-between px-6">
      <div className="flex items-center">
        <button
          onClick={onMenuClick}
          className="text-secondary-500 focus:outline-none lg:hidden mr-4"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>
        <h2 className="hidden lg:block text-lg font-semibold text-secondary-900">
          学習コンテンツ自動生成プラットフォーム
        </h2>
        <h2 className="lg:hidden text-lg font-semibold text-secondary-900">
          Dify Learning
        </h2>
      </div>
      <div className="flex items-center space-x-2 lg:space-x-4">
        <div className="text-xs lg:text-sm text-secondary-600">
          {currentTime.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })}
        </div>
        <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold">
          U
        </div>
      </div>
    </header>
  );
}

export default Header;
