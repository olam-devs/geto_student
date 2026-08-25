-- ============================================================
--  GETO STUDENT — Seed Data v2.0
-- ============================================================

-- ─── ZONES (DSM) ────────────────────────────────────────────
INSERT INTO zones (code, name, city, description) VALUES
('A', 'UDSM / Ardhi / Ubungo',         'Dar es Salaam', 'Ubungo–UDSM–Ardhi–Sinza corridor'),
('B', 'Kinondoni / Mwenge',             'Dar es Salaam', 'Kinondoni–Mwenge–Mikocheni corridor'),
('C', 'Upanga / City Centre',           'Dar es Salaam', 'Upanga–Kariakoo–Ilala–City Centre'),
('D', 'City / Kigamboni',               'Dar es Salaam', 'City Centre–Kigamboni corridor'),
('E', 'Tegeta / Boko / Mbezi',          'Dar es Salaam', 'Tegeta–Boko–Mbezi corridor'),
('F', 'Mbezi / Kimara / West',          'Dar es Salaam', 'Mbezi–Kimara–Kibamba corridor'),
('G', 'Temeke / Chang''ombe / Kurasini','Dar es Salaam', 'Separate operational zone — different movement patterns');

-- ─── ZONES (Mbeya) ──────────────────────────────────────────
INSERT INTO zones (code, name, city, description) VALUES
('MA', 'MUST / Iyunga',              'Mbeya', 'MUST campus area'),
('MB', 'CUOM / TEKU',               'Mbeya', 'CUOM and TEKU corridor'),
('MC', 'City / Business Colleges',  'Mbeya', 'Mzumbe, CBE, TIA area');

-- ─── CLUSTERS (DSM Zone A) ──────────────────────────────────
INSERT INTO clusters (zone_id, code, name) VALUES
(1,'A1','UDSM'),(1,'A2','Ardhi'),(1,'A3','Ubungo'),(1,'A4','Sinza'),(1,'A5','Kijitonyama');
-- Zone B
INSERT INTO clusters (zone_id, code, name) VALUES
(2,'B1','Kinondoni'),(2,'B2','Mwenge'),(2,'B3','Mikocheni'),(2,'B4','Kijitonyama B'),(2,'B5','Kairuki');
-- Zone C
INSERT INTO clusters (zone_id, code, name) VALUES
(3,'C1','MUHAS / Upanga'),(3,'C2','IFM / DIT'),(3,'C3','CBE'),(3,'C4','Kariakoo'),(3,'C5','City Centre');
-- Zone D
INSERT INTO clusters (zone_id, code, name) VALUES
(4,'D1','City Centre D'),(4,'D2','Kigamboni'),(4,'D3','Mjimwema');
-- Zone E
INSERT INTO clusters (zone_id, code, name) VALUES
(5,'E1','Tegeta'),(5,'E2','Wazo'),(5,'E3','Boko'),(5,'E4','Mbezi Beach'),(5,'E5','Mbezi');
-- Zone F
INSERT INTO clusters (zone_id, code, name) VALUES
(6,'F1','Mbezi'),(6,'F2','Kimara'),(6,'F3','Kibamba'),(6,'F4','Goba');
-- Zone G
INSERT INTO clusters (zone_id, code, name) VALUES
(7,'G1','Temeke'),(7,'G2','Chang''ombe'),(7,'G3','Kurasini'),(7,'G4','Bandari'),(7,'G5','Kigamboni G'),(7,'G6','Mbagala');
-- Mbeya clusters
INSERT INTO clusters (zone_id, code, name) VALUES
(8,'MA1','Iyunga'),(8,'MA2','MUST Area'),
(9,'MB1','CUOM Area'),(9,'MB2','TEKU Area'),
(10,'MC1','Mbeya City'),(10,'MC2','College Area');

-- ─── UNIVERSITIES (DSM — Zone A) ────────────────────────────
INSERT INTO universities (name, short_name, area, district, zone_id, cluster_id) VALUES
('University of Dar es Salaam',        'UDSM',    'Mlimani',      'Ubungo', 1, 1),
('Ardhi University',                   'ARU',     'Mlimani',      'Ubungo', 1, 2),
('Dar es Salaam University College',   'DARTU',   'Ubungo',       'Ubungo', 1, 3),
('National Bureau of Statistics',      'Takwimu', 'Ubungo',       'Ubungo', 1, 3),
('Water Institute',                    'WI',      'Ubungo',       'Ubungo', 1, 3),
('KAM College',                        'KAM',     'Sinza',        'Ubungo', 1, 4),

