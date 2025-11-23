import { ApiResponse, ItemType } from "../types";

export const fetchDriveData = async (
    scriptUrl: string, 
    folderId?: string, 
    searchQuery?: string, 
    days?: string | number,
    scope: 'global' | 'current' = 'global',
    limit: string | number = 5000,
    pageToken?: string,
    phase?: string
): Promise<ApiResponse> => {
  // Increase timeout to 90s to handle slow network/cold starts
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort("Request timed out"), 90000); 

  try {
    const url = new URL(scriptUrl);
    
    // Params
    if (folderId) url.searchParams.append("id", folderId);
    if (searchQuery) url.searchParams.append("q", searchQuery);
    if (days) url.searchParams.append("days", days.toString());
    if (scope) url.searchParams.append("scope", scope);
    if (limit) url.searchParams.append("limit", limit.toString());
    
    // V17 Pagination Params
    if (pageToken) url.searchParams.append("token", encodeURIComponent(pageToken));
    if (phase) url.searchParams.append("phase", phase);
    
    // Cache busting
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
        throw new Error("Dữ liệu trả về lỗi JSON. Kiểm tra Deployment.");
    }
    
    if (data.error) {
        throw new Error(data.error);
    }

    // Map items
    const mappedItems = (data.items || []).map((item: any) => ({
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

    return {
        items: mappedItems,
        nextPageToken: data.nextPageToken,
        phase: data.phase
    };

  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error("Fetch Error:", error);
    
    // Handle generic AbortError or specific message "signal is aborted without reason"
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        throw new Error("Kết nối quá lâu (Timeout). Vui lòng thử lại.");
    }
    
    throw error;
  }
};