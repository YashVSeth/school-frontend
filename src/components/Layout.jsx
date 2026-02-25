import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { FaBars } from 'react-icons/fa';

const Layout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      {/* Sidebar Component */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Mobile Header (Only visible on small screens) */}
        <header className="lg:hidden bg-white border-b p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={toggleSidebar} className="text-slate-600 hover:text-red-600 p-2 rounded-lg hover:bg-slate-100 transition">
              <FaBars size={24} />
            </button>
            <span className="font-bold text-lg text-slate-800">Radhey Shyam Shakuntala Seth Shikshan Sansthaan </span>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>

      </div>
    </div>
  );
};

export default Layout;