import aiomysql
from fastapi import HTTPException
from werkzeug.security import check_password_hash, generate_password_hash
from collections import defaultdict


class Castmanu:
    def __init__(self):
        self.pool = None  # Inicializamos sin pool

    # Crea un pool de conexiones a la base de datos.
    async def setup_pool(self):
        if not self.pool:
            self.pool = await aiomysql.create_pool(
                host='localhost',
                user='root',
                password='calamatzoc',
                db='castmanu',
                charset='utf8mb4',
                autocommit=True,
                minsize=1,
                maxsize=10,
                cursorclass=aiomysql.DictCursor
            )

    # Obtiene una conexión del pool.
    async def get_connection(self):
        if not self.pool:
            await self.setup_pool()
        return await self.pool.acquire()

    # Ejecuta una consulta SQL y devuelve los resultados.
    async def fetch(self, query: str, params: tuple = (), multiple: bool = False):
        async with await self.get_connection() as conn:
            async with conn.cursor() as cursor:
                await cursor.execute(query, params)
                return await cursor.fetchall() if multiple else await cursor.fetchone()

    # Cierra el pool de conexiones cuando la aplicación termina.
    async def close_pool(self):
        if self.pool:
            self.pool.close()
            await self.pool.wait_closed()
            self.pool = None
    
    async def login(self, username: str, password: str):
        user = await self.fetch("SELECT * FROM users WHERE username=%s", (username))
        if user and check_password_hash(user["password"], password):
            return {"id": user["id"]}
        return None
    
    async def isAdmin(self, id):
        result = await self.fetch("SELECT * FROM users WHERE id = %s AND admin = 1", (id))
        if not result:
            raise HTTPException(status_code=401, detail="No autorizado: no eres administrador")
        return True

    
#generate_password_hash(password)
    async def register(self, username: str, email: str, password: str, admin: bool = False):
        # Verificar si el email o username ya existen
        existing_user = await self.fetch("SELECT * FROM users WHERE email=%s", (email))
        
        if existing_user:
            return {"detail": "El nombre de usuario o el correo ya están en uso."}
        
        # Hash de la contraseña
        hashed_password = generate_password_hash(password)

        await self.fetch("INSERT INTO users(username, email, password) VALUES(%s, %s, %s)", (username, email, hashed_password))
        return {"success": True, "message": "Usuario registrado con éxito."}
    
    # Esto devuelve todas las pelis y demas
    async def get_all(self):
        # Primero conseguimos todos los elementos
        films = await self.fetch("SELECT id, title, type, poster FROM films", (), True)
        genres_map = await self.fetch("SELECT idFilm, genre FROM film_genres INNER JOIN genres ON idGenre = id", (), True)

        # Agrupamos los géneros por id de película
        generos_por_pelicula = defaultdict(list)
        for row in genres_map:
            generos_por_pelicula[row["idFilm"]].append(row["genre"])

        # Añadir los géneros a cada film
        for film in films:
            film["genres"] = generos_por_pelicula.get(film["id"], [])

        return films
    
    # Esto devuelve la info de 1 peli concreta
    async def get_film(self,id):
        # Primero conseguimos todos los elementos
        film = await self.fetch("SELECT id, title, type, sinopsis, poster, file FROM films WHERE id = %s", (id))
        genres_map = await self.fetch("SELECT idFilm, genre FROM film_genres INNER JOIN genres ON idGenre = id WHERE idFilm = %s", (id), True)

        # Agrupamos los géneros por id de película
        generos_por_pelicula = defaultdict(list)
        for row in genres_map:
            generos_por_pelicula[row["idFilm"]].append(row["genre"])

        # Añadir los géneros a cada film
        film["genres"] = generos_por_pelicula.get(film["id"], [])
        film.pop("id")

        return film
    
    # Añadir pelicula o elemento
    async def add_film(self, title, type, sinopsis, poster_format, uploader):
        
        await self.isAdmin(uploader)

        file = f'https://castmanu.ddns.net/videos/{title}/master.m3u8'

        poster = None
        if poster_format:
            poster = f'https://castmanu.ddns.net/fotos/{title}.{poster_format}'

        await self.fetch("INSERT INTO films(title, type, sinopsis, poster, file, uploader) VALUES(%s, %s, %s, %s, %s, %s)",(title, type, sinopsis, poster, file, uploader))

        return {"success": True, "message": "Pelicula añadida"}
    
    # Eliminar pelicula o elemento
    async def delete_film(self, id, deleter):

        await self.isAdmin(deleter)

        await self.fetch("DELETE FROM films WHERE id = %s",(id))

        return {"success": True, "message": "Pelicula eliminada"}