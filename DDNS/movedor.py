import os
import shutil
import time

temp_folder = "/media/tmp"
target_folder = "/media/transform"

def wait_for_file(file_path, timeout=600, check_interval=5, stable_checks=3):
    prev_size = -1
    stable_count = 0

    while timeout > 0:
        if not os.path.exists(file_path):
            print(f"❌ El archivo {file_path} ha desaparecido.")
            return False  # Abortamos
        try:
            size = os.path.getsize(file_path)
            if size == prev_size:
                stable_count += 1
                if stable_count >= stable_checks:
                    return True
            else:
                stable_count = 0
                prev_size = size
        except (PermissionError, FileNotFoundError):
            pass
        time.sleep(check_interval)
        timeout -= check_interval
    return False

print("♻️ Esperando archivos estables en /tmp/uploads para moverlos a /videos...")

while True:
    for file_name in os.listdir(temp_folder):
        src_path = os.path.join(temp_folder, file_name)
        dst_path = os.path.join(target_folder, file_name)

        if os.path.isfile(src_path):
            print(f"Detectado: {src_path} – comprobando estabilidad...")
            if wait_for_file(src_path):
                if not os.path.exists(dst_path):
                    shutil.move(src_path, dst_path)
                    print(f"✅ Estable. Moviendo {src_path} → {dst_path}")
                else:
                    print(f"No se ha movido porque ya existe")
            else:
                print(f"⚠️ El archivo {src_path} no se estabilizó a tiempo.")
    time.sleep(2)
