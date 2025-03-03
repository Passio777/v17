// Variables pour la carte
let eventMap = null;
let eventMarker = null;

// Fonction appelée lors de l'ouverture du modal d'ajout d'événement
function initEventCreationForm() {
    console.log("Initialisation du formulaire de création d'événement");
    
    // Initialiser le sélecteur de catégories amélioré
    initCategorySelector();
    
    // Initialiser la mini-carte
    initEventMap();
    
    // Définir la date par défaut
    setDefaultDateTime();
}

// Initialiser la mini-carte de localisation
function initEventMap() {
    // Si la carte existe déjà, nettoyer
    if (eventMap) {
        eventMap.remove();
    }
    
    // Créer la carte
    eventMap = L.map('locationMap', {
        center: [46.603354, 1.8883335], // Centre de la France
        zoom: 5
    });
    
    // Ajouter le fond de carte OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(eventMap);
    
    // Créer une icône personnalisée pour le marqueur
    const customIcon = L.divIcon({
        className: 'custom-event-marker',
        html: '<i class="fas fa-map-marker-alt" style="color: var(--primary); font-size: 24px;"></i>',
        iconSize: [24, 24],
        iconAnchor: [12, 24]
    });
    
    // Créer le marqueur (initialement invisible)
    eventMarker = L.marker([46.603354, 1.8883335], {
        draggable: true,
        icon: customIcon
    });
    eventMarker.addTo(eventMap);
    
    // Gérer le clic sur la carte
    eventMap.on('click', function(e) {
        const latlng = e.latlng;
        
        // Mettre à jour la position du marqueur
        eventMarker.setLatLng(latlng);
        
        // Mettre à jour les champs cachés
        document.getElementById('eventLat').value = latlng.lat;
        document.getElementById('eventLng').value = latlng.lng;
        
        // Recherche inverse d'adresse
        reverseGeocode(latlng.lat, latlng.lng);
    });
    
    // Mettre à jour les coordonnées quand le marqueur est déplacé
    eventMarker.on('dragend', function() {
        const latlng = eventMarker.getLatLng();
        
        // Mettre à jour les champs cachés
        document.getElementById('eventLat').value = latlng.lat;
        document.getElementById('eventLng').value = latlng.lng;
        
        // Recherche inverse d'adresse
        reverseGeocode(latlng.lat, latlng.lng);
    });
    
    // Recherche d'adresse à partir de la saisie
    const locationInput = document.getElementById('eventLocation');
    let debounceTimeout;
    
    locationInput.addEventListener('input', function() {
        clearTimeout(debounceTimeout);
        
        const query = this.value.trim();
        if (query.length < 3) {
            document.getElementById('addressSuggestions').classList.add('hidden');
            return;
        }
        
        debounceTimeout = setTimeout(() => {
            searchAddress(query);
        }, 500);
    });
    
    // Géolocaliser l'utilisateur
    document.getElementById('locateBtn').addEventListener('click', function() {
        if (navigator.geolocation) {
            this.innerHTML = '<i class="fas fa-spin fa-spinner"></i>';
            
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    // Définir la vue de la carte
                    eventMap.setView([lat, lng], 14);
                    
                    // Définir la position du marqueur
                    eventMarker.setLatLng([lat, lng]);
                    
                    // Mettre à jour les champs cachés
                    document.getElementById('eventLat').value = lat;
                    document.getElementById('eventLng').value = lng;
                    
                    // Recherche inverse d'adresse
                    reverseGeocode(lat, lng);
                    
                    // Restaurer l'icône
                    document.getElementById('locateBtn').innerHTML = '<i class="fas fa-crosshairs"></i>';
                },
                function(error) {
                    console.error("Erreur de géolocalisation:", error);
                    showNotification("Impossible d'obtenir votre position actuelle", "error");
                    document.getElementById('locateBtn').innerHTML = '<i class="fas fa-crosshairs"></i>';
                }
            );
        } else {
            showNotification("La géolocalisation n'est pas supportée par votre navigateur", "error");
        }
    });
    
    // Invalidate la taille de la carte pour corriger l'affichage
    setTimeout(function() {
        eventMap.invalidateSize();
    }, 300);
}

// Recherche d'adresse à partir du texte saisi
function searchAddress(query) {
    const suggestionsContainer = document.getElementById('addressSuggestions');
    
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`)
        .then(response => response.json())
        .then(data => {
            suggestionsContainer.innerHTML = '';
            
            if (data && data.length > 0) {
                data.forEach(item => {
                    const suggestion = document.createElement('div');
                    suggestion.className = 'address-suggestion';
                    suggestion.textContent = item.display_name;
                    
                    suggestion.addEventListener('click', function() {
                        // Remplir le champ d'adresse
                        document.getElementById('eventLocation').value = item.display_name;
                        
                        // Mettre à jour les champs cachés
                        document.getElementById('eventLat').value = item.lat;
                        document.getElementById('eventLng').value = item.lon;
                        
                        // Mettre à jour la vue de la carte
                        eventMap.setView([item.lat, item.lon], 14);
                        
                        // Mettre à jour la position du marqueur
                        eventMarker.setLatLng([item.lat, item.lon]);
                        
                        // Cacher les suggestions
                        suggestionsContainer.classList.add('hidden');
                    });
                    
                    suggestionsContainer.appendChild(suggestion);
                });
                
                suggestionsContainer.classList.remove('hidden');
            } else {
                suggestionsContainer.classList.add('hidden');
            }
        })
        .catch(error => {
            console.error("Erreur lors de la recherche d'adresse:", error);
            suggestionsContainer.classList.add('hidden');
        });
}

// Recherche inverse d'adresse (convertir des coordonnées en adresse)
function reverseGeocode(lat, lng) {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`)
        .then(response => response.json())
        .then(data => {
            if (data && data.display_name) {
                document.getElementById('eventLocation').value = data.display_name;
            }
        })
        .catch(error => {
            console.error("Erreur lors de la recherche inverse d'adresse:", error);
        });
}

