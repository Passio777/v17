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
        // Récupérer tous les événements
        $events = readJsonFile(EVENTS_FILE);
        $users = readJsonFile(USERS_FILE);
        
        // Créer un index des utilisateurs par ID pour un accès rapide
        $usersById = [];
        foreach ($users as $user) {
            $userSimple = [
                'id' => $user['id'],
                'firstname' => $user['firstname'],
                'lastname' => $user['lastname']
            ];
            $usersById[$user['id']] = $userSimple;
        }
        
        // Récupérer les inscriptions pour calculer les places restantes
        $registrations = readJsonFile(REGISTRATIONS_FILE);
        
        // Regrouper les inscriptions par événement
        $eventRegistrations = [];
        foreach ($registrations as $registration) {
            $eventId = $registration['eventId'];
            if (!isset($eventRegistrations[$eventId])) {
                $eventRegistrations[$eventId] = [];
            }
            $eventRegistrations[$eventId][] = $registration;
        }
        
        // Ajouter les inscriptions et les infos du créateur à chaque événement
        foreach ($events as &$event) {
            $eventId = $event['id'];
            $event['registrations'] = isset($eventRegistrations[$eventId]) ? $eventRegistrations[$eventId] : [];
            
            // Ajouter les informations du créateur
            if (isset($event['createdBy']) && isset($usersById[$event['createdBy']])) {
                $event['creator'] = $usersById[$event['createdBy']];
            } else {
                $event['creator'] = ['firstname' => 'Inconnu', 'lastname' => ''];
            }
        }
        
        sendJsonResponse($events);
    } elseif ($method === 'POST') {
        $data = getRequestData();
        $action = isset($data['action']) ? $data['action'] : '';
        
        if ($action === 'create') {
            createEvent($data);
        } elseif ($action === 'delete' && isset($data['eventId'])) {
            deleteEvent($data['eventId'], $data['userId'] ?? null);
        } else {
            sendJsonResponse(['success' => false, 'message' => 'Action non reconnue'], 400);
        }
    } else {
        sendJsonResponse(['success' => false, 'message' => 'Méthode non autorisée'], 405);
    }
} catch (Exception $e) {
    logError("Exception dans events.php: " . $e->getMessage());
    sendJsonResponse(['success' => false, 'message' => 'Erreur serveur'], 500);
}

// Fonction pour créer un événement
function createEvent($data) {
    // Vérifier les données requises
    if (empty($data['event']) || 
        empty($data['event']['title']) || 
        empty($data['event']['startDate']) || 
        empty($data['event']['description']) || 
        !isset($data['event']['lat']) || 
        !isset($data['event']['lng']) ||
        empty($data['event']['createdBy'])) {
        
        sendJsonResponse(['success' => false, 'message' => 'Données incomplètes'], 400);
    }
    
    $events = readJsonFile(EVENTS_FILE);
    
    // Créer le nouvel événement
    $newEvent = [
        'id' => generateId(),
        'title' => $data['event']['title'],
        'startDate' => $data['event']['startDate'],
        'endDate' => $data['event']['endDate'] ?? null,
        'description' => $data['event']['description'],
        'location' => $data['event']['location'],
        'lat' => $data['event']['lat'],
        'lng' => $data['event']['lng'],
        'isPaid' => $data['event']['isPaid'] ?? false,
        'price' => $data['event']['isPaid'] ? floatval($data['event']['price']) : 0,
        'isLimited' => $data['event']['isLimited'] ?? false,
        'places' => $data['event']['isLimited'] ? intval($data['event']['places']) : null,
        'isChildrenOnly' => $data['event']['isChildrenOnly'] ?? false,
        'createdBy' => $data['event']['createdBy'],
        'createdAt' => date('Y-m-d H:i:s'),
        'categoryId' => intval($data['event']['categoryId'] ?? 0)  // CORRECTION ICI
    ];
    
    // Ajouter l'événement à la liste
    $events[] = $newEvent;
    
    if (writeJsonFile(EVENTS_FILE, $events)) {
        sendJsonResponse(['success' => true, 'event' => $newEvent]);
    } else {
        sendJsonResponse(['success' => false, 'message' => 'Erreur lors de l\'écriture des données'], 500);
    }
}

// Nouvelle fonction pour supprimer un événement
function deleteEvent($eventId, $userId) {
    // Vérifier que l'utilisateur est fourni
    if (!$userId) {
        sendJsonResponse(['success' => false, 'message' => 'Utilisateur non spécifié'], 400);
    }
    
    $events = readJsonFile(EVENTS_FILE);
    $registrations = readJsonFile(REGISTRATIONS_FILE);
    
    // Vérifier si l'événement existe et que l'utilisateur est le créateur
    $eventIndex = -1;
    foreach ($events as $index => $event) {
        if ($event['id'] === $eventId) {
            $eventIndex = $index;
            if ($event['createdBy'] !== $userId) {
                sendJsonResponse(['success' => false, 'message' => 'Vous n\'êtes pas autorisé à supprimer cet événement'], 403);
            }
            break;
        }
    }
    
    if ($eventIndex === -1) {
        sendJsonResponse(['success' => false, 'message' => 'Événement non trouvé'], 404);
    }
    
    // Supprimer l'événement
    array_splice($events, $eventIndex, 1);
    
    // Supprimer les inscriptions associées
    $updatedRegistrations = array_filter($registrations, function($reg) use ($eventId) {
        return $reg['eventId'] !== $eventId;
    });
    
    // Écrire les changements
    $eventsWritten = writeJsonFile(EVENTS_FILE, $events);
    $registrationsWritten = writeJsonFile(REGISTRATIONS_FILE, array_values($updatedRegistrations));
    
    if ($eventsWritten && $registrationsWritten) {
        sendJsonResponse(['success' => true, 'message' => 'Événement supprimé avec succès']);
    } else {
        sendJsonResponse(['success' => false, 'message' => 'Erreur lors de la suppression de l\'événement'], 500);
    }
}
?>