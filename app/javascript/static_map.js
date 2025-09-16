// Static map interaction functionality

// Modal functionality
async function showSiteModal(siteId) {
  const modal = document.getElementById('site-modal');
  const modalContent = document.getElementById('modal-site-content');

  if (!modal || !modalContent) {
    console.error('Modal elements not found');
    return;
  }

  // Show loading state first
  modalContent.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
  modal.style.display = 'flex';

  try {
    // Fetch site content
    const response = await fetch(`/modal/houses/${siteId}`);
    const html = await response.text();
    modalContent.innerHTML = html;
  } catch (error) {
    console.error('Error loading site details:', error);
    modalContent.innerHTML = '<div class="error-message">Error loading site details. Please try again.</div>';
  }
}

function closeSiteModal() {
  const modal = document.getElementById('site-modal');

  if (modal) {
    modal.style.display = 'none';
  }
}

// Make functions available globally
window.showSiteModal = showSiteModal;
window.closeSiteModal = closeSiteModal;

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeSiteModal();
  }
});

// Add event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Close button event listener
  const closeButton = document.querySelector('.modal-close');
  if (closeButton) {
    closeButton.addEventListener('click', closeSiteModal);
  }

  // Backdrop click event listener
  const backdrop = document.querySelector('.modal-backdrop-map');
  if (backdrop) {
    backdrop.addEventListener('click', closeSiteModal);
  }

  // Add click handlers to map marker overlays
  const markerOverlays = document.querySelectorAll('.marker-overlay');
  markerOverlays.forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      e.preventDefault();
      const siteId = overlay.dataset.siteId;
      if (siteId) {
        showSiteModal(siteId);
      }
    });
  });

  // Handle sidebar smooth scrolling to anchored items
  const siteLinks = document.querySelectorAll('a[href^="#site-"]');
  siteLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});

// Also add listeners on turbo:load for Turbo navigation
document.addEventListener('turbo:load', () => {
  // Close button event listener
  const closeButton = document.querySelector('.modal-close');
  if (closeButton) {
    closeButton.addEventListener('click', closeSiteModal);
  }

  // Backdrop click event listener
  const backdrop = document.querySelector('.modal-backdrop-map');
  if (backdrop) {
    backdrop.addEventListener('click', closeSiteModal);
  }

  // Add click handlers to map marker overlays
  const markerOverlays = document.querySelectorAll('.marker-overlay');
  markerOverlays.forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      e.preventDefault();
      const siteId = overlay.dataset.siteId;
      if (siteId) {
        showSiteModal(siteId);
      }
    });
  });
});