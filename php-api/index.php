<?php
require __DIR__ . '/_config.php';

// Tanzania time (EAT, UTC+3, no daylight saving). The server's own clock is US time,
// which would make "today", daily stats and stored dates 8 hours off.
date_default_timezone_set('Africa/Dar_es_Salaam');

// Snippe fee rate (defined here in case _config.php predates this deploy)
if (!defined('GETO_FEE_RATE')) define('GETO_FEE_RATE', 0.75);

// Unexpected errors: full details go to the server error log, visitors get a plain message
// (raw database errors would reveal table names and the database user).
set_exception_handler(function(\Throwable $e) {
    $ref = substr(bin2hex(random_bytes(4)), 0, 8);
    error_log("Geto API error $ref: ".$e->getMessage().' at '.basename($e->getFile()).':'.$e->getLine());
    http_response_code(500);
    echo json_encode(['message'=>"Something went wrong on our side. Please try again. (ref $ref)", 'ref'=>$ref], JSON_UNESCAPED_UNICODE);
    exit;
});

// ─── CORS & Headers ────────────────────────────────────────────
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

// ─── Utilities ─────────────────────────────────────────────────
function send(int $code, $data): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function ok($data): void      { send(200, $data); }
function created($data): void { send(201, $data); }
function err(int $c, string $m): void { send($c, ['message' => $m]); }

function body(): array {
    $ct = $_SERVER['CONTENT_TYPE'] ?? '';
    if (str_contains($ct, 'application/json'))
        return json_decode(file_get_contents('php://input'), true) ?? [];
    return $_POST;
}
function b64u_enc(string $d): string { return rtrim(strtr(base64_encode($d), '+/', '-_'), '='); }
function b64u_dec(string $d): string { return base64_decode(strtr($d, '-_', '+/')); }

// ─── JWT ───────────────────────────────────────────────────────
function jwtSign(array $payload): string {
    $h = b64u_enc(json_encode(['typ'=>'JWT','alg'=>'HS256']));
    $payload['iat'] = time();
    $payload['exp'] = time() + JWT_EXPIRES;
    $p   = b64u_enc(json_encode($payload));
    $sig = b64u_enc(hash_hmac('sha256', "$h.$p", JWT_SECRET, true));
    return "$h.$p.$sig";
}
function jwtVerify(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$h, $p, $sig] = $parts;
    if (!hash_equals(b64u_enc(hash_hmac('sha256', "$h.$p", JWT_SECRET, true)), $sig)) return null;
    $data = json_decode(b64u_dec($p), true);
    if (!$data || (isset($data['exp']) && $data['exp'] < time())) return null;
    return $data;
}

// ─── Password ──────────────────────────────────────────────────
function hashPwd(string $pw): string { return password_hash($pw, PASSWORD_BCRYPT, ['cost' => 10]); }
function checkPwd(string $pw, string $hash): bool {
    if (str_starts_with($hash, '$2b$')) $hash = '$2y$' . substr($hash, 4);
    return password_verify($pw, $hash);
}

// ─── Database ──────────────────────────────────────────────────
function db(): PDO {
    static $pdo = null;
    if (!$pdo) { $pdo = new PDO(
        'mysql:host='.DB_HOST.';dbname='.DB_NAME.';charset=utf8mb4', DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
         PDO::MYSQL_ATTR_INIT_COMMAND=>"SET NAMES utf8mb4"]
    );
      $pdo->exec("SET time_zone = '+03:00'");   // Tanzania time for NOW(), CURDATE() and TIMESTAMP columns
    }
    return $pdo;
}
function q(string $sql, array $p = []): array  { $st = db()->prepare($sql); $st->execute($p); return $st->fetchAll(); }
function q1(string $sql, array $p = []): ?array { $r = q($sql, $p); return $r ? $r[0] : null; }
function qx(string $sql, array $p = []): int   { $st = db()->prepare($sql); $st->execute($p); return (int)db()->lastInsertId(); }
function qn(string $sql, array $p = []): int   { $st = db()->prepare($sql); $st->execute($p); return $st->rowCount(); }

