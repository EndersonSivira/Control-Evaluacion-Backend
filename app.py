from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector

app = Flask(__name__)
CORS(app)  # Permite la comunicación segura entre tu HTML y esta API

# Función para establecer conexión con tu servidor local de MySQL (XAMPP)
def get_db_connection():
    return mysql.connector.connect(
        host="kafka-2f630777-endersonsivira13-f7e9.d.aivencloud.com:19853",
        port=19853, # Asegúrate de añadir el puerto si no es el 3306 común
        user="avnadmin",
        password="AVNS_6o5xoJHIxTJXkb76O_J",
        database="kafka-2f630777-endersonsivira13-f7e9.d.aivencloud.com" # Nombre de la base de datos de la nube
    )

# 1. RUTA: Obtener la lista de todos los estudiantes
@app.route('/api/estudiantes', methods=['GET'])
def obtener_estudiantes():
    try:
        conn = get_db_connection()
        cursor = conn.connector.cursor(dictionary=True) if hasattr(conn, 'connector') else conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM estudiantes")
        estudiantes = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(estudiantes), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 2. RUTA: Registrar un nuevo estudiante en la base de datos
@app.route('/api/estudiantes', methods=['POST'])
def guardar_estudiante():
    datos = request.json
    
    # Validar que los campos obligatorios no vengan vacíos
    if not datos.get('cedula') or not datos.get('nombres') or not datos.get('edad') or not datos.get('correo'):
        return jsonify({"error": "Faltan campos obligatorios por rellenar"}), 400
        
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verificar si la cédula ya existe para evitar duplicados
        cursor.execute("SELECT id FROM estudiantes WHERE cedula = %s", (datos['cedula'],))
        if cursor.fetchone():
            return jsonify({"error": "La cédula ingresada ya se encuentra registrada"}), 400

        # Insertar el nuevo registro (comienza con el año académico en NULL)
        query = """INSERT INTO estudiantes (cedula, nombres, edad, correo, telefono, anio_asignado) 
                   VALUES (%s, %s, %s, %s, %s, NULL)"""
        valores = (datos['cedula'], datos['nombres'], int(datos['edad']), datos['correo'], datos.get('telefono'))
        
        cursor.execute(query, valores)
        conn.commit()  # Confirma los cambios en MySQL
        
        cursor.close()
        conn.close()
        return jsonify({"message": "Estudiante registrado con éxito"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 3. RUTA: Asignar o cambiar el año académico (1ero a 5to) de un estudiante
@app.route('/api/estudiantes/asignar', methods=['PUT'])
def asignar_anio():
    datos = request.json
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = "UPDATE estudiantes SET anio_asignado = %s WHERE cedula = %s"
        cursor.execute(query, (int(datos['year']), datos['cedula']))
        conn.commit()
        
        cursor.close()
        conn.close()
        return jsonify({"message": "Estudiante asignado correctamente"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# 4. RUTA: Registrar una nota para un estudiante específico
@app.route('/api/notas', methods=['POST'])
def guardar_nota():
    datos = request.json
    
    if not datos.get('cedula') or not datos.get('materia') or not datos.get('nota'):
        return jsonify({"error": "Faltan datos obligatorios para registrar la nota"}), 400
        
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insertar la nota en la tabla
        query = "INSERT INTO notas (cedula_estudiante, materia, nota) VALUES (%s, %s, %s)"
        valores = (datos['cedula'], datos['materia'], float(datos['nota']))
        
        cursor.execute(query, valores)
        conn.commit()
        
        cursor.close()
        conn.close()
        return jsonify({"message": "Nota registrada correctamente"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    # 5. RUTA: Obtener las notas de un estudiante por su cédula
@app.route('/api/notas/<cedula>', methods=['GET'])
def obtener_notas_estudiante(cedula):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = "SELECT materia, nota FROM notas WHERE cedula_estudiante = %s"
        cursor.execute(query, (cedula,))
        notas = cursor.fetchall()
        
        cursor.close()
        conn.close()
        return jsonify(notas), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Arranca el servidor en el puerto 5000
if __name__ == '__main__':
    app.run(debug=True, port=5000)