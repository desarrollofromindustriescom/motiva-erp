INSERT INTO
   users (fullname, username, password, passwordChanged, profile)
VALUES
   (
      'admin',
      'root',
      '$2a$12$9zFZlTcS662WTq7Puy.reu/2ar2icD8HDcVHnvhzuBiCA13Ktsg5O',
      TRUE,
      'superadmin'
   ) ON CONFLICT (username) DO NOTHING;
