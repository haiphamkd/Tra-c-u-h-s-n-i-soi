
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
  // --- V19: STRICT HIERARCHY FIX ---
  var rootId = "1Ja7GDH5PZMabdkGXhmfTg_hbG1mSzpWk"; 
  var MAX_EXECUTION_TIME = 15000; 
  var startTime = new Date().getTime();
  
  try {
    var folderId = rootId;
    var searchQuery = "";
    var days = 30; 
    var scope = 'global'; 
    
    var pageToken = null;
    var phase = 'FOLDER';

    if (e && e.parameter) {
       if (e.parameter.id && e.parameter.id !== "undefined" && e.parameter.id !== "root") folderId = e.parameter.id;
       if (e.parameter.q) searchQuery = e.parameter.q;
       if (e.parameter.days) days = e.parameter.days;
       if (e.parameter.scope) scope = e.parameter.scope;
       if (e.parameter.token) pageToken = decodeURIComponent(e.parameter.token);
       if (e.parameter.phase) phase = e.parameter.phase;
    }

    // --- TIME FILTER ---
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

    function createItem(item, type) {
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
        return obj;
    }

    // --- QUERY CONSTRUCTION (THE FIX) ---
    // We build the query manually to control "in parents" logic
    
    var qFolder = "";
    var qFile = "";
    var baseQ = "trashed = false" + timeQuery;

    // CASE 1: BROWSING (No Search Query)
    // Strict Requirement: Only show items where 'parent' is exactly folderId
    if (searchQuery === "") {
        var parentClause = "'" + folderId + "' in parents";
        qFolder = parentClause + " and " + baseQ;
        qFile = parentClause + " and " + baseQ;
    } 
    // CASE 2: SEARCHING
    else {
        var safeQuery = searchQuery.replace(/'/g, "\\'");
        var nameClause = "title contains '" + safeQuery + "'";
        
        if (scope === 'current') {
            // Search inside current folder only (Direct children)
             var parentClause = "'" + folderId + "' in parents";
             qFolder = parentClause + " and " + nameClause + " and " + baseQ;
             qFile = parentClause + " and " + nameClause + " and " + baseQ;
        } else {
            // Global Search (Entire Drive or Subtree - DriveApp.search logic)
            // Note: DriveApp.searchFolders scans everywhere.
            qFolder = nameClause + " and " + baseQ;
            qFile = nameClause + " and " + baseQ;
        }
    }

    var contents = [];

    // 1. PHASE: FOLDER
    if (phase === 'FOLDER') {
        var folderIter;
        if (pageToken) {
            folderIter = DriveApp.continueFolderIterator(pageToken);
        } else {
            folderIter = DriveApp.searchFolders(qFolder);
        }

        while (folderIter.hasNext()) {
            if (checkTimeLimit()) {
                return response(contents, folderIter.getContinuationToken(), 'FOLDER');
            }
            try { contents.push(createItem(folderIter.next(), 'FOLDER')); } catch(e){}
        }
        
        phase = 'FILE';
        pageToken = null; 
    }

    // 2. PHASE: FILE
    if (phase === 'FILE') {
        var fileIter;
        if (pageToken) {
            fileIter = DriveApp.continueFileIterator(pageToken);
        } else {
             fileIter = DriveApp.searchFiles(qFile);
        }

        while (fileIter.hasNext()) {
             if (checkTimeLimit()) {
                return response(contents, fileIter.getContinuationToken(), 'FILE');
            }
            try { contents.push(createItem(fileIter.next(), 'FILE')); } catch(e){}
        }

        return response(contents, null, 'DONE');
    }

    return response(contents, null, 'DONE');

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      error: "Lỗi: " + err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  function response(items, token, phase) {
      return ContentService.createTextOutput(JSON.stringify({
          items: items,
          nextPageToken: token,
          phase: phase
      })).setMimeType(ContentService.MimeType.JSON);
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
    alert("Đã sao chép V19! Logic 'in parents' đã được áp dụng.");
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-600 p-1.5 rounded-md">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </span>
            Cập nhật API (V19 - Final Fix)
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg shadow-sm">
            <div className="flex items-start">
                <div className="flex-shrink-0">
                   <svg className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                   </svg>
                </div>
                <div className="ml-3">
                    <h3 className="text-sm font-bold text-green-800">PHIÊN BẢN V19 (Khuyến nghị)</h3>
                    <div className="mt-2 text-sm text-gray-700 space-y-1">
                        <p><strong>Sửa lỗi triệt để:</strong> Dùng lệnh <code>'id' in parents</code> để đảm bảo chỉ hiện đúng thư mục con, không hiện thư mục cháu.</p>
                        <p><strong>Sửa lỗi Cache:</strong> Tối ưu hóa tốc độ khi quay lại.</p>
                    </div>
                </div>
            </div>
          </div>

          <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium text-gray-900">Script V19:</h3>
                    <button 
                        onClick={handleCopy}
                        className="flex items-center gap-1 bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                        Sao chép Code V19
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
