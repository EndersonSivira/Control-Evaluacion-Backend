import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector

app = Flask(__name__)
CORS(app)  # Permite la comunicación entre el frontend y el backend

# Función para establecer conexión con la base de datos MySQL (Local o Aiven Cloud)
def get_db_connection():
    return mysql.connector.connect(
        host=os.environ.get("DB_HOST", "mysql-864f36f-endersonsivira13-f7e9.i.aivencloud.com"),
        port=int(os.environ.get("DB_PORT", 19840)),
        user=os.environ.get("DB_USER", "avnadmin"),
        password=os.environ.get("DB_PASSWORD", "password123"), 
        database=os.environ.get("DB_NAME", "defaultdb")
    )

# 0. RUTA BASE: Verificación de estado del servidor
@app.route('/', methods=['GET'])
def index():
    return jsonify({
        "status": "Servidor Activo",
        "mensaje": "Backend de Control de Evaluación funcionando correctamente"
    }), 200

# 1. RUTA: Obtener la lista de todos los estudiantes (Panel Admin)
@app.route('/api/estudiantes', methods=['GET'])
def obtener_estudiantes():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM estudiantes")
        estudiantes = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(estudiantes), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 2. RUTA: Registrar un nuevo estudiante
@app.route('/api/estudiantes', methods=['POST'])
def guardar_estudiante():
    datos = request.json
    
    if not datos.get('cedula') or not datos.get('nombres') or not datos.get('edad') or not datos.get('correo'):
        return jsonify({"error": "Faltan campos obligatorios por rellenar"}), 400
        
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM estudiantes WHERE cedula = %s", (datos['cedula'],))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({"error": "La cédula ingresada ya se encuentra registrada"}), 400

        query = """INSERT INTO estudiantes (cedula, nombres, edad, correo, telefono, anio_asignado) 
                   VALUES (%s, %s, %s, %s, %s, NULL)"""
        valores = (datos['cedula'], datos['nombres'], int(datos['edad']), datos['correo'], datos.get('telefono'))
        
        cursor.execute(query, valores)
        conn.commit()
        
        cursor.close()
        conn.close()
        return jsonify({"message": "Estudiante registrado con éxito"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 3. RUTA: Asignar o cambiar el año académico de un estudiante
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

# 4. RUTA: Registrar una nota para un estudiante
@app.route('/api/notas', methods=['POST'])
def guardar_nota():
    datos = request.json
    
    if not datos.get('cedula') or not datos.get('materia') or not datos.get('nota'):
        return jsonify({"error": "Faltan datos obligatorios para registrar la nota"}), 400
        
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = "INSERT INTO notas (cedula_estudiante, materia, nota) VALUES (%s, %s, %s)"
        valores = (datos['cedula'], datos['materia'], float(datos['nota']))
        
        cursor.execute(query, valores)
        conn.commit()
        
        cursor.close()
        conn.close()
        return jsonify({"message": "Nota registrada correctamente"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 5. RUTA: Obtener solo las notas por cédula
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

# 6. RUTA PÚBLICA ESTUDIANTES: Consulta combinada (Nombre + Notas) por Cédula
@app.route('/api/estudiantes/consulta/<cedula>', methods=['GET'])
def consultar_estudiante_publico(cedula):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Buscar información del estudiante
        cursor.execute("SELECT nombres, cedula, anio_asignado FROM estudiantes WHERE cedula = %s", (cedula,))
        estudiante = cursor.fetchone()
        
        if not estudiante:
            cursor.close()
            conn.close()
            return jsonify({"error": "Estudiante no encontrado en el sistema"}), 404
            
        # Buscar sus notas asociadas
        cursor.execute("SELECT materia, nota FROM notas WHERE cedula_estudiante = %s", (cedula,))
        notas = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "estudiante": estudiante["nombres"],
            "cedula": estudiante["cedula"],
            "anio": estudiante["anio_asignado"],
            "notas": notas
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Arranca la aplicación dinámicamente según el entorno (Local o Render)
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)