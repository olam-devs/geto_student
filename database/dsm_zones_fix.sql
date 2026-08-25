-- ============================================================
--  GETO STUDENT — DSM Zones Fix + PDF Institutions
--  Fixes wrong zone assignments and adds all PDF institutions
-- ============================================================

-- ─── 0. Fix cluster code column width (already done but safe) ─
ALTER TABLE clusters MODIFY COLUMN code VARCHAR(6) NOT NULL;

-- ─── 1. UPDATE existing DSM universities to correct zones ─────

-- Zone A: UDSM / Ardhi / Ubungo
UPDATE universities SET
  zone_id=(SELECT id FROM zones WHERE code='A'),
  cluster_id=(SELECT id FROM clusters WHERE code='A1')
WHERE short_name='UDSM' OR name LIKE '%University of Dar es Salaam%';

UPDATE universities SET
  zone_id=(SELECT id FROM zones WHERE code='A'),
  cluster_id=(SELECT id FROM clusters WHERE code='A2')
WHERE short_name IN ('AU','Ardhi') OR name LIKE '%Ardhi University%';

-- Zone B: Kinondoni / Mwenge
UPDATE universities SET
  zone_id=(SELECT id FROM zones WHERE code='B'),
  cluster_id=(SELECT id FROM clusters WHERE code='B5')
WHERE short_name='HKMU' OR name LIKE '%Hubert Kairuki%' OR name LIKE '%Kairuki Memorial%';

UPDATE universities SET
  zone_id=(SELECT id FROM zones WHERE code='B'),
  cluster_id=(SELECT id FROM clusters WHERE code='B3')
WHERE short_name IN ('AKU') OR name LIKE '%Aga Khan%';

UPDATE universities SET
  zone_id=(SELECT id FROM zones WHERE code='B'),
  cluster_id=(SELECT id FROM clusters WHERE code='B1')
WHERE short_name IN ('EASTC') OR name LIKE '%Eastern Africa Statistical%';

UPDATE universities SET
  zone_id=(SELECT id FROM zones WHERE code='B'),
  cluster_id=(SELECT id FROM clusters WHERE code='B1')
WHERE short_name IN ('TSJ') OR name LIKE '%Tanzania School of Journalism%';

UPDATE universities SET
  zone_id=(SELECT id FROM zones WHERE code='B'),
  cluster_id=(SELECT id FROM clusters WHERE code='B4')
WHERE short_name IN ('IMTU') OR name LIKE '%International Med%';

-- Zone C: Upanga / City Centre
UPDATE universities SET
  zone_id=(SELECT id FROM zones WHERE code='C'),
  cluster_id=(SELECT id FROM clusters WHERE code='C1')
WHERE short_name='MUHAS' OR name LIKE '%Muhimbili%';

UPDATE universities SET
  zone_id=(SELECT id FROM zones WHERE code='C'),
  cluster_id=(SELECT id FROM clusters WHERE code='C2')
WHERE short_name='IFM' OR name LIKE '%Institute of Finance%';

UPDATE universities SET
  zone_id=(SELECT id FROM zones WHERE code='C'),
  cluster_id=(SELECT id FROM clusters WHERE code='C2')
WHERE (short_name='DIT' OR name LIKE '%Dar es Salaam Institute of Technology%')
  AND (zone_id IS NULL OR zone_id IN (SELECT id FROM zones WHERE code NOT IN ('C')));

UPDATE universities SET
  zone_id=(SELECT id FROM zones WHERE code='C'),
  cluster_id=(SELECT id FROM clusters WHERE code='C3')
WHERE (short_name IN ('CBE','CBE-DSM') OR name='College of Business Education')
  AND (district LIKE '%Dar%' OR district LIKE '%Ilala%');

-- Zone F: Mbezi / Kimara / West
UPDATE universities SET
  zone_id=(SELECT id FROM zones WHERE code='F'),
  cluster_id=(SELECT id FROM clusters WHERE code='F1')
WHERE short_name IN ('SJUIT','SJUT') OR name LIKE '%St. Joseph University in Tanzania%';

-- Zone G: Temeke / Chang'ombe / Kurasini
UPDATE universities SET
  zone_id=(SELECT id FROM zones WHERE code='G'),
  cluster_id=(SELECT id FROM clusters WHERE code='G2')
WHERE short_name='DTC' OR name LIKE '%Dar es Salaam Technical College%';

UPDATE universities SET
  zone_id=(SELECT id FROM zones WHERE code='G'),
  cluster_id=(SELECT id FROM clusters WHERE code='G2')
WHERE short_name='TSM' OR name LIKE '%Tanzania School of Mines%';

