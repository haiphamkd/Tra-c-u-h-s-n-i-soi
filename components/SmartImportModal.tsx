import React, { useState } from 'react';
import { SparklesIcon } from './Icons';
import { parseRawTextToItems } from '../services/geminiService';
import { DirectoryItem } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: DirectoryItem[]) => void;
}

export const SmartImportModal: React.FC<Props> = ({ isOpen, onClose, onImport }) => {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleProcess = async () => {
    if (!text.trim()) return;
    setIsLoading(true);
    const items = await parseRawTextToItems(text);
    onImport(items);
    setIsLoading(false);
    setText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
              <SparklesIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Nhập Dữ Liệu Tự Động (AI)</h2>
              <p className="text-sm text-gray-500">Dán danh sách tên thư mục, AI sẽ tự sắp xếp.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-4 p-4 bg-blue-50 rounded-xl text-sm text-blue-800 border border-blue-100">
            <strong>Hướng dẫn:</strong>
            <ol className="list-decimal ml-4 mt-1 space-y-1 text-blue-700">
                <li>Mở thư mục Google Drive bạn muốn liệt kê.</li>
                <li>Chọn chế độ xem <strong>Danh sách (List view)</strong>.</li>
                <li>Bôi đen tất cả (Ctrl+A) và Copy (Ctrl+C).</li>
                <li>Dán (Ctrl+V) vào ô bên dưới.</li>
            </ol>
          </div>

          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nội dung đã sao chép:
          </label>
          <textarea
            className="w-full h-48 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none text-gray-700 bg-gray-50 font-mono text-sm"
            placeholder="Dán nội dung vào đây..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleProcess}
            disabled={isLoading || !text.trim()}
            className={`px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg shadow-sm transition-all flex items-center gap-2
              ${isLoading || !text.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0'}
            `}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang xử lý...
              </>
            ) : (
              <>
                <SparklesIcon className="w-5 h-5" />
                Phân tích & Tạo
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};