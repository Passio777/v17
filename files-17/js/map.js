
// Variables globales pour la carte
let map;
let userMarker = null;
let eventMarkers = [];
let events = []; // Variable globale pour stocker tous les événements
let selectedLocation = null;
let previewMap = null;
let userPosition = null;

// Initialisation de la carte
function initMap() {
    console.log("Fonction initMap appelée");
    
    try {
        // Vérifier que Leaflet est disponible
        if (typeof L === 'undefined') {
            console.error("Leaflet n'est pas défini. La bibliothèque n'est peut-être pas chargée.");
            return;
        }
        
        // Vérifier que l'élément DOM existe
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error("L'élément #map n'existe pas dans le DOM");
            return;
        }
        
        console.log("Création de la carte Leaflet");
        
        // Création de la carte centrée sur Montpellier
        map = L.map('map', {
            zoomControl: false,  // On désactive le contrôle de zoom par défaut
            attributionControl: true
        }).setView([43.6112, 3.8767], 13); // Centré sur Montpellier avec un zoom approprié
        
        // Ajout de la couche OpenStreetMap avec un style moderne
        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="https://www.hotosm.org/">HOT</a>',
            maxZoom: 19
        }).addTo(map);
        
        // Ajouter le contrôle de zoom en haut à droite
        L.control.zoom({
            position: 'topright'
        }).addTo(map);
        
        // Ajout de l'échelle en bas à gauche
        L.control.scale({
            position: 'bottomleft',
            imperial: false
        }).addTo(map);
        
        console.log("Carte créée avec succès");
        
        // Écouteur de clic sur la carte pour la sélection d'emplacement pour un nouvel événement
        map.on('click', function(e) {
            if (document.getElementById('addEventModal').style.display === 'block') {
                selectLocationOnMap(e.latlng);
            }
        });
        
        // NOUVEAU: Écouteur pour le changement de zoom qui met à jour la taille des marqueurs
        map.on('zoomend', function() {
            updateMarkerSizes();
        });
        
        // Initialisation de la carte miniature pour la prévisualisation
        initPreviewMap();
        
        // Afficher l'indicateur de chargement
        document.getElementById('page-loader').classList.remove('hidden');
        
        // D'abord charger les catégories, puis charger les événements
        loadCategories()
            .then(() => {
                console.log("Catégories chargées, chargement des événements...");
                return loadEvents();
            })
            .catch(error => {
                console.error("Erreur lors de l'initialisation des données :", error);
                document.getElementById('page-loader').classList.add('hidden');
                showNotification("Erreur lors du chargement des données", "error");
            });
        
        // Configuration du bouton d'ajout d'événement pour la recherche d'adresse
        setupAddEventBtnListeners();
        
    } catch (error) {
        console.error("Erreur lors de l'initialisation de la carte:", error);
        showNotification("Erreur lors de l'initialisation de la carte", "error");
    }
}

// Initialise la carte de prévisualisation pour la création d'événement
function initPreviewMap() {
    // Vérifier si l'élément existe avant d'initialiser
    const previewMapElement = document.getElementById('locationPreviewMap');
    if (previewMapElement) {
        previewMap = L.map('locationPreviewMap').setView([43.6112, 3.8767], 12); // Aussi centré sur Montpellier
        
        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(previewMap);
        
        // Écouteur de clic sur la carte miniature
        previewMap.on('click', function(e) {
            selectLocationOnMap(e.latlng);
        });
    }
}

// Sélection d'un emplacement sur la carte
function selectLocationOnMap(latlng) {
    // Mettre à jour les champs cachés avec les coordonnées
    document.getElementById('eventLat').value = latlng.lat;
    document.getElementById('eventLng').value = latlng.lng;
    
    // Mettre à jour le marqueur sur la carte miniature
    if (selectedLocation) {
        previewMap.removeLayer(selectedLocation);
    }
    
    selectedLocation = L.marker(latlng).addTo(previewMap);
    previewMap.setView(latlng, 13);
    
    // Effectuer une recherche inverse pour obtenir l'adresse
    reverseGeocode(latlng);
}

// Recherche d'adresse inverse à partir de coordonnées
function reverseGeocode(latlng) {
    // Afficher un indicateur de chargement
    document.getElementById('eventLocation').value = "Recherche de l'adresse...";
    
    // Requête de géocodage inverse à l'API Nominatim d'OpenStreetMap
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&zoom=18&addressdetails=1`)
        .then(response => response.json())
        .then(data => {
            if (data && data.display_name) {
                document.getElementById('eventLocation').value = data.display_name;
            } else {
                document.getElementById('eventLocation').value = `Lat: ${latlng.lat.toFixed(6)}, Lng: ${latlng.lng.toFixed(6)}`;
            }
        })
        .catch(error => {
            console.error("Erreur lors du géocodage inverse:", error);
            document.getElementById('eventLocation').value = `Lat: ${latlng.lat.toFixed(6)}, Lng: ${latlng.lng.toFixed(6)}`;
        });
}

// Recherche d'adresse à partir d'un texte
function geocodeAddress(address) {
    return new Promise((resolve, reject) => {
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`)
            .then(response => response.json())
            .then(data => {
                if (data && data.length > 0) {
                    const location = {
                        lat: parseFloat(data[0].lat),
                        lng: parseFloat(data[0].lon),
                        address: data[0].display_name
                    };
                    resolve(location);
                } else {
                    reject(new Error("Adresse non trouvée"));
                }
            })
            .catch(error => {
                reject(error);
            });
    });
}

