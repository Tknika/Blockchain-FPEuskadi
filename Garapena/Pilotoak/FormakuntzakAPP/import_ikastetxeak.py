import pandas as pd
import mysql.connector
from mysql.connector import Error

# Configuración de la conexión a la base de datos
db_config = {
    'host': '*******',
    'user': '*******',
    'password': '*******',
    'database': '*******'
}

# Leer el archivo CSV
csv_file = 'centros.csv'
data = pd.read_csv(csv_file, delimiter=";", header=0)
print(data.columns)
# Conectar a la base de datos
try:
    connection = mysql.connector.connect(**db_config)
    if connection.is_connected():
        cursor = connection.cursor()
        # Insertar datos en la tabla ikastetxeak
        for index, row in data.iterrows():
            sql = "INSERT INTO ikastetxeak (kodea, izena, lurraldea, herria) VALUES (%s, %s, %s, %s)"
            cursor.execute(sql, (row["kodea"], row["izena"], row["lurraldea"], row["herria"]))

        connection.commit()
        print("Datos importados exitosamente")

except Error as e:
    print(f"Error al conectar a la base de datos: {e}")
finally:
    if connection.is_connected():
        cursor.close()
        connection.close()
        print("Conexión a la base de datos cerrada")