-- MySQL dump 10.19  Distrib 10.3.38-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: blockchain
-- ------------------------------------------------------
-- Server version	10.3.38-MariaDB-0ubuntu0.20.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `erakundeak`
--
-- Check if the 'ziurtagiriak' database exists, if not, create it and then use it for the following operations
CREATE DATABASE IF NOT EXISTS ziurtagiriak;
USE ziurtagiriak;

CREATE USER IF NOT EXISTS 'ziurtagiriak'@'%' IDENTIFIED BY 'ziurtagiriak';

GRANT ALL PRIVILEGES ON ziurtagiriak.* TO 'ziurtagiriak'@'%';
FLUSH PRIVILEGES;

DROP TABLE IF EXISTS `erakundeak`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `erakundeak` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `izena` varchar(255) NOT NULL,
  `address` varchar(45) NOT NULL,
  `helbidea` varchar(255) NOT NULL,
  `emaila` varchar(255) NOT NULL,
  `telefonoa` varchar(255) DEFAULT NULL,
  `logoa` varchar(50) NOT NULL,
  `www` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `erakundeak`
--

LOCK TABLES `erakundeak` WRITE;
/*!40000 ALTER TABLE `erakundeak` DISABLE KEYS */;
INSERT INTO `erakundeak` VALUES (1,'Tknika','','Zamalbide Auzoa z/g - 20100 Errenteria (Gipuzkoa)','info@tknika.eus','(+34) 943 082 900','tknika.png','https://tknika.eus/');
/*!40000 ALTER TABLE `erakundeak` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jardunaldiak`
--

DROP TABLE IF EXISTS `jardunaldiak`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `jardunaldiak` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `iderakundea` int(11) NOT NULL,
  `emailea` varchar(255) NOT NULL,
  `formakuntza` varchar(255) NOT NULL,
  `data` varchar(10) NOT NULL,
  `lekua` varchar(45) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_jardunaldiak_erakundeak` (`iderakundea`),
  CONSTRAINT `fk_jardunaldiak_erakundeak` FOREIGN KEY (`iderakundea`) REFERENCES `erakundeak` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jardunaldiak`
--

LOCK TABLES `jardunaldiak` WRITE;
/*!40000 ALTER TABLE `jardunaldiak` DISABLE KEYS */;
INSERT INTO `jardunaldiak` VALUES (19,1,'Emailea B eta Emailea C','Formakuntza bat','2023-03-18','Ciudad Jardín'),(20,1,'Blockchain taldea','Blockchain proiektuaren egoera','2023-05-02','Tknika'),(21,1,'Blockchain taldea','Blockchain proiektuaren egoera','2023-05-02','Tknika'),(22,1,'Blockchain taldea','Blockchain proiektuaren egoera','2023-05-02','Tknika'),(23,1,'Blockchain taldea','Blockchain proiektuaren egoera','2023-05-02','Tknika'),(24,1,'Blockchain taldea','Blockchain proiektuaren egoera','2023-05-02','Tknika');
/*!40000 ALTER TABLE `jardunaldiak` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `partaideak`
--

DROP TABLE IF EXISTS `partaideak`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `partaideak` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `izena` varchar(45) NOT NULL,
  `emaila` varchar(45) NOT NULL,
  `lokalizatzailea` varchar(8) DEFAULT NULL,
  `id_jardunaldia` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_jar_par` (`id_jardunaldia`),
  CONSTRAINT `fk_jar_par` FOREIGN KEY (`id_jardunaldia`) REFERENCES `jardunaldiak` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `partaideak`
--

LOCK TABLES `partaideak` WRITE;
/*!40000 ALTER TABLE `partaideak` DISABLE KEYS */;
INSERT INTO `partaideak` VALUES (4,'Ander Lopez','ander.lo@icjardin.com','SO2389',20),(5,'Mortadelo CIA','ander.lo@icjardin.com','EMDAAQ',20),(6,'Ander Lopez','ander.lo@icjardin.com','337XR1',21),(7,'Mortadelo CIA','ander.lo@icjardin.com','AQ6IOU',21),(8,'Ander Lopez','ander.lo@icjardin.com','DVY74V',22),(9,'Mortadelo CIA','ander.lo@icjardin.com','L90EE6',22),(11,'Ander López','ander.lo@icjardin.com','F6N9F2',23),(12,'Mortadelo CIA','ander.lo@icjardin.com','N7ABWY',23),(13,'Filemón CIA','ander.lo@icjardin.com','GK79TI',23),(16,'Filemón CIA','ander.lo@icjardin.com','YHYOBA',24);
/*!40000 ALTER TABLE `partaideak` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2023-05-22 12:31:46
