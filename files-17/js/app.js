/**
 * Logique principale de l'application
 */

// Variables globales
let currentFilters = {};

// Initialisation au chargement du document
document.addEventListener('DOMContentLoaded', function() {
    console.log("app.js chargé - Initialisation de l'application");
    
    // Initialiser la carte
    if (document.getElementById('map')) {
        initMap();
    } else {
        console.error("Élément #map introuvable");
    }
    
    // Charger les catégories avant tout
    loadCategories().then(() => {
        // Configurer les modals et leurs écouteurs
        setupModalListeners();
        
        // Configurer les écouteurs pour les filtres
        setupFilterListeners();
        
        // Configurer les écouteurs pour les formulaires
        setupFormListeners();
        
        // Configurer les écouteurs pour les onglets
        setupTabListeners();

        // Définir les dates par défaut pour le filtre de plage de dates
        setDefaultDateRange();
        
        // Configurer les contrôles modernes
        setupAddEventControls();
    });
});

// Configuration des contrôles de prix et de places
function setupAddEventControls() {
    // Contrôle du prix
    const priceRange = document.getElementById('priceRange');
    const eventPrice = document.getElementById('eventPrice');
    const priceValueDisplay = document.getElementById('priceValue');
    
    if (priceRange && eventPrice && priceValueDisplay) {
        // Mettre à jour le champ numérique quand le slider change
        priceRange.addEventListener('input', function() {
            eventPrice.value = this.value;
            priceValueDisplay.textContent = this.value + ' €';
        });
        
        // Mettre à jour le slider quand le champ numérique change
        eventPrice.addEventListener('input', function() {
            const value = parseFloat(this.value);
            if (!isNaN(value)) {
                if (value > 100) {
                    this.value = 100;
                    priceRange.value = 100;
                } else if (value < 0) {
                    this.value = 0;
                    priceRange.value = 0;
                } else {
                    priceRange.value = this.value;
                }
                priceValueDisplay.textContent = this.value + ' €';
            }
        });
    }
    
    // Contrôle du nombre de places
    const placesRange = document.getElementById('placesRange');
    const eventPlaces = document.getElementById('eventPlaces');
    const placesValueDisplay = document.getElementById('placesValue');
    
    if (placesRange && eventPlaces && placesValueDisplay) {
        // Mettre à jour le champ numérique quand le slider change
        placesRange.addEventListener('input', function() {
            eventPlaces.value = this.value;
            placesValueDisplay.textContent = this.value;
        });
        
        // Mettre à jour le slider quand le champ numérique change
        eventPlaces.addEventListener('input', function() {
            const value = parseInt(this.value);
            if (!isNaN(value)) {
                if (value > 100) {
                    this.value = 100;
                    placesRange.value = 100;
                } else if (value < 1) {
                    this.value = 1;
                    placesRange.value = 1;
                } else {
                    placesRange.value = this.value;
                }
                placesValueDisplay.textContent = this.value;
            }
        });
    }
}

// Gestionnaires des modals
function setupModalListeners() {
    console.log("Configuration des modals");
    
    // Ouvrir les modals
    document.getElementById('loginBtn').addEventListener('click', function() {
        document.getElementById('loginModal').style.display = 'block';
    });
    
    document.getElementById('registerBtn').addEventListener('click', function() {
        document.getElementById('registerModal').style.display = 'block';
    });
    
    // Ouvrir le panneau de filtre latéral
    document.getElementById('filterBtn').addEventListener('click', function() {
        document.getElementById('filterPanel').classList.add('active');
    });
    
    // Fermer le panneau de filtre latéral
    document.getElementById('closeFilterBtn').addEventListener('click', function() {
        document.getElementById('filterPanel').classList.remove('active');
    });
    
    // Fermer les modals en cliquant sur la croix
    document.querySelectorAll('.close').forEach(button => {
        button.addEventListener('click', function(event) {
            event.stopPropagation();
            const modalId = this.getAttribute('data-modal');
            document.getElementById(modalId).style.display = 'none';
        });
    });
    
    // Fermer les modals en cliquant en dehors
    window.addEventListener('click', function(evt) {
        document.querySelectorAll('.modal').forEach(modal => {
            if (evt.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Empêcher la propagation du clic depuis le contenu des modals
    document.querySelectorAll('.modal-content').forEach(content => {
        content.addEventListener('click', function(evt) {
            evt.stopPropagation();
        });
    });
    
    // Désactiver le scroll du body quand une modal est ouverte
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'style') {
                const displayStyle = mutation.target.style.display;
                if (displayStyle === 'block') {
                    document.body.classList.add('modal-open');
                } else if (displayStyle === 'none') {
                    // Vérifier si d'autres modals sont ouvertes
                    const anyModalOpen = Array.from(document.querySelectorAll('.modal')).some(m => m.style.display === 'block');
                    if (!anyModalOpen) {
                        document.body.classList.remove('modal-open');
                    }
                }
            }
        });
    });
    
    document.querySelectorAll('.modal').forEach(modal => {
        observer.observe(modal, { attributes: true });
    });
}

// Définir les dates par défaut pour le filtre de plage de dates
function setDefaultDateRange() {
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    
    if (startDateFilter && endDateFilter) {
        // Date d'aujourd'hui
        const today = new Date();
        const startDate = formatDateForInput(today);
        
        // Date dans 60 jours
        const endDate = new Date();
        endDate.setDate(today.getDate() + 60);
        const endDateFormatted = formatDateForInput(endDate);
        
        // Définir les valeurs par défaut
        startDateFilter.value = startDate;
        endDateFilter.value = endDateFormatted;
    }
}

