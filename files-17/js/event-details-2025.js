/**
 * Améliorations d'interaction pour la page de détails d'événement
 * Design 2025 avec micro-interactions et meilleure UX
 */

document.addEventListener('DOMContentLoaded', function() {
  // Observer les changements dans le DOM pour détecter quand la modal s'ouvre
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        // Vérifier si un nœud modal a été ajouté au DOM
        if (node.id === 'eventDetailsModal' || 
            (node.classList && node.classList.contains('modal'))) {
          enhanceEventDetails();
        }
      });
    });
  });

  // Observer le document entier pour les changements
  observer.observe(document.body, { childList: true, subtree: true });

  // Vérifier si la modal est déjà présente (au cas où)
  if (document.getElementById('eventDetailsModal')) {
    enhanceEventDetails();
  }
});

// Fonction pour améliorer l'apparence et les interactions de la page de détails
function enhanceEventDetails() {
  // Ajouter des classes modernes au modal et à son contenu
  const modal = document.getElementById('eventDetailsModal');
  if (!modal) return;

  // Éviter d'améliorer la même modal plusieurs fois
  if (modal.classList.contains('enhanced-2025')) return;
  modal.classList.add('enhanced-2025');

  const modalContent = modal.querySelector('.modal-content');
  if (modalContent) {
    modalContent.classList.add('event-details-2025');
  }

  // Améliorer l'affichage de la catégorie
  const detailsContent = document.querySelector('.event-details');
  if (detailsContent) {
    // Vérifier si l'élément de catégorie existe déjà
    const existingCategory = detailsContent.querySelector('#eventCategory');
    if (!existingCategory) {
      // Créer un nouvel élément pour la catégorie
      const categoryEl = document.createElement('p');
      categoryEl.id = 'eventCategory';

      // Essayer de trouver les éléments existants où insérer la catégorie
      const dateEl = detailsContent.querySelector('#detailsDate').parentElement;
      const locationEl = detailsContent.querySelector('#detailsLocation').parentElement;

      if (dateEl && locationEl) {
        // Chercher la valeur de la catégorie (elle pourrait être dans différents éléments selon l'implémentation)
        let categoryName = "Non catégorisé";
        const categoryBadge = document.querySelector('.event-category-badge');
        
        if (categoryBadge) {
          const nameEl = categoryBadge.querySelector('.category-name');
          if (nameEl) categoryName = nameEl.textContent;
        }

        // Créer le contenu de l'élément catégorie
        categoryEl.innerHTML = `<i class="fas fa-folder"></i> <strong>Catégorie:</strong> <span id="detailsCategoryName">${categoryName}</span>`;
        
        // Insérer après l'emplacement
        locationEl.insertAdjacentElement('afterend', categoryEl);
      }
    }
  }

  // Ajouter des effets de transition aux onglets
  const tabButtons = modal.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const target = this.getAttribute('data-tab');
      animateTabTransition(target);
    });
  });

  // Améliorer le bouton d'inscription
  const registerBtn = document.getElementById('registerEventBtn');
  if (registerBtn) {
    registerBtn.classList.add('btn-modern');
    
    // Ajouter un effet d'onde au clic
    registerBtn.addEventListener('click', createRippleEffect);
  }

  // Améliorer les boutons de confirmation/annulation
  const confirmBtn = document.getElementById('confirmRegistrationBtn');
  const cancelBtn = document.getElementById('cancelRegistrationBtn');
  
  if (confirmBtn) {
    confirmBtn.classList.add('btn-modern');
    confirmBtn.addEventListener('click', createRippleEffect);
  }
  
  if (cancelBtn) {
    cancelBtn.classList.add('btn-secondary');
    cancelBtn.addEventListener('click', createRippleEffect);
  }

  // Ajouter des effets de survol aux éléments de détail
  const detailItems = detailsContent?.querySelectorAll('p');
  if (detailItems) {
    detailItems.forEach(item => {
      const icon = item.querySelector('i');
      if (icon) {
        item.addEventListener('mouseenter', function() {
          icon.style.transform = 'scale(1.2)';
        });
        item.addEventListener('mouseleave', function() {
          icon.style.transform = 'scale(1)';
        });
      }
    });
  }

  console.log('Modal de détails d\'événement améliorée avec le design 2025');
}

// Fonction pour créer un effet d'onde au clic
function createRippleEffect(event) {
  const button = this;
  const ripple = document.createElement('span');
  
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;
  
  ripple.style.width = ripple.style.height = `${diameter}px`;
  ripple.style.left = `${event.clientX - (button.getBoundingClientRect().left + radius)}px`;
  ripple.style.top = `${event.clientY - (button.getBoundingClientRect().top + radius)}px`;
  ripple.classList.add('ripple');
  
  // Supprimer tout ripple existant
  const existingRipple = button.querySelector('.ripple');
  if (existingRipple) {
    existingRipple.remove();
  }
  
  button.appendChild(ripple);
  
  // Supprimer le ripple après l'animation
  setTimeout(() => {
    ripple.remove();
  }, 600);
}

// Fonction pour animer la transition entre les onglets
function animateTabTransition(targetTabId) {
  const allTabs = document.querySelectorAll('.tab-content');
  const targetTab = document.getElementById(targetTabId);
  
  if (!targetTab || !allTabs.length) return;
  
  // Trouver l'onglet actif actuel
  const activeTab = document.querySelector('.tab-content.active');
  if (!activeTab) return;
  
  // Si on clique sur l'onglet déjà actif, ne rien faire
  if (activeTab === targetTab) return;
  
  // Animer la sortie de l'onglet actif
  activeTab.style.opacity = '0';
  activeTab.style.transform = 'translateX(-20px)';
  
  // Après une courte période, masquer l'onglet actif et afficher le nouveau
  setTimeout(() => {
    activeTab.classList.remove('active');
    targetTab.classList.add('active');
    
    // Définir la position initiale du nouvel onglet
    targetTab.style.opacity = '0';
    targetTab.style.transform = 'translateX(20px)';
    
    // Forcer un reflow pour que la transition fonctionne
    void targetTab.offsetWidth;
    
    // Animer l'entrée du nouvel onglet
    targetTab.style.opacity = '1';
    targetTab.style.transform = 'translateX(0)';
  }, 200);
}