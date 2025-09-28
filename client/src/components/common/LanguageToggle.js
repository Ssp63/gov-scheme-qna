import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import engImage from '../../assets/eng.png';
import marImage from '../../assets/mar.png';
import { handleLanguageToggle, initializeTextPreservation } from '../../utils/textPreservation';
import './LanguageToggle.css';

const LanguageToggle = () => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isTranslating, setIsTranslating] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Initialize text preservation system
    const observer = initializeTextPreservation();
    
    // Check initial language state
    const checkInitialLanguage = () => {
      const body = document.body;
      if (body.classList.contains('translated-ltr') || body.classList.contains('translated-rtl')) {
        setCurrentLanguage('mr');
      } else {
        setCurrentLanguage('en');
      }
    };

    // Check immediately and after a short delay to ensure Google Translate has loaded
    checkInitialLanguage();
    const timeoutId = setTimeout(checkInitialLanguage, 500);

    return () => {
      clearTimeout(timeoutId);
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  // Reset translation state on navigation
  useEffect(() => {
    // Reset translating state when location changes
    setIsTranslating(false);
  }, [location.pathname]);

  // Cleanup effect to reset state on unmount
  useEffect(() => {
    return () => {
      // Reset translation state when component unmounts
      setIsTranslating(false);
    };
  }, []);


  const toggleLanguage = () => {
    if (isTranslating) return;

    setIsTranslating(true);
    const targetLanguage = currentLanguage === 'en' ? 'mr' : 'en';
    
    // Safety timeout to prevent stuck loading state
    const safetyTimeout = setTimeout(() => {
      console.warn('Translation timeout - resetting state');
      setIsTranslating(false);
    }, 5000); // 5 second timeout
    
    try {
      // Use utility function to handle text preservation
      handleLanguageToggle(targetLanguage);

      // Wait for Google Translate to be ready
      const waitForGoogleTranslate = (maxAttempts = 10) => {
        return new Promise((resolve, reject) => {
          let attempts = 0;
          
          const checkForTranslate = () => {
            const translateSelect = document.querySelector('.goog-te-combo');
            
            if (translateSelect) {
              resolve(translateSelect);
            } else if (attempts < maxAttempts) {
              attempts++;
              setTimeout(checkForTranslate, 100);
            } else {
              reject(new Error('Google Translate not available'));
            }
          };
          
          checkForTranslate();
        });
      };

      waitForGoogleTranslate()
        .then((translateSelect) => {
          // Clear safety timeout
          clearTimeout(safetyTimeout);
          
          // Set the target language and trigger change
          translateSelect.value = targetLanguage;
          translateSelect.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Update our state
          setCurrentLanguage(targetLanguage);
          
          // Reset translating state after a short delay
          setTimeout(() => {
            setIsTranslating(false);
          }, 1000);
        })
        .catch(() => {
          // Clear safety timeout
          clearTimeout(safetyTimeout);
          
          // Fallback: Force page reload with language parameter
          // This ensures Google Translate works properly in SPA
          const url = new URL(window.location);
          url.searchParams.set('hl', targetLanguage);
          window.location.href = url.toString();
        });
    } catch (error) {
      // Clear safety timeout
      clearTimeout(safetyTimeout);
      
      console.error('Error toggling language:', error);
      setIsTranslating(false);
    }
  };

  const getLanguageImage = () => {
    return currentLanguage === 'mr' ? marImage : engImage;
  };

  const getImageAlt = () => {
    return currentLanguage === 'en' ? 'English' : 'Marathi';
  };

  return (
    <div className="language-toggle-container">
      {/* Hidden Google Translate Element */}
      <div id="google_translate_element" style={{ display: 'none' }}></div>
      
      <button
        className={`language-toggle-btn ${isTranslating ? 'translating' : ''}`}
        onClick={toggleLanguage}
        disabled={isTranslating}
        title={`Switch to ${currentLanguage === 'en' ? 'Marathi' : 'English'}`}
      >
        <div className="language-icon">
          <img 
            src={getLanguageImage()} 
            alt={getImageAlt()}
            className="language-image"
            key={currentLanguage}
          />
        </div>
        {isTranslating && (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        )}
      </button>
    </div>
  );
};

export default LanguageToggle;
