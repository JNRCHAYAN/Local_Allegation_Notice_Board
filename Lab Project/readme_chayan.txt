CREATE DATABASE IF NOT EXISTS project;
USE project;

CREATE TABLE companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  orgName VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  address VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  companyType ENUM('Public', 'Private') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
------------------------------
Install This for upload image : npm install multer

CREATE TABLE allegations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  companyId INT,
  userId INT,
  title VARCHAR(255),
  description TEXT,
  status ENUM('Pending','Resolved') DEFAULT 'Pending',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