// Formater une date pour l'entrée de type date (YYYY-MM-DD)
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Gestionnaires pour les filtres
function setupFilterListeners() {
    console.log("Configuration des filtres");
    
    // Récupérer les éléments de filtre
    const applyFiltersBtn = document.getElementById('applyFilters');
    const resetFiltersBtn = document.getElementById('resetFilters');
    const searchInput = document.getElementById('searchInput');
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    const freeEventsOnly = document.getElementById('freeEventsOnly');
    const childrenEventsOnly = document.getElementById('childrenEventsOnly');
    const hideFullEvents = document.getElementById('hideFullEvents');
    
    // Appliquer les filtres au clic sur le bouton
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', function() {
            applyFilters();
            document.getElementById('filterPanel').classList.remove('active');
        });
    }
    
    // Réinitialiser les filtres au clic sur le bouton
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', function() {
            // Réinitialiser tous les champs de filtre
            if (searchInput) searchInput.value = '';
            if (freeEventsOnly) freeEventsOnly.checked = false;
            if (childrenEventsOnly) childrenEventsOnly.checked = false;
            if (hideFullEvents) hideFullEvents.checked = false;
            
            // Réinitialiser la plage de dates à la plage par défaut
            setDefaultDateRange();
            
            // Appliquer les filtres réinitialisés
            applyFilters();
            
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
                // Si on est dans le panneau de filtre, ne pas appliquer immédiatement
                if (!document.getElementById('filterPanel').classList.contains('active')) {
                    applyFilters();
                }
            }, 300);
        });
    }
    
    // Filtrer lorsqu'on change les dates
    if (startDateFilter) {
        startDateFilter.addEventListener('change', function() {
            if (!document.getElementById('filterPanel').classList.contains('active')) {
                applyFilters();
            }
        });
    }
    
    if (endDateFilter) {
        endDateFilter.addEventListener('change', function() {
            if (!document.getElementById('filterPanel').classList.contains('active')) {
                applyFilters();
            }
        });
    }
    
    // Filtrer lorsqu'on change les options à cocher
    [freeEventsOnly, childrenEventsOnly, hideFullEvents].forEach(checkbox => {
        if (checkbox) {
            checkbox.addEventListener('change', function() {
                if (!document.getElementById('filterPanel').classList.contains('active')) {
                    applyFilters();
                }
            });
        }
    });
}

// Appliquer les filtres actuels
function applyFilters() {
    // Récupérer les valeurs des filtres
    const filters = getFiltersFromForm();
    
    // Stocker les filtres actuels
    currentFilters = filters;
    
    // Appliquer les filtres et compter les résultats
    const visibleEvents = filterEvents(filters);
    
    // Afficher un message de résultat
    showFilterResults(visibleEvents);
}

// Afficher le nombre de résultats de filtrage
function showFilterResults(count) {
    if (count === 0) {
        showNotification(`Aucun événement ne correspond à vos critères`, 'info');
    } else {
        showNotification(`${count} événement${count > 1 ? 's' : ''} correspond${count > 1 ? 'ent' : ''} à vos critères`, 'success');
    }
}

