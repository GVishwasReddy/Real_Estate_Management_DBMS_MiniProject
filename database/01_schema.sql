-- Create Database
CREATE DATABASE IF NOT EXISTS RealEstateDB;

-- Select Database
USE RealEstateDB;

-- ==========================
-- CREATE TABLES
-- ==========================

-- 1. Client
CREATE TABLE IF NOT EXISTS Client (
    ClientID INT PRIMARY KEY AUTO_INCREMENT,
    Fname VARCHAR(50),
    Lname VARCHAR(50),
    HireDate DATE,
    AddressStreet VARCHAR(100),
    City VARCHAR(50),
    State VARCHAR(50),
    ZIPCode VARCHAR(10)
);

-- 2. Office
CREATE TABLE IF NOT EXISTS Office (
    OfficeID INT PRIMARY KEY AUTO_INCREMENT,
    Fname VARCHAR(50),
    Lname VARCHAR(50),
    AddressStreet VARCHAR(100),
    City VARCHAR(50),
    State VARCHAR(50),
    ZIPCode VARCHAR(10)
);

-- 3. Agent
CREATE TABLE IF NOT EXISTS Agent (
    AgentID INT PRIMARY KEY AUTO_INCREMENT,
    SuperviseID INT NULL,
    Fname VARCHAR(50),
    Lname VARCHAR(50),
    LicenseNumber VARCHAR(30),
    OfficeID INT,
    StartDate DATE,
    FOREIGN KEY (OfficeID) REFERENCES Office(OfficeID),
    FOREIGN KEY (SuperviseID) REFERENCES Agent(AgentID)
);

-- 4. Property
CREATE TABLE IF NOT EXISTS Property (
    PropertyID INT PRIMARY KEY AUTO_INCREMENT,
    OfficeID INT,
    Size DECIMAL(10,2),
    Type VARCHAR(50),
    Price DECIMAL(12,2),
    Street VARCHAR(100),
    City VARCHAR(50),
    State VARCHAR(50),
    ZIPCode VARCHAR(10),
    AgentID INT,
    FOREIGN KEY (OfficeID) REFERENCES Office(OfficeID),
    FOREIGN KEY (AgentID) REFERENCES Agent(AgentID)
);

-- 5. Contract
CREATE TABLE IF NOT EXISTS Contract (
    ContractID INT PRIMARY KEY AUTO_INCREMENT,
    ClientID INT,
    StartDate DATE,
    EndDate DATE,
    Amount DECIMAL(12,2),
    FOREIGN KEY (ClientID) REFERENCES Client(ClientID)
);

-- 6. Payment
CREATE TABLE IF NOT EXISTS Payment (
    PaymentNo INT PRIMARY KEY AUTO_INCREMENT,
    ContractID INT,
    PaymentDate DATE,
    Amount DECIMAL(12,2),
    FOREIGN KEY (ContractID) REFERENCES Contract(ContractID)
);

-- 7. Commission
CREATE TABLE IF NOT EXISTS Commission (
    CommissionID INT PRIMARY KEY AUTO_INCREMENT,
    Percentage DECIMAL(5,2),
    Amount DECIMAL(12,2)
);

