INSERT INTO Status (slug, title) VALUES
('active', 'Activo'),
('inactive', 'Inactivo'),
('deprecated', 'Obsoleto'),
('revoked', 'Revocado')
ON CONFLICT (slug) DO NOTHING;