// Gestionnaires pour les formulaires
function setupFormListeners() {
    console.log("Configuration des formulaires");
    
    // Gestion de l'affichage/masquage de la date de fin
    const toggleEndDateBtn = document.getElementById('toggleEndDateBtn');
    if (toggleEndDateBtn) {
        toggleEndDateBtn.addEventListener('click', function() {
            const endDateGroup = document.getElementById('endDateGroup');
            if (endDateGroup.classList.contains('hidden')) {
                endDateGroup.classList.remove('hidden');
                this.innerHTML = '<i class="fas fa-minus-circle"></i> Retirer la date de fin';
            } else {
                endDateGroup.classList.add('hidden');
                document.getElementById('eventEndDate').value = '';
                this.innerHTML = '<i class="fas fa-plus-circle"></i> Ajouter une date de fin';
            }
        });
    }
    
    // Gestion de l'affichage/masquage du champ de prix
    const isPaid = document.getElementById('isPaid');
    if (isPaid) {
        isPaid.addEventListener('change', function() {
            const priceGroup = document.getElementById('priceGroup');
            if (this.checked) {
                priceGroup.classList.add('shown');
                // Réinitialiser le curseur du prix
                document.getElementById('priceRange').value = 0;
                document.getElementById('eventPrice').value = 0;
                document.getElementById('priceValue').textContent = '0 €';
            } else {
                priceGroup.classList.remove('shown');
                document.getElementById('priceRange').value = 0;
                document.getElementById('eventPrice').value = 0;
                document.getElementById('priceValue').textContent = '0 €';
            }
        });
    }
    
    // Gestion de l'affichage/masquage du champ de places limitées
    const isLimited = document.getElementById('isLimited');
    if (isLimited) {
        isLimited.addEventListener('change', function() {
            const placesGroup = document.getElementById('placesGroup');
            if (this.checked) {
                placesGroup.classList.add('shown');
                // Réinitialiser le curseur des places
                document.getElementById('placesRange').value = 10;
                document.getElementById('eventPlaces').value = 10;
                document.getElementById('placesValue').textContent = '10';
            } else {
                placesGroup.classList.remove('shown');
                document.getElementById('placesRange').value = 10;
                document.getElementById('eventPlaces').value = 10;
                document.getElementById('placesValue').textContent = '10';
            }
        });
    }
    
    // Formulaire d'ajout d'événement
    const addEventForm = document.getElementById('addEventForm');
    if (addEventForm) {
        addEventForm.addEventListener('submit', function(evt) {
            evt.preventDefault();
            
            // Vérifier si l'utilisateur est connecté
            if (!currentUser) {
                showNotification('Veuillez vous connecter pour créer un événement', 'info');
                document.getElementById('addEventModal').style.display = 'none';
                document.getElementById('loginModal').style.display = 'block';
                return;
            }
            
            // NOUVEAU - Vérifier qu'une catégorie est sélectionnée
            const categoryId = document.getElementById('selectedCategoryId').value;
            if (!categoryId) {
                showNotification('Veuillez sélectionner une catégorie pour l\'événement', 'error');
                return;
            }
            
            // Récupérer les formulaires
            const title = document.getElementById('eventTitle').value.trim();
            const startDate = document.getElementById('eventStartDate').value;
            const endDate = document.getElementById('eventEndDate').value || null;
            const description = document.getElementById('eventDescription').value.trim();
            const location = document.getElementById('eventLocation').value.trim();
            const lat = parseFloat(document.getElementById('eventLat').value);
            const lng = parseFloat(document.getElementById('eventLng').value);
            
            const isPaid = document.getElementById('isPaid').checked;
            const price = isPaid ? parseFloat(document.getElementById('eventPrice').value) : 0;
            
            const isLimited = document.getElementById('isLimited').checked;
            const places = isLimited ? parseInt(document.getElementById('eventPlaces').value) : null;
            
            const isChildrenOnly = document.getElementById('isChildrenOnly').checked;
            
            // Validation des données
            if (!title) {
                showNotification('Veuillez saisir un titre pour l\'événement', 'error');
                return;
            }
            
            if (!startDate) {
                showNotification('Veuillez saisir une date de début', 'error');
                return;
            }
            
            if (!description) {
                showNotification('Veuillez saisir une description', 'error');
                return;
            }
            
            if (!location || isNaN(lat) || isNaN(lng)) {
                showNotification('Veuillez sélectionner un emplacement sur la carte', 'error');
                return;
            }
            
            if (isPaid && (isNaN(price) || price <= 0)) {
                showNotification('Veuillez saisir un prix valide', 'error');
                return;
            }
            
            if (isLimited && (isNaN(places) || places <= 0)) {
                showNotification('Veuillez saisir un nombre de places valide', 'error');
                return;
            }
            
            // Créer l'objet événement
            const eventData = {
                title,
                startDate,
                endDate,
                description,
                location,
                lat,
                lng,
                isPaid,
                price,
                isLimited,
                places,
                isChildrenOnly,
                createdBy: currentUser.id,
                // AJOUT - Catégorie de l'événement
                categoryId: parseInt(categoryId)
            };
                
            // Montrer le loader
            document.getElementById('page-loader').classList.remove('hidden');
            
            // Envoyer l'événement au serveur
            fetch('api/events.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'create',
                    event: eventData
                })
            })
            .then(response => response.json())
            .then(data => {
                // Cacher le loader
                document.getElementById('page-loader').classList.add('hidden');
                
                if (data.success) {
                    // Fermer la modal
                    document.getElementById('addEventModal').style.display = 'none';
                    
                    // Réinitialiser le formulaire
                    document.getElementById('addEventForm').reset();
                    
                    // MODIFICATION: Récupérer les informations de catégorie et les ajouter à l'événement créé
                    if (data.event && data.event.id) {
                        // Trouver la catégorie sélectionnée
                        const selectedCategory = allCategories.find(cat => cat.id == eventData.categoryId);
                        
                        if (selectedCategory) {
                            // Ajouter les propriétés de catégorie à l'événement
                            data.event.categoryColor = selectedCategory.color;
                            data.event.categoryIcon = selectedCategory.icon;
                            data.event.categoryName = selectedCategory.name;
                        }
                        
                        // Ajouter l'événement à la variable globale events
                        if (typeof events !== 'undefined' && Array.isArray(events)) {
                            events.push(data.event);
                        }
                    }
                    
                    // Recharger les événements sur la carte
                    loadEvents();
                    
                    // Notification
                    showNotification('Événement créé avec succès!', 'success');
                    
                    // Confetti pour célébrer la création
                    confetti({
                        particleCount: 100,
                        spread: 70,
                        origin: { y: 0.6 }
                    });
                } else {
                    showNotification(data.message || 'Erreur lors de la création de l\'événement', 'error');
                }
            })
            .catch(error => {
                // Cacher le loader
                document.getElementById('page-loader').classList.add('hidden');
                
                console.error('Erreur lors de la création de l\'événement:', error);
                showNotification('Une erreur s\'est produite lors de la création de l\'événement', 'error');
            });
        });
    }
    
    // Inscription à un événement
    const registerEventBtn = document.getElementById('registerEventBtn');
    if (registerEventBtn) {
        registerEventBtn.addEventListener('click', function() {
            // Vérifier si l'utilisateur est connecté
            if (!currentUser) {
                showNotification('Veuillez vous connecter pour vous inscrire à cet événement', 'info');
                document.getElementById('eventDetailsModal').style.display = 'none';
                document.getElementById('loginModal').style.display = 'block';
                return;
            }
            
            // Afficher le formulaire de sélection des participants
            registerEventBtn.classList.add('hidden');
            document.getElementById('eventRegistrationForm').classList.remove('hidden');
            
            // Générer les options pour les enfants
            generateChildrenOptions();
        });
    }
    
    // Confirmation d'inscription
    const confirmRegistrationBtn = document.getElementById('confirmRegistrationBtn');
    if (confirmRegistrationBtn) {
        confirmRegistrationBtn.addEventListener('click', function() {
            const eventId = document.getElementById('registerEventBtn').getAttribute('data-id');
            registerSelectedParticipants(eventId);
        });
    }
    
    // Annulation d'inscription
    const cancelRegistrationBtn = document.getElementById('cancelRegistrationBtn');
    if (cancelRegistrationBtn) {
        cancelRegistrationBtn.addEventListener('click', function() {
            // Cacher le formulaire et afficher le bouton d'inscription
            document.getElementById('eventRegistrationForm').classList.add('hidden');
            document.getElementById('registerEventBtn').classList.remove('hidden');
        });
    }
    
    // Bouton de suppression d'événement
    const deleteEventBtn = document.getElementById('deleteEventBtn');
    if (deleteEventBtn) {
        deleteEventBtn.addEventListener('click', function() {
            const eventId = document.getElementById('registerEventBtn').getAttribute('data-id');
            confirmDeleteEvent(eventId);
            // La modal de détails reste ouverte jusqu'à la confirmation/annulation
        });
    }
    
    // Bouton de modification d'événement
    const editEventBtn = document.getElementById('editEventBtn');
    if (editEventBtn) {
        editEventBtn.addEventListener('click', function() {
            const eventId = document.getElementById('registerEventBtn').getAttribute('data-id');
            showNotification('La modification d\'événements sera disponible dans une prochaine mise à jour', 'info');
        });
    }
    
    // Formulaire d'ajout de commentaire
    const addCommentForm = document.getElementById('addCommentForm');
    if (addCommentForm) {
        addCommentForm.addEventListener('submit', function(evt) {
            evt.preventDefault();
            
            // Vérifier si l'utilisateur est connecté
            if (!currentUser) {
                showNotification('Veuillez vous connecter pour ajouter un commentaire', 'info');
                document.getElementById('eventDetailsModal').style.display = 'none';
                document.getElementById('loginModal').style.display = 'block';
                return;
            }
            
            // Récupérer les données du formulaire
            const content = document.getElementById('commentContent').value.trim();
            const eventId = document.getElementById('registerEventBtn').getAttribute('data-id');
            
            console.log('Ajout commentaire pour événement ID:', eventId);  // Débogage
            
            // Validation
            if (!content) {
                showNotification('Veuillez saisir un commentaire', 'error');
                return;
            }
            
            // Montrer le loader
            document.getElementById('page-loader').classList.remove('hidden');
            
            // Envoyer le commentaire
            fetch('api/comments.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'create',
                    eventId: String(eventId),  // S'assurer que l'ID est une chaîne
                    userId: currentUser.id,
                    content: content,
                    userData: {
                        firstname: currentUser.firstname,
                        lastname: currentUser.lastname,
                        email: currentUser.email || ''
                    }
                })
            })
            .then(response => response.text())  // Récupérer d'abord le texte brut
            .then(text => {
                console.log('Réponse API commentaire:', text);  // Débogage
                
                // Cacher le loader
                document.getElementById('page-loader').classList.add('hidden');
                
                try {
                    const data = JSON.parse(text);
                    
                    if (data.success) {
                        // Réinitialiser le formulaire
                        document.getElementById('commentContent').value = '';
                        
                        // Recharger les commentaires avec un petit délai
                        setTimeout(() => {
                            console.log('Rechargement des commentaires pour ID:', eventId);
                            loadComments(eventId);
                        }, 300);
                        
                        // Notification
                        showNotification('Commentaire ajouté avec succès', 'success');
                    } else {
                        showNotification(data.message || 'Erreur lors de l\'ajout du commentaire', 'error');
                    }
                } catch (e) {
                    console.error('Erreur lors du parsing de la réponse:', e);
                    showNotification('Erreur lors du traitement de la réponse', 'error');
                }
            })
            .catch(error => {
                // Cacher le loader
                document.getElementById('page-loader').classList.add('hidden');
                
                console.error('Erreur lors de l\'ajout du commentaire:', error);
                showNotification('Une erreur s\'est produite lors de l\'ajout du commentaire', 'error');
            });
        });
    }
    
    // Bouton pour se connecter depuis l'invitation à commenter
    const loginToCommentBtn = document.getElementById('loginToComment');
    if (loginToCommentBtn) {
        loginToCommentBtn.addEventListener('click', function() {
            // Fermer la modal des détails de l'événement
            document.getElementById('eventDetailsModal').style.display = 'none';
            
            // Ouvrir la modal de connexion
            document.getElementById('loginModal').style.display = 'block';
        });
    }
}

