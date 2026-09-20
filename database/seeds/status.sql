INSERT INTO
   Status (id, slug, title)
VALUES
   ('9e150222-2e27-464d-9356-f4e2515d5755', 'active', 'Activo'),
   ('db1ef621-4005-486b-a7a8-ad13d6ef00a9', 'inactive', 'Inactivo'),
   ('c402e793-15a3-44ee-b05b-631c61db9a2d', 'deprecated', 'Obsoleto'),
   ('a661edb2-85b9-4f47-8fe5-efc000757102', 'revoked', 'Revocado'),
   ('31a8b46b-f4ee-4552-9012-49cde51ae1e8', 'expired', 'Caducado'),
   ('71408795-67e0-46a0-821d-ccdc6e126d59', 'pending', 'Pendiente'),
   ('c99c8e09-5de0-4a5d-b2f7-546c453a552c', 'rejected', 'Rechazado'),
   ('052c0113-4293-4619-880a-f158aecdd476', 'aproved', 'Aprovado'),
   ('dab9d4a3-e641-443b-a6df-c0839ab190d9', 'unviewed', 'No vista'),
   ('f7aaffc4-22cc-406f-bb09-255b6f7ed067', 'viewed', 'Vista'),
   ('97469771-106a-4b3e-a2c6-ee0e0d8fa6d5', 'executed', 'Ejecutado') ON CONFLICT (slug) DO NOTHING;
