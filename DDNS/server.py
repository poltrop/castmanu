from flask import Flask, request, abort, jsonify
from PIL import Image
from io import BytesIO
import os
import subprocess

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 15 * 1024 * 1024 * 1024  # Límite de 15GB
UPLOAD_FOLDER = "/media/tmp"
VIDEOS_FOLDER = "/media/videos"
FOTOS_FOLDER = "/media/fotos"
API_KEY = "castmanu"  # cámbialo por lo que quieras

def check_auth():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer ") or auth.split(" ", 1)[1] != API_KEY:
        abort(401)

@app.route("/upload/<new_name>", methods=["POST"])
def upload(new_name):
    check_auth()
    if 'file' not in request.files:
        return "No file provided", 400
    file = request.files['file']
    if not is_video(file):
        return "El archivo no es un video válido", 400
    extraCap = request.args.get("capitulo")
    filename = ""
    if extraCap:
        filename += f"***{extraCap}***"
    filename += new_name + os.path.splitext(file.filename)[1]
    path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(path)
    return "File uploaded", 200

@app.route("/delete/<filename>", methods=["DELETE"])
def delete(filename):
    check_auth()
    path = os.path.join(VIDEOS_FOLDER, filename)
    if not os.path.exists(path):
        return "File not found", 404
    os.remove(path)
    return "File deleted", 200

@app.route("/modify/<filename>", methods=["PATCH"])
def rename(filename):
    check_auth()
    new_name = request.args.get("new") # Tengo que encargarme de meterle el new_name como queryparam, y ademas meterle el .mp4 antes de enviarlo
    if not new_name:
        return "Missing 'new' param", 400
    old_path = os.path.join(VIDEOS_FOLDER, filename)
    new_path = os.path.join(VIDEOS_FOLDER, new_name)
    if not os.path.exists(old_path):
        return "File not found", 404
    os.rename(old_path, new_path)
    return "File renamed", 200

@app.route("/uploadf/<new_name>", methods=["POST"])
def uploadf(new_name):
    check_auth()
    if 'file' not in request.files:
        return "No file provided", 400
    file = request.files['file']
    # Verifica si el archivo es una imagen antes de guardarlo
    if not is_image(file):
        return "El archivo no es una imagen válida", 400
    filename = new_name + os.path.splitext(file.filename)[1]
    path = os.path.join(FOTOS_FOLDER, filename)
    file.save(path)
    return "File uploaded", 200

@app.route("/getSubLanguages/<file>", methods=["GET"])
def getSubLanguages(file):
    check_auth()
    languages = os.path.join(VIDEOS_FOLDER,file,"subs/languages.txt")
    if not os.path.exists(languages):
        return jsonify({"error": "No existen subtitulos para este archivo"})
    # Abre el archivo en modo lectura
    with open(languages, "r", encoding="utf-8") as file_subs:
        # Lee todas las líneas del archivo y las guarda en una lista
        lines = file_subs.readlines()
    lines = [line.strip() for line in lines]
    return jsonify({"languages": lines})


def is_video(file):
    """Verifica si el archivo es un video utilizando ffprobe sin cargar el archivo entero en memoria."""
    try:
        
        # Usamos un subprocess para pasar el archivo sin necesidad de leerlo todo en memoria
        command = [
            "ffprobe", "-v", "error", "-show_streams", "-select_streams", "v:0", "-i", "pipe:0"
        ]
        
        # Ejecutamos el comando con el archivo pasado directamente. 20MB
        result = subprocess.run(command, input=file.read(20 * 1024 * 1024), stdout=subprocess.PIPE, stderr=subprocess.PIPE)  # Lee solo los primeros 4KB del archivo

        # Si el comando ffprobe encuentra un flujo de video, consideramos que es un video
        if result.returncode == 0 and result.stdout:
            # Regresa el puntero al inicio del archivo
            file.seek(0)
            return True
        else:
            return False
    except Exception as e:
        print(f"Error al verificar el archivo: {e}")
        return False

def is_image(file):
    """Verifica si el archivo es una imagen utilizando Pillow."""
    try:
        # Intenta abrir el archivo como una imagen en memoria
        image = Image.open(BytesIO(file.read()))
        image.verify()  # Verifica si es una imagen válida
        file.seek(0)
        return True
    except (IOError, SyntaxError):
        # Si no es una imagen válida, se lanza una excepción
        return False

if __name__ == "__main__":
    app.run(host="localhost", port=5000)
