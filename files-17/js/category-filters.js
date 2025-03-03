// Variables globales pour la gestion des catégories
let selectedCategories = [];

// Générer les filtres de catégories avec support multi-sélection
// Remplacer la fonction renderCategoryFilters() par cette version:
function renderCategoryFilters() {
    const filterContainer = document.getElementById('categoryFilter');
    if (!filterContainer) return;
    
    // Ajouter le filtre "Toutes les catégories"
    let html = `
        <div class="category-filter-item" data-id="all">
            <span>🔍</span> Toutes les catégories
        </div>
    `;
    
    // Ajouter un filtre pour chaque catégorie
    allCategories.forEach(category => {
        html += `
            <div class="category-filter-item" data-id="${category.id}">
                <span>${category.icon}</span> 
                ${category.name}
            </div>
        `;
    });
    
    filterContainer.innerHTML = html;
    
    // IMPORTANT: NE PAS créer un nouveau conteneur de selectedCategories
    // qui serait dupliqué à chaque fois
    
    // Ajouter les écouteurs d'événements
    document.querySelectorAll('.category-filter-item').forEach(item => {
        item.addEventListener('click', function() {
            const categoryId = this.getAttribute('data-id');
            
            if (categoryId === 'all') {
                // Si "Toutes les catégories" est sélectionné, désélectionner les autres
                selectedCategories = [];
                document.querySelectorAll('.category-filter-item').forEach(el => {
                    el.classList.remove('active');
                });
                this.classList.add('active');
            } else {
                // Désélectionner "Toutes les catégories" si présent
                const allCategoriesFilter = document.querySelector('.category-filter-item[data-id="all"]');
                if (allCategoriesFilter) {
                    allCategoriesFilter.classList.remove('active');
                }
                
                // Basculer la sélection de cette catégorie
                this.classList.toggle('active');
                
                // Mettre à jour le tableau des catégories sélectionnées
                if (this.classList.contains('active')) {
                    // Vérifier si la catégorie est déjà dans la liste pour éviter les doublons
                    if (!selectedCategories.includes(categoryId)) {
                        selectedCategories.push(categoryId);
                    }
                } else {
                    selectedCategories = selectedCategories.filter(id => id !== categoryId);
                }
                
                // Si aucune catégorie n'est sélectionnée, réactiver "Toutes les catégories"
                if (selectedCategories.length === 0 && allCategoriesFilter) {
                    allCategoriesFilter.classList.add('active');
                }
            }
            
            // Appliquer immédiatement les filtres - SANS mettre à jour l'affichage des catégories
            // Nous supprimons l'appel à updateSelectedCategoriesDisplay()
            applyFilters();
        });
    });
    
    // Activer par défaut "Toutes les catégories"
    const allCategoriesFilter = document.querySelector('.category-filter-item[data-id="all"]');
    if (allCategoriesFilter) {
        allCategoriesFilter.classList.add('active');
    }
}

