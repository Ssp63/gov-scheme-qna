import React from 'react';
import './ChatHeader.css';

const ChatHeader = ({ scheme, isGeneralChat = false }) => {
  return (
    <div className="chat-header">
      <div className="container">
        <div className="chat-header-content">
          <div className="scheme-info">
            {isGeneralChat ? (
              <>
                <h1 className="preserve-original-text notranslate">Government Schemes Q&A</h1>
                <p className="preserve-original-text notranslate">Ask questions about any government scheme</p>
              </>
            ) : (
              <>
                <h1 className="preserve-original-text notranslate">{scheme?.title || 'Loading Scheme...'}</h1>
                <p className="preserve-original-text notranslate">{scheme?.category || 'Loading...'}</p>
              </>
            )}
          </div>
          <div className="chat-status">
            <div className="status-indicator online"></div>
            <span>AI Assistant Online</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
