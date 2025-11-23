import { GoogleGenAI, Type } from "@google/genai";
import { DirectoryItem, ItemType } from "../types";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Updated ID from user request
const PARENT_FOLDER_ID = "1Ja7GDH5PZMabdkGXhmfTg_hbG1mSzpWk";

export const parseRawTextToItems = async (rawText: string): Promise<DirectoryItem[]> => {
  if (!process.env.API_KEY) {
    console.warn("No API Key provided. Returning empty list.");
    return [];
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a data extraction assistant for a Vietnamese user. 
      The user has pasted raw text from a Google Drive file list. 
      Extract a list of folders and files.
      
      The Parent Folder ID is: ${PARENT_FOLDER_ID}
      
      For each item found in the text:
      1. Generate a unique ID.
      2. Identify the Name (remove extensions if it looks like a folder, keep for files).
      3. Guess a relevant tag based on medical/endoscopy context if applicable (e.g., "Dạ dày", "Đại tràng", "Video", "Báo cáo").
      4. Determine if it is a FOLDER or FILE.
      5. Construct the URL:
         - The URL must be a search link inside the specific parent folder:
           "https://drive.google.com/drive/folders/${PARENT_FOLDER_ID}?q=name contains '" + Name + "'"
      
      Raw Text Input:
      ${rawText}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              url: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["FOLDER", "FILE", "LINK"] },
              description: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              dateAdded: { type: Type.STRING },
            },
            required: ["id", "name", "type", "tags", "url"],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    
    const data = JSON.parse(text);
    return data.map((item: any) => ({
      ...item,
      type: item.type as ItemType,
      dateAdded: new Date().toISOString(),
    }));

  } catch (error) {
    console.error("Error parsing text with Gemini:", error);
    return [];
  }
};

export const generateSearchTags = async (query: string): Promise<string[]> => {
     if (!process.env.API_KEY) return [];
     
     try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate 5 related search keywords in Vietnamese for the user query: "${query}". Return only a JSON array of strings.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        return JSON.parse(response.text || "[]");
     } catch (e) {
         return [];
     }
}