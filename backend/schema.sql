CREATE DATABASE IF NOT EXISTS goal_planner;
USE goal_planner;
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE goals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  current_cost DECIMAL(14,2) NOT NULL,
  deadline DATE NOT NULL,
  inflation_rate DECIMAL(5,2) NOT NULL,
  expected_return DECIMAL(5,2) NOT NULL,
  target_amount DECIMAL(14,2) NOT NULL,   -- inflated cost (computed)
  required_sip DECIMAL(14,2) NOT NULL,    -- monthly saving (computed)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE contributions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  goal_id INT NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  contributed_on DATE NOT NULL,
  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
);
CREATE TABLE loans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  principal DECIMAL(14,2) NOT NULL,
  annual_rate DECIMAL(5,2) NOT NULL,
  tenure_months INT NOT NULL,
  emi DECIMAL(14,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