// Dans la fonction loadEvents de map.js
function loadEvents() {
    // Afficher le loader
    document.getElementById('page-loader').classList.remove('hidden');
    
    fetch('api/events.php')
        .then(response => {
            if (!response.ok) {
                throw new Error('Erreur réseau');
            }
            return response.json();
        })
        .then(data => {
            // Cacher le loader
            document.getElementById('page-loader').classList.add('hidden');
            
            // Effacer tous les marqueurs existants
            clearEventMarkers();
            
            // FIX: Enrichir les événements avec les informations de catégorie
            data.forEach(event => {
                if (event.categoryId && allCategories) {
                    const category = allCategories.find(cat => cat.id == event.categoryId);
                    if (category) {
                        event.categoryColor = category.color;
                        event.categoryIcon = category.icon;
                        event.categoryName = category.name;
                    }
                }
                
                // SOLUTION ALTERNATIVE: Pour les nouveaux événements sans categoryId mais créés avec une catégorie
                // Essayer de récupérer l'information à partir de sessionStorage
                if (!event.categoryId && sessionStorage.getItem('lastCreatedEventId') === event.id) {
                    const savedCategoryId = sessionStorage.getItem('lastCreatedCategoryId');
                    if (savedCategoryId && allCategories) {
                        event.categoryId = parseInt(savedCategoryId);
                        const category = allCategories.find(cat => cat.id == savedCategoryId);
                        if (category) {
                            event.categoryColor = category.color;
                            event.categoryIcon = category.icon;
                            event.categoryName = category.name;
                        }
                    }
                }
            });
            
            // Stocker les événements dans la variable globale
            events = data;
            
            console.log(`${data.length} événements chargés`);
            
            // Ajouter les nouveaux marqueurs
            data.forEach(event => {
                addEventMarker(event);
            });
            
            // Appliquer les filtres si définis
            const filterParams = getFiltersFromForm();
            if (Object.keys(filterParams).some(key => !!filterParams[key])) {
                filterEvents(filterParams);
            }
        })
        .catch(error => {
            // Cacher le loader
            document.getElementById('page-loader').classList.add('hidden');
            
            console.error("Erreur lors du chargement des événements:", error);
            showNotification("Erreur lors du chargement des événements", "error");
        });
}

