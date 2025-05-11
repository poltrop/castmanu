import shutil
from flask import Flask, request, abort
from PIL import Image
import os
import subprocess

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 15 * 1024 * 1024 * 1024  # Límite de 15GB
UPLOAD_FOLDER = "/media/tmp"
VIDEOS_FOLDER = "/media/videos"
FOTOS_FOLDER = "/media/fotos"
API_KEY = "castmanu"  # cámbialo por lo que quieras
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB

def check_auth():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer ") or auth.split(" ", 1)[1] != API_KEY:
        abort(401)

@app.route("/upload/<titulo>/<tipo>", methods=["POST"])
def upload(titulo, tipo):
    check_auth()
    if 'file' not in request.files:
        return {"success": False, "message": "No se ha enviado archivo"}
    file = request.files['file']
    filename = titulo + os.path.splitext(file.filename)[1]
    path = os.path.join(VIDEOS_FOLDER, tipo, titulo)
    if not os.path.exists(path):
        os.mkdir(path)
    capitulo = request.args.get("capitulo")
    if capitulo:
        path = os.path.join(path, capitulo)
        if not os.path.exists(path):
            os.mkdir(path)
        filename = f"***{capitulo}***" + filename
    filename = f'^^^{tipo}^^^' + filename
    path = os.path.join(path, "original")
    if not os.path.exists(path):
        os.mkdir(path)
    path = os.path.join(path, 'original' + os.path.splitext(file.filename)[1])
    file.save(path)
    if not is_video(path):
        os.remove(path)
        return {"success": False, "message": "El archivo no es un video válido"}
    path_transformado = os.path.join(UPLOAD_FOLDER, filename)
    shutil.copy(path, path_transformado)
    return {"success": True, "message": "Subido con éxito"}

@app.route("/uploadf/<titulo>/<tipo>", methods=["POST"])
def uploadf(titulo, tipo):
    check_auth()
    if 'file' not in request.files:
        return {"success": False, "message": "No se ha enviado archivo"}
    file = request.files['file']
    # Verifica si el archivo es una imagen antes de guardarlo
    if not is_image(file):
        return {"success": False, "message": "El archivo no es una imagen válida"}
    path = os.path.join(VIDEOS_FOLDER, tipo, titulo)
    if not os.path.exists(os.path.join(path, "poster")):
        os.mkdir(os.path.join(path, "poster"))
    path = os.path.join(path, "poster")
    for f in os.listdir(path): # Borramos la foto de dentro si es que la hay
        file_path = os.path.join(path, f)
        if os.path.isfile(file_path):
            os.remove(file_path)
    filename = titulo + os.path.splitext(file.filename)[1]
    path = os.path.join(path, filename)
    file.save(path)
    return {"success": True, "message": "Subido con éxito"}

@app.route("/delete/<titulo>/<tipo>", methods=["DELETE"])
def delete(titulo, tipo):
    check_auth()
    path = os.path.join(VIDEOS_FOLDER, tipo, titulo)
    capitulo = request.args.get("capitulo")
    if capitulo:
        path = os.path.join(path, capitulo)
    if not os.path.exists(path):
        return {"success": False, "message": "No se encuentra el archivo"}
    try:
        shutil.rmtree(path)
    except Exception as e:
        return {"success": False, "message": f"Error al borrar: {str(e)}"}
    return {"success": True, "message": "Borrado con éxito"}

@app.route("/edit-titulo/<titulo>/<tipo>/<cambioTitulo>", methods=["PATCH"])
def edit_titulo(titulo, tipo, cambioTitulo):
    check_auth()
    path_antiguo = os.path.join(VIDEOS_FOLDER, tipo, titulo)
    path_nuevo = os.path.join(VIDEOS_FOLDER, tipo, cambioTitulo)
    if not os.path.exists(path_antiguo):
        return {"success": False, "message": "No se encuentra el archivo"}
    os.rename(path_antiguo, path_nuevo)
    return {"success": True, "message": "Titulo modificado con éxito"}

@app.route("/edit-tipo/<titulo>/<tipo>/<cambioTipo>", methods=["PATCH"])
def edit_tipo(titulo, tipo, cambioTipo):
    check_auth()
    old_path = os.path.join(VIDEOS_FOLDER, tipo, titulo)
    new_path = os.path.join(VIDEOS_FOLDER, cambioTipo, titulo)
    if not os.path.exists(old_path):
        return {"success": False, "message": "No se encuentra el archivo"}
    shutil.move(old_path, new_path)
    return {"success": True, "message": "Tipo modificado con éxito"}

@app.route("/getSubLanguages/<titulo>/<tipo>", methods=["GET"])
def getSubLanguages(titulo, tipo):
    check_auth()
    capitulo = request.args.get("capitulo")
    languages = ""
    if capitulo:
        languages = os.path.join(VIDEOS_FOLDER, tipo, titulo, capitulo, "subs", "languages.txt")
    else:
        languages = os.path.join(VIDEOS_FOLDER, tipo, titulo, "subs", "languages.txt")
    if not os.path.exists(languages):
        return {"success": False, "message": "No existen subtitulos para este archivo"}
    # Abre el archivo en modo lectura
    lines = ""
    with open(languages, "r", encoding="utf-8") as file_subs:
        # Lee todas las líneas del archivo y las guarda en una lista
        lines = file_subs.readlines()
    lines = [line.strip() for line in lines]
    return {"success": True, "message": "Subtitulos obtenido con éxito", "languages": lines}


def is_video(file_path):
    try:
        command = [
            "ffprobe", "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=codec_type",
            "-of", "default=noprint_wrappers=1:nokey=1",
            file_path
        ]
        result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        return "video" in result.stdout.lower()
    except Exception as e:
        print(f"Error al verificar el archivo: {e}")
        return False

def is_image(file):
    """Verifica si el archivo es una imagen utilizando Pillow."""
    try:
        file.seek(0, os.SEEK_END)
        size = file.tell()
        file.seek(0)
        if size > MAX_IMAGE_SIZE:
            print("Archivo demasiado grande para ser imagen.")
            return False
        # Intenta abrir el archivo como una imagen en memoria
        image = Image.open(file)
        image.verify()  # Verifica si es una imagen válida
        file.seek(0)
        return True
    except (IOError, SyntaxError):
        # Si no es una imagen válida, se lanza una excepción
        return False

if __name__ == "__main__":
    app.run(host="localhost", port=5000)
