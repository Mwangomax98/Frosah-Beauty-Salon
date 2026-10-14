-- Bluesparks Holdings booking system — MySQL 8 / MariaDB 10.6+ schema
-- Run: npm run db:setup (creates schema + seeds placeholder data)

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(120) NOT NULL DEFAULT 'Admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(64) PRIMARY KEY,
  `value` TEXT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS vehicles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  category VARCHAR(60) NOT NULL DEFAULT 'SUV',
  seats TINYINT UNSIGNED NOT NULL DEFAULT 5,
  bags TINYINT UNSIGNED NOT NULL DEFAULT 2,
  transmission ENUM('manual','automatic') NOT NULL DEFAULT 'automatic',
  drive ENUM('2WD','4WD') NOT NULL DEFAULT '2WD',
  fuel VARCHAR(30) NOT NULL DEFAULT 'Petrol',
  features JSON NOT NULL,
  images JSON NOT NULL,
  price_per_day_tzs INT UNSIGNED NOT NULL,
  price_per_week_tzs INT UNSIGNED NULL,
  price_per_month_tzs INT UNSIGNED NULL,
  mileage_policy VARCHAR(255) NOT NULL DEFAULT 'Unlimited within Dar es Salaam',
  deposit_tzs INT UNSIGNED NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS properties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  area VARCHAR(80) NOT NULL,
  address VARCHAR(255) NOT NULL DEFAULT '',
  lat DECIMAL(9,6) NULL,
  lng DECIMAL(9,6) NULL,
  bedrooms TINYINT UNSIGNED NOT NULL DEFAULT 1,
  beds TINYINT UNSIGNED NOT NULL DEFAULT 1,
  bathrooms TINYINT UNSIGNED NOT NULL DEFAULT 1,
  max_guests TINYINT UNSIGNED NOT NULL DEFAULT 2,
  amenities JSON NOT NULL,
  house_rules TEXT NOT NULL,
  description TEXT NOT NULL,
  images JSON NOT NULL,
  price_per_night_tzs INT UNSIGNED NOT NULL,
  price_per_week_tzs INT UNSIGNED NULL,
  price_per_month_tzs INT UNSIGNED NULL,
  cleaning_fee_tzs INT UNSIGNED NOT NULL DEFAULT 0,
  min_nights TINYINT UNSIGNED NOT NULL DEFAULT 1,
  payment_mode ENUM('full_online','deposit','on_arrival') NOT NULL DEFAULT 'deposit',
  deposit_percent TINYINT UNSIGNED NOT NULL DEFAULT 30,
  checkin_instructions TEXT NOT NULL,
  ical_import_urls JSON NOT NULL,
  ical_token CHAR(32) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS seasonal_rates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  target_type ENUM('car','stay') NOT NULL,
  target_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price_tzs INT UNSIGNED NOT NULL,
  INDEX idx_target (target_type, target_id, start_date, end_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS extras (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service ENUM('car','stay','both') NOT NULL,
  code VARCHAR(60) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  price_tzs INT UNSIGNED NOT NULL,
  pricing ENUM('per_day','per_booking') NOT NULL DEFAULT 'per_booking',
  sort_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS delivery_zones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  fee_tzs INT UNSIGNED NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS promo_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  type ENUM('percent','fixed') NOT NULL,
  value INT UNSIGNED NOT NULL,
  service ENUM('car','stay','both') NOT NULL DEFAULT 'both',
  valid_from DATE NULL,
  valid_to DATE NULL,
  max_uses INT UNSIGNED NULL,
  uses INT UNSIGNED NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS blocked_dates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  target_type ENUM('car','stay') NOT NULL,
  target_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(255) NOT NULL DEFAULT '',
  source ENUM('manual','ical') NOT NULL DEFAULT 'manual',
  external_uid VARCHAR(255) NULL,
  INDEX idx_target (target_type, target_id, start_date, end_date),
  UNIQUE KEY uq_external (target_type, target_id, external_uid)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(16) NOT NULL UNIQUE,
  service ENUM('car','stay') NOT NULL,
  status ENUM('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
  payment_status ENUM('unpaid','paid','deposit_paid','pay_on_arrival') NOT NULL DEFAULT 'unpaid',
  payment_method ENUM('online','on_arrival') NOT NULL,
  currency ENUM('TZS','USD') NOT NULL DEFAULT 'TZS',
  customer_name VARCHAR(160) NOT NULL,
  customer_email VARCHAR(190) NOT NULL,
  customer_phone VARCHAR(40) NOT NULL,
  customer_country VARCHAR(80) NOT NULL,
  special_requests TEXT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME NULL,
  end_time TIME NULL,
  vehicle_id INT NULL,
  property_id INT NULL,
  item_name VARCHAR(160) NOT NULL,
  details JSON NOT NULL,
  extras JSON NOT NULL,
  quote JSON NOT NULL,
  total_tzs INT UNSIGNED NOT NULL,
  promo_code VARCHAR(40) NULL,
  bundle_with_booking_id INT NULL,
  documents JSON NOT NULL,
  admin_notes TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_vehicle_dates (vehicle_id, start_date, end_date, status),
  INDEX idx_property_dates (property_id, start_date, end_date, status),
  INDEX idx_created (created_at),
  CONSTRAINT fk_booking_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
  CONSTRAINT fk_booking_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  gateway VARCHAR(40) NOT NULL,
  gateway_ref VARCHAR(190) NULL,
  tx_ref VARCHAR(64) NOT NULL UNIQUE,
  amount_tzs INT UNSIGNED NOT NULL,
  status ENUM('initiated','successful','failed','cancelled') NOT NULL DEFAULT 'initiated',
  raw JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_payment_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notification_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  channel ENUM('email_vendor','email_customer','whatsapp') NOT NULL,
  status ENUM('sent','failed','skipped') NOT NULL,
  detail TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB;