// Configuration des onglets
function setupTabListeners() {
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', function() {
            // Récupérer l'ID de l'onglet à afficher
            const tabId = this.getAttribute('data-tab');
            
            // Mettre à jour les classes des boutons
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            
            // Mettre à jour les onglets visibles
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.getElementById(tabId).classList.add('active');
            
            // Cas spécifique: Si on affiche l'onglet des participants, charger la liste
            if (tabId === 'participants-tab') {
                const eventId = document.getElementById('registerEventBtn').getAttribute('data-id');
                if (eventId) {
                    loadParticipants(eventId);
                }
            }
            
            // Cas spécifique: Si on affiche l'onglet de discussion, charger les commentaires
            if (tabId === 'discussion-tab') {
                const eventId = document.getElementById('registerEventBtn').getAttribute('data-id');
                if (eventId) {
                    loadComments(eventId);
                }
            }
            
            // Cas spécifique: Si on affiche l'onglet des événements créés/inscrits
            if (tabId === 'created-events-tab' || tabId === 'registered-events-tab') {
                if (currentUser) {
                    loadUserEvents(currentUser.id);
                }
            }
        });
    });
}

// Fonction pour charger les participants d'un événement
function loadParticipants(eventId) {
    const participantsList = document.getElementById('participantsList');
    participantsList.innerHTML = '<div class="loading-indicator"><i class="fas fa-circle-notch fa-spin"></i> Chargement des participants...</div>';
    
    // Récupérer les inscriptions pour cet événement
    fetch(`api/registrations.php?eventId=${eventId}`)
        .then(response => response.json())
        .then(data => {
            console.log("Données des participants:", data);
            
            if (data.success && data.registrations) {
                const registrations = data.registrations;
                const count = registrations.length;
                document.getElementById('participantsCount').textContent = count;
                
                if (count > 0) {
                    // Organiser les participants par famille
                    const familyGroups = {};
                    
                    registrations.forEach(registration => {
                        const userId = registration.userId;
                        
                        // Initialiser le groupe familial s'il n'existe pas
                        if (!familyGroups[userId]) {
                            familyGroups[userId] = {
                                adults: [],
                                children: [],
                                user: registration.user
                            };
                        }
                        
                        // Ajouter le participant au bon groupe
                        if (registration.participantType === 'adult') {
                            familyGroups[userId].adults.push(registration);
                        } else if (registration.participantType === 'child') {
                            familyGroups[userId].children.push(registration);
                        }
                    });
                    
                    // Générer le HTML pour les participants
                    let html = '';
                    
                    Object.values(familyGroups).forEach(family => {
                        const parentName = family.user ? `${family.user.firstname} ${family.user.lastname}` : 'Inconnu';
                        const parentInitials = family.user ? family.user.firstname.charAt(0) + family.user.lastname.charAt(0) : '??';
                        
                        // Créer une section famille
                        html += `<div class="family-group">`;
                        
                        // Afficher le parent/adulte s'il est inscrit
                        if (family.adults.length > 0) {
                            const adult = family.adults[0];
                            const regDate = new Date(adult.registeredAt);
                            const formattedDate = regDate.toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                            });
                            
                            html += `
                                <div class="participant-item">
                                    <div class="participant-avatar">${parentInitials}</div>
                                    <div class="participant-info">
                                        <div class="participant-name">${parentName}</div>
                                        <div class="participant-date">Inscrit(e) le ${formattedDate}</div>
                                    </div>
                                </div>
                            `;
                        } else if (family.children.length > 0) {
                            // Si le parent n'est pas inscrit mais qu'il a des enfants inscrits,
                            // on affiche quand même une entrée pour la famille
                            html += `
                                <div class="participant-item family-header">
                                    <div class="participant-avatar">${parentInitials}</div>
                                    <div class="participant-info">
                                        <div class="participant-name">Famille ${parentName}</div>
                                    </div>
                                </div>
                            `;
                        }
                        
                        // Afficher les enfants
                        family.children.forEach(registration => {
                            // Chercher les informations de l'enfant
                            let childName = 'Enfant';
                            let childBirthdate = '';
                            
                            // Vérifier dans childData ou dans les enfants de l'utilisateur
                            if (registration.childData) {
                                childName = registration.childData.firstname;
                                childBirthdate = registration.childData.birthdate;
                            } else if (family.user && family.user.children) {
                                const childId = registration.participantId;
                                const child = family.user.children.find(c => c.id === childId);
                                if (child) {
                                    childName = child.firstname;
                                    childBirthdate = child.birthdate;
                                }
                            }
                            
                            // Calculer l'âge si on a la date de naissance
                            let ageText = '';
                            if (childBirthdate) {
                                const birthDate = new Date(childBirthdate);
                                const today = new Date();
                                let age = today.getFullYear() - birthDate.getFullYear();
                                const m = today.getMonth() - birthDate.getMonth();
                                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                                    age--;
                                }
                                ageText = ` (${age} ans)`;
                            }
                            
                            const childInitial = childName.charAt(0);
                            const regDate = new Date(registration.registeredAt);
                            const formattedDate = regDate.toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                            });
                            
                            html += `
                                <div class="participant-item participant-child">
                                    <div class="participant-avatar child-avatar">${childInitial}</div>
                                    <div class="participant-info">
                                        <div class="participant-name">
                                            <span class="parent-child-relation">${parentName} <i class="fas fa-chevron-right"></i> </span>
                                            ${childName}${ageText}
                                        </div>
                                        <div class="participant-date">Inscrit(e) le ${formattedDate}</div>
                                    </div>
                                </div>
                            `;
                        });
                        
                        html += `</div>`; // Fermeture de family-group
                    });
                    
                    participantsList.innerHTML = html;
                } else {
                    participantsList.innerHTML = '<div class="no-participants">Aucun participant inscrit pour le moment.</div>';
                }
            } else {
                participantsList.innerHTML = '<div class="no-participants">Impossible de charger la liste des participants.</div>';
            }
        })
        .catch(error => {
            console.error('Erreur lors du chargement des participants:', error);
            participantsList.innerHTML = '<div class="no-participants">Erreur lors du chargement des participants.</div>';
        });
}

