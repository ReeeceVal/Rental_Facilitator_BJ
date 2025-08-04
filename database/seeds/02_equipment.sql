-- Seed data for equipment inventory
INSERT INTO equipment (category_id, name, description, daily_rate, stock_quantity) VALUES
-- Speakers
(1, 'JBL EON615 15" Powered Speaker', 'Professional 1000W powered speaker with Bluetooth', 50.00, 4),
(1, 'QSC K12.2 12" Powered Speaker', 'Lightweight 2000W powered speaker', 60.00, 2),
(1, 'Mackie Thump15A 15" Speaker', 'High-output powered speaker', 40.00, 6),
(1, 'EV ZLX-12P 12" Powered Speaker', 'Compact powered loudspeaker', 45.00, 4),

-- Microphones
(2, 'Shure SM58 Dynamic Microphone', 'Industry standard vocal microphone', 15.00, 8),
(2, 'Shure Beta 58A Supercardioid Microphone', 'Premium vocal microphone with enhanced clarity', 20.00, 4),
(2, 'Sennheiser EW 112P G4 Wireless Lavalier', 'Professional wireless lavalier system', 35.00, 3),
(2, 'Shure SLXD24/SM58 Wireless Handheld', 'Digital wireless handheld microphone system', 40.00, 2),
(2, 'Audio-Technica AT2020 Condenser Mic', 'Studio-quality condenser microphone', 25.00, 2),

-- Mixing Equipment
(3, 'Yamaha MG12XU 12-Channel Mixer', '12-channel analog mixer with USB and effects', 30.00, 2),
(3, 'Behringer X32 Digital Mixer', '32-channel digital mixing console', 80.00, 1),
(3, 'Mackie ProFX16v3 16-Channel Mixer', '16-channel analog mixer with USB recording', 35.00, 1),
(3, 'Allen & Heath QU-16 Digital Mixer', 'Chrome Edition 16-channel digital mixer', 70.00, 1),

-- Amplifiers
(4, 'Crown XLS1502 Power Amplifier', '525W per channel power amplifier', 25.00, 2),
(4, 'QSC GX7 Power Amplifier', '725W per channel amplifier', 30.00, 2),

-- Lighting
(5, 'Chauvet DJ Par 64 LED', 'RGB LED par can with DMX', 20.00, 8),
(5, 'American DJ Mega Tripar Profile Plus', 'Tri-color LED wash light', 25.00, 6),
(5, 'Chauvet DJ Intimidator Spot 375Z IRC', 'Moving head spot light with zoom', 60.00, 2),
(5, 'ADJ Focus Spot Three Z', 'LED moving head with motorized zoom', 50.00, 2),

-- DJ Equipment
(6, 'Pioneer DDJ-SX3 DJ Controller', 'Professional 4-channel DJ controller', 70.00, 1),
(6, 'Technics SL-1200MK7 Turntable', 'Direct drive DJ turntable', 60.00, 2),
(6, 'Serato DJ Lite Software License', 'Professional DJ software license', 10.00, 5),

-- Cables & Accessories
(7, 'XLR Cable (25ft)', 'Professional XLR audio cable', 5.00, 20),
(7, 'Speaker Stand (Adjustable)', 'Heavy-duty adjustable speaker stand', 10.00, 8),
(7, 'Microphone Stand (Boom)', 'Professional boom microphone stand', 8.00, 10),
(7, 'Power Strip (8-outlet)', 'Professional power distribution', 8.00, 6),
(7, '1/4" TRS Cable (20ft)', 'Balanced audio cable', 6.00, 15),

-- Recording Equipment
(8, 'Zoom H6 Handy Recorder', '6-track portable digital recorder', 30.00, 1),
(8, 'Tascam DR-40X Portable Recorder', '4-track portable digital recorder', 25.00, 2),
(8, 'Audio Interface - Focusrite Scarlett 2i2', '2-input USB audio interface', 20.00, 2);