// Ajouter un marqueur d'événement sur la carte avec un style amélioré
// Ajouter un marqueur d'événement sur la carte avec un style amélioré et popup modernisé
function addEventMarker(event) {
    // Déterminer le style du marqueur en fonction du type d'événement et de la catégorie
    let markerColor, markerIcon;
    
    // Si l'événement a une catégorie, utiliser sa couleur et son icône
    if (event.categoryId && allCategories) {
        const category = allCategories.find(cat => cat.id == event.categoryId);
        if (category) {
            markerColor = category.color || '#3498db';
            markerIcon = category.icon || '📍';
            
            // Stocker ces valeurs directement dans l'événement pour référence future
            event.categoryColor = markerColor;
            event.categoryIcon = markerIcon;
            event.categoryName = category.name;
        } else {
            // Si la catégorie n'est pas trouvée, utiliser un style distinctif mais différent
            console.warn(`Catégorie non trouvée pour l'événement ${event.id}, ID catégorie: ${event.categoryId}`);
            markerColor = '#9b59b6'; // Violet pour indiquer qu'il y a une catégorie manquante
            markerIcon = '❓';
        }
    } else {
        // Catégorie par défaut basée sur le type d'événement
        if (event.isChildrenOnly) {
            markerColor = '#f39c12'; // Couleur orange pour les événements enfants
            markerIcon = '👶';
        } else if (event.isPaid) {
            markerColor = '#e74c3c'; // Rouge pour les événements payants
            markerIcon = '💰';
        } else {
            markerColor = '#2ecc71'; // Vert pour les événements gratuits
            markerIcon = '📅';
        }
        
        // Stocker ces valeurs
        event.categoryColor = markerColor;
        event.categoryIcon = markerIcon;
        event.categoryName = event.isChildrenOnly ? "Enfants" : (event.isPaid ? "Événement payant" : "Tarif : ");
    }
    
    // Extraire les composantes RGB de la couleur pour les variables CSS
    const rgbValues = hexToRgb(markerColor);
    const rgbString = rgbValues ? `${rgbValues.r}, ${rgbValues.g}, ${rgbValues.b}` : '52, 152, 219'; // Valeur par défaut si conversion échoue
    
    // Vérifier si l'événement est dans moins de 4 jours
    const now = new Date();
    const eventDate = new Date(event.startDate);
    const daysUntilEvent = Math.floor((eventDate - now) / (1000 * 60 * 60 * 24));
    const isSoon = daysUntilEvent >= 0 && daysUntilEvent <= 4;
    
    // Classes CSS supplémentaires pour les marqueurs spéciaux
    let specialClasses = '';
    if (event.isPaid) {
        specialClasses += ' marker-paid';
    }
    if (isSoon) {
        specialClasses += ' marker-soon';
    }
    
    // Créer une icône personnalisée plus moderne
    const eventIcon = L.divIcon({
        className: `event-marker${specialClasses}`,
        html: `
            <div class="marker-pin-modern${specialClasses}" style="background: linear-gradient(135deg, ${markerColor}, ${adjustColor(markerColor, -20)})">
                <div class="marker-icon-container">${markerIcon}</div>
                <div class="marker-pulse" style="border: 3px solid ${markerColor}"></div>
                ${event.isPaid ? '<div class="marker-paid-indicator"></div>' : ''}
                ${isSoon ? '<div class="marker-soon-indicator"></div>' : ''}
            </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
    });
    
    const marker = L.marker([event.lat, event.lng], { 
        icon: eventIcon,
        riseOnHover: true,
        bubblingMouseEvents: false
    }).addTo(map);

    // Stocker le niveau de zoom actuel dans le marqueur pour le redimensionnement
    marker.zoomLevel = map.getZoom();
    
    // Formater la date pour l'affichage
    const formattedDate = formatDate(event.startDate);
    
    // Formater le prix pour l'affichage
    const priceDisplay = event.isPaid 
        ? `<span class="price-paid">${event.price}€</span>` 
        : `<span class="price-free">Gratuit</span>`;
    
    // Places disponibles ou non limité
    let placesLeft = 0;
    if (event.isLimited) {
        placesLeft = event.places - (event.registrations?.length || 0);
    }
    
    let placesClass = '';
    let placesText = '';
    
    if (event.isLimited) {
        if (placesLeft > 5) {
            placesClass = 'places-available';
        } else if (placesLeft > 0) {
            placesClass = 'places-limited';
        } else {
            placesClass = 'places-full';
        }
        placesText = `<span class="places-badge ${placesClass}">${placesLeft} place${placesLeft > 1 ? 's' : ''} disponible${placesLeft > 1 ? 's' : ''}</span>`;
    } else {
        placesClass = 'places-available';
        placesText = '<span class="places-badge places-available">Places illimitées</span>';
    }
    
    // Récupérer le nom du créateur
    const creatorName = event.creator ? `${event.creator.firstname} ${event.creator.lastname}` : 'Anonyme';
    
    // Adapter le bouton d'inscription selon le type d'événement
    let inscriptionButton;
    if (event.isChildrenOnly) {
        inscriptionButton = `
            <button class="event-action-btn view-details" data-id="${event.id}">
                <i class="fas fa-info-circle"></i> Voir détails et inscrire les enfants
            </button>
        `;
    } else {
        inscriptionButton = `
            <button class="event-action-btn view-details" data-id="${event.id}">
                <i class="fas fa-info-circle"></i> Voir détails
            </button>
        `;
    }
    
    // Créer un contenu de popup amélioré avec le nouveau design
const popupContent = `
    <div class="event-popup">
        <div class="event-popup-header">
            <h3>${event.title}</h3>
        </div>
        <div class="event-popup-content">
            ${event.categoryName ? `<p><i class="fas fa-folder"></i>  ${event.categoryName}</p>` : ''}
            <p class="event-date"><i class="far fa-calendar-alt"></i> ${formattedDate}</p>
            <p><i class="fas fa-map-marker-alt"></i> ${event.location.split(',')[0]}</p>
            <p><i class="fas fa-tag"></i> ${priceDisplay} &bull; ${placesText}</p>

            <p><i class="far fa-file-alt"></i> ${event.description.substring(0, 80)}${event.description.length > 80 ? '...' : ''}</p>
            ${event.isChildrenOnly ? '<p class="children-only-bubble"><i class="fas fa-child"></i> Réservé aux enfants</p>' : ''}
            <p class="event-creator"><i class="fas fa-user"></i> Créé par ${creatorName}</p>
        </div>
        <div class="event-popup-footer">
            ${inscriptionButton}
        </div>
    </div>
`;
    
    // Créer une popup avec la nouvelle apparence
    const popup = L.popup({
        closeButton: false,
        className: 'custom-popup',
        autoPan: true,
        autoPanPaddingTopLeft: L.point(50, 50),
        autoPanPaddingBottomRight: L.point(50, 50)
    }).setContent(popupContent);
    
    marker.bindPopup(popup);
    
    // Effet de survol amélioré
    marker.on('mouseover', function() {
        if (this._icon && this._icon.querySelector('.marker-pin-modern')) {
            const markerElement = this._icon.querySelector('.marker-pin-modern');
            const pulseElement = this._icon.querySelector('.marker-pulse');
            
            markerElement.classList.add('marker-hover');
            if (pulseElement) {
                pulseElement.classList.add('pulse-active');
            }
        }
    });
    
    marker.on('mouseout', function() {
        if (this._icon && this._icon.querySelector('.marker-pin-modern')) {
            const markerElement = this._icon.querySelector('.marker-pin-modern');
            const pulseElement = this._icon.querySelector('.marker-pulse');
            
            markerElement.classList.remove('marker-hover');
            if (pulseElement) {
                pulseElement.classList.remove('pulse-active');
            }
        }
    });
    
    marker.on('click', function() {
        // Ajouter un léger délai pour s'assurer que la popup est affichée avant d'ajouter l'écouteur
        setTimeout(() => {
            const detailsButton = document.querySelector('.view-details[data-id="' + event.id + '"]');
            if (detailsButton) {
                detailsButton.addEventListener('click', function() {
                    showEventDetails(event.id);
                });
            }
        }, 50);
    });
    
    // Ajouter le marqueur à la liste
    eventMarkers.push({
        id: event.id,
        marker: marker,
        event: event
    });
    
    return marker;
}

// Fonction utilitaire pour convertir une couleur hex en RGB
function hexToRgb(hex) {
    if (!hex) return null;
    
    // Supprime le # si présent
    hex = hex.replace('#', '');
    
    // Forme courte (par exemple #fff)
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    
    // Vérifier si la longueur est valide
    if (hex.length !== 6) {
        return null;
    }
    
    // Convertir
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return { r, g, b };
}

// Fonction utilitaire pour ajuster les couleurs (foncer ou éclaircir)
function adjustColor(color, amount) {
    // Convertir la couleur hex en RGB
    let hex = color.replace('#', '');
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);
    
    // Ajuster les valeurs RGB
    r = Math.max(0, Math.min(255, r + amount));
    g = Math.max(0, Math.min(255, g + amount));
    b = Math.max(0, Math.min(255, b + amount));
    
    // Convertir de nouveau en hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Afficher les détails d'un événement
function showEventDetails(eventId) {
    console.log("Affichage des détails pour l'événement ID:", eventId);
    
    // Rechercher l'événement dans la liste des marqueurs
    const eventData = eventMarkers.find(item => item.event.id === eventId)?.event;
    
    if (!eventData) {
        console.error("Événement non trouvé avec l'ID:", eventId);
        return;
    }
    
    // Générer le HTML pour la catégorie
    let categoryHtml = '';
    if (eventData.categoryId) {
        // Rechercher la catégorie pour obtenir des informations supplémentaires si nécessaire
        const category = allCategories.find(cat => cat.id == eventData.categoryId);
        
        categoryHtml = `
            <div class="event-category-badge" style="background-color: ${eventData.categoryColor || (category ? category.color : '#3498db')}">
                <span class="category-icon">${eventData.categoryIcon || (category ? category.icon : '📍')}</span>
                <span class="category-name">${eventData.categoryName || (category ? category.name : 'Non catégorisé')}</span>
            </div>
        `;
    }
    
    // Mettre à jour les informations de l'événement dans la modal
    // Titre et catégorie ensemble dans le conteneur du titre
    document.querySelector('.event-title-container').innerHTML = `
        <h2>${eventData.title}</h2>
        ${categoryHtml}
    `;
    
    // Définir l'ID sur le bouton d'inscription AVANT tout
    const registerButton = document.getElementById('registerEventBtn');
    registerButton.setAttribute('data-id', eventId);
    
    document.querySelector('.event-title-container').innerHTML = `
    <h2 id="detailsTitle">${eventData.title}</h2>
`;

    // Remplir la modal avec les détails de l'événement
    // document.getElementById('detailsTitle').textContent = eventData.title;
    
    // Récupérer le nom du créateur
    const creatorName = eventData.creator ? `${eventData.creator.firstname} ${eventData.creator.lastname}` : 'Anonyme';
    document.getElementById('detailsCreatorName').textContent = creatorName;
    
    // Formater la date avec icône
    const dateDisplay = `${formatDate(eventData.startDate)}${eventData.endDate ? ` - ${formatDate(eventData.endDate)}` : ''}`;
    document.getElementById('detailsDate').innerHTML = dateDisplay;
    
    // Afficher la localisation
    document.getElementById('detailsLocation').textContent = eventData.location;
    
    // Afficher la description
    document.getElementById('detailsDescription').textContent = eventData.description;
    
    // Gestion des événements réservés aux enfants
    // Supprimer l'ancien avis s'il existe
    const childrenOnlyNotice = document.getElementById('detailsChildrenOnly');
    if (eventData.isChildrenOnly) {
        childrenOnlyNotice.style.display = 'block';
    } else {
        childrenOnlyNotice.style.display = 'none';
    }
    
    // Afficher le prix si payant avec un style amélioré
    const priceElement = document.getElementById('detailsPrice');
    if (eventData.isPaid) {
        priceElement.innerHTML = `<p><i class="fas fa-tag"></i> <strong>Tarif : </strong> <span class="price-paid">${eventData.price}€</span></p>`;
        priceElement.classList.remove('hidden');
    } else {
        priceElement.innerHTML = `<p><i class="fas fa-tag"></i> <strong>Événement gratuit</strong> <span class="price-free">Gratuit</span></p>`;
        priceElement.classList.remove('hidden');
    }
    
    // Afficher les places disponibles si limité avec un style amélioré
    const placesElement = document.getElementById('detailsPlaces');
    if (eventData.isLimited) {
        const placesLeft = eventData.places - (eventData.registrations?.length || 0);
        const placesClass = placesLeft > 5 ? 'places-available' : (placesLeft > 0 ? 'places-limited' : 'places-full');
        
        placesElement.innerHTML = `<p><i class="fas fa-users"></i> <strong>Places disponibles:</strong> <span class="${placesClass}">${placesLeft} sur ${eventData.places}</span></p>`;
        placesElement.classList.remove('hidden');
    } else {
        placesElement.innerHTML = `<p><i class="fas fa-users"></i> <strong>Places disponibles :</strong> <span class="places-available">Illimité</span></p>`;
        placesElement.classList.remove('hidden');
    }
    
    // Réinitialiser les formulaires liés à l'inscription
    document.getElementById('eventRegistrationForm').classList.add('hidden');
    registerButton.classList.remove('hidden');
    
    // Configurer le bouton d'inscription
    if (eventData.isLimited && eventData.registrations?.length >= eventData.places) {
        registerButton.disabled = true;
        registerButton.textContent = "Événement complet";
        registerButton.classList.add('disabled');
    } else {
        registerButton.disabled = false;
        
        // Adapter le texte du bouton selon le type d'événement
        if (eventData.isChildrenOnly) {
            registerButton.textContent = "Inscrire mes enfants";
        } else {
            registerButton.textContent = "S'inscrire à cet événement";
        }

        registerButton.classList.remove('disabled');
    }

    // Vérifier si l'utilisateur est le créateur de l'événement
    const eventOwnerButtons = document.getElementById('eventOwnerButtons');
    if (currentUser && eventData.createdBy === currentUser.id) {
        eventOwnerButtons.classList.remove('hidden');
    } else {
        eventOwnerButtons.classList.add('hidden');
    }

    // Réinitialiser les onglets
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.getAttribute('data-tab') === 'details-tab') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    document.querySelectorAll('.tab-content').forEach(tab => {
        if (tab.id === 'details-tab') {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Mettre à jour le compteur de participants
    if (eventData.registrations) {
        document.getElementById('participantsCount').textContent = eventData.registrations.length;
    } else {
        document.getElementById('participantsCount').textContent = '0';
    }

    // Afficher la modal
    document.getElementById('eventDetailsModal').style.display = 'block';
}

// Formater la date pour l'affichage
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Nettoyer les marqueurs d'événements de la carte
function clearEventMarkers() {
    eventMarkers.forEach(item => {
        map.removeLayer(item.marker);
    });
    eventMarkers = [];
}

// Configuration pour les suggestions d'adresse
function setupAddressSearch() {
    const searchBtn = document.getElementById('searchLocationBtn');
    const locationInput = document.getElementById('eventLocation');
    const suggestionsDiv = document.getElementById('addressSuggestions');
    
    if (searchBtn && locationInput) {
        // Empêcher la soumission du formulaire quand on appuie sur entrée dans le champ adresse
        locationInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchAddress();
            }
        });
        
        // Fonction de recherche au clic sur le bouton
        searchBtn.addEventListener('click', searchAddress);
        
        // Fonction pour afficher les suggestions lors de la saisie
        let debounceTimeout;
        locationInput.addEventListener('input', function() {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                const query = this.value.trim();
                if (query.length > 3) {
                    fetchAddressSuggestions(query);
                } else {
                    suggestionsDiv.innerHTML = '';
                    suggestionsDiv.classList.add('hidden');
                }
            }, 300);
        });
    }
}

// Recherche d'adresse
function searchAddress() {
    const locationInput = document.getElementById('eventLocation');
    const address = locationInput.value.trim();
    
    if (address) {
        showNotification('Recherche de l\'adresse...', 'info');
        
        geocodeAddress(address)
            .then(location => {
                // Mettre à jour les champs cachés avec les coordonnées
                document.getElementById('eventLat').value = location.lat;
                document.getElementById('eventLng').value = location.lng;
                
                // Mettre à jour la carte de prévisualisation
                if (selectedLocation) {
                    previewMap.removeLayer(selectedLocation);
                }
                
                const latlng = L.latLng(location.lat, location.lng);
                selectedLocation = L.marker(latlng).addTo(previewMap);
                previewMap.setView(latlng, 13);
                
                // Masquer les suggestions
                const suggestionsDiv = document.getElementById('addressSuggestions');
                suggestionsDiv.innerHTML = '';
                suggestionsDiv.classList.add('hidden');
            })
            .catch(error => {
                showNotification('Adresse introuvable. Veuillez réessayer ou cliquer sur la carte.', 'error');
                console.error('Erreur de géocodage:', error);
            });
    }
}

// Récupérer des suggestions d'adresse
function fetchAddressSuggestions(query) {
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`)
        .then(response => response.json())
        .then(data => {
            const suggestionsDiv = document.getElementById('addressSuggestions');
            suggestionsDiv.innerHTML = '';
            
            if (data && data.length > 0) {
                data.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'address-suggestion';
                    div.textContent = item.display_name;
                    div.addEventListener('click', () => {
                        // Sélectionner cette suggestion
                        document.getElementById('eventLocation').value = item.display_name;
                        document.getElementById('eventLat').value = item.lat;
                        document.getElementById('eventLng').value = item.lon;
                        
                        // Mettre à jour la carte
                        if (selectedLocation) {
                            previewMap.removeLayer(selectedLocation);
                        }
                        
                        const latlng = L.latLng(item.lat, item.lon);
                        selectedLocation = L.marker(latlng).addTo(previewMap);
                        previewMap.setView(latlng, 13);
                        
                        // Masquer les suggestions
                        suggestionsDiv.innerHTML = '';
                        suggestionsDiv.classList.add('hidden');
                    });
                    
                    suggestionsDiv.appendChild(div);
                });
                
                suggestionsDiv.classList.remove('hidden');
            } else {
                suggestionsDiv.classList.add('hidden');
            }
        })
        .catch(error => {
            console.error('Erreur lors de la récupération des suggestions:', error);
        });
}

