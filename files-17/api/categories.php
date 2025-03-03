<?php
/**
 * API pour récupérer les catégories d'événements
 * Méthodes: GET
 */

// Headers requis
header('Content-Type: application/json; charset=UTF-8');

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

// Chemin vers le fichier des catégories
$categoriesFile = '../data/categories.json';

// Vérifier que le fichier existe
if (!file_exists($categoriesFile)) {
    sendJsonResponse(false, 'Le fichier de catégories est introuvable');
    exit;
}

// Méthode GET uniquement
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Lire le fichier
    $categoriesData = json_decode(file_get_contents($categoriesFile), true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendJsonResponse(false, 'Erreur lors de la lecture des catégories');
        exit;
    }
    
    // Récupérer les catégories
    $categories = $categoriesData['categories'] ?? [];
    
    // Renvoyer les catégories
    sendJsonResponse(true, 'Catégories récupérées avec succès', ['categories' => $categories]);
} else {
    // Méthode non autorisée
    http_response_code(405);
    sendJsonResponse(false, 'Méthode non autorisée');
}