<?php
require_once 'config.php';

// Activer la gestion des erreurs
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Gérer les requêtes
$method = $_SERVER['REQUEST_METHOD'];
header('Content-Type: application/json');

try {
    if ($method === 'GET') {
        // Listing des utilisateurs (pour l'administration)
        $users = readJsonFile(USERS_FILE);
        
        // Supprimer les mots de passe pour la sécurité
        foreach ($users as &$user) {
            unset($user['password']);
            unset($user['pepper']);
        }
        
        sendJsonResponse($users);
    } elseif ($method === 'POST') {
        $data = getRequestData();
        $action = isset($data['action']) ? $data['action'] : '';
        
        if ($action === 'register') {
            register($data);
        } elseif ($action === 'login') {
            login($data);
        } elseif ($action === 'update') {
            updateUser($data);
        } elseif ($action === 'add-child') {
            addChild($data);
        } else {
            sendJsonResponse(['success' => false, 'message' => 'Action non reconnue'], 400);
        }
    } else {
        sendJsonResponse(['success' => false, 'message' => 'Méthode non autorisée'], 405);
    }
} catch (Exception $e) {
    logError("Exception dans users.php: " . $e->getMessage());
    sendJsonResponse(['success' => false, 'message' => 'Erreur serveur'], 500);
}

// Fonction d'inscription
function register($data) {
    // Vérifier les données requises
    if (empty($data['firstname']) || empty($data['lastname']) || 
        empty($data['email']) || empty($data['password'])) {
        sendJsonResponse(['success' => false, 'message' => 'Données incomplètes'], 400);
    }
    
    $users = readJsonFile(USERS_FILE);
    
    // Vérifier si l'email existe déjà
    foreach ($users as $user) {
        if ($user['email'] === $data['email']) {
            sendJsonResponse(['success' => false, 'message' => 'Cette adresse email est déjà utilisée'], 400);
        }
    }
    
    // Traiter les données des enfants
    $children = [];
    if (!empty($data['children']) && is_array($data['children'])) {
        foreach ($data['children'] as $child) {
            if (!empty($child['firstname']) && !empty($child['birthdate'])) {
                $children[] = [
                    'id' => generateId(),
                    'firstname' => $child['firstname'],
                    'birthdate' => $child['birthdate']
                ];
            }
        }
    }
    
    // Création d'un sel unique pour chaque utilisateur
    $pepper = bin2hex(random_bytes(16)); // Sel additionnel stocké avec le hash
    
    // Créer le nouvel utilisateur
    $newUser = [
        'id' => generateId(),
        'firstname' => $data['firstname'],
        'lastname' => $data['lastname'],
        'email' => $data['email'],
        'password' => password_hash($data['password'] . $pepper, PASSWORD_DEFAULT),
        'pepper' => $pepper, // stockage du sel additionnel
        'role' => 'user', // Role par défaut
        'children' => $children,
        'createdAt' => date('Y-m-d H:i:s')
    ];
    
    // Ajouter l'utilisateur à la liste
    $users[] = $newUser;
    
    if (writeJsonFile(USERS_FILE, $users)) {
        // Renvoyer l'utilisateur sans le mot de passe et le sel
        $userResponse = $newUser;
        unset($userResponse['password']);
        unset($userResponse['pepper']);
        
        sendJsonResponse(['success' => true, 'user' => $userResponse]);
    } else {
        sendJsonResponse(['success' => false, 'message' => 'Erreur lors de l\'écriture des données'], 500);
    }
}

// Fonction de connexion
function login($data) {
    // Vérifier les données requises
    if (empty($data['email']) || empty($data['password'])) {
        sendJsonResponse(['success' => false, 'message' => 'Données incomplètes'], 400);
    }
    
    $users = readJsonFile(USERS_FILE);
    
    // Rechercher l'utilisateur par email
    $foundUser = null;
    foreach ($users as $user) {
        if ($user['email'] === $data['email']) {
            $foundUser = $user;
            break;
        }
    }
    
    // Vérifier si l'utilisateur existe
    if (!$foundUser) {
        sendJsonResponse(['success' => false, 'message' => 'Email ou mot de passe incorrect'], 401);
    }
    
    // Vérifier le mot de passe avec le sel additionnel
    $pepper = $foundUser['pepper'] ?? ''; // Récupérer le sel spécifique à cet utilisateur
    if (!password_verify($data['password'] . $pepper, $foundUser['password'])) {
        sendJsonResponse(['success' => false, 'message' => 'Email ou mot de passe incorrect'], 401);
    }
    
    // Mettre à jour la dernière connexion
    foreach ($users as &$user) {
        if ($user['id'] === $foundUser['id']) {
            $user['lastLogin'] = date('Y-m-d H:i:s');
            break;
        }
    }
    writeJsonFile(USERS_FILE, $users);
    
    // Renvoyer l'utilisateur sans le mot de passe et le sel
    $userResponse = $foundUser;
    unset($userResponse['password']);
    unset($userResponse['pepper']);
    
    sendJsonResponse(['success' => true, 'user' => $userResponse]);
}