function migrate(): void {
    static $done = false; if ($done) return; $done = true;
    $pdo = db();
    // ── Incremental column additions ──────────────────────────────
    foreach ([
        "ALTER TABLE properties ADD COLUMN latitude DECIMAL(10,8) NULL",
        "ALTER TABLE properties ADD COLUMN longitude DECIMAL(11,8) NULL",
        "ALTER TABLE users ADD COLUMN id_front_url VARCHAR(500) NULL",
        "ALTER TABLE users ADD COLUMN id_back_url VARCHAR(500) NULL",
        "ALTER TABLE bookings ADD COLUMN qr_token VARCHAR(64) NULL",
        "ALTER TABLE bookings ADD COLUMN amount_paid INT NULL",
        "ALTER TABLE bookings ADD COLUMN contract_start DATE NULL",
        "ALTER TABLE bookings ADD COLUMN contract_end DATE NULL",
        "ALTER TABLE bookings ADD COLUMN room_unit_id INT UNSIGNED NULL",
        "ALTER TABLE bookings ADD COLUMN assigned_at TIMESTAMP NULL",
        "ALTER TABLE bookings ADD COLUMN assigned_by INT UNSIGNED NULL",
        // Property type-specific fields
        "ALTER TABLE properties ADD COLUMN gender_policy ENUM('mixed','female_only','male_only') DEFAULT 'mixed'",
        "ALTER TABLE properties ADD COLUMN has_parking TINYINT(1) DEFAULT 0",
        "ALTER TABLE properties ADD COLUMN has_compound TINYINT(1) DEFAULT 0",
        "ALTER TABLE properties ADD COLUMN has_lift TINYINT(1) DEFAULT 0",
        "ALTER TABLE properties ADD COLUMN warden_name VARCHAR(120) NULL",
        "ALTER TABLE properties ADD COLUMN warden_phone VARCHAR(20) NULL",
        "ALTER TABLE properties ADD COLUMN water_source ENUM('dawasco','borehole','tank','unknown') DEFAULT 'unknown'",
        "ALTER TABLE properties ADD COLUMN electricity_backup ENUM('none','generator','solar','unknown') DEFAULT 'unknown'",
        // Move-out statuses
        "ALTER TABLE bookings MODIFY COLUMN status ENUM('pending','accepted','payment_pending','confirmed','move_in_completed','move_out_requested','move_out_completed','rejected','cancelled') DEFAULT 'pending'",
        // Track who created each property
        "ALTER TABLE properties ADD COLUMN created_by INT UNSIGNED NULL",
        "ALTER TABLE properties ADD COLUMN created_by_role VARCHAR(30) NULL",
        // Expand property_type to VARCHAR to support all types without ENUM restriction
        "ALTER TABLE properties MODIFY COLUMN property_type VARCHAR(50) NOT NULL DEFAULT 'Hostel'",
        // Older deploy columns — make nullable so INSERTs without them succeed
        "ALTER TABLE properties MODIFY COLUMN agent_id INT NULL DEFAULT NULL",
        "ALTER TABLE properties MODIFY COLUMN university_id INT NULL DEFAULT NULL",
        "ALTER TABLE properties MODIFY COLUMN distance_km DECIMAL(5,2) NULL DEFAULT NULL",
        "ALTER TABLE properties MODIFY COLUMN transport_options TEXT NULL",
        "ALTER TABLE properties MODIFY COLUMN total_floors TINYINT NULL DEFAULT NULL",
        "ALTER TABLE properties MODIFY COLUMN views_count INT NOT NULL DEFAULT 0",
        "ALTER TABLE properties MODIFY COLUMN rejection_note TEXT NULL",
        // Phone-first auth: email and whatsapp_phone are optional
        "ALTER TABLE users MODIFY COLUMN email VARCHAR(191) NULL",
        "ALTER TABLE users MODIFY COLUMN whatsapp_phone VARCHAR(30) NULL DEFAULT NULL",
        // Expand role ENUM to include geto_manager and zone_manager
        "ALTER TABLE users MODIFY COLUMN role ENUM('student','property_owner','property_manager','geto_manager','zone_manager','admin') NOT NULL DEFAULT 'student'",
        "ALTER TABLE users ADD COLUMN phone_verified TINYINT(1) DEFAULT 0",
        // Track which geto_manager helped a user register (optional referral)
        "ALTER TABLE users MODIFY COLUMN referred_by INT NULL DEFAULT NULL",
        // Username — unique, lowercase, required for students (optional at registration, forced on first login)
        "ALTER TABLE users ADD COLUMN username VARCHAR(50) NULL",
        // Booking state machine — new statuses for staff-managed payment flow
        "ALTER TABLE bookings MODIFY COLUMN status ENUM('pending','assigned','accepted','payment_pending','payment_confirmed','student_confirmed','active','confirmed','checked_in','move_in_completed','move_out_requested','move_out_completed','checked_out','rejected','cancelled') DEFAULT 'pending'",
        // Booking staff assignment — which GM is handling this booking's follow-up
        "ALTER TABLE bookings ADD COLUMN assigned_to INT UNSIGNED NULL",
        // Payment record fields — entered by GM/admin/ZM before student confirms
        "ALTER TABLE bookings ADD COLUMN payment_receipt_ref VARCHAR(100) NULL",
        "ALTER TABLE bookings ADD COLUMN payment_confirmed_by INT UNSIGNED NULL",
        "ALTER TABLE bookings ADD COLUMN payment_confirmed_at TIMESTAMP NULL",
        "ALTER TABLE bookings ADD COLUMN student_confirmed_at TIMESTAMP NULL",
        "ALTER TABLE bookings ADD COLUMN payment_note TEXT NULL",
        // Track when a booking was created by staff on behalf of a student
        "ALTER TABLE bookings ADD COLUMN booked_by_staff INT UNSIGNED NULL",
        "ALTER TABLE bookings ADD COLUMN booked_by_staff_role VARCHAR(30) NULL",
        // Deposit months — how many months rent is collected upfront as deposit
        "ALTER TABLE rooms ADD COLUMN deposit_months TINYINT UNSIGNED NOT NULL DEFAULT 1",
        // Per-unit capacity override for shared rooms (NULL = inherit room type capacity)
        "ALTER TABLE room_units ADD COLUMN capacity TINYINT UNSIGNED NULL",
        // Tenant photo taken at payment time — shown on QR check-in scan
        "ALTER TABLE bookings ADD COLUMN tenant_photo_url VARCHAR(500) NULL",
        // Add geto_officer role alongside geto_manager (backward-compat rename)
        "ALTER TABLE users MODIFY COLUMN role ENUM('student','property_owner','property_manager','geto_manager','geto_officer','zone_manager','admin') NOT NULL DEFAULT 'student'",
        // Tanzania administrative location on properties
        "ALTER TABLE properties ADD COLUMN region VARCHAR(100) NULL",
        "ALTER TABLE properties ADD COLUMN district VARCHAR(100) NULL",
        "ALTER TABLE properties ADD COLUMN ward VARCHAR(100) NULL",
        // Fix legacy bookings.agent_id column that had no DEFAULT (strict mode error on INSERT)
        "ALTER TABLE bookings MODIFY COLUMN agent_id INT NULL DEFAULT NULL",
        // Owner opt-in for automatic deposit collection + payout via Snippe
        "ALTER TABLE owner_payout_profiles ADD COLUMN auto_payout_enabled TINYINT(1) NOT NULL DEFAULT 0",
        "ALTER TABLE owner_payout_profiles ADD COLUMN auto_payout_consented_at TIMESTAMP NULL",
        // House availability set by staff: 'full' houses show a Full badge and sort last
        "ALTER TABLE properties ADD COLUMN availability ENUM('available','full') NOT NULL DEFAULT 'available'",
        "ALTER TABLE properties ADD COLUMN availability_updated_at TIMESTAMP NULL",
    ] as $sql) { try { $pdo->exec($sql); } catch(\PDOException $e) {} }
    // Zone coverage table — links a zone to specific regions/districts/wards
    try { $pdo->exec("CREATE TABLE IF NOT EXISTS zone_coverage (
        id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        zone_id     INT UNSIGNED NOT NULL,
        coverage_type ENUM('region','district','ward') NOT NULL,
        coverage_value VARCHAR(100) NOT NULL,
        UNIQUE KEY uq_zone_cov (zone_id, coverage_type, coverage_value)
    )"); } catch(\PDOException $e) {}
    // Unique index for usernames (NULLs are exempt from unique constraint in MySQL)
    try { $pdo->exec("CREATE UNIQUE INDEX idx_users_username ON users (username)"); } catch(\PDOException $e) {}
    // Room-level photos and videos (per room type, not per property)
    try { $pdo->exec("CREATE TABLE IF NOT EXISTS room_photos (
        id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        room_id    INT UNSIGNED NOT NULL,
        url        VARCHAR(500) NOT NULL,
        is_main    TINYINT(1) DEFAULT 0,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_room (room_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"); } catch(\PDOException $e) {}
    try { $pdo->exec("CREATE TABLE IF NOT EXISTS room_videos (
        id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        room_id          INT UNSIGNED NOT NULL,
        youtube_video_id VARCHAR(50) NOT NULL,
        title            VARCHAR(200) NULL,
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_room (room_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"); } catch(\PDOException $e) {}
    // university_zones: many-to-many between universities and zones (admin managed)
    try { $pdo->exec("CREATE TABLE IF NOT EXISTS university_zones (
        university_id INT UNSIGNED NOT NULL,
        zone_id       INT UNSIGNED NOT NULL,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (university_id, zone_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"); } catch(\PDOException $e) {}
    // Password reset tokens table
    try { $pdo->exec("CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id    INT UNSIGNED NOT NULL,
        token      CHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        used       TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_token (token),
        KEY idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"); } catch(\PDOException $e) {}
    try { $pdo->exec("CREATE UNIQUE INDEX idx_qr_token ON bookings (qr_token)"); } catch(\PDOException $e) {}
    // Performance indexes
    foreach ([
        "CREATE INDEX idx_bookings_student ON bookings (student_id)",
        "CREATE INDEX idx_bookings_property ON bookings (property_id)",
        "CREATE INDEX idx_bookings_status ON bookings (status)",
        "CREATE INDEX idx_rooms_property ON rooms (property_id)",
        "CREATE INDEX idx_rooms_price ON rooms (property_id, monthly_price)",
        "CREATE INDEX idx_saved_student ON saved_properties (student_id)",
        "CREATE INDEX idx_viewings_student ON viewing_requests (student_id)",
    ] as $sql) { try { $pdo->exec($sql); } catch(\PDOException $e) {} }
    // ── Reviews table ─────────────────────────────────────────────
    try { $pdo->exec("CREATE TABLE IF NOT EXISTS property_reviews (
        id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        property_id INT UNSIGNED NOT NULL,
        student_id  INT UNSIGNED NOT NULL,
        booking_id  INT UNSIGNED NOT NULL,
        rating      TINYINT NOT NULL,
        comment     TEXT NULL,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_booking_review (booking_id),
        KEY idx_review_property (property_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"); } catch(\PDOException $e) {}
    // ── Room units table ──────────────────────────────────────────
    try { $pdo->exec("CREATE TABLE IF NOT EXISTS room_units (
        id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        property_id  INT UNSIGNED NOT NULL,
        room_type_id INT UNSIGNED NOT NULL,
        unit_number  VARCHAR(20)  NOT NULL,
        floor        TINYINT UNSIGNED DEFAULT 1,
        status       ENUM('available','maintenance') DEFAULT 'available',
        is_active    TINYINT(1) DEFAULT 1,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE  KEY uq_unit  (property_id, unit_number),
        INDEX   idx_floor    (property_id, floor),
        INDEX   idx_type     (property_id, room_type_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    } catch(\PDOException $e) {}
    // Page-view analytics table (used by /api/track and admin/stats)
    try { $pdo->exec("CREATE TABLE IF NOT EXISTS page_views (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        page VARCHAR(255) NOT NULL DEFAULT '/',
        ip_hash CHAR(64) NOT NULL DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_date (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"); } catch(\PDOException $e) {}
    // Traffic source, recorded only on the first page of a visit (NULL on later pages)
    foreach ([
        "ALTER TABLE page_views ADD COLUMN source VARCHAR(40) NULL",
        "ALTER TABLE page_views ADD COLUMN referrer_host VARCHAR(120) NULL",
    ] as $sql) { try { $pdo->exec($sql); } catch(\PDOException $e) {} }
    // ── Snippe payment tables ─────────────────────────────────────
    try { $pdo->exec("CREATE TABLE IF NOT EXISTS owner_payout_profiles (
        id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        owner_id       INT UNSIGNED NOT NULL,
        payout_type    ENUM('mobile_money','bank') NOT NULL DEFAULT 'mobile_money',
        provider       VARCHAR(30) NULL,
        phone          VARCHAR(25) NULL,
        account_name   VARCHAR(100) NULL,
        account_number VARCHAR(50) NULL,
        bank_name      VARCHAR(100) NULL,
        created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_owner_payout (owner_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"); } catch(\PDOException $e) {}
    try { $pdo->exec("CREATE TABLE IF NOT EXISTS payment_transactions (
        id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        booking_id      INT UNSIGNED NULL,
        property_id     INT UNSIGNED NOT NULL,
        room_id         INT UNSIGNED NOT NULL,
        student_id      INT UNSIGNED NOT NULL,
        owner_id        INT UNSIGNED NOT NULL,
        rent_amount     INT UNSIGNED NOT NULL,
        deposit_months  TINYINT UNSIGNED NOT NULL DEFAULT 1,
        deposit_amount  INT UNSIGNED NOT NULL,
        geto_fee        INT UNSIGNED NOT NULL,
        transaction_fee INT UNSIGNED NOT NULL DEFAULT 0,
        total_amount    INT UNSIGNED NOT NULL,
        student_phone   VARCHAR(25) NOT NULL,
        snippe_ref      VARCHAR(100) NULL,
        snippe_status   ENUM('pending','completed','failed','voided','expired') DEFAULT 'pending',
        payout_status   ENUM('pending','completed','failed','skipped','not_configured') DEFAULT 'pending',
        payout_ref      VARCHAR(100) NULL,
        initiated_by    INT UNSIGNED NOT NULL,
        initiated_by_role VARCHAR(30) NOT NULL,
        webhook_data    JSON NULL,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at    TIMESTAMP NULL,
        KEY idx_pt_booking  (booking_id),
        KEY idx_pt_student  (student_id),
        KEY idx_pt_owner    (owner_id),
        KEY idx_pt_snippe   (snippe_ref)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"); } catch(\PDOException $e) {}
}

// ─── Auth Helpers ──────────────────────────────────────────────
function authUser(): array {
    // cPanel FastCGI strips Authorization; fall back to env var set by .htaccess RewriteRule
    $h = $_SERVER['HTTP_AUTHORIZATION']
      ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
      ?? (function_exists('getallheaders') ? (getallheaders()['Authorization'] ?? '') : '')
      ?? '';
    $token = str_starts_with($h, 'Bearer ') ? substr($h, 7) : '';
    $data = $token ? jwtVerify($token) : null;
    if (!$data) err(401, 'Unauthenticated.');
    return $data;
}

// Admin, Zone Manager, or Geto Officer — backend portal
function requireStaff(): array {
    $u = authUser();
    if (!in_array($u['role'] ?? '', ['admin', 'zone_manager', 'geto_manager', 'geto_officer'])) err(403, 'Backend staff only.');
    return $u;
}
// Admin or Zone Manager only (senior staff — can verify, manage staff)
function requireSeniorStaff(): array {
    $u = authUser();
    if (!in_array($u['role'] ?? '', ['admin', 'zone_manager'])) err(403, 'Senior staff only.');
    return $u;
}

// Admin only
function requireAdmin(): array {
    $u = authUser();
    if (($u['role'] ?? '') !== 'admin') err(403, 'Admin only.');
    return $u;
}

// Property Owner — their properties only
function requireOwner(): array {
    $u = authUser();
    if (!in_array($u['role'] ?? '', ['property_owner', 'property_manager'])) err(403, 'Property owner/manager only.');
    if (($u['status'] ?? '') === 'suspended') err(403, 'Account suspended.');
    return $u;
}

// Student only
function requireStudent(): array {
    $u = authUser();
    if (($u['role'] ?? '') !== 'student') err(403, 'Students only.');
    return $u;
}

// Check if a user can access a specific property
// Returns true if: admin, or zone_manager (zone matches), or owner (owner_id), or manager (assigned)
function canAccessProperty(array $user, int $propertyId): bool {
    if ($user['role'] === 'admin') return true;
    if ($user['role'] === 'zone_manager') {
        $p = q1('SELECT zone_id FROM properties WHERE id=?', [$propertyId]);
        return $p && (int)$p['zone_id'] === (int)($user['zone_id'] ?? 0);
    }
    if ($user['role'] === 'property_owner') {
        return (bool)q1('SELECT id FROM properties WHERE id=? AND owner_id=?', [$propertyId, $user['id']]);
    }
    if ($user['role'] === 'property_manager') {
        return (bool)q1('SELECT id FROM property_manager_assignments WHERE property_id=? AND manager_id=? AND is_active=1', [$propertyId, $user['id']]);
    }
    return false;
}

// Build a SQL WHERE fragment that scopes properties by role
// Returns ['clause' => string, 'params' => array]
function propertyScope(array $user, string $alias = 'p'): array {
    switch ($user['role']) {
        case 'admin':
            return ['clause' => '1=1', 'params' => []];
        case 'zone_manager':
            return ['clause' => "$alias.zone_id = ?", 'params' => [(int)($user['zone_id'] ?? 0)]];
        case 'property_owner':
            return ['clause' => "$alias.owner_id = ?", 'params' => [(int)$user['id']]];
        case 'property_manager':
            return ['clause' => "$alias.id IN (SELECT property_id FROM property_manager_assignments WHERE manager_id=? AND is_active=1)",
                    'params' => [(int)$user['id']]];
        default:
            return ['clause' => '0=1', 'params' => []];
    }
}

// ─── WebP conversion ───────────────────────────────────────────
function toWebP(string $src, string $dest): void {
    $info = @getimagesize($src);
    if (!$info) throw new Exception('Invalid image.');
    $img = match($info[2]) {
        IMAGETYPE_JPEG => imagecreatefromjpeg($src),
        IMAGETYPE_GIF  => imagecreatefromgif($src),
        IMAGETYPE_WEBP => imagecreatefromwebp($src),
        IMAGETYPE_PNG  => (function() use ($src) {
            $im = imagecreatefrompng($src);
            $bg = imagecreatetruecolor(imagesx($im), imagesy($im));
            imagefill($bg, 0, 0, imagecolorallocate($bg, 255, 255, 255));
            imagecopy($bg, $im, 0, 0, 0, 0, imagesx($im), imagesy($im));
            imagedestroy($im); return $bg;
        })(),
        default => throw new Exception('Unsupported image type.'),
    };
    imagewebp($img, $dest, 85);
    imagedestroy($img);
    @unlink($src);
}

function saveUploadedPhotos(int $propertyId): array {
    if (empty($_FILES['photos'])) return [];
    $docroot = rtrim($_SERVER['DOCUMENT_ROOT'], '/');
    $dir = "$docroot/uploads/properties/$propertyId";
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $files  = $_FILES['photos'];
    if (!is_array($files['name'])) $files = array_map(fn($v) => [$v], $files);
    $count  = count($files['name']);
    $saved  = [];
    $maxB   = MAX_FILE_MB * 1024 * 1024;
    for ($i = 0; $i < $count; $i++) {
        if ($files['error'][$i] !== UPLOAD_ERR_OK) continue;
        if ($files['size'][$i] > $maxB) continue;
        if (!str_starts_with($files['type'][$i], 'image/')) continue;
        $name = preg_replace('/\.[^.]+$/', '', basename($files['name'][$i])).'_'.time().$i.'.webp';
        $dest = "$dir/$name";
        try { toWebP($files['tmp_name'][$i], $dest); }
        catch (Exception) { move_uploaded_file($files['tmp_name'][$i], $dest); }
        $isMain = empty(q('SELECT id FROM property_photos WHERE property_id=?', [$propertyId])) ? 1 : 0;
        $ord = count($saved);
        qx('INSERT INTO property_photos (property_id,url,is_main,sort_order) VALUES (?,?,?,?)',
           [$propertyId, "/uploads/properties/$propertyId/$name", $isMain, $ord]);
        $saved[] = "/uploads/properties/$propertyId/$name";
    }
    return $saved;
}

// ─── Snippe helpers ────────────────────────────────────────────
function snippePost(string $path, array $body, string $ikey = ''): array {
    if (!defined('SNIPPE_API_KEY') || !SNIPPE_API_KEY) return ['code'=>500,'body'=>['message'=>'Snippe not configured']];
    $hdrs = ['Authorization: Bearer '.SNIPPE_API_KEY,'Content-Type: application/json','Accept: application/json'];
    if ($ikey) $hdrs[] = 'Idempotency-Key: '.substr($ikey,0,30);
    $ch = curl_init('https://api.snippe.sh'.$path);
    curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_POST=>true,
        CURLOPT_POSTFIELDS=>json_encode($body),CURLOPT_HTTPHEADER=>$hdrs,CURLOPT_TIMEOUT=>30,CURLOPT_SSL_VERIFYPEER=>true]);
    $resp = curl_exec($ch); $code = curl_getinfo($ch,CURLINFO_HTTP_CODE); curl_close($ch);
    return ['code'=>$code,'body'=>json_decode((string)$resp,true)??[]];
}
function snippeGet(string $path): array {
    if (!defined('SNIPPE_API_KEY') || !SNIPPE_API_KEY) return ['code'=>500,'body'=>['message'=>'Snippe not configured']];
    $ch = curl_init('https://api.snippe.sh'.$path);
    curl_setopt_array($ch,[CURLOPT_RETURNTRANSFER=>true,
        CURLOPT_HTTPHEADER=>['Authorization: Bearer '.SNIPPE_API_KEY,'Accept: application/json'],
        CURLOPT_TIMEOUT=>15,CURLOPT_SSL_VERIFYPEER=>true]);
    $resp = curl_exec($ch); $code = curl_getinfo($ch,CURLINFO_HTTP_CODE); curl_close($ch);
    return ['code'=>$code,'body'=>json_decode((string)$resp,true)??[]];
}
function normalizePhone(string $phone): string {
    $p = preg_replace('/\D/','',$phone);
    if (str_starts_with($p,'0')) $p = '255'.substr($p,1);
    if (!str_starts_with($p,'255')) $p = '255'.$p;
    return '+'.$p;
}

// ─── Referral code generator ───────────────────────────────────
function makeReferralCode(string $name): string {
    $base = strtoupper(preg_replace('/[^A-Z0-9]/', '', strtoupper($name)));
    $base = substr($base ?: 'USER', 0, 6);
    do { $code = 'GETO-'.$base.rand(100, 999); }
    while (q('SELECT id FROM users WHERE referral_code=?', [$code]));
    return $code;
}

// ─── SMS Helper ────────────────────────────────────────────────
// $logText: what to store in sms_logs instead of $text (to keep passwords and reset links out of the database)
function sendSMS(string $phone, string $text, string $reference = '', ?string $logText = null): bool {
    if (!defined('SMS_TOKEN') || !SMS_TOKEN) return false;
    $ref = $reference ?: 'geto'.time();
    // Next SMS expects 255XXXXXXXXX; numbers are stored as typed (07…, +255…), so convert here.
    $to  = ltrim(normalizePhone($phone), '+');
    $ch  = curl_init(defined('SMS_API_URL') ? SMS_API_URL : 'https://messaging-service.co.tz/api/sms/v2/text/single');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer '.SMS_TOKEN,
            'Content-Type: application/json',
            'Accept: application/json',
        ],
        CURLOPT_POSTFIELDS  => json_encode(['from'=>SMS_SENDER,'to'=>$to,'text'=>$text,'flash'=>0,'reference'=>$ref]),
        CURLOPT_TIMEOUT     => 10,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    $resp = curl_exec($ch);
    $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $cerr = curl_error($ch);
    curl_close($ch);
    $json   = json_decode((string)$resp, true);
    // Keep the reason when there is no normal reply, so the SMS log shows why it failed
    $status = $json['messages'][0]['status']['name']
           ?? ($cerr ? 'NETWORK_ERROR: '.substr($cerr, 0, 60) : 'HTTP_'.$http.': '.substr((string)($json['message'] ?? $resp), 0, 60));
    $msgId  = $json['messages'][0]['messageId'] ?? null;
    try { qn('INSERT INTO sms_logs (recipient_phone,message,reference,status,message_id) VALUES (?,?,?,?,?)',
              [$to, $logText ?? $text, $ref, substr($status, 0, 50), $msgId]); } catch (Exception) {}
    return isset($json['messages'][0]['status']['groupId']);
}

// Text sent to a phone in the last $minutes whose reference starts with $refPrefix (to stop SMS spam).
function recentSmsCount(string $refPrefix, int $minutes): int {
    try {
        return (int)(q1("SELECT COUNT(*) AS cnt FROM sms_logs WHERE reference LIKE ? AND sent_at >= NOW() - INTERVAL ? MINUTE",
                        [$refPrefix.'%', $minutes])['cnt'] ?? 0);
    } catch (Exception) { return 0; }
}

// Plain email through the server's mail system (used as an extra channel for password resets).
function sendEmail(string $to, string $subject, string $text): bool {
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) return false;
    $from = defined('MAIL_FROM') ? MAIL_FROM : 'no-reply@getostudent.co.tz';
    $headers = "From: Geto Student <$from>\r\nReply-To: $from\r\nContent-Type: text/plain; charset=UTF-8\r\nMIME-Version: 1.0";
    return @mail($to, '=?UTF-8?B?'.base64_encode($subject).'?=', $text, $headers, '-f'.$from);
}

function getAdminPhone(): ?string {
    $r = q1("SELECT phone FROM users WHERE role='admin' AND status='active' LIMIT 1");
    return $r['phone'] ?? null;
}

function adminBookingSmsCountToday(): int {
    $r = q1("SELECT COUNT(*) AS cnt FROM sms_logs WHERE DATE(sent_at)=CURDATE() AND reference LIKE 'booking-%'");
    return (int)($r['cnt'] ?? 0);
}

// ═══════════════════════════════════════════════════════════════
//  ROUTE HANDLERS
// ═══════════════════════════════════════════════════════════════

// ─── /api/payments/* ───────────────────────────────────────────
function routePayments(array $parts, string $method): void {
    $sub = $parts[1] ?? '';
    $b   = body();

    // GET /api/payments/fee?amount=X  — estimate Snippe collection fee
    if ($method === 'GET' && $sub === 'fee') {
        authUser();
        $amount = max(500,(int)($_GET['amount']??0));
        $r = snippeGet('/v1/payouts/fee?amount='.$amount);
        ok($r['body']['data'] ?? ['amount'=>$amount,'fee_amount'=>(int)round($amount*0.015),'total_amount'=>$amount+(int)round($amount*0.015),'currency'=>'TZS']);
    }

    // GET /api/payments/:ref  — payment status
    if ($method === 'GET' && $sub && $sub !== 'fee') {
        $u = authUser();
        $txn = q1('SELECT * FROM payment_transactions WHERE snippe_ref=?',[$sub]);
        if (!$txn) err(404,'Payment not found.');
        $allowed = in_array($u['role'],['admin','zone_manager','geto_manager','geto_officer'])
            || (int)$txn['owner_id']===(int)$u['id']
            || (int)$txn['student_id']===(int)$u['id'];
        if (!$allowed) err(403,'Access denied.');
        ok($txn);
    }

    // POST /api/payments/initiate
    if ($method === 'POST' && $sub === 'initiate') {
        $u = authUser();
        $allowed = in_array($u['role'],['admin','zone_manager','geto_manager','geto_officer','property_owner','property_manager']);
        if (!$allowed) err(403,'Not authorized to initiate payments.');

        $bookingId = !empty($b['booking_id']) ? (int)$b['booking_id'] : null;
        $roomId    = !empty($b['room_id'])    ? (int)$b['room_id']    : null;
        $studentId = !empty($b['student_id']) ? (int)$b['student_id'] : null;
        $phone     = trim($b['phone']??'');

        if ($bookingId) {
            $bk = q1("SELECT b.*,r.monthly_price,r.deposit_months,p.owner_id,p.id AS prop_id,p.property_type,
                             s.name AS s_name,s.email AS s_email,s.phone AS s_phone
                      FROM bookings b
                      JOIN rooms r ON r.id=b.room_id
                      JOIN properties p ON p.id=b.property_id
                      JOIN users s ON s.id=b.student_id
                      WHERE b.id=?",[$bookingId]);
            if (!$bk) err(404,'Booking not found.');
            if ($u['role']==='property_owner' && (int)$bk['owner_id']!==(int)$u['id']) err(403,'Not your property.');
            $roomId      = (int)$bk['room_id'];
            $studentId   = (int)$bk['student_id'];
            $ownerId     = (int)$bk['owner_id'];
            $propId      = (int)$bk['prop_id'];
            $monthly     = (int)$bk['monthly_price'];
            $depMo       = (int)($bk['deposit_months'] ?? 1);
            $propType    = $bk['property_type'] ?? 'Hostel';
            $phone       = $phone ?: $bk['s_phone'];
            $sName       = $bk['s_name']; $sEmail=$bk['s_email']??null;
        } else {
            if (!$roomId||!$studentId) err(400,'booking_id or (room_id + student_id) required.');
            $room = q1("SELECT r.*,p.owner_id,p.id AS prop_id,p.property_type FROM rooms r JOIN properties p ON p.id=r.property_id WHERE r.id=?",[$roomId]);
            if (!$room) err(404,'Room not found.');
            if ($u['role']==='property_owner' && (int)$room['owner_id']!==(int)$u['id']) err(403,'Not your property.');
            $ownerId  = (int)$room['owner_id'];
            $propId   = (int)$room['prop_id'];
            $monthly  = (int)$room['monthly_price'];
            $depMo    = (int)($room['deposit_months'] ?? 1);
            $propType = $room['property_type'] ?? 'Hostel';
            $st = q1('SELECT name,email FROM users WHERE id=?',[$studentId]);
            $sName=$st['name']??''; $sEmail=$st['email']??null;
        }

        if (!$phone) err(400,'Student phone number is required.');
        $phone = normalizePhone($phone);

        // Check if owner opted in to automatic deposit collection
        $ownerProfile = q1('SELECT auto_payout_enabled FROM owner_payout_profiles WHERE owner_id=?',[$ownerId]);
        $autoDeposit  = !empty($ownerProfile['auto_payout_enabled']);

        // Hostel: 75% of monthly; all other property types: 100% (one full extra month)
        $isHostel   = strtolower(trim($propType)) === 'hostel';
        $feeRate    = $isHostel ? GETO_FEE_RATE : 1.0;
        $depositAmt = $autoDeposit ? ($monthly * $depMo) : 0;
        $getoFee    = $isHostel ? (int)round($monthly * GETO_FEE_RATE) : $monthly;
        $subtotal   = $depositAmt + $getoFee;

        // Estimate Snippe collection fee (~1.5%)
        $feeR   = snippeGet('/v1/payouts/fee?amount='.$subtotal);
        $txFee  = (int)($feeR['body']['data']['fee_amount'] ?? (int)round($subtotal*0.015));
        $total  = $subtotal + $txFee;

        $ikey  = substr('gp'.time().rand(10,99),0,30);
        $txnId = qx('INSERT INTO payment_transactions
                     (booking_id,property_id,room_id,student_id,owner_id,rent_amount,deposit_months,
                      deposit_amount,geto_fee,transaction_fee,total_amount,student_phone,initiated_by,initiated_by_role)
                     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            [$bookingId,$propId,$roomId,$studentId,$ownerId,$monthly,$depMo,
             $depositAmt,$getoFee,$txFee,$total,$phone,(int)$u['id'],$u['role']]);

        $nameParts = explode(' ', trim($sName), 2);
        $snippeR = snippePost('/v1/payments',[
            'payment_type' => 'mobile',
            'details'      => ['amount'=>$total,'currency'=>'TZS'],
            'phone_number' => $phone,
            'webhook_url'  => 'https://getostudent.co.tz/api/webhooks/snippe',
            'customer'     => [
                'firstname' => $nameParts[0],
                'lastname'  => $nameParts[1] ?? $nameParts[0],
                'email'     => $sEmail ?? '',
                'phone'     => $phone,
            ],
            'metadata'     => ['txn_id'=>$txnId,'booking_id'=>$bookingId],
        ],$ikey);

        if ($snippeR['code']<200||$snippeR['code']>299) {
            qn('DELETE FROM payment_transactions WHERE id=?',[$txnId]);
            err(502,'Payment gateway error: '.($snippeR['body']['message']??'Unknown error'));
        }
        $ref = $snippeR['body']['data']['reference']??null;
        if ($ref) qn('UPDATE payment_transactions SET snippe_ref=? WHERE id=?',[$ref,$txnId]);

        ok([
            'transaction_id' => $txnId,
            'snippe_ref'     => $ref,
            'auto_deposit'   => $autoDeposit,
            'breakdown'      => [
                'monthly_price'  => $monthly,
                'property_type'  => $propType,
                'deposit_months' => $depMo,
                'deposit_amount' => $depositAmt,
                'geto_fee'       => $getoFee,
                'geto_fee_rate'  => $feeRate,
                'transaction_fee'=> $txFee,
                'total'          => $total,
            ],
            'phone'   => $phone,
            'status'  => 'pending',
            'message' => 'USSD push sent to '.$phone.'. Student must confirm on their phone.',
        ]);
    }

    err(404,'Payments route not found.');
}

// ─── /api/webhooks/* ───────────────────────────────────────────
function routeWebhooks(array $parts, string $method): void {
    $sub = $parts[1] ?? '';

    if ($method === 'POST' && $sub === 'snippe') {
        $rawBody = file_get_contents('php://input');

        // Verify HMAC signature — supports Snippe-Signature: t=...,v1=... or separate headers
        if (defined('SNIPPE_WEBHOOK_SECRET') && SNIPPE_WEBHOOK_SECRET) {
            $ts  = ''; $sig = '';
            $snipHdr = $_SERVER['HTTP_SNIPPE_SIGNATURE']??'';
            if ($snipHdr) {
                foreach (explode(',', $snipHdr) as $part) {
                    [$k,$v] = array_pad(explode('=',$part,2),2,'');
                    if ($k==='t')  $ts  = trim($v);
                    if ($k==='v1') $sig = trim($v);
                }
            } else {
                $ts  = $_SERVER['HTTP_X_WEBHOOK_TIMESTAMP']??'';
                $sig = $_SERVER['HTTP_X_WEBHOOK_SIGNATURE']??'';
            }
            if ($ts && $sig) {
                if (abs(time()-(int)$ts)>300) { http_response_code(400); echo '{"error":"Timestamp too old"}'; exit; }
                $expected = hash_hmac('sha256',$ts.'.'.$rawBody,SNIPPE_WEBHOOK_SECRET);
                if (!hash_equals($expected,$sig))  { http_response_code(400); echo '{"error":"Invalid signature"}'; exit; }
            }
        }

        $event = json_decode($rawBody,true);
        if (!$event) { http_response_code(200); echo '{"ok":true}'; exit; }

        $type = $event['event'] ?? $event['type'] ?? '';
        $data = $event['data']??[];
        $ref  = $data['reference']??'';

        if ($type==='payment.completed' && $ref) {
            $txn = q1('SELECT * FROM payment_transactions WHERE snippe_ref=?',[$ref]);
            if ($txn && $txn['snippe_status']!=='completed') {
                qn("UPDATE payment_transactions SET snippe_status='completed',completed_at=NOW(),webhook_data=? WHERE snippe_ref=?",
                   [json_encode($event),$ref]);
                if ($txn['booking_id']) {
                    qn("UPDATE bookings SET status='payment_confirmed',amount_paid=?,payment_confirmed_at=NOW() WHERE id=?",
                       [(int)$txn['deposit_amount'],(int)$txn['booking_id']]);
                }
                // Auto-payout to owner — only if owner opted in AND deposit was collected
                $profile = q1('SELECT * FROM owner_payout_profiles WHERE owner_id=?',[(int)$txn['owner_id']]);
                if ($profile && !empty($profile['auto_payout_enabled']) && (int)$txn['deposit_amount'] > 0) {
                    $owner = q1('SELECT name FROM users WHERE id=?',[(int)$txn['owner_id']]);
                    $pikey = substr('po'.$txn['id'].time(),0,30);
                    $pb = [
                        'amount'    => (int)$txn['deposit_amount'],
                        'currency'  => 'TZS',
                        'narration' => 'Geto payout booking #'.($txn['booking_id']??$txn['id']),
                        'metadata'  => ['txn_id'=>$txn['id']],
                    ];
                    if ($profile['payout_type']==='mobile_money') {
                        $pb['channel']   = ['type'=>'mobile_money','provider'=>$profile['provider']];
                        $pb['recipient'] = ['name'=>$owner['name']??'Owner','phone'=>ltrim($profile['phone'],'+')];
                    } else {
                        $pb['channel']   = ['type'=>'bank','bank_name'=>$profile['bank_name']];
                        $pb['recipient'] = ['name'=>$profile['account_name'],'account_number'=>$profile['account_number']];
                    }
                    $pr = snippePost('/v1/payouts/send',$pb,$pikey);
                    $pRef = $pr['body']['data']['reference']??null;
                    $pSt  = ($pr['code']>=200&&$pr['code']<300)?'pending':'failed';
                    qn('UPDATE payment_transactions SET payout_status=?,payout_ref=? WHERE id=?',
                       [$pSt,$pRef,(int)$txn['id']]);
                } else {
                    $noPayoutReason = (!$profile) ? 'not_configured' : (empty($profile['auto_payout_enabled']) ? 'owner_not_opted_in' : 'no_deposit_collected');
                    qn("UPDATE payment_transactions SET payout_status=? WHERE id=?",[$noPayoutReason,(int)$txn['id']]);
                }
            }
        } elseif (in_array($type,['payment.failed','payment.voided','payment.expired'])&&$ref) {
            $st=str_replace('payment.','',$type);
            qn("UPDATE payment_transactions SET snippe_status=?,webhook_data=? WHERE snippe_ref=?",
               [$st,json_encode($event),$ref]);
        } elseif ($type==='payout.completed') {
            $pr=$data['reference']??'';
            if ($pr) qn("UPDATE payment_transactions SET payout_status='completed' WHERE payout_ref=?",[$pr]);
        } elseif ($type==='payout.failed') {
            $pr=$data['reference']??'';
            if ($pr) qn("UPDATE payment_transactions SET payout_status='failed' WHERE payout_ref=?",[$pr]);
        }

        http_response_code(200); echo '{"ok":true}'; exit;
    }
    err(404,'Webhook route not found.');
}

// ─── GET /api/health ───────────────────────────────────────────
function routeHealth(): void {
    ok(['status'=>'ok','service'=>'Geto Student API v2','time'=>date('c')]);
}

// ─── /api/auth/* ───────────────────────────────────────────────
function routeAuth(array $parts, string $method): void {
    $sub  = $parts[1] ?? '';
    $sub2 = $parts[2] ?? '';
    $b    = body();

    // POST /api/auth/register  — student, property_owner, property_manager
    if ($method === 'POST' && $sub === 'register') {
        $role = $b['role'] ?? 'student';
        if (!in_array($role, ['student','property_owner','property_manager']))
            err(400, 'Invalid role.');
        // Phone is required; name and password required; email is optional
        foreach (['name','phone','password'] as $f)
            if (empty($b[$f])) err(400, ucfirst($f).' is required.');
        if (empty($b['terms_accepted']) || !$b['terms_accepted'])
            err(400, 'You must accept the Terms & Conditions.');
        if (strlen($b['password']) < 8) err(400, 'Password must be at least 8 characters.');
        // Phone uniqueness check (any format: 07…, 255…, +255…)
        if (q1('SELECT id FROM users WHERE phone=?', [$b['phone']]) || usersByPhone($b['phone']))
            err(409, 'Phone number already registered.');
        // Email uniqueness check only if email provided
        $email = !empty($b['email']) ? trim($b['email']) : null;
        if ($email && q1('SELECT id FROM users WHERE email=?', [$email]))
            err(409, 'Email already registered.');
        // Username — required for students, optional for owners/managers (can set later)
        $username = null;
        if (!empty($b['username'])) {
            $uname = strtolower(trim($b['username']));
            if (!preg_match('/^[a-z0-9_]{3,30}$/', $uname))
                err(400, 'Username must be 3–30 characters: lowercase letters, numbers, underscores only.');
            if (q1('SELECT id FROM users WHERE username=?', [$uname]))
                err(409, 'Username already taken. Please choose another.');
            $username = $uname;
        } elseif ($role === 'student') {
            err(400, 'Username is required for students.');
        }

        // All roles start active immediately — verified badge earned via inspection
        $status = 'active';
        // Optional: geto manager referral code (tracks which geto manager helped register)
        $getoReferrerId = null;
        if (!empty($b['geto_referral_code']) && in_array($role, ['property_owner','property_manager'])) {
            $referrer = q1("SELECT id FROM users WHERE referral_code=? AND role IN ('geto_manager','geto_officer')", [$b['geto_referral_code']]);
            if ($referrer) $getoReferrerId = $referrer['id'];
        }
        $refCode = makeReferralCode($b['name']);
        $id = qx(
            "INSERT INTO users (name,email,phone,whatsapp_phone,password_hash,role,status,university_id,
                                business_name,id_document_url,referral_code,referred_by,terms_accepted,terms_accepted_at,username)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,NOW(),?)",
            [$b['name'],$email,$b['phone'],$b['whatsapp_phone']??null,hashPwd($b['password']),
             $role,$status,$b['university_id']??null,$b['business_name']??null,null,$refCode,$getoReferrerId,$username]
        );

        // Handle referral
        if (!empty($b['referral_code'])) {
            $ref = q1('SELECT id FROM users WHERE referral_code=?', [$b['referral_code']]);
            if ($ref) {
                qx("INSERT INTO referrals (referrer_id,referred_id,referral_code,status) VALUES (?,?,?,'registered')",
                   [$ref['id'],$id,$b['referral_code']]);
                qn('UPDATE users SET referred_by=? WHERE id=?', [$ref['id'],$id]);
            }
        }

        $token = jwtSign(['id'=>$id,'role'=>$role,'status'=>$status,'name'=>$b['name'],'email'=>$email,'phone'=>$b['phone'],'username'=>$username]);
        created(['token'=>$token,'user'=>['id'=>$id,'name'=>$b['name'],'email'=>$email,
                 'phone'=>$b['phone'],'role'=>$role,'status'=>$status,'referral_code'=>$refCode,'username'=>$username]]);
    }

    // POST /api/auth/login  — student, property_owner, property_manager
    if ($method === 'POST' && $sub === 'login') {
        $cred = $b['phone_or_email'] ?? $b['email'] ?? '';
        if (empty($cred)||empty($b['password'])) err(400, 'Phone/email and password required.');
        // Detect phone vs email
        $isPhone = !str_contains($cred, '@');
        $user = $isPhone
            ? q1('SELECT u.*, un.name AS university_name FROM users u LEFT JOIN universities un ON u.university_id=un.id WHERE u.phone=?', [$cred])
            : q1('SELECT u.*, un.name AS university_name FROM users u LEFT JOIN universities un ON u.university_id=un.id WHERE u.email=?', [$cred]);
        // Phone typed in another format (07… vs +255…): match on the last 9 digits if only one user has it
        if (!$user && $isPhone && count($m = usersByPhone($cred)) === 1)
            $user = q1('SELECT u.*, un.name AS university_name FROM users u LEFT JOIN universities un ON u.university_id=un.id WHERE u.id=?', [$m[0]['id']]);
        if (!$user) err(401, 'Invalid credentials.');
        if (!checkPwd($b['password'], $user['password_hash'])) err(401, 'Invalid credentials.');
        if (in_array($user['role'], ['admin','zone_manager','geto_manager','geto_officer'])) err(403, 'Use the staff login portal.');
        if ($user['status'] === 'suspended') err(403, 'Account suspended. Contact support.');
        qn('UPDATE users SET last_login_at=NOW() WHERE id=?', [$user['id']]);
        $needsUsername = ($user['role'] === 'student' && empty($user['username']));
        $token = jwtSign(['id'=>$user['id'],'role'=>$user['role'],'status'=>$user['status'],
                          'name'=>$user['name'],'email'=>$user['email'],'phone'=>$user['phone'],
                          'username'=>$user['username']??null]);
        unset($user['password_hash']);
        ok(['token'=>$token,'user'=>$user,'needs_username'=>$needsUsername]);
    }

    // POST /api/auth/staff/login  — admin, zone_manager, geto_officer (backend portal at /admin)
    if ($method === 'POST' && $sub === 'staff' && $sub2 === 'login') {
        $cred = $b['phone_or_email'] ?? $b['email'] ?? '';
        if (empty($cred)||empty($b['password'])) err(400, 'Phone/email and password required.');
        $isPhone = !str_contains($cred, '@');
        $user = $isPhone
            ? q1('SELECT u.*, z.code AS zone_code, z.name AS zone_name FROM users u LEFT JOIN zones z ON z.id=u.zone_id WHERE u.phone=?', [$cred])
            : q1('SELECT u.*, z.code AS zone_code, z.name AS zone_name FROM users u LEFT JOIN zones z ON z.id=u.zone_id WHERE u.email=?', [$cred]);
        if (!$user) err(401, 'Invalid credentials.');
        if (!checkPwd($b['password'], $user['password_hash'])) err(401, 'Invalid credentials.');
        if (!in_array($user['role'], ['admin','zone_manager','geto_manager','geto_officer'])) err(403, 'Staff account required.');
        if ($user['status'] !== 'active') err(403, 'Account suspended.');
        qn('UPDATE users SET last_login_at=NOW() WHERE id=?', [$user['id']]);
        $token = jwtSign(['id'=>$user['id'],'role'=>$user['role'],'status'=>$user['status'],
                          'zone_id'=>$user['zone_id'],'name'=>$user['name'],'email'=>$user['email'],'phone'=>$user['phone']]);
        unset($user['password_hash']);
        ok(['token'=>$token,'user'=>$user]);
    }

    // GET /api/auth/me
    if ($method === 'GET' && $sub === 'me') {
        $u = authUser();
        $user = q1("SELECT u.id,u.name,u.email,u.phone,u.whatsapp_phone,u.role,u.status,u.zone_id,
                           u.university_id,u.business_name,u.verified,u.referral_code,u.referred_by,
                           u.avatar_url,u.last_login_at,u.created_at,u.username,
                           un.name AS university_name, z.code AS zone_code, z.name AS zone_name
                    FROM users u
                    LEFT JOIN universities un ON un.id=u.university_id
                    LEFT JOIN zones z ON z.id=u.zone_id
                    WHERE u.id=?", [$u['id']]);
        ok(['user'=>$user,'needs_username'=>($user['role']==='student' && empty($user['username']))]);
    }

    // GET /api/auth/username-check?u=xxx — public endpoint, works without auth (used during registration)
    if ($method === 'GET' && $sub === 'username-check') {
        $uname = strtolower(trim($_GET['u'] ?? ''));
        if (!$uname || !preg_match('/^[a-z0-9_]{3,30}$/', $uname))
            ok(['available'=>false,'error'=>'Username must be 3-30 characters: lowercase letters, numbers, underscores only.']);
        // Optionally exclude the current user's own row (if they are logged in)
        $excludeId = 0;
        $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
        $tok = str_starts_with($h, 'Bearer ') ? substr($h, 7) : '';
        if ($tok) { $payload = jwtVerify($tok); if ($payload) $excludeId = (int)($payload['id'] ?? 0); }
        $conflict = q1('SELECT id FROM users WHERE username=? AND id!=?', [$uname, $excludeId]);
        ok(['available'=>!$conflict]);
    }

    // PUT /api/auth/me  — update own profile
    if ($method === 'PUT' && $sub === 'me' && $sub2 !== 'username') {
        $u = authUser();
        $b = body();
        $fields = []; $params = [];
        foreach (['name','phone','whatsapp_phone','university_id','avatar_url'] as $f)
            if (isset($b[$f])) { $fields[] = "$f=?"; $params[] = $b[$f]; }
        if (!empty($b['password']) && strlen($b['password']) >= 8) {
            $fields[] = 'password_hash=?'; $params[] = hashPwd($b['password']);
        }
        if ($fields) {
            $params[] = $u['id'];
            qn('UPDATE users SET '.implode(',',$fields).' WHERE id=?', $params);
        }
        ok(['updated'=>true]);
    }

    // PUT /api/auth/me/username — set or change username
    if ($method === 'PUT' && $sub === 'me' && $sub2 === 'username') {
        $u = authUser();
        $b = body();
        $uname = strtolower(trim($b['username'] ?? ''));
        if (!$uname || !preg_match('/^[a-z0-9_]{3,30}$/', $uname))
            err(400, 'Username must be 3–30 characters: lowercase letters, numbers, underscores only.');
        $conflict = q1('SELECT id FROM users WHERE username=? AND id!=?', [$uname,(int)$u['id']]);
        if ($conflict) err(409, 'Username already taken. Please choose another.');
        qn('UPDATE users SET username=? WHERE id=?', [$uname,(int)$u['id']]);
        ok(['updated'=>true,'username'=>$uname]);
    }

    // POST /api/auth/forgot-password — reset link by SMS, plus email if the account has one.
    // The sign-in page sends phone_or_email; phone works in any format. Max 3 links per hour per account.
    if ($method === 'POST' && $sub === 'forgot-password') {
        $cred = trim((string)($b['phone_or_email'] ?? $b['email'] ?? $b['phone'] ?? ''));
        if ($cred === '') err(400, 'Enter your phone number or email.');
        if (str_contains($cred, '@')) {
            $user = q1("SELECT id,name,phone,email FROM users WHERE email=? AND status='active'", [strtolower($cred)]);
        } else {
            $m = usersByPhone($cred);
            $user = (count($m) === 1 && $m[0]['status'] === 'active')
                ? q1('SELECT id,name,phone,email FROM users WHERE id=?', [$m[0]['id']]) : null;
        }
        $recent = $user ? (int)(q1("SELECT COUNT(*) AS cnt FROM password_reset_tokens
                                    WHERE user_id=? AND created_at >= NOW() - INTERVAL 1 HOUR", [$user['id']])['cnt'] ?? 0) : 0;
        if ($user && $recent < 3) {
            $token = bin2hex(random_bytes(32));
            qn('UPDATE password_reset_tokens SET used=1 WHERE user_id=? AND used=0', [$user['id']]);   // only the newest link works
            qn("INSERT INTO password_reset_tokens (user_id,token,expires_at) VALUES (?,?,DATE_ADD(NOW(),INTERVAL 1 HOUR))",
               [$user['id'], $token]);
            // Fixed site address: never build the link from the request's Host header (link-spoofing risk)
            $resetUrl = (defined('SITE_URL') ? SITE_URL : 'https://getostudent.co.tz') . "/auth?tab=reset-password&token=$token";
            sendSMS($user['phone'], "GETO STUDENT: Badilisha nenosiri: $resetUrl (Muda: saa 1)", 'pw-reset-'.$user['id'].'-'.time(),
                    'GETO STUDENT: Badilisha nenosiri: [reset link hidden] (Muda: saa 1)');
            if (!empty($user['email']))
                sendEmail($user['email'], 'Geto Student: reset your password',
                    "Hello {$user['name']},\n\nUse this link to set a new password (valid for 1 hour):\n$resetUrl\n\n"
                  . "Tumia kiungo hiki kubadilisha nenosiri (kinafanya kazi kwa saa 1).\n\n"
                  . "If you didn't ask for this, ignore this message.\n\nGeto Student");
        }
        ok(['message'=>'If this phone number or email is registered, a reset link has been sent.']);
    }

    // POST /api/auth/reset-password
    if ($method === 'POST' && $sub === 'reset-password') {
        $token    = trim($b['token'] ?? '');
        $password = $b['password'] ?? '';
        if (!$token) err(400, 'Reset token required.');
        if (strlen($password) < 8) err(400, 'Password must be at least 8 characters.');
        $row = q1("SELECT * FROM password_reset_tokens WHERE token=? AND used=0 AND expires_at > NOW()", [$token]);
        if (!$row) err(400, 'Invalid or expired reset link. Please request a new one.');
        qn('UPDATE users SET password_hash=? WHERE id=?', [hashPwd($password), $row['user_id']]);
        qn('UPDATE password_reset_tokens SET used=1 WHERE id=?', [$row['id']]);
        ok(['message'=>'Password updated successfully. You can now sign in.']);
    }

    err(404, 'Auth route not found.');
}

// ─── /api/zones, /api/clusters ─────────────────────────────────
function routeZones(array $parts, string $method): void {
    if ($method === 'GET') ok(q('SELECT * FROM zones WHERE active=1 ORDER BY code'));
    err(405, 'Method not allowed.');
}
function routeClusters(array $parts, string $method): void {
    if ($method === 'GET') {
        $zid = $_GET['zone_id'] ?? null;
        if ($zid) ok(q('SELECT * FROM clusters WHERE zone_id=? AND active=1 ORDER BY code', [(int)$zid]));
        ok(q('SELECT c.*, z.code AS zone_code, z.name AS zone_name FROM clusters c JOIN zones z ON z.id=c.zone_id WHERE c.active=1 ORDER BY c.code'));
    }
    err(405, 'Method not allowed.');
}

// ─── /api/universities ─────────────────────────────────────────
function routeUniversities(array $parts, string $method): void {
    $id   = isset($parts[1]) && is_numeric($parts[1]) ? (int)$parts[1] : null;
    $sub2 = $parts[2] ?? '';
    // ── /api/universities/:id/zones — manage university-zone links (admin only) ──
    if ($id && $sub2 === 'zones') {
        requireAdmin();
        if ($method === 'GET') {
            ok(q('SELECT uz.zone_id, z.code, z.name FROM university_zones uz JOIN zones z ON z.id=uz.zone_id WHERE uz.university_id=?', [$id]));
        }
        if ($method === 'POST') {
            $b = body();
            $zid = (int)($b['zone_id'] ?? 0);
            if (!$zid) err(400, 'zone_id required.');
            qn('INSERT IGNORE INTO university_zones (university_id,zone_id) VALUES (?,?)', [$id,$zid]);
            ok(['linked'=>true]);
        }
        if ($method === 'DELETE') {
            $zid3 = isset($parts[3]) ? (int)$parts[3] : (int)(body()['zone_id'] ?? 0);
            if (!$zid3) err(400, 'zone_id required.');
            qn('DELETE FROM university_zones WHERE university_id=? AND zone_id=?', [$id,$zid3]);
            ok(['unlinked'=>true]);
        }
        err(405, 'Method not allowed.');
    }
    if ($method === 'GET' && !$id) {
        ok(q("SELECT u.id,u.name,u.short_name,u.area,u.district,u.zone_id,u.cluster_id,
                     u.gps_lat,u.gps_lng,u.image_url,z.code AS zone_code,z.name AS zone_name,
                     c.code AS cluster_code,c.name AS cluster_name,
                     COUNT(p.id) AS property_count
              FROM universities u
              LEFT JOIN zones z ON z.id=u.zone_id
              LEFT JOIN clusters c ON c.id=u.cluster_id
              LEFT JOIN properties p ON p.nearest_university_id=u.id AND p.status='approved'
              WHERE u.active=1
              GROUP BY u.id ORDER BY u.name"));
    }
    if ($method === 'GET' && $id) {
        ok(q1("SELECT u.*,z.code AS zone_code,z.name AS zone_name FROM universities u
               LEFT JOIN zones z ON z.id=u.zone_id WHERE u.id=?", [$id]));
    }
    // POST /api/universities — admin adds a university
    if ($method === 'POST') {
        requireAdmin();
        $b = body();
        if (empty($b['name'])) err(400, 'University name required.');
        $uid = qx('INSERT INTO universities (name,short_name,area,district,zone_id,cluster_id,gps_lat,gps_lng) VALUES (?,?,?,?,?,?,?,?)',
            [$b['name'], $b['short_name']??null, $b['area']??null, $b['district']??null,
             !empty($b['zone_id']) ? (int)$b['zone_id'] : null,
             !empty($b['cluster_id']) ? (int)$b['cluster_id'] : null,
             $b['gps_lat']??null, $b['gps_lng']??null]);
        ok(['id'=>$uid, 'message'=>'University created.']);
    }
    // PUT /api/universities/:id — admin edits a university
    if ($method === 'PUT' && $id) {
        requireAdmin();
        $b = body();
        $fields=[]; $params=[];
        foreach (['name','short_name','area','district','gps_lat','gps_lng'] as $f)
            if (array_key_exists($f,$b)) { $fields[]="$f=?"; $params[]=$b[$f]; }
        foreach (['zone_id','cluster_id'] as $f)
            if (array_key_exists($f,$b)) { $fields[]="$f=?"; $params[]= !empty($b[$f]) ? (int)$b[$f] : null; }
        if ($fields) { $params[]=$id; qn('UPDATE universities SET '.implode(',',$fields).' WHERE id=?',$params); }
        ok(['updated'=>true]);
    }
    // DELETE /api/universities/:id — admin soft-deletes (deactivates) a university
    if ($method === 'DELETE' && $id) {
        requireAdmin();
        qn('UPDATE universities SET active=0 WHERE id=?', [$id]);
        ok(['deleted'=>true]);
    }
    err(405, 'Method not allowed.');
}

// ─── /api/amenities ────────────────────────────────────────────
function routeAmenities(array $parts, string $method): void {
    if ($method === 'GET') ok(q('SELECT * FROM amenities ORDER BY name'));
    err(405, 'Method not allowed.');
}

// ─── /api/properties (public search + detail) ──────────────────
function routeProperties(array $parts, string $method): void {
    $id  = isset($parts[1]) && is_numeric($parts[1]) ? (int)$parts[1] : null;
    $sub = $id ? ($parts[2] ?? '') : '';

    // GET /api/properties — public listing / search
    if ($method === 'GET' && !$id) {
        $sql = "SELECT p.id,p.name,p.property_type,p.area,p.landmark,p.highlight,p.transport_options,
                       p.verified,p.youtube_video_id,p.views_count,p.created_at,p.availability,
                       p.nearest_university_id,u.name AS university_name,u.short_name AS university_short,
                       z.code AS zone_code,z.name AS zone_name,c.code AS cluster_code,c.name AS cluster_name,
                       COALESCE(
                           (SELECT ph.url FROM property_photos ph WHERE ph.property_id=p.id ORDER BY ph.is_main DESC,ph.sort_order,ph.id LIMIT 1),
                           (SELECT rp.url FROM room_photos rp JOIN rooms pr ON pr.id=rp.room_id WHERE pr.property_id=p.id ORDER BY rp.is_main DESC,rp.sort_order,rp.id LIMIT 1)
                       ) AS main_photo,
                       MIN(r.monthly_price) AS price_from,
                       SUM(r.total_count - r.occupied_count) AS rooms_available,
                       GROUP_CONCAT(DISTINCT pu_u.short_name ORDER BY pu_u.short_name SEPARATOR ', ') AS nearby_universities,
                       (SELECT ROUND(AVG(rv.rating),1) FROM property_reviews rv WHERE rv.property_id=p.id) AS avg_rating,
                       (SELECT COUNT(*) FROM property_reviews rv WHERE rv.property_id=p.id) AS review_count
                FROM properties p
                JOIN universities u ON u.id=p.nearest_university_id
                LEFT JOIN property_universities pu ON pu.property_id=p.id
                LEFT JOIN universities pu_u ON pu_u.id=pu.university_id
                LEFT JOIN zones z ON z.id=p.zone_id
                LEFT JOIN clusters c ON c.id=p.cluster_id
                LEFT JOIN rooms r ON r.property_id=p.id
                WHERE p.status='approved'";
        $params = [];
        if (!empty($_GET['university_id'])) {
            $uid = (int)$_GET['university_id'];
            $sql .= ' AND (p.nearest_university_id=? OR p.id IN (SELECT property_id FROM property_universities WHERE university_id=?))';
            $params[] = $uid; $params[] = $uid;
        }
        if (!empty($_GET['zone_id'])) { $sql .= ' AND p.zone_id=?'; $params[] = (int)$_GET['zone_id']; }
        if (!empty($_GET['verified_only']) && $_GET['verified_only']==='true') $sql .= ' AND p.verified=1';
        if (!empty($_GET['available_only']) && $_GET['available_only']==='true') $sql .= " AND p.availability='available'";
        if (!empty($_GET['area'])) { $sql .= ' AND (p.area LIKE ? OR p.landmark LIKE ?)'; $params[] = '%'.$_GET['area'].'%'; $params[] = '%'.$_GET['area'].'%'; }
        if (!empty($_GET['q'])) {
            $sql .= ' AND (p.name LIKE ? OR p.description LIKE ? OR p.area LIKE ? OR p.landmark LIKE ?)';
            $params[] = '%'.$_GET['q'].'%'; $params[] = '%'.$_GET['q'].'%'; $params[] = '%'.$_GET['q'].'%'; $params[] = '%'.$_GET['q'].'%';
        }
        if (!empty($_GET['price_max'])) {
            $sql .= ' AND p.id IN (SELECT property_id FROM rooms WHERE monthly_price<=?)';
            $params[] = (int)$_GET['price_max'];
        }
        if (!empty($_GET['room_type'])) {
            $sql .= ' AND p.id IN (SELECT property_id FROM rooms WHERE room_type=?)';
            $params[] = $_GET['room_type'];
        }
        if (!empty($_GET['property_type'])) {
            $sql .= ' AND p.property_type=?';
            $params[] = $_GET['property_type'];
        }
        if (!empty($_GET['furnished']) && $_GET['furnished'] === 'true') {
            $sql .= ' AND p.id IN (SELECT property_id FROM rooms WHERE furnished=1)';
        }
        if (!empty($_GET['bathroom_type'])) {
            $sql .= ' AND p.id IN (SELECT property_id FROM rooms WHERE bathroom_type=?)';
            $params[] = $_GET['bathroom_type'];
        }
        $sql .= ' GROUP BY p.id';
        $sort = $_GET['sort'] ?? '';
        $sql .= " ORDER BY p.availability='full',";   // full houses always go last
        if ($sort === 'price_asc')  $sql .= ' MIN(r.monthly_price) ASC';
        elseif ($sort === 'price_desc') $sql .= ' MIN(r.monthly_price) DESC';
        elseif ($sort === 'newest')     $sql .= ' p.created_at DESC';
        elseif ($sort === 'verified')   $sql .= ' p.verified DESC, p.created_at DESC';
        else                            $sql .= ' p.verified DESC, p.created_at DESC';
        $limit = !empty($_GET['limit']) ? min((int)$_GET['limit'], 100) : 60;
        $sql  .= ' LIMIT ' . $limit;
        if (!empty($_GET['offset'])) $sql .= ' OFFSET ' . max(0, (int)$_GET['offset']);
        ok(q($sql, $params));
    }

    // GET /api/properties/:id — public detail
    if ($method === 'GET' && $id && !$sub) {
        $prop = q1("SELECT p.*,
                           u.name AS university_name,u.short_name AS university_short,u.area AS university_area,
                           z.code AS zone_code,z.name AS zone_name,
                           c.code AS cluster_code,c.name AS cluster_name,
                           ow.name AS owner_name
                    FROM properties p
                    JOIN universities u ON u.id=p.nearest_university_id
                    LEFT JOIN zones z ON z.id=p.zone_id
                    LEFT JOIN clusters c ON c.id=p.cluster_id
                    LEFT JOIN users ow ON ow.id=p.owner_id
                    WHERE p.id=? AND p.status='approved'", [$id]);
        if (!$prop) err(404, 'Nyumba haikupatikana.');
        unset($prop['owner_id'],$prop['rejection_note']);
        $photos    = q('SELECT * FROM property_photos WHERE property_id=? ORDER BY is_main DESC,sort_order', [$id]);
        $amenities = q('SELECT a.name,a.icon FROM amenities a JOIN property_amenities pa ON pa.amenity_id=a.id WHERE pa.property_id=?', [$id]);
        $ACTIVE = "'payment_confirmed','student_confirmed','active','checked_in'";
        $rooms = q("SELECT r.id, r.room_type, r.monthly_price, r.deposit, r.deposit_months,
                           r.capacity, r.total_count, r.occupied_count,
                           (r.total_count - r.occupied_count) AS available_count,
                           r.floor, r.furnished, r.bathroom_type, r.description,
                           COUNT(DISTINCT ru.id) AS listed_units,
                           SUM(COALESCE(ru.capacity, r.capacity)) AS total_beds,
                           GREATEST(0, SUM(COALESCE(ru.capacity, r.capacity)) - COUNT(b.id)) AS beds_available
                    FROM rooms r
                    LEFT JOIN room_units ru ON ru.room_type_id=r.id AND ru.property_id=r.property_id AND ru.is_active=1
                    LEFT JOIN bookings b ON b.room_unit_id=ru.id AND b.status IN ($ACTIVE)
                    WHERE r.property_id=?
                    GROUP BY r.id
                    ORDER BY r.monthly_price", [$id]);
        foreach ($rooms as &$rm) {
            $rm['photos'] = q('SELECT id,url FROM room_photos WHERE room_id=? ORDER BY sort_order', [$rm['id']]);
        } unset($rm);
        $verif     = q1('SELECT * FROM verification_records WHERE property_id=?', [$id]);
        $avgRating = q1('SELECT ROUND(AVG(rating),1) AS avg_rating, COUNT(*) AS review_count FROM property_reviews WHERE property_id=?', [$id]);
        $reviews   = q('SELECT rv.id,rv.rating,rv.comment,rv.created_at,u.name AS student_name
                        FROM property_reviews rv JOIN users u ON u.id=rv.student_id
                        WHERE rv.property_id=? ORDER BY rv.created_at DESC LIMIT 20', [$id]);
        qn('UPDATE properties SET views_count=views_count+1 WHERE id=?', [$id]);
        ok(array_merge($prop,['photos'=>$photos,'amenities'=>$amenities,'rooms'=>$rooms,'verification'=>$verif,
            'avg_rating'=>$avgRating['avg_rating'],'review_count'=>(int)$avgRating['review_count'],'reviews'=>$reviews]));
    }

    // GET /api/properties/:id/reviews — paginated reviews
    if ($method === 'GET' && $id && $sub === 'reviews') {
        $offset = max(0,(int)($_GET['offset']??0));
        $rows = q('SELECT rv.id,rv.rating,rv.comment,rv.created_at,u.name AS student_name
                   FROM property_reviews rv JOIN users u ON u.id=rv.student_id
                   WHERE rv.property_id=? ORDER BY rv.created_at DESC LIMIT 20 OFFSET '.$offset, [$id]);
        ok($rows);
    }

    // POST /api/properties/:id/reviews — student submits a review
    if ($method === 'POST' && $id && $sub === 'reviews') {
        $u = requireStudent();
        $b = body();
        $rating = (int)($b['rating']??0);
        if ($rating < 1 || $rating > 5) err(400,'Rating must be 1–5.');
        $booking = q1("SELECT id FROM bookings WHERE student_id=? AND property_id=? AND status IN ('move_in_completed','move_out_completed') LIMIT 1",
                      [$u['id'],$id]);
        if (!$booking) err(403,'You must have lived in this property to leave a review.');
        $existing = q1('SELECT id FROM property_reviews WHERE booking_id=?',[$booking['id']]);
        if ($existing) err(409,'You have already reviewed this property.');
        $rid = qx('INSERT INTO property_reviews (property_id,student_id,booking_id,rating,comment) VALUES (?,?,?,?,?)',
                  [$id,$u['id'],$booking['id'],$rating,$b['comment']??null]);
        $row = q1('SELECT rv.id,rv.rating,rv.comment,rv.created_at,u.name AS student_name
                   FROM property_reviews rv JOIN users u ON u.id=rv.student_id WHERE rv.id=?',[$rid]);
        created($row);
    }

    // POST /api/properties/:id/save  — student saves a property
    if ($method === 'POST' && $id && $sub === 'save') {
        $u = requireStudent();
        qn('INSERT IGNORE INTO saved_properties (student_id,property_id) VALUES (?,?)', [$u['id'],$id]);
        ok(['saved'=>true]);
    }
    if ($method === 'DELETE' && $id && $sub === 'save') {
        $u = requireStudent();
        qn('DELETE FROM saved_properties WHERE student_id=? AND property_id=?', [$u['id'],$id]);
        ok(['saved'=>false]);
    }

    err(404, 'Route not found.');
}

// ─── /api/portal/*  — Owner & Manager portal ───────────────────
function routePortal(array $parts, string $method): void {
    $sub  = $parts[1] ?? '';
    $sub2 = $parts[2] ?? '';
    $sub3 = $parts[3] ?? '';
    $b    = body();
    $u    = requireOwner();
    $scope = propertyScope($u);

    // ── GET /api/portal/stats ──────────────────────────────────
    if ($method === 'GET' && $sub === 'stats') {
        [$clause, $params] = [$scope['clause'], $scope['params']];
        $props = q1("SELECT COUNT(*) AS total_properties,
                            SUM(p.status='approved') AS approved,
                            SUM(p.status='pending') AS pending,
                            SUM(p.verified=1) AS verified
                     FROM properties p WHERE $clause", $params);
        $roomStats = q1("SELECT SUM(r.total_count) AS total_rooms,
                                SUM(r.occupied_count) AS occupied_rooms,
                                SUM(r.total_count - r.occupied_count) AS available_rooms
                         FROM rooms r
                         JOIN properties p ON p.id=r.property_id WHERE $clause", $params);
        $bookStats = q1("SELECT COUNT(*) AS total_bookings,
                                SUM(b.status='pending') AS pending_bookings,
                                SUM(b.status='confirmed') AS confirmed_bookings
                         FROM bookings b
                         JOIN properties p ON p.id=b.property_id WHERE $clause", $params);
        ok(array_merge($props??[], $roomStats??[], $bookStats??[]));
    }

    // ── GET /api/portal/properties ────────────────────────────
    if ($method === 'GET' && $sub === 'properties') {
        [$clause, $params] = [$scope['clause'], $scope['params']];
        ok(q("SELECT p.id,p.name,p.property_type,p.area,p.status,p.verified,p.views_count,p.created_at,
                     p.nearest_university_id,u.name AS university_name,
                     z.code AS zone_code,z.name AS zone_name,
                     ow.name AS owner_name,
                     COALESCE(
                           (SELECT ph.url FROM property_photos ph WHERE ph.property_id=p.id ORDER BY ph.is_main DESC,ph.sort_order,ph.id LIMIT 1),
                           (SELECT rp.url FROM room_photos rp JOIN rooms pr ON pr.id=rp.room_id WHERE pr.property_id=p.id ORDER BY rp.is_main DESC,rp.sort_order,rp.id LIMIT 1)
                       ) AS main_photo,
                     COUNT(DISTINCT r.id) AS room_types,
                     SUM(r.total_count) AS total_rooms,
                     SUM(r.occupied_count) AS occupied_rooms,
                     SUM(r.total_count - r.occupied_count) AS available_rooms
              FROM properties p
              JOIN universities u ON u.id=p.nearest_university_id
              LEFT JOIN zones z ON z.id=p.zone_id
              LEFT JOIN users ow ON ow.id=p.owner_id
              LEFT JOIN rooms r ON r.property_id=p.id
              WHERE $clause
              GROUP BY p.id ORDER BY p.created_at DESC", $params));
    }

    // ── POST /api/portal/properties  — register a new property ─
    if ($method === 'POST' && $sub === 'properties' && !$sub2) {
        // Both property_owner and property_manager can list
        foreach (['name','property_type','nearest_university_id','area','address','description'] as $f)
            if (empty($b[$f])) err(400, "Field '$f' is required.");
        $nearUniId = (int)$b['nearest_university_id'];
        $uni = q1('SELECT zone_id,cluster_id FROM universities WHERE id=?', [$nearUniId]);
        // Auto-assign zone_id from coverage (ward → district → region precedence)
        $autoZoneId = null;
        if (!empty($b['ward'])) {
            $r = q1("SELECT zone_id FROM zone_coverage WHERE coverage_type='ward' AND coverage_value=? LIMIT 1", [$b['ward']]);
            if ($r) $autoZoneId = $r['zone_id'];
        }
        if (!$autoZoneId && !empty($b['district'])) {
            $r = q1("SELECT zone_id FROM zone_coverage WHERE coverage_type='district' AND coverage_value=? LIMIT 1", [$b['district']]);
            if ($r) $autoZoneId = $r['zone_id'];
        }
        if (!$autoZoneId && !empty($b['region'])) {
            $r = q1("SELECT zone_id FROM zone_coverage WHERE coverage_type='region' AND coverage_value=? LIMIT 1", [$b['region']]);
            if ($r) $autoZoneId = $r['zone_id'];
        }
        $resolvedZoneId = $autoZoneId ?? ($b['zone_id'] ?? ($uni['zone_id'] ?? null));
        $pdo = db();
        $pdo->beginTransaction();
        try {
            $pid = qx(
                "INSERT INTO properties (owner_id,name,property_type,nearest_university_id,university_id,
                                         zone_id,cluster_id,region,district,ward,area,address,distance_km,transport_options,
                                         description,youtube_video_id,total_floors,status,
                                         views_count,rejection_note,created_by,created_by_role)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'approved',0,NULL,?,?)",
                [$u['id'],$b['name'],$b['property_type'],$nearUniId,$nearUniId,
                 $resolvedZoneId,$uni['cluster_id']??null,
                 $b['region']??null,$b['district']??null,$b['ward']??null,
                 $b['area'],$b['address'],$b['distance_km']??null,$b['transport_options']??null,
                 $b['description'],$b['youtube_video_id']??null,$b['total_floors']??null,
                 (int)$u['id'],$u['role']]
            );
            // Save university eligibility (multi-university select)
            $portalUniIds = array_filter(array_map('intval', (array)($b['university_ids'] ?? [$nearUniId])));
            if (!in_array($nearUniId, $portalUniIds)) $portalUniIds[] = $nearUniId;
            foreach ($portalUniIds as $puid) {
                if ($puid > 0) qn('INSERT IGNORE INTO property_universities (property_id,university_id) VALUES (?,?)', [$pid,$puid]);
            }
            if (!empty($b['amenity_ids']) && is_array($b['amenity_ids'])) {
                foreach ($b['amenity_ids'] as $aid)
                    qx('INSERT INTO property_amenities (property_id,amenity_id) VALUES (?,?)', [$pid,(int)$aid]);
            }
            if (!empty($b['rooms']) && is_array($b['rooms'])) {
                foreach ($b['rooms'] as $rm)
                    qx("INSERT INTO rooms (property_id,room_type,monthly_price,deposit,capacity,total_count,
                                          occupied_count,floor,furnished,bathroom_type,description)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                       [$pid,$rm['room_type'],$rm['monthly_price'],$rm['deposit']??0,
                        $rm['capacity']??1,$rm['total_count']??1,$rm['occupied_count']??0,
                        $rm['floor']??null,!empty($rm['furnished'])?1:0,
                        $rm['bathroom_type']??'Shared',$rm['description']??null]);
            }
            $pdo->commit();
            created(['message'=>'Property is now live! Contact Geto Student to schedule a verification visit and earn the verified badge.','propertyId'=>$pid]);
        } catch (Exception $e) { $pdo->rollBack(); error_log('Geto API: owner property register failed: '.$e->getMessage()); err(500, 'Could not save the property. Please try again.'); }
    }

    // ── GET /api/portal/properties/:id ───────────────────────
    if ($method === 'GET' && $sub === 'properties' && is_numeric($sub2)) {
        $pid = (int)$sub2;
        if (!canAccessProperty($u, $pid)) err(403, 'Access denied.');
        $prop = q1("SELECT p.*,u.name AS university_name,z.code AS zone_code,z.name AS zone_name,
                           c.code AS cluster_code,c.name AS cluster_name
                    FROM properties p
                    JOIN universities u ON u.id=p.nearest_university_id
                    LEFT JOIN zones z ON z.id=p.zone_id LEFT JOIN clusters c ON c.id=p.cluster_id
                    WHERE p.id=?", [$pid]);
        if (!$prop) err(404, 'Property not found.');
        $photos    = q('SELECT * FROM property_photos WHERE property_id=? ORDER BY is_main DESC,sort_order', [$pid]);
        $amenities = q('SELECT a.id,a.name,a.icon FROM amenities a JOIN property_amenities pa ON pa.amenity_id=a.id WHERE pa.property_id=?', [$pid]);
        $rooms     = q('SELECT *,(total_count-occupied_count) AS available_count FROM rooms WHERE property_id=? ORDER BY monthly_price', [$pid]);
        foreach ($rooms as &$rm) {
            $rm['photos'] = q('SELECT id,url,is_main,sort_order FROM room_photos WHERE room_id=? ORDER BY is_main DESC,sort_order', [$rm['id']]);
            $rm['videos'] = q('SELECT id,youtube_video_id,title FROM room_videos WHERE room_id=?', [$rm['id']]);
        } unset($rm);
        $tenants   = q("SELECT t.*,r.room_type FROM tenants t JOIN rooms r ON r.id=t.room_id WHERE t.property_id=? AND t.status='active' ORDER BY t.name", [$pid]);
        $manager   = q1("SELECT u.id,u.name,u.email,u.phone FROM property_manager_assignments pma JOIN users u ON u.id=pma.manager_id WHERE pma.property_id=? AND pma.is_active=1", [$pid]);
        ok(array_merge($prop,['photos'=>$photos,'amenities'=>$amenities,'rooms'=>$rooms,'tenants'=>$tenants,'manager'=>$manager]));
    }

    // ── PUT /api/portal/properties/:id  — update property ────
    if ($method === 'PUT' && $sub === 'properties' && is_numeric($sub2)) {
        $pid = (int)$sub2;
        if (!canAccessProperty($u, $pid)) err(403, 'Access denied.');
        $allowed = ['name','description','region','district','ward','area','address','distance_km','transport_options',
                    'youtube_video_id','zone_id','cluster_id','total_floors'];
        $fields = []; $params = [];
        foreach ($allowed as $f) if (isset($b[$f])) { $fields[] = "$f=?"; $params[] = $b[$f]; }
        if ($fields) { $params[] = $pid; qn('UPDATE properties SET '.implode(',',$fields).' WHERE id=?', $params); }
        ok(['updated'=>true]);
    }

    // ── POST /api/portal/properties/:id/photos ───────────────
    if ($method === 'POST' && $sub === 'properties' && is_numeric($sub2) && $sub3 === 'photos') {
        $pid = (int)$sub2;
        if (!canAccessProperty($u, $pid)) err(403, 'Access denied.');
        $saved = saveUploadedPhotos($pid);
        ok(['uploaded'=>count($saved),'photos'=>$saved]);
    }

    // ── DELETE /api/portal/photos/:photo_id ──────────────────
    if ($method === 'DELETE' && $sub === 'photos' && is_numeric($sub2)) {
        $phid = (int)$sub2;
        $photo = q1('SELECT property_id,url FROM property_photos WHERE id=?', [$phid]);
        if (!$photo || !canAccessProperty($u, (int)$photo['property_id'])) err(403, 'Access denied.');
        $docroot = rtrim($_SERVER['DOCUMENT_ROOT'], '/');
        @unlink($docroot.$photo['url']);
        qn('DELETE FROM property_photos WHERE id=?', [$phid]);
        ok(['deleted'=>true]);
    }

    // ── POST /api/portal/rooms/:id/photos — upload room-type photos ──
    if ($method === 'POST' && $sub === 'rooms' && is_numeric($sub2) && $sub3 === 'photos') {
        $rid = (int)$sub2;
        $room = q1('SELECT property_id FROM rooms WHERE id=?', [$rid]);
        if (!$room || !canAccessProperty($u, (int)$room['property_id'])) err(403, 'Access denied.');
        if (empty($_FILES['photos'])) err(400, 'No photos uploaded.');
        $docroot = rtrim($_SERVER['DOCUMENT_ROOT'], '/');
        $dir = "$docroot/uploads/rooms/$rid";
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        $files = $_FILES['photos'];
        if (!is_array($files['name'])) $files = array_map(fn($v) => [$v], $files);
        $count = count($files['name']); $saved = [];
        $maxB  = MAX_FILE_MB * 1024 * 1024;
        for ($i = 0; $i < $count; $i++) {
            if ($files['error'][$i] !== UPLOAD_ERR_OK) continue;
            if ($files['size'][$i] > $maxB || !str_starts_with($files['type'][$i], 'image/')) continue;
            $name = preg_replace('/\.[^.]+$/', '', basename($files['name'][$i])).'_'.time().$i.'.webp';
            $dest = "$dir/$name";
            try { toWebP($files['tmp_name'][$i], $dest); }
            catch (Exception) { move_uploaded_file($files['tmp_name'][$i], $dest); }
            $isMain = empty(q('SELECT id FROM room_photos WHERE room_id=?', [$rid])) ? 1 : 0;
            $ord = count($saved);
            qx('INSERT INTO room_photos (room_id,url,is_main,sort_order) VALUES (?,?,?,?)',
               [$rid, "/uploads/rooms/$rid/$name", $isMain, $ord]);
            $saved[] = "/uploads/rooms/$rid/$name";
        }
        ok(['uploaded'=>count($saved),'photos'=>$saved]);
    }

    // ── DELETE /api/portal/room-photos/:id ───────────────────
    if ($method === 'DELETE' && $sub === 'room-photos' && is_numeric($sub2)) {
        $phid = (int)$sub2;
        $ph = q1('SELECT rp.url, r.property_id FROM room_photos rp JOIN rooms r ON r.id=rp.room_id WHERE rp.id=?', [$phid]);
        if (!$ph || !canAccessProperty($u, (int)$ph['property_id'])) err(403, 'Access denied.');
        $docroot = rtrim($_SERVER['DOCUMENT_ROOT'], '/');
        @unlink($docroot.$ph['url']);
        qn('DELETE FROM room_photos WHERE id=?', [$phid]);
        ok(['deleted'=>true]);
    }

    // ── GET /api/portal/rooms/:property_id ───────────────────
    if ($method === 'GET' && $sub === 'rooms' && is_numeric($sub2)) {
        $pid = (int)$sub2;
        if (!canAccessProperty($u, $pid)) err(403, 'Access denied.');
        ok(q('SELECT id,room_type,monthly_price,deposit,deposit_months,capacity,total_count,occupied_count,(total_count-occupied_count) AS available_count,floor,furnished,bathroom_type,description FROM rooms WHERE property_id=? ORDER BY monthly_price', [$pid]));
    }

    // ── POST /api/portal/rooms  — add room category ──────────
    if ($method === 'POST' && $sub === 'rooms') {
        foreach (['property_id','room_type','monthly_price'] as $f)
            if (empty($b[$f])) err(400, "Field '$f' required.");
        $pid = (int)$b['property_id'];
        if (!canAccessProperty($u, $pid)) err(403, 'Access denied.');
        $rid = qx("INSERT INTO rooms (property_id,room_type,monthly_price,deposit,capacity,total_count,
                                      occupied_count,floor,furnished,bathroom_type,description)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                  [$pid,$b['room_type'],$b['monthly_price'],$b['deposit']??0,$b['capacity']??1,
                   $b['total_count']??1,$b['occupied_count']??0,$b['floor']??null,
                   !empty($b['furnished'])?1:0,$b['bathroom_type']??'Shared',$b['description']??null]);
        created(['roomId'=>$rid]);
    }

    // ── PUT /api/portal/rooms/:id  — update occupancy/price ──
    if ($method === 'PUT' && $sub === 'rooms' && is_numeric($sub2)) {
        $rid = (int)$sub2;
        $room = q1('SELECT property_id FROM rooms WHERE id=?', [$rid]);
        if (!$room || !canAccessProperty($u, (int)$room['property_id'])) err(403, 'Access denied.');
        $allowed = ['room_type','monthly_price','deposit','deposit_months','capacity','total_count','occupied_count',
                    'floor','furnished','bathroom_type','description'];
        $fields = []; $params = [];
        foreach ($allowed as $f) if (isset($b[$f])) { $fields[] = "$f=?"; $params[] = $b[$f]; }
        if ($fields) { $params[] = $rid; qn('UPDATE rooms SET '.implode(',',$fields).' WHERE id=?', $params); }
        ok(['updated'=>true]);
    }

    // ── DELETE /api/portal/rooms/:id ─────────────────────────
    if ($method === 'DELETE' && $sub === 'rooms' && is_numeric($sub2)) {
        $rid = (int)$sub2;
        $room = q1('SELECT property_id FROM rooms WHERE id=?', [$rid]);
        if (!$room || !canAccessProperty($u, (int)$room['property_id'])) err(403, 'Access denied.');
        qn('DELETE FROM rooms WHERE id=?', [$rid]);
        ok(['deleted'=>true]);
    }

    // ── GET /api/portal/tenants?property_id=X ────────────────
    if ($method === 'GET' && $sub === 'tenants') {
        $pid = isset($_GET['property_id']) ? (int)$_GET['property_id'] : null;
        if (!$pid) err(400, 'property_id required.');
        if (!canAccessProperty($u, $pid)) err(403, 'Access denied.');
        ok(q("SELECT t.*,r.room_type,r.monthly_price AS listed_price FROM tenants t JOIN rooms r ON r.id=t.room_id
              WHERE t.property_id=? ORDER BY t.status='active' DESC, t.name", [$pid]));
    }

    // ── POST /api/portal/tenants  — add tenant to a room ─────
    if ($method === 'POST' && $sub === 'tenants') {
        foreach (['property_id','room_id','name','phone','lease_start','monthly_rent'] as $f)
            if (empty($b[$f])) err(400, "Field '$f' required.");
        $pid = (int)$b['property_id'];
        if (!canAccessProperty($u, $pid)) err(403, 'Access denied.');
        // Verify room belongs to property
        if (!q1('SELECT id FROM rooms WHERE id=? AND property_id=?', [(int)$b['room_id'],$pid]))
            err(400, 'Room does not belong to this property.');
        $tid = qx("INSERT INTO tenants (property_id,room_id,name,phone,whatsapp_phone,email,lease_start,
                                        lease_end,monthly_rent,rent_due_day,reminder_days_before,added_by,notes)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                  [$pid,$b['room_id'],$b['name'],$b['phone'],$b['whatsapp_phone']??$b['phone'],
                   $b['email']??null,$b['lease_start'],$b['lease_end']??null,$b['monthly_rent'],
                   $b['rent_due_day']??1,$b['reminder_days_before']??3,$u['id'],$b['notes']??null]);
        // Increment occupied count on the room
        qn('UPDATE rooms SET occupied_count = LEAST(occupied_count+1, total_count) WHERE id=?', [(int)$b['room_id']]);
        created(['tenantId'=>$tid]);
    }

    // ── PUT /api/portal/tenants/:id ──────────────────────────
    if ($method === 'PUT' && $sub === 'tenants' && is_numeric($sub2)) {
        $tid = (int)$sub2;
        $tenant = q1('SELECT property_id FROM tenants WHERE id=?', [$tid]);
        if (!$tenant || !canAccessProperty($u, (int)$tenant['property_id'])) err(403, 'Access denied.');
        $allowed = ['name','phone','whatsapp_phone','email','lease_end','monthly_rent',
                    'rent_due_day','reminder_days_before','reminders_enabled','notes','status'];
        $fields = []; $params = [];
        foreach ($allowed as $f) if (isset($b[$f])) { $fields[] = "$f=?"; $params[] = $b[$f]; }
        if (isset($b['status']) && $b['status'] === 'vacated') {
            $fields[] = 'vacated_at=?'; $params[] = date('Y-m-d');
            // Decrement room occupied count
            $t = q1('SELECT room_id FROM tenants WHERE id=?', [$tid]);
            if ($t) qn('UPDATE rooms SET occupied_count = GREATEST(occupied_count-1, 0) WHERE id=?', [(int)$t['room_id']]);
        }
        if ($fields) { $params[] = $tid; qn('UPDATE tenants SET '.implode(',',$fields).' WHERE id=?', $params); }
        ok(['updated'=>true]);
    }

    // ── GET /api/portal/bookings — owners/managers see counts only, never student details ──
    if ($method === 'GET' && $sub === 'bookings') {
        [$clause, $params] = [$scope['clause'], $scope['params']];
        $data = q("SELECT p.id AS property_id, p.name AS property_name, p.area,
                          r.id AS room_id, r.room_type, r.monthly_price,
                          r.total_count, r.capacity,
                          (r.total_count * GREATEST(1,r.capacity)) AS total_slots,
                          COUNT(b.id) AS total_bookings,
                          SUM(b.status='pending') AS pending,
                          SUM(b.status IN ('assigned','accepted','payment_pending')) AS in_progress,
                          SUM(b.status IN ('payment_confirmed','student_confirmed')) AS awaiting_confirm,
                          SUM(b.status IN ('active','confirmed','checked_in','move_in_completed')) AS active_tenants,
                          SUM(b.status IN ('rejected','cancelled','checked_out','move_out_completed')) AS closed
                   FROM properties p
                   JOIN rooms r ON r.property_id=p.id
                   LEFT JOIN bookings b ON b.room_id=r.id
                   WHERE $clause
                   GROUP BY p.id, r.id
                   ORDER BY p.name, r.monthly_price", $params);
        ok($data);
    }

    // ── GET /api/portal/viewings ──────────────────────────────
    if ($method === 'GET' && $sub === 'viewings') {
        [$clause, $params] = [$scope['clause'], $scope['params']];
        ok(q("SELECT vr.id,vr.preferred_date,vr.preferred_time,vr.notes,vr.status,vr.created_at,
                     p.name AS property_name,p.area,s.name AS student_name,s.phone AS student_phone
              FROM viewing_requests vr
              JOIN properties p ON p.id=vr.property_id
              JOIN users s ON s.id=vr.student_id
              WHERE $clause ORDER BY vr.preferred_date ASC", $params));
    }

    // ── GET /api/portal/referrals ─────────────────────────────
    if ($method === 'GET' && $sub === 'referrals') {
        $ref = q("SELECT r.id,r.status,r.created_at,u.name AS referred_name,u.email AS referred_email,
                         u.role AS referred_role, u.university_id
                  FROM referrals r JOIN users u ON u.id=r.referred_id
                  WHERE r.referrer_id=? ORDER BY r.created_at DESC", [$u['id']]);
        $stats = q1("SELECT COUNT(*) AS total_referred,
                            SUM(r.status='booked') AS total_booked
                     FROM referrals r WHERE r.referrer_id=?", [$u['id']]);
        $myCode = q1('SELECT referral_code FROM users WHERE id=?', [$u['id']]);
        ok(['referral_code'=>$myCode['referral_code']??null,'stats'=>$stats,'referrals'=>$ref]);
    }

    // ── GET /api/portal/properties/:id/room-units — owner/manager sees counts, no tenant names ──
    if ($method === 'GET' && $sub === 'properties' && is_numeric($sub2) && $sub3 === 'room-units' && !$sub4) {
        $pid = (int)$sub2;
        if (!canAccessProperty($u, $pid)) err(403, 'Access denied.');
        $ACTIVE = "'payment_confirmed','student_confirmed','active','checked_in'";
        $units = q("SELECT ru.id, ru.unit_number, ru.floor, ru.status, ru.is_active,
                           ru.capacity AS unit_capacity, ru.created_at,
                           r.id AS room_type_id, r.room_type, r.monthly_price,
                           r.capacity AS room_capacity,
                           COALESCE(ru.capacity, r.capacity) AS effective_capacity,
                           COUNT(b.id) AS occupied_count,
                           GREATEST(0, COALESCE(ru.capacity, r.capacity) - COUNT(b.id)) AS available_slots
                    FROM room_units ru
                    JOIN rooms r ON r.id = ru.room_type_id
                    LEFT JOIN bookings b ON b.room_unit_id = ru.id AND b.status IN ($ACTIVE)
                    WHERE ru.property_id=? AND ru.is_active=1
                    GROUP BY ru.id, r.id
                    ORDER BY ru.floor, CAST(REGEXP_REPLACE(ru.unit_number,'[^0-9]','') AS UNSIGNED), ru.unit_number",
                   [$pid]);
        ok($units);
    }

    // ── POST /api/portal/properties/:id/room-units — add single unit ──
    if ($method === 'POST' && $sub === 'properties' && is_numeric($sub2) && $sub3 === 'room-units' && !$sub4) {
        $pid = (int)$sub2;
        if (!canAccessProperty($u, $pid)) err(403, 'Access denied.');
        if (empty($b['unit_number']) || empty($b['room_type_id'])) err(400, 'unit_number and room_type_id required.');
        $exists = q1('SELECT id FROM room_units WHERE property_id=? AND unit_number=?', [$pid, trim($b['unit_number'])]);
        if ($exists) err(409, 'Unit number already exists.');
        $cap = isset($b['capacity']) && $b['capacity'] !== '' ? (int)$b['capacity'] : null;
        $uid2 = qx('INSERT INTO room_units (property_id,room_type_id,unit_number,floor,status,capacity) VALUES (?,?,?,?,?,?)',
            [$pid,(int)$b['room_type_id'],trim($b['unit_number']),(int)($b['floor']??1),$b['status']??'available',$cap]);
        ok(['id'=>$uid2,'unit_number'=>trim($b['unit_number'])]);
    }

    // ── POST /api/portal/properties/:id/room-units/named ──
    if ($method === 'POST' && $sub === 'properties' && is_numeric($sub2) && $sub3 === 'room-units' && $sub4 === 'named') {
        $pid = (int)$sub2;
        if (!canAccessProperty($u, $pid)) err(403, 'Access denied.');
        if (empty($b['room_type_id']) || empty($b['units']) || !is_array($b['units'])) err(400, 'room_type_id and units[] required.');
        $rtid = (int)$b['room_type_id'];
        $floor = max(1,(int)($b['floor']??1));
        $cap = isset($b['capacity']) && $b['capacity'] !== '' ? (int)$b['capacity'] : null;
        $created = 0; $skipped = 0;
        foreach ($b['units'] as $un) {
            $un = trim((string)$un);
            if ($un === '') continue;
            if (q1('SELECT id FROM room_units WHERE property_id=? AND unit_number=?',[$pid,$un])) { $skipped++; continue; }
            qx('INSERT INTO room_units (property_id,room_type_id,unit_number,floor,capacity) VALUES (?,?,?,?,?)',[$pid,$rtid,$un,$floor,$cap]);
            $created++;
        }
        ok(['created'=>$created,'skipped'=>$skipped]);
    }

    // ── POST /api/portal/properties/:id/room-units/bulk ──
    if ($method === 'POST' && $sub === 'properties' && is_numeric($sub2) && $sub3 === 'room-units' && $sub4 === 'bulk') {
        $pid = (int)$sub2;
        if (!canAccessProperty($u, $pid)) err(403, 'Access denied.');
        if (empty($b['room_type_id']) || empty($b['floors']) || empty($b['units_per_floor'])) err(400,'room_type_id, floors, units_per_floor required.');
        $rtid = (int)$b['room_type_id'];
        $floors = max(1,min(20,(int)$b['floors']));
        $upf = max(1,min(50,(int)$b['units_per_floor']));
        $prefix = strtoupper(trim($b['prefix']??''));
        $startNum = max(1,(int)($b['start_number']??1));
        $cap = isset($b['capacity']) && $b['capacity'] !== '' ? (int)$b['capacity'] : null;
        $created = 0; $skipped = 0;
        for ($fl=1;$fl<=$floors;$fl++) {
            for ($n=$startNum;$n<$startNum+$upf;$n++) {
                $unitNum = $prefix ? $prefix.str_pad($fl,1,'0',STR_PAD_LEFT).str_pad($n,2,'0',STR_PAD_LEFT)
                                   : $fl.str_pad($n,2,'0',STR_PAD_LEFT);
                if (q1('SELECT id FROM room_units WHERE property_id=? AND unit_number=?',[$pid,$unitNum])) { $skipped++; continue; }
                qx('INSERT INTO room_units (property_id,room_type_id,unit_number,floor,capacity) VALUES (?,?,?,?,?)',[$pid,$rtid,$unitNum,$fl,$cap]);
                $created++;
            }
        }
        ok(['created'=>$created,'skipped'=>$skipped]);
    }

    // ── PUT /api/portal/room-units/:id ──
    if ($method === 'PUT' && $sub === 'room-units' && is_numeric($sub2)) {
        $ruid = (int)$sub2;
        $ru = q1('SELECT property_id FROM room_units WHERE id=?', [$ruid]);
        if (!$ru || !canAccessProperty($u, (int)$ru['property_id'])) err(403,'Access denied.');
        $fields = []; $params = [];
        foreach (['status','floor','capacity'] as $f) {
            if (array_key_exists($f,$b)) {
                $fields[] = "$f=?";
                $params[] = ($f==='capacity' && ($b[$f]==='' || $b[$f]===null)) ? null : $b[$f];
            }
        }
        if (!$fields) err(400,'Nothing to update.');
        $params[] = $ruid;
        qn('UPDATE room_units SET '.implode(',',$fields).' WHERE id=?', $params);
        ok(['updated'=>true]);
    }

    // ── DELETE /api/portal/room-units/:id ──
    if ($method === 'DELETE' && $sub === 'room-units' && is_numeric($sub2)) {
        $ruid = (int)$sub2;
        $ru = q1('SELECT property_id FROM room_units WHERE id=?', [$ruid]);
        if (!$ru || !canAccessProperty($u, (int)$ru['property_id'])) err(403,'Access denied.');
        $occ = q1("SELECT id FROM bookings WHERE room_unit_id=?
                   AND status IN ('payment_confirmed','student_confirmed','active','checked_in')", [$ruid]);
        if ($occ) err(409,'Cannot remove a unit with an active tenant.');
        qn('UPDATE room_units SET is_active=0 WHERE id=?', [$ruid]);
        ok(['deleted'=>true]);
    }

    // ── GET /api/portal/properties/:id/analytics ──
    if ($method === 'GET' && $sub === 'properties' && is_numeric($sub2) && $sub3 === 'analytics') {
        $pid = (int)$sub2;
        if (!canAccessProperty($u, $pid)) err(403,'Access denied.');
        $ACTIVE = "'payment_confirmed','student_confirmed','active','checked_in'";
        $byType = q("SELECT r.id AS room_type_id, r.room_type, r.capacity AS default_capacity,
                            COUNT(DISTINCT ru.id) AS unit_count,
                            SUM(COALESCE(ru.capacity, r.capacity)) AS total_beds,
                            SUM(sub.occ) AS occupied_beds,
                            SUM(GREATEST(0, COALESCE(ru.capacity, r.capacity) - sub.occ)) AS available_beds,
                            SUM(CASE WHEN sub.occ >= COALESCE(ru.capacity, r.capacity) THEN 1 ELSE 0 END) AS full_units,
                            SUM(CASE WHEN sub.occ > 0 AND sub.occ < COALESCE(ru.capacity, r.capacity) THEN 1 ELSE 0 END) AS partial_units,
                            SUM(CASE WHEN sub.occ = 0 THEN 1 ELSE 0 END) AS empty_units
                     FROM rooms r
                     JOIN room_units ru ON ru.room_type_id=r.id AND ru.property_id=? AND ru.is_active=1
                     LEFT JOIN (
                         SELECT room_unit_id, COUNT(*) AS occ
                         FROM bookings WHERE status IN ($ACTIVE) AND room_unit_id IS NOT NULL
                         GROUP BY room_unit_id
                     ) sub ON sub.room_unit_id=ru.id
                     WHERE r.property_id=?
                     GROUP BY r.id ORDER BY r.monthly_price", [$pid,$pid]);
        $totals = ['total_beds'=>0,'occupied_beds'=>0,'available_beds'=>0,'total_units'=>0];
        foreach ($byType as $row) {
            $totals['total_beds']    += (int)$row['total_beds'];
            $totals['occupied_beds'] += (int)$row['occupied_beds'];
            $totals['available_beds']+= (int)$row['available_beds'];
            $totals['total_units']   += (int)$row['unit_count'];
        }
        ok(['totals'=>$totals,'by_room_type'=>$byType]);
    }

    // ── GET /api/portal/payout-profile ───────────────────────────
    if ($method === 'GET' && $sub === 'payout-profile') {
        $profile = q1('SELECT * FROM owner_payout_profiles WHERE owner_id=?',[(int)$u['id']]);
        ok($profile ?: null);
    }

    // ── POST /api/portal/payout-profile — create or update ───────
    if ($method === 'POST' && $sub === 'payout-profile') {
        $type       = $b['payout_type']??'mobile_money';
        $autoEnable = !empty($b['auto_payout_enabled']) ? 1 : 0;
        if (!in_array($type,['mobile_money','bank'])) err(400,'Invalid payout_type.');
        // Require explicit consent when enabling auto-payout
        if ($autoEnable && empty($b['auto_payout_consent'])) err(400,'Consent required to enable automatic payout.');
        $consentSql  = $autoEnable ? ',auto_payout_enabled=1,auto_payout_consented_at=NOW()' : ',auto_payout_enabled=0,auto_payout_consented_at=NULL';
        $existing = q1('SELECT id FROM owner_payout_profiles WHERE owner_id=?',[(int)$u['id']]);
        if ($type==='mobile_money') {
            if (empty($b['phone'])||empty($b['provider'])) err(400,'phone and provider required for mobile_money.');
            $phone = normalizePhone($b['phone']);
            if ($existing) {
                qn("UPDATE owner_payout_profiles SET payout_type=?,provider=?,phone=?,account_name=NULL,account_number=NULL,bank_name=NULL$consentSql WHERE owner_id=?",
                   [$type,$b['provider'],$phone,(int)$u['id']]);
            } else {
                qx('INSERT INTO owner_payout_profiles (owner_id,payout_type,provider,phone,auto_payout_enabled,auto_payout_consented_at) VALUES (?,?,?,?,?,?)',
                   [(int)$u['id'],$type,$b['provider'],$phone,$autoEnable,$autoEnable?date('Y-m-d H:i:s'):null]);
            }
        } else {
            if (empty($b['bank_name'])||empty($b['account_number'])||empty($b['account_name']))
                err(400,'bank_name, account_number, account_name required for bank.');
            if ($existing) {
                qn("UPDATE owner_payout_profiles SET payout_type=?,bank_name=?,account_number=?,account_name=?,provider=NULL,phone=NULL$consentSql WHERE owner_id=?",
                   [$type,$b['bank_name'],$b['account_number'],$b['account_name'],(int)$u['id']]);
            } else {
                qx('INSERT INTO owner_payout_profiles (owner_id,payout_type,bank_name,account_number,account_name,auto_payout_enabled,auto_payout_consented_at) VALUES (?,?,?,?,?,?,?)',
                   [(int)$u['id'],$type,$b['bank_name'],$b['account_number'],$b['account_name'],$autoEnable,$autoEnable?date('Y-m-d H:i:s'):null]);
            }
        }
        ok(['saved'=>true]);
    }

    // ── GET /api/portal/payments — owner's payment transaction history ──
    if ($method === 'GET' && $sub === 'payments') {
        $scope = propertyScope($u);
        $txns = q("SELECT pt.*,p.name AS property_name,r.room_type,
                          s.name AS student_name,s.phone AS student_phone
                   FROM payment_transactions pt
                   JOIN properties p ON p.id=pt.property_id
                   JOIN rooms r ON r.id=pt.room_id
                   JOIN users s ON s.id=pt.student_id
                   WHERE pt.owner_id=?
                   ORDER BY pt.created_at DESC LIMIT 50",[(int)$u['id']]);
        ok($txns);
    }

    err(404, 'Portal route not found.');
}

// ─── /api/student/*  — Student portal ─────────────────────────
function routeStudent(array $parts, string $method): void {
    $sub  = $parts[1] ?? '';
    $sub2 = $parts[2] ?? '';
    $sub3 = $parts[3] ?? '';
    $b    = body();
    $u    = requireStudent();

    // GET /api/student/bookings
    if ($method === 'GET' && $sub === 'bookings') {
        ok(q("SELECT b.id,b.move_in_date,b.status,b.move_in_notes,b.created_at,
                     b.qr_token,b.amount_paid,b.contract_start,b.contract_end,
                     b.room_unit_id,b.assigned_at,b.payment_note,b.student_confirmed_at,
                     b.payment_confirmed_at,b.payment_receipt_ref,b.booked_by_staff_role,
                     p.id AS property_id,p.name AS property_name,p.area,p.verified,
                     p.property_type, p.address,
                     r.room_type,r.monthly_price,r.deposit_months,r.bathroom_type,r.furnished,r.capacity,
                     ru.unit_number, ru.floor AS unit_floor,
                     gm.name AS assigned_gm_name, gm.phone AS assigned_gm_phone,
                     COALESCE(opp.auto_payout_enabled,0) AS owner_auto_payout,
                     (SELECT url FROM property_photos ph WHERE ph.property_id=p.id AND ph.is_main=1 LIMIT 1) AS property_photo
              FROM bookings b
              JOIN properties p ON p.id=b.property_id
              JOIN rooms r ON r.id=b.room_id
              LEFT JOIN room_units ru ON ru.id=b.room_unit_id
              LEFT JOIN users gm ON gm.id=b.assigned_to
              LEFT JOIN owner_payout_profiles opp ON opp.owner_id=p.owner_id
              WHERE b.student_id=?
              ORDER BY b.created_at DESC", [$u['id']]));
    }

    // POST /api/student/bookings/:id/confirm — student confirms staff-recorded payment → activates QR
    if ($method === 'POST' && $sub === 'bookings' && is_numeric($sub2) && $sub3 === 'confirm') {
        $bid = (int)$sub2;
        $bk = q1('SELECT id,status,qr_token,amount_paid,contract_start,contract_end FROM bookings WHERE id=? AND student_id=?',
                  [$bid,$u['id']]);
        if (!$bk) err(404, 'Booking not found.');
        if ($bk['status'] !== 'payment_confirmed')
            err(400, 'Nothing to confirm yet — waiting for staff to record your payment.');
        $qrToken = $bk['qr_token'] ?: bin2hex(random_bytes(32));
        qn("UPDATE bookings SET status='active', student_confirmed_at=NOW(), qr_token=? WHERE id=?",
           [$qrToken, $bid]);
        ok(['confirmed'=>true,'qr_token'=>$qrToken,
            'message'=>'Tenancy confirmed! Your QR check-in code is now active.']);
    }

    // POST /api/student/bookings  — student books a room
    if ($method === 'POST' && $sub === 'bookings') {
        foreach (['property_id','room_id','move_in_date'] as $f)
            if (empty($b[$f])) err(400, "$f required.");
        $prop = q1("SELECT owner_id FROM properties WHERE id=? AND status='approved'", [(int)$b['property_id']]);
        if (!$prop) err(404, 'Property not found or not available.');
        $room = q1('SELECT id, total_count, capacity, property_id FROM rooms WHERE id=? AND property_id=?',
                   [(int)$b['room_id'],(int)$b['property_id']]);
        if (!$room) err(404, 'Room not found.');
        // Gate: only confirmed/active bookings count as occupied — pending requests never block new ones.
        // If room_units are listed, use real bed-level availability; otherwise fall back to manual count.
        $ACTIVE = "'payment_confirmed','student_confirmed','active','checked_in'";
        $unitInfo = q1("SELECT COUNT(DISTINCT ru.id) AS unit_count,
                               COALESCE(SUM(COALESCE(ru.capacity, r.capacity)), 0) AS total_beds
                        FROM room_units ru JOIN rooms r ON r.id=ru.room_type_id
                        WHERE ru.room_type_id=? AND ru.property_id=? AND ru.is_active=1",
                       [(int)$room['id'], (int)$room['property_id']]);
        if ((int)$unitInfo['unit_count'] > 0) {
            $confirmedBeds = (int)(q1("SELECT COUNT(*) AS cnt FROM bookings bk
                                       JOIN room_units ru ON ru.id=bk.room_unit_id
                                       WHERE ru.room_type_id=? AND ru.property_id=? AND ru.is_active=1
                                         AND bk.status IN ($ACTIVE)",
                                      [(int)$room['id'], (int)$room['property_id']])['cnt'] ?? 0);
            if ($confirmedBeds >= (int)$unitInfo['total_beds']) err(409, 'Hakuna nafasi iliyobaki katika chumba hiki.');
        } else {
            $confirmedBks = (int)(q1("SELECT COUNT(*) AS cnt FROM bookings WHERE room_id=? AND status IN ($ACTIVE)", [(int)$room['id']])['cnt'] ?? 0);
            $totalSlots = (int)$room['total_count'] * max(1, (int)$room['capacity']);
            if ($confirmedBks >= $totalSlots) err(409, 'Hakuna nafasi iliyobaki katika chumba hiki.');
        }
        // Prevent duplicate active booking at same property
        $dup = q1("SELECT id FROM bookings WHERE student_id=? AND property_id=? AND status NOT IN ('rejected','cancelled','checked_out','move_out_completed')", [$u['id'],(int)$b['property_id']]);
        if ($dup) err(409, 'You already have an active booking at this property.');
        $bid = qx("INSERT INTO bookings (student_id,property_id,room_id,owner_id,move_in_date,move_in_notes,status)
                   VALUES (?,?,?,?,?,?,'pending')",
                  [$u['id'],$b['property_id'],$b['room_id'],$prop['owner_id'],$b['move_in_date'],$b['notes']??null]);
        created(['message'=>'Booking request submitted successfully.','bookingId'=>$bid]);
    }

    // PUT /api/student/bookings/:id/cancel
    if ($method === 'PUT' && $sub === 'bookings' && is_numeric($sub2) && $sub3 === 'cancel') {
        $bid = (int)$sub2;
        $bk = q1('SELECT id,status FROM bookings WHERE id=? AND student_id=?', [$bid,$u['id']]);
        if (!$bk) err(404, 'Booking not found.');
        if (in_array($bk['status'],['confirmed','move_in_completed'])) err(400, 'Cannot cancel a confirmed booking.');
        qn("UPDATE bookings SET status='cancelled' WHERE id=?", [$bid]);
        ok(['cancelled'=>true]);
    }

    // GET /api/student/viewings
    if ($method === 'GET' && $sub === 'viewings') {
        ok(q("SELECT vr.id,vr.preferred_date,vr.preferred_time,vr.notes,vr.status,vr.created_at,
                     p.name AS property_name,p.area
              FROM viewing_requests vr
              JOIN properties p ON p.id=vr.property_id
              WHERE vr.student_id=?
              ORDER BY vr.preferred_date DESC", [$u['id']]));
    }

    // POST /api/student/viewings
    if ($method === 'POST' && $sub === 'viewings') {
        foreach (['property_id','preferred_date'] as $f)
            if (empty($b[$f])) err(400, "$f required.");
        $prop = q1("SELECT owner_id FROM properties WHERE id=? AND status='approved'", [(int)$b['property_id']]);
        if (!$prop) err(404, 'Property not found.');
        $vid = qx("INSERT INTO viewing_requests (student_id,property_id,owner_id,preferred_date,preferred_time,notes,status)
                   VALUES (?,?,?,?,?,?,'pending')",
                  [$u['id'],$b['property_id'],$prop['owner_id'],$b['preferred_date'],
                   $b['preferred_time']??'Asubuhi',$b['notes']??null]);
        created(['viewingId'=>$vid]);
    }

    // GET /api/student/saved
    if ($method === 'GET' && $sub === 'saved') {
        ok(q("SELECT p.id,p.name,p.property_type,p.area,p.verified,p.distance_km,
                     u.name AS university_name,
                     COALESCE(
                           (SELECT ph.url FROM property_photos ph WHERE ph.property_id=p.id ORDER BY ph.is_main DESC,ph.sort_order,ph.id LIMIT 1),
                           (SELECT rp.url FROM room_photos rp JOIN rooms pr ON pr.id=rp.room_id WHERE pr.property_id=p.id ORDER BY rp.is_main DESC,rp.sort_order,rp.id LIMIT 1)
                       ) AS main_photo,
                     MIN(r.monthly_price) AS price_from,sp.saved_at
              FROM saved_properties sp
              JOIN properties p ON p.id=sp.property_id
              JOIN universities u ON u.id=p.nearest_university_id
              LEFT JOIN rooms r ON r.property_id=p.id
              WHERE sp.student_id=? AND p.status='approved'
              GROUP BY p.id ORDER BY sp.saved_at DESC", [$u['id']]));
    }

    // GET /api/student/room-assignment
    if ($method === 'GET' && $sub === 'room-assignment') {
        $row = q1("SELECT b.id AS booking_id, b.contract_start, b.contract_end, b.assigned_at,
                          ru.id AS unit_id, ru.unit_number, ru.floor,
                          r.room_type, r.monthly_price, r.bathroom_type, r.furnished,
                          p.name AS property_name, p.address, p.area
                   FROM bookings b
                   JOIN room_units ru ON ru.id = b.room_unit_id
                   JOIN rooms r       ON r.id  = b.room_id
                   JOIN properties p  ON p.id  = b.property_id
                   WHERE b.student_id=? AND b.status IN ('confirmed','move_in_completed')
                     AND b.room_unit_id IS NOT NULL
                   ORDER BY b.assigned_at DESC LIMIT 1", [$u['id']]);
        ok($row ?: null);
    }

    // PUT /api/student/bookings/:id/request-moveout
    if ($method === 'PUT' && $sub === 'bookings' && is_numeric($sub2) && $sub3 === 'request-moveout') {
        $bid = (int)$sub2;
        $bk = q1('SELECT id,status FROM bookings WHERE id=? AND student_id=?', [$bid,$u['id']]);
        if (!$bk) err(404, 'Booking not found.');
        if (!in_array($bk['status'],['confirmed','move_in_completed'])) err(400, 'Can only request move-out for an active booking.');
        qn("UPDATE bookings SET status='move_out_requested' WHERE id=?", [$bid]);
        ok(['requested'=>true]);
    }

    // GET /api/student/referrals
    if ($method === 'GET' && $sub === 'referrals') {
        $refs = q("SELECT r.id,r.status,r.created_at,u.name AS referred_name,u.role AS referred_role
                   FROM referrals r JOIN users u ON u.id=r.referred_id
                   WHERE r.referrer_id=? ORDER BY r.created_at DESC", [$u['id']]);
        $stats = q1("SELECT COUNT(*) AS total_referred, SUM(r.status='booked') AS total_booked
                     FROM referrals r WHERE r.referrer_id=?", [$u['id']]);
        $myCode = q1('SELECT referral_code FROM users WHERE id=?', [$u['id']]);
        ok(['referral_code'=>$myCode['referral_code']??null,'stats'=>$stats,'referrals'=>$refs]);
    }

    err(404, 'Student route not found.');
}

// ═══════════════════════════════════════════════════════════════
//  Helpers: phone matching, quick accounts, traffic sources, analytics
// ═══════════════════════════════════════════════════════════════

// Last 9 digits of a Tanzanian number, so 0712…, 255712… and +255 712… all match.
function phoneKey(string $phone): string {
    return substr(preg_replace('/\D/', '', $phone), -9);
}

// Users whose phone matches in any format (at most 2 rows, so callers can spot duplicates).
function usersByPhone(string $phone): array {
    $key = phoneKey($phone);
    if (strlen($key) < 9) return [];
    return q("SELECT id,name,role,phone,status FROM users
              WHERE RIGHT(REPLACE(REPLACE(REPLACE(phone,'+',''),' ',''),'-',''), 9)=?
              ORDER BY id LIMIT 2", [$key]);
}

// Find a student or owner by phone, or create the account with a temporary password.
// Call inside a transaction, then sendWelcomeSms() after commit, so a failed save
// never leaves an account behind or texts a password for an account that doesn't exist.
function findOrCreateUser(string $name, string $phone, string $role, array $extra = []): array {
    $name = trim($name); $phone = trim($phone);
    if ($name === '' || strlen(phoneKey($phone)) < 9) err(400, 'Name and a valid phone number are required.');
    $allowed = $role === 'student' ? ['student'] : ['property_owner', 'property_manager'];
    $found = usersByPhone($phone);
    if ($found) {
        $u = $found[0];
        if (!in_array($u['role'], $allowed, true)) {
            $what = ['student'=>'a student','property_owner'=>'a house owner','property_manager'=>'a house manager'][$u['role']] ?? 'a staff member';
            err(409, "This phone number already belongs to $what ({$u['name']}).");
        }
        return ['id'=>(int)$u['id'], 'name'=>$u['name'], 'phone'=>$u['phone'],
                'created'=>false, 'temp_password'=>null, 'sms_sent'=>false];
    }
    $pw = 'Geto' . random_int(1000, 9999);
    $id = qx("INSERT INTO users (name,phone,password_hash,role,status,university_id,business_name,referral_code,terms_accepted)
              VALUES (?,?,?,?,'active',?,?,?,0)",
             [$name, $phone, hashPwd($pw), $role, $extra['university_id'] ?? null,
              $extra['business_name'] ?? null, makeReferralCode($name)]);
    return ['id'=>$id, 'name'=>$name, 'phone'=>$phone, 'created'=>true, 'temp_password'=>$pw, 'sms_sent'=>false];
}

// Text a newly created account its login details (staff also see the password once).
function sendWelcomeSms(?array &$acct): void {
    if (!$acct || !$acct['created']) return;
    $acct['sms_sent'] = sendSMS(ltrim(normalizePhone($acct['phone']), '+'),
        "Karibu Geto Student! Ingia https://getostudent.co.tz/auth kwa simu {$acct['phone']} na nenosiri {$acct['temp_password']}",
        "welcome-{$acct['id']}",
        "Karibu Geto Student! Ingia https://getostudent.co.tz/auth kwa simu {$acct['phone']} na nenosiri [hidden]");
}

// Where a visit came from. Returns [label, referring website or null].
// $ref is document.referrer; $utm is ?utm_source= on the landing link (e.g. ?utm_source=whatsapp).
function trafficSource(string $ref, string $utm): array {
    $utm = strtolower(preg_replace('/[^a-z0-9_.-]/i', '', substr($utm, 0, 60)));
    if ($utm !== '') {
        $named = ['whatsapp'=>'WhatsApp','wa'=>'WhatsApp','facebook'=>'Facebook','fb'=>'Facebook',
                  'instagram'=>'Instagram','ig'=>'Instagram','tiktok'=>'TikTok','tt'=>'TikTok',
                  'youtube'=>'YouTube','yt'=>'YouTube','twitter'=>'X (Twitter)','x'=>'X (Twitter)',
                  'linkedin'=>'LinkedIn','telegram'=>'Telegram','google'=>'Google','sms'=>'SMS',
                  'email'=>'Email','qr'=>'Poster / QR code','poster'=>'Poster / QR code'];
        return [$named[$utm] ?? ucfirst(substr($utm, 0, 40)), null];
    }
    $host = strtolower((string)parse_url(substr($ref, 0, 500), PHP_URL_HOST));
    $host = preg_replace('/^www\./', '', $host);
    if ($host === '' || $host === 'getostudent.co.tz') return ['Direct', null];
    $rules = [   // order matters: Email before Google (Gmail app), YouTube before Google
        'WhatsApp'    => '/(^|\.)(whatsapp\.(com|net)|wa\.me)$|^com\.whatsapp/',
        'Facebook'    => '/(^|\.)(facebook\.com|fb\.com|fb\.me)$|^com\.facebook/',
        'Instagram'   => '/(^|\.)instagram\.com$|^com\.instagram/',
        'TikTok'      => '/(^|\.)tiktok\.com$|^com\.(zhiliaoapp|ss\.android\.ugc)/',
        'YouTube'     => '/(^|\.)(youtube\.com|youtu\.be)$|^com\.google\.android\.youtube$/',
        'X (Twitter)' => '/(^|\.)(twitter\.com|x\.com|t\.co)$/',
        'LinkedIn'    => '/(^|\.)(linkedin\.com|lnkd\.in)$/',
        'Telegram'    => '/(^|\.)(t\.me|telegram\.(org|me))$|^org\.telegram/',
        'ChatGPT'     => '/(^|\.)(chatgpt\.com|openai\.com)$/',
        'Email'       => '/^com\.google\.android\.gm$|(^|\.)mail\.(google|yahoo)\.com$|(^|\.)outlook\.(live|office)\.com$/',
        'Google'      => '/(^|\.)google\.[a-z.]+$|^com\.google\.android\.googlequicksearchbox$/',
        'Bing'        => '/(^|\.)bing\.com$/',
        'Yahoo'       => '/(^|\.)yahoo\.[a-z.]+$/',
    ];
    foreach ($rules as $label => $re) if (preg_match($re, $host)) return [$label, $host];
    return ['Other website', substr($host, 0, 120)];
}

// Period start dates (oldest first) for the last $n days, weeks (Monday start) or months.
function analyticsPeriods(string $unit, int $n, DateTimeImmutable $today): array {
    $start = match ($unit) {
        'day'   => $today,
        'week'  => $today->sub(new DateInterval('P' . ((int)$today->format('N') - 1) . 'D')),
        'month' => $today->modify('first day of this month'),
    };
    $keys = [];
    for ($i = $n - 1; $i >= 0; $i--) {
        $step = match ($unit) { 'day' => "P{$i}D", 'week' => 'P' . ($i * 7) . 'D', 'month' => "P{$i}M" };
        $keys[] = $start->sub(new DateInterval($step))->format('Y-m-d');
    }
    return $keys;
}

// Turn numeric strings from MySQL into numbers for the listed columns.
function intCols(array $rows, array $cols): array {
    foreach ($rows as &$r) foreach ($cols as $c) if (array_key_exists($c, $r)) $r[$c] = (int)$r[$c];
    return $rows;
}

// Admin analytics: visits, sign-ups, bookings and referrals.
// A "visit" is one person on one day (ip_hash = sha256(ip + date)), so someone who comes
// back on another day counts again. Staff using the admin panel (/admin…) are left out.
function adminAnalytics(int $days): array {
    $today    = new DateTimeImmutable('today');
    $day      = fn(int $offset) => $today->modify(($offset >= 0 ? '+' : '') . $offset . ' day')->format('Y-m-d');
    $notStaff = "page NOT LIKE '/admin%'";
    $tomorrow = $day(1);
    $since    = $day(1 - $days);   // start of the "last N days" window used by the lists below

    $visits = function (string $from, string $to) use ($notStaff): array {
        $r = q1("SELECT COUNT(*) AS views, COUNT(DISTINCT ip_hash) AS visits FROM page_views
                 WHERE $notStaff AND created_at >= ? AND created_at < ?", [$from, $to]);
        return ['views' => (int)$r['views'], 'visits' => (int)$r['visits']];
    };
    $summary = [
        'today'            => $visits($day(0),   $tomorrow),
        'yesterday'        => $visits($day(-1),  $day(0)),
        'last_7_days'      => $visits($day(-6),  $tomorrow),
        'previous_7_days'  => $visits($day(-13), $day(-6)),
        'last_30_days'     => $visits($day(-29), $tomorrow),
        'previous_30_days' => $visits($day(-59), $day(-29)),
        'all_time'         => $visits('2000-01-01', $tomorrow),
    ];

    // Charts: one row per day (30), week (12) and month (12), zero-filled
    $series = [];
    foreach (['day' => 30, 'week' => 12, 'month' => 12] as $unit => $n) {
        $keys   = analyticsPeriods($unit, $n, $today);
        $bucket = fn(string $col) => match ($unit) {
            'day'   => "DATE($col)",
            'week'  => "DATE_SUB(DATE($col), INTERVAL WEEKDAY($col) DAY)",
            'month' => "DATE_FORMAT($col, '%Y-%m-01')",
        };
        $kp = $bucket('created_at');
        $ku = $bucket('u.created_at');
        $kb = $bucket('b.created_at');
        $pv = array_column(q("SELECT $kp AS k, COUNT(*) AS views, COUNT(DISTINCT ip_hash) AS visits
                              FROM page_views WHERE $notStaff AND created_at >= ? GROUP BY k", [$keys[0]]), null, 'k');
        $su = array_column(q("SELECT $ku AS k, SUM(u.role='student') AS students,
                                     SUM(u.role IN ('property_owner','property_manager')) AS owners,
                                     SUM(u.referred_by IS NOT NULL) AS referred
                              FROM users u WHERE u.role IN ('student','property_owner','property_manager')
                                AND u.created_at >= ? GROUP BY k", [$keys[0]]), null, 'k');
        $bk = array_column(q("SELECT $kb AS k, COUNT(*) AS bookings
                              FROM bookings b WHERE b.created_at >= ? GROUP BY k", [$keys[0]]), null, 'k');
        $rows = [];
        foreach ($keys as $k) $rows[] = [
            'period'   => $k,
            'views'    => (int)($pv[$k]['views'] ?? 0),
            'visits'   => (int)($pv[$k]['visits'] ?? 0),
            'students' => (int)($su[$k]['students'] ?? 0),
            'owners'   => (int)($su[$k]['owners'] ?? 0),
            'referred' => (int)($su[$k]['referred'] ?? 0),
            'bookings' => (int)($bk[$k]['bookings'] ?? 0),
        ];
        $series[$unit] = $rows;
    }

    // Lists for the last $days days
    $topPages = intCols(q("SELECT CASE WHEN page LIKE '/checkin/%' THEN '/checkin/*' ELSE page END AS path,
                                  COUNT(*) AS views, COUNT(DISTINCT ip_hash) AS visits
                           FROM page_views WHERE $notStaff AND created_at >= ?
                           GROUP BY path ORDER BY views DESC LIMIT 12", [$since]), ['views', 'visits']);
    $sources = intCols(q("SELECT source, COUNT(*) AS visits FROM page_views
                          WHERE source IS NOT NULL AND $notStaff AND created_at >= ?
                          GROUP BY source ORDER BY visits DESC", [$since]), ['visits']);
    $sites = intCols(q("SELECT referrer_host AS site, COUNT(*) AS visits FROM page_views
                        WHERE source='Other website' AND created_at >= ?
                        GROUP BY referrer_host ORDER BY visits DESC LIMIT 10", [$since]), ['visits']);

    // Referrals: a student sharing their code, or a Geto officer signing up a house owner.
    // "Booked" = the referred student has a booking that wasn't rejected or cancelled.
    $live = "b.status NOT IN ('rejected','cancelled')";
    $refTotals = q1("SELECT COUNT(*) AS referred,
                            SUM(u.role='student') AS students,
                            SUM(u.role IN ('property_owner','property_manager')) AS owners,
                            SUM(u.created_at >= ?) AS in_period,
                            SUM(u.role='student' AND EXISTS(SELECT 1 FROM bookings b WHERE b.student_id=u.id AND $live)) AS students_booked,
                            SUM(u.role IN ('property_owner','property_manager') AND EXISTS(SELECT 1 FROM properties p WHERE p.owner_id=u.id)) AS owners_listed
                     FROM users u WHERE u.referred_by IS NOT NULL", [$since]);
    $topReferrers = intCols(q("SELECT r.id, r.name, r.role, r.referral_code,
                                      COUNT(*) AS referred,
                                      SUM(u.role='student') AS students,
                                      SUM(u.role IN ('property_owner','property_manager')) AS owners,
                                      SUM(u.created_at >= ?) AS in_period,
                                      SUM(EXISTS(SELECT 1 FROM bookings b WHERE b.student_id=u.id AND $live)) AS booked,
                                      SUM(EXISTS(SELECT 1 FROM properties p WHERE p.owner_id=u.id)) AS listed,
                                      MAX(u.created_at) AS last_referral_at
                               FROM users u JOIN users r ON r.id=u.referred_by
                               GROUP BY r.id, r.name, r.role, r.referral_code
                               ORDER BY referred DESC, last_referral_at DESC LIMIT 15", [$since]),
                            ['id', 'referred', 'students', 'owners', 'in_period', 'booked', 'listed']);
    $recentReferrals = intCols(q("SELECT u.id, u.name, u.role, u.created_at,
                                         r.name AS referrer_name, r.role AS referrer_role,
                                         EXISTS(SELECT 1 FROM bookings b WHERE b.student_id=u.id AND $live) AS booked,
                                         EXISTS(SELECT 1 FROM properties p WHERE p.owner_id=u.id) AS listed
                                  FROM users u JOIN users r ON r.id=u.referred_by
                                  ORDER BY u.created_at DESC LIMIT 20"), ['id', 'booked', 'listed']);
    // Bookings that staff entered on behalf of students
    $staffBookings = intCols(q("SELECT s.id, s.name, s.role, COUNT(*) AS bookings, SUM(b.created_at >= ?) AS in_period
                                FROM bookings b JOIN users s ON s.id=b.booked_by_staff
                                GROUP BY s.id, s.name, s.role ORDER BY bookings DESC LIMIT 15", [$since]),
                             ['id', 'bookings', 'in_period']);

    return [
        'generated_at'           => date('c'),
        'timezone'               => date_default_timezone_get(),
        'days'                   => $days,
        'since'                  => $since,
        'tracking_since'         => q1('SELECT MIN(created_at) AS t FROM page_views')['t'] ?? null,
        'sources_tracking_since' => q1('SELECT MIN(created_at) AS t FROM page_views WHERE source IS NOT NULL')['t'] ?? null,
        'summary'                => $summary,
        'series'                 => $series,
        'top_pages'              => $topPages,
        'sources'                => $sources,
        'referring_sites'        => $sites,
        'referrals'              => [
            'totals'        => array_map('intval', $refTotals ?? []),
            'top_referrers' => $topReferrers,
            'recent'        => $recentReferrals,
        ],
        'staff_bookings'         => $staffBookings,
    ];
}

// GET /api/site-stats — real numbers for the homepage (public)
function routeSiteStats(): void {
    $r = q1("SELECT
        (SELECT COUNT(*) FROM properties WHERE status='approved') AS houses,
        (SELECT COUNT(*) FROM properties WHERE status='approved' AND availability='available') AS houses_available,
        (SELECT COUNT(*) FROM properties WHERE status='approved' AND verified=1) AS houses_verified,
        (SELECT COUNT(*) FROM universities) AS universities,
        (SELECT COUNT(*) FROM (
            SELECT nearest_university_id AS uid FROM properties WHERE status='approved'
            UNION
            SELECT pu.university_id FROM property_universities pu
              JOIN properties p ON p.id=pu.property_id WHERE p.status='approved'
         ) t) AS universities_with_houses");
    ok(array_map('intval', $r));
}

// ─── /api/admin/*  — Admin & Zone Manager backend portal ───────
function routeAdmin(array $parts, string $method): void {
    $sub  = $parts[1] ?? '';
    $sub2 = $parts[2] ?? '';
    $sub3 = $parts[3] ?? '';
    $sub4 = $parts[4] ?? '';
    $b    = body();
    $u    = requireStaff();  // admin OR zone_manager

    $isAdmin       = $u['role'] === 'admin';
    $isZoneManager = $u['role'] === 'zone_manager';
    $isGetoManager = in_array($u['role'], ['geto_manager', 'geto_officer']);
    $isSeniorStaff = $isAdmin || $isZoneManager;
    $userZoneId    = $isAdmin ? null : (int)($u['zone_id'] ?? 0);

    // Helper: zone scope SQL fragment for properties (p alias).
    // Matches by legacy zone_id OR by zone_coverage (region/district/ward) for new properties.
    $covExists = "EXISTS(SELECT 1 FROM zone_coverage zc WHERE zc.zone_id=? AND ((zc.coverage_type='region' AND zc.coverage_value=p.region) OR (zc.coverage_type='district' AND zc.coverage_value=p.district) OR (zc.coverage_type='ward' AND zc.coverage_value=p.ward)))";
    $zoneClause = $isAdmin ? '1=1' : "(p.zone_id=? OR $covExists)";
    $zoneParams = $isAdmin ? [] : [$userZoneId, $userZoneId];

    // Helper: booking scope for geto_managers (only their assigned bookings)
    $bookingClause = $isAdmin ? '1=1' : ($isGetoManager ? 'b.assigned_to = ?' : 'p.zone_id = ?');
    $bookingParams = $isAdmin ? [] : [$isGetoManager ? (int)$u['id'] : $userZoneId];

    // ── GET /api/admin/stats — System analytics ───────────────
    if ($method === 'GET' && $sub === 'stats') {
        // Geto Officer: return only their own booking summary
        if ($isGetoManager && !$isAdmin && !$isZoneManager) {
            $uid = (int)$u['id'];
            $bs = q1("SELECT
                COUNT(*) AS total,
                SUM(status='assigned')          AS assigned,
                SUM(status='payment_pending')   AS payment_pending,
                SUM(status='payment_confirmed') AS payment_confirmed,
                SUM(status='active')            AS active,
                SUM(status='checked_in')        AS checked_in,
                SUM(status IN ('rejected','cancelled')) AS closed
              FROM bookings WHERE assigned_to=?", [$uid]);
            $recent = q("SELECT b.id,b.status,b.move_in_date,b.created_at,
                                s.name AS student_name,s.phone AS student_phone,
                                p.name AS property_name,p.area,r.room_type,r.monthly_price
                         FROM bookings b
                         JOIN users s ON s.id=b.student_id
                         JOIN properties p ON p.id=b.property_id
                         JOIN rooms r ON r.id=b.room_id
                         WHERE b.assigned_to=? AND b.status NOT IN ('rejected','cancelled','checked_out')
                         ORDER BY b.created_at DESC LIMIT 20", [$uid]);
            ok(['officer_summary'=>$bs,'officer_bookings'=>$recent]);
        }

        $byZone = [];
        if ($isAdmin) {
            $zones = q('SELECT * FROM zones WHERE active=1 ORDER BY code');
            foreach ($zones as $zone) {
                $zid = (int)$zone['id'];
                $ps = q1("SELECT COUNT(*) AS total, SUM(status='approved') AS approved,
                                 SUM(verified=1) AS verified FROM properties WHERE zone_id=?", [$zid]);
                $rs = q1("SELECT SUM(r.total_count) AS total_rooms, SUM(r.occupied_count) AS occupied
                          FROM rooms r JOIN properties p ON p.id=r.property_id WHERE p.zone_id=?", [$zid]);
                $bs = q1("SELECT COUNT(*) AS total_bookings FROM bookings b
                          JOIN properties p ON p.id=b.property_id WHERE p.zone_id=?", [$zid]);
                $ss = q1("SELECT COUNT(*) AS students FROM users WHERE role='student'"); // all students, not zone-scoped
                $byZone[] = array_merge($zone,$ps??[],$rs??[],$bs??[],['students'=>$ss['students']??0]);
            }
        } else {
            $zid = $userZoneId;
            // Coverage-based scope: match by old zone_id OR by region/district/ward coverage
            $zmCovFrag = "EXISTS(SELECT 1 FROM zone_coverage zc WHERE zc.zone_id=$zid AND ((zc.coverage_type='region' AND zc.coverage_value=p.region) OR (zc.coverage_type='district' AND zc.coverage_value=p.district) OR (zc.coverage_type='ward' AND zc.coverage_value=p.ward)))";
            $zmScope = "(p.zone_id=$zid OR $zmCovFrag)";
            $ps = q1("SELECT COUNT(*) AS total,SUM(status='approved') AS approved,SUM(verified=1) AS verified,
                             SUM(status='pending') AS pending_properties
                      FROM properties p WHERE $zmScope", []);
            $rs = q1("SELECT SUM(r.total_count) AS total_rooms, SUM(r.occupied_count) AS occupied
                      FROM rooms r JOIN properties p ON p.id=r.property_id WHERE $zmScope", []);
            $bs = q1("SELECT COUNT(*) AS total_bookings,
                             SUM(b.status NOT IN ('rejected','cancelled','checked_out')) AS active_bookings,
                             SUM(b.status='confirmed') AS confirmed_bookings
                      FROM bookings b JOIN properties p ON p.id=b.property_id WHERE $zmScope", []);
            $os = q1("SELECT COUNT(*) AS geto_officers FROM users WHERE zone_id=? AND role IN ('geto_officer','geto_manager')", [$zid]);
            $officerStats = q("SELECT u.id,u.name,u.phone,
                                      SUM(b.status NOT IN ('rejected','cancelled','checked_out')) AS active_bookings,
                                      COUNT(b.id) AS total_bookings
                               FROM users u
                               LEFT JOIN bookings b ON b.assigned_to=u.id
                               WHERE u.zone_id=? AND u.role IN ('geto_officer','geto_manager')
                               GROUP BY u.id ORDER BY u.name", [$zid]);
            $pendingProps = q("SELECT p.id,p.name,p.area,p.region,p.district,p.ward,p.created_at,ow.name AS owner_name
                               FROM properties p LEFT JOIN users ow ON ow.id=p.owner_id
                               WHERE $zmScope AND p.status='pending' ORDER BY p.created_at DESC LIMIT 10", []);
        }

        $global = $isAdmin ? q1("SELECT
            (SELECT COUNT(*) FROM users WHERE role='student') AS total_students,
            (SELECT COUNT(*) FROM users WHERE role='property_owner') AS total_owners,
            (SELECT COUNT(*) FROM users WHERE role='property_manager') AS total_managers,
            (SELECT COUNT(*) FROM users WHERE role='zone_manager') AS total_zone_managers,
            (SELECT COUNT(*) FROM users WHERE role IN ('geto_officer','geto_manager')) AS total_geto_officers,
            (SELECT COUNT(*) FROM properties) AS total_properties,
            (SELECT COUNT(*) FROM properties WHERE status='approved') AS approved_properties,
            (SELECT COUNT(*) FROM properties WHERE verified=1) AS verified_properties,
            (SELECT COUNT(*) FROM bookings) AS total_bookings,
            (SELECT COUNT(*) FROM bookings WHERE status='confirmed') AS confirmed_bookings,
            (SELECT SUM(total_count) FROM rooms) AS total_rooms,
            (SELECT SUM(occupied_count) FROM rooms) AS occupied_rooms") : null;

        $managerStats = $isAdmin ? q("
            SELECT u.id, u.name, u.phone, z.code AS zone_code, z.name AS zone_name,
                   COUNT(p.id) AS properties_added,
                   SUM(p.status='approved') AS approved_count,
                   SUM(p.status='pending')  AS pending_count
            FROM users u
            LEFT JOIN zones z ON z.id=u.zone_id
            LEFT JOIN properties p ON p.created_by=u.id AND p.created_by_role='zone_manager'
            WHERE u.role='zone_manager'
            GROUP BY u.id ORDER BY z.code") : [];
        $pendingFromManagers = $isAdmin
            ? (int)(q1("SELECT COUNT(*) AS cnt FROM properties WHERE status='pending' AND created_by_role='zone_manager'")['cnt'] ?? 0)
            : 0;
        $visits_today = $isAdmin ? (int)(q1("SELECT COUNT(*) AS cnt FROM page_views WHERE DATE(created_at)=CURDATE()")['cnt'] ?? 0) : null;
        $visits_total = $isAdmin ? (int)(q1("SELECT COUNT(*) AS cnt FROM page_views")['cnt'] ?? 0) : null;
        ok(['global'=>$global,'zones'=>$byZone,
            'my_zone'=>!$isAdmin?array_merge($ps??[],$rs??[],$bs??[],$os??[]):null,
            'officer_stats'=>$officerStats??[],'pending_props'=>$pendingProps??[],
            'manager_stats'=>$managerStats,'pending_from_managers'=>$pendingFromManagers,
            'visits_today'=>$visits_today,'visits_total'=>$visits_total]);
    }

    // ── GET /api/admin/analytics?days=30 — visits, sign-ups, bookings, referrals (admin only) ──
    if ($method === 'GET' && $sub === 'analytics') {
        if (!$isAdmin) err(403, 'Admin only.');
        ok(adminAnalytics(max(1, min(365, (int)($_GET['days'] ?? 30)))));
    }

    // ── GET /api/admin/sms-log — recent SMS and delivery status (admin only) ──
    if ($method === 'GET' && $sub === 'sms-log') {
        if (!$isAdmin) err(403, 'Admin only.');
        ok(['configured' => defined('SMS_TOKEN') && SMS_TOKEN !== '',
            'by_status'  => intCols(q("SELECT status, COUNT(*) AS n, MAX(sent_at) AS last FROM sms_logs
                                       WHERE sent_at >= NOW() - INTERVAL 30 DAY GROUP BY status ORDER BY n DESC"), ['n']),
            'recent'     => q("SELECT id, sent_at, recipient_phone, SUBSTRING_INDEX(reference,'-',1) AS kind, status,
                                      CASE WHEN reference LIKE 'pw-reset-%' THEN 'Password reset link (hidden)'
                                           WHEN reference LIKE 'welcome-%'  THEN 'Login details (hidden)'
                                           ELSE LEFT(message, 160) END AS message
                               FROM sms_logs ORDER BY id DESC LIMIT 50")]);
    }

    // ── POST /api/admin/sms-test {phone} — send a test SMS to check SMS works (admin only, 5 per hour) ──
    if ($method === 'POST' && $sub === 'sms-test') {
        if (!$isAdmin) err(403, 'Admin only.');
        if (strlen(phoneKey((string)($b['phone'] ?? ''))) < 9) err(400, 'Enter a valid phone number.');
        if (!defined('SMS_TOKEN') || SMS_TOKEN === '') err(503, 'SMS is not set up: SMS_TOKEN is empty in _config.php.');
        if (recentSmsCount('test-', 60) >= 5) err(429, 'Test limit reached (5 per hour). Try again later.');
        $sent = sendSMS((string)$b['phone'], 'GETO STUDENT: Test SMS - ujumbe umefika. SMS inafanya kazi.', 'test-'.time());
        $row  = q1("SELECT status, recipient_phone FROM sms_logs WHERE reference LIKE 'test-%' ORDER BY id DESC LIMIT 1");
        ok(['sent' => $sent, 'status' => $row['status'] ?? null, 'to' => $row['recipient_phone'] ?? null]);
    }

    // ── PUT /api/admin/properties/:id/availability — mark a house Full or Rooms available ──
    if ($method === 'PUT' && $sub === 'properties' && is_numeric($sub2) && $sub3 === 'availability') {
        if (!$isSeniorStaff) err(403, 'Admin or zone manager only.');
        $val = $b['availability'] ?? '';
        if (!in_array($val, ['available', 'full'], true)) err(400, "availability must be 'available' or 'full'.");
        $pid = (int)$sub2;
        if (!q1("SELECT p.id FROM properties p WHERE p.id=? AND $zoneClause", array_merge([$pid], $zoneParams)))
            err(404, 'Property not found or not in your zone.');
        qn('UPDATE properties SET availability=?, availability_updated_at=NOW() WHERE id=?', [$val, $pid]);
        ok(['id'=>$pid, 'availability'=>$val]);
    }

    // ── GET /api/admin/properties ─────────────────────────────
    if ($method === 'GET' && $sub === 'properties' && !$sub2) {
        $sql = "SELECT p.id,p.name,p.property_type,p.area,p.status,p.verified,p.views_count,p.created_at,
                       p.availability,p.availability_updated_at,
                       p.rejection_note,z.code AS zone_code,z.name AS zone_name,c.name AS cluster_name,
                       u.name AS university_name,ow.name AS owner_name,ow.phone AS owner_phone,
                       COALESCE(
                           (SELECT ph.url FROM property_photos ph WHERE ph.property_id=p.id ORDER BY ph.is_main DESC,ph.sort_order,ph.id LIMIT 1),
                           (SELECT rp.url FROM room_photos rp JOIN rooms pr ON pr.id=rp.room_id WHERE pr.property_id=p.id ORDER BY rp.is_main DESC,rp.sort_order,rp.id LIMIT 1)
                       ) AS main_photo,
                       COUNT(DISTINCT r.id) AS room_types,
                       SUM(r.total_count) AS total_rooms, SUM(r.occupied_count) AS occupied
                FROM properties p
                JOIN universities u ON u.id=p.nearest_university_id
                LEFT JOIN zones z ON z.id=p.zone_id LEFT JOIN clusters c ON c.id=p.cluster_id
                LEFT JOIN users ow ON ow.id=p.owner_id LEFT JOIN rooms r ON r.property_id=p.id
                WHERE $zoneClause";
        $params = $zoneParams;
        if (!empty($_GET['status'])) { $sql .= ' AND p.status=?'; $params[] = $_GET['status']; }
        if (!empty($_GET['verified'])) { $sql .= ' AND p.verified=?'; $params[] = (int)$_GET['verified']; }
        if (in_array($_GET['availability'] ?? '', ['available','full'], true)) { $sql .= ' AND p.availability=?'; $params[] = $_GET['availability']; }
        $sql .= ' GROUP BY p.id ORDER BY p.created_at DESC';
        ok(q($sql, $params));
    }

    // ── GET /api/admin/properties/:id — full detail for staff ──
    if ($method === 'GET' && $sub === 'properties' && is_numeric($sub2)) {
        $pid = (int)$sub2;
        $prop = q1("SELECT p.*,u.name AS university_name,z.code AS zone_code,z.name AS zone_name,
                           c.code AS cluster_code, c.name AS cluster_name,
                           ow.name AS owner_name,ow.phone AS owner_phone,ow.email AS owner_email
                    FROM properties p
                    JOIN universities u ON u.id=p.nearest_university_id
                    LEFT JOIN zones z ON z.id=p.zone_id LEFT JOIN clusters c ON c.id=p.cluster_id
                    LEFT JOIN users ow ON ow.id=p.owner_id
                    WHERE p.id=?" . ($isAdmin ? '' : ' AND p.zone_id=?'),
                   $isAdmin ? [$pid] : [$pid, $userZoneId]);
        if (!$prop) err(404, 'Not found or outside your zone.');
        $photos    = q('SELECT * FROM property_photos WHERE property_id=? ORDER BY is_main DESC,sort_order', [$pid]);
        $amenities = q('SELECT a.* FROM amenities a JOIN property_amenities pa ON pa.amenity_id=a.id WHERE pa.property_id=?', [$pid]);
        $rooms     = q('SELECT *,(total_count-occupied_count) AS available FROM rooms WHERE property_id=? ORDER BY monthly_price', [$pid]);
        foreach ($rooms as &$rm) {
            $rm['photos'] = q('SELECT id,url,is_main,sort_order FROM room_photos WHERE room_id=? ORDER BY is_main DESC,sort_order', [$rm['id']]);
            $rm['videos'] = q('SELECT id,youtube_video_id,title FROM room_videos WHERE room_id=?', [$rm['id']]);
        } unset($rm);
        $tenants   = q("SELECT t.*,r.room_type FROM tenants t JOIN rooms r ON r.id=t.room_id WHERE t.property_id=?", [$pid]);
        $verif     = q1('SELECT * FROM verification_records WHERE property_id=?', [$pid]);
        $manager   = q1("SELECT u.id,u.name,u.email,u.phone FROM property_manager_assignments pma JOIN users u ON u.id=pma.manager_id WHERE pma.property_id=? AND pma.is_active=1", [$pid]);
        // Nearby properties (within ~200 m radius) using Haversine — only when GPS present
        $nearby = [];
        if (!empty($prop['latitude']) && !empty($prop['longitude'])) {
            $lat = (float)$prop['latitude']; $lng = (float)$prop['longitude'];
            $nearby = q("SELECT p.id, p.name, p.status, p.area,
                                (6371000 * acos(GREATEST(-1, LEAST(1,
                                  cos(radians(?)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(?)) +
                                  sin(radians(?)) * sin(radians(p.latitude))
                                )))) AS distance_m
                         FROM properties p
                         WHERE p.latitude IS NOT NULL AND p.id != ?
                         HAVING distance_m < 200
                         ORDER BY distance_m LIMIT 10",
                        [$lat, $lng, $lat, $pid]);
        }
        ok(array_merge($prop,['photos'=>$photos,'amenities'=>$amenities,'rooms'=>$rooms,'tenants'=>$tenants,'verification'=>$verif,'manager'=>$manager,'nearby'=>$nearby]));
    }

    // ── POST /api/admin/properties — admin or geto manager creates a property ─
    // Quick add: instead of owner_id, send owner_name + owner_phone (account found or created),
    // and monthly_price (+ room_type, rooms_count) to add the first room type in the same call.
    if ($method === 'POST' && $sub === 'properties' && !$sub2) {
        $b = body();
        if (empty($b['name']) || empty($b['nearest_university_id'])) err(400, 'Name and university required.');
        if (!empty($b['monthly_price']) && (int)$b['monthly_price'] <= 0) err(400, 'Price must be a number.');
        $uni = q1('SELECT zone_id,cluster_id FROM universities WHERE id=?', [(int)$b['nearest_university_id']]);
        if (!$uni) err(404, 'University not found.');
        $zid = !empty($b['zone_id']) ? (int)$b['zone_id'] : ($uni['zone_id'] ?? null);
        $cid = !empty($b['cluster_id']) ? (int)$b['cluster_id'] : ($uni['cluster_id'] ?? null);
        db()->beginTransaction();   // owner + house + first room are saved together or not at all
        $owner = (empty($b['owner_id']) && !empty($b['owner_phone']))
            ? findOrCreateUser((string)($b['owner_name'] ?? ''), (string)$b['owner_phone'], 'property_owner')
            : null;
        $ownerId = !empty($b['owner_id']) ? (int)$b['owner_id'] : ($owner['id'] ?? (int)$u['id']);
        // All listings go live immediately — badge (verified=1) requires in-person inspection
        $status = 'approved';
        $nearUniId = (int)$b['nearest_university_id'];
        $pid = qx('INSERT INTO properties (name,property_type,description,address,landmark,area,highlight,nearest_university_id,university_id,zone_id,cluster_id,owner_id,youtube_video_id,latitude,longitude,status,created_by,created_by_role,views_count,distance_km,transport_options,total_floors,rejection_note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,NULL,NULL,NULL,NULL)',
            [$b['name'], $b['property_type']??'Hostel', $b['description']??'',
             $b['address']??'', $b['landmark']??null, $b['area']??'',
             !empty($b['highlight']) ? $b['highlight'] : null,
             $nearUniId, $nearUniId, $zid, $cid,
             $ownerId, $b['youtube_video_id']??null,
             !empty($b['latitude']) ? (float)$b['latitude'] : null,
             !empty($b['longitude']) ? (float)$b['longitude'] : null,
             $status, (int)$u['id'], $u['role']]);
        // Populate junction table with all selected universities
        $uniIds = array_filter(array_map('intval', (array)($b['university_ids'] ?? [(int)$b['nearest_university_id']])));
        if (!in_array((int)$b['nearest_university_id'], $uniIds)) $uniIds[] = (int)$b['nearest_university_id'];
        foreach ($uniIds as $uid2) {
            if ($uid2 > 0) qn('INSERT IGNORE INTO property_universities (property_id,university_id) VALUES (?,?)', [$pid, $uid2]);
        }
        $roomId = null;
        if (!empty($b['monthly_price'])) {
            $roomId = qx('INSERT INTO rooms (property_id,room_type,monthly_price,deposit_months,capacity,total_count,occupied_count,furnished,bathroom_type,description) VALUES (?,?,?,?,?,?,0,?,?,NULL)',
                [$pid, $b['room_type'] ?? 'Single', (int)$b['monthly_price'], max(1, (int)($b['deposit_months'] ?? 1)),
                 max(1, (int)($b['capacity'] ?? 1)), max(1, (int)($b['rooms_count'] ?? 1)),
                 (int)($b['furnished'] ?? 0), $b['bathroom_type'] ?? 'Shared']);
        }
        if (($b['availability'] ?? '') === 'full') qn("UPDATE properties SET availability='full', availability_updated_at=NOW() WHERE id=?", [$pid]);
        db()->commit();
        sendWelcomeSms($owner);
        ok(['id'=>$pid, 'status'=>'approved', 'room_id'=>$roomId, 'owner'=>$owner,
            'message'=>'Property is now live. Schedule a verification visit to earn the Geto badge.']);
    }

    // ── POST /api/admin/properties/:id/rooms — add room type ──
    if ($method === 'POST' && $sub === 'properties' && is_numeric($sub2) && $sub3 === 'rooms') {
        $pid = (int)$sub2;
        $b = body();
        if (empty($b['room_type']) || empty($b['monthly_price'])) err(400, 'Room type and price required.');
        $total = (int)($b['total_count']??1);
        $occ   = isset($b['occupied_count']) ? (int)$b['occupied_count'] : 0;
        $rid = qx('INSERT INTO rooms (property_id,room_type,monthly_price,deposit_months,capacity,total_count,occupied_count,furnished,bathroom_type,description) VALUES (?,?,?,?,?,?,?,?,?,?)',
            [$pid, $b['room_type'], (int)$b['monthly_price'], max(1,(int)($b['deposit_months']??1)),
             (int)($b['capacity']??1), $total, $occ,
             (int)($b['furnished']??0), $b['bathroom_type']??'Shared', $b['description']??null]);
        ok(['id'=>$rid]);
    }

    // ── PUT /api/admin/rooms/:room_id — update a room type ────
    if ($method === 'PUT' && $sub === 'rooms' && is_numeric($sub2)) {
        $rid = (int)$sub2;
        $b = body();
        $fields=[]; $params=[];
        foreach (['room_type','monthly_price','deposit_months','capacity','total_count','occupied_count','furnished','bathroom_type','description'] as $f)
            if (array_key_exists($f,$b)) { $fields[]="$f=?"; $params[]=$b[$f]; }
        if ($fields) { $params[]=$rid; qn('UPDATE rooms SET '.implode(',',$fields).' WHERE id=?',$params); }
        ok(['updated'=>true]);
    }

    // ── DELETE /api/admin/rooms/:room_id — remove a room type ─
    if ($method === 'DELETE' && $sub === 'rooms' && is_numeric($sub2)) {
        $rid2 = (int)$sub2;
        qn('DELETE FROM room_photos WHERE room_id=?', [$rid2]);
        qn('DELETE FROM room_videos WHERE room_id=?', [$rid2]);
        qn('DELETE FROM rooms WHERE id=?', [$rid2]);
        ok(['deleted'=>true]);
    }

    // ── POST /api/admin/properties/:id/photos — upload property photos ─
    if ($method === 'POST' && $sub === 'properties' && is_numeric($sub2) && $sub3 === 'photos') {
        $pid = (int)$sub2;
        if (!q1('SELECT id FROM properties WHERE id=?', [$pid])) err(404, 'Property not found.');
        $saved = saveUploadedPhotos($pid);
        ok(['uploaded'=>count($saved),'photos'=>$saved]);
    }

    // ── POST /api/admin/rooms/:id/photos — upload room photos ─
    if ($method === 'POST' && $sub === 'rooms' && is_numeric($sub2) && $sub3 === 'photos') {
        $rid2 = (int)$sub2;
        if (empty($_FILES['photos'])) err(400, 'No photos uploaded.');
        $docroot = rtrim($_SERVER['DOCUMENT_ROOT'], '/');
        $dir = "$docroot/uploads/rooms/$rid2";
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        $files = $_FILES['photos'];
        if (!is_array($files['name'])) $files = array_map(fn($v) => [$v], $files);
        $count = count($files['name']); $saved = [];
        $maxB  = MAX_FILE_MB * 1024 * 1024;
        for ($i = 0; $i < $count; $i++) {
            if ($files['error'][$i] !== UPLOAD_ERR_OK) continue;
            if ($files['size'][$i] > $maxB || !str_starts_with($files['type'][$i], 'image/')) continue;
            $name = preg_replace('/\.[^.]+$/', '', basename($files['name'][$i])).'_'.time().$i.'.webp';
            $dest = "$dir/$name";
            try { toWebP($files['tmp_name'][$i], $dest); }
            catch (Exception) { move_uploaded_file($files['tmp_name'][$i], $dest); }
            $isMain = empty(q('SELECT id FROM room_photos WHERE room_id=?', [$rid2])) ? 1 : 0;
            $ord = count($saved);
            qx('INSERT INTO room_photos (room_id,url,is_main,sort_order) VALUES (?,?,?,?)',
               [$rid2, "/uploads/rooms/$rid2/$name", $isMain, $ord]);
            $saved[] = "/uploads/rooms/$rid2/$name";
        }
        ok(['uploaded'=>count($saved),'photos'=>$saved]);
    }

    // ── DELETE /api/admin/room-photos/:id ─────────────────────
    if ($method === 'DELETE' && $sub === 'room-photos' && is_numeric($sub2)) {
        $phid = (int)$sub2;
        $ph = q1('SELECT url FROM room_photos WHERE id=?', [$phid]);
        if ($ph) {
            $docroot = rtrim($_SERVER['DOCUMENT_ROOT'], '/');
            @unlink($docroot.$ph['url']);
        }
        qn('DELETE FROM room_photos WHERE id=?', [$phid]);
        ok(['deleted'=>true]);
    }

    // ── POST /api/admin/rooms/:id/videos — add YouTube video ──
    if ($method === 'POST' && $sub === 'rooms' && is_numeric($sub2) && $sub3 === 'videos') {
        $rid2 = (int)$sub2;
        $b = body();
        if (empty($b['youtube_video_id'])) err(400, 'youtube_video_id required.');
        $vid = qx('INSERT INTO room_videos (room_id,youtube_video_id,title) VALUES (?,?,?)',
            [$rid2, $b['youtube_video_id'], $b['title']??null]);
        ok(['id'=>$vid]);
    }

    // ── DELETE /api/admin/room-videos/:id ─────────────────────
    if ($method === 'DELETE' && $sub === 'room-videos' && is_numeric($sub2)) {
        qn('DELETE FROM room_videos WHERE id=?', [(int)$sub2]);
        ok(['deleted'=>true]);
    }

    // ── PUT /api/admin/properties/:id/approve ─────────────────
    if ($method === 'PUT' && $sub === 'properties' && is_numeric($sub2) && $sub3 === 'approve') {
        $pid = (int)$sub2;
        qn("UPDATE properties SET status='approved',rejection_note=NULL WHERE id=?"
           . ($isAdmin ? '' : ' AND zone_id=?'), $isAdmin ? [$pid] : [$pid,$userZoneId]);
        ok(['approved'=>true]);
    }

    // ── PUT /api/admin/properties/:id/reject ──────────────────
    if ($method === 'PUT' && $sub === 'properties' && is_numeric($sub2) && $sub3 === 'reject') {
        $pid = (int)$sub2;
        qn("UPDATE properties SET status='rejected',rejection_note=? WHERE id=?"
           . ($isAdmin ? '' : ' AND zone_id=?'),
           $isAdmin ? [$b['note']??'Rejected.',$pid] : [$b['note']??'Rejected.',$pid,$userZoneId]);
        ok(['rejected'=>true]);
    }

    // ── PUT /api/admin/properties/:id/verify ──────────────────
    if ($method === 'PUT' && $sub === 'properties' && is_numeric($sub2) && $sub3 === 'verify') {
        if ($isGetoManager) err(403, 'Only senior staff (zone manager or admin) can verify properties.');
        $pid = (int)$sub2;
        $verifyClause = $isAdmin ? '' : ' AND zone_id=?';
        $verifyParams = $isAdmin ? [$u['id'],$pid] : [$u['id'],$pid,$userZoneId];
        $affected = qn("UPDATE properties SET verified=1,verified_by=?,verified_at=NOW(),verification_expiry=DATE_ADD(NOW(),INTERVAL 6 MONTH) WHERE id=?" . $verifyClause,
           $verifyParams);
        if (!$affected) err(403, 'Property not found in your zone.');
        $vdata = $b['checklist'] ?? [];
        qn("INSERT INTO verification_records (property_id,verified_by,inspection_date,owner_identity,location_confirmed,
                                              rooms_confirmed,water_confirmed,electricity_confirmed,security_confirmed,
                                              price_confirmed,notes,expiry_date)
            VALUES (?,?,CURDATE(),?,?,?,?,?,?,?,?,DATE_ADD(CURDATE(),INTERVAL 6 MONTH))
            ON DUPLICATE KEY UPDATE verified_by=VALUES(verified_by),inspection_date=VALUES(inspection_date),
                                    owner_identity=VALUES(owner_identity),location_confirmed=VALUES(location_confirmed),
                                    rooms_confirmed=VALUES(rooms_confirmed),notes=VALUES(notes)",
           [$pid,$u['id'],$vdata['owner_identity']??0,$vdata['location_confirmed']??0,$vdata['rooms_confirmed']??0,
            $vdata['water_confirmed']??0,$vdata['electricity_confirmed']??0,$vdata['security_confirmed']??0,
            $vdata['price_confirmed']??0,$b['notes']??null]);
        ok(['verified'=>true]);
    }

    // ── PUT /api/admin/properties/:id/unverify ───────────────
    if ($method === 'PUT' && $sub === 'properties' && is_numeric($sub2) && $sub3 === 'unverify') {
        requireAdmin();
        $pid = (int)$sub2;
        qn("UPDATE properties SET verified=0,verified_by=NULL,verified_at=NULL,verification_expiry=NULL WHERE id=?", [$pid]);
        ok(['unverified'=>true]);
    }

    // ── DELETE /api/admin/properties/:id ─────────────────────
    if ($method === 'DELETE' && $sub === 'properties' && is_numeric($sub2) && !$sub3) {
        requireAdmin();
        $pid = (int)$sub2;
        qn('DELETE FROM property_universities WHERE property_id=?', [$pid]);
        qn('DELETE FROM property_amenities WHERE property_id=?', [$pid]);
        qn('DELETE FROM verification_records WHERE property_id=?', [$pid]);
        qn('DELETE FROM bookings WHERE property_id=?', [$pid]);
        qn('DELETE FROM saved_properties WHERE property_id=?', [$pid]);
        qn('DELETE FROM viewing_requests WHERE property_id=?', [$pid]);
        // Delete room photos and videos
        $rooms = q('SELECT id FROM rooms WHERE property_id=?', [$pid]);
        foreach ($rooms as $rm) {
            qn('DELETE FROM room_photos WHERE room_id=?', [$rm['id']]);
            qn('DELETE FROM room_videos WHERE room_id=?', [$rm['id']]);
        }
        qn('DELETE FROM rooms WHERE property_id=?', [$pid]);
        // Delete property photos from disk
        $photos = q('SELECT url FROM property_photos WHERE property_id=?', [$pid]);
        $docroot = rtrim($_SERVER['DOCUMENT_ROOT'], '/');
        foreach ($photos as $ph) @unlink($docroot.$ph['url']);
        qn('DELETE FROM property_photos WHERE property_id=?', [$pid]);
        qn('DELETE FROM properties WHERE id=?', [$pid]);
        ok(['deleted'=>true]);
    }

    // ── GET /api/admin/property-types ────────────────────────
    if ($method === 'GET' && $sub === 'property-types' && !$sub2) {
        ok(q('SELECT id,name,sort_order FROM property_types ORDER BY sort_order,name'));
    }
    // ── POST /api/admin/property-types ───────────────────────
    if ($method === 'POST' && $sub === 'property-types' && !$sub2) {
        requireAdmin();
        $b = body();
        if (empty($b['name'])) err(400, 'Name required.');
        $id2 = qx('INSERT INTO property_types (name,sort_order) VALUES (?,?)', [trim($b['name']), (int)($b['sort_order']??99)]);
        ok(['id'=>$id2, 'name'=>trim($b['name'])]);
    }
    // ── DELETE /api/admin/property-types/:id ─────────────────
    if ($method === 'DELETE' && $sub === 'property-types' && is_numeric($sub2)) {
        requireAdmin();
        qn('DELETE FROM property_types WHERE id=?', [(int)$sub2]);
        ok(['deleted'=>true]);
    }

    // ── GET /api/admin/room-types ─────────────────────────────
    if ($method === 'GET' && $sub === 'room-types' && !$sub2) {
        ok(q('SELECT id,name,sort_order FROM room_types ORDER BY sort_order,name'));
    }
    // ── POST /api/admin/room-types ────────────────────────────
    if ($method === 'POST' && $sub === 'room-types' && !$sub2) {
        requireAdmin();
        $b = body();
        if (empty($b['name'])) err(400, 'Name required.');
        $id2 = qx('INSERT INTO room_types (name,sort_order) VALUES (?,?)', [trim($b['name']), (int)($b['sort_order']??99)]);
        ok(['id'=>$id2, 'name'=>trim($b['name'])]);
    }
    // ── DELETE /api/admin/room-types/:id ─────────────────────
    if ($method === 'DELETE' && $sub === 'room-types' && is_numeric($sub2)) {
        requireAdmin();
        qn('DELETE FROM room_types WHERE id=?', [(int)$sub2]);
        ok(['deleted'=>true]);
    }

    // ── PUT /api/admin/properties/:id/zone — assign zone/cluster (admin only)
    if ($method === 'PUT' && $sub === 'properties' && is_numeric($sub2) && $sub3 === 'zone') {
        requireAdmin();
        qn('UPDATE properties SET zone_id=?,cluster_id=? WHERE id=?',
           [$b['zone_id']??null,$b['cluster_id']??null,(int)$sub2]);
        ok(['updated'=>true]);
    }

    // ── GET /api/admin/users — list users (scoped) ────────────
    if ($method === 'GET' && $sub === 'users' && !$sub2) {
        $role = $_GET['role'] ?? null;
        $sql = "SELECT u.id,u.name,u.email,u.phone,u.role,u.status,u.verified,u.business_name,
                       u.zone_id,u.created_at,z.code AS zone_code,u.id_front_url,u.id_back_url,
                       (SELECT COUNT(*) FROM properties p WHERE p.owner_id=u.id) AS property_count
                FROM users u LEFT JOIN zones z ON z.id=u.zone_id WHERE 1=1";
        $params = [];
        if ($role) {
            if ($role === 'geto_officer') {
                $sql .= " AND u.role IN ('geto_officer','geto_manager')";
            } else {
                $sql .= ' AND u.role=?'; $params[] = $role;
            }
        }
        if (!empty($_GET['q'])) {
            $sql .= ' AND (u.name LIKE ? OR u.phone LIKE ? OR u.email LIKE ?)';
            $params[] = '%'.$_GET['q'].'%'; $params[] = '%'.$_GET['q'].'%'; $params[] = '%'.$_GET['q'].'%';
        }
        // Zone managers only see owners/managers whose properties are in their zone
        if (!$isAdmin) {
            $sql .= " AND (u.role NOT IN ('admin','zone_manager') AND u.id IN
                     (SELECT owner_id FROM properties WHERE zone_id=?))";
            $params[] = $userZoneId;
        }
        $sql .= ' ORDER BY u.name ASC LIMIT 50';
        ok(q($sql, $params));
    }

    // ── GET /api/admin/users/:id ──────────────────────────────
    if ($method === 'GET' && $sub === 'users' && is_numeric($sub2)) {
        $uid = (int)$sub2;
        $user = q1("SELECT u.id,u.name,u.email,u.phone,u.whatsapp_phone,u.role,u.status,u.verified,
                           u.verified_at,u.business_name,u.id_document_url,u.zone_id,u.university_id,
                           u.referral_code,u.created_at,u.last_login_at,u.rejection_note,
                           z.code AS zone_code, z.name AS zone_name
                    FROM users u LEFT JOIN zones z ON z.id=u.zone_id WHERE u.id=?", [$uid]);
        if (!$user) err(404, 'User not found.');
        $props = q("SELECT p.id,p.name,p.status,p.verified,p.area FROM properties p WHERE p.owner_id=?", [$uid]);
        $assignments = q("SELECT p.id,p.name,p.area FROM property_manager_assignments pma
                          JOIN properties p ON p.id=pma.property_id WHERE pma.manager_id=? AND pma.is_active=1", [$uid]);
        ok(['user'=>$user,'properties'=>$props,'managed_properties'=>$assignments]);
    }

    // ── PUT /api/admin/users/:id/verify — approve owner/manager
    if ($method === 'PUT' && $sub === 'users' && is_numeric($sub2) && $sub3 === 'verify') {
        $uid = (int)$sub2;
        qn("UPDATE users SET status='active',verified=1,verified_by=?,verified_at=NOW(),rejection_note=NULL WHERE id=?",
           [$u['id'],$uid]);
        ok(['verified'=>true]);
    }

    // ── PUT /api/admin/users/:id/reject ──────────────────────
    if ($method === 'PUT' && $sub === 'users' && is_numeric($sub2) && $sub3 === 'reject') {
        requireAdmin();
        qn("UPDATE users SET status='suspended',rejection_note=? WHERE id=?", [$b['note']??'Rejected.',(int)$sub2]);
        ok(['rejected'=>true]);
    }

    // ── PUT /api/admin/users/:id/suspend ─────────────────────
    if ($method === 'PUT' && $sub === 'users' && is_numeric($sub2) && $sub3 === 'suspend') {
        requireAdmin();
        qn("UPDATE users SET status='suspended' WHERE id=?", [(int)$sub2]);
        ok(['suspended'=>true]);
    }

    // ── GET /api/admin/users/search — autocomplete by name or phone (for owner lookup)
    if ($method === 'GET' && $sub === 'users' && $sub2 === 'search') {
        $q = trim($_GET['q'] ?? '');
        $role = $_GET['role'] ?? null;
        if (strlen($q) < 2) ok([]);
        $like = '%'.$q.'%';
        $roleSql = $role ? " AND u.role=?" : '';
        $params  = $role ? [$like,$like,$role] : [$like,$like];
        $results = q("SELECT u.id,u.name,u.email,u.phone,u.role,u.business_name,u.status
                      FROM users u WHERE (u.name LIKE ? OR u.phone LIKE ?)$roleSql
                      ORDER BY u.name LIMIT 15", $params);
        ok($results);
    }

    // ── POST /api/admin/users/owner — create property owner account
    if ($method === 'POST' && $sub === 'users' && $sub2 === 'owner') {
        foreach (['name','phone','password'] as $f)
            if (empty($b[$f])) err(400, "$f required.");
        if (q1('SELECT id FROM users WHERE phone=?', [$b['phone']]) || usersByPhone($b['phone'])) err(409, 'Phone number tayari imesajiliwa.');
        $email = !empty($b['email']) ? trim($b['email']) : null;
        if ($email && q1('SELECT id FROM users WHERE email=?', [$email])) err(409, 'Email tayari imesajiliwa.');
        $role = in_array($b['role']??'', ['property_owner','property_manager']) ? $b['role'] : 'property_owner';
        $ref = makeReferralCode($b['name']);
        $uid = qx("INSERT INTO users (name,email,phone,whatsapp_phone,password_hash,role,status,business_name,referral_code,terms_accepted)
                   VALUES (?,?,?,?,?,?,?,?,?,?)",
                  [$b['name'],$email,$b['phone'],$b['whatsapp_phone']??null,
                   hashPwd($b['password']),$role,'active',
                   $b['business_name']??null,$ref,1]);
        ok(['id'=>$uid,'name'=>$b['name'],'email'=>$email,'phone'=>$b['phone'],'role'=>$role,'message'=>'Account created.']);
    }

    // ── POST /api/admin/users/geto-officer — create geto officer (admin or zone_manager for their zone)
    if ($method === 'POST' && $sub === 'users' && ($sub2 === 'geto-officer' || $sub2 === 'geto-manager')) {
        if ($isGetoManager) err(403, 'Only senior staff can create geto officers.');
        foreach (['name','phone','password'] as $f)
            if (empty($b[$f])) err(400, "$f required.");
        if (q1('SELECT id FROM users WHERE phone=?', [$b['phone']])) err(409, 'Phone number already registered.');
        $email = !empty($b['email']) ? trim($b['email']) : null;
        if ($email && q1('SELECT id FROM users WHERE email=?', [$email])) err(409, 'Email already registered.');
        // Zone managers assign to their own zone; admin can specify
        $zoneId = $isAdmin ? (!empty($b['zone_id']) ? (int)$b['zone_id'] : null) : $userZoneId;
        $rid = makeReferralCode($b['name']);
        $id = qx("INSERT INTO users (name,email,phone,whatsapp_phone,password_hash,role,status,zone_id,referral_code,terms_accepted)
                  VALUES (?,?,?,?,?,?,?,?,?,?)",
                 [$b['name'],$email,$b['phone'],$b['phone'],hashPwd($b['password']),'geto_officer','active',
                  $zoneId,$rid,1]);
        created(['message'=>'Geto officer created.','userId'=>$id]);
    }

    // ── POST /api/admin/users/zone-manager — create zone manager (admin only)
    if ($method === 'POST' && $sub === 'users' && $sub2 === 'zone-manager') {
        requireAdmin();
        foreach (['name','phone','password'] as $f)
            if (empty($b[$f])) err(400, "$f required.");
        if (q1('SELECT id FROM users WHERE phone=?', [$b['phone']])) err(409, 'Phone number already registered.');
        $email = !empty($b['email']) ? trim($b['email']) : null;
        if ($email && q1('SELECT id FROM users WHERE email=?', [$email])) err(409, 'Email already registered.');
        $zoneId = !empty($b['zone_id']) ? (int)$b['zone_id'] : null;
        $zone = $zoneId ? q1('SELECT id,code FROM zones WHERE id=?', [$zoneId]) : null;
        $rid = makeReferralCode($b['name']);
        $id = qx("INSERT INTO users (name,email,phone,whatsapp_phone,password_hash,role,status,zone_id,referral_code,terms_accepted)
                  VALUES (?,?,?,?,?,?,?,?,?,?)",
                 [$b['name'],$email,$b['phone'],$b['phone'],hashPwd($b['password']),'zone_manager','active',
                  $zoneId,$rid,1]);
        created(['message'=>'Zone manager created.','userId'=>$id,'zone'=>$zone]);
    }

    // ── PUT /api/admin/users/:id/promote — promote geto_manager → zone_manager (admin only)
    if ($method === 'PUT' && $sub === 'users' && is_numeric($sub2) && $sub3 === 'promote') {
        requireAdmin();
        $uid = (int)$sub2;
        $target = q1('SELECT id,name,role FROM users WHERE id=?', [$uid]);
        if (!$target) err(404, 'User not found.');
        $newRole = $b['role'] ?? 'zone_manager';
        if (!in_array($newRole, ['zone_manager','geto_officer','geto_manager','admin'])) err(400, 'Invalid target role.');
        $zoneId = !empty($b['zone_id']) ? (int)$b['zone_id'] : null;
        qn('UPDATE users SET role=?, zone_id=COALESCE(?,zone_id) WHERE id=?', [$newRole,$zoneId,$uid]);
        ok(['promoted'=>true,'name'=>$target['name'],'new_role'=>$newRole]);
    }

    // ── POST /api/admin/users/:id/id-photo — upload National ID photo ─
    if ($method === 'POST' && $sub === 'users' && is_numeric($sub2) && $sub3 === 'id-photo') {
        requireAdmin();
        $uid  = (int)$sub2;
        $side = $_POST['side'] ?? 'front'; // 'front' or 'back'
        if (!in_array($side, ['front','back'])) err(400, 'side must be front or back.');
        if (empty($_FILES['photo'])) err(400, 'No photo uploaded.');
        $file = $_FILES['photo'];
        if ($file['error'] !== UPLOAD_ERR_OK) err(400, 'Upload error.');
        if (!str_starts_with($file['type'], 'image/')) err(400, 'Image files only.');
        $docroot = rtrim($_SERVER['DOCUMENT_ROOT'], '/');
        $dir = "$docroot/uploads/user-ids/$uid";
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        $name = "id_{$side}_".time().'.webp';
        $dest = "$dir/$name";
        try { toWebP($file['tmp_name'], $dest); }
        catch (Exception) { move_uploaded_file($file['tmp_name'], $dest); }
        $url  = "/uploads/user-ids/$uid/$name";
        $col  = $side === 'front' ? 'id_front_url' : 'id_back_url';
        qn("UPDATE users SET $col=? WHERE id=?", [$url, $uid]);
        ok(['url'=>$url,'side'=>$side]);
    }

    // ── POST /api/admin/assign-manager — assign manager to property
    if ($method === 'POST' && $sub === 'assign-manager') {
        if (empty($b['property_id'])||empty($b['manager_id'])) err(400, 'property_id and manager_id required.');
        $mgr = q1("SELECT id,name FROM users WHERE id=? AND role='property_manager' AND status='active'", [(int)$b['manager_id']]);
        if (!$mgr) err(404, 'Property manager not found or not verified.');
        // Deactivate any existing assignment
        qn('UPDATE property_manager_assignments SET is_active=0 WHERE property_id=?', [(int)$b['property_id']]);
        qx('INSERT INTO property_manager_assignments (property_id,manager_id,assigned_by) VALUES (?,?,?)',
           [(int)$b['property_id'],(int)$b['manager_id'],$u['id']]);
        ok(['assigned'=>true,'manager'=>$mgr]);
    }

    // ── DELETE /api/admin/assign-manager/:property_id ─────────
    if ($method === 'DELETE' && $sub === 'assign-manager' && is_numeric($sub2)) {
        qn('UPDATE property_manager_assignments SET is_active=0 WHERE property_id=?', [(int)$sub2]);
        ok(['removed'=>true]);
    }

    // ── GET /api/admin/bookings ───────────────────────────────
    if ($method === 'GET' && $sub === 'bookings' && !$sub2) {
        $where  = $bookingClause;
        $params = $bookingParams;
        if (!empty($_GET['status'])) { $where .= ' AND b.status=?'; $params[] = $_GET['status']; }
        if (!empty($_GET['property_id'])) { $where .= ' AND b.property_id=?'; $params[] = (int)$_GET['property_id']; }
        if ($isSeniorStaff && !empty($_GET['assigned_to'])) { $where .= ' AND b.assigned_to=?'; $params[] = (int)$_GET['assigned_to']; }
        $sql = "SELECT b.id,b.move_in_date,b.status,b.created_at,
                       b.amount_paid,b.contract_start,b.contract_end,b.payment_receipt_ref,
                       b.assigned_to,b.payment_confirmed_at,b.student_confirmed_at,b.booked_by_staff_role,
                       p.id AS property_id,p.name AS property_name,p.area,p.property_type,z.code AS zone_code,
                       r.room_type,r.monthly_price,r.deposit_months,r.capacity,
                       s.id AS student_id,s.name AS student_name,s.username AS student_username,
                       s.phone AS student_phone,s.email AS student_email,
                       (SELECT name FROM universities WHERE id=s.university_id) AS student_university,
                       ow.name AS owner_name,
                       gm.name AS assigned_gm_name,gm.phone AS assigned_gm_phone,gm.referral_code AS assigned_gm_code,
                       COALESCE(opp.auto_payout_enabled,0) AS owner_auto_payout
                FROM bookings b
                JOIN properties p ON p.id=b.property_id
                LEFT JOIN zones z ON z.id=p.zone_id
                JOIN rooms r ON r.id=b.room_id
                JOIN users s ON s.id=b.student_id
                JOIN users ow ON ow.id=b.owner_id
                LEFT JOIN users gm ON gm.id=b.assigned_to
                LEFT JOIN owner_payout_profiles opp ON opp.owner_id=b.owner_id
                WHERE $where
                ORDER BY b.created_at DESC
                LIMIT 200";
        ok(q($sql, $params));
    }

    // ── GET /api/admin/bookings/:id — full single booking detail ──
    if ($method === 'GET' && $sub === 'bookings' && is_numeric($sub2) && !$sub3) {
        $bid = (int)$sub2;
        $bk = q1("SELECT b.*,
                         s.name AS student_name,s.username AS student_username,s.phone AS student_phone,
                         s.email AS student_email,
                         (SELECT name FROM universities WHERE id=s.university_id) AS student_university,
                         p.name AS property_name,p.area,p.address,p.id AS prop_id,p.property_type,
                         r.room_type,r.monthly_price,r.deposit_months,r.capacity,r.bathroom_type,r.furnished,
                         z.code AS zone_code,z.name AS zone_name,
                         gm.id AS gm_id,gm.name AS assigned_gm_name,gm.phone AS assigned_gm_phone,
                         gm.referral_code AS assigned_gm_code,
                         confirmer.name AS payment_confirmed_by_name,
                         booker.name AS booked_by_staff_name,
                         COALESCE(opp.auto_payout_enabled,0) AS owner_auto_payout
                  FROM bookings b
                  JOIN users s ON s.id=b.student_id
                  JOIN properties p ON p.id=b.property_id
                  JOIN rooms r ON r.id=b.room_id
                  LEFT JOIN zones z ON z.id=p.zone_id
                  LEFT JOIN users gm ON gm.id=b.assigned_to
                  LEFT JOIN users confirmer ON confirmer.id=b.payment_confirmed_by
                  LEFT JOIN users booker ON booker.id=b.booked_by_staff
                  LEFT JOIN owner_payout_profiles opp ON opp.owner_id=b.owner_id
                  WHERE b.id=? AND $bookingClause", array_merge([$bid], $bookingParams));
        if (!$bk) err(404, 'Booking not found or access denied.');
        // Auto-suggest a GM based on property creator or student's referrer
        $suggestedGm = q1("SELECT u.id,u.name,u.phone,u.referral_code
                            FROM properties p
                            JOIN users u ON u.id=p.created_by AND u.role IN ('geto_manager','geto_officer')
                            WHERE p.id=?
                            UNION
                            SELECT u2.id,u2.name,u2.phone,u2.referral_code
                            FROM users s
                            JOIN users u2 ON u2.id=s.referred_by AND u2.role IN ('geto_manager','geto_officer')
                            WHERE s.id=? LIMIT 1", [$bk['prop_id'],$bk['student_id']]);
        $bk['suggested_gm'] = $suggestedGm;
        ok($bk);
    }

    // ── GET /api/admin/users/students — search students for staff booking flow ──
    if ($method === 'GET' && $sub === 'users' && $sub2 === 'students') {
        requireStaff();
        $q = trim($_GET['q'] ?? '');
        if (strlen($q) < 2) err(400, 'Search query must be at least 2 characters.');
        $uid = !empty($_GET['university_id']) ? (int)$_GET['university_id'] : null;
        $sql = "SELECT u.id,u.name,u.username,u.phone,u.email,u.university_id,
                       un.name AS university_name
                FROM users u LEFT JOIN universities un ON un.id=u.university_id
                WHERE u.role='student'
                AND (u.name LIKE ? OR u.username LIKE ? OR u.phone LIKE ?)";
        $params = ['%'.$q.'%','%'.$q.'%','%'.$q.'%'];
        if ($uid) { $sql .= ' AND u.university_id=?'; $params[] = $uid; }
        $sql .= ' ORDER BY u.name LIMIT 20';
        ok(q($sql, $params));
    }

    // ── POST /api/admin/bookings — staff creates booking for a student ──
    // Quick register: send student_name + student_phone instead of student_id (account found or
    // created). room_id may be left out when the house has one room type; move-in defaults to today.
    if ($method === 'POST' && $sub === 'bookings' && !$sub2) {
        $staff = requireStaff();
        $b2 = body();
        if (empty($b2['property_id'])) err(400, 'Choose a house.');
        if (empty($b2['student_id']) && empty($b2['student_phone'])) err(400, "Enter the student's name and phone number.");
        if (empty($b2['room_id'])) {
            $types = q('SELECT id FROM rooms WHERE property_id=? LIMIT 2', [(int)$b2['property_id']]);
            if (count($types) !== 1) err(400, $types ? 'Choose a room type for this house.' : 'This house has no rooms yet. Add a room type first.');
            $b2['room_id'] = $types[0]['id'];
        }
        if (empty($b2['move_in_date'])) $b2['move_in_date'] = date('Y-m-d');
        $prop = q1("SELECT id,owner_id FROM properties WHERE id=? AND status='approved'", [(int)$b2['property_id']]);
        if (!$prop) err(404, 'Property not found.');
        $room = q1('SELECT id, total_count, capacity, property_id FROM rooms WHERE id=? AND property_id=?',
                   [(int)$b2['room_id'],(int)$b2['property_id']]);
        if (!$room) err(404, 'Room not found.');
        $ACTIVE = "'payment_confirmed','student_confirmed','active','checked_in'";
        $unitInfo2 = q1("SELECT COUNT(DISTINCT ru.id) AS unit_count,
                                COALESCE(SUM(COALESCE(ru.capacity, r.capacity)), 0) AS total_beds
                         FROM room_units ru JOIN rooms r ON r.id=ru.room_type_id
                         WHERE ru.room_type_id=? AND ru.property_id=? AND ru.is_active=1",
                        [(int)$room['id'], (int)$room['property_id']]);
        if ((int)$unitInfo2['unit_count'] > 0) {
            $confirmedBeds2 = (int)(q1("SELECT COUNT(*) AS cnt FROM bookings bk
                                         JOIN room_units ru ON ru.id=bk.room_unit_id
                                         WHERE ru.room_type_id=? AND ru.property_id=? AND ru.is_active=1
                                           AND bk.status IN ($ACTIVE)",
                                        [(int)$room['id'], (int)$room['property_id']])['cnt'] ?? 0);
            if ($confirmedBeds2 >= (int)$unitInfo2['total_beds']) err(409, 'No spaces available in this room.');
        } else {
            $confirmedBks2 = (int)(q1("SELECT COUNT(*) AS cnt FROM bookings WHERE room_id=? AND status IN ($ACTIVE)", [(int)$room['id']])['cnt'] ?? 0);
            $totalSlots2 = (int)$room['total_count'] * max(1, (int)$room['capacity']);
            if ($confirmedBks2 >= $totalSlots2) err(409, 'No spaces available in this room.');
        }
        db()->beginTransaction();   // new student account + booking are saved together or not at all
        $newStudent = null;
        if (empty($b2['student_id'])) {
            $newStudent = findOrCreateUser((string)($b2['student_name'] ?? ''), (string)$b2['student_phone'], 'student',
                ['university_id' => !empty($b2['university_id']) ? (int)$b2['university_id'] : null]);
            $b2['student_id'] = $newStudent['id'];
        }
        $student = q1("SELECT id FROM users WHERE id=? AND role='student'", [(int)$b2['student_id']]);
        if (!$student) err(404, 'Student not found.');
        $dup = q1("SELECT id FROM bookings WHERE student_id=? AND property_id=? AND status NOT IN ('rejected','cancelled','checked_out','move_out_completed')", [(int)$b2['student_id'],(int)$b2['property_id']]);
        if ($dup) err(409, 'This student already has an active booking at this property.');
        $isOfficer = in_array($staff['role'], ['geto_manager','geto_officer']);
        $initStatus = $isOfficer ? 'assigned' : 'pending';
        $bid = qx("INSERT INTO bookings (student_id,property_id,room_id,owner_id,move_in_date,move_in_notes,status,booked_by_staff,booked_by_staff_role,assigned_to)
                   VALUES (?,?,?,?,?,?,?,?,?,?)",
                  [(int)$b2['student_id'],(int)$b2['property_id'],(int)$b2['room_id'],(int)$prop['owner_id'],
                   $b2['move_in_date'],$b2['notes']??null,$initStatus,(int)$staff['id'],$staff['role'],
                   $isOfficer?(int)$staff['id']:null]);
        db()->commit();
        sendWelcomeSms($newStudent);
        created(['id'=>$bid,'status'=>$initStatus,'student'=>$newStudent,
                 'message'=>'Booking created. Student will need to confirm after payment is recorded.']);
    }

    // ── POST /api/admin/bookings/:id/assign-geto — assign GM to a booking ──
    if ($method === 'POST' && $sub === 'bookings' && is_numeric($sub2) && $sub3 === 'assign-geto') {
        requireSeniorStaff();
        $bid = (int)$sub2;
        $b2 = body();
        $gmId = (int)($b2['assigned_to'] ?? $b2['geto_manager_id'] ?? 0);
        if (!$gmId) err(400, 'assigned_to (geto officer id) required.');
        $gm = q1("SELECT id FROM users WHERE id=? AND role IN ('geto_manager','geto_officer')", [$gmId]);
        if (!$gm) err(404, 'Geto officer not found.');
        $bk = q1("SELECT b.id,b.status FROM bookings b JOIN properties p ON p.id=b.property_id WHERE b.id=? AND $zoneClause", array_merge([$bid],$zoneParams));
        if (!$bk) err(404, 'Booking not found or not in your zone.');
        qn("UPDATE bookings SET assigned_to=?, status=IF(status='pending','assigned',status) WHERE id=?",
           [$gmId,$bid]);
        ok(['assigned'=>true,'message'=>'Booking assigned to Geto Officer.']);
    }

    // ── POST /api/admin/bookings/:id/confirm-payment — record payment details ──
    if ($method === 'POST' && $sub === 'bookings' && is_numeric($sub2) && $sub3 === 'confirm-payment') {
        $staff = requireStaff();
        $bid = (int)$sub2;
        $b2 = body();
        // Geto officer can only confirm if booking is assigned to them
        if (in_array($staff['role'], ['geto_manager','geto_officer'])) {
            $bk = q1('SELECT id,assigned_to FROM bookings WHERE id=?', [$bid]);
            if (!$bk || (int)$bk['assigned_to'] !== (int)$staff['id'])
                err(403, 'This booking is not assigned to you.');
        } else {
            $bk = q1("SELECT b.id FROM bookings b JOIN properties p ON p.id=b.property_id WHERE b.id=? AND $zoneClause", array_merge([$bid],$zoneParams));
            if (!$bk) err(404, 'Booking not found.');
        }
        $amount   = (int)($b2['amount_paid'] ?? 0);
        $start    = $b2['contract_start'] ?? null;
        $end      = $b2['contract_end'] ?? null;
        $runitId  = !empty($b2['room_unit_id']) ? (int)$b2['room_unit_id'] : null;
        if (!$amount || !$start || !$end)
            err(400, 'amount_paid, contract_start, and contract_end are required.');
        // Validate room unit belongs to this booking's property if supplied
        if ($runitId) {
            $bkRoom = q1('SELECT b.property_id FROM bookings b WHERE b.id=?', [$bid]);
            $unit   = q1('SELECT id FROM room_units WHERE id=? AND property_id=?', [$runitId, $bkRoom['property_id']]);
            if (!$unit) err(404, 'Room unit not found for this property.');
        }
        $unitSql = $runitId ? ', room_unit_id=?' : '';
        $params  = [$amount,$b2['payment_receipt_ref']??null,$b2['payment_note']??null,$start,$end,(int)$staff['id']];
        if ($runitId) $params[] = $runitId;
        $params[] = $bid;
        qn("UPDATE bookings SET status='payment_confirmed', amount_paid=?, payment_receipt_ref=?,
            payment_note=?, contract_start=?, contract_end=?,
            payment_confirmed_by=?, payment_confirmed_at=NOW()$unitSql
            WHERE id=?", $params);
        ok(['recorded'=>true,'message'=>'Payment recorded. The student must now log in and confirm to activate their QR code.']);
    }

    // ── DELETE /api/admin/bookings/:id — cancel/reject a booking (staff) ──
    if ($method === 'DELETE' && $sub === 'bookings' && is_numeric($sub2)) {
        requireSeniorStaff();
        $bid = (int)$sub2;
        $bk = q1("SELECT b.id,b.status FROM bookings b JOIN properties p ON p.id=b.property_id WHERE b.id=? AND $zoneClause", array_merge([$bid],$zoneParams));
        if (!$bk) err(404, 'Booking not found.');
        if (in_array($bk['status'],['active','checked_in','move_in_completed']))
            err(400, 'Cannot cancel a booking with an active tenant.');
        $b2 = body();
        qn("UPDATE bookings SET status='cancelled', admin_notes=? WHERE id=?", [$b2['note']??null,$bid]);
        ok(['cancelled'=>true]);
    }

    // ── GET /api/admin/zones — zone list with stats (admin only)
    if ($method === 'GET' && $sub === 'zones' && !$sub2) {
        requireAdmin();
        $zones = q("SELECT z.*,
                     COUNT(DISTINCT p.id) AS total_properties,
                     SUM(p.status='approved') AS approved_properties,
                     SUM(p.verified=1) AS verified_properties,
                     COALESCE(SUM(r.total_count),0) AS total_rooms,
                     COALESCE(SUM(r.occupied_count),0) AS occupied_rooms,
                     (SELECT COUNT(*) FROM users u2 WHERE u2.role='zone_manager' AND u2.zone_id=z.id) AS managers
              FROM zones z
              LEFT JOIN properties p ON p.zone_id=z.id
              LEFT JOIN rooms r ON r.property_id=p.id
              GROUP BY z.id ORDER BY z.city, z.code");
        foreach ($zones as &$z) {
            $z['clusters'] = q('SELECT id,code,name,active FROM clusters WHERE zone_id=? ORDER BY code', [(int)$z['id']]);
            $z['coverage'] = q('SELECT id,coverage_type,coverage_value FROM zone_coverage WHERE zone_id=? ORDER BY coverage_type,coverage_value', [(int)$z['id']]);
        }
        ok($zones);
    }

    // ── POST /api/admin/zones — create zone
    if ($method === 'POST' && $sub === 'zones' && !$sub2) {
        requireAdmin();
        $b = body();
        if (empty($b['code']) || empty($b['name']) || empty($b['city'])) err(400, 'code, name, city required.');
        $code = strtoupper(trim($b['code']));
        if (strlen($code) < 1 || strlen($code) > 5) err(400, 'Zone code must be 1–5 characters.');
        if (q1('SELECT id FROM zones WHERE code=?', [$code])) err(409, 'Zone code already exists.');
        $id = qx('INSERT INTO zones (code,name,city,description) VALUES (?,?,?,?)',
                 [$code, trim($b['name']), trim($b['city']), trim($b['description']??'')]);
        ok(['id'=>$id,'code'=>$code,'name'=>trim($b['name']),'city'=>trim($b['city']),'clusters'=>[]]);
    }

    // ── PUT /api/admin/zones/:id — edit zone
    if ($method === 'PUT' && $sub === 'zones' && $sub2 && $sub3 !== 'clusters') {
        requireAdmin();
        $zid = (int)$sub2;
        $b = body(); $updates = []; $params = [];
        foreach (['name','city','description','active'] as $k) {
            if (array_key_exists($k, $b)) { $updates[] = "$k=?"; $params[] = $b[$k]; }
        }
        if (empty($updates)) err(400, 'Nothing to update.');
        $params[] = $zid;
        qx('UPDATE zones SET '.implode(',',$updates).' WHERE id=?', $params);
        ok(['updated'=>true]);
    }

    // ── POST /api/admin/zones/:id/clusters — add cluster to zone
    if ($method === 'POST' && $sub === 'zones' && $sub2 && $sub3 === 'clusters') {
        requireAdmin();
        $zid = (int)$sub2;
        if (!q1('SELECT id FROM zones WHERE id=?', [$zid])) err(404, 'Zone not found.');
        $b = body();
        if (empty($b['code']) || empty($b['name'])) err(400, 'code and name required.');
        $code = strtoupper(trim($b['code']));
        if (q1('SELECT id FROM clusters WHERE code=?', [$code])) err(409, 'Cluster code already exists.');
        $id = qx('INSERT INTO clusters (zone_id,code,name) VALUES (?,?,?)', [$zid, $code, trim($b['name'])]);
        ok(['id'=>$id,'zone_id'=>$zid,'code'=>$code,'name'=>trim($b['name']),'active'=>1]);
    }

    // ── POST /api/admin/zones/:id/coverage — add a region/district/ward to zone coverage
    if ($method === 'POST' && $sub === 'zones' && is_numeric($sub2) && $sub3 === 'coverage') {
        requireAdmin();
        $zid = (int)$sub2;
        if (!q1('SELECT id FROM zones WHERE id=?', [$zid])) err(404, 'Zone not found.');
        $b = body();
        $type = $b['coverage_type'] ?? '';
        $val  = trim($b['coverage_value'] ?? '');
        if (!in_array($type, ['region','district','ward']) || !$val) err(400, 'coverage_type (region/district/ward) and coverage_value required.');
        try {
            $id = qx('INSERT INTO zone_coverage (zone_id,coverage_type,coverage_value) VALUES (?,?,?)', [$zid,$type,$val]);
            ok(['id'=>$id,'zone_id'=>$zid,'coverage_type'=>$type,'coverage_value'=>$val]);
        } catch(\PDOException $e) { err(409, 'Coverage entry already exists.'); }
    }

    // ── DELETE /api/admin/zones/:id/coverage/:cov_id — remove a coverage entry
    if ($method === 'DELETE' && $sub === 'zones' && is_numeric($sub2) && $sub3 === 'coverage' && is_numeric($sub4)) {
        requireAdmin();
        qn('DELETE FROM zone_coverage WHERE id=? AND zone_id=?', [(int)$sub4, (int)$sub2]);
        ok(['deleted'=>true]);
    }

    // ── GET /api/admin/zone-managers ─────────────────────────
    if ($method === 'GET' && $sub === 'zone-managers') {
        requireAdmin();
        ok(q("SELECT u.id,u.name,u.email,u.phone,u.status,u.created_at,u.last_login_at,
                     z.code AS zone_code,z.name AS zone_name,
                     (SELECT COUNT(*) FROM properties p WHERE p.zone_id=u.zone_id AND p.status='approved') AS zone_properties
              FROM users u LEFT JOIN zones z ON z.id=u.zone_id
              WHERE u.role='zone_manager' ORDER BY z.code"));
    }

    // ── GET /api/admin/staff — list geto_managers (ZM scoped to their zone, admin sees all)
    if ($method === 'GET' && $sub === 'staff' && !$sub2) {
        $sql = "SELECT u.id,u.name,u.email,u.phone,u.status,u.role,u.referral_code,u.created_at,
                       z.code AS zone_code,z.name AS zone_name,
                       (SELECT COUNT(*) FROM bookings b WHERE b.assigned_to=u.id
                        AND b.status NOT IN ('rejected','cancelled','checked_out')) AS active_bookings
                FROM users u LEFT JOIN zones z ON z.id=u.zone_id
                WHERE u.role IN ('geto_manager','geto_officer')";
        $params = [];
        if (!$isAdmin) { $sql .= ' AND u.zone_id=?'; $params[] = $userZoneId; }
        if (!empty($_GET['q'])) {
            $sql .= ' AND (u.name LIKE ? OR u.phone LIKE ?)';
            $params[] = '%'.$_GET['q'].'%'; $params[] = '%'.$_GET['q'].'%';
        }
        $sql .= ' ORDER BY u.name';
        ok(q($sql, $params));
    }

    // ─── Room-unit management ────────────────────────────────────

    // GET /api/admin/properties/:id/room-units
    if ($method === 'GET' && $sub === 'properties' && is_numeric($sub2) && $sub3 === 'room-units' && !$sub4) {
        $pid = (int)$sub2;
        $ACTIVE = "'payment_confirmed','student_confirmed','active','checked_in'";
        $units = q("SELECT ru.id, ru.unit_number, ru.floor, ru.status, ru.is_active,
                           ru.capacity AS unit_capacity, ru.created_at,
                           r.id AS room_type_id, r.room_type, r.monthly_price,
                           r.capacity AS room_capacity,
                           COALESCE(ru.capacity, r.capacity) AS effective_capacity,
                           COUNT(b.id) AS occupied_count,
                           GREATEST(0, COALESCE(ru.capacity, r.capacity) - COUNT(b.id)) AS available_slots
                    FROM room_units ru
                    JOIN rooms r ON r.id = ru.room_type_id
                    LEFT JOIN bookings b ON b.room_unit_id = ru.id
                        AND b.status IN ($ACTIVE)
                    WHERE ru.property_id=? AND ru.is_active=1
                    GROUP BY ru.id, r.id
                    ORDER BY ru.floor, CAST(REGEXP_REPLACE(ru.unit_number,'[^0-9]','') AS UNSIGNED), ru.unit_number",
                   [$pid]);
        // Attach tenant list per unit (staff can see names)
        $unitIds = array_column($units, 'id');
        if ($unitIds) {
            $ph = implode(',', array_fill(0, count($unitIds), '?'));
            $tenants = q("SELECT b.id AS booking_id, b.room_unit_id, b.status AS booking_status,
                                 b.contract_start, b.contract_end, b.amount_paid,
                                 s.id AS student_id, s.name AS tenant_name,
                                 s.phone AS tenant_phone, s.username
                          FROM bookings b JOIN users s ON s.id=b.student_id
                          WHERE b.room_unit_id IN ($ph) AND b.status IN ($ACTIVE)
                          ORDER BY b.contract_start", $unitIds);
            $byUnit = [];
            foreach ($tenants as $t) $byUnit[$t['room_unit_id']][] = $t;
            foreach ($units as &$u2) $u2['tenants'] = $byUnit[$u2['id']] ?? [];
            unset($u2);
        } else {
            foreach ($units as &$u2) $u2['tenants'] = [];
            unset($u2);
        }
        ok($units);
    }

    // POST /api/admin/properties/:id/room-units — create single unit
    if ($method === 'POST' && $sub === 'properties' && is_numeric($sub2) && $sub3 === 'room-units' && !$sub4) {
        $pid = (int)$sub2;
        if (empty($b['unit_number']) || empty($b['room_type_id'])) err(400, 'unit_number and room_type_id required.');
        $exists = q1('SELECT id FROM room_units WHERE property_id=? AND unit_number=?', [$pid, $b['unit_number']]);
        if ($exists) err(409, 'Unit number already exists for this property.');
        $uid2 = qx('INSERT INTO room_units (property_id,room_type_id,unit_number,floor,status) VALUES (?,?,?,?,?)',
            [$pid, (int)$b['room_type_id'], trim($b['unit_number']),
             (int)($b['floor']??1), $b['status']??'available']);
        ok(['id'=>$uid2,'unit_number'=>trim($b['unit_number'])]);
    }

    // POST /api/admin/properties/:id/room-units/named — add named units from list
    if ($method === 'POST' && $sub === 'properties' && is_numeric($sub2) && $sub3 === 'room-units' && $sub4 === 'named') {
        $pid = (int)$sub2;
        if (empty($b['room_type_id']) || empty($b['units']) || !is_array($b['units']))
            err(400, 'room_type_id and units[] array required.');
        $rtid = (int)$b['room_type_id'];
        $floor = max(1, (int)($b['floor'] ?? 1));
        $created = 0; $skipped = 0;
        foreach ($b['units'] as $un) {
            $un = trim((string)$un);
            if ($un === '') continue;
            $exists = q1('SELECT id FROM room_units WHERE property_id=? AND unit_number=?', [$pid, $un]);
            if ($exists) { $skipped++; continue; }
            qx('INSERT INTO room_units (property_id,room_type_id,unit_number,floor) VALUES (?,?,?,?)', [$pid,$rtid,$un,$floor]);
            $created++;
        }
        ok(['created'=>$created,'skipped'=>$skipped]);
    }

    // POST /api/admin/properties/:id/room-units/bulk — bulk generate units
    if ($method === 'POST' && $sub === 'properties' && is_numeric($sub2) && $sub3 === 'room-units' && $sub4 === 'bulk') {
        $pid = (int)$sub2;
        if (empty($b['room_type_id']) || empty($b['floors']) || empty($b['units_per_floor'])) {
            err(400, 'room_type_id, floors, units_per_floor required.');
        }
        $rtid      = (int)$b['room_type_id'];
        $floors    = max(1, min(20, (int)$b['floors']));
        $upf       = max(1, min(50, (int)$b['units_per_floor']));
        $prefix    = strtoupper(trim($b['prefix'] ?? ''));
        $startNum  = max(1, (int)($b['start_number'] ?? 1));
        $created = 0; $skipped = 0;
        for ($fl = 1; $fl <= $floors; $fl++) {
            for ($n = $startNum; $n < $startNum + $upf; $n++) {
                $unitNum = $prefix
                    ? $prefix . str_pad($fl, 1, '0', STR_PAD_LEFT) . str_pad($n, 2, '0', STR_PAD_LEFT)
                    : $fl . str_pad($n, 2, '0', STR_PAD_LEFT);
                $exists = q1('SELECT id FROM room_units WHERE property_id=? AND unit_number=?', [$pid, $unitNum]);
                if ($exists) { $skipped++; continue; }
                qx('INSERT INTO room_units (property_id,room_type_id,unit_number,floor) VALUES (?,?,?,?)',
                   [$pid, $rtid, $unitNum, $fl]);
                $created++;
            }
        }
        ok(['created'=>$created,'skipped'=>$skipped]);
    }

    // PUT /api/admin/room-units/:id — update status/capacity/floor toggle
    if ($method === 'PUT' && $sub === 'room-units' && is_numeric($sub2) && !$sub3) {
        $ruid = (int)$sub2;
        $fields = []; $params = [];
        foreach (['status','is_active','floor','room_type_id','capacity'] as $f) {
            if (array_key_exists($f, $b)) {
                $fields[] = "$f=?";
                $params[] = ($f === 'capacity' && ($b[$f] === '' || $b[$f] === null)) ? null : $b[$f];
            }
        }
        if (!$fields) err(400, 'Nothing to update.');
        $params[] = $ruid;
        qn('UPDATE room_units SET '.implode(',',$fields).' WHERE id=?', $params);
        ok(['updated'=>true]);
    }

    // DELETE /api/admin/room-units/:id — soft-delete (deactivate)
    if ($method === 'DELETE' && $sub === 'room-units' && is_numeric($sub2)) {
        $ruid = (int)$sub2;
        $occupied = q1("SELECT id FROM bookings WHERE room_unit_id=?
                        AND status IN ('payment_confirmed','student_confirmed','active','checked_in')", [$ruid]);
        if ($occupied) err(409, 'Cannot remove a unit with an active tenant.');
        qn('UPDATE room_units SET is_active=0 WHERE id=?', [$ruid]);
        ok(['deleted'=>true]);
    }

    // GET /api/admin/properties/:id/occupancy — floor/grid data (detailed, with tenants)
    if ($method === 'GET' && $sub === 'properties' && is_numeric($sub2) && $sub3 === 'occupancy') {
        $pid = (int)$sub2;
        $prop = q1('SELECT id,name,area FROM properties WHERE id=?', [$pid]);
        if (!$prop) err(404, 'Property not found.');
        $ACTIVE = "'payment_confirmed','student_confirmed','active','checked_in'";
        $units = q("SELECT ru.id, ru.unit_number, ru.floor, ru.status, ru.room_type_id,
                           ru.capacity AS unit_capacity,
                           r.room_type, r.monthly_price, r.capacity AS room_capacity,
                           COALESCE(ru.capacity, r.capacity) AS effective_capacity,
                           COUNT(b.id) AS occupied_count,
                           GREATEST(0, COALESCE(ru.capacity, r.capacity) - COUNT(b.id)) AS available_slots
                    FROM room_units ru
                    JOIN rooms r ON r.id = ru.room_type_id
                    LEFT JOIN bookings b ON b.room_unit_id = ru.id AND b.status IN ($ACTIVE)
                    WHERE ru.property_id=? AND ru.is_active=1
                    GROUP BY ru.id, r.id
                    ORDER BY ru.floor, CAST(REGEXP_REPLACE(ru.unit_number,'[^0-9]','') AS UNSIGNED), ru.unit_number",
                   [$pid]);
        // Attach tenants
        $unitIds = array_column($units, 'id');
        if ($unitIds) {
            $ph = implode(',', array_fill(0, count($unitIds), '?'));
            $tenants = q("SELECT b.id AS booking_id, b.room_unit_id, b.status AS booking_status,
                                 b.contract_start, b.contract_end, b.amount_paid,
                                 s.id AS student_id, s.name AS tenant_name,
                                 s.phone AS tenant_phone, s.username
                          FROM bookings b JOIN users s ON s.id=b.student_id
                          WHERE b.room_unit_id IN ($ph) AND b.status IN ($ACTIVE)
                          ORDER BY b.contract_start", $unitIds);
            $byUnit = [];
            foreach ($tenants as $t) $byUnit[$t['room_unit_id']][] = $t;
            foreach ($units as &$u2) $u2['tenants'] = $byUnit[$u2['id']] ?? [];
            unset($u2);
        } else {
            foreach ($units as &$u2) $u2['tenants'] = [];
            unset($u2);
        }
        $floors = [];
        foreach ($units as $u2) {
            $fl = (int)$u2['floor'];
            if (!isset($floors[$fl])) $floors[$fl] = ['floor'=>$fl,'units'=>[]];
            $floors[$fl]['units'][] = $u2;
        }
        $totalBeds  = array_sum(array_column($units, 'effective_capacity'));
        $occupiedBeds = array_sum(array_column($units, 'occupied_count'));
        $maintCnt   = count(array_filter($units, fn($u2) => $u2['status']==='maintenance'));
        ok([
            'property' => $prop,
            'floors'   => array_values($floors),
            'summary'  => [
                'total_beds'    => $totalBeds,
                'occupied_beds' => $occupiedBeds,
                'available_beds'=> max(0, $totalBeds - $occupiedBeds),
                'total_units'   => count($units),
                'full_units'    => count(array_filter($units, fn($u2) => (int)$u2['available_slots']===0 && $u2['status']!=='maintenance')),
                'partial_units' => count(array_filter($units, fn($u2) => (int)$u2['occupied_count']>0 && (int)$u2['available_slots']>0)),
                'empty_units'   => count(array_filter($units, fn($u2) => (int)$u2['occupied_count']===0 && $u2['status']==='available')),
                'maintenance'   => $maintCnt,
            ],
        ]);
    }

    // GET /api/admin/properties/:id/analytics — by-room-type breakdown
    if ($method === 'GET' && $sub === 'properties' && is_numeric($sub2) && $sub3 === 'analytics') {
        $pid = (int)$sub2;
        $ACTIVE = "'payment_confirmed','student_confirmed','active','checked_in'";
        $byType = q("SELECT r.id AS room_type_id, r.room_type, r.monthly_price,
                            r.capacity AS default_capacity,
                            COUNT(DISTINCT ru.id) AS unit_count,
                            SUM(COALESCE(ru.capacity, r.capacity)) AS total_beds,
                            SUM(sub.occ) AS occupied_beds,
                            SUM(GREATEST(0, COALESCE(ru.capacity, r.capacity) - sub.occ)) AS available_beds,
                            SUM(CASE WHEN sub.occ >= COALESCE(ru.capacity, r.capacity) THEN 1 ELSE 0 END) AS full_units,
                            SUM(CASE WHEN sub.occ > 0 AND sub.occ < COALESCE(ru.capacity, r.capacity) THEN 1 ELSE 0 END) AS partial_units,
                            SUM(CASE WHEN sub.occ = 0 THEN 1 ELSE 0 END) AS empty_units
                     FROM rooms r
                     JOIN room_units ru ON ru.room_type_id = r.id AND ru.property_id=? AND ru.is_active=1
                     LEFT JOIN (
                         SELECT room_unit_id, COUNT(*) AS occ
                         FROM bookings WHERE status IN ($ACTIVE) AND room_unit_id IS NOT NULL
                         GROUP BY room_unit_id
                     ) sub ON sub.room_unit_id = ru.id
                     WHERE r.property_id=?
                     GROUP BY r.id
                     ORDER BY r.monthly_price", [$pid, $pid]);
        $totals = ['total_beds'=>0,'occupied_beds'=>0,'available_beds'=>0,'total_units'=>0];
        foreach ($byType as $row) {
            $totals['total_beds']    += (int)$row['total_beds'];
            $totals['occupied_beds'] += (int)$row['occupied_beds'];
            $totals['available_beds']+= (int)$row['available_beds'];
            $totals['total_units']   += (int)$row['unit_count'];
        }
        ok(['totals'=>$totals,'by_room_type'=>$byType]);
    }

    // GET /api/admin/properties/:id/unassigned-bookings
    if ($method === 'GET' && $sub === 'properties' && is_numeric($sub2) && $sub3 === 'unassigned-bookings') {
        $pid = (int)$sub2;
        ok(q("SELECT b.id, b.move_in_date, b.contract_start, b.contract_end, b.amount_paid,
                     s.name AS student_name, s.phone AS student_phone,
                     r.room_type, r.room_type_id,
                     r.monthly_price
              FROM bookings b
              JOIN users s ON s.id = b.student_id
              JOIN rooms r ON r.id = b.room_id
              WHERE b.property_id=? AND b.status='confirmed' AND b.room_unit_id IS NULL
              ORDER BY b.created_at ASC", [$pid]));
    }

    // POST /api/admin/bookings/:id/assign-unit
    if ($method === 'POST' && $sub === 'bookings' && is_numeric($sub2) && $sub3 === 'assign-unit') {
        $bid = (int)$sub2;
        if (empty($b['room_unit_id'])) err(400, 'room_unit_id required.');
        $ruid = (int)$b['room_unit_id'];

        $booking = q1("SELECT b.id, b.status, b.room_id, b.property_id
                       FROM bookings b WHERE b.id=?", [$bid]);
        if (!$booking) err(404, 'Booking not found.');
        if ($booking['status'] !== 'confirmed') err(400, 'Can only assign a unit to a confirmed booking.');

        $unit = q1("SELECT ru.id, ru.room_type_id, ru.status, ru.capacity AS unit_capacity,
                           r.room_type, r.capacity AS room_capacity
                    FROM room_units ru JOIN rooms r ON r.id=ru.room_type_id WHERE ru.id=?", [$ruid]);
        if (!$unit) err(404, 'Room unit not found.');
        if ($unit['status'] === 'maintenance') err(409, 'Unit is under maintenance.');

        // Check that the unit's room type matches the booked room type
        $bookedRoom = q1('SELECT id FROM rooms WHERE id=? AND property_id=?', [$booking['room_id'], $booking['property_id']]);
        if (!$bookedRoom) err(400, 'Room type mismatch between booking and unit.');
        if ((int)$unit['room_type_id'] !== (int)$booking['room_id']) {
            err(409, 'Unit room type does not match the booked room type.');
        }

        // Check capacity — for shared rooms allow multiple bookings up to capacity
        $effectiveCap = (int)($unit['unit_capacity'] ?? $unit['room_capacity'] ?? 1);
        $occupied = q1("SELECT COUNT(*) AS cnt FROM bookings
                        WHERE room_unit_id=? AND id!=?
                          AND status IN ('payment_confirmed','student_confirmed','active','checked_in')",
                       [$ruid, $bid]);
        if ((int)$occupied['cnt'] >= $effectiveCap) err(409, 'Unit is full — no beds available.');

        qn('UPDATE bookings SET room_unit_id=?,assigned_at=NOW(),assigned_by=? WHERE id=?',
           [$ruid, (int)$u['id'], $bid]);
        ok(['assigned'=>true]);
    }

    // DELETE /api/admin/bookings/:id/assign-unit — unassign
    if ($method === 'DELETE' && $sub === 'bookings' && is_numeric($sub2) && $sub3 === 'assign-unit') {
        $bid = (int)$sub2;
        qn('UPDATE bookings SET room_unit_id=NULL,assigned_at=NULL,assigned_by=NULL WHERE id=?', [$bid]);
        ok(['unassigned'=>true]);
    }

    // ── POST /api/admin/bookings/:id/tenant-photo ─────────────────
    // GM (or any staff) uploads a photo of the student; stored and shown on QR scan
    if ($method === 'POST' && $sub === 'bookings' && is_numeric($sub2) && $sub3 === 'tenant-photo') {
        requireStaff();
        $bid = (int)$sub2;
        $dir  = '/home/getostudentco/public_html/uploads/tenant-photos/';
        $base = 'https://getostudent.co.tz/uploads/tenant-photos/';
        if (!is_dir($dir)) @mkdir($dir, 0755, true);

        if (!empty($_FILES['photo']['tmp_name'])) {
            // multipart file upload (camera capture or file picker)
            $file = $_FILES['photo'];
            if ($file['error'] !== UPLOAD_ERR_OK) err(400, 'Upload failed.');
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION) ?: 'jpg');
            if (!in_array($ext, ['jpg','jpeg','png','webp'])) err(400, 'Photo must be jpg/png/webp.');
            if ($file['size'] > 5*1024*1024) err(400, 'Photo must be under 5 MB.');
            $fname = 'tenant_' . $bid . '_' . time() . '.' . $ext;
            move_uploaded_file($file['tmp_name'], $dir . $fname);
        } else {
            // JSON body with base64 data URI (mobile camera via browser)
            $bd = body();
            $data = $bd['photo_data'] ?? '';
            if (!$data || !preg_match('/^data:image\/(jpeg|png|webp);base64,/i', $data, $m))
                err(400, 'photo_data (data URI) or multipart photo required.');
            $raw = base64_decode(preg_replace('/^data:image\/[^;]+;base64,/i', '', $data));
            if (!$raw || strlen($raw) > 5*1024*1024) err(400, 'Image too large or invalid.');
            $ext   = strtolower($m[1]) === 'jpeg' ? 'jpg' : strtolower($m[1]);
            $fname = 'tenant_' . $bid . '_' . time() . '.' . $ext;
            file_put_contents($dir . $fname, $raw);
        }
        $url = $base . $fname;
        qn("UPDATE bookings SET tenant_photo_url=? WHERE id=?", [$url, $bid]);
        ok(['url' => $url]);
    }

    // ── GET /api/admin/payments — list payment transactions ───────
    if ($method === 'GET' && $sub === 'payments' && !$sub2) {
        $psql = "SELECT pt.*,p.name AS property_name,r.room_type,
                        s.name AS student_name,s.phone AS student_phone,
                        o.name AS owner_name
                 FROM payment_transactions pt
                 JOIN properties p ON p.id=pt.property_id
                 JOIN rooms r ON r.id=pt.room_id
                 JOIN users s ON s.id=pt.student_id
                 JOIN users o ON o.id=pt.owner_id
                 WHERE $zoneClause";
        $pp = $zoneParams;
        if (!empty($_GET['status'])) { $psql .= ' AND pt.snippe_status=?'; $pp[]=$_GET['status']; }
        $psql .= ' ORDER BY pt.created_at DESC LIMIT 100';
        ok(q($psql,$pp));
    }

    // ── GET /api/admin/payments/:ref ─────────────────────────────
    if ($method === 'GET' && $sub === 'payments' && $sub2) {
        $txn = q1("SELECT pt.*,p.name AS property_name,r.room_type,
                          s.name AS student_name,s.phone AS student_phone
                   FROM payment_transactions pt
                   JOIN properties p ON p.id=pt.property_id
                   JOIN rooms r ON r.id=pt.room_id
                   JOIN users s ON s.id=pt.student_id
                   WHERE pt.snippe_ref=?",[$sub2]);
        if (!$txn) err(404,'Payment not found.');
        ok($txn);
    }

    // ─────────────────────────────────────────────────────────────
    err(404, 'Admin route not found.');
}

// ─── /api/sms/* — SMS callback + tenant reminders ─────────────
function routeSms(array $parts, string $method): void {
    $sub = $parts[1] ?? '';

    // POST /api/sms/callback — delivery report from Next SMS
    if ($method === 'POST' && $sub === 'callback') {
        $b = body();
        $token = $_GET['token'] ?? ($b['token'] ?? '');
        if (!hash_equals(SMS_CALLBACK_TOKEN, (string)$token)) { http_response_code(403); exit; }
        $msgId  = $b['messageId'] ?? null;
        $status = $b['status']['name'] ?? ($b['status'] ?? 'UNKNOWN');
        if ($msgId) qn("UPDATE sms_logs SET status=? WHERE message_id=?", [$status, $msgId]);
        ok(['received'=>true]);
    }

    // POST /api/sms/tenant-reminders — admin triggers monthly rent reminder to all active tenants
    if ($method === 'POST' && $sub === 'tenant-reminders') {
        requireAdmin();
        $tenants = q("SELECT u.phone, u.name, p.name AS property_name, r.monthly_price
                      FROM bookings b
                      JOIN users u       ON u.id=b.student_id
                      JOIN properties p  ON p.id=b.property_id
                      JOIN rooms r       ON r.id=b.room_id
                      WHERE b.status IN ('confirmed','payment_confirmed','student_confirmed','active','checked_in','move_in_completed')
                      ORDER BY u.id");
        $sent = 0;
        foreach ($tenants as $t) {
            $msg = "GETO STUDENT: Kumbusho - kodi ya {$t['property_name']} ni TZS ".number_format($t['monthly_price'])." kwa mwezi. Tafadhali lipa kwa wakati. Maswali: wasiliana na msimamizi wako.";
            if (sendSMS($t['phone'], $msg, 'reminder-'.date('Ym').'-'.$sent)) $sent++;
            if ($sent >= 100) break;
        }
        ok(['sent'=>$sent,'total'=>count($tenants)]);
    }

    // POST /api/sms/daily-summary — send activity summary (max 3/day, only if activity)
    // Run by a cPanel cron job: POST https://getostudent.co.tz/api/sms/daily-summary?token=<CRON_TOKEN>
    if ($method === 'POST' && $sub === 'daily-summary') {
        $cronToken = defined('CRON_TOKEN') ? CRON_TOKEN : SMS_CALLBACK_TOKEN;
        if ((string)$cronToken === '' || !hash_equals((string)$cronToken, (string)($_GET['token'] ?? ''))) err(403, 'Forbidden.');
        // Check daily cap (max 3 summary SMS per day across both numbers)
        $sentToday = q1("SELECT COUNT(*) AS cnt FROM sms_logs WHERE DATE(sent_at)=CURDATE() AND reference LIKE 'daily-summary-%'");
        if ((int)($sentToday['cnt'] ?? 0) >= 6) ok(['skipped'=>true,'reason'=>'Daily limit reached (3 summaries × 2 numbers).']);

        // Gather activity
        $bookingsToday = q1("SELECT COUNT(*) AS cnt FROM bookings WHERE DATE(created_at)=CURDATE()");
        $pendingApproval = q1("SELECT COUNT(*) AS cnt FROM properties WHERE status='pending'");
        $pendingMgr = q1("SELECT COUNT(*) AS cnt FROM properties WHERE status='pending' AND created_by_role='zone_manager'");

        $bCount = (int)($bookingsToday['cnt'] ?? 0);
        $pCount = (int)($pendingApproval['cnt'] ?? 0);
        $mCount = (int)($pendingMgr['cnt'] ?? 0);

        // Only send if there's actual activity
        if ($bCount === 0 && $pCount === 0 && $mCount === 0) {
            ok(['skipped'=>true,'reason'=>'No activity to report.']);
        }

        // Build message
        $parts2 = [];
        if ($bCount > 0) $parts2[] = "Booking {$bCount} leo";
        if ($pCount > 0) $parts2[] = "Idhini zinasubiri: {$pCount}";
        if ($mCount > 0) $parts2[] = "Kutoka wasimamizi: {$mCount}";
        $msg = "GETO muhtasari: " . implode(', ', $parts2) . ". Ingia portal kukagua: getostudent.co.tz/admin";

        $numbers = ['0627404843', '0657925368'];
        $ref = 'daily-summary-'.date('Ymd-His');
        $sent = 0;
        foreach ($numbers as $num) {
            if (sendSMS($num, $msg, $ref.'-'.$num)) $sent++;
        }
        ok(['sent'=>$sent,'message'=>$msg,'bookings'=>$bCount,'pending'=>$pCount,'from_managers'=>$mCount]);
    }

    err(404, 'SMS route not found.');
}

// ─── /checkin/:token  — public QR scan page ────────────────────
function routeCheckin(array $parts, string $method): void {
    $token = trim($parts[1] ?? '');
    if (!$token) err(404, 'Not found.');
    if (!preg_match('/^[0-9a-f]{64}$/', $token)) err(400, 'Invalid check-in code format.');

    // PUT /api/checkin/:token/confirm-movein — staff scans QR and marks tenant as checked in
    if ($method === 'PUT' && ($parts[2] ?? '') === 'confirm-movein') {
        $u  = requireStaff();
        $bk = q1("SELECT id,status FROM bookings WHERE qr_token=?", [$token]);
        if (!$bk) err(404, 'Booking not found.');
        if (!in_array($bk['status'], ['active','confirmed','student_confirmed']))
            err(400, 'QR code is not yet active. Student must confirm their tenancy first.');
        qn("UPDATE bookings SET status='checked_in' WHERE id=?", [$bk['id']]);
        ok(['confirmed'=>true,'booking_id'=>$bk['id']]);
    }

    if ($method !== 'GET') err(405, 'Method not allowed.');
    $b = q1("SELECT b.id, b.status, b.amount_paid, b.contract_start, b.contract_end,
                    b.move_in_date, b.created_at, b.payment_receipt_ref, b.payment_note,
                    b.tenant_photo_url,
                    s.name AS student_name, s.username AS student_username,
                    p.name AS property_name, p.area,
                    r.room_type, r.monthly_price, r.capacity, r.deposit_months,
                    ru.unit_number, ru.floor AS unit_floor
             FROM bookings b
             JOIN users s ON s.id=b.student_id
             JOIN properties p ON p.id=b.property_id
             JOIN rooms r ON r.id=b.room_id
             LEFT JOIN room_units ru ON ru.id=b.room_unit_id
             WHERE b.qr_token=?", [$token]);
    if (!$b) err(404, 'Invalid or expired check-in code.');
    $now    = date('Y-m-d');
    $active = in_array($b['status'], ['active','confirmed','student_confirmed','checked_in','move_in_completed'])
           && (!$b['contract_end'] || $b['contract_end'] >= $now);
    ok(array_merge($b, ['active' => $active]));
}

// ═══════════════════════════════════════════════════════════════
//  ROUTER
// ═══════════════════════════════════════════════════════════════
// Support both REQUEST_URI-based routing and PATH_INFO-based routing (api/.htaccess)
$rawUri = $_SERVER['PATH_INFO'] ?? strtok($_SERVER['REQUEST_URI'], '?');
$uri    = preg_replace('#^/api(?:/index\.php)?#', '', $rawUri);
$parts  = array_values(array_filter(explode('/', $uri)));
$method = $_SERVER['REQUEST_METHOD'];

// Public GET for room/property types (used by students and public pages)
if ($method === 'GET' && ($parts[0] ?? '') === 'admin' && in_array($parts[1] ?? '', ['room-types','property-types']) && !($parts[2] ?? '')) {
    $tbl = ($parts[1] === 'room-types') ? 'room_types' : 'property_types';
    ok(q("SELECT id,name,sort_order FROM $tbl ORDER BY sort_order,name"));
}

// ── POST /api/track — public page-view tracker (no auth) ────────
// Body: { page, landing?, ref?, utm? }. The front end sets landing=true on the first
// page of a visit and sends document.referrer as ref and ?utm_source= as utm.
if ($method === 'POST' && ($parts[0] ?? '') === 'track') {
    migrate(); // ensures page_views table exists
    $b    = body();
    $page = substr(trim((string)($b['page'] ?? '/')), 0, 255);
    $ip   = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
    $hash = hash('sha256', $ip . date('Y-m-d'));
    [$source, $refHost] = !empty($b['landing'])
        ? trafficSource((string)($b['ref'] ?? ''), (string)($b['utm'] ?? ''))
        : [null, null];
    qn("INSERT INTO page_views (page, ip_hash, source, referrer_host) VALUES (?, ?, ?, ?)",
       [$page, $hash, $source, $refHost]);
    ok(['tracked' => true]);
}

migrate();

switch ($parts[0] ?? '') {
    case 'health':       routeHealth(); break;
    case 'site-stats':   routeSiteStats(); break;
    case 'auth':         routeAuth($parts, $method); break;
    case 'zones':        routeZones($parts, $method); break;
    case 'clusters':     routeClusters($parts, $method); break;
    case 'universities': routeUniversities($parts, $method); break;
    case 'amenities':    routeAmenities($parts, $method); break;
    case 'properties':   routeProperties($parts, $method); break;
    case 'portal':       routePortal($parts, $method); break;
    case 'student':      routeStudent($parts, $method); break;
    case 'checkin':      routeCheckin($parts, $method); break;
    case 'sms':          routeSms($parts, $method); break;
    case 'admin':        routeAdmin($parts, $method); break;
    case 'payments':     routePayments($parts, $method); break;
    case 'webhooks':     routeWebhooks($parts, $method); break;
    default:             err(404, 'API route not found.');
}
