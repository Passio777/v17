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
        // Récupérer les inscriptions, éventuellement filtrées par événement
        $eventId = isset($_GET['eventId']) ? $_GET['eventId'] : null;
        
        $registrations = readJsonFile(REGISTRATIONS_FILE);
        $users = readJsonFile(USERS_FILE);
        
        // Créer un tableau associatif des utilisateurs indexé par ID
        $usersById = [];
        foreach ($users as $user) {
            $userCopy = $user;
            unset($userCopy['password']); // Ne pas renvoyer les mots de passe
            $usersById[$user['id']] = $userCopy;
        }
        
        // Filtrer par événement si un ID est fourni
        if ($eventId) {
            $filteredRegistrations = [];
            foreach ($registrations as $registration) {
                if ($registration['eventId'] === $eventId) {
                    // Ajouter les informations de l'utilisateur
                    $userId = $registration['userId'];
                    if (isset($usersById[$userId])) {
                        $registration['user'] = $usersById[$userId];
                        
                        // Si c'est un enfant, chercher les données de l'enfant
                        if (isset($registration['participantType']) && $registration['participantType'] === 'child') {
                            $childId = $registration['participantId'];
                            $childData = null;
                            
                            // Rechercher cet enfant dans les enfants de l'utilisateur
                            if (isset($registration['user']['children']) && is_array($registration['user']['children'])) {
                                foreach ($registration['user']['children'] as $child) {
                                    if ($child['id'] === $childId) {
                                        $childData = $child;
                                        break;
                                    }
                                }
                            }
                            
                            $registration['childData'] = $childData;
                        }
                    }
                    $filteredRegistrations[] = $registration;
                }
            }
            
            sendJsonResponse(['success' => true, 'registrations' => $filteredRegistrations, 'eventId' => $eventId]);
        } else {
            sendJsonResponse($registrations);
        }
    } elseif ($method === 'POST') {
        $data = getRequestData();
        $action = isset($data['action']) ? $data['action'] : '';
        
        if ($action === 'register') {
            registerToEvent($data);
        } elseif ($action === 'unregister') {
            unregisterFromEvent($data);
        } else {
            sendJsonResponse(['success' => false, 'message' => 'Action non reconnue'], 400);
        }
    } else {
        sendJsonResponse(['success' => false, 'message' => 'Méthode non autorisée'], 405);
    }
} catch (Exception $e) {
    logError("Exception dans registrations.php: " . $e->getMessage());
    sendJsonResponse(['success' => false, 'message' => 'Erreur serveur'], 500);
}

