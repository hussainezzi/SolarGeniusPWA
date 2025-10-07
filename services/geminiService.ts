import { GoogleGenAI, Type, GenerateContentResponse, Part } from "@google/genai";
import { SystemRequirements, BillOfMaterialItem, SitePhoto } from './types';

export const isAiAvailable = (): boolean => {
  // In a real app, process.env.API_KEY would be set in the build environment.
  // For this client-side example, we check if it's a non-empty string.
  return typeof process.env.API_KEY === 'string' && process.env.API_KEY.length > 0;
};

const getAiClient = (): GoogleGenAI => {
  if (!isAiAvailable()) {
    throw new Error("Gemini API key is not configured.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY as string });
};

export const generateComponentAnalysis = async (requirements: SystemRequirements): Promise<string> => {
    const ai = getAiClient();
    const prompt = `
        Analyze the following solar system requirements and generate a list of compatible key components.
        Provide a concise list of suitable solar panels, inverters, and battery systems.
        
        System Requirements:
        - Desired Power Output: ${requirements.desiredKw} kW
        - Battery Storage: ${requirements.batteryKwh} kWh
        - Preferred Panel Type: ${requirements.panelType}
        - Preferred Inverter Type: ${requirements.inverterType}
        - Additional Notes: ${requirements.additionalNotes}

        Format the output as a simple, clear list. For example:
        - Panels: [Brand/Model], [Efficiency], [Warranty]
        - Inverter: [Brand/Model], [Type], [Max AC Power]
        - Battery: [Brand/Model], [Capacity kWh], [Chemistry]
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });

    return response.text;
};

export const generateRenderings = async (components: string, photos: SitePhoto[]): Promise<string[]> => {
    const ai = getAiClient();
    if (photos.length === 0) {
        throw new Error("At least one site photo is required to generate renderings.");
    }
    
    const imageParts = photos.map(photo => ({
        inlineData: {
            mimeType: photo.file.type,
            data: photo.base64,
        },
    }));

    const prompt = `
        Generate a detailed 3D rendering of a proposed solar array installation on the property shown in the image.
        Incorporate the following compatible components into the design:
        ${components}
        The rendering should be realistic, showing the panels on the roof with proper mounting and wiring.
    `;
    
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '16:9',
        },
    });

    return response.generatedImages.map(img => `data:image/jpeg;base64,${img.image.imageBytes}`);
};

export const generateBillOfMaterials = async (components: string, photos: SitePhoto[]): Promise<BillOfMaterialItem[]> => {
    const ai = getAiClient();
    const prompt = `
        Based on the provided list of compatible components and the site photos, generate a comprehensive bill of materials for the solar installation.
        Estimate quantities needed for a standard installation on a residential roof like the one pictured. Include panels, inverter, battery, racking, wiring, connectors, and other necessary hardware.

        Compatible Components List:
        ${components}

        Return the data in a valid JSON array format, following the provided schema precisely.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        item: { type: Type.STRING },
                        quantity: { type: Type.INTEGER },
                        description: { type: Type.STRING },
                        vendor: { type: Type.STRING, description: "A suggested vendor or manufacturer" },
                    },
                    required: ["item", "quantity", "description", "vendor"]
                }
            }
        },
    });
    
    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Failed to parse Bill of Materials JSON:", e);
        throw new Error("AI returned an invalid data format for the bill of materials.");
    }
};

export const generateOrderSheet = async (billOfMaterials: BillOfMaterialItem[]): Promise<string> => {
    const ai = getAiClient();
    const bomString = billOfMaterials.map(item => `- ${item.item} (Qty: ${item.quantity}): ${item.description} [Vendor: ${item.vendor}]`).join('\n');

    const prompt = `
        Compile a complete and professionally formatted purchase order request for a solar equipment supplier based on the following bill ofmaterials.
        The order sheet should have a clear header, an itemized list with quantities, descriptions, and vendors, and a footer with a placeholder for authorization.
        
        Bill of Materials:
        ${bomString}

        Generate the output as a clean, well-formatted text document ready to be copied and sent.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });

    return response.text;
};
