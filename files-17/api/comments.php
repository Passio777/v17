<?php
/**
 * API pour gérer les commentaires des événements
 * Méthodes: GET, POST
 */

// Headers requis
header('Content-Type: application/json; charset=UTF-8');

// Charger les fonctions utilitaires
// Fonction pour envoyer une réponse JSON
function sendJsonResponse($success = true, $message = '', $data = []) {
    $response = [
        'success' => $success,
        'message' => $message
    ];
    
    if (!empty($data)) {
        $response = array_merge($response, $data);
    }
    
    echo json_encode($response);
    exit;
}

// Chemin vers le fichier JSON de stockage des commentaires
$commentsFile = '../data/comments.json';

// Vérifier l'intégrité du fichier de commentaires
if (file_exists($commentsFile)) {
    $content = file_get_contents($commentsFile);
    $data = json_decode($content, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("Erreur de format JSON dans $commentsFile: " . json_last_error_msg());
        error_log("Contenu du fichier: $content");
        // Réinitialiser le fichier s'il est corrompu
        file_put_contents($commentsFile, json_encode(['comments' => []]));
        error_log("Fichier de commentaires réinitialisé");
    }
}

// Créer le fichier s'il n'existe pas
if (!file_exists($commentsFile)) {
    file_put_contents($commentsFile, json_encode(['comments' => []]));
}

// Obtenir la méthode de requête
$method = $_SERVER['REQUEST_METHOD'];

// Fonction pour lire tous les commentaires
function readComments() {
    global $commentsFile;
    $data = json_decode(file_get_contents($commentsFile), true);
    return $data['comments'] ?? [];
}

