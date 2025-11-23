
import React, { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (url: string) => void;
}

export const ConnectModal: React.FC<Props> = ({ isOpen, onClose, onSave }) => {
  const [url, setUrl] = useState('https://script.google.com/macros/s/AKfycbzzcYqZ0dim-GkR5iywtgdHlAiQ0eLbf2hbasqGlb9-HMvXWSn3wfKvagwecEu2eyZt/exec');

  if (!isOpen) return null;

  const scriptCode = `function doGet(e) {
  // --- V16: DYNAMIC LIMIT MODE ---
  var rootId = "1Ja7GDH5PZMabdkGXhmfTg_hbG1mSzpWk"; 
  var MAX_EXECUTION_TIME = 25000; // 25 seconds safe limit
  var startTime = new Date().getTime();
  
  try {
    var folderId = rootId;
    var searchQuery = "";
    var days = 30; 
    var scope = 'global'; 
    var limitParam = "5000";

    if (e && e.parameter) {
       if (e.parameter.id && e.parameter.id !== "undefined" && e.parameter.id !== "root") {
         folderId = e.parameter.id;
       }
       if (e.parameter.q) searchQuery = e.parameter.q;
       if (e.parameter.days) days = e.parameter.days;
       if (e.parameter.scope) scope = e.parameter.scope;
       if (e.parameter.limit) limitParam = e.parameter.limit;
    }

    // Determine limit
    var HARD_LIMIT = 5000; // Default
    if (limitParam === "all") {
        HARD_LIMIT = 100000; // Effectively unlimited within time bounds
    } else {
        HARD_LIMIT = parseInt(limitParam) || 5000;
    }
    
    var contents = [];
    var timeQuery = "";
    
    if (days !== 'all') {
       var d = new Date();
       d.setDate(d.getDate() - parseInt(days));
       var dateStr = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
       timeQuery = " and modifiedDate > '" + dateStr + "'";
    }

    function checkTimeLimit() {
        return (new Date().getTime() - startTime) > MAX_EXECUTION_TIME;
    }

    function processIterator(iterator, type) {
        try {
          while (iterator.hasNext()) {
              if (checkTimeLimit()) return false; 
              if (contents.length >= HARD_LIMIT) return false;

              try {
                  var item = iterator.next();
                  var obj = {
                      id: item.getId(),
                      name: item.getName(),
                      url: item.getUrl(),
                      type: type,
                      dateAdded: item.getLastUpdated(),
                      description: item.getDescription() || "",
                      tags: type === "FOLDER" ? ["Thư mục"] : ["Tệp tin"]
                  };
                  if (type === "FILE") {
                    obj.mimeType = item.getMimeType();
                    try { obj.size = item.getSize(); } catch(e) {}
                  }
                  contents.push(obj);
              } catch (e) {}
          }
        } catch(err) {}
        return true;
    }

    // --- LOGIC ---
    
    if (searchQuery !== "") {
      var safeQuery = searchQuery.replace(/'/g, "\\'");
      var qBase = "title contains '" + safeQuery + "' and trashed = false" + timeQuery;
      
      if (scope === 'current' && folderId !== rootId) {
          // Local Search
          var currentFolder = DriveApp.getFolderById(folderId);
          // Prioritize Files in Search
          processIterator(currentFolder.searchFiles(qBase), "FILE");
          if (!checkTimeLimit() && contents.length < HARD_LIMIT) {
             processIterator(currentFolder.searchFolders(qBase), "FOLDER");
          }
      } else {
          // Global Search
          processIterator(DriveApp.searchFolders(qBase), "FOLDER");
          if (!checkTimeLimit() && contents.length < HARD_LIMIT) {
              processIterator(DriveApp.searchFiles(qBase), "FILE");
          }
      }
      
    } else {
      // BROWSE MODE
      var currentFolder = DriveApp.getFolderById(folderId);
      var folderQ = "trashed = false" + timeQuery;
      var fileQ = "trashed = false" + timeQuery;

      if (days === 'all') {
          folderQ = "trashed = false";
          fileQ = "trashed = false";
      }

      // Always allow fetching files if time permits
      if (processIterator(currentFolder.searchFolders(folderQ), "FOLDER")) {
          if (!checkTimeLimit() && contents.length < HARD_LIMIT) {
             processIterator(currentFolder.searchFiles(fileQ), "FILE");
          }
      }
    }
      
    contents.sort(function(a, b) {
        if (a.type !== b.type) {
             return a.type === 'FOLDER' ? -1 : 1;
        }
        return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
    });

    return ContentService.createTextOutput(JSON.stringify(contents))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify([{
      id: "error",
      name: "Lỗi: " + err.toString(),
      type: "FILE",
      url: "#",
      tags: ["ERROR"]
    }])).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const handleSave = () => {
    if (url.trim()) {
      onSave(url.trim());
      onClose();
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptCode);
    alert("Đã sao chép V16! Đã thêm tùy chọn giới hạn số lượng.");
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-600 p-1.5 rounded-md">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </span>
            Cập nhật API (V16 - Tùy Chỉnh Giới Hạn)
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg shadow-sm">
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-orange-600" viewBox="0 0 20 20" fill="currentColor">
                         <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                </div>
                <div className="ml-3">
                    <h3 className="text-sm font-bold text-orange-800">CÁCH CẬP NHẬT</h3>
                    <div className="mt-2 text-sm text-gray-700 space-y-2">
                        <p>Để chọn số lượng hồ sơ (5000, 10000...) từ web:</p>
                        <ol className="list-decimal ml-4 text-orange-800 font-medium">
                            <li>Copy Code bên dưới.</li>
                            <li>Dán vào Google Apps Script (thay thế toàn bộ code cũ).</li>
                            <li>Bấm <strong>Deploy</strong> -> <strong>New Deployment</strong>.</li>
                            <li>Copy URL mới và dán vào ô bên dưới.</li>
                        </ol>
                    </div>
                </div>
            </div>
          </div>

          <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium text-gray-900">Script V16:</h3>
                    <button 
                        onClick={handleCopy}
                        className="flex items-center gap-1 bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                        Sao chép Code V16
                    </button>
                </div>
                <div className="relative group">
                    <pre className="bg-gray-900 text-green-400 p-4 rounded-xl text-xs font-mono overflow-auto border border-gray-700 shadow-inner h-64 leading-relaxed">
                        {scriptCode}
                    </pre>
                </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900">Link Web App (URL)</h3>
            </div>
            <input 
                type="text" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-mono text-gray-600"
                placeholder="Dán URL sau khi chọn New Deployment vào đây..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
           <button onClick={onClose} className="px-5 py-2.5 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium">
             Đóng
           </button>
           <button 
             onClick={handleSave}
             disabled={!url.trim()}
             className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
           >
             Lưu & Kết Nối Lại
           </button>
        </div>
      </div>
    </div>
  );
};
