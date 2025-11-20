import { GoogleGenAI, Chat, Part, Content } from "@google/genai";
import { Message, PdfData } from '../types';
import { DEFAULT_SYSTEM_INSTRUCTION } from '../constants';

// Helper to convert file to Base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data url prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

export class RevanthBrain {
  private ai: GoogleGenAI | null = null;
  private chatSession: Chat | null = null;
  private pdfContext: PdfData | null = null;
  private apiKeyMissing: boolean = false;
  private pdfSent: boolean = false;

  constructor() {
    // Vite config defines process.env.API_KEY and process.env.GEMINI_API_KEY via define
    const apiKey = (process.env.API_KEY || process.env.GEMINI_API_KEY) as string;
    if (!apiKey || apiKey === 'undefined' || apiKey === 'null') {
      console.error("API_KEY is missing from environment variables. Please create a .env file with GEMINI_API_KEY=your_key");
      this.apiKeyMissing = true;
      return;
    }
    try {
      this.ai = new GoogleGenAI({ apiKey: apiKey });
    } catch (error) {
      console.error("Failed to initialize GoogleGenAI:", error);
      this.apiKeyMissing = true;
    }
  }

  public setPdfContext(pdf: PdfData) {
    this.pdfContext = pdf;
    // Reset chat session to incorporate new system instructions with PDF
    this.chatSession = null;
    this.pdfSent = false;
  }

  private initChat() {
    if (!this.ai) {
      throw new Error("GoogleGenAI not initialized. API key is missing.");
    }
    
    const model = 'gemini-2.0-flash';

    // System instruction must be text only - cannot include PDF data
    let systemInstructionText = DEFAULT_SYSTEM_INSTRUCTION;
    
    if (this.pdfContext) {
      systemInstructionText += "\n\n[IMPORTANT]: A PDF document containing Vishnu's actual life details, resume, and background has been uploaded. This PDF will be provided with each message. Use the PDF content as the absolute source of truth for any personal questions about Vishnu.";
    }

    const sysInstructionContent: Content = {
        parts: [{ text: systemInstructionText }],
        role: 'system'
    };

    this.chatSession = this.ai.chats.create({
      model: model,
      config: {
        systemInstruction: sysInstructionContent,
        temperature: 0.7, // A bit of creativity for personality
      }
    });
  }

  public async sendMessage(text: string, responseLanguage?: string): Promise<string> {
    if (this.apiKeyMissing || !this.ai) {
      return "Vishnu speaking... Oops! My API key isn't configured. Please create a .env file in the project root with GEMINI_API_KEY=your_api_key and restart the server.";
    }

    if (!this.chatSession) {
      try {
        this.initChat();
      } catch (error: any) {
        console.error("Failed to initialize chat:", error);
        return "Vishnu speaking... Failed to initialize chat session. Please check your API key configuration.";
      }
    }

    try {
      if (!this.chatSession) {
          throw new Error("Failed to initialize chat session.");
      }
      
      // If PDF exists and hasn't been sent yet, send it as the first message
      if (this.pdfContext && !this.pdfSent) {
        const pdfMessageParts: Part[] = [
          { text: "Here is my resume and personal information document. Please read it carefully and use it to answer questions about me." },
          {
            inlineData: {
              mimeType: this.pdfContext.mimeType,
              data: this.pdfContext.base64
            }
          }
        ];
        
        // Send PDF first to establish context
        await this.chatSession.sendMessage({ message: pdfMessageParts });
        this.pdfSent = true;
      }
      
      // Send the actual user message with language instruction if specified
      let messageText = text;
      if (responseLanguage) {
        const languageNames: { [key: string]: string } = {
          'en-US': 'English',
          'es-ES': 'Spanish',
          'fr-FR': 'French',
          'de-DE': 'German',
          'it-IT': 'Italian',
          'pt-PT': 'Portuguese',
          'hi-IN': 'Hindi',
          'ta-IN': 'Tamil',
          'ja-JP': 'Japanese',
          'ko-KR': 'Korean',
          'zh-CN': 'Chinese (Simplified)',
          'ar-SA': 'Arabic',
          'ru-RU': 'Russian',
          'nl-NL': 'Dutch',
          'pl-PL': 'Polish',
          'tr-TR': 'Turkish',
        };
        const langName = languageNames[responseLanguage] || responseLanguage;
        messageText = `${text}\n\n[IMPORTANT: Please respond in ${langName} language. All your responses should be in ${langName}.]`;
      }
      
      const result = await this.chatSession.sendMessage({ message: messageText });
      return result.text || "Vishnu speaking... I'm drawing a blank here, can you repeat that?";
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      // Provide more specific error messages
      if (error?.message?.includes('API_KEY') || error?.message?.includes('api key') || error?.message?.includes('API key')) {
        return "Vishnu speaking... Oops! My API key isn't configured properly. Please check the .env file.";
      }
      if (error?.message?.includes('quota') || error?.message?.includes('limit')) {
        return "Vishnu speaking... Looks like I've hit my API limit. Please try again later.";
      }
      if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        return "Vishnu speaking... Network issue detected. Check your internet connection and try again.";
      }
      return `Vishnu speaking... Something went wrong: ${error?.message || 'Unknown error'}. Try again in a moment.`;
    }
  }
}

export const revanthBrain = new RevanthBrain();