// Fonction pour s'inscrire à un événement
function registerToEvent($data) {
    // Vérifier les données requises
    if (empty($data['eventId']) || empty($data['userId'])) {
        sendJsonResponse(['success' => false, 'message' => 'Données incomplètes'], 400);
    }
    
    $eventId = $data['eventId'];
    $userId = $data['userId'];
    
    // Récupérer les événements
    $events = readJsonFile(EVENTS_FILE);
    
    // Vérifier si l'événement existe
    $event = null;
    foreach ($events as $e) {
        if ($e['id'] === $eventId) {
            $event = $e;
            break;
        }
    }
    
    if (!$event) {
        sendJsonResponse(['success' => false, 'message' => 'Événement non trouvé'], 404);
    }
    
    // Récupérer les inscriptions
    $registrations = readJsonFile(REGISTRATIONS_FILE);
    
    // Déterminer les participants
    $participants = []; // Liste des participants à inscrire
    
    // Si l'adulte s'inscrit lui-même
    if (!empty($data['registerSelf']) && $data['registerSelf'] === true) {
        // Vérifier si l'événement est réservé aux enfants
        if (isset($event['isChildrenOnly']) && $event['isChildrenOnly']) {
            sendJsonResponse(['success' => false, 'message' => 'Cet événement est réservé aux enfants'], 400);
        }
        
        $participants[] = [
            'type' => 'adult',
            'userId' => $userId,
            'id' => $userId
        ];
    }
    
    // Traiter les enfants sélectionnés
    if (!empty($data['children']) && is_array($data['children'])) {
        foreach ($data['children'] as $childId) {
            $participants[] = [
                'type' => 'child',
                'userId' => $userId, // Parent
                'id' => $childId
            ];
        }
    }
    
    // Si aucun participant n'est sélectionné
    if (empty($participants)) {
        sendJsonResponse(['success' => false, 'message' => 'Aucun participant sélectionné'], 400);
    }
    
    // Si l'événement a des places limitées, vérifier la disponibilité
    if ($event['isLimited']) {
        // Compter les inscriptions pour cet événement
        $registrationCount = 0;
        foreach ($registrations as $registration) {
            if ($registration['eventId'] === $eventId) {
                $registrationCount++;
            }
        }
        
        if ($registrationCount + count($participants) > $event['places']) {
            sendJsonResponse(['success' => false, 'message' => 'Toutes les places sont déjà prises'], 400);
        }
    }
    
    // Vérifier si les participants sont déjà inscrits
    foreach ($registrations as $registration) {
        if ($registration['eventId'] === $eventId) {
            foreach ($participants as $i => $participant) {
                if ($registration['participantId'] === $participant['id']) {
                    // Si le participant est déjà inscrit, le retirer de la liste
                    unset($participants[$i]);
                }
            }
        }
    }
    
    // Recréer un tableau indexé
    $participants = array_values($participants);
    
    if (empty($participants)) {
        sendJsonResponse(['success' => false, 'message' => 'Tous les participants sélectionnés sont déjà inscrits'], 400);
    }
    
    // Créer les inscriptions
    $newRegistrations = [];
    foreach ($participants as $participant) {
        $newRegistrations[] = [
            'id' => generateId(),
            'eventId' => $eventId,
            'userId' => $userId,
            'participantId' => $participant['id'],
            'participantType' => $participant['type'],
            'registeredAt' => date('Y-m-d H:i:s')
        ];
    }
    
    // Ajouter les inscriptions
    $registrations = array_merge($registrations, $newRegistrations);
    
    if(writeJsonFile(REGISTRATIONS_FILE, $registrations)) {
        // Préparer un message personnalisé pour la réponse
        $adultCount = 0;
        $childCount = 0;
        
        foreach ($participants as $participant) {
            if ($participant['type'] === 'adult') {
                $adultCount++;
            } else if ($participant['type'] === 'child') {
                $childCount++;
            }
        }
        
        $message = '';
        if ($adultCount > 0 && $childCount > 0) {
            $message = "Vous et $childCount enfant(s) avez été inscrits avec succès !";
        } else if ($adultCount > 0) {
            $message = "Vous avez été inscrit(e) avec succès !";
        } else if ($childCount > 0) {
            $message = "$childCount enfant(s) ont été inscrits avec succès !";
        }
        
        sendJsonResponse([
            'success' => true, 
            'registrations' => $newRegistrations,
            'message' => $message,
            'participantCount' => [
                'adults' => $adultCount,
                'children' => $childCount
            ]
        ]);
    } else {
        sendJsonResponse(['success' => false, 'message' => 'Erreur lors de l\'inscription'], 500);
    }
}

// Nouvelle fonction pour se désinscrire d'un événement
function unregisterFromEvent($data) {
    // Vérifier les données requises
    if (empty($data['eventId']) || empty($data['userId']) || empty($data['registrationId'])) {
        sendJsonResponse(['success' => false, 'message' => 'Données incomplètes'], 400);
    }
    
    $eventId = $data['eventId'];
    $userId = $data['userId'];
    $registrationId = $data['registrationId'];
    
    // Récupérer les inscriptions
    $registrations = readJsonFile(REGISTRATIONS_FILE);
    
    // Trouver l'inscription à supprimer
    $found = false;
    $updatedRegistrations = array_filter($registrations, function($reg) use ($registrationId, $userId, &$found) {
        // Ne garder que les inscriptions qui ne correspondent pas à celle qu'on veut supprimer
        // ET vérifier que l'utilisateur est bien celui qui a fait l'inscription
        if ($reg['id'] === $registrationId) {
            $found = true;
            return $reg['userId'] !== $userId; // Si ce n'est pas le bon utilisateur, on garde
        }
        return true; // On garde toutes les autres inscriptions
    });
    
    if (!$found) {
        sendJsonResponse(['success' => false, 'message' => 'Inscription non trouvée'], 404);
    }
    
    // Réindexer le tableau
    $updatedRegistrations = array_values($updatedRegistrations);
    
    if(writeJsonFile(REGISTRATIONS_FILE, $updatedRegistrations)) {
        sendJsonResponse([
            'success' => true, 
            'message' => 'Désinscription réussie'
        ]);
    } else {
        sendJsonResponse(['success' => false, 'message' => 'Erreur lors de la désinscription'], 500);
    }
}
?>