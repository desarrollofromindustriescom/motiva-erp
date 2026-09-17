INSERT INTO Users (fullname, username, password, profile)
VALUES
   ('admin', 'root', '$2a$12$9zFZlTcS662WTq7Puy.reu/2ar2icD8HDcVHnvhzuBiCA13Ktsg5O', 'superadmin')
ON CONFLICT(username) DO NOTHING;