// Mettre en place les écouteurs pour le bouton d'ajout d'événement
function setupAddEventBtnListeners() {
    const addEventBtn = document.getElementById('addEventBtn');
    if (addEventBtn) {
        addEventBtn.addEventListener('click', function() {
            // Si l'utilisateur n'est pas connecté, afficher la modal de connexion
            if (!currentUser) {
                showNotification('Veuillez vous connecter pour ajouter un événement', 'info');
                document.getElementById('loginModal').style.display = 'block';
                return;
            }
            
            // Réinitialiser le formulaire
            document.getElementById('addEventForm').reset();
            
            // Définir la date/heure actuelle comme valeur par défaut
            setCurrentDateTimeForEventForm();
            
            // Afficher la modal
            document.getElementById('addEventModal').style.display = 'block';
            
            // Après un court délai pour que la modal et la carte s'affichent correctement
            setTimeout(() => {
                if (previewMap) {
                    previewMap.invalidateSize();
                    
                    // Configurer la recherche d'adresse
                    setupAddressSearch();
                }
            }, 100);
        });
    }
}

// Filtrer les événements affichés sur la carte
function filterEvents(filters = {}) {
    console.log("Filtrage des événements avec:", filters);
    
    let visibleCount = 0;
    
    eventMarkers.forEach(item => {
        let show = true;
        
        // Filtre par texte (titre ou description)
        if (filters.text) {
            const searchTerms = filters.text.toLowerCase();
            const eventTitle = item.event.title.toLowerCase();
            const eventDescription = item.event.description.toLowerCase();
            
            if (!eventTitle.includes(searchTerms) && !eventDescription.includes(searchTerms)) {
                show = false;
            }
        }
        
        // Filtre par événements gratuits
        if (filters.freeOnly && item.event.isPaid) {
            show = false;
        }
        
        // Filtre par événements pour enfants
        if (filters.childrenOnly && !item.event.isChildrenOnly) {
            show = false;
        }
        
        // Filtre par plage de dates
        if (filters.startDate || filters.endDate) {
            const eventStartDate = new Date(item.event.startDate);
            const eventEndDate = item.event.endDate ? new Date(item.event.endDate) : new Date(eventStartDate);
            
            // Comparer les dates (sans l'heure)
            if (filters.startDate) {
                const startFilter = new Date(filters.startDate);
                startFilter.setHours(0, 0, 0, 0);
                
                // Si la date de fin de l'événement est antérieure à la date de début du filtre
                if (eventEndDate < startFilter) {
                    show = false;
                }
            }
            
            if (filters.endDate && show) {
                const endFilter = new Date(filters.endDate);
                endFilter.setHours(23, 59, 59, 999);
                
                // Si la date de début de l'événement est postérieure à la date de fin du filtre
                if (eventStartDate > endFilter) {
                    show = false;
                }
            }
        }
        
        // Filtre pour masquer les événements complets
        if (filters.hideFullEvents) {
            if (item.event.isLimited) {
                const placesLeft = item.event.places - (item.event.registrations?.length || 0);
                if (placesLeft <= 0) {
                    show = false;
                }
            }
        }
        
        // Afficher ou masquer le marqueur
        if (show) {
            if (!map.hasLayer(item.marker)) {
                map.addLayer(item.marker);
            }
            visibleCount++;
        } else {
            if (map.hasLayer(item.marker)) {
                map.removeLayer(item.marker);
            }
        }
    });
    
    // Retourner le nombre d'événements visibles après filtrage
    return visibleCount;
}

