import React from 'react';
import './FAQSidebar.css';

const FAQSidebar = ({ faqs, onFAQClick, isGeneralChat = false }) => {

  return (
    <div className="faqs-sidebar">
      {isGeneralChat ? (
        <>
          <h3>Frequently Asked Questions</h3>
          <p>Click any question to get AI answers</p>
          <div className="faq-list">
            <button
              onClick={() => onFAQClick("What is the use of this app?")}
              className="faq-button"
            >
              What is the use of this app?
            </button>
            <button
              onClick={() => onFAQClick("How to use this chat?")}
              className="faq-button"
            >
              How to use this chat?
            </button>
            <button
              onClick={() => onFAQClick("What schemes are available?")}
              className="faq-button"
            >
              What schemes are available?
            </button>
            <button
              onClick={() => onFAQClick("What can I ask about government schemes?")}
              className="faq-button"
            >
              What can I ask about government schemes?
            </button>
            <button
              onClick={() => onFAQClick("How does the AI assistant work?")}
              className="faq-button"
            >
              How does the AI assistant work?
            </button>
            <button
              onClick={() => onFAQClick("What information can I get about schemes?")}
              className="faq-button"
            >
              What information can I get about schemes?
            </button>
          </div>
        </>
      ) : (
        <>
          <h3>Frequently Asked Questions</h3>
          <p>Click any question to get started</p>
          <div className="faq-list">
            {faqs.map((faq, index) => (
              <button
                key={index}
                onClick={() => onFAQClick(faq)}
                className="faq-button"
              >
                {faq}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default FAQSidebar;
