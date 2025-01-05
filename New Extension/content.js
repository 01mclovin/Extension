const generateAnonymousId = () => {
  return 'user_' + Math.random().toString(36).substr(2, 9);
};

let sessionId = sessionStorage.getItem('anonymous_session_id');
if (!sessionId) {
  sessionId = 'session_' + Math.random().toString(36).substr(2, 9);
  sessionStorage.setItem('anonymous_session_id', sessionId);
}

console.log('Extension loaded on page:', window.location.href);

function extractShopeeData(element) {
  console.log('Attempting to extract data from element:', element);

  // Get nearest product container
  const productContainer = element.closest('[data-sqe="item"]') || 
                         element.closest('.product-briefing') ||
                         element.closest('.product-detail');

  if (!productContainer) {
    console.log('No product container found');
    return null;
  }

  console.log('Found product container:', productContainer);

  // Extract price
  const priceElement = productContainer.querySelector('[data-price]') || 
                      productContainer.querySelector('.price');
  let price = priceElement ? priceElement.textContent.replace(/[^0-9.]/g, '') : '';
  console.log('Extracted price:', price);

  // Extract product ID
  const productId = window.location.pathname.match(/i\/(\d+)/) ? 
                   window.location.pathname.match(/i\/(\d+)/)[1] : 
                   productContainer.dataset.itemid;
  console.log('Extracted product ID:', productId);

  const data = {
    event_time: new Date().toISOString(),
    product_id: hashString(productId || ''),
    category_id: hashString(document.querySelector('.shopee-category-list')?.textContent || ''),
    category_code: document.querySelector('.shopee-category-list')?.textContent.toLowerCase().replace(/\s+/g, '_') || '',
    brand: hashString(productContainer.querySelector('.brand-link')?.textContent || ''),
    price: price,
    user_id: generateAnonymousId(),
    user_session: sessionId
  };

  console.log('Extracted data:', data);
  return data;
}

// Click event listeners
document.addEventListener('click', (event) => {
  console.log('Click detected on element:', event.target);

  // Product view
  if (event.target.closest('[data-sqe="item"]') || 
      event.target.closest('.product-briefing')) {
    console.log('Product view detected');
    const data = extractShopeeData(event.target);
    if (data) {
      data.event_type = 'view';
      console.log('Sending product view data:', data);
      chrome.runtime.sendMessage({ type: 'SAVE_EVENT', data });
    }
  }

  // Updated Add to Cart detection - multiple possible selectors
  const cartButton = event.target.closest([
    'button[type="button"]:not([disabled])',  // Generic button
    '.shopee-button-solid',                   // Shopee button class
    '.btn-solid-primary',                     // Another Shopee button class
    '[data-sqe="add-to-cart"]',              // Data attribute
    '.add-to-cart',                          // Generic cart class
    '.btn--l',                               // Large button class used by Shopee
    '.btn--inline',                          // Inline button class
    '.btn-tinted',                           // Old cart button class
    'button:contains("Add to Cart")',        // Text-based detection
    'button:contains("ADD TO CART")',        // Uppercase variant
    '.add-to-cart-button',                   // Generic cart button class
  ].join(','));

  if (cartButton) {
    // Additional check to confirm it's really an add to cart button
    const buttonText = cartButton.textContent.toLowerCase();
    if (buttonText.includes('add to cart') || 
        buttonText.includes('add to basket') ||
        buttonText.includes('buy now')) {
      console.log('Add to cart detected on button:', cartButton);
      const data = extractShopeeData(cartButton);
      if (data) {
        data.event_type = 'cart';
        console.log('Sending add to cart data:', data);
        chrome.runtime.sendMessage({ type: 'SAVE_EVENT', data });
      }
    }
  }

  // Purchase
  if (event.target.closest('.shopee-button-solid--primary') && 
      window.location.href.includes('/checkout')) {
    console.log('Purchase attempt detected');
    const data = extractShopeeData(event.target);
    if (data) {
      data.event_type = 'purchase';
      console.log('Sending purchase data:', data);
      chrome.runtime.sendMessage({ type: 'SAVE_EVENT', data });
    }
  }
});

// Add mutation observer for dynamic cart buttons
const cartObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          // Check for dynamically added cart buttons
          const cartButtons = node.querySelectorAll([
            'button[type="button"]:not([disabled])',
            '.shopee-button-solid',
            '.btn-solid-primary',
            '[data-sqe="add-to-cart"]',
            '.add-to-cart',
            '.btn--l',
            '.btn--inline',
            '.btn-tinted',
            'button:contains("Add to Cart")',
            'button:contains("ADD TO CART")',
            '.add-to-cart-button'
          ].join(','));

          cartButtons.forEach((button) => {
            if (!button.dataset.cartTracking) {
              button.dataset.cartTracking = 'true';
              button.addEventListener('click', (event) => {
                console.log('Cart button clicked via mutation observer');
                const data = extractShopeeData(button);
                if (data) {
                  data.event_type = 'cart';
                  console.log('Sending add to cart data from mutation:', data);
                  chrome.runtime.sendMessage({ type: 'SAVE_EVENT', data });
                }
              });
            }
          });
        }
      });
    }
  });
});

cartObserver.observe(document.body, {
  childList: true,
  subtree: true
});

// Add extra debug logging
console.log('Cart tracking initialized');