// Fonction pour générer les options pour les enfants lors d'une inscription
function generateChildrenOptions() {
    const childrenOptions = document.getElementById('childrenOptions');
    childrenOptions.innerHTML = ''; // Vider les options existantes
    
    // Récupérer l'ID de l'événement
    const eventId = document.getElementById('registerEventBtn').getAttribute('data-id');
    
    // Trouver les données de l'événement
    const eventData = eventMarkers.find(item => item.event.id === eventId)?.event;
    
    // Vérifier si l'événement existe
    if (!eventData) return;
    
    // Pour les événements réservés aux enfants, désactiver l'option "Moi-même"
    const registerSelfCheckbox = document.getElementById('registerSelf');
    if (eventData.isChildrenOnly && registerSelfCheckbox) {
        registerSelfCheckbox.checked = false;
        registerSelfCheckbox.disabled = true;
        registerSelfCheckbox.parentElement.parentElement.classList.add('disabled-option');
        
        // Ajouter une indication visuelle
        const disabledInfo = document.createElement('span');
        disabledInfo.className = 'disabled-info';
        disabledInfo.textContent = '(Événement réservé aux enfants)';
        registerSelfCheckbox.parentElement.appendChild(disabledInfo);
    } else if (registerSelfCheckbox) {
        // Réinitialiser l'option si ce n'est pas un événement pour enfants
        registerSelfCheckbox.disabled = false;
        registerSelfCheckbox.checked = true;
        registerSelfCheckbox.parentElement.parentElement.classList.remove('disabled-option');
        
        // Supprimer l'info de désactivation si elle existe
        const existingInfo = registerSelfCheckbox.parentElement.querySelector('.disabled-info');
        if (existingInfo) {
            existingInfo.remove();
        }
    }
    
    // Vérifier si l'utilisateur a des enfants
    if (currentUser.children && currentUser.children.length > 0) {
        currentUser.children.forEach(child => {
            // Calculer l'âge de l'enfant
            const birthDate = new Date(child.birthdate);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            
            // Créer l'option pour cet enfant
            const childOption = document.createElement('div');
            childOption.className = 'participant-option';
            childOption.innerHTML = `
                <label>
                    <input type="checkbox" class="child-checkbox" data-child-id="${child.id}" checked>
                    <span>${child.firstname}</span>
                </label>
                <span class="participant-info">${age} ans</span>
            `;
            
            childrenOptions.appendChild(childOption);
        });
    } else {
        // Aucun enfant
        childrenOptions.innerHTML = '<p class="hint-text">Aucun enfant enregistré. Vous pouvez ajouter des enfants depuis votre profil.</p>';
    }
}

// Fonction pour inscrire les participants sélectionnés
function registerSelectedParticipants(eventId) {
    // Vérifier si l'utilisateur est inscrit lui-même
    const registerSelf = document.getElementById('registerSelf').checked && !document.getElementById('registerSelf').disabled;
    
    // Récupérer les enfants sélectionnés
    const selectedChildren = [];
    const childCheckboxes = document.querySelectorAll('.child-checkbox:checked');
    childCheckboxes.forEach(checkbox => {
        selectedChildren.push(checkbox.getAttribute('data-child-id'));
    });
    
    // Vérifier qu'au moins un participant est sélectionné
    if (!registerSelf && selectedChildren.length === 0) {
        showNotification('Veuillez sélectionner au moins un participant', 'error');
        return;
    }
    
    // Montrer le loader
    document.getElementById('page-loader').classList.remove('hidden');
    
    // Préparer les données pour l'inscription
    const registrationData = {
        action: 'register',
        eventId: eventId,
        userId: currentUser.id,
        registerSelf: registerSelf,
        children: selectedChildren
    };
    
    // Envoyer la requête d'inscription
    fetch('api/registrations.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(registrationData)
    })
    .then(response => response.json())
    .then(data => {
        // Cacher le loader
        document.getElementById('page-loader').classList.add('hidden');
        
        if (data.success) {
            // Fermer la modal
            document.getElementById('eventDetailsModal').style.display = 'none';
            
            // Réinitialiser le formulaire
            document.getElementById('eventRegistrationForm').classList.add('hidden');
            document.getElementById('registerEventBtn').classList.remove('hidden');
            
            // Confettis pour célébrer l'inscription
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 }
            });
            
            // Notification
            showNotification(data.message || 'Inscription réussie !', 'success');
            
            // Recharger les événements pour mettre à jour les places disponibles
            loadEvents();
        } else {
            showNotification(data.message || 'Erreur lors de l\'inscription', 'error');
        }
    })
    .catch(error => {
        // Cacher le loader
        document.getElementById('page-loader').classList.add('hidden');
        
        console.error('Erreur lors de l\'inscription:', error);
        showNotification('Une erreur s\'est produite lors de l\'inscription', 'error');
    });
}

// Fonction pour afficher les notifications
window.showNotification = function(message, type = 'info') {
    // Créer l'élément de notification s'il n'existe pas déjà
    let notifContainer = document.getElementById('notification-container');
    
    if (!notifContainer) {
        notifContainer = document.createElement('div');
        notifContainer.id = 'notification-container';
        document.body.appendChild(notifContainer);
    }
    
    // Créer la notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Icône en fonction du type
    let icon = '';
    if (type === 'success') icon = '<i class="fas fa-check-circle"></i> ';
    else if (type === 'error') icon = '<i class="fas fa-exclamation-circle"></i> ';
    else icon = '<i class="fas fa-info-circle"></i> ';
    
    notification.innerHTML = `${icon} ${message}`;
    
    // Ajouter la notification au conteneur
    notifContainer.appendChild(notification);
    
    // Auto-suppression après quelques secondes
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            if (notification.parentNode === notifContainer) {
                notifContainer.removeChild(notification);
            }
        }, 400);
    }, 4000);
};

