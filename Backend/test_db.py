from database import engine

try:
    conn = engine.connect()
    print("Berhasil terhubung ke MySQL")
    conn.close()

except Exception as e:
    print("Gagal:", e)
