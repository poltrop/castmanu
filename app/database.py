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
        conn = await self.get_connection()
        try:
            async with conn.cursor() as cursor:
                await cursor.execute(query, params)
                return await cursor.fetchall() if multiple else await cursor.fetchone()
        finally:
            self.pool.release(conn)
            
    
    # Inicia una transaccion
    async def init_transaction(self):
        conn = await self.get_connection()
        cursor = await conn.cursor()
        await conn.begin()
        return conn, cursor
    
    # Añadir operaciones a la transacción.
    async def add_to_transaction(self, cursor, query: str, params: tuple = ()):
        await cursor.execute(query, params)
        return await cursor.fetchone()
    
    # Finaliza la transacción (commit o rollback).
    async def finish_transaction(self, conn, cursor, commit=True):
        if commit:
            await conn.commit()
        else:
            await conn.rollback()
        await cursor.close()
        self.pool.release(conn)

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
        params.append(offset)
        films = await self.fetch(query, tuple(params), True)

        genres_map = await self.fetch("SELECT idFilm, genre FROM film_genres INNER JOIN genres ON idGenre = id", (), True)
        capitulos_map = await self.fetch("SELECT idSerie, capitulo FROM serie_capitulos", (), True)

        # Agrupamos los géneros por id de película y capitulos por serie
        generos_por_pelicula = defaultdict(list)
        capitulos_por_serie = defaultdict(list)
        for row in genres_map:
            generos_por_pelicula[row["idFilm"]].append(row["genre"])
        for row in capitulos_map:
            capitulos_por_serie[row["idSerie"]].append(row["capitulo"])

        # Añadir los géneros a cada film y capitulos a cada serie
        for film in films:
            film["genres"] = generos_por_pelicula.get(film["id"], [])
        for serie in films:
            serie["capitulos"] = capitulos_por_serie.get(serie["id"], [])

        return {"peliculas": films, "total_paginas": total_paginas["total"]}
    
    # Esto devuelve la info de 1 peli concreta
    async def get_film(self, id):
        # Primero conseguimos todos los elementos
        film = await self.fetch("SELECT id, title, type, sinopsis, poster, file FROM films WHERE id = %s", (id))
        genres_map = await self.fetch("SELECT idFilm, genre FROM film_genres INNER JOIN genres ON idGenre = id WHERE idFilm = %s", (id), True)

        # Agrupamos los géneros por id de película
        generos_por_pelicula = defaultdict(list)
        for row in genres_map:
            generos_por_pelicula[row["idFilm"]].append(row["genre"])

        # Añadir los géneros a cada film
        film["generos"] = generos_por_pelicula.get(film["id"], [])
        film.pop("id")

        return film
    
    # Añadir pelicula o elemento
    async def add_film(self, id, title, type, sinopsis, poster_format, uploader, generos):
        
        admin = await self.isAdmin(uploader)

        if not admin["success"]:
            return admin

        existe = await self.fetch("SELECT * FROM films WHERE title = %s AND type = %s",(title, type))

        if existe:
            return {"success": False, "message": "Lo que intentas añadir ya existe"}
        
        file = f'https://castmanu.ddns.net/videos/{type}/{title}'

        poster = None
        if poster_format:
            if poster_format.startswith("http"):
                poster = poster_format
            else:
                poster = f'https://castmanu.ddns.net/videos/{type}/{title}/poster/{title}.{poster_format}'

        # Iniciar transacción
        conn, cursor = await self.init_transaction()
        try:
            if id:
                idFetch = await self.add_to_transaction(cursor, "INSERT INTO films(id, title, type, sinopsis, poster, file, uploader) VALUES(%s, %s, %s, %s, %s, %s, %s) RETURNING id",(id, title, type, sinopsis, poster, file, uploader))
            else:
                idFetch = await self.add_to_transaction(cursor, "INSERT INTO films(title, type, sinopsis, poster, file, uploader) VALUES(%s, %s, %s, %s, %s, %s) RETURNING id",(title, type, sinopsis, poster, file, uploader))
            if generos:
                insertGeneros = ""
                for genero in generos:
                    insertGeneros += f" ({idFetch["id"]}, {self.mapGenero(genero)}),"
                insertGeneros = insertGeneros[:-1]
                await self.add_to_transaction(cursor, f"INSERT INTO film_genres VALUES{insertGeneros}")

            # Si todo fue bien, confirmamos la transacción
            await self.finish_transaction(conn, cursor)
            return {"success": True, "message": "Pelicula añadida", "id": idFetch["id"]}
        except Exception as e:
            # Si algo falla, revertimos la transacción
            await self.finish_transaction(conn, cursor, commit=False)
            return {"success": False, "message": f"Error al añadir la película: {e}"}
        
    # Añadir capitulo
    async def add_capitulo(self, idSerie, capitulo, uploader):
        
        admin = await self.isAdmin(uploader)

        if not admin["success"]:
            return admin

        existe = await self.fetch("SELECT * FROM serie_capitulos WHERE idSerie = %s and capitulo = %s",(idSerie, capitulo))

        if existe:
            return {"success": False, "message": "El capitulo que intentas añadir ya existe"}

        await self.fetch("INSERT INTO serie_capitulos VALUES(%s, %s)",(idSerie, capitulo))
        return {"success": True, "message": "Capitulo añadido"}
    
    # Eliminar pelicula o elemento
    async def delete_film(self, id, capitulo, deleter):

        admin = await self.isAdmin(deleter)

        if not admin["success"]:
            return admin
        
        if capitulo:
            datos = await self.fetch("DELETE FROM serie_capitulos WHERE idSerie = %s AND capitulo = %s RETURNING *",(id, capitulo))
            datos["borrado"] = "capitulo"
        else:
            genres_map = await self.fetch("SELECT idFilm, genre FROM film_genres INNER JOIN genres ON idGenre = id WHERE idFilm = %s", (id), True)
            capitulos_map = await self.fetch("SELECT idSerie, capitulo FROM serie_capitulos WHERE idSerie = %s", (id), True)

            datos = await self.fetch("DELETE FROM films WHERE id = %s RETURNING *",(id))

            # Agrupamos los géneros por id de película
            generos_por_pelicula = defaultdict(list)
            capitulos_por_serie = defaultdict(list)
            for row in genres_map:
                generos_por_pelicula[row["idFilm"]].append(row["genre"])
            for row in capitulos_map:
                capitulos_por_serie[row["idSerie"]].append(row["capitulo"])

            # Añadir los géneros a cada film
            datos["generos"] = generos_por_pelicula.get(datos["id"], [])
            datos["capitulos"] = capitulos_por_serie.get(datos["id"], [])
            datos["borrado"] = "entero"

        return {"success": True, "message": "Pelicula eliminada", "datos": datos}
    
    # Editar pelicula o elemento
    async def edit_film(self, id, title, type, sinopsis, poster_format, editor, generos):

        admin = await self.isAdmin(editor)

        if not admin["success"]:
            return admin
        
        current = await self.get_film(id)
        if not current:
            return {"success": False, "message": "Película no encontrada"}

        # Preparar nuevo poster
        poster = None
        new_title = title if title else current["title"]
        new_type = type if type else current["type"]

        if title or type:
            existe = await self.fetch("SELECT * FROM films WHERE title = %s AND type = %s", (new_title, new_type))
            if existe:
                return {"success": False, "message": "El titulo + tipo al que intentas cambiar ya existe. Por favor elige otro"}

        if poster_format == "delete":
            poster = "delete"
        elif poster_format is not None:
            poster = f"https://castmanu.ddns.net/videos/{new_type}/{new_title}/poster/{new_title}.{poster_format}"
        elif current["poster"] and current["poster"].startswith("https://castmanu.ddns.net"):
            # Poster interno: conservar el nombre del archivo
            filename = current["poster"].split("/poster/")[-1]
            if title or type:
                poster = f"https://castmanu.ddns.net/videos/{new_type}/{new_title}/poster/{filename}"

        # Preparar nuevo file
        file = f"https://castmanu.ddns.net/videos/{new_type}/{new_title}" if title or type else None

        # Armar diccionario de campos a actualizar
        fields = {}
        if title: fields["title"] = title
        if type: fields["type"] = type
        if sinopsis: fields["sinopsis"] = sinopsis
        if poster == "delete":
            fields["poster"] = None
        elif poster:
            fields["poster"] = poster
        if file: fields["file"] = file
        fields["uploader"] = editor


        # Construir query
        set_clause = ", ".join([f"{key} = %s" for key in fields])
        query = f"UPDATE films SET {set_clause} WHERE id = %s"

        params = tuple(fields.values()) + (id,)

        # Iniciar transacción
        conn, cursor = await self.init_transaction()
        try:
            await self.add_to_transaction(cursor, query, params)

            # Parte de generos
            if generos == [] or generos:
                await self.add_to_transaction(cursor, "DELETE FROM film_genres WHERE idFilm = %s",(id))
                insertGeneros = ""
                for genero in generos:
                    insertGeneros += f" ({id}, {self.mapGenero(genero)}),"
                insertGeneros = insertGeneros[:-1]
                if insertGeneros:
                    await self.add_to_transaction(cursor, f"INSERT INTO film_genres VALUES{insertGeneros}")
            
            await self.finish_transaction(conn, cursor)
            return {"success": True, "message": "Pelicula editada"}
        
        except Exception as e:
            # Si algo falla, revertimos la transacción
            await self.finish_transaction(conn, cursor, commit=False)
            return {"success": False, "message": f"Error al editar la película: {e}"}
    
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