// Fonction utilitaire pour fermer toutes les modals
window.closeAllModals = function() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    
    document.body.classList.remove('modal-open');
};

// Définir la date/heure actuelle pour le formulaire d'ajout d'événement
// Cette fonction est appelée quand la modal est ouverte
function setCurrentDateTimeForEventForm() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    
    // Ajouter 1 heure à la date actuelle pour donner un délai minimal
    now.setHours(now.getHours() + 1);
    
    // Formater en YYYY-MM-DDThh:mm
    const formattedDateTime = now.toISOString().slice(0, 16);
    
    // Définir comme valeur par défaut pour la date de début
    const eventStartDate = document.getElementById('eventStartDate');
    if (eventStartDate && !eventStartDate.value) {
        eventStartDate.value = formattedDateTime;
    }
}

// Récupérer les filtres à partir du formulaire
function getFiltersFromForm() {
    const searchInput = document.getElementById('searchInput');
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    const freeEventsOnly = document.getElementById('freeEventsOnly');
    const childrenEventsOnly = document.getElementById('childrenEventsOnly');
    const hideFullEvents = document.getElementById('hideFullEvents');
    
    return {
        text: searchInput?.value || '',
        startDate: startDateFilter?.value || '',
        endDate: endDateFilter?.value || '',
        freeOnly: freeEventsOnly?.checked || false,
        childrenOnly: childrenEventsOnly?.checked || false,
        hideFullEvents: hideFullEvents?.checked || false
    };
}

// Confirmer la suppression d'un événement
function confirmDeleteEvent(eventId) {
    const confirmModal = document.getElementById('confirmModal');
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmYesBtn = document.getElementById('confirmYesBtn');
    const confirmNoBtn = document.getElementById('confirmNoBtn');
    
    confirmTitle.textContent = 'Supprimer l\'événement';
    confirmMessage.textContent = 'Êtes-vous sûr de vouloir supprimer cet événement? Cette action est irréversible.';
    
    // Afficher la modal de confirmation
    confirmModal.style.display = 'block';
    
    // Configurer les boutons
    confirmYesBtn.onclick = function() {
        deleteEvent(eventId);
        confirmModal.style.display = 'none';
    };
    
    confirmNoBtn.onclick = function() {
        confirmModal.style.display = 'none';
    };
}

// Confirmer la désinscription à un événement
function confirmUnregisterEvent(registrationId, eventId) {
    const confirmModal = document.getElementById('confirmModal');
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmYesBtn = document.getElementById('confirmYesBtn');
    const confirmNoBtn = document.getElementById('confirmNoBtn');
    
    confirmTitle.textContent = 'Se désinscrire de l\'événement';
    confirmMessage.textContent = 'Êtes-vous sûr de vouloir vous désinscrire de cet événement?';
    
    // Afficher la modal de confirmation
    confirmModal.style.display = 'block';
    
    // Configurer les boutons
    confirmYesBtn.onclick = function() {
        unregisterFromEvent(registrationId, eventId);
        confirmModal.style.display = 'none';
    };
    
    confirmNoBtn.onclick = function() {
        confirmModal.style.display = 'none';
    };
}

// Supprimer un événement
function deleteEvent(eventId) {
    if (!currentUser) return;
    
    // Montrer le loader
    document.getElementById('page-loader').classList.remove('hidden');
    
    fetch('api/events.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'delete',
            eventId: eventId,
            userId: currentUser.id
        })
    })
    .then(response => response.json())
    .then(data => {
        // Cacher le loader
        document.getElementById('page-loader').classList.add('hidden');
        
        if (data.success) {
            // Fermer la modal de détails si elle est ouverte
            document.getElementById('eventDetailsModal').style.display = 'none';
            
            // Recharger les événements
            loadEvents();
            
            // Mettre à jour la liste des événements dans "Mes événements"
            if (document.getElementById('myEventsModal').style.display === 'block') {
                loadUserEvents(currentUser.id);
            }
            
            showNotification('Événement supprimé avec succès', 'success');
        } else {
            showNotification(data.message || 'Erreur lors de la suppression de l\'événement', 'error');
        }
    })
    .catch(error => {
        // Cacher le loader
        document.getElementById('page-loader').classList.add('hidden');
        
        console.error('Erreur lors de la suppression de l\'événement:', error);
        showNotification('Une erreur s\'est produite lors de la suppression de l\'événement', 'error');
    });
}

// Se désinscrire d'un événement
function unregisterFromEvent(registrationId, eventId) {
    if (!currentUser) return;
    
    // Montrer le loader
    document.getElementById('page-loader').classList.remove('hidden');
    
    fetch('api/registrations.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'unregister',
            registrationId: registrationId,
            eventId: eventId,
            userId: currentUser.id
        })
    })
    .then(response => response.json())
    .then(data => {
        // Cacher le loader
        document.getElementById('page-loader').classList.add('hidden');
        
        if (data.success) {
            // Recharger les événements
            loadEvents();
            
            // Mettre à jour la liste des événements dans "Mes événements"
            if (document.getElementById('myEventsModal').style.display === 'block') {
                loadUserEvents(currentUser.id);
            }
            
            showNotification('Désinscription réussie', 'success');
        } else {
            showNotification(data.message || 'Erreur lors de la désinscription', 'error');
        }
    })
    .catch(error => {
        // Cacher le loader
        document.getElementById('page-loader').classList.add('hidden');
        
        console.error('Erreur lors de la désinscription:', error);
        showNotification('Une erreur s\'est produite lors de la désinscription', 'error');
    });
}

// DISCUSSIONS
// Charger les commentaires d'un événement
function loadComments(eventId) {
    const commentsList = document.getElementById('commentsList');
    commentsList.innerHTML = '<div class="loading-indicator"><i class="fas fa-circle-notch fa-spin"></i> Chargement des commentaires...</div>';
    
    fetch(`api/comments.php?eventId=${eventId}`)
        .then(response => response.text())  // Modification ici pour voir la réponse brute
        .then(text => {
            console.log('Réponse brute de l\'API commentaires:', text);
            try {
                const data = JSON.parse(text);
                console.log('Données parsées:', data);  // Débogage
                
                if (data.success && data.comments) {
                    console.log('Commentaires trouvés:', data.comments.length);  // Débogage
                    displayComments(data.comments);
                } else {
                    console.log('Aucun commentaire ou erreur:', data.message);  // Débogage
                    commentsList.innerHTML = '<div class="no-comments"><i class="far fa-comments"></i><p>Aucun commentaire pour le moment.<br>Soyez le premier à participer à la discussion !</p></div>';
                    document.getElementById('commentsCount').textContent = '0';
                }
                
                // Mise à jour de l'affichage du formulaire
                updateCommentFormDisplay();
            } catch (e) {
                console.error('Erreur lors du parsing JSON:', e);
                commentsList.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Erreur lors du traitement des données</div>';
            }
        })
        .catch(error => {
            console.error('Erreur lors du chargement des commentaires:', error);
            commentsList.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Impossible de charger les commentaires</div>';
        });
}

