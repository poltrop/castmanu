import os
import subprocess
import time
import json
import logging
from watchdog.events import FileSystemEventHandler
from watchdog.observers.polling import PollingObserver

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

# Carpeta a monitorear
monitor_folder = "/media/transform"
video_folder = "/media/videos"

# Función para comprobar capitulo, con formato inicial ***capitulo***
def comprobarCapitulo(texto):
    if texto.startswith('***'):
        fin = texto.find('***', 3)
        if fin != -1:
            contenido = texto[3:fin]
            if contenido.isdigit():
                numero = contenido
                resto = texto[fin+3:].lstrip()
                return numero, resto
    return None, texto

# Función para extraer el tipo del video, con formato inicial ^^^tipo^^^
def extraerTipo(texto):
    fin = texto.find('^^^', 3)
    if fin != -1:
        contenido = texto[3:fin]
        resto = texto[fin+3:].lstrip()
        return contenido, resto

# Función para esperar a que un archivo termine de renombrarse
def wait_for_file(file_path, timeout=80):
    """Espera a que un archivo deje de cambiar de tamaño antes de procesarlo."""
    prev_size = -1
    while timeout > 0:
        try:
            size = os.path.getsize(file_path)
            if size == prev_size:
                return True  # El archivo ya no está cambiando
            prev_size = size
        except PermissionError:
            pass  # Si no se puede acceder, esperamos
        time.sleep(1)
        timeout -= 1
    return False

def bitrate_audio(canales):
    match canales:
        case "1":
            return "128k"
        case "6":
            return "640k"
        case "8":
            return "768k"
        case _: #Esto es el default
            return "320k"
        
def elegir_idioma(idioma,indice):
    match idioma:
        case "spa":
            return "Español"
        case "eng":
            return "Inglés"
        case "cat":
            return "Catalán"
        case "glg":
            return "Gallego"
        case _:
            return f"Idioma_{indice+1}"

# Función para procesar el archivo con FFmpeg
def process_file(input_file):
    try:
        # Verifica si el archivo existe antes de intentar procesarlo
        if not os.path.exists(input_file):
            print(f"El archivo {input_file} no existe o fue movido.")
            return

        # Esperar a que el archivo termine de copiarse
        if not wait_for_file(input_file):
            print(f"El archivo {input_file} sigue cambiando, no se procesará.")
            return
        
        # Obtener solo el nombre del archivo con extensión
        file_name_with_extension = os.path.basename(input_file)

        # Obtener nombre sin extensión y extensión original
        file_base, file_ext = os.path.splitext(file_name_with_extension)
        
        tipo, file_base = extraerTipo(file_base)
        capitulo, file_base = comprobarCapitulo(file_base)
        
        final_folder = os.path.join(video_folder, tipo)
        os.chdir(final_folder)
        os.chdir(file_base)
        if capitulo:
            os.chdir(capitulo)
        if os.path.exists("segment_000_0.ts"): # Esto evita que se duplique el trabajo en caso de que haya habido algun fallo y el user haya intentado resubirlo
            return
        # EN ESTE PUNTO ESTAMOS DENTRO DE LA CARPETA DEL NUEVO VIDEO
        logger.info("Comenzando transformacion")
        # Comando FFmpeg
        comando_info = f"ffprobe -loglevel quiet -print_format json -show_streams '{input_file}'"
        info = subprocess.check_output(comando_info, shell=True)
        info = json.loads(info)

        contador_subs=0
        lengua_subs=[]
        comando_subs = f"ffmpeg -loglevel quiet -i '{input_file}'"
        for stream in info.get("streams"):
            if stream.get("codec_type") == "subtitle":
                if contador_subs == 0:
                    os.mkdir("subs")
                comando_subs += f' -map 0:s:{contador_subs} subs/subs_{contador_subs}.vtt'
                lengua_subs.append(stream.get("title") or elegir_idioma(stream.get("language") or stream.get("tags").get("language"),contador_subs))
                contador_subs += 1

        comando_subs += f' -c:s webvtt'
        #print(comando)
        subprocess.run(comando_subs, shell=True)
        if contador_subs != 0:
            with open("subs/languages.txt", "w") as file:
                for lengua in lengua_subs:
                    file.write(f"{lengua}\n")  # Agrega cada línea al final del archivo

        # Contador para nombrar las pistas de audio
        contador_audio = 0
        bitrate_aud = "320k" # Le ponemos este valor por defecto por si algo falla
        lengua_audios = [] # Lo usamos luego para modificar el master
        # Constructor del megacomando ffmpeg
        comando = f"ffmpeg -loglevel quiet -hwaccel cuda -i '{input_file}'"
        # Recorrer las pistas de audio y generar los comandos
        for stream in info.get("streams"):
            if stream.get("codec_type") == "video":
                if stream.get("codec_name") != "h264":
                    comando += " -map 0:v:0 -c:v h264_nvenc -cq 19 -b:v 5M"
                else:
                    comando += " -map 0:v:0 -c:v copy"

            if stream.get("codec_type") == "audio":
                if stream.get("codec_name") != "aac":
                    comando += f' -map 0:a:{contador_audio} -c:a:{contador_audio} aac -b:a:{contador_audio} {bitrate_audio(stream.get("channels"))} -ar 48000 -ac {stream.get("channels")}'
                else:
                    comando += f' -map 0:a:{contador_audio} -c:a:{contador_audio} copy'
                lengua_audios.append(stream.get("title") or elegir_idioma(stream.get("language") or stream.get("tags").get("language"),contador_audio))
                contador_audio += 1

        comando += f' -hls_time 10 -hls_playlist_type vod -hls_segment_filename "segment_%03d_%v.ts" -var_stream_map "v:0,agroup:aud'
        for index,audio in enumerate(lengua_audios):
            comando += f' a:{index},agroup:aud,{"default:yes," if index == 0 else ""}name:{audio}'
        comando += f'" -f hls -y -hls_flags independent_segments -hls_list_size 0 -master_pl_name master.m3u8 playlist_%v.m3u8'
        # Ejecutar el comando HLS
        #print(comando)
        subprocess.run(comando, shell=True)

        with open("master.m3u8", "r", encoding="utf-8") as f:
            lineas = f.readlines()

        nuevas_lineas = []
        contador = 1

        for linea in lineas:
            if f'NAME="audio_{contador}"' in linea:
                linea = linea.replace(f'NAME="audio_{contador}"', f'NAME="{lengua_audios[contador - 1]}"')
                contador += 1
            nuevas_lineas.append(linea)

        with open("master.m3u8", "w", encoding="utf-8") as f:
            f.writelines(nuevas_lineas)

        os.remove(input_file)
        logger.info("Completado con éxito!")
    except Exception as e:
        logger.info(f"Error: {str(e)}")

# Clase para manejar eventos de archivos en la carpeta monitoreada
class VideoFileHandler(FileSystemEventHandler):
    def __init__(self):
        self.processing = False

    def on_created(self, event):
        if event.is_directory:
            return
        
        if not self.processing:
            self.processing = True
            print(f"Archivo detectado: {event.src_path}")
            try:
                process_file(event.src_path)
            except Exception as e:
                print(f"Error procesando archivo: {e}")
            finally:
                self.processing = False
        else:
            print("Procesando archivo, esperando a que termine.")

# Configurar el observador
event_handler = VideoFileHandler()
observer = PollingObserver()
observer.schedule(event_handler, monitor_folder, recursive=False)

# Iniciar la observación
observer.start()

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    observer.stop()

observer.join()