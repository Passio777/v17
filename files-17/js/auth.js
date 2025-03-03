/**
 * Gestion de l'authentification des utilisateurs
 */

// État de l'utilisateur actuel
let currentUser = null;

// Date de dernière activité pour la déconnexion automatique
let lastActivity = Date.now();
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Vérifier si l'utilisateur est connecté au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    console.log("auth.js chargé - Vérification de l'utilisateur connecté");
    checkLoggedInUser();
    setupAuthListeners();
    setupChildrenFunctionality();
    setupUserMenuListeners();
    setupPasswordToggle();
    setupPasswordStrength();
});

// Vérifier si l'utilisateur est connecté
function checkLoggedInUser() {
    // Récupérer les informations de l'utilisateur du localStorage
    const userJson = localStorage.getItem('currentUser');
    const lastActivityTime = localStorage.getItem('lastActivity');
    
    if (userJson && lastActivityTime) {
        try {
            // Vérifier si la session a expiré
            const currentTime = Date.now();
            const inactiveTime = currentTime - parseInt(lastActivityTime);
            
            if (inactiveTime > SESSION_TIMEOUT) {
                console.log("Session expirée après " + Math.round(inactiveTime/60000) + " minutes d'inactivité");
                logout(true);
                return;
            }
            
            // Mettre à jour le temps d'activité
            updateLastActivity();
            
            currentUser = JSON.parse(userJson);
            console.log("Utilisateur récupéré du localStorage:", currentUser.firstname);
            updateUIForLoggedInUser();
        } catch (e) {
            console.error('Erreur lors de la récupération des données utilisateur:', e);
            logout(); // En cas d'erreur, déconnecter l'utilisateur
        }
    } else {
        console.log("Aucun utilisateur connecté");
        updateUIForLoggedOutUser();
    }
    
    // Mettre en place le détecteur d'activité
    setupActivityTracker();
}

// Mettre à jour l'interface pour un utilisateur connecté
function updateUIForLoggedInUser() {
    document.getElementById('loginBtn').classList.add('hidden');
    document.getElementById('registerBtn').classList.add('hidden');
    document.getElementById('userInfo').classList.remove('hidden');
    document.getElementById('userName').textContent = `${currentUser.firstname} ${currentUser.lastname}`;
    
    // Afficher le bouton pour ajouter un événement
    const addEventBtn = document.getElementById('addEventBtn');
    if (addEventBtn) {
        addEventBtn.classList.remove('hidden');
    }
}

// Mettre à jour l'interface pour un utilisateur déconnecté
function updateUIForLoggedOutUser() {
    document.getElementById('loginBtn').classList.remove('hidden');
    document.getElementById('registerBtn').classList.remove('hidden');
    document.getElementById('userInfo').classList.add('hidden');
    
    // Cacher le menu déroulant utilisateur s'il est ouvert
    const userDropdown = document.querySelector('.user-dropdown');
    if (userDropdown) {
        userDropdown.classList.add('hidden');
    }
}

