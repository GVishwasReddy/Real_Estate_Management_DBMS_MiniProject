USE realestatedb;

-- ============================================================
--  TRIGGERS
-- ============================================================

DELIMITER //

-- 🔹 Trigger 1: Validate that EndDate > StartDate in Contract
DROP TRIGGER IF EXISTS validate_contract_dates;
CREATE TRIGGER validate_contract_dates
BEFORE INSERT ON contract
FOR EACH ROW
BEGIN
    IF NEW.EndDate <= NEW.StartDate THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = '❌ End Date must be greater than Start Date';
    END IF;
END;
//


-- 🔹 Trigger 2: Automatically update Commission Amount after new Payment
DROP TRIGGER IF EXISTS update_commission_after_payment;
CREATE TRIGGER update_commission_after_payment
AFTER INSERT ON payment
FOR EACH ROW
BEGIN
    UPDATE commission AS co
    JOIN earns AS e ON co.CommissionID = e.CommissionID
    SET co.Amount = co.Amount + (NEW.Amount * (co.Percentage / 100))
    WHERE e.ContractID = NEW.ContractID;
END;
//

DELIMITER ;

-- ============================================================
--  FUNCTIONS
-- ============================================================

DELIMITER //

-- 🔹 Function: Get total payment amount for a contract
DROP FUNCTION IF EXISTS GetTotalPayment;
CREATE FUNCTION GetTotalPayment(p_contractId INT)
RETURNS DECIMAL(12,2)
DETERMINISTIC
BEGIN
    DECLARE total DECIMAL(12,2);
    SELECT IFNULL(SUM(Amount), 0)
    INTO total
    FROM payment
    WHERE ContractID = p_contractId;
    RETURN total;
END;
//

DELIMITER ;

-- ============================================================
--  STORED PROCEDURES
-- ============================================================

DELIMITER //

-- 🔹 Procedure 1: Add new Contract safely
DROP PROCEDURE IF EXISTS AddNewContract;
CREATE PROCEDURE AddNewContract(
    IN p_ClientID INT,
    IN p_StartDate DATE,
    IN p_EndDate DATE,
    IN p_Amount DECIMAL(12,2)
)
BEGIN
    INSERT INTO contract (ClientID, StartDate, EndDate, Amount)
    VALUES (p_ClientID, p_StartDate, p_EndDate, p_Amount);
END;
//


-- 🔹 Procedure 2: View Agent Earnings (joins earns + contract + commission)
DROP PROCEDURE IF EXISTS GetAgentEarnings;
CREATE PROCEDURE GetAgentEarnings(IN p_AgentID INT)
BEGIN
    SELECT 
        e.AgentID,
        e.ContractID,
        c.Amount AS ContractAmount,
        e.CommissionID,
        co.Percentage,
        (c.Amount * co.Percentage / 100) AS PotentialEarning,
        co.Amount AS ActualEarnedAmount
    FROM earns e
    JOIN contract c ON e.ContractID = c.ContractID
    JOIN commission co ON e.CommissionID = co.CommissionID
    WHERE e.AgentID = p_AgentID;
END;
//

-- 🔹 Procedure 3: Get High-Value Clients (Nested Query)
-- This fulfills the "Nested Query" requirement for your project.
DROP PROCEDURE IF EXISTS GetClientsWithHighValueContracts;
CREATE PROCEDURE GetClientsWithHighValueContracts()
BEGIN
    SELECT 
        c.ClientID, 
        c.Fname, 
        c.Lname, 
        co.ContractID, 
        co.Amount
    FROM client c
    JOIN contract co ON c.ClientID = co.ClientID
    WHERE co.Amount > (
        -- Nested Query: Calculates average contract amount
        SELECT AVG(Amount) 
        FROM contract
    )
    ORDER BY co.Amount DESC;
END;
//

DELIMITER ;