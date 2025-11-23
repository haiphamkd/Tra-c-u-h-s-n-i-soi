
import React, { useState } from 'react';
import { DirectoryItem, ItemType } from '../types';
import { FolderIcon, FileIcon, LinkIcon } from './Icons';

interface Props {
  item: DirectoryItem;
  onNavigate: (item: DirectoryItem) => void;
  onPreview?: (item: DirectoryItem) => void;
}

export const FolderCard: React.FC<Props> = ({ item, onNavigate, onPreview }) => {
  const isFolder = item.type === ItemType.FOLDER;
  const isImage = item.mimeType?.startsWith('image/');
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(item.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isFolder) {
      onNavigate(item);
    } else if (onPreview) {
      onPreview(item);
    } else {
        window.open(item.url, '_blank');
    }
  };

  // Helper to format bytes
  const formatSize = (bytes?: number) => {
      if (bytes === undefined) return '';
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Helper to format date
  const formatDate = (dateString: string) => {
      try {
          const date = new Date(dateString);
          return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
      } catch (e) {
          return '';
      }
  };

  // Image Thumbnail URL
  const thumbnailUrl = isImage ? `https://lh3.googleusercontent.com/d/${item.id}=w400` : null;

  return (
    <div className="group relative bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200 flex flex-col h-full overflow-hidden">
      {/* Click Handler */}
      <a 
        href={item.url} 
        onClick={handleClick}
        className="flex-1 flex flex-col h-full"
      >
        {/* Thumbnail or Icon Area */}
        <div className={`relative ${isImage && !imgError ? 'aspect-[4/3]' : 'p-4 flex-shrink-0'}`}>
            {isImage && !imgError && thumbnailUrl ? (
                <div className="w-full h-full bg-gray-100 relative overflow-hidden">
                    <img 
                        src={thumbnailUrl} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={() => setImgError(true)}
                        loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
            ) : (
                <div className="flex items-start justify-between">
                    <div className={`p-2.5 rounded-lg ${isFolder ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'} group-hover:scale-110 transition-transform duration-200`}>
                        {isFolder ? <FolderIcon className="w-6 h-6" /> : <FileIcon className="w-6 h-6" />}
                    </div>
                    {/* External Link Indicator */}
                    <div className="text-gray-300 group-hover:text-blue-400 transition-colors">
                         {isFolder ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                         ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                         )}
                    </div>
                </div>
            )}
        </div>

        {/* Content Info */}
        <div className="p-4 flex-1 flex flex-col">
            <h3 className="font-semibold text-gray-800 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors text-sm" title={item.name}>
            {item.name}
            </h3>
            
            {item.description && (
                <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                    {item.description}
                </p>
            )}

            <div className="mt-auto pt-2">
                {isFolder ? (
                   <div className="flex items-center gap-2 text-xs text-gray-500">
                      {item.folderCount !== undefined ? (
                          // Legacy support if counting is enabled
                          <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                              {item.folderCount} mục
                          </span>
                      ) : (
                          // Performance mode: Show Date
                          <span className="flex items-center gap-1 text-gray-400" title="Ngày cập nhật cuối">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              {formatDate(item.dateAdded)}
                          </span>
                      )}
                   </div>
                ) : (
                    <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                        {item.size ? (
                            <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-500">{formatSize(item.size)}</span>
                        ) : null}
                        <span className="ml-auto">{formatDate(item.dateAdded)}</span>
                    </div>
                )}
            </div>
        </div>
      </a>

      {/* Link Display & Copy Section */}
      <div className="px-4 pb-4 pt-0">
          <div className="flex items-center bg-gray-50 rounded-md border border-gray-100 px-2 py-1">
             <LinkIcon className="w-3 h-3 text-gray-400 mr-2 flex-shrink-0" />
             <input 
                type="text" 
                readOnly 
                value={item.url} 
                className="flex-1 bg-transparent border-none text-[10px] text-gray-600 focus:ring-0 p-0 w-full truncate font-mono select-all"
                onClick={(e) => e.currentTarget.select()}
             />
             <button 
                onClick={handleCopyLink}
                className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors"
                title="Sao chép liên kết"
             >
                {copied ? (
                    <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                ) : (
                    <svg className="w-3 h-3 text-gray-400 hover:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                )}
             </button>
          </div>
      </div>
    </div>
  );
};