// Initialiser le sélecteur de catégories amélioré
function initCategorySelector() {
    const categoryGrid = document.getElementById('categoryGrid');
    const descriptionText = document.getElementById('categoryDescription');
    
    if (!categoryGrid || !descriptionText) return;
    
    // Afficher l'indicateur de chargement
    categoryGrid.innerHTML = '<div class="loading-categories"><i class="fas fa-spinner fa-spin"></i> Chargement des catégories...</div>';
    
    // Utiliser les catégories déjà chargées si disponibles
    if (window.allCategories && window.allCategories.length > 0) {
        renderCategories(window.allCategories);
    } else {
        // Sinon charger les catégories depuis l'API
        loadCategories().then(categories => {
            renderCategories(categories);
        });
    }
    
    // Rendre les catégories dans la grille
    function renderCategories(categories) {
        categoryGrid.innerHTML = '';
        
        categories.forEach(category => {
            const item = document.createElement('div');
            item.className = 'category-item';
            item.dataset.id = category.id;
            item.dataset.name = category.name;
            item.dataset.description = category.description || "Aucune description disponible";
            
            item.innerHTML = `
                <div class="category-icon" style="background-color: ${category.color}; color: white;">
                    ${category.icon}
                </div>
                <div class="category-name">${category.name}</div>
            `;
            
            // Gérer le clic pour sélectionner
            item.addEventListener('click', function() {
                // Désélectionner la catégorie précédente
                document.querySelectorAll('.category-item.selected').forEach(el => {
                    el.classList.remove('selected');
                });
                
                // Sélectionner cette catégorie
                this.classList.add('selected');
                
                // Mettre à jour le champ caché avec l'ID de la catégorie
                document.getElementById('selectedCategoryId').value = this.dataset.id;
                
                // Afficher la description
                descriptionText.textContent = this.dataset.description;
                descriptionText.classList.add('active');
            });
            
            // Gérer le survol pour afficher la description temporairement
            item.addEventListener('mouseenter', function() {
                // Seulement si aucune catégorie n'est sélectionnée
                if (!document.querySelector('.category-item.selected')) {
                    descriptionText.textContent = this.dataset.description;
                    descriptionText.classList.add('active');
                }
            });
            
            item.addEventListener('mouseleave', function() {
                // Restaurer le texte par défaut si aucune catégorie n'est sélectionnée
                if (!document.querySelector('.category-item.selected')) {
                    descriptionText.textContent = "Sélectionnez une catégorie pour voir sa description.";
                    descriptionText.classList.remove('active');
                }
            });
            
            categoryGrid.appendChild(item);
        });
    }
}

// Définir la date par défaut (maintenant + 1 heure)
function setDefaultDateTime() {
    const now = new Date();
    // Ajouter une heure
    now.setHours(now.getHours() + 1);
    
    // Formater en yyyy-MM-ddThh:mm format pour input datetime-local
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    const formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
    
    // Définir comme valeur par défaut
    const startDateInput = document.getElementById('eventStartDate');
    if (startDateInput && !startDateInput.value) {
        startDateInput.value = formattedDateTime;
    }
}

// Initialiser les listeners lors du chargement du document
document.addEventListener('DOMContentLoaded', function() {
    // Écouter l'ouverture du modal d'ajout d'événement
    document.getElementById('addEventBtn').addEventListener('click', function() {
        initEventCreationForm();
    });
    
    // Écouteur pour le bouton Annuler
    document.getElementById('cancelEventBtn').addEventListener('click', function() {
        document.getElementById('addEventModal').style.display = 'none';
        document.body.classList.remove('modal-open');
    });
    
    // Toggle pour la date de fin
    document.getElementById('hasEndDate').addEventListener('change', function() {
        if (this.checked) {
            document.getElementById('endDateGroup').classList.add('shown');
        } else {
            document.getElementById('endDateGroup').classList.remove('shown');
            document.getElementById('eventEndDate').value = '';
        }
    });
});

// Fonction pour recharger la carte lorsque le modal est ouvert (pour corriger les problèmes d'affichage)
function refreshEventMap() {
    if (eventMap) {
        setTimeout(function() {
            eventMap.invalidateSize();
        }, 100);
    }
}

// Observer les changements de visibilité du modal
const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.attributeName === 'style') {
            const modal = mutation.target;
            if (modal.style.display === 'block') {
                refreshEventMap();
            }
        }
    });
});

// Observer le modal d'ajout d'événement
const addEventModal = document.getElementById('addEventModal');
if (addEventModal) {
    observer.observe(addEventModal, { attributes: true });
}