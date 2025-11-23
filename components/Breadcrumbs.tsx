import React from 'react';

interface BreadcrumbItem {
  id: string;
  name: string;
}

interface Props {
  items: BreadcrumbItem[];
  onNavigate: (index: number) => void;
}

export const Breadcrumbs: React.FC<Props> = ({ items, onNavigate }) => {
  if (items.length === 0) return null;

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4 overflow-x-auto whitespace-nowrap pb-2 scrollbar-hide">
      <button 
        onClick={() => onNavigate(0)}
        className="hover:text-blue-600 font-medium flex items-center gap-1 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M11.47 3.84a.75.75 0 0 1 1.06 0l8.632 8.632a.75.75 0 0 1 1.097 1.06l-.326.337a6.5 6.5 0 0 1-10.24-2.09 1.336 1.336 0 0 1-1.116 0A6.5 6.5 0 0 1 .326 13.869l-.326-.337a.75.75 0 0 1 1.097-1.06L9.717 3.84h.002a.75.75 0 0 1 1.75 0Z" />
        </svg>
        Trang chủ
      </button>

      {items.slice(1).map((item, index) => (
        <React.Fragment key={item.id}>
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <button 
            onClick={() => onNavigate(index + 1)}
            className={`font-medium transition-colors max-w-[150px] truncate ${index === items.length - 2 ? 'text-gray-900 font-semibold cursor-default' : 'hover:text-blue-600'}`}
            disabled={index === items.length - 2}
          >
            {item.name}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
};