import React, { useRef, useEffect } from 'react';
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

const ChatInput = ({ value, onChange, onSend, isLoading }) => {
  const textareaRef = useRef(null);

  // Auto-resize textarea based on content
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 120; // max-height from CSS
      textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    }
  };

  // Adjust height when value changes
  useEffect(() => {
    adjustTextareaHeight();
  }, [value]);

  const handleSend = () => {
    if (value && value.trim()) {
      onSend(value);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e) => {
    onChange(e);
    // Adjust height after state update
    setTimeout(adjustTextareaHeight, 0);
  };

  // Handle mobile keyboard events
  const handleFocus = () => {
    // Prevent zoom on iOS when focusing input
    if (window.innerWidth <= 768) {
      const viewport = document.querySelector('meta[name=viewport]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
      }
    }
  };

  const handleBlur = () => {
    // Restore normal viewport behavior
    if (window.innerWidth <= 768) {
      const viewport = document.querySelector('meta[name=viewport]');
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
      }
    }
  };

  return (
    <div className="chat-input-area">
      <div className="input-container">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="Type your question about this scheme..."
            className="message-input"
            rows="1"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="true"
          />
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