// Fonction pour configurer les écouteurs d'événements pour l'authentification
function setupAuthListeners() {
    // Connexion
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(evt) {
            evt.preventDefault();
            console.log("Soumission du formulaire de connexion");
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            login(email, password);
        });
    }
    
    // Inscription
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(evt) {
            evt.preventDefault();
            console.log("Soumission du formulaire d'inscription");
            
            const firstname = document.getElementById('firstname').value;
            const lastname = document.getElementById('lastname').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            register(firstname, lastname, email, password);
        });
    }
    
    // Déconnexion
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            logout();
        });
    }
    
    // Basculer entre les formulaires de connexion et d'inscription
    const switchToRegister = document.getElementById('switchToRegister');
    if (switchToRegister) {
        switchToRegister.addEventListener('click', function(evt) {
            evt.preventDefault();
            document.getElementById('loginModal').style.display = 'none';
            document.getElementById('registerModal').style.display = 'block';
        });
    }
    
    const switchToLogin = document.getElementById('switchToLogin');
    if (switchToLogin) {
        switchToLogin.addEventListener('click', function(evt) {
            evt.preventDefault();
            document.getElementById('registerModal').style.display = 'none';
            document.getElementById('loginModal').style.display = 'block';
        });
    }
    
    // Formulaire de profil
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', function(evt) {
            evt.preventDefault();
            
            const updatedUserData = {
                userId: currentUser.id,
                firstname: document.getElementById('profileFirstname').value,
                lastname: document.getElementById('profileLastname').value
            };
            
            // Ajouter les données du mot de passe si fournies
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            
            if (currentPassword && newPassword) {
                updatedUserData.currentPassword = currentPassword;
                updatedUserData.newPassword = newPassword;
            }
            
            updateUserProfile(updatedUserData);
        });
    }
    
    // Formulaire d'ajout d'enfant
    const addChildForm = document.getElementById('addChildForm');
    if (addChildForm) {
        addChildForm.addEventListener('submit', function(evt) {
            evt.preventDefault();
            
            const childData = {
                userId: currentUser.id,
                firstname: document.getElementById('childFirstname').value,
                birthdate: document.getElementById('childBirthdate').value
            };
            
            addChildToProfile(childData);
        });
    }
}

// Fonction de connexion
function login(email, password) {
    console.log("Tentative de connexion pour:", email);
    
    // Montrer le loader
    document.getElementById('page-loader').classList.remove('hidden');
    
    fetch('api/users.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'login',
            email: email,
            password: password
        })
    })
    .then(response => response.json())
    .then(data => {
        // Cacher le loader
        document.getElementById('page-loader').classList.add('hidden');
        
        if (data.success) {
            currentUser = data.user;
            // Stocker l'utilisateur dans localStorage
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateLastActivity();
            updateUIForLoggedInUser();
            
            // Fermer la modal de connexion
            document.getElementById('loginModal').style.display = 'none';
            
            // Réinitialiser le formulaire
            document.getElementById('loginForm').reset();
            
            // Notification de succès
            showNotification(`Bienvenue, ${currentUser.firstname} !`, 'success');
            
            // Confettis pour célébrer la connexion
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        } else {
            showNotification(data.message || 'Erreur de connexion. Vérifiez vos identifiants.', 'error');
        }
    })
    .catch(error => {
        // Cacher le loader
        document.getElementById('page-loader').classList.add('hidden');
        
        console.error('Erreur lors de la connexion:', error);
        showNotification('Une erreur s\'est produite lors de la connexion', 'error');
    });
}

// Fonction d'inscription
function register(firstname, lastname, email, password) {
    console.log("Tentative d'inscription pour:", email);
    
    // Récupérer les informations des enfants
    const childrenData = [];
    const childEntries = document.querySelectorAll('.child-entry');
    
    childEntries.forEach(entry => {
        const childId = entry.id;
        const firstname = document.getElementById(`${childId}_firstname`).value;
        const birthdate = document.getElementById(`${childId}_birthdate`).value;
        
        if (firstname && birthdate) {
            childrenData.push({
                firstname,
                birthdate
            });
        }
    });
    
    // Montrer le loader
    document.getElementById('page-loader').classList.remove('hidden');
    
    fetch('api/users.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'register',
            firstname,
            lastname,
            email,
            password,
            children: childrenData
        })
    })
    .then(response => response.json())
    .then(data => {
        // Cacher le loader
        document.getElementById('page-loader').classList.add('hidden');
        
        if (data.success) {
            currentUser = data.user;
            // Stocker l'utilisateur dans localStorage
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateLastActivity();
            updateUIForLoggedInUser();
            
            // Fermer la modal d'inscription
            document.getElementById('registerModal').style.display = 'none';
            
            // Réinitialiser le formulaire
            document.getElementById('registerForm').reset();
            const childrenContainer = document.getElementById('childrenContainer');
            if (childrenContainer) {
                childrenContainer.innerHTML = '';
            }
            
            // Notification de succès
            showNotification(`Bienvenue, ${currentUser.firstname} ! Votre compte a été créé avec succès.`, 'success');
            
            // Confettis pour célébrer la création de compte
            confetti({
                particleCount: 150,
                spread: 90,
                origin: { y: 0.6 }
            });
        } else {
            showNotification(data.message || 'Erreur d\'inscription. Veuillez réessayer.', 'error');
        }
    })
    .catch(error => {
        // Cacher le loader
        document.getElementById('page-loader').classList.add('hidden');
        
        console.error('Erreur lors de l\'inscription:', error);
        showNotification('Une erreur s\'est produite lors de l\'inscription', 'error');
    });
}

