
import { DirectoryItem, ItemType } from "../types";

export const fetchDriveData = async (
    scriptUrl: string, 
    folderId?: string, 
    searchQuery?: string, 
    days?: string | number,
    scope: 'global' | 'current' = 'global'
): Promise<DirectoryItem[]> => {
  // Timeout 90s for client
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); 

  try {
    const url = new URL(scriptUrl);
    
    // Params
    if (folderId) url.searchParams.append("id", folderId);
    if (searchQuery) url.searchParams.append("q", searchQuery);
    if (days) url.searchParams.append("days", days.toString());
    if (scope) url.searchParams.append("scope", scope);
    
    // Cache busting (Anti-cache)
    url.searchParams.append("_t", new Date().getTime().toString());
    
    const response = await fetch(url.toString(), { 
        signal: controller.signal,
        method: 'GET',
        mode: 'cors', 
        redirect: 'follow',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
        }
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Lỗi HTTP: ${response.status}`);
    }

    const text = await response.text(); 
    let data;
    
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.error("Invalid JSON:", text);
        throw new Error("Dữ liệu trả về lỗi. Vui lòng kiểm tra lại Deployment trong Google Apps Script.");
    }
    
    if (data && data.error) {
        throw new Error(data.error);
    }

    return data.map((item: any) => ({
      id: item.id,
      name: item.name,
      url: item.url,
      type: item.type === "FOLDER" ? ItemType.FOLDER : ItemType.FILE,
      description: item.description,
      tags: item.tags || [],
      dateAdded: item.dateAdded,
      mimeType: item.mimeType, 
      folderCount: item.folderCount, 
      fileCount: item.fileCount,
      size: item.size 
    }));

  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error("Fetch Error:", error);
    
    // Improved timeout message
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        throw new Error("Kết nối đến Google Server quá lâu. Vui lòng thử lại hoặc giảm phạm vi thời gian.");
    }
    
    throw error;
  }
};
