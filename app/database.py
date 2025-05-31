import aiomysql
from werkzeug.security import check_password_hash, generate_password_hash
from collections import defaultdict
from server_status import update_server_alive, is_server_alive


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
                maxsize=3,
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
    
        if not user or not check_password_hash(user["password"], password):
            return{"success": False, "message": "Usuario o contraseña incorrectos"}
        
        return {"success": True, "message": "Inicio de sesión exitoso!", "id": user["id"], "admin": user["admin"]}
    
    async def isAdmin(self, id):
        result = await self.fetch("SELECT * FROM users WHERE id = %s AND admin = 1", (id))
        if not result:
            return {"success": False, "message": "No tienes permisos de administrador"}
        return {"success": True}
    
    async def isAlive(self):
        await update_server_alive()
        if not is_server_alive():
            return {"success": False, "message": "El servidor está desconectado. Inténtelo mas tarde"}
        return {"success": True}
    
    def hash_my_password(self, password):
        
        # Hash de la contraseña
        hashed_password = generate_password_hash(password)

        return hashed_password
    
    async def change_password(self, user, currentPassword, newPassword):
        usuario = await self.fetch("SELECT * FROM users WHERE id = %s",(user))

        if not check_password_hash(usuario["password"], currentPassword):
            return {"success": False, "message": "La contraseña anterior no es correcta"}
        
        hashed_password = generate_password_hash(newPassword)
        await self.fetch("UPDATE users SET password = %s WHERE id = %s",(hashed_password, user))

        return {"success": True, "message": "Contraseña cambiada con éxito!"}
    
    # Esto devuelve todas las pelis y demas
    async def get_all(self, titulo, tipo, generos):
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

        query = f"SELECT id, title, type, poster FROM films {join_clause} {where_sql} {group_by} {having_clause} ORDER BY lastUpdate DESC"
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

        return {"peliculas": films}
    
    async def get_all_pagination(self, pagina, titulo):
        offset = (pagina - 1) * 20
        params = []
        where_clause = ""
        
        if titulo:
            where_clause = " AND LOWER(title) LIKE LOWER(%s)"
            params.append(f'%{titulo}%')

        count_query = f"SELECT CEIL(COUNT(*) / 20.0) AS total FROM films WHERE type = 'Serie'{where_clause}"
        total_paginas = await self.fetch(count_query, tuple(params))

        query = f"SELECT id, title, type, poster FROM films WHERE type = 'Serie'{where_clause} ORDER BY title LIMIT 20 OFFSET %s"
        params.append(offset)
        series = await self.fetch(query, tuple(params), True)

        genres_map = await self.fetch("SELECT idFilm, genre FROM film_genres INNER JOIN genres ON idGenre = id", (), True)

        # Agrupamos los géneros por id de película y capitulos por serie
        generos_por_pelicula = defaultdict(list)
        for row in genres_map:
            generos_por_pelicula[row["idFilm"]].append(row["genre"])

        # Añadir los géneros a cada film y capitulos a cada serie
        for serie in series:
            serie["genres"] = generos_por_pelicula.get(serie["id"], [])

        return {"series": series, "total_paginas": total_paginas["total"]}
    
    async def get_genres(self):
        genres = await self.fetch("SELECT genre FROM genres", (), True)
        return [row['genre'] for row in genres]
    
    # Esto devuelve la info de 1 peli concreta
    async def get_film(self, id):
        # Primero conseguimos todos los elementos
        film = await self.fetch("SELECT id, title, type, sinopsis, poster, file, extensionOriginal FROM films WHERE id = %s", (id))
        if not film:
            return None
        genres_map = await self.fetch("SELECT idFilm, genre FROM film_genres INNER JOIN genres ON idGenre = id WHERE idFilm = %s", (id), True)
        capitulos_map = await self.fetch("SELECT idSerie, capitulo FROM serie_capitulos WHERE idSerie = %s", (id), True)

        # Agrupamos los géneros por id de película
        generos_por_pelicula = defaultdict(list)
        capitulos_por_serie = defaultdict(list)
        for row in genres_map:
            generos_por_pelicula[row["idFilm"]].append(row["genre"])
        for row in capitulos_map:
            capitulos_por_serie[row["idSerie"]].append(row["capitulo"])

        # Añadir los géneros a cada film
        film["generos"] = generos_por_pelicula.get(film["id"], [])
        film["capitulos"] = capitulos_por_serie.get(film["id"], [])
        film.pop("id")

        return film
    
    async def get_extension_cap(self, id, capitulo):
        # Primero conseguimos todos los elementos
        extension = await self.fetch("SELECT extensionOriginal FROM serie_capitulos WHERE idSerie = %s AND capitulo = %s",(id, capitulo))

        return extension["extensionOriginal"]
    
    # Añadir pelicula o elemento
    async def add_film(self, id, title, type, sinopsis, poster_format, uploader, generos, extension):
        
        admin = await self.isAdmin(uploader)

        if not admin["success"]:
            return admin

        alive = await self.isAlive()

        if not alive["success"]:
            return alive

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
                idFetch = await self.add_to_transaction(cursor, "INSERT INTO films(id, title, type, sinopsis, poster, file, extensionOriginal, uploader) VALUES(%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",(id, title, type, sinopsis, poster, file, extension, uploader))
            else:
                idFetch = await self.add_to_transaction(cursor, "INSERT INTO films(title, type, sinopsis, poster, file, extensionOriginal, uploader) VALUES(%s, %s, %s, %s, %s, %s, %s) RETURNING id",(title, type, sinopsis, poster, file, extension, uploader))
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
    async def add_capitulo(self, idSerie, capitulo, uploader, extension):
        
        admin = await self.isAdmin(uploader)

        if not admin["success"]:
            return admin
        
        alive = await self.isAlive()

        if not alive["success"]:
            return alive

        existe = await self.fetch("SELECT * FROM serie_capitulos WHERE idSerie = %s and capitulo = %s",(idSerie, capitulo))

        if existe:
            return {"success": False, "message": "El capitulo que intentas añadir ya existe"}

        # Iniciar transacción
        conn, cursor = await self.init_transaction()
        try:
            await self.add_to_transaction(cursor, "INSERT INTO serie_capitulos VALUES(%s, %s, %s)",(idSerie, capitulo, extension))
            await self.add_to_transaction(cursor, "UPDATE films SET lastUpdate = CURRENT_TIMESTAMP")
            await self.finish_transaction(conn, cursor)
            return {"success": True, "message": "Capitulo añadido"}
        except Exception as e:
            await self.finish_transaction(conn, cursor, commit=False)
            return {"success": False, "message": f"Error al añadir el capítulo: {e}"}
    
    # Eliminar pelicula o elemento
    async def delete_film(self, id, capitulo, deleter):

        admin = await self.isAdmin(deleter)

        if not admin["success"]:
            return admin
        
        alive = await self.isAlive()

        if not alive["success"]:
            return alive
        
        if capitulo:
            datos = await self.fetch("DELETE FROM serie_capitulos WHERE idSerie = %s AND capitulo = %s RETURNING *",(id, capitulo))
            if not datos:
                return {"success": False, "message": "No se encuentra el capítulo"}
            datos["borrado"] = "capitulo"
        else:
            genres_map = await self.fetch("SELECT idFilm, genre FROM film_genres INNER JOIN genres ON idGenre = id WHERE idFilm = %s", (id), True)
            capitulos_map = await self.fetch("SELECT idSerie, capitulo, extensionOriginal FROM serie_capitulos WHERE idSerie = %s", (id), True)

            datos = await self.fetch("DELETE FROM films WHERE id = %s RETURNING *",(id))
            if not datos:
                return {"success": False, "message": "No se encuentra la película o serie"}

            # Agrupamos los géneros por id de película
            generos_por_pelicula = defaultdict(list)
            capitulos_por_serie = defaultdict(list)
            for row in genres_map:
                generos_por_pelicula[row["idFilm"]].append(row["genre"])
            for row in capitulos_map:
                capitulos_por_serie[row["idSerie"]].append({"capitulo": row["capitulo"], "extension": row["extensionOriginal"]})

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
        
        alive = await self.isAlive()

        if not alive["success"]:
            return alive
        
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
    
    async def get_volume(self, user):
        volume = await self.fetch("SELECT volume FROM users WHERE id = %s", (user))
        
        if not volume["volume"]:
            volume["volume"] = 1
        
        return {"success": True, "message": "Se devuelve el volumen encontrado", "volumen": volume["volume"]}
    
    async def update_volume(self, user, volumen):
        await self.fetch("UPDATE users SET volume = %s WHERE id = %s", (volumen, user))
        
        return {"success": True, "message": "Volumen actualizado con éxito"}
    
    async def get_settings(self, user, id, capitulo):

        if capitulo:
            settings = await self.fetch("SELECT * FROM user_video_settings WHERE idUser = %s AND idFilm = %s AND capitulo = %s", (user, id, capitulo))
        else:
            settings = await self.fetch("SELECT * FROM user_video_settings WHERE idUser = %s AND idFilm = %s", (user, id))
        
        if not settings:
            return {"success": False, "message": "No hay settings para esto de momento"}
        
        return {"success": True, "message": "Se devuelve el tiempo encontrado", "settings": settings}
    
    async def update_settings(self, user, id, capitulo, tiempo, idioma, subs):

        if capitulo:
            existe = await self.fetch("SELECT * FROM user_video_settings WHERE idUser = %s AND idFilm = %s AND capitulo = %s", (user, id, capitulo))
            if not existe:
                await self.fetch("INSERT INTO user_video_settings (idUser, idFilm, capitulo, tiempo, idioma, subs) VALUES (%s, %s, %s, %s, %s, %s)", (user, id, capitulo, tiempo, idioma, subs))
            else:
                updates = []
                params = []

                if tiempo is not None:
                    updates.append("tiempo = %s")
                    params.append(tiempo)
                if idioma is not None:
                    updates.append("idioma = %s")
                    params.append(idioma)
                if subs is not None:
                    updates.append("subs = %s")
                    params.append(subs)

                params += [user, id, capitulo]

                if updates:
                    update_query = f"UPDATE user_video_settings SET {', '.join(updates)} WHERE idUser = %s AND idFilm = %s AND capitulo = %s"
                    await self.fetch(update_query, tuple(params))
                #await self.fetch("UPDATE user_video_settings SET tiempo = %s WHERE idUser = %s AND idFilm = %s AND capitulo = %s", (tiempo, user, id, capitulo))
        else:
            existe = await self.fetch("SELECT * FROM user_video_settings WHERE idUser = %s AND idFilm = %s", (user, id))
            if not existe:
                await self.fetch("INSERT INTO user_video_settings (idUser, idFilm, tiempo, idioma, subs) VALUES (%s, %s, %s, %s, %s)", (user, id, tiempo, idioma, subs))
            else:
                # Si existe, actualiza solo los valores no nulos
                updates = []
                params = []

                if tiempo is not None:
                    updates.append("tiempo = %s")
                    params.append(tiempo)
                if idioma is not None:
                    updates.append("idioma = %s")
                    params.append(idioma)
                if subs is not None:
                    updates.append("subs = %s")
                    params.append(subs)

                params += [user, id]

                if updates:
                    update_query = f"UPDATE user_video_settings SET {', '.join(updates)} WHERE idUser = %s AND idFilm = %s"
                    await self.fetch(update_query, tuple(params))
        
        return {"success": True, "message": "Tiempo actualizado con éxito"}
    
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