// Fonction de déconnexion
function logout(expired = false) {
    console.log("Déconnexion de l'utilisateur");
    
    currentUser = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('lastActivity');
    updateUIForLoggedOutUser();
    
    if (expired) {
        showNotification('Votre session a expiré. Veuillez vous reconnecter.', 'info');
    } else {
        showNotification('Vous avez été déconnecté avec succès', 'info');
    }
    
    // Si on est sur une page qui nécessite d'être connecté, rediriger vers la page d'accueil
    if (document.getElementById('myEventsModal')?.style.display === 'block' ||
        document.getElementById('profileModal')?.style.display === 'block') {
        closeAllModals();
    }
}

// Fonction pour mettre à jour le profil utilisateur
function updateUserProfile(userData) {
    // Montrer le loader
    document.getElementById('page-loader').classList.remove('hidden');
    
    fetch('api/users.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'update',
            ...userData
        })
    })
    .then(response => response.json())
    .then(data => {
        // Cacher le loader
        document.getElementById('page-loader').classList.add('hidden');
        
        if (data.success) {
            currentUser = data.user;
            // Mettre à jour l'utilisateur dans localStorage
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateUIForLoggedInUser();
            
            // Réinitialiser les champs de mot de passe
            if (document.getElementById('currentPassword')) {
                document.getElementById('currentPassword').value = '';
            }
            if (document.getElementById('newPassword')) {
                document.getElementById('newPassword').value = '';
            }
            
            showNotification('Profil mis à jour avec succès', 'success');
        } else {
            showNotification(data.message || 'Erreur lors de la mise à jour du profil', 'error');
        }
    })
    .catch(error => {
        // Cacher le loader
        document.getElementById('page-loader').classList.add('hidden');
        
        console.error('Erreur lors de la mise à jour du profil:', error);
        showNotification('Une erreur s\'est produite lors de la mise à jour du profil', 'error');
    });
}

// Fonction pour ajouter un enfant au profil
function addChildToProfile(childData) {
    // Montrer le loader
    document.getElementById('page-loader').classList.remove('hidden');
    
    fetch('api/users.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            action: 'add-child',
            ...childData
        })
    })
    .then(response => response.json())
    .then(data => {
        // Cacher le loader
        document.getElementById('page-loader').classList.add('hidden');
        
        if (data.success) {
            // Ajouter l'enfant à l'utilisateur courant
            if (!currentUser.children) {
                currentUser.children = [];
            }
            currentUser.children.push(data.child);
            
            // Mettre à jour l'utilisateur dans localStorage
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Fermer la modal d'ajout d'enfant
            document.getElementById('addChildModal').style.display = 'none';
            
            // Réinitialiser le formulaire
            document.getElementById('addChildForm').reset();
            
            // Mettre à jour la liste des enfants dans le profil
            updateChildrenList();
            
            showNotification('Enfant ajouté avec succès', 'success');
        } else {
            showNotification(data.message || 'Erreur lors de l\'ajout de l\'enfant', 'error');
        }
    })
    .catch(error => {
        // Cacher le loader
        document.getElementById('page-loader').classList.add('hidden');
        
        console.error('Erreur lors de l\'ajout de l\'enfant:', error);
        showNotification('Une erreur s\'est produite lors de l\'ajout de l\'enfant', 'error');
    });
}

