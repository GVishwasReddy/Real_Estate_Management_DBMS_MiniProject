import mysql.connector
from flask import Flask, request, jsonify
from flask_cors import CORS
from decimal import Decimal
import json
# --- IMPORTS FOR AUTH ---
import bcrypt
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required, JWTManager
# --- END IMPORTS ---

app = Flask(__name__)
app.secret_key = "real_estate_secret_key" 
CORS(app)

# --- Configure JWT (JSON Web Tokens) ---
app.config["JWT_SECRET_KEY"] = "change-this-super-secret-key-in-production"
jwt = JWTManager(app)
# --- END NEW CONFIG ---

def get_db_connection():
    """Establishes and returns a MySQL database connection."""
    return mysql.connector.connect(
        host="localhost",
        user="realestate_user",
        password="123456789", 
        database="realestatedb"
    )

class CustomJSONEncoder(json.JSONEncoder):
    """Custom encoder to handle Decimal and Date types from the DB."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        if hasattr(obj, 'isoformat'): # Handle dates/datetimes
            return obj.isoformat()
        return super().default(obj)

app.json_encoder = CustomJSONEncoder

# ============================================================
#  AUTHENTICATION API ROUTES
# ============================================================

@app.route('/api/register', methods=['POST'])
def register():
    """Registers a new user."""
    conn = None
    cursor = None
    try:
        data = request.json
        username = data['username']
        password = data['password']
        
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = "INSERT INTO users (Username, PasswordHash) VALUES (%s, %s)"
        cursor.execute(query, (username, hashed_password))
        conn.commit()
        
        return jsonify({'message': 'User registered successfully!'}), 201
        
    except mysql.connector.Error as err:
        if err.errno == 1062: # Error code for 'Duplicate entry'
            return jsonify({'error': 'Username already exists.'}), 409
        return jsonify({'error': f"Database Error: {err.msg}"}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    """Logs in a user and returns a JWT token."""
    conn = None
    cursor = None
    try:
        data = request.json
        username = data['username']
        password = data['password']
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = "SELECT * FROM users WHERE Username = %s"
        cursor.execute(query, (username,))
        user = cursor.fetchone()
        
        if user and bcrypt.checkpw(password.encode('utf-8'), user['PasswordHash'].encode('utf-8')):
            access_token = create_access_token(identity=user['Username'])
            return jsonify(access_token=access_token)
        else:
            return jsonify({'error': 'Invalid username or password'}), 401
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# ============================================================
#  PROTECTED "READ" API ROUTES
# ============================================================

@app.route('/api/stats', methods=['GET'])
@jwt_required() 
def get_stats():
    """Fetches dashboard stats (Aggregate Query)."""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT COUNT(*) AS count FROM client")
        clients = cursor.fetchone()['count']
        
        cursor.execute("SELECT COUNT(*) AS count FROM contract")
        contracts = cursor.fetchone()['count']
        
        cursor.execute("SELECT COUNT(*) AS count FROM agent")
        agents = cursor.fetchone()['count']
        
        cursor.execute("SELECT SUM(Amount) AS total FROM payment")
        total_paid = cursor.fetchone()['total'] or 0
        
        return jsonify({
            'clients': clients,
            'contracts': contracts,
            'agents': agents,
            'totalPaid': total_paid
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/api/clients', methods=['GET'])
@jwt_required() 
def get_clients():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT ClientID, Fname, Lname FROM client ORDER BY Lname, Fname")
        clients = cursor.fetchall()
        return jsonify(clients), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/api/agents', methods=['GET'])
@jwt_required() 
def get_agents():
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT AgentID, Fname, Lname FROM agent ORDER BY Lname, Fname")
        agents = cursor.fetchall()
        return jsonify(agents), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/api/contracts', methods=['GET'])
@jwt_required() 
def get_contracts():
    """Fetches all contracts (Join Query)."""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT c.ContractID, c.Amount, CONCAT(cl.Fname, ' ', cl.Lname) AS ClientName
            FROM contract c
            JOIN client cl ON c.ClientID = cl.ClientID
            ORDER BY c.ContractID DESC
        """)
        contracts = cursor.fetchall()
        return jsonify(contracts), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/api/agent_earnings/<int:agent_id>', methods=['GET'])
@jwt_required() 
def get_agent_earnings(agent_id):
    """Executes GetAgentEarnings procedure (Join Query)."""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.callproc('GetAgentEarnings', [agent_id])
        earnings = []
        for result in cursor.stored_results():
            earnings = result.fetchall()
        
        return jsonify(earnings), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/api/total_payment/<int:contract_id>', methods=['GET'])