// Complètement désactiver la fonction updateSelectedCategoriesDisplay
// en la remplaçant par une version vide
// Mettre à jour l'affichage des catégories sélectionnées avec animation
function updateSelectedCategoriesDisplay() {
    const container = document.getElementById('selectedCategoriesContainer');
    if (!container) return;
    
    // Récupérer les badges actuellement affichés
    const existingBadges = container.querySelectorAll('.selected-category-badge');
    const existingIds = Array.from(existingBadges).map(badge => 
        badge.getAttribute('data-id')
    );
    
    // Déterminer les badges à ajouter
    const idsToAdd = selectedCategories.filter(id => !existingIds.includes(id));
    
    // Déterminer les badges à supprimer (avec animation)
    existingBadges.forEach(badge => {
        const badgeId = badge.getAttribute('data-id');
        if (!selectedCategories.includes(badgeId)) {
            // Ajouter la classe d'animation de suppression
            badge.classList.add('removing');
            
            // Supprimer après la fin de l'animation
            badge.addEventListener('animationend', function() {
                if (badge.parentNode === container) {
                    container.removeChild(badge);
                }
            });
        }
    });
    
    // Ajouter les nouveaux badges avec animation
    idsToAdd.forEach(categoryId => {
        const category = allCategories.find(cat => cat.id == categoryId);
        if (!category) return;
        
        const badge = document.createElement('div');
        badge.className = 'selected-category-badge';
        badge.setAttribute('data-id', categoryId);
        badge.style.backgroundColor = category.color;
        badge.innerHTML = `
            <span class="category-icon">${category.icon}</span>
            <span class="category-name">${category.name}</span>
            <span class="remove-category" data-id="${category.id}"><i class="fas fa-times"></i></span>
        `;
        
        container.appendChild(badge);
        
        // Ajouter l'écouteur pour le bouton de suppression
        const removeBtn = badge.querySelector('.remove-category');
        removeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const categoryId = this.getAttribute('data-id');
            
            // Désélectionner la catégorie dans la liste
            const categoryItem = document.querySelector(`.category-filter-item[data-id="${categoryId}"]`);
            if (categoryItem) {
                categoryItem.classList.remove('active');
            }
            
            // Ajouter l'animation de suppression au badge parent
            const parentBadge = this.closest('.selected-category-badge');
            if (parentBadge) {
                parentBadge.classList.add('removing');
                
                // Supprimer après l'animation
                parentBadge.addEventListener('animationend', function() {
                    if (this.parentNode) {
                        this.parentNode.removeChild(this);
                    }
                });
            }
            
            // Retirer du tableau des catégories sélectionnées
            selectedCategories = selectedCategories.filter(id => id !== categoryId);
            
            // Si aucune catégorie n'est sélectionnée, activer "Toutes les catégories"
            if (selectedCategories.length === 0) {
                const allCategoriesFilter = document.querySelector('.category-filter-item[data-id="all"]');
                if (allCategoriesFilter) {
                    allCategoriesFilter.classList.add('active');
                }
            }
            
            // Appliquer les filtres après un court délai pour permettre l'animation
            setTimeout(() => {
                applyFilters();
            }, 300);
        });
    });
}

// Filtrer les événements par catégories multiples
function filterEventsByCategories() {
    // Si aucune catégorie spécifique n'est sélectionnée, afficher tous les événements
    if (selectedCategories.length === 0) {
        return events; // Retourne tous les événements
    }
    
    // Filtrer les événements qui correspondent à l'une des catégories sélectionnées
    return events.filter(event => {
        return selectedCategories.includes(String(event.categoryId));
    });
}

// Modifier la fonction existante applyFilters pour inclure le filtrage par catégories
function applyFilters() {
    // Récupérer les valeurs des filtres
    const filters = getFiltersFromForm();
    
    // Ajouter les filtres de catégories
    filters.categories = selectedCategories;
    
    // Stocker les filtres actuels
    currentFilters = filters;
    
    // Supprimer tous les marqueurs actuels
    clearEventMarkers();
    
    // Filtrer d'abord par catégories
    let filteredEvents = filterEventsByCategories();
    
    // Puis appliquer les autres filtres
    filteredEvents = filteredEvents.filter(event => shouldShowEvent(event, filters));
    
    // Ajouter les marqueurs pour les événements filtrés
    filteredEvents.forEach(event => {
        addEventMarker(event);
    });
    
    // Afficher un message de résultat
    showFilterResults(filteredEvents.length);
    
    return filteredEvents.length;
}

