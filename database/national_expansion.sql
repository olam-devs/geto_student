-- ============================================================
--  GETO STUDENT — National Expansion
--  Extends zone code to VARCHAR(5), adds all TCU universities,
--  major NACTE colleges, and national zones across Tanzania.
--  Safe to run multiple times (INSERT IGNORE throughout).
-- ============================================================

-- ─── 0. EXPAND CODE COLUMN WIDTHS ────────────────────────────
ALTER TABLE zones    MODIFY COLUMN code VARCHAR(5)  NOT NULL;
ALTER TABLE clusters MODIFY COLUMN code VARCHAR(6)  NOT NULL;

-- ─── 1. NATIONAL ZONES ───────────────────────────────────────
INSERT IGNORE INTO zones (code, name, city, description) VALUES
-- Dodoma
('DA', 'UDOM / Dodoma Magharibi', 'Dodoma', 'UDOM, IRDP, Dodoma magharibi'),
('DB', 'Dodoma City / Makole',    'Dodoma', 'Dodoma city centre, SJUT, CBE'),
-- Morogoro
('MO', 'SUA / Mazinge',           'Morogoro', 'Sokoine University, Mzumbe, SUA corridor'),
-- Arusha
('AA', 'NM-AIST / ATC / Njiro',   'Arusha', 'NM-AIST, ATC, IAA, Njiro area'),
('AB', 'Arusha City / Kaloleni',  'Arusha', 'Arusha city centre, CBE, business colleges'),
-- Mwanza
('MW', 'SAUT / Isamilo',          'Mwanza', 'SAUT, CUHAS, Isamilo area'),
-- Kilimanjaro / Moshi
('KI', 'MoCU / KCMUCo / Moshi',   'Kilimanjaro', 'Moshi university corridor'),
-- Iringa
('IR', 'RUCU / MUCE / Iringa',    'Iringa', 'Ruaha, Mkwawa, University of Iringa'),
-- Zanzibar
('ZA', 'SUZA / Tunguu',           'Zanzibar', 'SUZA, KIST, Tunguu campus area'),
('ZB', 'Zanzibar City',           'Zanzibar', 'ZU, UTAS, Stone Town area'),
-- Tanga
('TG', 'SEKOMU / Tanga',          'Tanga', 'Sebastian Kolowa, Tanga Tech College'),
-- Mtwara / Lindi
('MT', 'Mtwara / Lindi',          'Mtwara', 'Mtwara Technical, Lindi colleges'),
-- Shinyanga / Kahama
('SH', 'Shinyanga',               'Shinyanga', 'Shinyanga Technical and nursing colleges'),
-- Tabora
('TR', 'Tabora',                  'Tabora', 'Tabora Technical, nursing colleges'),
-- Songea / Ruvuma
('SO', 'Songea / Ruvuma',         'Songea', 'Songea Teachers College, technical colleges'),
-- Kigoma
('KG', 'Kigoma',                  'Kigoma', 'Kigoma Technical College area');

-- ─── 2. CLUSTERS — Dodoma ────────────────────────────────────
INSERT IGNORE INTO clusters (zone_id, code, name)
SELECT z.id,'DA1','UDOM Campus'        FROM zones z WHERE z.code='DA' UNION ALL
SELECT z.id,'DA2','Nala / Iyumbu'      FROM zones z WHERE z.code='DA' UNION ALL
SELECT z.id,'DA3','IRDP Area'          FROM zones z WHERE z.code='DA' UNION ALL
SELECT z.id,'DB1','Dodoma City Centre' FROM zones z WHERE z.code='DB' UNION ALL
SELECT z.id,'DB2','Makole'             FROM zones z WHERE z.code='DB' UNION ALL
SELECT z.id,'DB3','Chang''ombe Dodoma' FROM zones z WHERE z.code='DB';

-- Clusters — Morogoro
INSERT IGNORE INTO clusters (zone_id, code, name)
SELECT z.id,'MO1','SUA Campus'         FROM zones z WHERE z.code='MO' UNION ALL
SELECT z.id,'MO2','Mazinge'            FROM zones z WHERE z.code='MO' UNION ALL
SELECT z.id,'MO3','Mzumbe Area'        FROM zones z WHERE z.code='MO' UNION ALL
SELECT z.id,'MO4','Morogoro Town'      FROM zones z WHERE z.code='MO';

