import React from 'react';
import { useNavigate } from 'react-router-dom';
import AIServiceCard from '../../components/admin/AIServiceCard';
import './AIServices.css';

// Import the images
import geminiLogo from '../../assets/geminiai.png';
import gptLogo from '../../assets/gptlogo.png';

// AI Service Icons - Using actual logos
const GeminiIcon = () => (
  <img 
    src={geminiLogo} 
    alt="Google Gemini AI" 
    style={{ width: '24px', height: '24px', objectFit: 'contain' }}
  />
);

const AzureIcon = () => (
  <img 
    src={gptLogo} 
    alt="Azure OpenAI" 
    style={{ width: '24px', height: '24px', objectFit: 'contain' }}
  />
);

const TranslatorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M2 12h20"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

const NLPIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14,2 14,8 20,8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10,9 9,9 8,9"/>
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
  </svg>
);

const BackIcon = () => (
  <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const AIServices = () => {
  const navigate = useNavigate();

  const aiServices = [
    {
      id: 'gemini',
      name: 'Google Gemini AI',
      description: 'Advanced conversational AI for intelligent responses and natural language understanding',
      icon: GeminiIcon,
      status: 'Active',
      color: '#4285f4',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      id: 'azure-openai',
      name: 'Azure OpenAI',
      description: 'Text embeddings and semantic search capabilities for document processing',
      icon: AzureIcon,
      status: 'Active',
      color: '#0078d4',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      id: 'translator',
      name: 'Azure Translator',
      description: 'Multi-language support enabling seamless English ↔ Marathi translation',
      icon: TranslatorIcon,
      status: 'Active',
      color: '#00bcf2',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      id: 'nlp',
      name: 'Natural Language Processing',
      description: 'Text preprocessing, tokenization, and intelligent document analysis',
      icon: NLPIcon,
      status: 'Active',
      color: '#ff6b6b',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      id: 'vector-search',
      name: 'Vector Search',
      description: 'Semantic similarity search powered by MongoDB Vector Search technology',
      icon: SearchIcon,
      status: 'Active',
      color: '#4ecdc4',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }
  ];

  return (
    <div className="ai-services-page">
      <div className="container">
        {/* Header */}
        <div className="ai-services-header">
          <button 
            className="back-button"
            onClick={() => navigate('/admin')}
          >
            <BackIcon />
            Back to Dashboard
          </button>
          
          <div className="header-content">
            <h1 className="page-title">AI Technologies</h1>
            <p className="page-subtitle">
              Discover the powerful AI services that power our government scheme platform
            </p>
          </div>
        </div>

        {/* Hero Section */}
        <div className="hero-section">
          <div className="hero-content">
            <h2 className="hero-title">
              Intelligent Government Services
            </h2>
            <p className="hero-description">
              Our platform leverages cutting-edge AI technologies to provide citizens with 
              accurate, multilingual, and context-aware responses about government schemes.
            </p>
          </div>
        </div>

        {/* AI Services Grid */}
        <div className="ai-services-grid">
          {aiServices.map((service, index) => (
            <AIServiceCard 
              key={service.id} 
              service={service} 
              index={index}
            />
          ))}
        </div>

        {/* Technology Overview */}
        <div className="technology-overview">
          <h3 className="overview-title">Technology Stack Overview</h3>
          <div className="overview-content">
            <div className="overview-item">
              <h4>Conversational AI</h4>
              <p>Google Gemini AI provides intelligent, context-aware responses to citizen queries</p>
            </div>
            <div className="overview-item">
              <h4>Semantic Search</h4>
              <p>Azure OpenAI embeddings enable precise document retrieval and similarity matching</p>
            </div>
            <div className="overview-item">
              <h4>Multilingual Support</h4>
              <p>Azure Translator ensures seamless communication in English and Marathi</p>
            </div>
            <div className="overview-item">
              <h4>Text Processing</h4>
              <p>Advanced NLP techniques for intelligent document analysis and preprocessing</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIServices;