-- ─── 2. INSERT missing DSM institutions from PDF ──────────────

-- Zone A
INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'DARTU — Dar es Salaam Regional Transport University','DARTU','Ubungo','Ubungo',
  (SELECT id FROM zones WHERE code='A'),(SELECT id FROM clusters WHERE code='A3')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='DARTU');

INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'Takwimu — National Bureau of Statistics Training','Takwimu','Ubungo','Ubungo',
  (SELECT id FROM zones WHERE code='A'),(SELECT id FROM clusters WHERE code='A3')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='Takwimu');

INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'Water Institute','WI','Ubungo','Ubungo',
  (SELECT id FROM zones WHERE code='A'),(SELECT id FROM clusters WHERE code='A1')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='WI' OR name='Water Institute');

INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'KAM College','KAM','Sinza','Kinondoni',
  (SELECT id FROM zones WHERE code='A'),(SELECT id FROM clusters WHERE code='A4')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='KAM');

-- Zone B
INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'Institute of Social Work','ISW','Kinondoni','Kinondoni',
  (SELECT id FROM zones WHERE code='B'),(SELECT id FROM clusters WHERE code='B1')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='ISW');

INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'JMS — Journalism and Mass Communication','JMS','Mwenge','Kinondoni',
  (SELECT id FROM zones WHERE code='B'),(SELECT id FROM clusters WHERE code='B2')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='JMS');

INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'COICT — College of ICT (UDSM)','COICT','Kinondoni','Kinondoni',
  (SELECT id FROM zones WHERE code='B'),(SELECT id FROM clusters WHERE code='B1')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='COICT');

INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'KLM College','KLM','Mwenge','Kinondoni',
  (SELECT id FROM zones WHERE code='B'),(SELECT id FROM clusters WHERE code='B2')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='KLM');

INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'NIT — National Institute of Transport','NIT','Mwenge','Kinondoni',
  (SELECT id FROM zones WHERE code='B'),(SELECT id FROM clusters WHERE code='B2')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='NIT');

-- Zone C
INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'College of Business Education — Dar es Salaam','CBE-DSM','Ilala','Ilala',
  (SELECT id FROM zones WHERE code='C'),(SELECT id FROM clusters WHERE code='C3')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='CBE-DSM');

INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'DMI — Dar es Salaam Maritime Institute','DMI','Kurasini','Temeke',
  (SELECT id FROM zones WHERE code='C'),(SELECT id FROM clusters WHERE code='C2')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='DMI');

INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'Tanzania Public Service College — Dar es Salaam','TPSC-DSM','City Centre','Ilala',
  (SELECT id FROM zones WHERE code='C'),(SELECT id FROM clusters WHERE code='C5')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='TPSC-DSM');

-- Zone D
INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'Mwalimu Nyerere Memorial Academy','MNMA','Kigamboni','Kigamboni',
  (SELECT id FROM zones WHERE code='D'),(SELECT id FROM clusters WHERE code='D1')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='MNMA');

INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'United African University of Tanzania','UAUT','Kigamboni','Kigamboni',
  (SELECT id FROM zones WHERE code='D'),(SELECT id FROM clusters WHERE code='D2')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='UAUT');

INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'City College Dar es Salaam','CityCol','City Centre','Ilala',
  (SELECT id FROM zones WHERE code='D'),(SELECT id FROM clusters WHERE code='D1')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='CityCol');

-- Zone E
INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'St. Joseph College of Health Sciences — Tegeta','SJCHS','Tegeta','Kinondoni',
  (SELECT id FROM zones WHERE code='E'),(SELECT id FROM clusters WHERE code='E1')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='SJCHS');

INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'St. Maria College','StMaria','Tegeta','Kinondoni',
  (SELECT id FROM zones WHERE code='E'),(SELECT id FROM clusters WHERE code='E1')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='StMaria');

INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'Excellent College','ExCol','Boko','Kinondoni',
  (SELECT id FROM zones WHERE code='E'),(SELECT id FROM clusters WHERE code='E3')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='ExCol');

INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'Mzumbe University — Tegeta Campus','Mzumbe-Teg','Tegeta','Kinondoni',
  (SELECT id FROM zones WHERE code='E'),(SELECT id FROM clusters WHERE code='E1')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='Mzumbe-Teg');

INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'Nyaishozi College','Nyaishozi','Wazo','Kinondoni',
  (SELECT id FROM zones WHERE code='E'),(SELECT id FROM clusters WHERE code='E2')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='Nyaishozi');

INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'Kairuki University — Boko Campus','Kairuki-Boko','Boko','Kinondoni',
  (SELECT id FROM zones WHERE code='E'),(SELECT id FROM clusters WHERE code='E3')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='Kairuki-Boko');

INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'University of Medical Sciences Tanzania','UMST','Mbezi Beach','Kinondoni',
  (SELECT id FROM zones WHERE code='E'),(SELECT id FROM clusters WHERE code='E4')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='UMST');

-- Zone F
INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'Paradigms Institute','Paradigms','Mbezi','Kinondoni',
  (SELECT id FROM zones WHERE code='F'),(SELECT id FROM clusters WHERE code='F1')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='Paradigms');

-- Zone G
INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'DUCE — Dar es Salaam University College of Education','DUCE','Changuombe','Temeke',
  (SELECT id FROM zones WHERE code='G'),(SELECT id FROM clusters WHERE code='G2')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='DUCE');

INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'TIA — Tanzania Institute of Accountancy (Dar)','TIA-DSM','Changuombe','Temeke',
  (SELECT id FROM zones WHERE code='G'),(SELECT id FROM clusters WHERE code='G2')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='TIA-DSM');

INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'Bandari College','Bandari','Bandari','Temeke',
  (SELECT id FROM zones WHERE code='G'),(SELECT id FROM clusters WHERE code='G4')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='Bandari');

INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'Utalii College — National College of Tourism','Utalii','Msasani','Kinondoni',
  (SELECT id FROM zones WHERE code='G'),(SELECT id FROM clusters WHERE code='G2')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='Utalii');

INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'CFR — Centre for Foreign Relations','CFR','Msasani','Kinondoni',
  (SELECT id FROM zones WHERE code='G'),(SELECT id FROM clusters WHERE code='G2')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='CFR');

-- ─── 3. MBEYA ZONES ──────────────────────────────────────────
INSERT IGNORE INTO zones (code, name, city, description) VALUES
('MA', 'MUST / Iyunga',          'Mbeya', 'Mbeya University of Science & Technology area'),
('MB', 'CUOM / TEKU',            'Mbeya', 'Catholic University of Mbeya, TEKU area'),
('MC', 'Mbeya City / Business',  'Mbeya', 'Mzumbe Mbeya, CBE Mbeya, TIA Mbeya');

INSERT IGNORE INTO clusters (zone_id, code, name)
SELECT z.id,'MA1','MUST Campus'   FROM zones z WHERE z.code='MA' UNION ALL
SELECT z.id,'MA2','Iyunga Area'   FROM zones z WHERE z.code='MA' UNION ALL
SELECT z.id,'MB1','CUOM Campus'   FROM zones z WHERE z.code='MB' UNION ALL
SELECT z.id,'MB2','TEKU Area'     FROM zones z WHERE z.code='MB' UNION ALL
SELECT z.id,'MC1','Mbeya City'    FROM zones z WHERE z.code='MC' UNION ALL
SELECT z.id,'MC2','Sisimba Area'  FROM zones z WHERE z.code='MC';

INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'Mbeya University of Science and Technology','MUST','Iyunga','Mbeya Urban',
  (SELECT id FROM zones WHERE code='MA'),(SELECT id FROM clusters WHERE code='MA1')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='MUST');

INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'Catholic University of Mbeya','CUOM','Mbeya','Mbeya Urban',
  (SELECT id FROM zones WHERE code='MB'),(SELECT id FROM clusters WHERE code='MB1')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='CUOM');

INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'TEKU — Teachers Education College Mbeya','TEKU','Mbeya','Mbeya Urban',
  (SELECT id FROM zones WHERE code='MB'),(SELECT id FROM clusters WHERE code='MB2')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='TEKU');

INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'Mzumbe University — Mbeya Campus','Mzumbe-Mbeya','Mbeya City','Mbeya Urban',
  (SELECT id FROM zones WHERE code='MC'),(SELECT id FROM clusters WHERE code='MC1')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='Mzumbe-Mbeya');

INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'College of Business Education — Mbeya','CBE-Mbeya','Mbeya City','Mbeya Urban',
  (SELECT id FROM zones WHERE code='MC'),(SELECT id FROM clusters WHERE code='MC1')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='CBE-Mbeya');

INSERT IGNORE INTO universities (name, short_name, area, district, zone_id, cluster_id)
SELECT 'TIA — Tanzania Institute of Accountancy (Mbeya)','TIA-Mbeya','Mbeya City','Mbeya Urban',
  (SELECT id FROM zones WHERE code='MC'),(SELECT id FROM clusters WHERE code='MC1')
WHERE NOT EXISTS (SELECT 1 FROM universities WHERE short_name='TIA-Mbeya');
