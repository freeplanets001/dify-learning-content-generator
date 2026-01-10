import { useState, useEffect } from 'react';

function Header() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-white shadow-sm border-b border-secondary-200 flex items-center justify-between px-6">
      <div>
        <h2 className="text-lg font-semibold text-secondary-900">
          学習コンテンツ自動生成プラットフォーム
        </h2>
      </div>
      <div className="flex items-center space-x-4">
        <div className="text-sm text-secondary-600">
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
