import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import chatLogo from '../../assets/chatlogo.png';
import './ChatMessages.css';

const SpeechSynthesis = window.speechSynthesis || null;

const getTtsLangFromSiteLanguage = () => {
  const stored = localStorage.getItem('siteLanguage');
  if (stored === 'mr') return 'mr-IN';
  if (stored === 'en') return 'en-IN';
  return 'en-IN';
};

const BotIcon = () => (
  <img 
    src={chatLogo} 
    alt="LokMitra Bot" 
    className="bot-logo"
    style={{
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      objectFit: 'cover'
    }}
  />
);

const UserIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const ChatMessages = ({ messages, isLoading, onScroll, messagesContainerRef }) => {
  const navigate = useNavigate();
  const utteranceRef = useRef(null);
  const messageTextRefs = useRef({});
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [ttsLang, setTtsLang] = useState(getTtsLangFromSiteLanguage);

  useEffect(() => {
    const onSamePageLanguageChange = (event) => {
      setTtsLang(event.detail === 'mr' ? 'mr-IN' : 'en-IN');
    };

    const onStorageLanguageChange = (event) => {
      if (event.key === 'siteLanguage') {
        setTtsLang(event.newValue === 'mr' ? 'mr-IN' : 'en-IN');
      }
    };

    window.addEventListener('siteLanguageChanged', onSamePageLanguageChange);
    window.addEventListener('storage', onStorageLanguageChange);

    return () => {
      window.removeEventListener('siteLanguageChanged', onSamePageLanguageChange);
      window.removeEventListener('storage', onStorageLanguageChange);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (SpeechSynthesis) {
        SpeechSynthesis.cancel();
      }
      utteranceRef.current = null;
    };
  }, []);

  const getFormattedHtml = (content) => {
    let html = content;
    html = html.replace(/#{1,6}\s*/g, '');
    html = html.replace(/\*{3,}(.*?)\*{3,}/g, '**$1**');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*/g, '');
    const paragraphs = html.split(/\n\n+/);
    if (paragraphs.length > 1) {
      return paragraphs
        .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join('');
    }
    return html.replace(/\n/g, '<br>');
  };

  const getSpeakableText = (content) => {
    if (!content) return '';
    let text = content;
    text = text.replace(/#{1,6}\s*/g, '');
    text = text.replace(/\*{1,}/g, '');
    text = text.replace(/`{1,3}/g, '');
    text = text.replace(/\[(.*?)\]\((.*?)\)/g, '$1');
    text = text.replace(/\s+/g, ' ').trim();
    return text;
  };

  const detectLanguageFromText = (text, fallbackLang) => {
    if (!text) return fallbackLang;
    // Marathi/Hindi are typically rendered in Devanagari after translation.
    const hasDevanagari = /[\u0900-\u097F]/.test(text);
    if (hasDevanagari) return 'mr-IN';
    return 'en-IN';
  };

  const chooseBestVoice = (targetLang) => {
    if (!SpeechSynthesis) return null;

    const voices = SpeechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const normalizedTarget = targetLang.toLowerCase();
    const targetBase = normalizedTarget.split('-')[0];

    // Priority: exact match -> same base language -> practical fallback for Marathi (Hindi) -> English.
    const exact = voices.find((voice) => voice.lang?.toLowerCase() === normalizedTarget);
    if (exact) return exact;

    const sameBase = voices.find((voice) => voice.lang?.toLowerCase().startsWith(`${targetBase}-`));
    if (sameBase) return sameBase;

    if (targetBase === 'mr') {
      const hindi = voices.find((voice) => voice.lang?.toLowerCase().startsWith('hi-'));
      if (hindi) return hindi;
    }

    const english = voices.find((voice) => voice.lang?.toLowerCase().startsWith('en-'));
    return english || voices[0] || null;
  };

  const stopSpeaking = () => {
    if (!SpeechSynthesis) return;
    SpeechSynthesis.cancel();
    utteranceRef.current = null;
    setSpeakingMessageId(null);
  };

  const speakMessage = (message) => {
    if (!SpeechSynthesis) {
      alert('Text-to-speech is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (speakingMessageId === message.id && SpeechSynthesis.speaking) {
      stopSpeaking();
      return;
    }

    if (SpeechSynthesis.speaking) {
      SpeechSynthesis.cancel();
    }

    const renderedMessageNode = messageTextRefs.current[message.id];
    const renderedText = renderedMessageNode?.innerText?.trim() || '';
    const text = renderedText || getSpeakableText(message.content);
    if (!text) return;

    const utterance = new window.SpeechSynthesisUtterance(text);
    const effectiveLang = detectLanguageFromText(text, ttsLang);
    utterance.lang = effectiveLang;
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    const selectedVoice = chooseBestVoice(effectiveLang);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onend = () => {
      setSpeakingMessageId(null);
      utteranceRef.current = null;
    };

    utterance.onerror = () => {
      setSpeakingMessageId(null);
      utteranceRef.current = null;
    };

    utteranceRef.current = utterance;
    setSpeakingMessageId(message.id);
    SpeechSynthesis.speak(utterance);
  };

  const handleActionClick = (action) => {
    if (action === 'homepage') {
      navigate('/');
    }
  };

  const handleSourceClick = (source) => {
    console.log('Source clicked:', source);
    
    if (source.type === 'pdf_chunk') {
      // Method 1: Try direct Cloudinary URL if available
      if (source.metadata?.url) {
        console.log('Opening PDF from direct URL:', source.metadata.url);
        window.open(source.metadata.url, '_blank');
      } 
      // Method 2: Fallback to server download endpoint if we have schemeId
      else if (source.metadata?.schemeId) {
        const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const downloadUrl = `${baseUrl}/schemes/${source.metadata.schemeId}/download-pdf`;
        console.log('Opening PDF from server endpoint:', downloadUrl);
        window.open(downloadUrl, '_blank');
      }
      // Method 3: Show helpful message if no URL available
      else {
        console.warn('No PDF URL or scheme ID available for source:', source);
        alert('PDF file not available for this source.');
      }
    }
  };
  return (
    <div 
      className="messages-container" 
      ref={messagesContainerRef}
      onScroll={onScroll}
    >
      {messages.map((message) => (
        <div key={message.id} className={`message ${message.type}`}>
          <div className="message-avatar">
            {message.type === 'bot' ? <BotIcon /> : <UserIcon />}
          </div>
          <div className="message-content">
            <div
              className="message-text"
              ref={(node) => {
                if (node) {
                  messageTextRefs.current[message.id] = node;
                } else {
                  delete messageTextRefs.current[message.id];
                }
              }}
              dangerouslySetInnerHTML={{ 
              __html: getFormattedHtml(message.content)
            }}
            ></div>
            {message.type === 'bot' && message.content && (
              <div className="message-tts">
                <button
                  type="button"
                  className={`tts-button ${speakingMessageId === message.id ? 'is-speaking' : ''}`}
                  onClick={() => speakMessage(message)}
                  title={speakingMessageId === message.id ? 'Stop reading' : 'Read aloud'}
                  aria-label={speakingMessageId === message.id ? 'Stop reading this response' : 'Read this response aloud'}
                >
                  {speakingMessageId === message.id ? 'Stop' : 'Read aloud'}
                </button>
                {speakingMessageId === message.id && (
                  <span className="speaking-indicator" aria-live="polite">
                    <span className="speaking-dot"></span>
                    <span>Speaking</span>
                  </span>
                )}
              </div>
            )}
            {message.references && message.references.length > 0 && (
              <div className="message-references">
                <p>References:</p>
                {message.references.map((ref, index) => (
                  <a key={index} href={ref.url} target="_blank" rel="noopener noreferrer" className="reference-link">
                    📄 {ref.title}
                  </a>
                ))}
              </div>
            )}
            {message.sources && message.sources.length > 0 && (
              <div className="message-sources">
                <p>Sources:</p>
                {message.sources.map((source, index) => (
                  <div 
                    key={index} 
                    className={`source-item ${source.type === 'pdf_chunk' ? 'clickable-source' : ''}`}
                    onClick={() => source.type === 'pdf_chunk' && handleSourceClick(source)}
                    title={source.type === 'pdf_chunk' ? 'Click to view PDF' : ''}
                  >
                    <span className="source-type">{source.type === 'pdf_chunk' ? '📄' : '📋'}</span>
                    <span className="source-info">
                      {source.metadata?.schemeTitle || 'Government Scheme'} 
                      {source.relevanceScore && (
                        <span className="relevance-score">
                          ({Math.round(source.relevanceScore * 100)}% relevant)
                        </span>
                      )}
                    </span>
                    {source.type === 'pdf_chunk' && (
                      <span className="download-icon">⬇️</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {message.action && (
              <div className="message-action">
                <button 
                  className="action-button"
                  onClick={() => handleActionClick(message.action)}
                >
                  🏠 Visit Home Page
                </button>
              </div>
            )}
            <div className="message-time">
              {message.timestamp.toLocaleTimeString('en-IN', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
        </div>
      ))}
      {isLoading && (
        <div className="message bot">
          <div className="message-avatar">
            <BotIcon />
          </div>
          <div className="message-content">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessages;