@jwt_required() 
def get_total_payment(contract_id):
    """Executes GetTotalPayment function (Aggregate Query)."""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT GetTotalPayment(%s) AS total;", (contract_id,))
        total = cursor.fetchone()['total']
        
        return jsonify({'total': total}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/api/payments/<int:contract_id>', methods=['GET'])
@jwt_required() 
def get_payments(contract_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT PaymentNo, PaymentDate, Amount 
            FROM payment 
            WHERE ContractID = %s
            ORDER BY PaymentDate DESC, PaymentNo DESC;
        """, (contract_id,))
        payments = cursor.fetchall()
        return jsonify(payments), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# ============================================================
#  🔹 NEW: NESTED QUERY ROUTE
# ============================================================
@app.route('/api/clients/high_value', methods=['GET'])
@jwt_required()
def get_high_value_clients():
    """Executes GetClientsWithHighValueContracts procedure (Nested Query)."""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.callproc('GetClientsWithHighValueContracts')
        clients = []
        for result in cursor.stored_results():
            clients = result.fetchall()
            
        return jsonify(clients), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# ============================================================
#  PROTECTED "CREATE" API ROUTES
# ============================================================

@app.route('/api/add_client', methods=['POST'])
@jwt_required() 
def add_client():
    conn = None
    cursor = None
    try:
        data = request.json
        conn = get_db_connection()
        cursor = conn.cursor()
        query = """
            INSERT INTO client (Fname, Lname, HireDate, AddressStreet, City, State, ZIPCode)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(query, (
            data['fname'], data['lname'], data['hire_date'], 
            data['address'], data['city'], data['state'], data['zip_code']
        ))
        conn.commit()
        return jsonify({'message': 'Client added successfully!'}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/api/add_contract', methods=['POST'])
@jwt_required() 
def add_contract():
    """Invokes AddNewContract procedure (which invokes a Trigger)."""
    conn = None
    cursor = None
    try:
        data = request.json
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.callproc('AddNewContract', (
            data['client_id'], data['start_date'], 
            data['end_date'], data['amount']
        ))
        conn.commit()
        return jsonify({'message': 'Contract added successfully! Trigger validated dates.'}), 201
        
    except mysql.connector.Error as err:
        return jsonify({'error': f"Database Error: {err.msg}"}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/api/add_payment', methods=['POST'])
@jwt_required() 
def add_payment():
    """Adds a payment (which invokes a Trigger)."""
    conn = None
    cursor = None
    try:
        data = request.json
        contract_id = data['contract_id']
        amount = data['amount']
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT co.CommissionID, co.Amount AS PreAmount, co.Percentage
            FROM earns e
            JOIN commission co ON e.CommissionID = co.CommissionID
            WHERE e.ContractID = %s
        """, (contract_id,))
        pre_commission = cursor.fetchone()

        if pre_commission is None:
            return jsonify({
                'error': f"Database Error: No 'earns' or 'commission' record found for ContractID {contract_id}. Cannot add payment."
            }), 400

        cursor.execute("""
            INSERT INTO payment (ContractID, PaymentDate, Amount)
            VALUES (%s, CURDATE(), %s)
        """, (contract_id, amount))
        conn.commit()
        
        cursor.execute(
            "SELECT Amount AS PostAmount FROM commission WHERE CommissionID = %s",
            (pre_commission['CommissionID'],)
        )
        post_commission = cursor.fetchone()

        return jsonify({
            'message': 'Payment added! Trigger updated commission.',
            'commissionReport': {**pre_commission, **post_commission}
        }), 201

    except mysql.connector.Error as err:
        if conn: conn.rollback()
        return jsonify({'error': f"Database Error: {err.msg}"}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# ============================================================
#  🔹 NEW: PROTECTED "DELETE" API ROUTES
# ============================================================

def delete_contract_records(cursor, contract_id):
    """Helper function to delete a contract and its dependencies."""
    # Delete from child tables first to avoid foreign key errors
    cursor.execute("DELETE FROM payment WHERE ContractID = %s", (contract_id,))
    cursor.execute("DELETE FROM propertycontract WHERE ContractID = %s", (contract_id,))
    cursor.execute("DELETE FROM earns WHERE ContractID = %s", (contract_id,))
    # Now delete from contract
    cursor.execute("DELETE FROM contract WHERE ContractID = %s", (contract_id,))

@app.route('/api/contract/<int:contract_id>', methods=['DELETE'])
@jwt_required()
def delete_contract(contract_id):
    """Deletes a contract and all its related records."""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        delete_contract_records(cursor, contract_id)
        
        conn.commit()
        return jsonify({'message': 'Contract and all related records deleted.'}), 200
        
    except mysql.connector.Error as err:
        if conn: conn.rollback()
        return jsonify({'error': f"Database Error: {err.msg}"}), 400
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/api/client/<int:client_id>', methods=['DELETE'])
@jwt_required()
def delete_client(client_id):
    """Deletes a client and all their related records."""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True) # Use dictionary cursor to fetch IDs
        
        # 1. Get all contracts for this client
        cursor.execute("SELECT ContractID FROM contract WHERE ClientID = %s", (client_id,))
        contracts = cursor.fetchall()
        
        # 2. Loop and delete each contract and its dependencies
        for contract in contracts:
            delete_contract_records(cursor, contract['ContractID'])
        
        # 3. Delete from ClientPhone
        cursor.execute("DELETE FROM clientphone WHERE ClientID = %s", (client_id,))
        
        # 4. Finally, delete the client
        cursor.execute("DELETE FROM client WHERE ClientID = %s", (client_id,))
        
        conn.commit()
        return jsonify({'message': 'Client and all related records deleted.'}), 200

    except mysql.connector.Error as err:
        if conn: conn.rollback()
        return jsonify({'error': f"Database Error: {err.msg}"}), 400
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


if __name__ == "__main__":
    app.run(debug=True)