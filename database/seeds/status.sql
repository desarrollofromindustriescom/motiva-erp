INSERT INTO Status (slug, title) VALUES
('active', 'Activo'),
('inactive', 'Inactivo'),
('deprecated', 'Obsoleto')
ON CONFLICT (slug) DO NOTHING;