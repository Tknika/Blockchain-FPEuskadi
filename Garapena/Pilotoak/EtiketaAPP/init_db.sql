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
    password VARCHAR(255) NOT NULL,
    encryption_key VARCHAR(255) NOT NULL
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
INSERT INTO users (username, password, encryption_key) VALUES ('empresa1', '$2b$12$8h/wvSBoEFXvUaJPEkiayueezdV1cd/Nd3FzOkbQ1H81gyHqEsVOe', 'kay5oTwqCCofOihoBXLjoZoD1U7j7_f2-o6xOZQu2rE='); --password1
INSERT INTO users (username, password, encryption_key) VALUES ('empresa2', '$2b$12$MOLgEdLLWQBTIF7.jOfFqu.Hmu1TPzaqI.xXkwNr.LMKVxchoo3XS', 'zFerEQur2JO3fMeTgYVp9GNXwe6ykbiyVhtsUJpOvEE='); --password2
INSERT INTO users (username, password, encryption_key) VALUES ('empresa3', '$2b$12$rX30NI3QcztdV8FCiLzb1eciTKIwonhwfpaDoJ61soG67ZdySPwBO', 'fXUgicZfryxKMvZ_IQ8BgrnnV_fXQwwy5kxmXpH-XFw='); --password3
INSERT INTO users (username, password, encryption_key) VALUES ('empresa4', '$2b$12$3QtFtc41cd..USGQE6MqL.5KwqWMMejNGI/7SXm2/QHhccrD8Dl.O', 'A_MJgziDr5szz2glnraQolwL7QMibdY_ImylqwWWTHc='); --password4
INSERT INTO users (username, password, encryption_key) VALUES ('empresa5', '$2b$12$naQPv3AFLmTri0FXMfvBUOreeiyXzjmGaWvYakgQwhcmL.lk/a5Ea', 'OppKMVYBr4rOk1JUC99apMgeapPELjxyfajCrncCOqg='); --password5
INSERT INTO users (username, password, encryption_key) VALUES ('empresa6', '$2b$12$5u/NA7Rx0BE8WTbxaaqKZ.1rWf502gCemssZDCniqaogxVU0Vs.KO', 'fTesFssWP_-6BSuwqBshJtL1siZytqYCcBixK2UsZMM='); --password6
INSERT INTO users (username, password, encryption_key) VALUES ('empresa7', '$2b$12$HJHKBfiN/iFOO1Unpk022.S7O1Y6k2UoYDp.1bh5YZhYtrmvGqhO6', '81_1CtKVTvPuwUa-cX86AebfGf75WJMSW_aKjs6o_SQ='); --password7
INSERT INTO users (username, password, encryption_key) VALUES ('empresa8', '$2b$12$YtzEJToPHDcf6eWTYAjSne5XvmV.RUTaODlfH4CTqlc3MyYVpWF4i', 'KZXaBDKDTcpWGSnK5zq9PP0uP2g9ZhkKSjyoRO-HI1A='); --password8
INSERT INTO users (username, password, encryption_key) VALUES ('empresa9', '$2b$12$IXmWFsDGJdlPFaO5HQvgmuvnhNPRVEqZOMnt4njnhlHsRGbo7pfnW', 'glaR9PQQRjIhc9ncnWfYeFcQxBltvwOjUzJYFPt_aAI='); --password9
INSERT INTO users (username, password, encryption_key) VALUES ('empresa10', '$2b$12$nMCCNJaZIHNsu/Wbj3AvquiQ6polzP6d8N9VyVAtXnW/LSZI9tIYG', '_8R-WP2u56rMmuHGRfNgUhvbhItPElr2c8wzIOXFzxY='); --password10