// Charger les événements liés à un utilisateur (créés ou inscrits)
function loadUserEvents(userId) {
    if (!userId) return;
    
    // Montrer le loader
    const createdEventsList = document.getElementById('createdEventsList');
    const registeredEventsList = document.getElementById('registeredEventsList');
    
    createdEventsList.innerHTML = '<div class="loading-indicator"><i class="fas fa-circle-notch fa-spin"></i> Chargement de vos événements...</div>';
    registeredEventsList.innerHTML = '<div class="loading-indicator"><i class="fas fa-circle-notch fa-spin"></i> Chargement de vos inscriptions...</div>';
    
    // Charger tous les événements
    fetch('api/events.php')
        .then(response => response.json())
        .then(events => {
            // Charger toutes les inscriptions
            fetch('api/registrations.php')
                .then(response => response.json())
                .then(registrations => {
                    // Filtrer les événements créés par l'utilisateur
                    const createdEvents = events.filter(event => event.createdBy === userId);
                    
                    // Filtrer les inscriptions de l'utilisateur
                    const userRegistrations = registrations.filter(reg => reg.userId === userId);
                    
                    // Trouver les événements correspondant aux inscriptions
                    const registeredEventsMap = new Map();
                    
                    userRegistrations.forEach(reg => {
                        const event = events.find(e => e.id === reg.eventId);
                        if (event) {
                            // Si l'événement existe déjà dans la map, ajouter cette inscription
                            if (registeredEventsMap.has(reg.eventId)) {
                                registeredEventsMap.get(reg.eventId).registrations.push(reg);
                            } else {
                                // Sinon, créer une nouvelle entrée avec cet événement et cette inscription
                                registeredEventsMap.set(reg.eventId, {
                                    event: event,
                                    registrations: [reg]
                                });
                            }
                        }
                    });
                    
                    // Convertir la map en tableau pour l'affichage
                    const registeredEvents = Array.from(registeredEventsMap.values());
                    
                    // Afficher les événements créés
                    updateCreatedEventsList(createdEvents);
                    
                    // Afficher les événements auxquels l'utilisateur est inscrit
                    updateRegisteredEventsList(registeredEvents);
                });
        })
        .catch(error => {
            console.error('Erreur lors du chargement des événements:', error);
            createdEventsList.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-circle"></i> Erreur lors du chargement des événements</div>';
            registeredEventsList.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-circle"></i> Erreur lors du chargement des événements</div>';
        });
}

