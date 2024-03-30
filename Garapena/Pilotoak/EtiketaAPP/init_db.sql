-- init_db.sql
-- SQL script to create the necessary tables for the Flask app
-- Check if the 'ziurtagiriak' database exists, if not, create it and then use it for the following operations
CREATE DATABASE IF NOT EXISTS etiketa;
USE etiketa;

CREATE USER IF NOT EXISTS 'etiketa'@'%' IDENTIFIED BY 'etiketa';

GRANT ALL PRIVILEGES ON etiketa.* TO 'etiketa'@'%';
FLUSH PRIVILEGES;
-- Drop the tables if they already exist
DROP TABLE IF EXISTS forms;
DROP TABLE IF EXISTS users;

-- Create the users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

-- Create the forms table
CREATE TABLE forms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    lote INT UNSIGNED NOT NULL UNIQUE,
    responsable VARCHAR(255),
    fecha_elaboracion DATE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Insert some initial data into the users table for testing
-- Note: Passwords should be hashed in a real application, this is just for demonstration
INSERT INTO users (username, password) VALUES ('empresa1', '$2b$12$8h/wvSBoEFXvUaJPEkiayueezdV1cd/Nd3FzOkbQ1H81gyHqEsVOe'); --password1
INSERT INTO users (username, password) VALUES ('empresa2', '$2b$12$MOLgEdLLWQBTIF7.jOfFqu.Hmu1TPzaqI.xXkwNr.LMKVxchoo3XS'); --password2
