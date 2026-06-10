import React, { useRef, useEffect, useState, useCallback } from 'react';
import './ChatInput.css';

const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="sendGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#f0f9ff" />
      </linearGradient>
    </defs>
    <path
      d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z"
      fill="url(#sendGradient)"
      stroke="currentColor"
      strokeWidth="0.5"
    />
  </svg>
);

const MicIcon = ({ isListening }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    {isListening ? (
      // Stop / recording icon — filled square
      <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
    ) : (
      // Microphone icon
      <>
        <rect x="9" y="2" width="6" height="11" rx="3" fill="currentColor" />
        <path d="M5 11a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="8" y1="22" x2="16" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </>
    )}
  </svg>
);

// Language options for speech recognition
const LANGUAGE_OPTIONS = [
  { code: 'en-IN', label: 'EN', fullLabel: 'English' },
  { code: 'hi-IN', label: 'हि', fullLabel: 'Hindi' },
  { code: 'mr-IN', label: 'म',  fullLabel: 'Marathi' },
];

// Check if browser supports SpeechRecognition
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;

// Read voice language from localStorage (written by LanguageToggle on every switch).
// Falls back to DOM body-class for the very first page load.
const getSiteLang = () => {
  const stored = localStorage.getItem('siteLanguage');
  if (stored === 'mr') return 'mr-IN';
  if (stored === 'en') return 'en-IN';
  // First-load fallback before any toggle has happened
  const body = document.body;
  if (
    body.classList.contains('translated-ltr') ||
    body.classList.contains('translated-rtl')
  ) return 'mr-IN';
  return 'en-IN';
};

const ChatInput = ({ value, onChange, onSend, isLoading }) => {
  const textareaRef       = useRef(null);
  const recognitionRef    = useRef(null);

  const [isListening,    setIsListening]    = useState(false);
  const [voiceLang,      setVoiceLang]      = useState(getSiteLang);  // init from localStorage
  const [voiceError,     setVoiceError]     = useState('');
  const [showLangMenu,   setShowLangMenu]   = useState(false);
  const [interimText,    setInterimText]    = useState('');
  const langMenuRef = useRef(null);

  // ── Sync voiceLang when LanguageToggle fires siteLanguageChanged ──
  useEffect(() => {
    // Same-tab updates via CustomEvent (storage event only fires in other tabs)
    const onSamePage = (e) => {
      setVoiceLang(e.detail === 'mr' ? 'mr-IN' : 'en-IN');
    };
    // Cross-tab updates via storage event
    const onStorage = (e) => {
      if (e.key === 'siteLanguage') {
        setVoiceLang(e.newValue === 'mr' ? 'mr-IN' : 'en-IN');
      }
    };
    window.addEventListener('siteLanguageChanged', onSamePage);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('siteLanguageChanged', onSamePage);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // ── textarea auto-resize ──────────────────────────────────────
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, []);

  useEffect(() => { adjustTextareaHeight(); }, [value, adjustTextareaHeight]);

  // ── close lang menu when clicking outside ────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── cleanup recognition on unmount ───────────────────────────
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // ── voice recognition logic ───────────────────────────────────
  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      setVoiceError('Voice input is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    setVoiceError('');
    setInterimText('');

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang            = voiceLang;
    recognition.continuous      = false;   // single utterance
    recognition.interimResults  = true;    // show live partial text
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      let interim = '';
      let final   = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      setInterimText(interim);

      if (final) {
        // Append final transcript to existing input value
        const syntheticEvent = {
          target: { value: (value ? value + ' ' : '') + final.trim() }
        };
        onChange(syntheticEvent);
        setInterimText('');
      }
    };

    recognition.onerror = (event) => {
      const errorMessages = {
        'no-speech'         : 'No speech detected. Please try again.',
        'audio-capture'     : 'Microphone not found. Please check your microphone.',
        'not-allowed'       : 'Microphone permission denied. Please allow access in browser settings.',
        'network'           : 'Network error. Please check your connection.',
        'aborted'           : '',   // user stopped — no error message needed
      };
      const msg = errorMessages[event.error] ?? `Voice error: ${event.error}`;
      if (msg) setVoiceError(msg);
      setIsListening(false);
      setInterimText('');
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');
    };

    recognition.start();
  }, [voiceLang, value, onChange]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setInterimText('');
  }, []);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // ── send ──────────────────────────────────────────────────────
  const handleSend = () => {
    if (isListening) stopListening();
    if (value && value.trim()) onSend(value);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e) => {
    onChange(e);
    setTimeout(adjustTextareaHeight, 0);
  };

  // ── mobile viewport helpers ───────────────────────────────────
  const handleFocus = () => {
    if (window.innerWidth <= 768) {
      const vp = document.querySelector('meta[name=viewport]');
      if (vp) vp.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }
  };

  const handleBlur = () => {
    if (window.innerWidth <= 768) {
      const vp = document.querySelector('meta[name=viewport]');
      if (vp) vp.setAttribute('content', 'width=device-width, initial-scale=1.0');
    }
  };

  const currentLang = LANGUAGE_OPTIONS.find(l => l.code === voiceLang);

  return (
    <div className="chat-input-area">
      <div className="input-container">

        {/* Error banner */}
        {voiceError && (
          <div className="voice-error-banner">
            <span>⚠️ {voiceError}</span>
            <button className="voice-error-close" onClick={() => setVoiceError('')}>✕</button>
          </div>
        )}

        {/* Interim (live) transcript preview */}
        {interimText && (
          <div className="voice-interim-preview">
            <span className="voice-interim-dot"></span>
            <span className="voice-interim-text">{interimText}</span>
          </div>
        )}

        <div className={`input-wrapper${isListening ? ' listening' : ''}`}>

          {/* Language selector — auto-synced with site language toggle */}
          {SpeechRecognition && (
            <div className="voice-lang-selector" ref={langMenuRef}>
              <button
                className="voice-lang-btn notranslate"
                onClick={() => setShowLangMenu(prev => !prev)}
                title={`Voice language: ${currentLang?.fullLabel} (auto-synced with site language)`}
                type="button"
                translate="no"
              >
                {currentLang?.label}
              </button>
              {showLangMenu && (
                <div className="voice-lang-menu">
                  {LANGUAGE_OPTIONS.map(lang => (
                    <button
                      key={lang.code}
                      className={`voice-lang-option${voiceLang === lang.code ? ' active' : ''}`}
                      onClick={() => { setVoiceLang(lang.code); setShowLangMenu(false); }}
                      type="button"
                    >
                      <span className="lang-label notranslate" translate="no">{lang.label}</span>
                      <span className="lang-full notranslate" translate="no">{lang.fullLabel}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={
              isListening
                ? (voiceLang === 'mr-IN' ? 'ऐकत आहे… बोला' : 'Listening… speak now')
                : 'Type your question about this scheme...'
            }
            className="message-input"
            rows="1"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="true"
          />

          {/* Mic button — only if browser supports it */}
          {SpeechRecognition && (
            <button
              type="button"
              onClick={toggleListening}
              disabled={isLoading}
              className={`mic-button${isListening ? ' mic-active' : ''}`}
              title={isListening ? 'Stop listening' : `Voice input (${currentLang?.fullLabel})`}
            >
              {isListening && <span className="mic-pulse-ring"></span>}
              <MicIcon isListening={isListening} />
            </button>
          )}

          <button
            onClick={handleSend}
            disabled={!value.trim() || isLoading}
            className="send-button"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
