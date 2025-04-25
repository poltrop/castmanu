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
            return {"id": user["id"], "admin": user["admin"]}
        return None
    
    async def isAdmin(self, id):
        result = await self.fetch("SELECT * FROM users WHERE id = %s AND admin = 1", (id))
        if not result:
            return {"success": False, "message": "No tienes permisos de administrador"}
        return {"success": True}

    
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
    async def get_all(self, pagina, titulo, tipo, generos):
        offset = (pagina - 1) * 20
        params = []
        where_clauses = []
        join_clause = ""
        having_clause = ""
        group_by = ""
        print(generos)
        
        if generos:
            join_clause = "INNER JOIN film_genres ON IdFilm = id"
            genre_placeholders = ", ".join(["%s"] * len(generos))
            where_clauses.append(f"IdGenre IN ({genre_placeholders})")
            having_clause = f"HAVING COUNT(DISTINCT IdGenre) = {len(generos)}"
            group_by = "GROUP BY id"
            params.extend(generos)

        if titulo:
            where_clauses.append("LOWER(title) LIKE LOWER(%s)")
            params.append(f"%{titulo}%")

        if tipo:
            where_clauses.append("type = %s")
            params.append(tipo)

        where_sql = ""
        if where_clauses:
            where_sql = "WHERE " + " AND ".join(where_clauses)

        count_query = f"SELECT CEIL(COUNT(*) / 20.0) AS total FROM (SELECT id FROM films {join_clause} {where_sql} {group_by} {having_clause}) AS sub"
        total_paginas = await self.fetch(count_query, tuple(params))

        query = f"SELECT id, title, type, poster FROM films {join_clause} {where_sql} {group_by} {having_clause} ORDER BY title LIMIT 20 OFFSET %s"
        print(query)
        print(count_query)
        params.append(offset)
        films = await self.fetch(query, tuple(params), True)

        genres_map = await self.fetch("SELECT idFilm, genre FROM film_genres INNER JOIN genres ON idGenre = id", (), True)

        # Agrupamos los géneros por id de película
        generos_por_pelicula = defaultdict(list)
        for row in genres_map:
            generos_por_pelicula[row["idFilm"]].append(row["genre"])

        # Añadir los géneros a cada film
        for film in films:
            film["genres"] = generos_por_pelicula.get(film["id"], [])

        return {"peliculas": films, "total_paginas": total_paginas["total"]}
    
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
    async def add_film(self, title, type, sinopsis, poster_format, uploader, capitulo, generos, idExt):
        
        admin = await self.isAdmin(uploader)

        if not admin["success"]:
            return admin

        if type == "Serie":
            if (idExt):
                existe = await self.fetch("SELECT * FROM films WHERE idExt = %s AND capitulo = %s",(idExt, capitulo))
            else:
                existe = await self.fetch("SELECT * FROM films WHERE title = %s AND capitulo = %s",(title, capitulo))
            file = f'https://castmanu.ddns.net/videos/{title}/{capitulo}/master.m3u8'
        else:
            if (idExt):
                existe = await self.fetch("SELECT * FROM films WHERE idExt = %s",(idExt))
            else:
                existe = await self.fetch("SELECT * FROM films WHERE title = %s",(title))
            file = f'https://castmanu.ddns.net/videos/{title}/master.m3u8'

        if existe:
            return {"success": False, "message": "Lo que intentas añadir ya existe"}
        
        poster = None
        if poster_format:
            if poster_format.startswith("http"):
                poster = poster_format
            else:
                poster = f'https://castmanu.ddns.net/fotos/{title}.{poster_format}'

        id = await self.fetch("INSERT INTO films(title, type, sinopsis, poster, file, uploader, capitulo, idExt) VALUES(%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",(title, type, sinopsis, poster, file, uploader, capitulo, idExt))
        if generos:
            insertGeneros = ""
            for genero in generos:
                insertGeneros += f" ({id["id"]}, {self.mapGenero(genero)}),"
            insertGeneros = insertGeneros[:-1]
            await self.fetch(f"INSERT INTO film_genres VALUES{insertGeneros}")
        return {"success": True, "message": "Pelicula añadida", "id": id["id"]}
    
    # Eliminar pelicula o elemento
    async def delete_film(self, id, deleter):

        admin = await self.isAdmin(deleter)

        if not admin["success"]:
            return admin
        
        await self.fetch("DELETE FROM film_genres WHERE idFilm = %s",(id))
        await self.fetch("DELETE FROM films WHERE id = %s",(id))

        return {"success": True, "message": "Pelicula eliminada"}
    
    def mapGenero(self, genero):
        mapping = {
            "Acción": 1,
            "Acción y Aventura": 2,
            "Animación": 3,
            "Aventura": 4,
            "Bélica": 5,
            "Ciencia ficción": 6,
            "Ciencia ficción y Fantasía": 7,
            "Comedia": 8,
            "Crimen": 9,
            "Documental": 10,
            "Drama": 11,
            "Familia": 12,
            "Fantasía": 13,
            "Guerra y Política": 14,
            "Historia": 15,
            "Misterio": 16,
            "Música": 17,
            "Niños": 18,
            "Noticias": 19,
            "Película de TV": 20,
            "Reality": 21,
            "Romance": 22,
            "Soap": 23,
            "Suspense": 24,
            "Talk Show": 25,
            "Terror": 26,
            "Western": 27
        }
        return mapping.get(genero)