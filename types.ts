
export enum ItemType {
  FOLDER = 'FOLDER',
  FILE = 'FILE',
  LINK = 'LINK'
}

export interface DirectoryItem {
  id: string;
  name: string;
  url: string;
  type: ItemType;
  description?: string;
  tags: string[];
  dateAdded: string;
  mimeType?: string; // New field for identifying content type (image, video, pdf)
  folderCount?: number; // Count of sub-folders
  fileCount?: number;   // Count of files
  size?: number;        // Size in bytes for files
}

export interface ApiResponse {
  items: DirectoryItem[];
  nextPageToken?: string | null;
  phase?: 'FOLDER' | 'FILE' | 'DONE';
  error?: string;
}

export interface ImportResult {
  items: DirectoryItem[];
}
