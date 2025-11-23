
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { SearchIcon, PlusIcon, FolderIcon } from './components/Icons';
import { FolderCard } from './components/FolderCard';
import { SmartImportModal } from './components/SmartImportModal';
import { ConnectModal } from './components/ConnectModal';
import { Breadcrumbs } from './components/Breadcrumbs';
import { FilePreviewModal } from './components/FilePreviewModal';
import { fetchDriveData } from './services/apiService';
import { DirectoryItem, ApiResponse } from './types';

// Updated link as requested
const SHARED_DRIVE_LINK = "https://drive.google.com/drive/folders/1Ja7GDH5PZMabdkGXhmfTg_hbG1mSzpWk?usp=drive_link";
const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzzcYqZ0dim-GkR5iywtgdHlAiQ0eLbf2hbasqGlb9-HMvXWSn3wfKvagwecEu2eyZt/exec";

interface HistoryItem {
  id: string;
  name: string;
}

type TimeRange = '7' | '30' | '90' | '180' | '365' | 'all';
type SearchScope = 'global' | 'current';
type LimitOption = 5000 | 10000 | 15000 | 20000 | 'all';

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
  const [timeRange, setTimeRange] = useState<TimeRange>('30'); 
  const [limit, setLimit] = useState<LimitOption>(5000); 
  
  // Pagination State
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string | undefined>(undefined);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<DirectoryItem | null>(null);
  
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for race condition handling
  const latestRequestRef = useRef<number>(0);

  // Save Script URL
  useEffect(() => {
    if(scriptUrl) localStorage.setItem('drive-script-url', scriptUrl);
  }, [scriptUrl]);

  // Main Data Loading Logic
  const refreshData = useCallback(async (
      url: string, 
      folderId: string | undefined, 
      query: string | undefined, 
      days: string, 
      scope: SearchScope = 'global',
      itemLimit: LimitOption = 5000,
      token?: string,
      phase?: string
    ) => {
      const isInitialLoad = !token;
      
      // Update loading state based on type of load
      if (isInitialLoad) {
        setIsLoading(true);
        setItems([]); // Clear previous items on fresh load
      } else {
        setIsFetchingMore(true);
      }
      
      if (isInitialLoad) setError(null);
      
      const requestId = Date.now();
      latestRequestRef.current = requestId;

      try {
          const effectiveFolderId = (query && scope === 'global') ? undefined : folderId;

          const data: ApiResponse = await fetchDriveData(
              url, effectiveFolderId, query, days, scope, itemLimit, token, phase
          );
          
          // Race condition check: If a newer request started, ignore this result
          if (latestRequestRef.current !== requestId) return;

          if (data.error) {
             // Only show error on initial load, otherwise just stop fetching
             if (isInitialLoad) setError(data.error);
             setNextPageToken(null); 
             return;
          }

          // Auto Expand Logic for Empty Results (Only on initial load)
          if (isInitialLoad && data.items.length === 0 && days !== 'all' && !query && folderId !== undefined && folderId !== 'root') {
              setTimeRange('all');
              // Recursively call for all time
              refreshData(url, folderId, query, 'all', scope, itemLimit);
              return;
          }
          
          setItems(prev => {
              const combined = isInitialLoad ? data.items : [...prev, ...data.items];
              
              // Cache logic for browsing (non-search)
              // Always cache 'root' or specific folders when not searching
              if (!query && days === '30') {
                  const cacheKey = folderId || 'root';
                  setFolderCache(cache => ({
                      ...cache,
                      [cacheKey]: combined
                  }));
              }
              return combined;
          });

          // Handle Pagination
          // Check limit: If we exceeded limit, stop.
          const currentCount = isInitialLoad ? data.items.length : items.length + data.items.length;
          const limitNum = itemLimit === 'all' ? 100000 : itemLimit;

          if (data.nextPageToken && currentCount < limitNum) {
              setNextPageToken(data.nextPageToken);
              setCurrentPhase(data.phase);
          } else {
              setNextPageToken(null);
              setCurrentPhase(undefined);
          }

      } catch (e: any) {
          if (latestRequestRef.current === requestId) {
              const msg = e.message === "Failed to fetch" ? "Không thể kết nối đến Server." : e.message;
              if (isInitialLoad) {
                  setError(msg || "Không thể tải dữ liệu.");
              } else {
                  // Pagination failed - stop trying to fetch more to avoid infinite loop
                  console.warn("Pagination stopped due to error:", msg);
                  setNextPageToken(null);
              }
          }
      } finally {
          if (latestRequestRef.current === requestId) {
              setIsLoading(false);
              setIsFetchingMore(false);
          }
      }
  }, [items.length]); // Dependency helps access current items length if needed, but setState callback handles it

  // Trigger subsequent fetches if token exists
  useEffect(() => {
      if (nextPageToken && !isLoading && !isFetchingMore && !error) {
          const folderIdToFetch = currentFolderId === 'root' ? undefined : currentFolderId;
          // Small delay to let UI render and breathe
          const timer = setTimeout(() => {
               refreshData(scriptUrl, folderIdToFetch, searchQuery || undefined, timeRange, searchScope, limit, nextPageToken, currentPhase);
          }, 100);
          return () => clearTimeout(timer);
      }
  }, [nextPageToken, currentPhase, isLoading, isFetchingMore, error, scriptUrl, currentFolderId, searchQuery, timeRange, searchScope, limit, refreshData]);


  // --- MAIN CACHE & FETCH LOGIC ---
  useEffect(() => {
      if (!scriptUrl) return;

      // If we are Searching, do NOT use cache logic, just skip this effect (handleSearchSubmit handles it)
      if (searchQuery !== '') return;

      // Determine Cache Key
      const cacheKey = currentFolderId;

      // CHECK CACHE
      // Conditions: Standard limit, Default time range (or cached range matches), not searching
      const hasCache = folderCache[cacheKey] && folderCache[cacheKey].length > 0;
      const isStandardView = limit === 5000 && timeRange === '30';

      if (hasCache && isStandardView) {
          console.log("Restoring from cache:", cacheKey);
          setItems(folderCache[cacheKey]);
          setIsLoading(false);
          setError(null);
          setNextPageToken(null); // Cache implies we have loaded what we needed (or at least the first page)
          return; 
      }

      // If No Cache, Fetch Data
      const folderIdToFetch = currentFolderId === 'root' ? undefined : currentFolderId;
      refreshData(scriptUrl, folderIdToFetch, undefined, timeRange, 'global', limit);
      
  }, [currentFolderId, scriptUrl, timeRange, limit, searchQuery]); // searchQuery included to re-trigger if cleared


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
      setNextPageToken(null); 
  };

  const handleBreadcrumbNavigate = (index: number) => {
      setHistory(prev => prev.slice(0, index + 1));
      setSearchQuery('');
      setActiveTag(null);
      setNextPageToken(null);
  };

  const handleOpenPreview = (item: DirectoryItem) => {
    if (item) setPreviewItem(item);
  };

  const handleClosePreview = () => setPreviewItem(null);
  const handleOpenConnectModal = () => setIsConnectModalOpen(true);
  const handleCloseConnectModal = () => setIsConnectModalOpen(false);
  const handleOpenImportModal = () => setIsImportModalOpen(true);
  const handleCloseImportModal = () => setIsImportModalOpen(false);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value);

  const handleSearchSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setNextPageToken(null); // New search, reset pagination
      const folderIdToFetch = currentFolderId === 'root' ? undefined : currentFolderId;
      refreshData(scriptUrl, folderIdToFetch, searchQuery, timeRange, searchScope, limit);
  };

  const handleClearSearch = () => {
      setSearchQuery(''); // This updates state
      setNextPageToken(null);
      
      // Manually check cache to prevent flicker before useEffect runs
      const cacheKey = currentFolderId;
      if (folderCache[cacheKey] && folderCache[cacheKey].length > 0 && timeRange === '30') {
           setItems(folderCache[cacheKey]);
           setIsLoading(false);
      }
      // Note: The useEffect will run anyway because searchQuery changed, ensuring consistency
  };

  const handleRefreshClick = () => {
    setNextPageToken(null);
    const folderIdToFetch = currentFolderId === 'root' ? undefined : currentFolderId;
    // Force refresh ignores cache usually, but let's clear the specific cache key to be sure
    const cacheKey = currentFolderId;
    setFolderCache(prev => {
        const next = { ...prev };
        delete next[cacheKey];
        return next;
    });
    refreshData(scriptUrl, folderIdToFetch, searchQuery || undefined, timeRange, searchScope, limit);
  };
  
  const handleTimeRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setNextPageToken(null);
      setTimeRange(e.target.value as TimeRange);
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setNextPageToken(null);
      const val = e.target.value;
      setLimit(val === 'all' ? 'all' : Number(val) as LimitOption);
  };

  // Client-side Filter
  const filteredItems = useMemo(() => {
    let result = items;
    if (activeTag) {
        result = result.filter(item => item.tags && item.tags.includes(activeTag));
    }
    // Instant local filter for search text if available
    if (searchQuery && items.length > 0) {
       const lowerQ = searchQuery.toLowerCase();
       // If we are searching globally via API, this local filter is redundant but harmless.
       // If we are searching locally, it helps refine.
       // However, the API does the heavy lifting.
    }
    return result;
  }, [items, activeTag, searchQuery]);

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
              <a href={SHARED_DRIVE_LINK} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline font-medium flex items-center gap-1">
                Drive Gốc ↗
              </a>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center relative group">
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5 border border-transparent focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
                  <div className="relative flex items-center">
                    <SearchIcon className="absolute left-3 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="Tìm kiếm..." value={searchQuery} onChange={handleSearchInputChange} className="pl-9 pr-2 py-1.5 w-56 bg-transparent border-none focus:ring-0 text-sm outline-none" />
                  </div>
                  <div className="h-4 w-px bg-gray-300 mx-1"></div>
                  <select value={searchScope} onChange={(e) => setSearchScope(e.target.value as SearchScope)} className="bg-transparent border-none text-xs font-medium text-gray-600 focus:ring-0 cursor-pointer pr-7 pl-2 py-1 hover:text-blue-600">
                      <option value="global">Toàn bộ</option>
                      <option value="current">Thư mục này</option>
                  </select>
              </div>
            </form>
            
            <button onClick={handleOpenConnectModal} className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors border text-sm ${scriptUrl ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`} title="Cấu hình API">
                <span className="hidden sm:inline">Cập nhật API</span>
            </button>
          </div>
        </div>
        
        {/* Mobile Search - truncated for brevity as logic is same as desktop */}
        <div className="md:hidden px-4 pb-3 flex flex-col gap-2">
           {/* ... Mobile Search UI ... */}
           <form onSubmit={handleSearchSubmit} className="relative flex gap-2">
               <input type="text" placeholder="Tìm kiếm..." value={searchQuery} onChange={handleSearchInputChange} className="flex-1 py-2 px-3 border border-gray-200 rounded-lg text-sm" />
               <button type="submit" className="bg-blue-600 text-white px-3 rounded-lg text-xs">Tìm</button>
           </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <Breadcrumbs items={history} onNavigate={handleBreadcrumbNavigate} />

        {/* Actions Bar */}
        <div className="mb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                {history.length > 1 ? history[history.length - 1].name : 'Danh sách hồ sơ'}
            </h2>
            <div className="text-gray-500 mt-1 text-xs flex items-center gap-2">
                {isLoading ? (
                    <span className="flex items-center gap-2 text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Đang khởi tạo dữ liệu...
                    </span>
                ) : (
                    <span className="flex items-center gap-2">
                        {searchQuery && filteredItems.length === 0
                         ? `Không thấy kết quả cho "${searchQuery}"`
                         : `Hiển thị ${filteredItems.length} mục`
                        }
                        {isFetchingMore && (
                            <span className="text-orange-500 bg-orange-50 px-2 py-0.5 rounded flex items-center gap-1">
                                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Đang tải thêm...
                            </span>
                        )}
                    </span>
                )}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                  <select value={timeRange} onChange={handleTimeRangeChange} disabled={isLoading || isFetchingMore} className="appearance-none bg-white border border-gray-200 text-gray-700 text-sm py-1.5 pl-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-50">
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
              
              <div className="relative">
                  <select value={limit} onChange={handleLimitChange} disabled={isLoading || isFetchingMore} className="appearance-none bg-white border border-gray-200 text-gray-700 text-sm py-1.5 pl-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-50">
                      <option value="5000">Max: 5.000</option>
                      <option value="10000">Max: 10.000</option>
                      <option value="15000">Max: 15.000</option>
                      <option value="20000">Max: 20.000</option>
                      <option value="all">Không giới hạn</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
              </div>

              {scriptUrl && (
                  <button onClick={handleRefreshClick} disabled={isLoading} className="text-blue-600 text-sm hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 font-medium border border-transparent hover:border-blue-100">
                    <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
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
                    <button onClick={handleOpenConnectModal} className="bg-red-600 text-white px-4 py-2 rounded-lg self-start font-medium hover:bg-red-700">Kiểm tra Code API</button>
                    <button onClick={handleRefreshClick} className="bg-white border border-red-300 text-red-700 px-4 py-2 rounded-lg self-start font-medium hover:bg-red-50">Thử lại</button>
                </div>
             </div>
        )}

        {/* Grid */}
        {isLoading && items.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(i => <div key={i} className="h-48 bg-gray-200 rounded-xl"></div>)}
            </div>
        ) : filteredItems.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredItems.map(item => (
                <FolderCard key={item.id} item={item} onNavigate={handleFolderNavigate} onPreview={handleOpenPreview} />
                ))}
            </div>
            {isFetchingMore && (
                <div className="mt-8 flex justify-center">
                    <div className="bg-white border border-gray-200 shadow-lg rounded-full px-6 py-2 flex items-center gap-3">
                        <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm font-medium text-gray-700">Đang tải thêm dữ liệu cũ hơn... ({items.length} hồ sơ)</span>
                    </div>
                </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
             {/* ... Empty State ... */}
            <h3 className="text-xl font-bold text-gray-900">Không tìm thấy kết quả</h3>
            <div className="mt-6 flex flex-col items-center gap-3">
                <button onClick={handleClearSearch} className="text-gray-500 hover:text-gray-700 text-sm underline mt-2">
                    {searchQuery ? 'Xóa tìm kiếm' : 'Quay lại thư mục trước'}
                </button>
            </div>
          </div>
        )}
      </main>

      <SmartImportModal isOpen={isImportModalOpen} onClose={handleCloseImportModal} onImport={handleManualImport} />
      <ConnectModal isOpen={isConnectModalOpen} onClose={handleCloseConnectModal} onSave={handleConnectSave} />
      <FilePreviewModal item={previewItem} onClose={handleClosePreview} />

      <footer className="bg-white border-t border-gray-200 py-6 mt-auto">
          <div className="max-w-7xl mx-auto px-4 text-center text-xs text-gray-400">
              <p>Hệ thống Tra cứu Hồ sơ Nội soi &copy; 2024</p>
          </div>
      </footer>
    </div>
  );
};

export default App;