// Fonction pour mettre à jour la liste des enfants dans le profil
function updateChildrenList() {
    const profileChildrenList = document.getElementById('profileChildrenList');
    if (!profileChildrenList) return;
    
    profileChildrenList.innerHTML = '';
    
    if (!currentUser.children || currentUser.children.length === 0) {
        profileChildrenList.innerHTML = '<p class="hint-text">Aucun enfant ajouté.</p>';
        return;
    }
    
    currentUser.children.forEach(child => {
        const birthDate = new Date(child.birthdate);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        const formattedDate = new Date(child.birthdate).toLocaleDateString('fr-FR');
        
        const childElement = document.createElement('div');
        childElement.className = 'child-entry animate-fade-in';
        childElement.innerHTML = `
            <div class="child-header">
                <h4>${child.firstname}</h4>
            </div>
            <div class="child-content">
                <p><i class="fas fa-birthday-cake"></i> ${formattedDate} (${age} ans)</p>
            </div>
        `;
        
        profileChildrenList.appendChild(childElement);
    });
}

// Fonction pour configurer la fonctionnalité d'ajout d'enfants
function setupChildrenFunctionality() {
    const addChildBtn = document.getElementById('addChildBtn');
    const childrenContainer = document.getElementById('childrenContainer');
    
    if (addChildBtn && childrenContainer) {
        addChildBtn.addEventListener('click', function() {
            // Créer un identifiant unique pour ce groupe d'enfant
            const childId = 'child_' + Date.now();
            
            // Créer le HTML pour un nouvel enfant
            const childHTML = `
                <div class="child-entry" id="${childId}">
                    <div class="child-header">
                        <h4>Enfant</h4>
                        <button type="button" class="btn-icon remove-child" data-child="${childId}">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="form-group">
                        <label for="${childId}_firstname">Prénom</label>
                        <input type="text" id="${childId}_firstname" name="childFirstname[]" required>
                    </div>
                    <div class="form-group">
                        <label for="${childId}_birthdate">Date de naissance</label>
                        <input type="date" id="${childId}_birthdate" name="childBirthdate[]" required>
                    </div>
                </div>
            `;
            
            // Ajouter l'enfant au conteneur
            childrenContainer.insertAdjacentHTML('beforeend', childHTML);
            
            // Ajouter l'événement pour supprimer l'enfant
            document.querySelector(`#${childId} .remove-child`).addEventListener('click', function() {
                const childElement = document.getElementById(childId);
                childElement.style.opacity = '0';
                childElement.style.maxHeight = '0';
                childElement.style.marginBottom = '0';
                
                setTimeout(() => {
                    document.getElementById(childId).remove();
                }, 300);
            });
            
            // Animer l'entrée
            const childElement = document.getElementById(childId);
            childElement.style.opacity = '0';
            childElement.style.transform = 'translateY(20px)';
            
            // Déclencher l'animation
            setTimeout(() => {
                childElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                childElement.style.opacity = '1';
                childElement.style.transform = 'translateY(0)';
            }, 10);
        });
    }
    
    // Bouton pour ajouter un enfant depuis le profil
    const profileAddChildBtn = document.getElementById('profileAddChildBtn');
    if (profileAddChildBtn) {
        profileAddChildBtn.addEventListener('click', function() {
            document.getElementById('addChildModal').style.display = 'block';
        });
    }
}

// Fonction pour configurer les écouteurs du menu utilisateur
function setupUserMenuListeners() {
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.querySelector('.user-dropdown');
    
    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdown.classList.toggle('hidden');
        });
        
        // Fermer le menu au clic en dehors
        document.addEventListener('click', function(e) {
            if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.classList.add('hidden');
            }
        });
        
        // Gestion des clics sur les éléments du menu
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) {
            profileBtn.addEventListener('click', function(e) {
                e.preventDefault();
                userDropdown.classList.add('hidden');
                openProfileModal();
            });
        }
        
        const myEventsBtn = document.getElementById('myEventsBtn');
        if (myEventsBtn) {
            myEventsBtn.addEventListener('click', function(e) {
                e.preventDefault();
                userDropdown.classList.add('hidden');
                openMyEventsModal();
            });
        }
    }
}

