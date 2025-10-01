import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { apiService } from '../../services/api';
import ChatHeader from '../../components/chat/ChatHeader';
import ChatMessages from '../../components/chat/ChatMessages';
import ChatInput from '../../components/chat/ChatInput';
import FAQSidebar from '../../components/chat/FAQSidebar';
import Footer from '../../components/common/Footer';
import './ChatInterface.css';

const ChatInterface = () => {
  const { schemeId } = useParams();
  const [scheme, setScheme] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // FAQs for scheme-specific chat
  const [faqs, setFaqs] = useState([]);

  // Load FAQs for scheme-specific chat
  useEffect(() => {
    if (schemeId) {
      // For scheme-specific chat, use basic FAQs
      setFaqs([
        "What are the eligibility criteria?",
        "What are the benefits?",
        "How can I apply?",
        "What documents are required?",
        "What is the application process?",
        "Is there any application fee?"
      ]);
    }
  }, [schemeId]);

  const fetchSchemeDetails = useCallback(async () => {
    try {
      const response = await apiService.schemes.getById(schemeId);
      setScheme(response.data.scheme);
    } catch (error) {
      console.error('Error fetching scheme details:', error);
    }
  }, [schemeId]);

  const initializeChat = useCallback(() => {
    const welcomeMessage = {
      id: Date.now(),
      type: 'bot',
      content: schemeId 
        ? 'Hello! I am your scheme assistant. You can ask questions about this scheme - eligibility, benefits, application process, required documents, and more.'
        : 'Hello! I can help you with questions about any government scheme. You can ask about eligibility, benefits, application processes, or specific schemes you\'re interested in. I have access to information from multiple government schemes and can provide comprehensive answers.',
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, [schemeId]);

  useEffect(() => {
    if (schemeId) {
      fetchSchemeDetails();
      initializeChat();
    } else {
      // For general chat, initialize immediately
      initializeChat();
    }
  }, [schemeId, fetchSchemeDetails, initializeChat]);

  useEffect(() => {
    // Only scroll to bottom when new messages are added and auto-scroll is enabled
    if (messages.length > 0 && shouldAutoScroll) {
      scrollToBottom();
    }
  }, [messages.length, shouldAutoScroll]);

  // Check if user has scrolled up manually
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShouldAutoScroll(isNearBottom);
    }
  };

  // Predefined answers for FAQ questions
  const getPredefinedAnswer = (question) => {
    const answers = {
      "What is the use of this app?": `🤖 **Government Schemes Q&A Assistant**

This app is an AI-powered assistant that helps citizens get instant answers about government schemes. Here's what it does:

• **Instant Information**: Get quick answers about eligibility, benefits, application processes, and requirements for any government scheme
• **Smart Search**: Our AI searches through official government documents and scheme details to provide accurate information
• **Cross-Scheme Support**: Ask questions about any government scheme, not just one specific scheme
• **Source Attribution**: See exactly which documents and schemes your answers come from
• **24/7 Availability**: Get help anytime without visiting government offices

Whether you're looking for information about education, healthcare, agriculture, or any other sector schemes, our AI assistant can help you understand the details quickly and accurately.`,

      "How to use this chat?": `💡 **How to Use This Chat**

Using this AI assistant is simple and straightforward:

**1. Ask Questions Naturally**
• Type your questions in plain language
• Examples: "What are the benefits of PM Kisan?", "How to apply for Ayushman Bharat?", "What documents do I need for student loan?"

**2. Get Detailed Answers**
• Our AI will search through government documents
• You'll receive comprehensive answers with sources
• Information comes from official scheme documents

**3. Explore Different Schemes**
• Ask about any government scheme
• Compare different schemes
• Get specific details about eligibility, benefits, and processes

**4. Use the FAQ Sidebar**
• Click on common questions to get started quickly
• Each question will give you detailed information

**Tips for Better Results:**
• Be specific about what you want to know
• Mention the scheme name if you know it
• Ask follow-up questions for more details`,

      "What schemes are available?": {
        type: "special",
        message: "🏛️ We have information about various government schemes across different sectors. To browse all available schemes by category and get comprehensive details, please visit our Home Page.",
        action: "homepage"
      },

      "What can I ask about government schemes?": `❓ **What You Can Ask About Government Schemes**

You can ask me about almost anything related to government schemes:

**📋 Eligibility & Requirements**
• "Who is eligible for this scheme?"
• "What are the age requirements?"
• "What income criteria apply?"

**💰 Benefits & Financial Support**
• "What benefits does this scheme provide?"
• "How much financial assistance is available?"
• "What are the monetary benefits?"

**📝 Application Process**
• "How do I apply for this scheme?"
• "What is the application procedure?"
• "Where can I submit my application?"

**📄 Required Documents**
• "What documents do I need?"
• "What certificates are required?"
• "What proof of identity is needed?"

**⏰ Deadlines & Timelines**
• "What is the application deadline?"
• "How long does approval take?"
• "When are benefits disbursed?"

**🔍 Scheme Details**
• "What is this scheme about?"
• "Who can benefit from this scheme?"
• "What are the key features?"

Just ask naturally - I'll understand and provide detailed answers!`,

      "How does the AI assistant work?": `🧠 **How Our AI Assistant Works**

Our AI assistant uses advanced technology to provide accurate information about government schemes:

**🔍 Smart Document Search**
• Searches through official government documents and scheme details
• Uses semantic search to find relevant information
• Analyzes PDF documents, official websites, and scheme guidelines

**🤖 Natural Language Processing**
• Understands questions in plain language
• Processes complex queries about eligibility, benefits, and processes
• Provides human-like responses

**📚 Knowledge Base**
• Trained on official government scheme documents
• Continuously updated with new scheme information
• Cross-references multiple sources for accuracy

**🎯 Context-Aware Responses**
• Understands the context of your questions
• Provides relevant information based on your specific needs
• Can handle follow-up questions and clarifications

**🔗 Source Attribution**
• Shows which documents your answers come from
• Provides confidence scores for information accuracy
• Links to official sources when available

**⚡ Real-Time Processing**
• Processes your questions instantly
• Searches through thousands of documents in seconds
• Provides comprehensive answers quickly

This ensures you get accurate, up-to-date information from official sources!`,

      "What information can I get about schemes?": `📊 **Information Available About Government Schemes**

You can get comprehensive information about any government scheme:

**📋 Basic Scheme Information**
• Scheme name, purpose, and objectives
• Target beneficiaries and eligibility criteria
• Benefits and financial assistance details
• Scheme duration and validity

**📝 Application Details**
• Step-by-step application process
• Required documents and certificates
• Application forms and procedures
• Submission deadlines and timelines

**💰 Financial Information**
• Monetary benefits and assistance amounts
• Payment schedules and disbursement methods
• Budget allocation and funding details
• Cost-sharing arrangements

**🏛️ Administrative Details**
• Implementing agencies and departments
• Contact information and helpline numbers
• Grievance redressal mechanisms
• Monitoring and evaluation processes

**📈 Performance Data**
• Scheme performance metrics
• Success stories and case studies
• Impact assessment reports
• Beneficiary statistics

**🔗 Related Information**
• Similar schemes and alternatives
• Complementary programs
• Updates and modifications
• Succession plans

All information comes from official government sources and is regularly updated for accuracy!`
    };

    return answers[question] || null;
  };

  const sendMessage = async (messageText = inputMessage) => {
    // Ensure messageText is a string and not empty
    const text = typeof messageText === 'string' ? messageText : inputMessage;
    if (!text || !text.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    // Enable auto-scroll when user sends a message
    setShouldAutoScroll(true);

    // Check if this is a predefined FAQ question
    const predefinedAnswer = getPredefinedAnswer(text);
    if (predefinedAnswer) {
      if (typeof predefinedAnswer === 'object' && predefinedAnswer.type === 'special') {
        // Handle special cases with actions
        const botMessage = {
          id: Date.now() + 1,
          type: 'bot',
          content: predefinedAnswer.message,
          action: predefinedAnswer.action,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
        setIsLoading(false);
        return;
      } else {
        // Handle regular predefined answers
        const botMessage = {
          id: Date.now() + 1,
          type: 'bot',
          content: predefinedAnswer,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
        setIsLoading(false);
        return;
      }
    }

    try {
      const response = await apiService.chat.askQuestion({
        message: text,
        schemeId: schemeId
      });

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response.data.response,
        references: response.data.references || [],
        sources: response.data.sources || [],
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'Sorry, I could not understand your question. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendFAQ = (faq) => {
    sendMessage(faq);
  };

  const scrollToBottom = () => {
    // Use a small delay to ensure DOM is updated
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };


  return (
    <div className="chat-interface">
      {/* Header */}
      <ChatHeader scheme={scheme} isGeneralChat={!schemeId} />

      {/* Chat Container */}
      <div className="chat-container">
        <div className="container">
          <div className="chat-layout">
            {/* FAQs Sidebar */}
            <FAQSidebar 
              faqs={faqs}
              onFAQClick={sendFAQ}
              isGeneralChat={!schemeId}
            />

            {/* Chat Area */}
            <div className="chat-area">
              <ChatMessages 
                messages={messages}
                isLoading={isLoading}
                onScroll={handleScroll}
                messagesContainerRef={messagesContainerRef}
              />
              <div ref={messagesEndRef} />

              {/* Input Area */}
              <ChatInput 
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onSend={sendMessage}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default ChatInterface;