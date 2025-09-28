/**
 * Text Preservation Utility Functions
 * Handles original text preservation during Google Translate operations
 */

/**
 * Store original text content for elements that should preserve their text
 * @param {string} selector - CSS selector for elements to preserve
 */
export const storeOriginalText = (selector = '.preserve-original-text') => {
  const elements = document.querySelectorAll(selector);
  elements.forEach(element => {
    if (!element.hasAttribute('data-original-text')) {
      element.setAttribute('data-original-text', element.textContent.trim());
    }
  });
};

/**
 * Restore original text content for elements that have been translated
 * @param {string} selector - CSS selector for elements to restore
 */
export const restoreOriginalText = (selector = '.preserve-original-text') => {
  const elements = document.querySelectorAll(selector);
  elements.forEach(element => {
    const originalText = element.getAttribute('data-original-text');
    if (originalText && element.textContent.trim() !== originalText) {
      element.textContent = originalText;
    }
  });
};

/**
 * Check if text has been translated by comparing with original
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} - True if text has been translated
 */
export const isTextTranslated = (element) => {
  const originalText = element.getAttribute('data-original-text');
  if (!originalText) return false;
  
  return element.textContent.trim() !== originalText;
};

/**
 * Initialize text preservation for all elements on the page
 */
export const initializeTextPreservation = () => {
  // Store original text for all elements that should be preserved
  storeOriginalText();
  
  // Add event listeners for dynamic content
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const preserveElements = node.querySelectorAll('.preserve-original-text');
            preserveElements.forEach(element => {
              if (!element.hasAttribute('data-original-text')) {
                element.setAttribute('data-original-text', element.textContent.trim());
              }
            });
          }
        });
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  return observer;
};

/**
 * Handle language toggle with text preservation
 * @param {string} targetLanguage - Target language ('en' or 'mr')
 */
export const handleLanguageToggle = (targetLanguage) => {
  if (targetLanguage === 'mr') {
    // Store original text before translation
    storeOriginalText();
  } else if (targetLanguage === 'en') {
    // Restore original text when switching back to English
    setTimeout(() => {
      restoreOriginalText();
    }, 100);
  }
};

/**
 * Get current language state based on Google Translate classes
 * @returns {string} - Current language ('en' or 'mr')
 */
export const getCurrentLanguage = () => {
  const body = document.body;
  if (body.classList.contains('translated-ltr') || body.classList.contains('translated-rtl')) {
    return 'mr';
  }
  return 'en';
};

/**
 * Enhanced text preservation that works with React components
 * @param {string} text - Original text content
 * @param {string} className - CSS class name for the element
 * @returns {Object} - Props object for React element
 */
export const createPreservedTextProps = (text, className = '') => {
  return {
    className: `preserve-original-text notranslate ${className}`.trim(),
    'data-original-text': text,
    children: text
  };
};

/**
 * Utility to wrap text content with preservation attributes
 * @param {string} text - Text content to preserve
 * @param {string} tag - HTML tag name (default: 'span')
 * @param {string} className - Additional CSS classes
 * @returns {Object} - React element props
 */
export const wrapWithPreservation = (text, tag = 'span', className = '') => {
  return {
    tag,
    className: `preserve-original-text notranslate ${className}`.trim(),
    'data-original-text': text,
    children: text
  };
};
