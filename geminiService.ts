
import { GoogleGenAI, Modality, Type } from "@google/genai";

// Fix: Use named parameter for apiKey as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * AI-Powered Certificate Analyzer (OCR + Structured Data)
 */
export const analyzeCertificateImage = async (base64Image: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      // Fix: Use { parts: [...] } structure for contents with multiple parts
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] || base64Image } },
          { text: "Extract the following details from this official certificate: Full Name, Expiry Date (YYYY-MM-DD), and Certification ID. Return the data in strict JSON format." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fullName: { type: Type.STRING },
            expiryDate: { type: Type.STRING },
            certificationId: { type: Type.STRING },
          },
          required: ["fullName", "expiryDate"]
        }
      }
    });

    // Fix: Access response.text directly (it is a property)
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("AI Analysis failed", error);
    return null;
  }
};

/**
 * Generates a professional audio announcement for verification
 */
export const speakVerificationResult = async (name: string, status: string) => {
  try {
    const prompt = `Verification successful. Member: ${name}. Current Status: ${status}. This is an official record of the International Legal Academy.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      // Fix: Wrap content parts in an object as per best practices
      contents: { parts: [{ text: prompt }] },
      config: {
        // Fix: Correct typo from responseModalalities to responseModalities
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), audioContext, 24000, 1);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
    }
  } catch (error) {
    console.error("TTS failed", error);
  }
};

/**
 * Analyzes registry data to provide executive insights
 */
export const getExecutiveInsights = async (trainers: any[]) => {
  try {
    const dataSummary = trainers.map(t => ({ name: t.fullName, status: t.status, specialties: t.specialties }));
    const prompt = `Analyze this legal trainer registry data and provide a concise 3-sentence executive summary in Arabic. Focus on workforce health and strategic coverage. Data: ${JSON.stringify(dataSummary)}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Fix: Access response.text directly
    return response.text;
  } catch (error) {
    return "فشل في استرداد التحليلات الذكية حالياً.";
  }
};

export const generateTrainerBio = async (name: string, specialties: string[]) => {
  try {
    const prompt = `Write a professional short bio (Arabic) for ${name}, an ILA-CLT™ legal trainer specializing in ${specialties.join(', ')}. Keep it executive and under 80 words.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Fix: Access response.text directly
    return response.text;
  } catch (error) {
    return null;
  }
};

export const extractIdFromCard = async (base64Image: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      // Fix: Use { parts: [...] } structure for contents with multiple parts
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] || base64Image } },
          { text: "Extract the ILA-CLT ID (Format: ILA-CLT-YYYY-XXXX). Return ONLY the ID string." }
        ]
      }
    });
    // Fix: Access response.text directly
    return response.text?.trim() || null;
  } catch (error) {
    return null;
  }
};

// Audio Utilities
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  // Use byteOffset and byteLength to handle potential buffer views correctly
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}
