import React, { useState, useRef, useEffect } from 'react';
import { Message, PdfData } from './types';
import { UPLOAD_PASSWORD } from './constants';
import { revanthBrain, fileToBase64 } from './services/geminiService';
import { voiceService } from './services/voiceService';
import { SendIcon, LockIcon, UserIcon, RobotIcon, FileIcon, CheckIcon, SpeakerIcon, SpeakerOffIcon, MicIcon, MicOffIcon, LanguageIcon, VoiceIcon, PlayIcon, PauseIcon } from './components/Icons';
import { Modal } from './components/Modal';
import ProfilePanel from './components/ProfilePanel';

const PROFILE_PHOTO = 'assets/profile photo.jpg';
import { speechRecognitionService } from './services/speechRecognitionService';

// Language options for AI responses
const LANGUAGE_OPTIONS = [
  { code: 'en-US', name: 'English' },
  { code: 'es-ES', name: 'Spanish' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'pt-PT', name: 'Portuguese' },
  { code: 'hi-IN', name: 'Hindi' },
  { code: 'ta-IN', name: 'Tamil' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'ko-KR', name: 'Korean' },
  { code: 'zh-CN', name: 'Chinese' },
  { code: 'ar-SA', name: 'Arabic' },
  { code: 'ru-RU', name: 'Russian' },
  { code: 'nl-NL', name: 'Dutch' },
  { code: 'pl-PL', name: 'Polish' },
  { code: 'tr-TR', name: 'Turkish' },
];

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      text: "Welcome to Vishnu’s digital hub! My academic background, projects, internships, and skills are all loaded. Just shoot your question and I’ll break it down.",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pdfFile, setPdfFile] = useState<PdfData | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'done'>('idle');
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [responseLanguage, setResponseLanguage] = useState<string>('en-US');
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [autoPlayEnabled] = useState<boolean>(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-play initial welcome message on mount
  useEffect(() => {
    if (autoPlayEnabled && voiceService.isAvailable() && messages.length > 0 && messages[0].role === 'model') {
      // Small delay to ensure UI is ready and voices are loaded
      const timer = setTimeout(() => {
        const welcomeMsg = messages[0];
        if (welcomeMsg) {
          voiceService.stop();
          setSpeakingMessageId(welcomeMsg.id);
          voiceService.speak(welcomeMsg.text, () => {
            setSpeakingMessageId(null);
          }, responseLanguage, selectedVoice || undefined);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []); // Only run on mount

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      voiceService.stop();
      speechRecognitionService.stop();
    };
  }, []);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = voiceService.getVoices();
      setAvailableVoices(voices);
    };
    
    loadVoices();
    // Voices may load asynchronously
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // When language changes, check if selected voice matches the new language
  useEffect(() => {
    if (selectedVoice && availableVoices.length > 0) {
      const selectedVoiceObj = availableVoices.find(v => v.name === selectedVoice);
      if (selectedVoiceObj) {
        const langPrefix = responseLanguage.split('-')[0];
        // If selected voice doesn't match the new language, clear it to auto-select
        if (!selectedVoiceObj.lang.startsWith(langPrefix) && selectedVoiceObj.lang !== responseLanguage) {
          setSelectedVoice('');
        }
      }
    }
  }, [responseLanguage, availableVoices]); // Only check when language or voices change

  const handleSpeak = (messageId: string, text: string) => {
    if (speakingMessageId === messageId) {
      // Stop speaking if already speaking this message
      voiceService.stop();
      setSpeakingMessageId(null);
    } else {
      // Stop any current speech and start new one
      voiceService.stop();
      setSpeakingMessageId(messageId);
      voiceService.speak(text, () => {
        setSpeakingMessageId(null);
      }, responseLanguage, selectedVoice || undefined);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    // Stop recording if active
    if (isRecording) {
      speechRecognitionService.stop();
      setIsRecording(false);
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await revanthBrain.sendMessage(userMsg.text, responseLanguage);
      
      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now(),
      };
      
      setMessages(prev => [...prev, modelMsg]);
      
      // Auto-play voice for AI responses
      if (autoPlayEnabled && voiceService.isAvailable()) {
        // Small delay to ensure message is rendered
        setTimeout(() => {
          handleSpeak(modelMsg.id, responseText);
        }, 100);
      }
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenUpload = () => {
    setIsModalOpen(true);
    setPasswordInput('');
    setAuthError('');
    setUploadStatus('idle');
    // Passwordless for now - automatically authenticate
    setIsAuthenticated(true);
  };

  // Password authentication disabled for now
  // To re-enable: uncomment this function and set setIsAuthenticated(false) in handleOpenUpload
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === UPLOAD_PASSWORD) {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Access Denied: Incorrect Password.');
    }
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      speechRecognitionService.stop();
      setIsRecording(false);
    } else {
      if (!speechRecognitionService.isAvailable()) {
        alert('Speech recognition is not available in your browser. Please use Chrome, Edge, or Safari.');
        return;
      }

      setIsRecording(true);
      speechRecognitionService.start(
        (text, isFinal) => {
          if (text) {
            setInput(text);
            if (isFinal) {
              // Auto-submit when final result is received
              setTimeout(() => {
                handleSendMessage();
              }, 300);
            }
          }
        },
        (error) => {
          console.error('Speech recognition error:', error);
          setIsRecording(false);
          if (error === 'no-speech' || error === 'aborted') {
            // These are expected errors, don't show alert
            return;
          }
          alert(`Speech recognition error: ${error}`);
        },
        () => {
          setIsRecording(false);
        },
        responseLanguage
      );
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        setAuthError('Please upload a valid PDF file.');
        return;
      }

      setUploadStatus('processing');
      try {
        const base64 = await fileToBase64(file);
        const pdfData: PdfData = {
          base64,
          mimeType: file.type,
          name: file.name
        };
        
        setPdfFile(pdfData);
        revanthBrain.setPdfContext(pdfData);
        setUploadStatus('done');
        
        // Add system message to chat
        const sysMsg: Message = {
            id: Date.now().toString(),
            role: 'model',
            text: "Vishnu speaking... Memory updated! I've just processed the new data. Ask me anything about it.",
            timestamp: Date.now(),
        };
        setMessages(prev => [...prev, sysMsg]);
        
        // Auto-play voice for PDF upload confirmation
        if (autoPlayEnabled && voiceService.isAvailable()) {
          handleSpeak(sysMsg.id, sysMsg.text);
        }

        setTimeout(() => {
            setIsModalOpen(false);
            setIsAuthenticated(false); // Reset auth for security
        }, 1500);

      } catch (error) {
        console.error("File processing error", error);
        setAuthError("Failed to process PDF.");
        setUploadStatus('idle');
      }
    }
  };

  return (
    <div
      className="min-h-screen bg-[#f4f6fb] text-slate-900 font-sans"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}
    >
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <div className="flex flex-col gap-6 lg:flex-row">
          <section className="flex-1 bg-white rounded-[32px] border border-slate-100 shadow-[0_15px_50px_rgba(15,23,42,0.08)] flex flex-col overflow-hidden">
            {/* Header */}
            <header className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-md bg-white">
              <img
                src={PROFILE_PHOTO}
                alt="Vishnu avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-900"> Vishnu Assistant</h1>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              {pdfFile ? (
                <span className="text-green-600 flex items-center gap-1">
                    <CheckIcon className="w-3 h-3"/> Memory Loaded
                </span>
              ) : (
                "Standard Mode"
              )}
            </p>
          </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsLanguageModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-1.5 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 rounded-lg border border-gray-300 transition-all shadow-sm hover:shadow-md group"
                  title="Select response language"
                >
                  <LanguageIcon className="w-4 h-4 group-hover:text-blue-600" />
                  <span className="hidden sm:inline">
                    {LANGUAGE_OPTIONS.find(l => l.code === responseLanguage)?.name || 'Language'}
                  </span>
                </button>

                <button 
                  onClick={() => setIsVoiceModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-1.5 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 rounded-lg border border-gray-300 transition-all shadow-sm hover:shadow-md group"
                  title="Select voice"
                >
                  <VoiceIcon className="w-4 h-4 group-hover:text-blue-600" />
                  <span className="hidden sm:inline">Voice</span>
                </button>
              </div>
            </header>

            {/* Chat Area */}
            <main className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 bg-white">
              <div className="max-w-3xl mx-auto space-y-5">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse text-right' : ''}`}
            >
              <div className="flex flex-col gap-2 max-w-[80%] sm:max-w-[70%]">
                <div className={`
                  flex items-center ${msg.role === 'user' ? 'justify-end' : 'justify-start'}
                `}>
                  <div className={`
                    flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm
                    ${msg.role === 'model' ? 'bg-blue-500 text-white' : 'bg-indigo-500 text-white'}
                  `}>
                    {msg.role === 'model' ? <RobotIcon className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                  </div>
                </div>
                <div className={`
                  p-4 rounded-2xl shadow-sm relative group
                  ${msg.role === 'model' 
                    ? 'bg-white border border-gray-200 text-gray-900 rounded-tl-sm' 
                    : 'bg-blue-500 text-white rounded-tr-sm shadow-md'}
                `}>
                <p className="leading-relaxed whitespace-pre-wrap text-[15px] pr-8" style={{ lineHeight: '1.5' }}>{msg.text}</p>
                {msg.role === 'model' && voiceService.isAvailable() && (
                  <button
                    onClick={() => handleSpeak(msg.id, msg.text)}
                    className={`
                      absolute top-2 right-2 p-1.5 rounded-md transition-all
                      ${speakingMessageId === msg.id
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }
                    `}
                    title={speakingMessageId === msg.id ? 'Stop speaking' : 'Speak message'}
                  >
                    {speakingMessageId === msg.id ? (
                      <SpeakerOffIcon className="w-4 h-4" />
                    ) : (
                      <SpeakerIcon className="w-4 h-4" />
                    )}
                  </button>
                )}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-start gap-3">
               <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                 <RobotIcon className="w-5 h-5 text-white" />
               </div>
               <div className="bg-white border border-gray-200 p-3.5 rounded-2xl rounded-tl-sm flex items-center gap-2 shadow-sm">
                 <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                 <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                 <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
              </div>
            </main>

            {/* Input Area */}
            <footer className="px-5 sm:px-8 py-5 bg-white border-t border-gray-100">
              <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleRecording}
              disabled={isLoading}
              className={`
                flex-shrink-0 p-2.5 rounded-lg transition-all shadow-sm
                ${isRecording 
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              title={isRecording ? 'Stop recording' : 'Start voice input'}
            >
              {isRecording ? (
                <MicOffIcon className="w-5 h-5" />
              ) : (
                <MicIcon className="w-5 h-5" />
              )}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Vishnu's projects, internships, skills, or anything else"
              className="w-full bg-white text-gray-900 placeholder-gray-400 border border-gray-300 rounded-xl py-3 pl-5 pr-14 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all shadow-sm"
              disabled={isLoading || isRecording}
            />
            <button 
              type="submit"
              disabled={!input.trim() || isLoading || isRecording}
              className="absolute right-2 p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors shadow-sm"
            >
              <SendIcon className="w-5 h-5" />
            </button>
          </form>
          <p className="text-center text-gray-500 text-xs mt-3">
             Vishnu Assistant can make mistakes. Please verify important information.
          </p>
        </div>
            </footer>
          </section>

          <aside className="lg:w-[320px] xl:w-[360px]">
            <ProfilePanel
              className="border border-slate-100 shadow-[0_15px_45px_rgba(15,23,42,0.08)] rounded-[32px]"
              onEditPersona={handleOpenUpload}
            />
          </aside>
        </div>
      </div>

      {/* Language Selection Modal */}
      <Modal 
        isOpen={isLanguageModalOpen} 
        onClose={() => setIsLanguageModalOpen(false)} 
        title="Select Response Language"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 text-center mb-4">
            Choose the language for AI responses and voice output
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
            {LANGUAGE_OPTIONS.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setResponseLanguage(lang.code);
                  setIsLanguageModalOpen(false);
                }}
                className={`
                  px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium
                  ${responseLanguage === lang.code
                    ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                  }
                `}
              >
                {lang.name}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Voice Selection Modal */}
      <Modal 
        isOpen={isVoiceModalOpen} 
        onClose={() => setIsVoiceModalOpen(false)} 
        title="Select Voice"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 text-center mb-4">
            Choose a voice for text-to-speech output
          </p>
          <div className="max-h-96 overflow-y-auto space-y-2">
            <button
              onClick={() => {
                setSelectedVoice('');
                setIsVoiceModalOpen(false);
              }}
              className={`
                w-full px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium text-left
                ${selectedVoice === ''
                  ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                }
              `}
            >
              Auto (Default)
            </button>
            {availableVoices.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                Loading voices...
              </p>
            )}
            {availableVoices.map((voice) => (
              <button
                key={voice.name}
                onClick={() => {
                  setSelectedVoice(voice.name);
                  setIsVoiceModalOpen(false);
                }}
                className={`
                  w-full px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium text-left
                  ${selectedVoice === voice.name
                    ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                  }
                `}
              >
                <div className="font-semibold">{voice.name}</div>
                <div className={`text-xs mt-1 ${selectedVoice === voice.name ? 'text-blue-100' : 'text-gray-500'}`}>
                  {voice.lang} {voice.default && '(Default)'}
                </div>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Upload Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Access Memory Core"
      >
        {!isAuthenticated ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="flex flex-col items-center justify-center mb-6">
                <div className="p-4 bg-gray-100 rounded-full mb-3">
                    <LockIcon className="w-8 h-8 text-blue-500" />
                </div>
                <p className="text-gray-600 text-center text-sm">Enter the secure password to upload new persona data.</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Password</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500/30 focus:outline-none focus:border-blue-500 shadow-sm"
                placeholder="•••••••"
                autoFocus
              />
            </div>

            {authError && (
              <p className="text-red-600 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-200">
                {authError}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-all mt-2 shadow-sm"
            >
              Unlock Access
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            {uploadStatus === 'done' ? (
                 <div className="flex flex-col items-center py-6 text-green-600">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                        <CheckIcon className="w-8 h-8" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Upload Complete!</h4>
                    <p className="text-gray-500 text-sm mt-1">Vishnu's memory has been updated.</p>
                 </div>
            ) : (
                <>
                    <div className="text-center">
                        <h4 className="text-gray-900 font-medium mb-2">Upload Profile PDF</h4>
                        <p className="text-sm text-gray-500 mb-6">
                            Upload Vishnu's personal data PDF. The AI will ingest this to answer specific questions.
                        </p>
                    </div>

                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`
                            border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50/50 
                            rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all
                            ${uploadStatus === 'processing' ? 'opacity-50 pointer-events-none' : ''}
                        `}
                    >
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="application/pdf"
                            onChange={handleFileChange}
                        />
                        {uploadStatus === 'processing' ? (
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                <span className="text-blue-600 text-sm font-medium">Processing PDF...</span>
                            </div>
                        ) : (
                            <>
                                <FileIcon className="w-10 h-10 text-gray-400 mb-3" />
                                <span className="text-gray-700 font-medium">Click to upload PDF</span>
                                <span className="text-gray-500 text-xs mt-1">Max size 10MB</span>
                            </>
                        )}
                    </div>
                </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default App;