// Mettre à jour la liste des événements créés
function updateCreatedEventsList(events) {
    const container = document.getElementById('createdEventsList');
    
    if (!events || events.length === 0) {
        container.innerHTML = '<div class="no-events">Vous n\'avez pas encore créé d\'événement.</div>';
        return;
    }
    
    let html = '';
    
    events.forEach(event => {
        const formattedDate = formatDate(event.startDate);
        const registrationsCount = event.registrations ? event.registrations.length : 0;
        
        html += `
            <div class="event-card" data-id="${event.id}">
                <div class="event-card-header">
                    <h3 class="event-card-title">${event.title}</h3>
                    <span class="event-card-badges">
                        ${event.isPaid ? '<span class="price-paid">' + event.price + '€</span>' : '<span class="price-free">Gratuit</span>'}
                    </span>
                </div>
                <div class="event-card-content">
                    <div class="event-card-info"><i class="far fa-calendar-alt"></i> ${formattedDate}</div>
                    <div class="event-card-info"><i class="fas fa-map-marker-alt"></i> ${event.location.split(',')[0]}</div>
                    <div class="event-card-info"><i class="fas fa-users"></i> ${registrationsCount} participant${registrationsCount > 1 ? 's' : ''}</div>
                </div>
                <div class="event-card-actions">
                    <button class="btn-secondary btn-sm view-event" data-id="${event.id}">
                        <i class="fas fa-eye"></i> Voir
                    </button>
                    <button class="btn-danger btn-sm delete-event" data-id="${event.id}">
                        <i class="fas fa-trash"></i> Supprimer
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Ajouter les écouteurs d'événements aux boutons
    container.querySelectorAll('.view-event').forEach(button => {
        button.addEventListener('click', function() {
            const eventId = this.getAttribute('data-id');
            document.getElementById('myEventsModal').style.display = 'none';
            showEventDetails(eventId);
        });
    });
    
    container.querySelectorAll('.delete-event').forEach(button => {
        button.addEventListener('click', function() {
            const eventId = this.getAttribute('data-id');
            confirmDeleteEvent(eventId);
        });
    });
}

// Mettre à jour la liste des événements auxquels l'utilisateur est inscrit
function updateRegisteredEventsList(registeredEvents) {
    const container = document.getElementById('registeredEventsList');
    
    if (!registeredEvents || registeredEvents.length === 0) {
        container.innerHTML = '<div class="no-events">Vous n\'êtes inscrit à aucun événement pour le moment.</div>';
        return;
    }
    
    let html = '';
    
    registeredEvents.forEach(item => {
        const event = item.event;
        const registrations = item.registrations;
        
        const formattedDate = formatDate(event.startDate);
        
        const participantsInfo = registrations.map(reg => {
            if (reg.participantType === 'adult') {
                return 'Vous-même';
            } else if (reg.participantType === 'child' && currentUser.children) {
                const child = currentUser.children.find(c => c.id === reg.participantId);
                return child ? `Enfant: ${child.firstname}` : 'Un enfant';
            }
            return '';
        }).filter(Boolean).join(', ');
        
        html += `
            <div class="event-card" data-id="${event.id}">
                <div class="event-card-header">
                    <h3 class="event-card-title">${event.title}</h3>
                    <span class="event-card-badges">
                        ${event.isPaid ? '<span class="price-paid">' + event.price + '€</span>' : '<span class="price-free">Gratuit</span>'}
                    </span>
                </div>
                <div class="event-card-content">
                    <div class="event-card-info"><i class="far fa-calendar-alt"></i> ${formattedDate}</div>
                    <div class="event-card-info"><i class="fas fa-map-marker-alt"></i> ${event.location.split(',')[0]}</div>
                    <div class="event-card-info"><i class="fas fa-user-check"></i> Inscrit(s): ${participantsInfo}</div>
                </div>
                <div class="event-card-actions">
                    <button class="btn-secondary btn-sm view-event" data-id="${event.id}">
                        <i class="fas fa-eye"></i> Voir
                    </button>
                    <div class="event-registration-status">
                        <i class="fas fa-check-circle" style="color: #2ecc71;"></i>
                        <span>Inscrit</span>
                        ${registrations.length === 1 ? 
                            `<i class="fas fa-times-circle unregister-icon" data-reg-id="${registrations[0].id}" data-event-id="${event.id}" title="Se désinscrire"></i>` 
                            : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Ajouter les écouteurs d'événements aux boutons
    container.querySelectorAll('.view-event').forEach(button => {
        button.addEventListener('click', function() {
            const eventId = this.getAttribute('data-id');
            document.getElementById('myEventsModal').style.display = 'none';
            showEventDetails(eventId);
        });
    });
    
    container.querySelectorAll('.unregister-icon').forEach(icon => {
        icon.addEventListener('click', function() {
            const regId = this.getAttribute('data-reg-id');
            const eventId = this.getAttribute('data-event-id');
            confirmUnregisterEvent(regId, eventId);
        });
    });
}



// Mettre à jour la taille des marqueurs en fonction du niveau de zoom
function updateMarkerSizes() {
    const currentZoom = map.getZoom();
    const minZoom = map.getMinZoom();
    const maxZoom = map.getMaxZoom();
    const zoomRange = maxZoom - minZoom;
    
    eventMarkers.forEach(item => {
        if (!item.marker || !item.marker._icon) return;
        
        // Calculer le facteur d'échelle avec progression non linéaire
        const normalizedZoom = (currentZoom - minZoom) / zoomRange; // 0 à 1
        
        // MODIFIÉ: Utiliser une courbe exponentielle pour que les marqueurs
        // restent petits jusqu'aux derniers niveaux de zoom
        // On élève à la puissance 3 pour accentuer cet effet
        const scaleFactor = 0.5 + Math.pow(normalizedZoom, 3) * 1.8;
        
        // Appliquer la transformation avec positionnement correct
        const markerElement = item.marker._icon.querySelector('.marker-pin-modern');
        if (markerElement) {
            markerElement.style.transform = `scale(${scaleFactor}) rotate(-45deg)`;
            
            // Ajustement vertical pour maintenir le point d'ancrage en bas
            const offsetY = (1 - scaleFactor) * 18;
            markerElement.style.marginTop = `${offsetY}px`;
        }
    });
}