-- 8. Users (FOR LOGIN)
CREATE TABLE IF NOT EXISTS users (
    UserID INT AUTO_INCREMENT PRIMARY KEY,
    Username VARCHAR(100) UNIQUE NOT NULL,
    PasswordHash VARCHAR(255) NOT NULL,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Phone numbers (multivalued attributes)
CREATE TABLE IF NOT EXISTS AgentPhone (
    AgentID INT,
    PhoneNumber VARCHAR(15),
    PRIMARY KEY (AgentID, PhoneNumber),
    FOREIGN KEY (AgentID) REFERENCES Agent(AgentID)
);

CREATE TABLE IF NOT EXISTS OfficePhone (
    OfficeID INT,
    PhoneNumber VARCHAR(15),
    PRIMARY KEY (OfficeID, PhoneNumber),
    FOREIGN KEY (OfficeID) REFERENCES Office(OfficeID)
);

CREATE TABLE IF NOT EXISTS ClientPhone (
    ClientID INT,
    PhoneNumber VARCHAR(15),
    PRIMARY KEY (ClientID, PhoneNumber),
    FOREIGN KEY (ClientID) REFERENCES Client(ClientID)
);

-- Property-Contract (M:N relationship)
CREATE TABLE IF NOT EXISTS PropertyContract (
    PropertyID INT,
    ContractID INT,
    PRIMARY KEY (PropertyID, ContractID),
    FOREIGN KEY (PropertyID) REFERENCES Property(PropertyID),
    FOREIGN KEY (ContractID) REFERENCES Contract(ContractID)
);

-- Earns (Ternary Relationship: Agent–Contract–Commission)
CREATE TABLE IF NOT EXISTS Earns (
    AgentID INT,
    ContractID INT,
    CommissionID INT,
    EarnedDate DATE,
    PRIMARY KEY (AgentID, ContractID, CommissionID),
    FOREIGN KEY (AgentID) REFERENCES Agent(AgentID),
    FOREIGN KEY (ContractID) REFERENCES Contract(ContractID),
    FOREIGN KEY (CommissionID) REFERENCES Commission(CommissionID)
);

-- ==========================
-- INSERT SAMPLE DATA
-- ==========================

-- Clear tables before inserting (optional, good for testing)
-- SET FOREIGN_KEY_CHECKS = 0;
-- TRUNCATE TABLE Earns;
-- TRUNCATE TABLE PropertyContract;
-- TRUNCATE TABLE ClientPhone;
-- TRUNCATE TABLE OfficePhone;
-- TRUNCATE TABLE AgentPhone;
-- TRUNCATE TABLE Commission;
-- TRUNCATE TABLE Payment;
-- TRUNCATE TABLE Contract;
-- TRUNCATE TABLE Property;
-- TRUNCATE TABLE Agent;
-- TRUNCATE TABLE Office;
-- TRUNCATE TABLE Client;
-- SET FOREIGN_KEY_CHECKS = 1;

-- Clients
INSERT INTO Client (Fname, Lname, HireDate, AddressStreet, City, State, ZIPCode)
VALUES 
('John', 'Smith', '2021-01-15', '123 Main St', 'New York', 'NY', '10001'),
('Alice', 'Brown', '2022-03-20', '456 Oak Ave', 'Los Angeles', 'CA', '90001'),
('Robert', 'Johnson', '2023-05-10', '789 Pine Rd', 'Chicago', 'IL', '60601');

-- Offices
INSERT INTO Office (Fname, Lname, AddressStreet, City, State, ZIPCode)
VALUES 
('Michael', 'Davis', '12 Wall St', 'New York', 'NY', '10005'),
('Sophia', 'Taylor', '34 Sunset Blvd', 'Los Angeles', 'CA', '90028');

-- Agents
INSERT INTO Agent (SuperviseID, Fname, Lname, LicenseNumber, OfficeID, StartDate)
VALUES
(NULL, 'James', 'Williams', 'LIC123', 1, '2020-06-01'),
(1, 'Emma', 'Martinez', 'LIC456', 1, '2021-07-15'),
(NULL, 'Liam', 'Garcia', 'LIC789', 2, '2022-02-10');

-- Properties
INSERT INTO Property (OfficeID, Size, Type, Price, Street, City, State, ZIPCode, AgentID)
VALUES
(1, 1200.50, 'Apartment', 300000.00, '101 Park Ave', 'New York', 'NY', '10010', 1),
(1, 2000.00, 'House', 550000.00, '202 Lexington Ave', 'New York', 'NY', '10011', 2),
(2, 1500.75, 'Condo', 400000.00, '303 Sunset Dr', 'Los Angeles', 'CA', '90012', 3);

-- Contracts
INSERT INTO Contract (ClientID, StartDate, EndDate, Amount)
VALUES
(1, '2023-01-01', '2023-12-31', 500000.00),
(2, '2023-06-01', '2024-05-31', 300000.00),
(3, '2024-01-01', '2024-12-31', 450000.00);

-- Payments
INSERT INTO Payment (ContractID, PaymentDate, Amount)
VALUES
(1, '2023-02-15', 100000.00),
(1, '2023-06-15', 150000.00),
(2, '2023-07-10', 50000.00),
(3, '2024-02-20', 75000.00);

-- Commissions
INSERT INTO Commission (Percentage, Amount)
VALUES
(2.5, 0.00), -- Base amount should probably be 0, and updated by trigger
(3.0, 0.00),
(1.5, 0.00);

-- Phone Numbers
INSERT INTO AgentPhone (AgentID, PhoneNumber)
VALUES
(1, '111-222-3333'),
(2, '222-333-4444'),
(3, '333-444-5555');

INSERT INTO OfficePhone (OfficeID, PhoneNumber)
VALUES
(1, '555-123-4567'),
(2, '555-987-6543');

INSERT INTO ClientPhone (ClientID, PhoneNumber)
VALUES
(1, '999-111-2222'),
(2, '999-222-3333'),
(3, '999-333-4444');

-- Property-Contract (M:N relationship)
INSERT INTO PropertyContract (PropertyID, ContractID)
VALUES
(1, 1),
(2, 2),
(3, 3);

-- Earns (ternary relationship)
INSERT INTO Earns (AgentID, ContractID, CommissionID, EarnedDate)
VALUES
(1, 1, 1, '2023-02-15'),
(2, 2, 2, '2023-07-10'),
(3, 3, 3, '2024-02-20');