// Fonction pour mettre à jour un utilisateur
function updateUser($data) {
    // Vérifier les données requises
    if (empty($data['userId'])) {
        sendJsonResponse(['success' => false, 'message' => 'ID utilisateur manquant'], 400);
    }
    
    $users = readJsonFile(USERS_FILE);
    $userId = $data['userId'];
    $userFound = false;
    
    // Mettre à jour les données de l'utilisateur
    foreach ($users as &$user) {
        if ($user['id'] === $userId) {
            $userFound = true;
            
            // Mise à jour des champs modifiables
            if (isset($data['firstname'])) $user['firstname'] = $data['firstname'];
            if (isset($data['lastname'])) $user['lastname'] = $data['lastname'];
            
            // Mettre à jour le mot de passe si fourni
            if (!empty($data['newPassword'])) {
                // Vérifier l'ancien mot de passe
                if (empty($data['currentPassword'])) {
                    sendJsonResponse(['success' => false, 'message' => 'Mot de passe actuel requis'], 400);
                }
                
                $pepper = $user['pepper'] ?? '';
                if (!password_verify($data['currentPassword'] . $pepper, $user['password'])) {
                    sendJsonResponse(['success' => false, 'message' => 'Mot de passe actuel incorrect'], 400);
                }
                
                // Mettre à jour avec un nouveau sel
                $newPepper = bin2hex(random_bytes(16));
                $user['password'] = password_hash($data['newPassword'] . $newPepper, PASSWORD_DEFAULT);
                $user['pepper'] = $newPepper;
            }
            
            $user['updatedAt'] = date('Y-m-d H:i:s');
            break;
        }
    }
    
    if (!$userFound) {
        sendJsonResponse(['success' => false, 'message' => 'Utilisateur non trouvé'], 404);
    }
    
    if (writeJsonFile(USERS_FILE, $users)) {
        // Récupérer l'utilisateur mis à jour
        $updatedUser = null;
        foreach ($users as $u) {
            if ($u['id'] === $userId) {
                $updatedUser = $u;
                unset($updatedUser['password']);
                unset($updatedUser['pepper']);
                break;
            }
        }
        
        sendJsonResponse(['success' => true, 'user' => $updatedUser]);
    } else {
        sendJsonResponse(['success' => false, 'message' => 'Erreur lors de la mise à jour'], 500);
    }
}

// Fonction pour ajouter un enfant
function addChild($data) {
    // Vérifier les données requises
    if (empty($data['userId']) || empty($data['firstname']) || empty($data['birthdate'])) {
        sendJsonResponse(['success' => false, 'message' => 'Données incomplètes'], 400);
    }
    
    $users = readJsonFile(USERS_FILE);
    $userId = $data['userId'];
    $userFound = false;
    
    $newChild = [
        'id' => generateId(),
        'firstname' => $data['firstname'],
        'birthdate' => $data['birthdate']
    ];
    
    // Ajouter l'enfant à l'utilisateur
    foreach ($users as &$user) {
        if ($user['id'] === $userId) {
            $userFound = true;
            
            if (!isset($user['children']) || !is_array($user['children'])) {
                $user['children'] = [];
            }
            
            $user['children'][] = $newChild;
            break;
        }
    }
    
    if (!$userFound) {
        sendJsonResponse(['success' => false, 'message' => 'Utilisateur non trouvé'], 404);
    }
    
    if (writeJsonFile(USERS_FILE, $users)) {
        sendJsonResponse(['success' => true, 'child' => $newChild]);
    } else {
        sendJsonResponse(['success' => false, 'message' => 'Erreur lors de l\'ajout de l\'enfant'], 500);
    }
}
?>