// Afficher les commentaires dans l'interface
function displayComments(comments) {
    const commentsList = document.getElementById('commentsList');
    
    if (!comments || comments.length === 0) {
        commentsList.innerHTML = '<div class="no-comments"><i class="far fa-comments"></i><p>Aucun commentaire pour le moment.<br>Soyez le premier à participer à la discussion !</p></div>';
        document.getElementById('commentsCount').textContent = '0';
        return;
    }
    
    // Mettre à jour le compteur de commentaires
    document.getElementById('commentsCount').textContent = comments.length.toString();
    
    // Trier les commentaires par date (plus récent au plus ancien)
    comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Générer le HTML pour tous les commentaires
    let html = '';
    
    comments.forEach(comment => {
        let authorName = 'Utilisateur inconnu';
        let authorInitials = '??';
        
        // Si le commentaire a des données utilisateur
        if (comment.user) {
            authorName = `${comment.user.firstname} ${comment.user.lastname}`;
            authorInitials = comment.user.firstname.charAt(0) + comment.user.lastname.charAt(0);
        } 
        // Si l'utilisateur est connecté et est l'auteur du commentaire
        else if (currentUser && comment.userId == currentUser.id) {
            authorName = `${currentUser.firstname} ${currentUser.lastname}`;
            authorInitials = currentUser.firstname.charAt(0) + currentUser.lastname.charAt(0);
            
            // Ajouter les données utilisateur au commentaire pour éviter de recalculer
            comment.user = {
                id: currentUser.id,
                firstname: currentUser.firstname,
                lastname: currentUser.lastname
            };
        }
        
        // Formater la date
        const commentDate = new Date(comment.createdAt);
        const formattedDate = formatCommentDate(commentDate);
        
        // Vérifier si l'utilisateur actuel est l'auteur du commentaire
        const isAuthor = currentUser && (comment.userId == currentUser.id);
        
        // Actions possibles sur le commentaire
        const actionButtons = isAuthor ? `
            <div class="comment-actions">
                <button class="comment-action-btn delete" data-comment-id="${comment.id}" title="Supprimer ce commentaire">
                    <i class="fas fa-trash"></i> Supprimer
                </button>
            </div>
        ` : '';
        
        html += `
            <div class="comment" data-comment-id="${comment.id}">
                <div class="comment-header">
                    <div class="comment-author">
                        <div class="author-avatar">${authorInitials}</div>
                        <span>${authorName}</span>
                    </div>
                    <div class="comment-date">${formattedDate}</div>
                </div>
                <div class="comment-content">${formatCommentContent(comment.content)}</div>
                ${actionButtons}
            </div>
        `;
    });
    
    commentsList.innerHTML = html;
    
    // Ajouter les écouteurs d'événements pour les boutons d'action
    document.querySelectorAll('.comment-action-btn.delete').forEach(button => {
        button.addEventListener('click', function() {
            const commentId = this.getAttribute('data-comment-id');
            confirmDeleteComment(commentId);
        });
    });
}