// Fonction pour écrire les commentaires
function writeComments($comments) {
    global $commentsFile;
    
    // S'assurer que c'est un tableau
    if (!is_array($comments)) {
        $comments = [];
        error_log("Erreur: writeComments a reçu des données non-tableau");
    }
    
    // Écrire avec des options d'encodage améliorées
    $success = file_put_contents(
        $commentsFile, 
        json_encode(['comments' => $comments], 
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
    );
    
    if ($success === false) {
        error_log("Erreur lors de l'écriture dans $commentsFile");
    } else {
        error_log("Commentaires écrits avec succès: " . count($comments) . " commentaires");
    }
}

// Traitement des requêtes GET (lecture des commentaires)
if ($method === 'GET') {
    // Vérifier que l'ID de l'événement est fourni
    if (!isset($_GET['eventId'])) {
        sendJsonResponse(false, 'ID d\'événement manquant');
        exit;
    }
    
    // Ne pas convertir en entier, garder la chaîne de caractères
    $eventId = $_GET['eventId'];
    
    // Pour le débogage
    error_log("Requête GET pour l'événement $eventId");
    
    // Récupérer tous les commentaires
    $allComments = readComments();
    
    // Pour le débogage
    error_log("Nombre total de commentaires: " . count($allComments));
    
    // Filtrer les commentaires pour cet événement - NOUVELLE VERSION
    $eventComments = [];
    foreach ($allComments as $comment) {
        // Convertir en chaînes pour comparer correctement
        if ((string)$comment['eventId'] === (string)$eventId) {
            $eventComments[] = $comment;
            // Pour le débogage
            error_log("Commentaire trouvé pour l'événement $eventId: " . json_encode($comment));
        } else {
            // Pour le débogage
            error_log("Commentaire non correspondant. Événement attendu: $eventId, trouvé: " . $comment['eventId']);
        }
    }
    
    // Pour le débogage
    error_log("Nombre de commentaires trouvés pour l'événement $eventId: " . count($eventComments));
    
    // Charger les données utilisateurs pour enrichir les commentaires
    $usersFile = '../data/users.json';
    $users = [];
    if (file_exists($usersFile)) {
        $users = json_decode(file_get_contents($usersFile), true)['users'] ?? [];
    }
    
    // Enrichir les commentaires avec les données utilisateur
    foreach ($eventComments as &$comment) {
        $userId = $comment['userId'];
        $comment['user'] = null;
        
        // Rechercher l'utilisateur dans le tableau des utilisateurs
        foreach ($users as $user) {
            if ($user['id'] == $userId) {
                $comment['user'] = [
                    'id' => $user['id'],
                    'firstname' => $user['firstname'],
                    'lastname' => $user['lastname'],
                    'email' => $user['email']
                ];
                break;
            }
        }
    }
    
    // Pour le débogage final
    error_log("Commentaires filtrés et enrichis: " . json_encode(array_values($eventComments)));
    
    sendJsonResponse(true, 'Commentaires récupérés avec succès', ['comments' => array_values($eventComments)]);
}

// Traitement des requêtes POST (création, modification, suppression)
else if ($method === 'POST') {
    // Récupérer et décoder les données JSON
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Vérifier que les données sont valides
    if (!$data || !isset($data['action'])) {
        sendJsonResponse(false, 'Données invalides');
        exit;
    }
    
    // Traitement selon l'action demandée
    switch ($data['action']) {
        // Création d'un nouveau commentaire
        case 'create':
            if (!isset($data['eventId']) || !isset($data['userId']) || !isset($data['content'])) {
                sendJsonResponse(false, 'Données manquantes pour créer un commentaire');
                exit;
            }
            
            // Ne pas convertir en entier pour éviter les problèmes avec les IDs alphanumériques
            $eventId = $data['eventId'];
            $userId = $data['userId'];
            $content = trim($data['content']);
            
            // Validation du contenu
            if (empty($content)) {
                sendJsonResponse(false, 'Le commentaire ne peut pas être vide');
                exit;
            }
            
            // Vérifier si l'utilisateur a fourni ses propres données
            if (isset($data['userData']) && is_array($data['userData'])) {
                $userData = [
                    'id' => $userId,
                    'firstname' => $data['userData']['firstname'] ?? 'Utilisateur',
                    'lastname' => $data['userData']['lastname'] ?? $userId,
                    'email' => $data['userData']['email'] ?? 'user' . $userId . '@example.com'
                ];
                $userExists = true;
            } else {
                // Essayer de trouver l'utilisateur dans le fichier users.json
                $usersFile = '../data/users.json';
                $userExists = false;
                $userData = null;

                if (file_exists($usersFile)) {
                    $usersData = json_decode(file_get_contents($usersFile), true);
                    $users = isset($usersData['users']) ? $usersData['users'] : [];
                    
                    foreach ($users as $user) {
                        if ((string)$user['id'] === (string)$userId) {
                            $userExists = true;
                            $userData = [
                                'id' => $user['id'],
                                'firstname' => $user['firstname'],
                                'lastname' => $user['lastname'],
                                'email' => isset($user['email']) ? $user['email'] : ''
                            ];
                            break;
                        }
                    }
                }
                
                // Si l'utilisateur n'est pas trouvé, utiliser un utilisateur temporaire
                if (!$userExists) {
                    $userData = [
                        'id' => $userId,
                        'firstname' => 'Passio777', // Nom par défaut si l'utilisateur n'est pas trouvé
                        'lastname' => '', 
                        'email' => 'user' . $userId . '@example.com'
                    ];
                    $userExists = true;
                }
            }
            
            // Vérifier que l'événement existe
            $eventsFile = '../data/events.json';
            $eventExists = false;
            
            if (file_exists($eventsFile)) {
                $eventsData = json_decode(file_get_contents($eventsFile), true);
                
                // Déterminer si le fichier contient un tableau direct ou une clé 'events'
                $events = is_array($eventsData) ? $eventsData : ($eventsData['events'] ?? []);
                
                foreach ($events as $event) {
                    if ((string)$event['id'] === (string)$eventId) {
                        $eventExists = true;
                        break;
                    }
                }
            }
            
            // Pour le développement, on accepte tous les événements
            $eventExists = true;


            
            /* Commenté pour le développement
            if (!$eventExists) {
                sendJsonResponse(false, 'Événement non trouvé');
                exit;
            }
            */
            
            // Récupérer tous les commentaires
            $comments = readComments();
            
            // Générer un nouvel ID pour le commentaire
            $newId = 1;
            if (!empty($comments)) {
                $maxId = max(array_column($comments, 'id'));
                $newId = $maxId + 1;
            }
            
            // Créer le nouveau commentaire
            $newComment = [
                'id' => $newId,
                'eventId' => $eventId,
                'userId' => $userId,
                'content' => $content,
                'createdAt' => date('Y-m-d H:i:s')
            ];
            
            // Ajouter le commentaire
            $comments[] = $newComment;
            writeComments($comments);
            
            // Ajouter les données utilisateur pour la réponse
            $newComment['user'] = $userData;
            
            sendJsonResponse(true, 'Commentaire ajouté avec succès', ['comment' => $newComment]);
            break;
            
        // Suppression d'un commentaire
// Suppression d'un commentaire
case 'delete':
    if (!isset($data['commentId']) || !isset($data['userId'])) {
        sendJsonResponse(false, 'Données manquantes pour supprimer le commentaire');
        exit;
    }
    
    $commentId = intval($data['commentId']);
    $userId = $data['userId'];  // Ne pas convertir en entier
    
    // Récupérer tous les commentaires
    $comments = readComments();
    
    // Chercher le commentaire à supprimer
    $commentIndex = -1;
    $comment = null;
    
    foreach ($comments as $index => $c) {
        if ($c['id'] == $commentId) {
            $commentIndex = $index;
            $comment = $c;
            break;
        }
    }
    
    if ($commentIndex === -1) {
        sendJsonResponse(false, 'Commentaire non trouvé');
        exit;
    }
    
    // Pour le débogage
    error_log("Tentative de suppression du commentaire ID: $commentId");
    error_log("ID utilisateur qui fait la requête: $userId");
    error_log("ID utilisateur du commentaire: {$comment['userId']}");
    
    // Vérifier si l'utilisateur est l'auteur du commentaire (comparaison en tant que chaînes)
    if ((string)$comment['userId'] !== (string)$userId) {
        // Vérifier si l'utilisateur est le créateur de l'événement
        $eventsFile = '../data/events.json';
        $isEventCreator = false;
        $isAdmin = false;
        
        if (file_exists($eventsFile)) {
            $eventsData = json_decode(file_get_contents($eventsFile), true);
            // Déterminer si le fichier contient un tableau direct ou une clé 'events'
            $events = is_array($eventsData) ? $eventsData : ($eventsData['events'] ?? []);
            
            foreach ($events as $event) {
                if ($event['id'] == $comment['eventId'] && (string)$event['createdBy'] === (string)$userId) {
                    $isEventCreator = true;
                    break;
                }
            }
        }
        
        // Vérifier si l'utilisateur est admin
        $usersFile = '../data/users.json';
        if (file_exists($usersFile)) {
            $users = json_decode(file_get_contents($usersFile), true)['users'] ?? [];
            foreach ($users as $user) {
                if ((string)$user['id'] === (string)$userId && isset($user['isAdmin']) && $user['isAdmin']) {
                    $isAdmin = true;
                    break;
                }
            }
        }
        
        // Pour le débogage
        error_log("Est créateur de l'événement: " . ($isEventCreator ? 'Oui' : 'Non'));
        error_log("Est administrateur: " . ($isAdmin ? 'Oui' : 'Non'));
        
        if (!$isEventCreator && !$isAdmin) {
            sendJsonResponse(false, 'Vous n\'êtes pas autorisé à supprimer ce commentaire');
            exit;
        }
    }
    
    // Supprimer le commentaire
    array_splice($comments, $commentIndex, 1);
    writeComments($comments);
    
    sendJsonResponse(true, 'Commentaire supprimé avec succès');
    break;
            
        default:
            sendJsonResponse(false, 'Action non reconnue');
            break;
    }
}

// Méthode non autorisée
else {
    http_response_code(405);
    sendJsonResponse(false, 'Méthode non autorisée');
}
?>