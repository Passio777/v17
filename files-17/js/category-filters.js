// Variables globales pour la gestion des catégories
let selectedCategories = [];

// Générer les filtres de catégories avec support multi-sélection
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
    
    // Conteneur pour afficher les catégories sélectionnées
    const selectedCategoriesContainer = document.createElement('div');
    selectedCategoriesContainer.className = 'selected-categories-container';
    selectedCategoriesContainer.id = 'selectedCategoriesContainer';
    
    // Insérer le conteneur après le filterContainer
    const parentElement = filterContainer.parentNode;
    parentElement.insertBefore(selectedCategoriesContainer, filterContainer.nextSibling);
    
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
                    selectedCategories.push(categoryId);
                } else {
                    selectedCategories = selectedCategories.filter(id => id !== categoryId);
                }
                
                // Si aucune catégorie n'est sélectionnée, réactiver "Toutes les catégories"
                if (selectedCategories.length === 0 && allCategoriesFilter) {
                    allCategoriesFilter.classList.add('active');
                }
            }
            
            // Mettre à jour l'affichage des catégories sélectionnées
            updateSelectedCategoriesDisplay();
            
            // Appliquer immédiatement les filtres
            applyFilters();
        });
    });
    
    // Activer par défaut "Toutes les catégories"
    const allCategoriesFilter = document.querySelector('.category-filter-item[data-id="all"]');
    if (allCategoriesFilter) {
        allCategoriesFilter.classList.add('active');
    }
}

// Mettre à jour l'affichage des catégories sélectionnées
function updateSelectedCategoriesDisplay() {
    const container = document.getElementById('selectedCategoriesContainer');
    if (!container) return;
    
    // Vider le conteneur
    container.innerHTML = '';
    
    // Si aucune catégorie n'est sélectionnée, ne rien afficher
    if (selectedCategories.length === 0) return;
    
    // Créer un badge pour chaque catégorie sélectionnée
    selectedCategories.forEach(categoryId => {
        const category = allCategories.find(cat => cat.id == categoryId);
        if (!category) return;
        
        const badge = document.createElement('div');
        badge.className = 'selected-category-badge';
        badge.style.backgroundColor = category.color;
        badge.innerHTML = `
            <span class="category-icon">${category.icon}</span>
            <span class="category-name">${category.name}</span>
            <span class="remove-category" data-id="${category.id}"><i class="fas fa-times"></i></span>
        `;
        
        container.appendChild(badge);
    });
    
    // Ajouter les écouteurs pour les boutons de suppression
    document.querySelectorAll('.remove-category').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation(); // Empêcher la propagation de l'événement
            const categoryId = this.getAttribute('data-id');
            
            // Désélectionner la catégorie dans la liste
            const categoryItem = document.querySelector(`.category-filter-item[data-id="${categoryId}"]`);
            if (categoryItem) {
                categoryItem.classList.remove('active');
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
            
            // Mettre à jour l'affichage
            updateSelectedCategoriesDisplay();
            
            // Appliquer les filtres
            applyFilters();
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

// Modifier la fonction resetFilters existante pour réinitialiser également les catégories
function resetFilters() {
    // Réinitialiser tous les champs de filtre
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

// Modifier setupFilterListeners pour appliquer automatiquement les filtres lors des changements
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
    
    // Réinitialiser les filtres au clic sur le bouton
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', function() {
            resetFilters();
            
            // Fermer le panneau des filtres
            document.getElementById('filterPanel').classList.remove('active');
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
    
    // Garder le bouton "Appliquer les filtres" pour UX mais il applique juste les filtres et ferme le panneau
    const applyFiltersBtn = document.getElementById('applyFilters');
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', function() {
            document.getElementById('filterPanel').classList.remove('active');
        });
    }
}