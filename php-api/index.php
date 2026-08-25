<?php
require __DIR__ . '/_config.php';

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
    if (!$pdo) $pdo = new PDO(
        'mysql:host='.DB_HOST.';dbname='.DB_NAME.';charset=utf8mb4', DB_USER, DB_PASS,
        [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,
         PDO::MYSQL_ATTR_INIT_COMMAND=>"SET NAMES utf8mb4"]
    );
    return $pdo;
}
function q(string $sql, array $p = []): array  { $st = db()->prepare($sql); $st->execute($p); return $st->fetchAll(); }
function q1(string $sql, array $p = []): ?array { $r = q($sql, $p); return $r ? $r[0] : null; }
function qx(string $sql, array $p = []): int   { $st = db()->prepare($sql); $st->execute($p); return (int)db()->lastInsertId(); }
function qn(string $sql, array $p = []): int   { $st = db()->prepare($sql); $st->execute($p); return $st->rowCount(); }

// ─── Auth Helpers ──────────────────────────────────────────────
function authUser(): array {
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $token = str_starts_with($h, 'Bearer ') ? substr($h, 7) : '';
    $data = $token ? jwtVerify($token) : null;
    if (!$data) err(401, 'Unauthenticated.');
    return $data;
}

// Admin or Zone Manager — backend portal
function requireStaff(): array {
    $u = authUser();
    if (!in_array($u['role'] ?? '', ['admin', 'zone_manager'])) err(403, 'Backend staff only.');
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
    if (($u['status'] ?? '') !== 'active') err(403, 'Account pending verification. Please wait for admin approval.');
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

// ─── Referral code generator ───────────────────────────────────
function makeReferralCode(string $name): string {
    $base = strtoupper(preg_replace('/[^A-Z0-9]/', '', strtoupper($name)));
    $base = substr($base ?: 'USER', 0, 6);
    do { $code = 'GETO-'.$base.rand(100, 999); }
    while (q('SELECT id FROM users WHERE referral_code=?', [$code]));
    return $code;
}

// ═══════════════════════════════════════════════════════════════
//  ROUTE HANDLERS
// ═══════════════════════════════════════════════════════════════

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
        foreach (['name','email','phone','password'] as $f)
            if (empty($b[$f])) err(400, ucfirst($f).' is required.');
        if (empty($b['terms_accepted']) || !$b['terms_accepted'])
            err(400, 'You must accept the Terms & Conditions.');
        if (strlen($b['password']) < 8) err(400, 'Password must be at least 8 characters.');
        if (q1('SELECT id FROM users WHERE email=?', [$b['email']]))
            err(409, 'Email already registered.');

        // Owners and managers start as pending_verification; students are active immediately
        $status = ($role === 'student') ? 'active' : 'pending_verification';
        $refCode = makeReferralCode($b['name']);
        $id = qx(
            "INSERT INTO users (name,email,phone,whatsapp_phone,password_hash,role,status,university_id,
                                business_name,id_document_url,referral_code,terms_accepted,terms_accepted_at)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,1,NOW())",
            [$b['name'],$b['email'],$b['phone'],$b['whatsapp_phone']??$b['phone'],hashPwd($b['password']),
             $role,$status,$b['university_id']??null,$b['business_name']??null,null,$refCode]
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

        if ($status === 'pending_verification') {
            created(['message'=>'Registration submitted. Admin will verify your account within 24 hours.',
                     'pending'=>true,'role'=>$role]);
        }
        $token = jwtSign(['id'=>$id,'role'=>$role,'status'=>$status,'name'=>$b['name'],'email'=>$b['email']]);
        created(['token'=>$token,'user'=>['id'=>$id,'name'=>$b['name'],'email'=>$b['email'],
                 'phone'=>$b['phone'],'role'=>$role,'status'=>$status,'referral_code'=>$refCode]]);
    }

    // POST /api/auth/login  — student, property_owner, property_manager
    if ($method === 'POST' && $sub === 'login') {
        if (empty($b['email'])||empty($b['password'])) err(400, 'Email and password required.');
        $user = q1('SELECT u.*, un.name AS university_name FROM users u LEFT JOIN universities un ON u.university_id=un.id WHERE u.email=?', [$b['email']]);
        if (!$user) err(401, 'Invalid credentials.');
        if (!checkPwd($b['password'], $user['password_hash'])) err(401, 'Invalid credentials.');
        if (in_array($user['role'], ['admin','zone_manager'])) err(403, 'Use the staff login portal.');
        if ($user['status'] === 'suspended') err(403, 'Account suspended. Contact support.');
        if ($user['status'] === 'pending_verification')
            err(403, 'Account pending verification. Admin will approve within 24 hours.');
        qn('UPDATE users SET last_login_at=NOW() WHERE id=?', [$user['id']]);
        $token = jwtSign(['id'=>$user['id'],'role'=>$user['role'],'status'=>$user['status'],
                          'name'=>$user['name'],'email'=>$user['email']]);
        unset($user['password_hash']);
        ok(['token'=>$token,'user'=>$user]);
    }

    // POST /api/auth/staff/login  — admin, zone_manager (backend portal at /admin)
    if ($method === 'POST' && $sub === 'staff' && $sub2 === 'login') {
        if (empty($b['email'])||empty($b['password'])) err(400, 'Email and password required.');
        $user = q1('SELECT u.*, z.code AS zone_code, z.name AS zone_name FROM users u
                    LEFT JOIN zones z ON z.id=u.zone_id WHERE u.email=?', [$b['email']]);
        if (!$user) err(401, 'Invalid credentials.');
        if (!checkPwd($b['password'], $user['password_hash'])) err(401, 'Invalid credentials.');
        if (!in_array($user['role'], ['admin','zone_manager'])) err(403, 'Staff account required.');
        if ($user['status'] !== 'active') err(403, 'Account suspended.');
        qn('UPDATE users SET last_login_at=NOW() WHERE id=?', [$user['id']]);
        $token = jwtSign(['id'=>$user['id'],'role'=>$user['role'],'status'=>$user['status'],
                          'zone_id'=>$user['zone_id'],'name'=>$user['name'],'email'=>$user['email']]);
        unset($user['password_hash']);
        ok(['token'=>$token,'user'=>$user]);
    }

    // GET /api/auth/me
    if ($method === 'GET' && $sub === 'me') {
        $u = authUser();
        $user = q1("SELECT u.id,u.name,u.email,u.phone,u.whatsapp_phone,u.role,u.status,u.zone_id,
                           u.university_id,u.business_name,u.verified,u.referral_code,u.referred_by,
                           u.avatar_url,u.last_login_at,u.created_at,
                           un.name AS university_name, z.code AS zone_code, z.name AS zone_name
                    FROM users u
                    LEFT JOIN universities un ON un.id=u.university_id
                    LEFT JOIN zones z ON z.id=u.zone_id
                    WHERE u.id=?", [$u['id']]);
        ok(['user'=>$user]);
    }

    // PUT /api/auth/me  — update own profile
    if ($method === 'PUT' && $sub === 'me') {
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
    $id = isset($parts[1]) && is_numeric($parts[1]) ? (int)$parts[1] : null;
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
        $sql = "SELECT p.id,p.name,p.property_type,p.area,p.distance_km,p.transport_options,
                       p.verified,p.youtube_video_id,p.views_count,p.created_at,
                       p.nearest_university_id,u.name AS university_name,u.short_name AS university_short,
                       z.code AS zone_code,z.name AS zone_name,c.code AS cluster_code,c.name AS cluster_name,
                       (SELECT url FROM property_photos ph WHERE ph.property_id=p.id AND ph.is_main=1 LIMIT 1) AS main_photo,
                       MIN(r.monthly_price) AS price_from,
                       SUM(r.total_count - r.occupied_count) AS rooms_available
                FROM properties p
                JOIN universities u ON u.id=p.nearest_university_id
                LEFT JOIN zones z ON z.id=p.zone_id
                LEFT JOIN clusters c ON c.id=p.cluster_id
                LEFT JOIN rooms r ON r.property_id=p.id
                WHERE p.status='approved'";
        $params = [];
        if (!empty($_GET['university_id'])) {
            $sql .= ' AND p.nearest_university_id=?'; $params[] = (int)$_GET['university_id'];
        }
        if (!empty($_GET['zone_id'])) { $sql .= ' AND p.zone_id=?'; $params[] = (int)$_GET['zone_id']; }
        if (!empty($_GET['verified_only']) && $_GET['verified_only']==='true') $sql .= ' AND p.verified=1';
        if (!empty($_GET['area'])) { $sql .= ' AND p.area LIKE ?'; $params[] = '%'.$_GET['area'].'%'; }
        if (!empty($_GET['q'])) {
            $sql .= ' AND (p.name LIKE ? OR p.description LIKE ? OR p.area LIKE ?)';
            $params[] = '%'.$_GET['q'].'%'; $params[] = '%'.$_GET['q'].'%'; $params[] = '%'.$_GET['q'].'%';
        }
        if (!empty($_GET['price_max'])) {
            $sql .= ' AND p.id IN (SELECT property_id FROM rooms WHERE monthly_price<=?)';
            $params[] = (int)$_GET['price_max'];
        }
        if (!empty($_GET['room_type'])) {
            $sql .= ' AND p.id IN (SELECT property_id FROM rooms WHERE room_type=?)';
            $params[] = $_GET['room_type'];
        }
        $sql .= ' GROUP BY p.id ORDER BY p.verified DESC, p.created_at DESC';
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
        $rooms     = q('SELECT id,room_type,monthly_price,deposit,capacity,total_count,occupied_count,
                               (total_count-occupied_count) AS available_count,floor,furnished,bathroom_type,description
                        FROM rooms WHERE property_id=? ORDER BY monthly_price', [$id]);
        $verif     = q1('SELECT * FROM verification_records WHERE property_id=?', [$id]);
        qn('UPDATE properties SET views_count=views_count+1 WHERE id=?', [$id]);
        ok(array_merge($prop,['photos'=>$photos,'amenities'=>$amenities,'rooms'=>$rooms,'verification'=>$verif]));
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
                     (SELECT url FROM property_photos ph WHERE ph.property_id=p.id AND ph.is_main=1 LIMIT 1) AS main_photo,
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
        if ($u['role'] !== 'property_owner') err(403, 'Only property owners can register properties.');
        foreach (['name','property_type','nearest_university_id','area','address','description'] as $f)
            if (empty($b[$f])) err(400, "Field '$f' is required.");
        $pdo = db();
        $pdo->beginTransaction();
        try {
            $pid = qx(
                "INSERT INTO properties (owner_id,name,property_type,nearest_university_id,zone_id,cluster_id,
                                         area,address,distance_km,transport_options,description,
                                         youtube_video_id,total_floors,status)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'pending')",
                [$u['id'],$b['name'],$b['property_type'],$b['nearest_university_id'],
                 $b['zone_id']??null,$b['cluster_id']??null,$b['area'],$b['address'],
                 $b['distance_km']??null,$b['transport_options']??null,$b['description'],
                 $b['youtube_video_id']??null,$b['total_floors']??null]
            );
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
            created(['message'=>'Property submitted for admin review.','propertyId'=>$pid]);
        } catch (Exception $e) { $pdo->rollBack(); err(500, 'Failed to register property: '.$e->getMessage()); }
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
        $tenants   = q("SELECT t.*,r.room_type FROM tenants t JOIN rooms r ON r.id=t.room_id WHERE t.property_id=? AND t.status='active' ORDER BY t.name", [$pid]);
        $manager   = q1("SELECT u.id,u.name,u.email,u.phone FROM property_manager_assignments pma JOIN users u ON u.id=pma.manager_id WHERE pma.property_id=? AND pma.is_active=1", [$pid]);
        ok(array_merge($prop,['photos'=>$photos,'amenities'=>$amenities,'rooms'=>$rooms,'tenants'=>$tenants,'manager'=>$manager]));
    }

    // ── PUT /api/portal/properties/:id  — update property ────
    if ($method === 'PUT' && $sub === 'properties' && is_numeric($sub2)) {
        $pid = (int)$sub2;
        if (!canAccessProperty($u, $pid)) err(403, 'Access denied.');
        $allowed = ['name','description','area','address','distance_km','transport_options',
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

    // ── GET /api/portal/rooms/:property_id ───────────────────
    if ($method === 'GET' && $sub === 'rooms' && is_numeric($sub2)) {
        $pid = (int)$sub2;
        if (!canAccessProperty($u, $pid)) err(403, 'Access denied.');
        ok(q('SELECT *,(total_count-occupied_count) AS available_count FROM rooms WHERE property_id=? ORDER BY monthly_price', [$pid]));
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
        $allowed = ['room_type','monthly_price','deposit','capacity','total_count','occupied_count',
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

    // ── GET /api/portal/bookings ──────────────────────────────
    if ($method === 'GET' && $sub === 'bookings') {
        [$clause, $params] = [$scope['clause'], $scope['params']];
        ok(q("SELECT b.id,b.move_in_date,b.status,b.move_in_notes,b.admin_notes,b.created_at,
                     p.name AS property_name,p.area,r.room_type,r.monthly_price,
                     s.name AS student_name,s.phone AS student_phone,s.email AS student_email
              FROM bookings b
              JOIN properties p ON p.id=b.property_id
              JOIN rooms r ON r.id=b.room_id
              JOIN users s ON s.id=b.student_id
              WHERE $clause
              ORDER BY b.created_at DESC", $params));
    }

    // ── PUT /api/portal/bookings/:id/status ──────────────────
    if ($method === 'PUT' && $sub === 'bookings' && is_numeric($sub2) && $sub3 === 'status') {
        $bid = (int)$sub2;
        $booking = q1('SELECT owner_id,property_id FROM bookings WHERE id=?', [$bid]);
        if (!$booking || !canAccessProperty($u, (int)$booking['property_id'])) err(403, 'Access denied.');
        $valid = ['accepted','rejected','payment_pending','confirmed','move_in_completed','cancelled'];
        if (!in_array($b['status']??'', $valid)) err(400, 'Invalid status.');
        qn('UPDATE bookings SET status=?,admin_notes=? WHERE id=?', [$b['status'],$b['note']??null,$bid]);
        ok(['updated'=>true]);
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
                     p.id AS property_id,p.name AS property_name,p.area,p.verified,
                     r.room_type,r.monthly_price,
                     (SELECT url FROM property_photos ph WHERE ph.property_id=p.id AND ph.is_main=1 LIMIT 1) AS property_photo
              FROM bookings b
              JOIN properties p ON p.id=b.property_id
              JOIN rooms r ON r.id=b.room_id
              WHERE b.student_id=?
              ORDER BY b.created_at DESC", [$u['id']]));
    }

    // POST /api/student/bookings  — student books a room
    if ($method === 'POST' && $sub === 'bookings') {
        foreach (['property_id','room_id','move_in_date'] as $f)
            if (empty($b[$f])) err(400, "$f required.");
        $prop = q1("SELECT owner_id FROM properties WHERE id=? AND status='approved'", [(int)$b['property_id']]);
        if (!$prop) err(404, 'Property not found or not available.');
        $room = q1('SELECT id,total_count,occupied_count FROM rooms WHERE id=? AND property_id=?',
                   [(int)$b['room_id'],(int)$b['property_id']]);
        if (!$room) err(404, 'Room not found.');
        if ((int)$room['occupied_count'] >= (int)$room['total_count']) err(409, 'Hakuna nafasi iliyobaki katika chumba hiki.');
        $bid = qx("INSERT INTO bookings (student_id,property_id,room_id,owner_id,move_in_date,move_in_notes,status)
                   VALUES (?,?,?,?,?,?,'pending')",
                  [$u['id'],$b['property_id'],$b['room_id'],$prop['owner_id'],$b['move_in_date'],$b['notes']??null]);
        created(['message'=>'Ombi la uhifadhi limetumwa.','bookingId'=>$bid]);
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
                     (SELECT url FROM property_photos ph WHERE ph.property_id=p.id AND ph.is_main=1 LIMIT 1) AS main_photo,
                     MIN(r.monthly_price) AS price_from,sp.saved_at
              FROM saved_properties sp
              JOIN properties p ON p.id=sp.property_id
              JOIN universities u ON u.id=p.nearest_university_id
              LEFT JOIN rooms r ON r.property_id=p.id
              WHERE sp.student_id=? AND p.status='approved'
              GROUP BY p.id ORDER BY sp.saved_at DESC", [$u['id']]));
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

// ─── /api/admin/*  — Admin & Zone Manager backend portal ───────
function routeAdmin(array $parts, string $method): void {
    $sub  = $parts[1] ?? '';
    $sub2 = $parts[2] ?? '';
    $sub3 = $parts[3] ?? '';
    $b    = body();
    $u    = requireStaff();  // admin OR zone_manager

    $isAdmin      = $u['role'] === 'admin';
    $userZoneId   = $isAdmin ? null : (int)($u['zone_id'] ?? 0);

    // Helper: zone scope SQL fragment for properties
    $zoneClause = $isAdmin ? '1=1' : 'p.zone_id = ?';
    $zoneParams = $isAdmin ? [] : [$userZoneId];

    // ── GET /api/admin/stats — System analytics ───────────────
    if ($method === 'GET' && $sub === 'stats') {
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
            $ps = q1("SELECT COUNT(*) AS total,SUM(status='approved') AS approved,SUM(verified=1) AS verified
                      FROM properties WHERE zone_id=?", [$zid]);
            $rs = q1("SELECT SUM(r.total_count) AS total_rooms, SUM(r.occupied_count) AS occupied
                      FROM rooms r JOIN properties p ON p.id=r.property_id WHERE p.zone_id=?", [$zid]);
            $bs = q1("SELECT COUNT(*) AS total_bookings FROM bookings b
                      JOIN properties p ON p.id=b.property_id WHERE p.zone_id=?", [$zid]);
        }

        $global = $isAdmin ? q1("SELECT
            (SELECT COUNT(*) FROM users WHERE role='student') AS total_students,
            (SELECT COUNT(*) FROM users WHERE role='property_owner') AS total_owners,
            (SELECT COUNT(*) FROM users WHERE role='property_manager') AS total_managers,
            (SELECT COUNT(*) FROM users WHERE role='zone_manager') AS total_zone_managers,
            (SELECT COUNT(*) FROM properties) AS total_properties,
            (SELECT COUNT(*) FROM properties WHERE status='approved') AS approved_properties,
            (SELECT COUNT(*) FROM properties WHERE verified=1) AS verified_properties,
            (SELECT COUNT(*) FROM bookings) AS total_bookings,
            (SELECT COUNT(*) FROM bookings WHERE status='confirmed') AS confirmed_bookings,
            (SELECT SUM(total_count) FROM rooms) AS total_rooms,
            (SELECT SUM(occupied_count) FROM rooms) AS occupied_rooms") : null;

        ok(['global'=>$global,'zones'=>$byZone,'my_zone'=>!$isAdmin?array_merge($ps??[],$rs??[],$bs??[]):null]);
    }

    // ── GET /api/admin/properties ─────────────────────────────
    if ($method === 'GET' && $sub === 'properties') {
        $sql = "SELECT p.id,p.name,p.property_type,p.area,p.status,p.verified,p.views_count,p.created_at,
                       p.rejection_note,z.code AS zone_code,z.name AS zone_name,c.name AS cluster_name,
                       u.name AS university_name,ow.name AS owner_name,ow.phone AS owner_phone,
                       (SELECT url FROM property_photos ph WHERE ph.property_id=p.id AND ph.is_main=1 LIMIT 1) AS main_photo,
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
        $tenants   = q("SELECT t.*,r.room_type FROM tenants t JOIN rooms r ON r.id=t.room_id WHERE t.property_id=?", [$pid]);
        $verif     = q1('SELECT * FROM verification_records WHERE property_id=?', [$pid]);
        $manager   = q1("SELECT u.id,u.name,u.email,u.phone FROM property_manager_assignments pma JOIN users u ON u.id=pma.manager_id WHERE pma.property_id=? AND pma.is_active=1", [$pid]);
        ok(array_merge($prop,['photos'=>$photos,'amenities'=>$amenities,'rooms'=>$rooms,'tenants'=>$tenants,'verification'=>$verif,'manager'=>$manager]));
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
        $pid = (int)$sub2;
        qn("UPDATE properties SET verified=1,verified_by=?,verified_at=NOW(),verification_expiry=DATE_ADD(NOW(),INTERVAL 6 MONTH) WHERE id=?",
           [$u['id'],$pid]);
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

    // ── PUT /api/admin/properties/:id/zone — assign zone/cluster (admin only)
    if ($method === 'PUT' && $sub === 'properties' && is_numeric($sub2) && $sub3 === 'zone') {
        requireAdmin();
        qn('UPDATE properties SET zone_id=?,cluster_id=? WHERE id=?',
           [$b['zone_id']??null,$b['cluster_id']??null,(int)$sub2]);
        ok(['updated'=>true]);
    }

    // ── GET /api/admin/users — list users (scoped) ────────────
    if ($method === 'GET' && $sub === 'users') {
        $role = $_GET['role'] ?? null;
        $sql = "SELECT u.id,u.name,u.email,u.phone,u.role,u.status,u.verified,u.business_name,
                       u.zone_id,u.created_at,z.code AS zone_code,
                       (SELECT COUNT(*) FROM properties p WHERE p.owner_id=u.id) AS property_count
                FROM users u LEFT JOIN zones z ON z.id=u.zone_id WHERE 1=1";
        $params = [];
        if ($role) { $sql .= ' AND u.role=?'; $params[] = $role; }
        // Zone managers only see owners/managers whose properties are in their zone
        if (!$isAdmin) {
            $sql .= " AND (u.role NOT IN ('admin','zone_manager') AND u.id IN
                     (SELECT owner_id FROM properties WHERE zone_id=?))";
            $params[] = $userZoneId;
        }
        $sql .= ' ORDER BY u.created_at DESC';
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

    // ── POST /api/admin/users/zone-manager — create zone manager (admin only)
    if ($method === 'POST' && $sub === 'users' && $sub2 === 'zone-manager') {
        requireAdmin();
        foreach (['name','email','phone','password','zone_id'] as $f)
            if (empty($b[$f])) err(400, "$f required.");
        if (q1('SELECT id FROM users WHERE email=?', [$b['email']])) err(409, 'Email already registered.');
        $zone = q1('SELECT id,code FROM zones WHERE id=?', [(int)$b['zone_id']]);
        if (!$zone) err(404, 'Zone not found.');
        $rid = makeReferralCode($b['name']);
        $id = qx("INSERT INTO users (name,email,phone,password_hash,role,status,zone_id,referral_code,terms_accepted)
                  VALUES (?,?,?,?,?,?,?,?,?)",
                 [$b['name'],$b['email'],$b['phone'],hashPwd($b['password']),'zone_manager','active',
                  (int)$b['zone_id'],$rid,1]);
        created(['message'=>'Zone manager created.','userId'=>$id,'zone'=>$zone]);
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
    if ($method === 'GET' && $sub === 'bookings') {
        $sql = "SELECT b.id,b.move_in_date,b.status,b.created_at,
                       p.name AS property_name,p.area,z.code AS zone_code,
                       r.room_type,r.monthly_price,
                       s.name AS student_name,s.phone AS student_phone,
                       ow.name AS owner_name
                FROM bookings b
                JOIN properties p ON p.id=b.property_id
                LEFT JOIN zones z ON z.id=p.zone_id
                JOIN rooms r ON r.id=b.room_id
                JOIN users s ON s.id=b.student_id
                JOIN users ow ON ow.id=b.owner_id
                WHERE $zoneClause
                ORDER BY b.created_at DESC";
        ok(q($sql, $zoneParams));
    }

    // ── GET /api/admin/zones — zone list with stats (admin only)
    if ($method === 'GET' && $sub === 'zones') {
        requireAdmin();
        ok(q("SELECT z.*,
                     COUNT(DISTINCT p.id) AS total_properties,
                     SUM(p.status='approved') AS approved_properties,
                     SUM(p.verified=1) AS verified_properties,
                     COALESCE(SUM(r.total_count),0) AS total_rooms,
                     COALESCE(SUM(r.occupied_count),0) AS occupied_rooms,
                     (SELECT COUNT(*) FROM users u2 WHERE u2.role='zone_manager' AND u2.zone_id=z.id) AS managers
              FROM zones z
              LEFT JOIN properties p ON p.zone_id=z.id
              LEFT JOIN rooms r ON r.property_id=p.id
              WHERE z.active=1 GROUP BY z.id ORDER BY z.code"));
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

    err(404, 'Admin route not found.');
}

// ═══════════════════════════════════════════════════════════════
//  ROUTER
// ═══════════════════════════════════════════════════════════════
$uri    = strtok($_SERVER['REQUEST_URI'], '?');
$uri    = preg_replace('#^/api#', '', $uri);
$parts  = array_values(array_filter(explode('/', $uri)));
$method = $_SERVER['REQUEST_METHOD'];

switch ($parts[0] ?? '') {
    case 'health':       routeHealth(); break;
    case 'auth':         routeAuth($parts, $method); break;
    case 'zones':        routeZones($parts, $method); break;
    case 'clusters':     routeClusters($parts, $method); break;
    case 'universities': routeUniversities($parts, $method); break;
    case 'amenities':    routeAmenities($parts, $method); break;
    case 'properties':   routeProperties($parts, $method); break;
    case 'portal':       routePortal($parts, $method); break;
    case 'student':      routeStudent($parts, $method); break;
    case 'admin':        routeAdmin($parts, $method); break;
    default:             err(404, 'API route not found.');
}