// Formater le contenu d'un commentaire (sécurité et mise en forme)
function formatCommentContent(content) {
    // Échapper les caractères spéciaux HTML pour éviter les injections XSS
    const escaped = content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    
    // Convertir les URLs en liens cliquables
    const withLinks = escaped.replace(
        /(https?:\/\/[^\s]+)/g, 
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    
    return withLinks;
}

// Formater la date d'un commentaire
function formatCommentDate(date) {
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) {
        return 'à l\'instant';
    } else if (diffMinutes < 60) {
        return `il y a ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
        return `il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    } else if (diffDays < 7) {
        return `il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    } else {
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}


// Mettre à jour l'affichage du formulaire de commentaire selon l'état de connexion
function updateCommentFormDisplay() {
    const commentForm = document.getElementById('addCommentForm');
    const loginPrompt = document.getElementById('commentFormPlaceholder');
    
    // Vérifier que les éléments existent avant de manipuler leurs classes
    if (!commentForm || !loginPrompt) {
        console.warn("Les éléments du formulaire de commentaire n'ont pas été trouvés dans le DOM");
        return;
    }
    
    if (currentUser) {
        // Utilisateur connecté : afficher le formulaire
        commentForm.classList.remove('hidden');
        loginPrompt.classList.add('hidden');
    } else {
        // Utilisateur non connecté : afficher l'invite de connexion
        commentForm.classList.add('hidden');
        loginPrompt.classList.remove('hidden');
    }
}

// Confirmer la suppression d'un commentaire
function confirmDeleteComment(commentId) {
    const confirmModal = document.getElementById('confirmModal');
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmYesBtn = document.getElementById('confirmYesBtn');
    const confirmNoBtn = document.getElementById('confirmNoBtn');
    
    confirmTitle.textContent = 'Supprimer ce commentaire';
    confirmMessage.textContent = 'Êtes-vous sûr de vouloir supprimer ce commentaire ? Cette action est irréversible.';
    
    // Afficher la modal de confirmation
    confirmModal.style.display = 'block';
    
    // Configurer les boutons
    confirmYesBtn.onclick = function() {
        deleteComment(commentId);
        confirmModal.style.display = 'none';
    };
    
    confirmNoBtn.onclick = function() {
        confirmModal.style.display = 'none';
    };
}

// Supprimer un commentaire
function deleteComment(commentId) {
    if (!currentUser) return;
    
    // Montrer le loader
    document.getElementById('page-loader').classList.remove('hidden');
    
    fetch('api/comments.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'delete',
            commentId: commentId,
            userId: String(currentUser.id)  // Convertir explicitement en chaîne
        })
    })
    .then(response => response.json())
    .then(data => {
        // Cacher le loader
        document.getElementById('page-loader').classList.add('hidden');
        
        if (data.success) {
            // Récupérer l'ID de l'événement actuel
            const eventId = document.getElementById('registerEventBtn').getAttribute('data-id');
            
            // Recharger les commentaires
            loadComments(eventId);
            
            showNotification('Commentaire supprimé avec succès', 'success');
        } else {
            showNotification(data.message || 'Erreur lors de la suppression du commentaire', 'error');
        }
    })
    .catch(error => {
        // Cacher le loader
        document.getElementById('page-loader').classList.add('hidden');
        
        console.error('Erreur lors de la suppression du commentaire:', error);
        showNotification('Une erreur s\'est produite lors de la suppression du commentaire', 'error');
    });
}

// Variables globales
let allCategories = [];

// Charger les catégories depuis l'API
function loadCategories() {
    return fetch('api/categories.php')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.categories) {
                allCategories = data.categories;
                renderCategorySelector();
                renderCategoryFilters();
                return allCategories;
            } else {
                console.error('Erreur lors du chargement des catégories:', data.message);
                return [];
            }
        })
        .catch(error => {
            console.error('Erreur lors du chargement des catégories:', error);
            return [];
        });
}

// Rendre le sélecteur de catégories
function renderCategorySelector() {
    const categoryGrid = document.getElementById('categoryGrid');
    if (!categoryGrid) return;
    
    let html = '';
    
    allCategories.forEach(category => {
        html += `
            <div class="category-item" data-id="${category.id}" style="border-color: ${category.color}">
                <div class="category-icon" style="background-color: ${category.color}">${category.icon}</div>
                <div class="category-name">${category.name}</div>
                <div class="category-description">${category.description}</div>
            </div>
        `;
    });
    
    categoryGrid.innerHTML = html;
    
    // Ajouter les écouteurs d'événements
    document.querySelectorAll('.category-item').forEach(item => {
        item.addEventListener('click', function() {
            const categoryId = this.getAttribute('data-id');
            selectCategory(categoryId);
        });
    });
}

// Sélectionner une catégorie
function selectCategory(categoryId) {
    // Désélectionner toutes les catégories
    document.querySelectorAll('.category-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Sélectionner la catégorie choisie
    const selectedItem = document.querySelector(`.category-item[data-id="${categoryId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
    
    // Mettre à jour l'input caché
    document.getElementById('selectedCategoryId').value = categoryId;
    
    // Mettre à jour l'affichage de la catégorie sélectionnée
    const selectedCategory = allCategories.find(cat => cat.id == categoryId);
    const displayElement = document.getElementById('selectedCategoryDisplay');
    
    if (selectedCategory && displayElement) {
        displayElement.innerHTML = `
            <div class="category-icon" style="background-color: ${selectedCategory.color}">${selectedCategory.icon}</div>
            <div>
                <strong>${selectedCategory.name}</strong>
                <p>${selectedCategory.description}</p>
            </div>
        `;
    }
}

// Générer les filtres de catégories
function renderCategoryFilters() {
    const filterContainer = document.getElementById('categoryFilter');
    if (!filterContainer) return;
    
    // Ajouter le filtre "Toutes les catégories"
    let html = `
        <div class="category-filter-item active" data-id="all">
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
    
    // Ajouter les écouteurs d'événements
    document.querySelectorAll('.category-filter-item').forEach(item => {
        item.addEventListener('click', function() {
            const categoryId = this.getAttribute('data-id');
            
            // Mettre à jour l'état actif des filtres
            document.querySelectorAll('.category-filter-item').forEach(el => {
                el.classList.remove('active');
            });
            this.classList.add('active');
            
            // Appliquer le filtre de catégorie
            filterMapByCategory(categoryId);
        });
    });
}

// Filtrer les événements par catégorie
function filterMapByCategory(categoryId) {
    // Déboguer pour voir le contenu de la variable events
    console.log("Filtrage par catégorie:", categoryId);
    console.log("Nombre d'événements disponibles:", events ? events.length : 0);
    
    // Vérifier si la variable events est définie
    if (!events || !Array.isArray(events)) {
        console.error("La variable events n'est pas disponible ou n'est pas un tableau");
        return 0;
    }
    
    // Supprimer tous les marqueurs actuels
    clearEventMarkers();
    
    // Obtenir les autres filtres actifs
    const otherFilters = getFiltersFromForm();
    
    let filteredEvents = [];
    
    // Si "all", appliquer uniquement les autres filtres
    if (categoryId === 'all') {
        filteredEvents = events.filter(event => shouldShowEvent(event, otherFilters));
    } else {
        // Filtrer par catégorie et autres critères
        filteredEvents = events.filter(event => {
            // Debug pour voir les catégories des événements
            console.log(`Événement ID ${event.id}: catégorie ${event.categoryId}, recherche catégorie ${categoryId}`);
            return String(event.categoryId) === String(categoryId) && shouldShowEvent(event, otherFilters);
        });
    }
    
    console.log(`${filteredEvents.length} événements trouvés après filtrage par catégorie ${categoryId}`);
    
    // Ajouter les marqueurs pour les événements filtrés
    filteredEvents.forEach(event => {
        addEventMarker(event);
    });
    
    // Si aucun résultat, afficher un message
    if (filteredEvents.length === 0) {
        showNotification(`Aucun événement trouvé dans cette catégorie`, 'info');
    }
    
    // Retourner le nombre d'événements filtrés pour affichage
    return filteredEvents.length;
}

// Fonction auxiliaire pour déterminer si un événement doit être affiché selon les filtres
function shouldShowEvent(event, filters) {
    // Filtre par texte
    if (filters.text && !event.title.toLowerCase().includes(filters.text.toLowerCase()) && 
        !event.description.toLowerCase().includes(filters.text.toLowerCase())) {
        return false;
    }
    
    // Filtre par événements gratuits
    if (filters.freeOnly && event.isPaid) {
        return false;
    }
    
    // Filtre par événements pour enfants
    if (filters.childrenOnly && !event.isChildrenOnly) {
        return false;
    }
    
    // Filtre par plage de dates
    if (filters.startDate || filters.endDate) {
        const eventStartDate = new Date(event.startDate);
        const eventEndDate = event.endDate ? new Date(event.endDate) : new Date(eventStartDate);
        
        if (filters.startDate) {
            const startFilter = new Date(filters.startDate);
            startFilter.setHours(0, 0, 0, 0);
            
            if (eventEndDate < startFilter) {
                return false;
            }
        }
        
        if (filters.endDate) {
            const endFilter = new Date(filters.endDate);
            endFilter.setHours(23, 59, 59, 999);
            
            if (eventStartDate > endFilter) {
                return false;
            }
        }
    }
    
    // Filtre pour masquer les événements complets
    if (filters.hideFullEvents && event.isLimited) {
        const placesLeft = event.places - (event.registrations?.length || 0);
        if (placesLeft <= 0) {
            return false;
        }
    }
    
    return true;
}