<img width="959" height="473" alt="dashboard" src="https://github.com/user-attachments/assets/8866fa48-048b-429b-8b90-46c615a928b9" />RealtyPro Dashboard: A Real Estate Management System

A full-stack, end-to-end web application built for the UE23CS351A Database Management System mini-project. This application provides a secure, interactive GUI for managing a real estate agency's clients, contracts, agents, and payments.

The project demonstrates a complete implementation of database concepts including a normalized schema, triggers, stored procedures, functions, complex joins, aggregate queries, and nested queries, all managed via a secure backend API and a responsive frontend.

✨ Core Features

Secure Authentication: Full user registration and login system using bcrypt for password hashing and JWT (JSON Web Tokens) for session management.

CRUD Operations (with GUI):

Create: Add new clients, contracts, and payments.

Read: View all dashboard statistics, client lists, contract lists, payment history, and agent earnings.

Update: Commissions are automatically updated via a trigger when a new payment is added.

Delete: Safely delete clients or contracts (this also cascades to delete all related payments and records).

Role-Based Logic (SQL):

Triggers:

validate_contract_dates: Prevents creating a contract where the EndDate is before the StartDate.

update_commission_after_payment: Automatically calculates and updates an agent's commission.Amount every time a new payment is logged.

Stored Procedures:

GetAgentEarnings: A procedure that runs a JOIN query to show detailed commission info for a specific agent.

GetClientsWithHighValueContracts: A procedure that runs a Nested Query to find all clients with contracts valued higher than the database average.

Functions:

GetTotalPayment: A function that runs an Aggregate Query (SUM) to calculate the total amount paid on a specific contract.

Full End-to-End Connection:

The JavaScript frontend calls the Flask backend API.

The Flask backend executes the MySQL procedures and functions.

The results are returned as JSON and displayed in the GUI.

🛠 Technology Stack

Backend:

Python 3.10

Flask: For the web server and API routes.

Flask-JWT-Extended: For handling JWT authentication.

Flask-CORS: To allow the frontend to communicate with the backend.

bcrypt: For secure password hashing.

mysql-connector-python: To connect to the MySQL database.

Frontend:

HTML5

Tailwind CSS: For all styling and layout.

JavaScript (ES6+): For all interactivity, API calls (fetch), and DOM manipulation.

Database:

MySQL 8.0

🚀 Getting Started

Follow these steps to set up and run the project on your local machine.

1. Prerequisites

Python 3.10 or newer.

MySQL Server 8.0 or newer (with MySQL Command Line Client).

A code editor like VS Code.

(Recommended) The Live Server extension for VS Code.

2. Database Setup (The "Chef's Pantry")

This is the most important step. You must create the database, create the user, and grant permissions.

Log in to MySQL as root:
Open your cmd or terminal and log in as the root user (the admin for your MySQL server).

mysql -u root -p


(Enter your root password)

Create the Database & User:
Run the following commands inside the mysql> prompt.

-- 1. Create the database
CREATE DATABASE RealEstateDB;

-- 2. Create the user
CREATE USER 'realestate_user'@'localhost' IDENTIFIED BY '123456789';

-- 3. Grant all permissions for this database to the new user
GRANT ALL PRIVILEGES ON RealEstateDB.* TO 'realestate_user'@'localhost';

-- 4. Set the global variable to allow function creation (fixes ERROR 1419)
SET GLOBAL log_bin_trust_function_creators = 1;

-- 5. Apply the changes
FLUSH PRIVILEGES;

-- 6. Exit root
exit


Run the SQL Scripts:
Now, log back in as your new realestate_user to run the setup files.

mysql -u realestate_user -p


(Enter the password: 123456789)

Inside the mysql> prompt, run your two SQL files. You must use the full path to your files.

-- 1. Select the database
USE RealEstateDB;

-- 2. Run the schema file to create tables and insert data
source C:\path\to\your\project\database\01_schema.sql;

-- 3. Run the logic file to add triggers, functions, and procedures
source C:\path\to\your\project\database\02_logic.sql;

-- 4. Exit
exit


Your database is now 100% ready.

3. Backend Setup (The "Chef")

Navigate to the backend folder:

cd path\to\your\project\backend


Install the required Python libraries:

pip install -r requirements.txt


Run the Flask server:

python app.py


Your backend is now running at http://127.0.0.1:5000.

4. Frontend Setup (The "Waiter" & "Menu")

Open your frontend folder in VS Code.

Right-click the index.html file.

Select "Open with Live Server".

Your browser will open, and you can now Sign Up for a new account and Login to use the application.

🗂 File Structure

The project uses a "Separation of Concerns" model:

real-estate-project/
│
├── frontend/
│   ├── index.html          # (The "Menu") All HTML structure
│   └── app.js              # (The "Waiter") All frontend JavaScript logic
│
├── backend/
│   ├── app.py              # (The "Chef") Flask API server
│   └── requirements.txt    # Python libraries
│
└── database/
    ├── 01_schema.sql       # (The "Pantry") All CREATE TABLE and INSERT data
    └── 02_logic.sql        # (The "Recipe Book") All Triggers, Functions, Procedures
