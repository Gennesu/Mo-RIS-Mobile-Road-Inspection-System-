def hitung_kerusakan(
    panjang_jalan,
    lebar_jalan,
    daftar_luas_kerusakan
):
    """
    panjang_jalan : meter
    lebar_jalan   : meter
    daftar_luas_kerusakan : list berisi luas tiap kerusakan (m²)
    """

    luas_jalan = panjang_jalan * lebar_jalan

    total_luas_kerusakan = sum(daftar_luas_kerusakan)

    persentase = (
        total_luas_kerusakan / luas_jalan
    ) * 100

    if persentase <= 1:
        skor = 1
        kategori = "Sangat Baik"

    elif persentase <= 3:
        skor = 2
        kategori = "Baik"

    elif persentase <= 5:
        skor = 3
        kategori = "Cukup Baik"

    elif persentase <= 10:
        skor = 4
        kategori = "Sedang"

    elif persentase <= 15:
        skor = 5
        kategori = "Agak Rusak"

    elif persentase <= 20:
        skor = 6
        kategori = "Rusak Ringan"

    elif persentase <= 25:
        skor = 7
        kategori = "Rusak Sedang"

    elif persentase <= 30:
        skor = 8
        kategori = "Rusak Berat"

    else:
        skor = 9
        kategori = "Rusak Sangat Berat"

    return {
        "luas_jalan": round(luas_jalan, 2),
        "total_luas_kerusakan": round(total_luas_kerusakan, 2),
        "persentase": round(persentase, 2),
        "skor": skor,
        "kategori": kategori
    }
    
    
panjang = float(input("Panjang jalan (m): "))
lebar = float(input("Lebar jalan (m): "))

jumlah = int(input("Jumlah kerusakan: "))

luas = []

for i in range(jumlah):
    data = float(input(f"Luas kerusakan {i+1} (m²): "))
    luas.append(data)

hasil = hitung_kerusakan(
    panjang,
    lebar,
    luas
)

print("\n===== HASIL =====")
print(f"Luas Jalan            : {hasil['luas_jalan']} m²")
print(f"Total Kerusakan       : {hasil['total_luas_kerusakan']} m²")
print(f"Persentase Kerusakan  : {hasil['persentase']} %")
print(f"Skor                  : {hasil['skor']}")
print(f"Kategori              : {hasil['kategori']}")