-- Clusters — Arusha
INSERT IGNORE INTO clusters (zone_id, code, name)
SELECT z.id,'AA1','NM-AIST / Tengeru'  FROM zones z WHERE z.code='AA' UNION ALL
SELECT z.id,'AA2','ATC / Njiro'        FROM zones z WHERE z.code='AA' UNION ALL
SELECT z.id,'AA3','Sakina'             FROM zones z WHERE z.code='AA' UNION ALL
SELECT z.id,'AB1','Arusha CBD'         FROM zones z WHERE z.code='AB' UNION ALL
SELECT z.id,'AB2','Kaloleni / Themi'   FROM zones z WHERE z.code='AB';

-- Clusters — Mwanza
INSERT IGNORE INTO clusters (zone_id, code, name)
SELECT z.id,'MW1','Isamilo / SAUT'     FROM zones z WHERE z.code='MW' UNION ALL
SELECT z.id,'MW2','CUHAS Area'         FROM zones z WHERE z.code='MW' UNION ALL
SELECT z.id,'MW3','Mwanza City'        FROM zones z WHERE z.code='MW';

-- Clusters — Kilimanjaro
INSERT IGNORE INTO clusters (zone_id, code, name)
SELECT z.id,'KI1','Moshi Town'         FROM zones z WHERE z.code='KI' UNION ALL
SELECT z.id,'KI2','MoCU Campus'        FROM zones z WHERE z.code='KI' UNION ALL
SELECT z.id,'KI3','KCMUCo Area'        FROM zones z WHERE z.code='KI' UNION ALL
SELECT z.id,'KI4','Mweka'              FROM zones z WHERE z.code='KI';

-- Clusters — Iringa
INSERT IGNORE INTO clusters (zone_id, code, name)
SELECT z.id,'IR1','RUCU / Gangilonga'  FROM zones z WHERE z.code='IR' UNION ALL
SELECT z.id,'IR2','MUCE / Mkwawa'      FROM zones z WHERE z.code='IR' UNION ALL
SELECT z.id,'IR3','Iringa Town'        FROM zones z WHERE z.code='IR';

-- Clusters — Zanzibar
INSERT IGNORE INTO clusters (zone_id, code, name)
SELECT z.id,'ZA1','SUZA Tunguu'        FROM zones z WHERE z.code='ZA' UNION ALL
SELECT z.id,'ZA2','KIST Area'          FROM zones z WHERE z.code='ZA' UNION ALL
SELECT z.id,'ZB1','Stone Town'         FROM zones z WHERE z.code='ZB' UNION ALL
SELECT z.id,'ZB2','Zanzibar City'      FROM zones z WHERE z.code='ZB';

-- Clusters — other regions (simple)
INSERT IGNORE INTO clusters (zone_id, code, name)
SELECT z.id,'TG1','SEKOMU Area'        FROM zones z WHERE z.code='TG' UNION ALL
SELECT z.id,'TG2','Tanga City'         FROM zones z WHERE z.code='TG' UNION ALL
SELECT z.id,'MT1','Mtwara Town'        FROM zones z WHERE z.code='MT' UNION ALL
SELECT z.id,'SH1','Shinyanga Town'     FROM zones z WHERE z.code='SH' UNION ALL
SELECT z.id,'TR1','Tabora Town'        FROM zones z WHERE z.code='TR' UNION ALL
SELECT z.id,'SO1','Songea Town'        FROM zones z WHERE z.code='SO' UNION ALL
SELECT z.id,'KG1','Kigoma Town'        FROM zones z WHERE z.code='KG';

-- ─── 3. UNIVERSITIES — Dodoma ───────────────────────────────
INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id) VALUES
('University of Dodoma',                    'UDOM',   'Iyumbu',       'Dodoma Urban', (SELECT id FROM zones WHERE code='DA'), (SELECT id FROM clusters WHERE code='DA1')),
('Institute of Rural Development Planning', 'IRDP',   'Dodoma',       'Dodoma Urban', (SELECT id FROM zones WHERE code='DA'), (SELECT id FROM clusters WHERE code='DA3')),
('St. John''s University of Tanzania',      'SJUT',   'Dodoma',       'Dodoma Urban', (SELECT id FROM zones WHERE code='DB'), (SELECT id FROM clusters WHERE code='DB2')),
('College of Business Education Dodoma',    'CBE-DOD','Dodoma City',  'Dodoma Urban', (SELECT id FROM zones WHERE code='DB'), (SELECT id FROM clusters WHERE code='DB1')),
('Tanzania Public Service College Dodoma',  'TPSC-D', 'Dodoma',       'Dodoma Urban', (SELECT id FROM zones WHERE code='DB'), (SELECT id FROM clusters WHERE code='DB1'));

