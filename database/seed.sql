-- ============================================================
--  GETO STUDENT — Seed Data
-- ============================================================
USE geto_student;

-- ─── UNIVERSITIES (Dar es Salaam) ───────────────────────────
INSERT INTO universities (name, short_name, area, district, gps_lat, gps_lng, image_url) VALUES
('University of Dar es Salaam',               'UDSM',  'Ubungo',    'Dar es Salaam', -6.7724, 39.2083, 'https://images.unsplash.com/photo-1562774053-bdb17173d68f?w=600&q=80&fm=webp'),
('Ardhi University',                           'ARU',   'Kinondoni', 'Dar es Salaam', -6.7700, 39.2050, 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600&q=80&fm=webp'),
('Muhimbili University of Health Sciences',    'MUHAS', 'Ilala',     'Dar es Salaam', -6.8018, 39.2144, 'https://images.unsplash.com/photo-1519452635265-7b1fbfd1e4e0?w=600&q=80&fm=webp'),
('Institute of Finance Management',            'IFM',   'Upanga',    'Dar es Salaam', -6.8088, 39.2863, 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&q=80&fm=webp'),
('Dar es Salaam Institute of Technology',      'DIT',   'Ilala',     'Dar es Salaam', -6.8132, 39.2864, 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=600&q=80&fm=webp'),
('Mzumbe University — Dar es Salaam Campus',   'MU-DSM','Kinondoni', 'Dar es Salaam', -6.7900, 39.2400, 'https://images.unsplash.com/photo-1562774053-bdb17173d68f?w=600&q=80&fm=webp'),
('Open University of Tanzania',                'OUT',   'Kinondoni', 'Dar es Salaam', -6.7600, 39.2350, 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600&q=80&fm=webp'),
('St. Augustine University — Dar Campus',      'SAUT',  'Ubungo',    'Dar es Salaam', -6.7800, 39.2150, 'https://images.unsplash.com/photo-1519452635265-7b1fbfd1e4e0?w=600&q=80&fm=webp');

-- ─── STANDARD AMENITIES ─────────────────────────────────────
INSERT INTO amenities (name, icon) VALUES
('Water',          '💧'),
('Electricity',    '⚡'),
('LUKU Prepaid',   '🔌'),
('Wi-Fi',          '📶'),
('Security Fence', '🔒'),
('CCTV',           '📷'),
('Guard 24/7',     '💂'),
('Shared Kitchen', '🍳'),
('Private Bathroom','🚿'),
('Shared Bathroom','🚿'),
('Parking',        '🚗'),
('Laundry',        '🧺'),
('Study Room',     '📚'),
('Common Room',    '🛋️'),
('Generator',      '🔋'),
('Solar Power',    '☀️'),
('Furnished',      '🪑'),
('Video Intercom', '📹');

-- ─── ADMIN USER ─────────────────────────────────────────────
-- Password: Admin@Geto2026
INSERT INTO users (name, email, phone, password_hash, role, status, referral_code) VALUES
('Geto Admin', 'admin@getostudent.tz', '+255755000001',
 '$2b$10$K3V8y2VtKGEMNWLEXlIr7.OQQ/0/HK0BLBqyqhZFqhWC3BDTsULcy', -- Admin@Geto2026
 'admin', 'active', 'GETO-ADMIN01');

-- Demo student user — Password: Student@123
INSERT INTO users (name, email, phone, password_hash, role, status, university_id, referral_code) VALUES
('Amina Juma', 'amina@student.com', '+255711234567',
 '$2b$10$9KzN3iGPWc3L.nHYKVPnIOFxkRiYtJXX3KNuGGSxlS2Cy4yrm7ciy', -- Student@123
 'student', 'active', 1, 'GETO-AMINA25'),
('Silas Mwangi', 'silas@student.com', '+255722345678',
 '$2b$10$9KzN3iGPWc3L.nHYKVPnIOFxkRiYtJXX3KNuGGSxlS2Cy4yrm7ciy', -- Student@123
 'student', 'active', 2, 'GETO-SILAS25');

-- ─── AGENTS ─────────────────────────────────────────────────
-- Password for all demo agents: Agent@123
INSERT INTO agents (name, email, phone, password_hash, business_name, license_number, status, approved_by, approved_at) VALUES
('Juma Mbwana',    'juma@getoagent.tz',   '+255712111111',
 '$2b$10$bJvPM5mVNjZD3K5iBuJWNeFVc7G6A4uQYC/JFm7FkZ2C7ZRQMK8qe', -- Agent@123
 'Juma Property Services',   'AG-DSM-2026-001', 'approved', 1, '2026-08-01'),
('Fatuma Hassan',  'fatuma@getoagent.tz', '+255787222222',
 '$2b$10$bJvPM5mVNjZD3K5iBuJWNeFVc7G6A4uQYC/JFm7FkZ2C7ZRQMK8qe', -- Agent@123
 'Hassan Properties',        'AG-DSM-2026-002', 'approved', 1, '2026-08-05'),
('Peter Mwamba',   'peter@getoagent.tz',  '+255765333333',
 '$2b$10$bJvPM5mVNjZD3K5iBuJWNeFVc7G6A4uQYC/JFm7FkZ2C7ZRQMK8qe', -- Agent@123
 'Mwamba Real Estate',       NULL,              'pending',  NULL, NULL);

-- ─── PROPERTIES ─────────────────────────────────────────────
INSERT INTO properties (agent_id, name, property_type, university_id, area, address, distance_km, description, status, verified, verification_date, verification_expiry, youtube_video_id) VALUES

-- GS-001 · Verified
(1, 'Ubungo Student Lodge', 'Hostel', 1, 'Ubungo',
 'Plot 45, Ubungo Maji, Near UDSM Gate, Dar es Salaam', 0.8,
 'A clean, secure student hostel 10 minutes walk from UDSM main gate. Features 24/7 security, reliable LUKU electricity, strong Wi-Fi, and a quiet study room.',
 'approved', 1, '2026-08-15', '2026-11-15', NULL),

-- GS-002 · Verified
(1, 'Mwangaza Student Residence', 'Student Residence', 1, 'Ubungo',
 'Morogoro Road, Plot 12, Ubungo, Dar es Salaam', 1.2,
 'Modern student residence with self-contained rooms, reliable water supply, and a spacious common area. All rooms furnished with study desks.',
 'approved', 1, '2026-08-10', '2026-11-10', NULL),

-- GS-003 · Verified
(2, 'Ardhi View Apartments', 'Apartment', 2, 'Kinondoni',
 'Off Bagamoyo Road, Plot 7, Kinondoni, Dar es Salaam', 0.5,
 'Premium student apartments directly across from Ardhi University. Self-contained units with private bathrooms, furnished, and secure parking.',
 'approved', 1, '2026-08-12', '2026-11-12', NULL),

-- GS-004 · Approved but not verified (yet)
(2, 'Neema Student House', 'House', 3, 'Ilala',
 'Msimbazi Street, Ilala, Near MUHAS, Dar es Salaam', 0.9,
 'Spacious house converted for student accommodation near MUHAS. Affordable rooms with shared kitchen and ample study space.',
 'approved', 0, NULL, NULL, NULL),

-- GS-005 · Verified
(1, 'MUHAS Comfort Hostel', 'Hostel', 3, 'Ilala',
 'Hospital Road, Plot 3, Ilala, Dar es Salaam', 0.6,
 'Purpose-built student hostel serving MUHAS students. Includes medical-grade water filtration, CCTV, and 24/7 guarded access.',
 'approved', 1, '2026-08-01', '2026-11-01', NULL),

-- GS-006 · Approved not verified
(2, 'IFM Study Bedsitters', 'Bedsitter', 4, 'Upanga',
 'Upanga Road, Plot 18, Near IFM, Dar es Salaam', 0.4,
 'Neat bedsitter units ideal for finance students at IFM. Each unit has its own entrance, electric cooker, and private bathroom.',
 'approved', 0, NULL, NULL, NULL),

-- GS-007 · Verified
(1, 'DIT Baraka Hostel', 'Hostel', 5, 'Ilala',
 'Chang\'ombe Road, Plot 22, Ilala, Dar es Salaam', 0.7,
 'Established hostel serving DIT students for over 5 years. Solar backup power, strong Wi-Fi, and reliable water storage tank.',
 'approved', 1, '2026-07-20', '2026-10-20', NULL),

-- GS-008 · Pending admin review (newly submitted)
(2, 'Karibu Student Lodge', 'Student Residence', 1, 'Ubungo',
 'Kawawa Road, Plot 9, Ubungo, Dar es Salaam', 1.5,
 'New student lodge close to UDSM with modern facilities including fibre internet, laundry service, and a rooftop study area.',
 'pending', 0, NULL, NULL, NULL);

-- ─── PROPERTY PHOTOS ─────────────────────────────────────────
-- Using Unsplash CDN with WebP format parameter

-- GS-001: Ubungo Student Lodge
INSERT INTO property_photos (property_id, url, caption, is_main, sort_order) VALUES
(1,'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=900&h=600&fit=crop&fm=webp&q=85','Exterior view',1,0),
(1,'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900&h=600&fit=crop&fm=webp&q=85','Single room',0,1),
(1,'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=900&h=600&fit=crop&fm=webp&q=85','Common area',0,2),
(1,'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=900&h=600&fit=crop&fm=webp&q=85','Kitchen',0,3);

-- GS-002: Mwangaza Student Residence
INSERT INTO property_photos (property_id, url, caption, is_main, sort_order) VALUES
(2,'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=900&h=600&fit=crop&fm=webp&q=85','Front of building',1,0),
(2,'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=900&h=600&fit=crop&fm=webp&q=85','Furnished room',0,1),
(2,'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&h=600&fit=crop&fm=webp&q=85','Study room',0,2);

-- GS-003: Ardhi View Apartments
INSERT INTO property_photos (property_id, url, caption, is_main, sort_order) VALUES
(3,'https://images.unsplash.com/photo-1460317442991-0ec209397118?w=900&h=600&fit=crop&fm=webp&q=85','Building exterior',1,0),
(3,'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=900&h=600&fit=crop&fm=webp&q=85','Apartment interior',0,1),
(3,'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=900&h=600&fit=crop&fm=webp&q=85','Master bedroom',0,2),
(3,'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=900&h=600&fit=crop&fm=webp&q=85','Private bathroom',0,3);

-- GS-004: Neema Student House
INSERT INTO property_photos (property_id, url, caption, is_main, sort_order) VALUES
(4,'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900&h=600&fit=crop&fm=webp&q=85','House front',1,0),
(4,'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900&h=600&fit=crop&fm=webp&q=85','Single room',0,1),
(4,'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=900&h=600&fit=crop&fm=webp&q=85','Shared kitchen',0,2);

-- GS-005: MUHAS Comfort Hostel
INSERT INTO property_photos (property_id, url, caption, is_main, sort_order) VALUES
(5,'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=900&h=600&fit=crop&fm=webp&q=85','Hostel exterior',1,0),
(5,'https://images.unsplash.com/photo-1534438327-fefee3fb7d6d?w=900&h=600&fit=crop&fm=webp&q=85','Room interior',0,1),
(5,'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=900&h=600&fit=crop&fm=webp&q=85','Common area',0,2);

-- GS-006: IFM Study Bedsitters
INSERT INTO property_photos (property_id, url, caption, is_main, sort_order) VALUES
(6,'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&h=600&fit=crop&fm=webp&q=85','Bedsitter exterior',1,0),
(6,'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=900&h=600&fit=crop&fm=webp&q=85','Bedsitter interior',0,1);

-- GS-007: DIT Baraka Hostel
INSERT INTO property_photos (property_id, url, caption, is_main, sort_order) VALUES
(7,'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=900&h=600&fit=crop&fm=webp&q=85','Hostel building',1,0),
(7,'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900&h=600&fit=crop&fm=webp&q=85','Single room',0,1),
(7,'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=900&h=600&fit=crop&fm=webp&q=85','Study room',0,2);

-- GS-008: Karibu Student Lodge (pending)
INSERT INTO property_photos (property_id, url, caption, is_main, sort_order) VALUES
(8,'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=900&h=600&fit=crop&fm=webp&q=85','Lodge exterior',1,0),
(8,'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=900&h=600&fit=crop&fm=webp&q=85','Room',0,1);

-- ─── ROOMS ──────────────────────────────────────────────────
INSERT INTO rooms (property_id, room_type, monthly_price, deposit, capacity, available_count, furnished, bathroom_type) VALUES
-- GS-001 Ubungo Student Lodge
(1,'Single', 250000,250000,1,3,0,'Shared'),
(1,'Shared', 150000,150000,2,4,0,'Shared'),
(1,'Master', 380000,380000,1,0,1,'Private'),

-- GS-002 Mwangaza Residence
(2,'Single', 280000,280000,1,2,1,'Shared'),
(2,'Bedsitter',320000,320000,1,3,1,'Private'),
(2,'Shared', 160000,160000,2,2,0,'Shared'),

-- GS-003 Ardhi View Apartments
(3,'Studio', 450000,450000,1,1,1,'Private'),
(3,'Master', 500000,500000,1,2,1,'Private'),
(3,'Single', 300000,300000,1,1,1,'Shared'),

-- GS-004 Neema House
(4,'Single', 200000,200000,1,4,0,'Shared'),
(4,'Shared', 130000,130000,2,3,0,'Shared'),

-- GS-005 MUHAS Comfort
(5,'Single', 230000,230000,1,2,0,'Shared'),
(5,'Shared', 140000,140000,2,5,0,'Shared'),
(5,'Master', 360000,360000,1,1,1,'Private'),

-- GS-006 IFM Bedsitters
(6,'Bedsitter',280000,280000,1,4,1,'Private'),
(6,'Studio',  350000,350000,1,2,1,'Private'),

-- GS-007 DIT Baraka Hostel
(7,'Single', 170000,170000,1,6,0,'Shared'),
(7,'Shared', 110000,110000,2,8,0,'Shared'),

-- GS-008 Karibu Lodge (pending - rooms exist but property not live)
(8,'Single', 290000,290000,1,5,1,'Shared'),
(8,'Master', 400000,400000,1,2,1,'Private');

-- ─── PROPERTY AMENITIES ──────────────────────────────────────
-- GS-001
INSERT INTO property_amenities (property_id, amenity_id) VALUES (1,1),(1,2),(1,4),(1,5),(1,6),(1,7),(1,8),(1,12);
-- GS-002
INSERT INTO property_amenities (property_id, amenity_id) VALUES (2,1),(2,2),(2,3),(2,4),(2,5),(2,7),(2,13),(2,17);
-- GS-003
INSERT INTO property_amenities (property_id, amenity_id) VALUES (3,1),(3,2),(3,3),(3,4),(3,5),(3,9),(3,11),(3,17);
-- GS-004
INSERT INTO property_amenities (property_id, amenity_id) VALUES (4,1),(4,2),(4,5),(4,8);
-- GS-005
INSERT INTO property_amenities (property_id, amenity_id) VALUES (5,1),(5,2),(5,3),(5,4),(5,6),(5,7),(5,9);
-- GS-006
INSERT INTO property_amenities (property_id, amenity_id) VALUES (6,1),(6,2),(6,3),(6,9),(6,17);
-- GS-007
INSERT INTO property_amenities (property_id, amenity_id) VALUES (7,1),(7,2),(7,4),(7,5),(7,13),(7,15);
-- GS-008
INSERT INTO property_amenities (property_id, amenity_id) VALUES (8,1),(8,2),(8,3),(8,4),(8,5),(8,12),(8,13);

-- ─── VERIFICATION RECORDS ────────────────────────────────────
INSERT INTO verification_records (property_id, verified_by, inspection_date, owner_identity, location_confirmed, rooms_confirmed, water_confirmed, electricity_confirmed, security_confirmed, price_confirmed, notes, expiry_date) VALUES
(1,1,'2026-08-15',1,1,1,1,1,1,1,'All checks passed. Property meets Geto Student standards.','2026-11-15'),
(2,1,'2026-08-10',1,1,1,1,1,1,1,'Excellent facilities for students.','2026-11-10'),
(3,1,'2026-08-12',1,1,1,1,1,1,1,'Premium property, well maintained.','2026-11-12'),
(5,1,'2026-08-01',1,1,1,1,1,1,1,'Good hostel with medical-grade facilities.','2026-11-01'),
(7,1,'2026-07-20',1,1,1,1,1,1,1,'Established hostel with solar backup.','2026-10-20');

-- ─── SAMPLE BOOKINGS ─────────────────────────────────────────
INSERT INTO bookings (student_id, property_id, room_id, move_in_date, status, agent_id) VALUES
(2, 1, 1, '2026-09-01', 'accepted',  1),
(2, 3, 7, '2026-09-15', 'pending',   2),
(3, 5, 12,'2026-09-01', 'confirmed', 1);

-- ─── SAMPLE VIEWING REQUESTS ─────────────────────────────────
INSERT INTO viewing_requests (student_id, property_id, preferred_date, preferred_time, notes, status, agent_id) VALUES
(2, 2, '2026-08-25', 'Morning',   'Available 9–12am on that day.', 'scheduled', 1),
(3, 3, '2026-08-26', 'Afternoon', NULL,                            'pending',   2);
