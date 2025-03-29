import aiomysql
from werkzeug.security import check_password_hash, generate_password_hash


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
    
    async def register(self, username: str, email: str, password: str, admin: bool = False):
        # Verificar si el email o username ya existen
        existing_user = await self.fetch("SELECT * FROM users WHERE email=%s", (email))
        
        if existing_user:
            return {"detail": "El nombre de usuario o el correo ya están en uso."}
        
        # Hash de la contraseña
        hashed_password = generate_password_hash(password)

        await self.fetch("INSERT INTO users(username, email, password) VALUES(%s, %s, %s)", (username, email, hashed_password))
        return {"success": True, "message": "Usuario registrado con éxito."}