
import React from 'react';
import { DirectoryItem } from '../types';

interface Props {
  item: DirectoryItem | null;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<Props> = ({ item, onClose }) => {
  if (!item) return null;

  // Construct a preview-friendly URL
  const imagePreviewUrl = `https://lh3.googleusercontent.com/d/${item.id}`;
  const genericPreviewUrl = `https://drive.google.com/file/d/${item.id}/preview`;

  const isImage = item.mimeType?.startsWith('image/');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="relative w-full h-full sm:rounded-xl overflow-hidden flex flex-col shadow-2xl border-0 sm:border border-gray-800 bg-black"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent text-white z-20 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto flex flex-col">
              <h3 className="text-lg font-medium truncate max-w-[200px] sm:max-w-md drop-shadow-md" title={item.name}>{item.name}</h3>
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
             <button 
                onClick={onClose}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-md"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 w-full h-full flex items-center justify-center bg-black overflow-hidden">
             {isImage ? (
                 <div className="w-full h-full flex items-center justify-center overflow-auto scrollbar-hide">
                     <img 
                        src={imagePreviewUrl} 
                        alt={item.name} 
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                     />
                 </div>
             ) : (
                 <iframe 
                    src={genericPreviewUrl} 
                    title={item.name}
                    className="w-full h-full border-0"
                    allow="autoplay"
                 />
             )}
        </div>
        
        {/* Footer Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-20 pointer-events-none">
            <div className="pointer-events-auto flex justify-center">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-300 hover:text-white hover:underline bg-black/50 px-3 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm border border-white/10">
                    Xem file gốc
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
            </div>
        </div>
      </div>
    </div>
  );
};