-- ─── 4. UNIVERSITIES — Morogoro ──────────────────────────────
INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id) VALUES
('Sokoine University of Agriculture',       'SUA',    'Mazinge',      'Morogoro Urban', (SELECT id FROM zones WHERE code='MO'), (SELECT id FROM clusters WHERE code='MO1')),
('Mzumbe University',                       'Mzumbe', 'Mzumbe',       'Mvomero',        (SELECT id FROM zones WHERE code='MO'), (SELECT id FROM clusters WHERE code='MO3')),
('Jordan University College',               'JUCo',   'Morogoro',     'Morogoro Urban', (SELECT id FROM zones WHERE code='MO'), (SELECT id FROM clusters WHERE code='MO4')),
('Muslim University of Morogoro',           'MUM',    'Morogoro',     'Morogoro Urban', (SELECT id FROM zones WHERE code='MO'), (SELECT id FROM clusters WHERE code='MO4')),
('CBE Morogoro Campus',                     'CBE-MRG','Morogoro',     'Morogoro Urban', (SELECT id FROM zones WHERE code='MO'), (SELECT id FROM clusters WHERE code='MO4'));

-- ─── 5. UNIVERSITIES — Arusha ────────────────────────────────
INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id) VALUES
('Nelson Mandela African Inst. of Sci & Tech','NM-AIST','Tengeru',    'Arumeru',        (SELECT id FROM zones WHERE code='AA'), (SELECT id FROM clusters WHERE code='AA1')),
('Arusha Technical College',                'ATC',    'Njiro',        'Arusha City',    (SELECT id FROM zones WHERE code='AA'), (SELECT id FROM clusters WHERE code='AA2')),
('Institute of Accountancy Arusha',         'IAA',    'Njiro',        'Arusha City',    (SELECT id FROM zones WHERE code='AA'), (SELECT id FROM clusters WHERE code='AA2')),
('Mount Meru University',                   'MMU',    'Arusha',       'Arusha City',    (SELECT id FROM zones WHERE code='AB'), (SELECT id FROM clusters WHERE code='AB2')),
('Tumaini University Makumira',             'TUMak',  'Usa River',    'Arumeru',        (SELECT id FROM zones WHERE code='AA'), (SELECT id FROM clusters WHERE code='AA1')),
('CBE Arusha Campus',                       'CBE-ARU','Arusha',       'Arusha City',    (SELECT id FROM zones WHERE code='AB'), (SELECT id FROM clusters WHERE code='AB1')),
('St. Joseph University Arusha',            'SJUA',   'Arusha',       'Arusha City',    (SELECT id FROM zones WHERE code='AB'), (SELECT id FROM clusters WHERE code='AB2'));

-- ─── 6. UNIVERSITIES — Mwanza ────────────────────────────────
INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id) VALUES
('St. Augustine University of Tanzania',    'SAUT',   'Isamilo',      'Nyamagana',      (SELECT id FROM zones WHERE code='MW'), (SELECT id FROM clusters WHERE code='MW1')),
('Catholic Univ. of Health & Allied Sci.', 'CUHAS',  'Isamilo',      'Nyamagana',      (SELECT id FROM zones WHERE code='MW'), (SELECT id FROM clusters WHERE code='MW2')),
('Tanzania Public Service College Mwanza',  'TPSC-W', 'Mwanza City',  'Ilemela',        (SELECT id FROM zones WHERE code='MW'), (SELECT id FROM clusters WHERE code='MW3')),
('St. Augustine Bugando Medical Centre',    'BMC',    'Bugando',      'Nyamagana',      (SELECT id FROM zones WHERE code='MW'), (SELECT id FROM clusters WHERE code='MW2'));

-- ─── 7. UNIVERSITIES — Kilimanjaro / Moshi ───────────────────
INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id) VALUES
('Moshi Co-operative University',           'MoCU',   'Moshi',        'Moshi Urban',    (SELECT id FROM zones WHERE code='KI'), (SELECT id FROM clusters WHERE code='KI2')),
('KCMUCo — Kilimanjaro Christian Medical',  'KCMUCo', 'Kilimanjaro',  'Moshi Rural',    (SELECT id FROM zones WHERE code='KI'), (SELECT id FROM clusters WHERE code='KI3')),
('College of African Wildlife Mgt (Mweka)', 'CAWM',   'Mweka',        'Hai',            (SELECT id FROM zones WHERE code='KI'), (SELECT id FROM clusters WHERE code='KI4')),
('Good Samaritan Foundation College',       'GSFCS',  'Moshi',        'Moshi Urban',    (SELECT id FROM zones WHERE code='KI'), (SELECT id FROM clusters WHERE code='KI1'));

