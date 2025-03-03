<?php
// Chemin vers les fichiers de données
define('DATA_DIR', dirname(__DIR__) . '/data/');
define('USERS_FILE', DATA_DIR . 'users.json');
define('EVENTS_FILE', DATA_DIR . 'events.json');
define('REGISTRATIONS_FILE', DATA_DIR . 'registrations.json');

// Fonction pour assurer que les répertoires de données existent
function initDataFiles() {
    // Créer le répertoire de données s'il n'existe pas
    if (!file_exists(DATA_DIR)) {
        mkdir(DATA_DIR, 0755, true);
    }
    
    // Initialiser les fichiers de données s'ils n'existent pas
    if (!file_exists(USERS_FILE)) {
        file_put_contents(USERS_FILE, json_encode([]));
    }
    
    if (!file_exists(EVENTS_FILE)) {
        file_put_contents(EVENTS_FILE, json_encode([]));
    }
    
    if (!file_exists(REGISTRATIONS_FILE)) {
        file_put_contents(REGISTRATIONS_FILE, json_encode([]));
    }
}

initDataFiles();

// Fonction pour générer un ID unique
function generateId() {
    return uniqid() . bin2hex(random_bytes(8));
}

// Fonction pour envoyer une réponse JSON
function sendJsonResponse($data, $statusCode = 200) {
    header('Content-Type: application/json');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

// Fonction pour lire un fichier JSON avec gestion d'erreurs améliorée
function readJsonFile($file) {
    if (!file_exists($file)) {
        return [];
    }
    
    $content = file_get_contents($file);
    if (empty($content)) {
        return [];
    }
    
    $data = json_decode($content, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("Erreur JSON lors de la lecture de $file: " . json_last_error_msg());
        return [];
    }
    
    return $data ?: [];
}

// Amélioration de writeJsonFile avec verrouillage et gestion d'erreurs
function writeJsonFile($file, $data) {
    $directory = dirname($file);
    if (!is_dir($directory)) {
        mkdir($directory, 0755, true);
    }

    $fp = fopen($file, 'w');
    if (!$fp) {
        error_log("Impossible d'ouvrir le fichier $file en écriture");
        return false;
    }

    if (flock($fp, LOCK_EX)) { // Verrouillage exclusif
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log("Erreur JSON lors de l'encodage pour $file: " . json_last_error_msg());
            flock($fp, LOCK_UN);
            fclose($fp);
            return false;
        }
        
        fwrite($fp, $json);
        fflush($fp);
        flock($fp, LOCK_UN); // Libération du verrou
        fclose($fp);
        return true;
    } else {
        error_log("Impossible d'obtenir un verrou pour $file");
        fclose($fp);
        return false;
    }
}

// Obtenir les données de la requête
function getRequestData() {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("Erreur de parsing JSON: " . json_last_error_msg());
        return [];
    }
    
    return $data ?: [];
}

// Fonction utilitaire pour journaliser les erreurs
function logError($message) {
    error_log("[" . date('Y-m-d H:i:s') . "] " . $message);
}
?>