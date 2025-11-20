// Text-to-Speech service using Web Speech API

class VoiceService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public isAvailable(): boolean {
    return this.synth !== null;
  }

  public speak(text: string, onEnd?: () => void, lang: string = 'en-US', voiceName?: string): void {
    if (!this.synth) {
      console.warn('Speech synthesis is not available');
      return;
    }

    // Stop any current speech
    this.stop();

    // Remove "Vishnu speaking..." prefix for cleaner voice output
    const cleanText = text.replace(/^Vishnu speaking\.\.\.\s*/i, '').trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang;
    
    // Configure voice settings
    utterance.rate = 1.0; // Normal speed
    utterance.pitch = 1.0; // Normal pitch
    utterance.volume = 1.0; // Full volume

    // Function to set voice
    const setVoice = () => {
      const voices = this.synth?.getVoices() || [];
      
      // First, try to find a voice matching the requested language (prioritize language over manual selection)
      const langPrefix = lang.split('-')[0];
      
      // If a specific voice is requested, check if it matches the language
      if (voiceName) {
        const selectedVoice = voices.find(v => v.name === voiceName);
        if (selectedVoice) {
          // Only use the selected voice if it matches the requested language
          if (selectedVoice.lang.startsWith(langPrefix) || selectedVoice.lang === lang) {
            utterance.voice = selectedVoice;
            return;
          }
          // If selected voice doesn't match language, fall through to find a matching voice
        }
      }
      
      // Try exact language match first (e.g., 'en-US' matches 'en-US')
      const exactMatch = voices.find(v => v.lang === lang);
      if (exactMatch) {
        utterance.voice = exactMatch;
        return;
      }
      
      // Then try prefix match (e.g., 'en' matches 'en-US', 'en-GB', etc.)
      const matchingVoice = voices.find(v => v.lang.startsWith(langPrefix));
      if (matchingVoice) {
        utterance.voice = matchingVoice;
        return;
      }

      // Fallback to preferred English voices if language not found
      const preferredVoices = [
        'Google UK English Male',
        'Google US English',
        'Microsoft Zira - English (United States)',
        'Microsoft David - English (United States)',
      ];

      for (const preferred of preferredVoices) {
        const voice = voices.find(v => v.name.includes(preferred));
        if (voice) {
          utterance.voice = voice;
          return;
        }
      }

      // If no preferred voice found, use default
      if (!utterance.voice && voices.length > 0) {
        // Prefer English voices
        const englishVoice = voices.find(v => v.lang.startsWith('en'));
        if (englishVoice) {
          utterance.voice = englishVoice;
        } else {
          utterance.voice = voices[0]; // Fallback to first available voice
        }
      }
    };

    // Try to set voice immediately
    setVoice();

    // If voices aren't loaded yet, wait for them
    if (!utterance.voice && this.synth) {
      const voicesChanged = () => {
        setVoice();
        this.synth?.removeEventListener('voiceschanged', voicesChanged);
      };
      this.synth.addEventListener('voiceschanged', voicesChanged);
    }

    utterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = (error) => {
      console.error('Speech synthesis error:', error);
      this.isSpeaking = false;
      this.currentUtterance = null;
      if (onEnd) onEnd();
    };

    this.currentUtterance = utterance;
    this.isSpeaking = true;
    this.synth.speak(utterance);
  }

  public stop(): void {
    if (this.synth && this.isSpeaking) {
      this.synth.cancel();
      this.isSpeaking = false;
      this.currentUtterance = null;
    }
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) {
      return [];
    }
    return this.synth.getVoices();
  }
}

export const voiceService = new VoiceService();

