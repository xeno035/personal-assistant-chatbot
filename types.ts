export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface PdfData {
  base64: string;
  mimeType: string;
  name: string;
}

export enum AppState {
  IDLE = 'IDLE',
  AUTHENTICATING = 'AUTHENTICATING',
  UPLOADING = 'UPLOADING',
  CHATTING = 'CHATTING',
}
