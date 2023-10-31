import mysql.connector as con

bbdd = con.connect(host='localhost', database='blockchain', user='blockchain', password='blockchain', autocommit=True)
cursor = bbdd.cursor()
query = "SELECT id, izena FROM erakundeak"
cursor.execute(query)
print("Datos")
for row in cursor:
	print(row[0], " - ", row[1])
print("Fin")
bbdd.close()
