import React from 'react';
import { useNavigate } from 'react-router-dom';
import chatLogo from '../../assets/chatlogo.png';
import './ChatMessages.css';

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

  const handleActionClick = (action) => {
    if (action === 'homepage') {
      navigate('/');
    }
  };

  const handleSourceClick = (source) => {
    if (source.type === 'pdf_chunk' && source.metadata?.filename) {
      // Construct PDF URL similar to scheme card download
      const baseUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');
      const pdfUrl = `${baseUrl}/uploads/schemes/${source.metadata.filename}`;
      
      // Open PDF in new tab
      window.open(pdfUrl, '_blank');
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
            <div className="message-text" dangerouslySetInnerHTML={{ 
              __html: message.content
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>')
                .replace(/^- /gm, '<br/>- ')
                .replace(/^<br\/>- /gm, '- ')
            }}></div>
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