// Fonction pour réinitialiser tous les filtres, incluant les catégories
function resetFilters() {
    // Réinitialiser tous les champs de filtre standard
    const searchInput = document.getElementById('searchInput');
    const freeEventsOnly = document.getElementById('freeEventsOnly');
    const childrenEventsOnly = document.getElementById('childrenEventsOnly');
    const hideFullEvents = document.getElementById('hideFullEvents');
    
    if (searchInput) searchInput.value = '';
    if (freeEventsOnly) freeEventsOnly.checked = false;
    if (childrenEventsOnly) childrenEventsOnly.checked = false;
    if (hideFullEvents) hideFullEvents.checked = false;
    
    // Réinitialiser la plage de dates
    setDefaultDateRange();
    
    // Réinitialiser les catégories sélectionnées
    selectedCategories = [];
    
    // Désélectionner toutes les catégories dans l'interface
    document.querySelectorAll('.category-filter-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Activer "Toutes les catégories"
    const allCategoriesFilter = document.querySelector('.category-filter-item[data-id="all"]');
    if (allCategoriesFilter) {
        allCategoriesFilter.classList.add('active');
    }
    
    // Effacer les badges de catégories sélectionnées
    const selectedCategoriesContainer = document.getElementById('selectedCategoriesContainer');
    if (selectedCategoriesContainer) {
        selectedCategoriesContainer.innerHTML = '';
    }
    
    // Appliquer les filtres réinitialisés
    applyFilters();
}

// Fonction pour configurer les écouteurs du panneau de filtres
// Remplacer la fonction setupFilterListeners par cette version:
function setupFilterListeners() {
    console.log("Configuration des filtres");
    
    // Récupérer les éléments de filtre
    const resetFiltersBtn = document.getElementById('resetFilters');
    const searchInput = document.getElementById('searchInput');
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    const freeEventsOnly = document.getElementById('freeEventsOnly');
    const childrenEventsOnly = document.getElementById('childrenEventsOnly');
    const hideFullEvents = document.getElementById('hideFullEvents');
    const filterPanel = document.getElementById('filterPanel');
    const closeFilterBtn = document.getElementById('closeFilterBtn');
    
    // Réinitialiser les filtres au clic sur le bouton
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', function() {
            resetFilters();
            
            // Fermer le panneau des filtres
            if (filterPanel) {
                filterPanel.classList.remove('active');
            }
        });
    }
    
    // Fermer le panneau au clic sur le bouton de fermeture
    if (closeFilterBtn) {
        closeFilterBtn.addEventListener('click', function() {
            filterPanel.classList.remove('active');
        });
    }
    
    // Fermer le panneau au clic en dehors
    document.addEventListener('click', function(event) {
        const filterBtn = document.getElementById('filterBtn');
        
        // Si le panneau est actif et qu'on clique en dehors
        if (filterPanel && filterPanel.classList.contains('active') && 
            !filterPanel.contains(event.target) && 
            (!filterBtn || !filterBtn.contains(event.target))) {
            filterPanel.classList.remove('active');
        }
    });
    
    // Empêcher la fermeture lors des clics à l'intérieur du panneau
    if (filterPanel) {
        filterPanel.addEventListener('click', function(event) {
            event.stopPropagation();
        });
    }
    
    // Traiter la saisie dans le champ de recherche avec un debounce
    if (searchInput) {
        let debounceTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                applyFilters();
            }, 300);
        });
    }
    
    // Filtrer lorsqu'on change les dates
    if (startDateFilter) {
        startDateFilter.addEventListener('change', function() {
            applyFilters();
        });
    }
    
    if (endDateFilter) {
        endDateFilter.addEventListener('change', function() {
            applyFilters();
        });
    }
    
    // Filtrer lorsqu'on change les options à cocher
    [freeEventsOnly, childrenEventsOnly, hideFullEvents].forEach(checkbox => {
        if (checkbox) {
            checkbox.addEventListener('change', function() {
                applyFilters();
            });
        }
    });
    
    // Supprimer la référence au bouton "Appliquer les filtres" qui n'existe plus
    // (code supprimé)
}
    
    // Garder le bouton "Appliquer les filtres" pour UX mais il applique juste les filtres et ferme le panneau
    const applyFiltersBtn = document.getElementById('applyFilters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', function() {
            document.getElementById('filterPanel').classList.remove('active');
        });
    }


// Modifier la fonction existante applyFilters pour inclure le filtrage par catégories
function applyFilters() {
    // Récupérer les valeurs des filtres
    const filters = getFiltersFromForm();
    
    // Ajouter les filtres de catégories
    filters.categories = selectedCategories;
    
    // Stocker les filtres actuels
    currentFilters = filters;
    
    // Supprimer tous les marqueurs actuels
    clearEventMarkers();
    
    // Filtrer d'abord par catégories
    let filteredEvents = filterEventsByCategories();
    
    // Puis appliquer les autres filtres
    filteredEvents = filteredEvents.filter(event => shouldShowEvent(event, filters));
    
    // Ajouter les marqueurs pour les événements filtrés
    filteredEvents.forEach(event => {
        addEventMarker(event);
    });
    
    // Afficher un message de résultat
    showFilterResults(filteredEvents.length);
    
    return filteredEvents.length;
}