-- Zone B
('Institute of Social Work',           'ISW',     'Kinondoni',    'Kinondoni', 2, 6),
('Jordan Management School',           'JMS',     'Kinondoni',    'Kinondoni', 2, 6),
('College of ICT',                     'CoICT',   'Kijitonyama',  'Kinondoni', 2, 9),
('Kairuki University',                 'Kairuki', 'Mikocheni',    'Kinondoni', 2, 10),
('KLM College',                        'KLM',     'Mwenge',       'Kinondoni', 2, 7),
('National Institute of Transport',    'NIT',     'Ubungo',       'Kinondoni', 2, 7),

-- Zone C
('Muhimbili University of Health',     'MUHAS',   'Upanga',       'Ilala', 3, 11),
('College of Business Education',      'CBE',     'Ilala',        'Ilala', 3, 13),
('Institute of Finance Management',    'IFM',     'Shauri Moyo',  'Ilala', 3, 12),
('Dar es Salaam Institute of Tech',    'DIT',     'Kariakoo',     'Ilala', 3, 12),
('Dar es Salaam Maritime Institute',   'DMI',     'Kurasini',     'Ilala', 3, 14),
('Public Service College',             'PSC',     'Ubungo',       'Ilala', 3, 14),

-- Zone D
('Mwalimu Nyerere Memorial Academy',   'MNMA',    'Kigamboni',    'Kigamboni', 4, 17),
('United African University',          'UAUT',    'City Centre',  'Ilala',     4, 16),
('City College',                       'CityCol', 'City Centre',  'Ilala',     4, 16),

-- Zone E
('St. Joseph College of Health Sci.',  'SJCHS',   'Tegeta',       'Kinondoni', 5, 21),
('St. Maria College',                  'StMaria', 'Boko',         'Kinondoni', 5, 23),
('Excellent College',                  'Excel',   'Boko',         'Kinondoni', 5, 23),
('Mzumbe University Tegeta',           'MU-Teg',  'Tegeta',       'Kinondoni', 5, 21),
('Kairuki University Boko',            'KairBoko','Boko',         'Kinondoni', 5, 23),
('University of Medical Sciences',     'UMSA',    'Tegeta',       'Kinondoni', 5, 21),

-- Zone F
('St. Joseph University Mbezi',        'SJU',     'Mbezi',        'Ubungo', 6, 26),
('Paradigms Institute',                'Paradigms','Kimara',      'Ubungo', 6, 27),

-- Zone G
('Dar es Salaam Univ. Col. of Education','DUCE',  'Chang''ombe',  'Temeke', 7, 32),
('Tanzania Institute of Accountancy',  'TIA',     'Chang''ombe',  'Temeke', 7, 32),
('Bandari College',                    'Bandari', 'Kurasini',     'Temeke', 7, 33),
('National College of Tourism',        'Utalii',  'Msasani',      'Kinondoni', 7, 33),
('CFR College',                        'CFR',     'Temeke',       'Temeke', 7, 31);

-- ─── AMENITIES ──────────────────────────────────────────────
INSERT INTO amenities (name, icon) VALUES
('WiFi',           'wifi'),
('Maji 24/7',      'droplets'),
('Umeme',          'zap'),
('Walinzi',        'shield'),
('CCTV',           'camera'),
('Parking',        'car'),
('Laundry',        'shirt'),
('Jiko/Meko',      'utensils'),
('Chumba cha Kusomea','book-open'),
('Generator',      'battery-charging'),
('Fanicha',        'sofa'),
('Bustani',        'tree-pine'),
('Video Intercom', 'monitor'),
('Swimming Pool',  'waves'),
('Gym',            'dumbbell');

-- ─── ADMIN USER ─────────────────────────────────────────────
-- Password: Admin@Geto2026!  (must be re-hashed in production via PHP)
-- Run the _create_admin.php script after import to set the real bcrypt hash
INSERT INTO users (name, email, phone, password_hash, role, status, referral_code, terms_accepted)
VALUES ('Geto Admin', 'admin@getostudent.co.tz', '+255000000000',
        '$PLACEHOLDER$', 'admin', 'active', 'GETO-ADMIN01', 1);
