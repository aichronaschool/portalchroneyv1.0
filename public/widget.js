// Widget version 2.1 - Mobile responsive with adaptive sizing
(function() {
  'use strict';
  
  console.log('[Hi Chroney Widget] Version 2.1 - Mobile responsive! 📱');
  
  const HiChroneyWidget = {
    init: async function(config) {
      if (!config || !config.businessAccountId) {
        console.error('[Hi Chroney] businessAccountId is required');
        return;
      }

      // Fetch widget settings from API to get latest colors
      const baseUrl = this.getBaseUrl();
      try {
        const response = await fetch(`${baseUrl}/api/widget-settings/public?businessAccountId=${encodeURIComponent(config.businessAccountId)}`);
        if (response.ok) {
          const settings = await response.json();
          console.log('[Hi Chroney] Loaded settings:', settings);
          this.config = {
            businessAccountId: config.businessAccountId,
            chatColor: settings.chatColor || '#9333ea',
            chatColorEnd: settings.chatColorEnd || '#3b82f6',
            buttonStyle: settings.buttonStyle || 'circular',
            buttonAnimation: settings.buttonAnimation || 'bounce',
            welcomeMessageType: settings.welcomeMessageType || 'ai_generated',
            widgetHeaderText: settings.widgetHeaderText || 'Hi Chroney',
            widgetWidth: settings.widgetWidth || '400',
            widgetHeight: settings.widgetHeight || '600',
            widgetPosition: settings.widgetPosition || 'bottom-right',
            bubbleSize: settings.bubbleSize || '60',
            autoOpenChat: settings.autoOpenChat || 'false'
          };
          console.log('[Hi Chroney] Button will use colors:', this.config.chatColor, this.config.chatColorEnd);
          console.log('[Hi Chroney] Widget size:', this.config.widgetWidth, 'x', this.config.widgetHeight);
        } else {
          // Fallback to config values if API fails
          this.config = {
            businessAccountId: config.businessAccountId,
            chatColor: config.chatColor || '#9333ea',
            chatColorEnd: config.chatColorEnd || '#3b82f6',
            buttonStyle: config.buttonStyle || 'circular',
            buttonAnimation: config.buttonAnimation || 'bounce',
            welcomeMessageType: config.welcomeMessageType || 'ai_generated',
            widgetWidth: config.widgetWidth || '400',
            widgetHeight: config.widgetHeight || '600',
            widgetPosition: config.widgetPosition || 'bottom-right',
            bubbleSize: config.bubbleSize || '60',
            autoOpenChat: config.autoOpenChat || 'false'
          };
        }
      } catch (error) {
        console.warn('[Hi Chroney] Failed to fetch settings, using defaults:', error);
        this.config = {
          businessAccountId: config.businessAccountId,
          chatColor: config.chatColor || '#9333ea',
          chatColorEnd: config.chatColorEnd || '#3b82f6',
          buttonStyle: config.buttonStyle || 'circular',
          buttonAnimation: config.buttonAnimation || 'bounce',
          welcomeMessageType: config.welcomeMessageType || 'ai_generated',
          widgetWidth: config.widgetWidth || '400',
          widgetHeight: config.widgetHeight || '600',
          widgetPosition: config.widgetPosition || 'bottom-right',
          bubbleSize: config.bubbleSize || '60',
          autoOpenChat: config.autoOpenChat || 'false'
        };
      }

      this.createWidget();
    },

    getBaseUrl: function() {
      const scripts = document.getElementsByTagName('script');
      for (let i = 0; i < scripts.length; i++) {
        const src = scripts[i].src;
        if (src && src.includes('/widget.js')) {
          try {
            const url = new URL(src);
            return `${url.protocol}//${url.host}`;
          } catch (e) {
            console.error('[Hi Chroney] Failed to parse script URL:', e);
          }
        }
      }
      return window.location.origin;
    },

    createWidget: function() {
      const baseUrl = this.getBaseUrl();
      
      // Parse position and size settings
      const position = this.config.widgetPosition || 'bottom-right';
      const [verticalPos, horizontalPos] = position.split('-');
      const bubbleSize = parseInt(this.config.bubbleSize, 10) || 60;
      
      // Set position styles based on configuration
      // For top position: 20px (button offset) + bubbleSize + 20px (gap) = bubbleSize + 40
      // For bottom position: same calculation for symmetry
      const positionStyles = {
        vertical: verticalPos === 'top' ? 'top: 20px;' : 'bottom: 20px;',
        horizontal: horizontalPos === 'right' ? 'right: 20px;' : 'left: 20px;',
        iframeVertical: verticalPos === 'top' ? `top: ${bubbleSize + 40}px;` : `bottom: ${bubbleSize + 40}px;`,
        iframeHorizontal: horizontalPos === 'right' ? 'right: 20px;' : 'left: 20px;'
      };
      
      // Add responsive styles to head
      const responsiveStyles = document.createElement('style');
      responsiveStyles.textContent = `
        /* Desktop styles */
        #hichroney-widget-container {
          position: fixed;
          ${positionStyles.vertical}
          ${positionStyles.horizontal}
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        #hichroney-widget-iframe {
          display: none;
          position: fixed;
          ${positionStyles.iframeVertical}
          ${positionStyles.iframeHorizontal}
          width: ${this.config.widgetWidth}px;
          height: min(${this.config.widgetHeight}px, calc(100vh - ${bubbleSize + 80}px));
          max-height: calc(100vh - ${bubbleSize + 80}px);
          border: none;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          z-index: 999998;
        }
        
        /* Tablet styles - respect configured size with responsive constraints */
        @media (max-width: 768px) {
          #hichroney-widget-iframe {
            width: min(${this.config.widgetWidth}px, calc(100vw - 20px));
            max-width: calc(100vw - 20px);
            max-height: calc(100vh - ${bubbleSize + 60}px);
            ${horizontalPos === 'right' ? 'right: 10px;' : 'left: 10px;'}
            ${verticalPos === 'bottom' ? `bottom: ${bubbleSize + 30}px;` : `top: ${bubbleSize + 30}px;`}
          }
          
          #hichroney-widget-container {
            ${horizontalPos === 'right' ? 'right: 10px;' : 'left: 10px;'}
            ${verticalPos === 'bottom' ? 'bottom: 10px;' : 'top: 10px;'}
          }
        }
        
        /* Mobile styles - respect configured size with mobile-friendly constraints */
        @media (max-width: 480px) {
          #hichroney-widget-iframe {
            width: min(${this.config.widgetWidth}px, calc(100vw - 20px));
            height: min(${this.config.widgetHeight}px, calc(100vh - ${bubbleSize + 30}px));
            max-width: calc(100vw - 20px);
            max-height: calc(100vh - ${bubbleSize + 30}px);
            ${horizontalPos === 'right' ? 'right: 10px;' : 'left: 10px;'}
            ${verticalPos === 'bottom' ? `bottom: ${bubbleSize + 10}px;` : `top: ${bubbleSize + 10}px;`}
            border-radius: 8px;
          }
          
          #hichroney-widget-container {
            ${horizontalPos === 'right' ? 'right: 10px;' : 'left: 10px;'}
            ${verticalPos === 'bottom' ? 'bottom: 10px;' : 'top: 10px;'}
          }
          
          #hichroney-widget-button {
            width: 56px !important;
            height: 56px !important;
          }
          
          #hichroney-widget-button.pill-style {
            padding: 0 16px !important;
            height: 48px !important;
          }
        }
      `;
      document.head.appendChild(responsiveStyles);
      
      // Create container
      const container = document.createElement('div');
      container.id = 'hichroney-widget-container';

      // Create iframe for the chat widget
      const iframe = document.createElement('iframe');
      iframe.id = 'hichroney-widget-iframe';
      
      // Build iframe URL with config
      const iframeUrl = new URL(`${baseUrl}/widget/chat`);
      iframeUrl.searchParams.set('businessAccountId', this.config.businessAccountId);
      iframeUrl.searchParams.set('chatColor', this.config.chatColor);
      iframeUrl.searchParams.set('chatColorEnd', this.config.chatColorEnd);
      iframeUrl.searchParams.set('buttonStyle', this.config.buttonStyle);
      iframeUrl.searchParams.set('buttonAnimation', this.config.buttonAnimation);
      iframeUrl.searchParams.set('welcomeMessageType', this.config.welcomeMessageType);
      
      iframe.src = iframeUrl.toString();

      // Create chat button
      const button = document.createElement('button');
      button.id = 'hichroney-widget-button';
      button.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      `;
      
      const gradientStyle = `linear-gradient(135deg, ${this.config.chatColor}, ${this.config.chatColorEnd})`;
      
      // Normalize settings to lowercase to handle case sensitivity from API
      const buttonStyle = (this.config.buttonStyle || 'circular').toLowerCase().trim();
      const buttonAnimation = (this.config.buttonAnimation || 'bounce').toLowerCase().trim();
      
      // Map button styles to border-radius and size
      let buttonStyles = {};
      switch (buttonStyle) {
        case 'circular':
          buttonStyles = { borderRadius: '50%', width: `${bubbleSize}px`, height: `${bubbleSize}px`, padding: '0' };
          break;
        case 'rounded':
          buttonStyles = { borderRadius: '16px', width: `${bubbleSize}px`, height: `${bubbleSize}px`, padding: '0' };
          break;
        case 'pill':
          const pillHeight = Math.floor(bubbleSize * 0.85);
          buttonStyles = { borderRadius: `${Math.floor(bubbleSize / 2)}px`, width: 'auto', height: `${pillHeight}px`, padding: '0 20px' };
          break;
        case 'minimal':
          buttonStyles = { borderRadius: '8px', width: `${Math.floor(bubbleSize * 0.93)}px`, height: `${Math.floor(bubbleSize * 0.93)}px`, padding: '0' };
          break;
        default:
          buttonStyles = { borderRadius: '50%', width: `${bubbleSize}px`, height: `${bubbleSize}px`, padding: '0' };
      }
      
      // Map animations to CSS animation property
      let animationStyle = '';
      let transitionStyle = 'transition: transform 0.2s, box-shadow 0.2s;';
      switch (buttonAnimation) {
        case 'bounce':
          animationStyle = 'animation: hichroney-bounce 2s ease-in-out infinite;';
          break;
        case 'none':
        default:
          animationStyle = '';
      }
      
      console.log('[Hi Chroney Widget] Button style:', buttonStyle, 'Animation:', buttonAnimation);
      
      button.style.cssText = `
        width: ${buttonStyles.width};
        height: ${buttonStyles.height};
        padding: ${buttonStyles.padding};
        border-radius: ${buttonStyles.borderRadius};
        background: ${gradientStyle};
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        ${transitionStyle}
        ${animationStyle}
      `;

      // Add class for pill style to enable responsive styling
      if (buttonStyle === 'pill') {
        button.classList.add('pill-style');
        button.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span style="font-size: 14px; font-weight: 500;">Chat</span>
        `;
      }

      // Add animations CSS
      const style = document.createElement('style');
      style.textContent = `
        @keyframes hichroney-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `;
      document.head.appendChild(style);

      // Button hover effect
      button.addEventListener('mouseenter', () => {
        button.style.transform = 'scale(1.05)';
        button.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
      });
      button.addEventListener('mouseleave', () => {
        button.style.transform = 'scale(1)';
        button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      });

      // Toggle widget - Handle auto-open setting and remember user preference during session
      const storageKey = `hichroney-chat-closed-${this.config.businessAccountId}`;
      
      // Check if user closed the chat in this session
      const wasClosed = sessionStorage.getItem(storageKey) === 'true';
      
      // Determine initial state:
      // 1. If user explicitly closed it this session, keep it closed
      // 2. Otherwise, respect autoOpenChat setting (default is false)
      let isOpen = wasClosed ? false : (this.config.autoOpenChat === 'true');
      
      // Set initial state based on configuration
      iframe.style.display = isOpen ? 'block' : 'none';
      
      if (isOpen && this.config.autoOpenChat === 'true') {
        console.log('[Hi Chroney] Auto-opened chat on page load');
      }
      
      // Set initial button icon based on state
      if (buttonStyle === 'pill') {
        button.innerHTML = isOpen ?
          `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          <span style="font-size: 14px; font-weight: 500;">Close</span>` :
          `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span style="font-size: 14px; font-weight: 500;">Chat</span>`;
      } else {
        button.innerHTML = isOpen ?
          `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>` :
          `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>`;
      }
      
      button.addEventListener('click', () => {
        isOpen = !isOpen;
        iframe.style.display = isOpen ? 'block' : 'none';
        
        // Remember user preference in session storage
        if (isOpen) {
          // User opened the chat - remove the flag so it stays open on refresh
          sessionStorage.removeItem(storageKey);
        } else {
          // User closed the chat - remember this for the session
          sessionStorage.setItem(storageKey, 'true');
        }
        
        // Update button icon based on style
        if (buttonStyle === 'pill') {
          button.innerHTML = isOpen ?
            `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            <span style="font-size: 14px; font-weight: 500;">Close</span>` :
            `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span style="font-size: 14px; font-weight: 500;">Chat</span>`;
        } else {
          button.innerHTML = isOpen ? 
            `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>` :
            `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>`;
        }
      });

      // Append elements
      container.appendChild(button);
      document.body.appendChild(container);
      document.body.appendChild(iframe);
    }
  };

  // Auto-initialize if data-config attribute exists
  window.addEventListener('DOMContentLoaded', function() {
    const script = document.querySelector('script[data-config]');
    if (script) {
      try {
        const config = JSON.parse(script.getAttribute('data-config'));
        HiChroneyWidget.init(config);
      } catch (e) {
        console.error('[Hi Chroney] Failed to parse widget config:', e);
      }
    }
  });

  // Expose to global scope
  window.HiChroneyWidget = HiChroneyWidget;
})();
