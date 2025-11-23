
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SearchIcon, PlusIcon, FolderIcon } from './components/Icons';
import { FolderCard } from './components/FolderCard';
import { SmartImportModal } from './components/SmartImportModal';
import { ConnectModal } from './components/ConnectModal';
import { Breadcrumbs } from './components/Breadcrumbs';
import { FilePreviewModal } from './components/FilePreviewModal';
import { fetchDriveData } from './services/apiService';
import { DirectoryItem } from './types';

// Updated link as requested
const SHARED_DRIVE_LINK = "https://drive.google.com/drive/folders/1Ja7GDH5PZMabdkGXhmfTg_hbG1mSzpWk?usp=drive_link";
const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzzcYqZ0dim-GkR5iywtgdHlAiQ0eLbf2hbasqGlb9-HMvXWSn3wfKvagwecEu2eyZt/exec";

interface HistoryItem {
  id: string;
  name: string;
}

type TimeRange = '7' | '30' | '90' | '180' | '365' | 'all';
type SearchScope = 'global' | 'current';

const App: React.FC = () => {
  // State Management
  const [items, setItems] = useState<DirectoryItem[]>([]);
  const [folderCache, setFolderCache] = useState<Record<string, DirectoryItem[]>>({});
  const [scriptUrl, setScriptUrl] = useState<string>(() => {
    return localStorage.getItem('drive-script-url') || DEFAULT_SCRIPT_URL;
  });
  
  // Navigation State
  const [history, setHistory] = useState<HistoryItem[]>([{ id: 'root', name: 'Kho Hồ Sơ Tổng' }]);
  const currentFolderId = history[history.length - 1]?.id;

  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('global');
  const [timeRange, setTimeRange] = useState<TimeRange>('30'); // Default 30 days
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<DirectoryItem | null>(null);
  
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save Script URL
  useEffect(() => {
    if(scriptUrl) localStorage.setItem('drive-script-url', scriptUrl);
  }, [scriptUrl]);

  // Main Data Loading Logic
  const refreshData = useCallback(async (url: string, folderId: string | undefined, query: string | undefined, days: string, scope: SearchScope = 'global') => {
      setIsLoading(true);
      setError(null);
      
      if (!query) { 
        // If simply browsing, clear to show loading
        setItems([]);
      }

      try {
          // If scope is global search, we ignore folderId usually, but let's pass it anyway
          const effectiveFolderId = (query && scope === 'global') ? undefined : folderId;

          const data = await fetchDriveData(url, effectiveFolderId, query, days, scope);
          
          if (data.length > 0 && data[0].name.startsWith("Lỗi:")) {
              setError(data[0].name);
              if (!query) setItems([]); 
          } else {
              setItems(data);

              // Update Cache only if it's a standard browse view (not search)
              if (!query && days === '30') {
                  setFolderCache(prev => ({
                      ...prev,
                      [folderId || 'root']: data
                  }));
              }
          }
      } catch (e: any) {
          console.error(e);
          const msg = e.message === "Failed to fetch" ? "Không thể kết nối đến Server." : e.message;
          setError(msg || "Không thể tải dữ liệu.");
      } finally {
          setIsLoading(false);
      }
  }, []);

  // Effect to load data when navigation/time changes (BUT NOT SEARCH QUERY)
  useEffect(() => {
      if (!scriptUrl) return;

      const folderIdToFetch = currentFolderId === 'root' ? undefined : currentFolderId;
      
      // Optimization: Use cache if available AND default time range
      if (folderCache[currentFolderId] && !activeTag && searchQuery === '' && timeRange === '30') {
          setItems(folderCache[currentFolderId]);
          setIsLoading(false);
          setError(null);
          return;
      }

      // Fetch from server (Standard Browse)
      // Only fetch if NOT searching. Search is triggered by Enter or explicit button.
      if (searchQuery === '') {
          refreshData(scriptUrl, folderIdToFetch, undefined, timeRange);
      }
  }, [currentFolderId, scriptUrl, timeRange, refreshData]); 

  // --- Handlers ---

  const handleManualImport = (newItems: DirectoryItem[]) => {
    setItems(newItems);
  };

  const handleConnectSave = (url: string) => {
      setScriptUrl(url);
      setFolderCache({}); 
      setHistory([{ id: 'root', name: 'Kho Hồ Sơ Tổng' }]);
      setSearchQuery('');
  };

  const handleFolderNavigate = (item: DirectoryItem) => {
      setHistory(prev => [...prev, { id: item.id, name: item.name }]);
      setSearchQuery(''); 
      setActiveTag(null);
  };

  const handleBreadcrumbNavigate = (index: number) => {
      setHistory(prev => prev.slice(0, index + 1));
      setSearchQuery('');
      setActiveTag(null);
  };

  const handleOpenPreview = (item: DirectoryItem) => {
    if (item) {
        setPreviewItem(item);
    }
  };

  const handleClosePreview = () => {
    setPreviewItem(null);
  };

  const handleOpenConnectModal = () => {
    setIsConnectModalOpen(true);
  };

  const handleCloseConnectModal = () => {
    setIsConnectModalOpen(false);
  };

  const handleOpenImportModal = () => {
    setIsImportModalOpen(true);
  };

  const handleCloseImportModal = () => {
    setIsImportModalOpen(false);
  };

  // CLIENT-SIDE SEARCH + SERVER FALLBACK
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // On Enter, trigger Server-Side Search
      const folderIdToFetch = currentFolderId === 'root' ? undefined : currentFolderId;
      refreshData(scriptUrl, folderIdToFetch, searchQuery, timeRange, searchScope);
  };

  const handleClearSearch = () => {
      setSearchQuery('');
      // If we were in a "Server Search Results" state, we might want to reload the folder content
      // Check if current items are search results or folder content
      if (items.length > 0 && !folderCache[currentFolderId || 'root']?.includes(items[0])) {
          // It was likely a server search result, so reload folder
          const folderIdToFetch = currentFolderId === 'root' ? undefined : currentFolderId;
          refreshData(scriptUrl, folderIdToFetch, undefined, timeRange);
      }
  };

  const handleRefreshClick = () => {
    const folderIdToFetch = currentFolderId === 'root' ? undefined : currentFolderId;
    refreshData(scriptUrl, folderIdToFetch, searchQuery || undefined, timeRange, searchScope);
  };
  
  const handleTimeRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setTimeRange(e.target.value as TimeRange);
  };

  // SMART FILTERING
  const filteredItems = useMemo(() => {
    let result = items;

    // 1. Filter by Tag
    if (activeTag) {
        result = result.filter(item => item.tags && item.tags.includes(activeTag));
    }

    // 2. Filter by Search Query (Client-Side Fuzzy - ONLY if in 'current' scope and not explicitly submitting to server yet)
    // Actually, we want client-side filter to feel instant, but if user hits Enter, we do server search.
    // For now, let's keep instant filter on result set.
    if (searchQuery && items.length > 0) {
       // Only filter client-side if we haven't just done a server fetch for this query
       // This is a bit tricky. Let's simplfy: The items array IS the source of truth.
       // If items came from a Browse call, we filter them.
       // If items came from a Search call, they are already filtered by server.
       
       // Heuristic: If we are browsing (no server query param active in last fetch)
       // But keeping it simple: Just filter locally what we have.
       const lowerQ = searchQuery.toLowerCase();
       // Note: If we just fetched server results for "Nguyen", items already contains "Nguyen".
       // Filtering again is harmless.
       result = result.filter(item => 
            item.name.toLowerCase().includes(lowerQ) || 
            (item.description && item.description.toLowerCase().includes(lowerQ))
       );
    }

    return result;
  }, [items, activeTag, searchQuery]);

  // Unique tags for filter bar
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    items.forEach(item => item.tags?.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [items]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => handleBreadcrumbNavigate(0)}>
            <div className="bg-blue-600 p-1.5 rounded-lg text-white shadow-lg shadow-blue-600/20">
              <FolderIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-tight">Tra Cứu Hồ Sơ</h1>
              <a 
                href={SHARED_DRIVE_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-blue-600 hover:underline font-medium flex items-center gap-1"
              >
                Drive Gốc ↗
              </a>
            </div>
          </div>

          <div className="flex items-center gap-3">
             {/* Search Desktop */}
            <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center relative group">
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5 border border-transparent focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
                  <div className="relative flex items-center">
                    <SearchIcon className="absolute left-3 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Tìm kiếm..." 
                        value={searchQuery}
                        onChange={handleSearchInputChange}
                        className="pl-9 pr-2 py-1.5 w-56 bg-transparent border-none focus:ring-0 text-sm outline-none"
                    />
                  </div>
                  
                  {/* Scope Selector */}
                  <div className="h-4 w-px bg-gray-300 mx-1"></div>
                  <select 
                    value={searchScope}
                    onChange={(e) => setSearchScope(e.target.value as SearchScope)}
                    className="bg-transparent border-none text-xs font-medium text-gray-600 focus:ring-0 cursor-pointer pr-7 pl-2 py-1 hover:text-blue-600"
                  >
                      <option value="global">Toàn bộ</option>
                      <option value="current">Thư mục này</option>
                  </select>
              </div>
            </form>
            
            <button 
                onClick={handleOpenConnectModal}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors border text-sm ${scriptUrl ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                title="Cấu hình API"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span className="hidden sm:inline">Cập nhật API</span>
            </button>
          </div>
        </div>
        
        {/* Mobile Search */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3 overflow-x-auto scrollbar-hide flex flex-col gap-2">
           <form onSubmit={handleSearchSubmit} className="md:hidden relative flex flex-col gap-2">
              <div className="relative">
                  <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Tìm kiếm..." 
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                    className="pl-9 pr-8 py-2 w-full bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                  {searchQuery && (
                      <button 
                        type="button"
                        onClick={handleClearSearch}
                        className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                      >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                  )}
              </div>
              <div className="flex gap-2">
                 <select 
                    value={searchScope}
                    onChange={(e) => setSearchScope(e.target.value as SearchScope)}
                    className="flex-1 bg-white border border-gray-200 text-gray-700 text-xs py-1.5 px-3 rounded-lg"
                  >
                      <option value="global">Tìm: Toàn bộ</option>
                      <option value="current">Tìm: Thư mục này</option>
                  </select>
                  <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap">
                      Tìm
                  </button>
              </div>
           </form>

          {allTags.length > 0 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                <button 
                    onClick={() => setActiveTag(null)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${!activeTag ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                >
                    Tất cả tags
                </button>
                {allTags.map(tag => (
                    <button
                    key={tag}
                    onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all capitalize border ${activeTag === tag ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}
                    >
                    {tag}
                    </button>
                ))}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        
        <Breadcrumbs items={history} onNavigate={handleBreadcrumbNavigate} />

        {/* Actions Bar */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                {history.length > 1 ? history[history.length - 1].name : 'Danh sách hồ sơ'}
            </h2>
            <div className="text-gray-500 mt-1 text-xs flex items-center gap-2">
                {isLoading ? (
                    <span className="flex items-center gap-2 text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Đang tải dữ liệu...
                    </span>
                ) : (
                    <span>
                        {searchQuery && filteredItems.length === 0
                         ? `Không thấy kết quả cho "${searchQuery}"`
                         : `Hiển thị ${filteredItems.length} mục`
                        }
                    </span>
                )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
              {/* TIME RANGE SELECTOR */}
              <div className="relative">
                  <select
                    value={timeRange}
                    onChange={handleTimeRangeChange}
                    disabled={isLoading}
                    className="appearance-none bg-white border border-gray-200 text-gray-700 text-sm py-1.5 pl-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:bg-gray-50"
                  >
                      <option value="7">7 ngày qua</option>
                      <option value="30">30 ngày qua</option>
                      <option value="90">3 tháng qua</option>
                      <option value="180">6 tháng qua</option>
                      <option value="365">1 năm qua</option>
                      <option value="all">Tất cả thời gian</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
              </div>

              {scriptUrl && (
                  <button 
                    onClick={handleRefreshClick}
                    disabled={isLoading}
                    className="text-blue-600 text-sm hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-medium border border-transparent hover:border-blue-100"
                  >
                    <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    <span className="hidden sm:inline">Làm mới</span>
                  </button>
              )}
          </div>
        </div>

        {/* ERROR DISPLAYS */}
        {error && (
             <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-4 rounded-xl text-sm flex flex-col gap-2 shadow-sm">
                <div className="flex items-center gap-3 font-bold text-red-800">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    Lỗi kết nối
                </div>
                <p>{error}</p>
                <div className="flex gap-3 mt-2">
                    <button onClick={handleOpenConnectModal} className="bg-red-600 text-white px-4 py-2 rounded-lg self-start font-medium hover:bg-red-700 transition-colors">
                        Kiểm tra Code API
                    </button>
                    <button onClick={handleRefreshClick} className="bg-white border border-red-300 text-red-700 px-4 py-2 rounded-lg self-start font-medium hover:bg-red-50 transition-colors">
                        Thử lại
                    </button>
                </div>
             </div>
        )}

        {/* Grid */}
        {isLoading && items.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
                    <div key={i} className="h-48 bg-gray-200 rounded-xl"></div>
                ))}
            </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredItems.map(item => (
              <FolderCard 
                key={item.id} 
                item={item} 
                onNavigate={handleFolderNavigate}
                onPreview={handleOpenPreview}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="mx-auto h-20 w-20 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 mb-4">
               <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900">Không tìm thấy kết quả</h3>
            <p className="mt-2 text-gray-500 max-w-md mx-auto">
                {searchQuery 
                    ? `Không tìm thấy nội dung phù hợp với "${searchQuery}" ${searchScope === 'current' ? 'trong thư mục này' : ''}.` 
                    : `Thư mục trống hoặc hồ sơ đã bị ẩn bởi bộ lọc thời gian (${timeRange}).`}
            </p>
            
            <div className="mt-6 flex flex-col items-center gap-3">
                {/* 1. Solution for Hidden Files due to Time Filter */}
                {!searchQuery && timeRange !== 'all' && (
                    <button 
                        onClick={() => {
                            setTimeRange('all');
                            // We need to trigger a refresh manually here because useEffect depends on timeRange, 
                            // but sometimes explicit action is better UX
                        }}
                        className="px-6 py-3 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2 shadow-md animate-bounce"
                    >
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                         Hiển thị tất cả (Bỏ lọc thời gian)
                    </button>
                )}

                {/* 2. Solution for Local Search returning nothing -> Suggest Global Search */}
                {searchQuery && searchScope === 'current' && (
                    <button 
                        onClick={() => {
                            setSearchScope('global');
                            // Trigger submit immediately
                            setTimeout(() => {
                                const folderIdToFetch = currentFolderId === 'root' ? undefined : currentFolderId;
                                refreshData(scriptUrl, folderIdToFetch, searchQuery, timeRange, 'global');
                            }, 100);
                        }}
                        className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                    >
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                         Tìm "{searchQuery}" trên toàn bộ Server
                    </button>
                )}

                <button 
                    onClick={handleClearSearch}
                    className="text-gray-500 hover:text-gray-700 text-sm underline mt-2"
                >
                    {searchQuery ? 'Xóa tìm kiếm' : 'Quay lại thư mục trước'}
                </button>
            </div>
            
            {!searchQuery && (
                <div className="mt-8 flex justify-center gap-3">
                     {history.length > 1 && (
                         <button 
                            onClick={() => handleBreadcrumbNavigate(history.length - 2)}
                            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                         >
                             Quay lại thư mục trước
                         </button>
                     )}
                </div>
            )}
          </div>
        )}
      </main>

      <SmartImportModal 
        isOpen={isImportModalOpen} 
        onClose={handleCloseImportModal} 
        onImport={handleManualImport}
      />

      <ConnectModal 
        isOpen={isConnectModalOpen}
        onClose={handleCloseConnectModal}
        onSave={handleConnectSave}
      />

      <FilePreviewModal 
        item={previewItem}
        onClose={handleClosePreview}
      />

      <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
          <div className="max-w-7xl mx-auto px-4 text-center text-xs text-gray-400">
              <p>Hệ thống Tra cứu Hồ sơ Nội soi &copy; 2024</p>
          </div>
      </footer>
    </div>
  );
};

export default App;