// Fonction pour ouvrir la modal de profil
function openProfileModal() {
    if (!currentUser) return;
    
    // Remplir les champs du formulaire avec les données de l'utilisateur
    document.getElementById('profileFirstname').value = currentUser.firstname;
    document.getElementById('profileLastname').value = currentUser.lastname;
    document.getElementById('profileEmail').value = currentUser.email;
    
    // Mettre à jour la liste des enfants
    updateChildrenList();
    
    // Afficher la modal
    document.getElementById('profileModal').style.display = 'block';
}

// Fonction pour ouvrir la modal "Mes événements"
function openMyEventsModal() {
    if (!currentUser) return;
    
    // Afficher la modal
    document.getElementById('myEventsModal').style.display = 'block';
    
    // Charger les événements de l'utilisateur
    loadUserEvents(currentUser.id);
}

// Fonction pour configurer les toggles de visibilité des mots de passe
function setupPasswordToggle() {
    document.querySelectorAll('.toggle-password-btn').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const passwordInput = document.getElementById(targetId);
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                this.innerHTML = '<i class="fas fa-eye-slash"></i>';
            } else {
                passwordInput.type = 'password';
                this.innerHTML = '<i class="fas fa-eye"></i>';
            }
        });
    });
}

// Fonction pour configurer l'indicateur de force du mot de passe
function setupPasswordStrength() {
    const passwordInput = document.getElementById('password');
    if (!passwordInput) return;
    
    const strengthMeter = document.querySelector('.strength-meter');
    const strengthText = document.querySelector('.strength-text');
    const passwordStrength = document.querySelector('.password-strength');
    
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        
        if (password.length === 0) {
            passwordStrength.classList.remove('active');
            return;
        }
        
        passwordStrength.classList.add('active');
        
        // Évaluer la force du mot de passe
        let strength = 0;
        
        // Longueur
        if (password.length >= 8) strength += 1;
        if (password.length >= 12) strength += 1;
        
        // Complexité
        if (/[A-Z]/.test(password)) strength += 1;
        if (/[a-z]/.test(password)) strength += 1;
        if (/[0-9]/.test(password)) strength += 1;
        if (/[^A-Za-z0-9]/.test(password)) strength += 1;
        
        // Afficher la force
        strengthMeter.className = 'strength-meter';
        strengthText.className = 'strength-text';
        
        if (strength < 3) {
            strengthMeter.classList.add('weak');
            strengthText.classList.add('weak');
            strengthText.textContent = 'Mot de passe faible';
        } else if (strength < 5) {
            strengthMeter.classList.add('medium');
            strengthText.classList.add('medium');
            strengthText.textContent = 'Mot de passe moyen';
        } else {
            strengthMeter.classList.add('strong');
            strengthText.classList.add('strong');
            strengthText.textContent = 'Mot de passe fort';
        }
    });
}

// Fonction pour suivre l'activité de l'utilisateur
function setupActivityTracker() {
    // Liste des événements à suivre
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    // Ajouter un écouteur pour chaque type d'événement
    events.forEach(event => {
        document.addEventListener(event, updateLastActivity, { passive: true });
    });
    
    // Vérifier régulièrement si la session a expiré
    setInterval(checkSessionTimeout, 60000); // Vérifier toutes les minutes
}

// Mettre à jour le timestamp de dernière activité
function updateLastActivity() {
    lastActivity = Date.now();
    localStorage.setItem('lastActivity', lastActivity.toString());
}

// Vérifier si la session a expiré
function checkSessionTimeout() {
    if (!currentUser) return;
    
    const currentTime = Date.now();
    const inactiveTime = currentTime - lastActivity;
    
    if (inactiveTime > SESSION_TIMEOUT) {
        console.log("Session expirée après " + Math.round(inactiveTime/60000) + " minutes d'inactivité");
        logout(true);
    }
}

// Fermer toutes les modales
function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
       modal.style.display = 'none';
    });
}

// Référence à la fonction de notification qui sera définie dans app.js
function showNotification(message, type) {
    // Si la fonction n'est pas encore définie dans app.js, utiliser un fallback
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        // Fallback simple
        alert(message);
    }
}