-- ─── 8. UNIVERSITIES — Iringa ────────────────────────────────
INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id) VALUES
('Ruaha Catholic University',               'RUCU',   'Iringa',       'Iringa Urban',   (SELECT id FROM zones WHERE code='IR'), (SELECT id FROM clusters WHERE code='IR1')),
('Mkwawa Univ. College of Education',       'MUCE',   'Mkwawa',       'Iringa Rural',   (SELECT id FROM zones WHERE code='IR'), (SELECT id FROM clusters WHERE code='IR2')),
('University of Iringa',                    'UoI',    'Iringa',       'Iringa Urban',   (SELECT id FROM zones WHERE code='IR'), (SELECT id FROM clusters WHERE code='IR3'));

-- ─── 9. UNIVERSITIES — Zanzibar ──────────────────────────────
INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id) VALUES
('State University of Zanzibar',            'SUZA',   'Tunguu',       'Zanzibar',       (SELECT id FROM zones WHERE code='ZA'), (SELECT id FROM clusters WHERE code='ZA1')),
('Karume Inst. of Science & Technology',    'KIST',   'Karume',       'Zanzibar',       (SELECT id FROM zones WHERE code='ZA'), (SELECT id FROM clusters WHERE code='ZA2')),
('Zanzibar University',                     'ZU',     'Stone Town',   'Zanzibar',       (SELECT id FROM zones WHERE code='ZB'), (SELECT id FROM clusters WHERE code='ZB1')),
('Univ. of Technology & Applied Sciences',  'UTAS',   'Zanzibar City','Zanzibar',       (SELECT id FROM zones WHERE code='ZB'), (SELECT id FROM clusters WHERE code='ZB2'));

-- ─── 10. UNIVERSITIES — Tanga ────────────────────────────────
INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id) VALUES
('Sebastian Kolowo Memorial University',    'SEKOMU', 'Lushoto',      'Lushoto',        (SELECT id FROM zones WHERE code='TG'), (SELECT id FROM clusters WHERE code='TG1')),
('Tanga Technical College',                 'TTC',    'Tanga City',   'Tanga City',     (SELECT id FROM zones WHERE code='TG'), (SELECT id FROM clusters WHERE code='TG2'));

-- ─── 11. UNIVERSITIES — Mtwara / Other Regions ───────────────
INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id) VALUES
('Mtwara Technical College',                'MTC',    'Mtwara',       'Mtwara Urban',   (SELECT id FROM zones WHERE code='MT'), (SELECT id FROM clusters WHERE code='MT1')),
('Tabora Technical College',                'TabTC',  'Tabora',       'Tabora Urban',   (SELECT id FROM zones WHERE code='TR'), (SELECT id FROM clusters WHERE code='TR1')),
('Songea Teachers College',                 'STC',    'Songea',       'Songea Urban',   (SELECT id FROM zones WHERE code='SO'), (SELECT id FROM clusters WHERE code='SO1'));

-- ─── 12. DSM — Additional Colleges (NACTE) ───────────────────
INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id) VALUES
('Dar es Salaam Technical College',         'DTC',    'Chang''ombe',  'Temeke',         (SELECT id FROM zones WHERE code='G'),  (SELECT id FROM clusters WHERE code='G2')),
('Hubert Kairuki Memorial University',      'HKMU',   'Mikocheni',    'Kinondoni',      (SELECT id FROM zones WHERE code='B'),  (SELECT id FROM clusters WHERE code='B3')),
('St. Joseph Univ. in Tanzania',            'SJUIT',  'Mbezi',        'Kinondoni',      (SELECT id FROM zones WHERE code='F'),  (SELECT id FROM clusters WHERE code='F1')),
('Aga Khan University (Dar)',               'AKU',    'Masaki',       'Kinondoni',      (SELECT id FROM zones WHERE code='B'),  (SELECT id FROM clusters WHERE code='B3')),
('International Med & Tech University',     'IMTU',   'Regent Estate', 'Kinondoni',     (SELECT id FROM zones WHERE code='B'),  (SELECT id FROM clusters WHERE code='B4')),
('Eastern Africa Statistical Training Ctr', 'EASTC',  'Kinondoni',    'Kinondoni',      (SELECT id FROM zones WHERE code='B'),  (SELECT id FROM clusters WHERE code='B1')),
('Tanzania School of Journalism',           'TSJ',    'Kinondoni',    'Kinondoni',      (SELECT id FROM zones WHERE code='B'),  (SELECT id FROM clusters WHERE code='B1')),
('Tanzania School of Mines',                'TSM',    'Chang''ombe',  'Temeke',         (SELECT id FROM zones WHERE code='G'),  (SELECT id FROM clusters WHERE code='G2'));
