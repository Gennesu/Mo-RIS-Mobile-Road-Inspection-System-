-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Aug 02, 2026 at 06:47 PM
-- Server version: 12.3.2-MariaDB-log
-- PHP Version: 8.3.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `moris`
--

-- --------------------------------------------------------

--
-- Table structure for table `detections`
--

CREATE TABLE `detections` (
  `detection_id` int(11) NOT NULL,
  `track_id` int(11) DEFAULT NULL,
  `label` varchar(50) DEFAULT NULL,
  `confidence` float DEFAULT NULL,
  `length_cm` float DEFAULT NULL,
  `width_cm` float DEFAULT NULL,
  `area_cm2` decimal(14,2) GENERATED ALWAYS AS (`length_cm` * `width_cm`) STORED,
  `image` varchar(255) DEFAULT NULL,
  `latitude` double DEFAULT NULL,
  `longitude` double DEFAULT NULL,
  `road_id` int(11) DEFAULT NULL,
  `status` enum('Menunggu Penanganan','Sedang Ditangani','Selesai Ditangani') NOT NULL DEFAULT 'Menunggu Penanganan',
  `detected_at` varchar(30) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `detections`
--

INSERT INTO `detections` (`detection_id`, `track_id`, `label`, `confidence`, `length_cm`, `width_cm`, `image`, `latitude`, `longitude`, `road_id`, `status`, `detected_at`, `created_at`) VALUES
(1, 3, 'pothole', 50.64, 3.52, 11.82, 'images\\pothole_3.jpg', -6.237615, 106.993277, 1, 'Menunggu Penanganan', '15-07-2026 11:54:00', NULL),
(2, 4, 'pothole', 59.17, 4.73, 7.04, 'images\\pothole_4.jpg', -6.222806, 107.013466, 2, 'Menunggu Penanganan', '15-07-2026 11:54:11', NULL),
(3, 5, 'pothole', 56.26, 1.73, 3.57, 'images\\pothole_5.jpg', -6.233527, 107.016987, 3, 'Menunggu Penanganan', '15-07-2026 11:54:12', NULL),
(4, 6, 'pothole', 51.19, 23.37, 22.69, 'images\\pothole_6.jpg', -6.225522, 107.017713, 4, 'Menunggu Penanganan', '21-07-2026 10:58:28', NULL),
(5, 9, 'pothole', 41.23, 0.89, 2.73, 'images\\pothole_9.jpg', -6.229467, 107.010804, 4, 'Menunggu Penanganan', '21-07-2026 10:58:36', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `roads`
--

CREATE TABLE `roads` (
  `road_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `length_cm` decimal(12,2) NOT NULL DEFAULT 2000.00,
  `width_cm` decimal(12,2) NOT NULL DEFAULT 500.00,
  `area_cm2` decimal(14,2) GENERATED ALWAYS AS (`length_cm` * `width_cm`) STORED,
  `damage_percentage` decimal(7,2) NOT NULL DEFAULT 0.00,
  `damage_score` tinyint(3) UNSIGNED GENERATED ALWAYS AS (case when `damage_percentage` < 10 then 1 when `damage_percentage` < 20 then 2 when `damage_percentage` < 30 then 3 when `damage_percentage` < 40 then 4 when `damage_percentage` < 50 then 5 when `damage_percentage` < 60 then 6 when `damage_percentage` < 70 then 7 when `damage_percentage` < 80 then 8 when `damage_percentage` < 90 then 9 else 10 end) STORED,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `roads`
--

INSERT INTO `roads` (`road_id`, `name`, `length_cm`, `width_cm`, `damage_percentage`, `created_at`, `updated_at`) VALUES
(1, 'Jalan Ahmad Yani, Proyek, Bekasi, Jawa Barat, 17141, Indonesia', 2000.00, 500.00, 0.15, '2026-08-01 19:48:15', '2026-08-01 19:48:15'),
(2, 'Jalan Perjuangan, Proyek, Bekasi, Jawa Barat, 17112, Indonesia', 2000.00, 500.00, 0.32, '2026-08-01 19:48:15', '2026-08-01 19:48:15'),
(3, 'Jalan H. Nonon Sonthanie, Bekasi, Jawa Barat, 17112, Indonesia', 2000.00, 500.00, 0.03, '2026-08-01 19:48:15', '2026-08-01 19:48:15'),
(4, 'Jalan KH. Agus Salim, Bekasi, Jawa Barat, 17112, Indonesia', 2000.00, 500.00, 4.05, '2026-08-01 19:48:15', '2026-08-01 19:48:15');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `detections`
--
ALTER TABLE `detections`
  ADD PRIMARY KEY (`detection_id`),
  ADD KEY `idx_detections_road_id` (`road_id`);

--
-- Indexes for table `roads`
--
ALTER TABLE `roads`
  ADD PRIMARY KEY (`road_id`),
  ADD UNIQUE KEY `uq_roads_name` (`name`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `detections`
--
ALTER TABLE `detections`
  MODIFY `detection_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `roads`
--
ALTER TABLE `roads`
  MODIFY `road_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `detections`
--
ALTER TABLE `detections`
  ADD CONSTRAINT `fk_detections_road` FOREIGN KEY (`road_id`) REFERENCES `roads` (`road_id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
