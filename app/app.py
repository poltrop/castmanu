from enum import Enum
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from fastapi_jwt_auth import AuthJWT
from fastapi_jwt_auth.exceptions import AuthJWTException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from datetime import timedelta
from database import Castmanu
import httpx

app = FastAPI()
db = Castmanu()
ALGORITHM = "HS256"
API_TMDB = "8fe8becc27e4739f30660cf386fbcec2"
API_SERVER = "castmanu"
URL_TMDB = "https://api.themoviedb.org/3"
URL_SERVER = "https://castmanu.ddns.net"
PREPARAMS_TMDB= f"api_key={API_TMDB}&language=es-ES"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500", "http://localhost:5500","https://www.castmanu.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuración del JWT
class Settings(BaseModel):
    authjwt_secret_key: str = "secretcastmanu"
    authjwt_token_location: set = {"cookies"}
    authjwt_cookie_csrf_protect: bool = False
    authjwt_cookie_secure: bool = True
    authjwt_cookie_samesite: str = "none"


@AuthJWT.load_config
def get_config():
    return Settings()

# Manejo de excepciones de autenticación
@app.exception_handler(AuthJWTException)
def authjwt_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message}
    )

# Modelo de usuario
class User(BaseModel):
    username: str
    password: str

class RegisterRequest(User):
    email: str

class UpdateVolume(BaseModel):
    volumen: float

class UpdateSettings(BaseModel):
    id: int
    capitulo: Optional[int] = None
    tiempo: Optional[int] = None
    idioma: Optional[str] = None
    subs: Optional[str] = None

class FilmType(str, Enum):
    serie = "Serie"
    pelicula = "Pelicula"
    otro = "Otro"

class Film(BaseModel):
    id: Optional[int] = None
    title: str
    type: FilmType
    sinopsis: Optional[str] = None
    poster_format: Optional[str] = None
    generos: Optional[List[str]] = None
    extension: Optional[str] = None

class Edit(BaseModel):
    id: int
    title: Optional[str] = None
    type: Optional[FilmType] = None
    sinopsis: Optional[str] = None
    poster_format: Optional[str] = None
    generos: Optional[List[str]] = None

class Capitulo(BaseModel):
    idSerie: int
    capitulo: int
    extension: str

# Cierra la pool de conexiones
@app.on_event("shutdown")
async def shutdown():
    await db.close_pool()

# Endpoint de Login
@app.post("/login")
async def login(user: User, Authorize: AuthJWT = Depends()):
    # Verificación de usuario en la "base de datos"
    usuario = await db.login(user.username,user.password)

    if not usuario:
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    # Crear el token de acceso con más información en el payload
    access_token = Authorize.create_access_token(
        subject=user.username,
        expires_time=timedelta(days=30),
        user_claims={"id": usuario["id"], "admin": usuario["admin"]}  # Información adicional
    )
    response = JSONResponse({"success": True})
    Authorize.set_access_cookies(access_token, response)
    return response

# Endpoint para verificar si el usuario está autenticado
@app.get("/check-auth")
async def check_auth(Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()
    current_user = Authorize.get_jwt_subject()
    claims = Authorize.get_raw_jwt()
    return {
        "username": current_user,
        "id": claims.get("id"),
        "admin": claims.get("admin")
    }

@app.post("/logout")
async def logout(Authorize: AuthJWT = Depends()):
    # Eliminar las cookies de acceso
    response = JSONResponse({"success": True, "message": "Logout exitoso"})
    Authorize.unset_jwt_cookies(response)  # Esto elimina las cookies del cliente
    return response

@app.get("/hash-my-password/{password}")
def hash_my_password(password: str):
    try:
        response = db.hash_my_password(password)

        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error de servidor: {e}")

@app.get("/get-all/{pagina}")
async def get_all(pagina: int, titulo: Optional[str] = None, tipo: Optional[str] = None, genero: Optional[List[int]] = Query(None), Authorize: AuthJWT = Depends()):
    try:
        # Verifica que el JWT es válido
        Authorize.jwt_required()
        
        resultados = await db.get_all(pagina, titulo, tipo, genero)

        return resultados

    except HTTPException as e:
        raise HTTPException(status_code=401, detail="No autorizado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error de servidor: {e}")
    
@app.get("/get-film/{id}")
async def get_film(id: int, Authorize: AuthJWT = Depends()):
    try:
        # Verifica que el JWT es válido
        Authorize.jwt_required()
        
        resultados = await db.get_film(id)

        return resultados

    except HTTPException as e:
        raise HTTPException(status_code=401, detail="No autorizado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error de servidor: {e}")
    
@app.get("/get-extension-cap/{id}/{capitulo}")
async def get_extension_cap(id: int, capitulo: int, Authorize: AuthJWT = Depends()):
    try:
        # Verifica que el JWT es válido
        Authorize.jwt_required()
        
        resultados = await db.get_extension_cap(id, capitulo)

        return resultados

    except HTTPException as e:
        raise HTTPException(status_code=401, detail="No autorizado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error de servidor: {e}")
    
@app.post("/add-film")
async def add_film(film: Film, Authorize: AuthJWT = Depends()):
    try:
        # Verifica que el JWT es válido
        Authorize.jwt_required()
        claims = Authorize.get_raw_jwt()
        uploader = claims.get("id")
        resultados = await db.add_film(film.id, film.title, film.type.value, film.sinopsis, film.poster_format, uploader, film.generos, film.extension)

        return resultados

    except HTTPException as e:
        raise HTTPException(status_code=401, detail="No autorizado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error de servidor: {e}")
    
@app.post("/add-capitulo")
async def add_capitulo(capitulo: Capitulo, Authorize: AuthJWT = Depends()):
    try:
        # Verifica que el JWT es válido
        Authorize.jwt_required()
        claims = Authorize.get_raw_jwt()
        uploader = claims.get("id")
        resultados = await db.add_capitulo(capitulo.idSerie, capitulo.capitulo, uploader, capitulo.extension)

        return resultados

    except HTTPException as e:
        raise HTTPException(status_code=401, detail="No autorizado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error de servidor: {e}")
    
@app.delete("/delete-film/{id}")
async def delete_film(id: int, capitulo: Optional[int] = None, Authorize: AuthJWT = Depends()):
    try:
        # Verifica que el JWT es válido
        Authorize.jwt_required()
        claims = Authorize.get_raw_jwt()
        deleter = claims.get("id")
        resultados = await db.delete_film(id, capitulo, deleter)

        return resultados

    except HTTPException as e:
        raise HTTPException(status_code=401, detail="No autorizado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error de servidor: {e}")
    
@app.put("/edit-film")
async def edit_film(film: Edit, Authorize: AuthJWT = Depends()):
    try:
        # Verifica que el JWT es válido
        Authorize.jwt_required()
        claims = Authorize.get_raw_jwt()
        editor = claims.get("id")
        resultados = await db.edit_film(film.id, film.title, film.type.value if film.type else film.type, film.sinopsis, film.poster_format, editor, film.generos)

        return resultados

    except HTTPException as e:
        raise HTTPException(status_code=401, detail="No autorizado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error de servidor: {e}")
    
@app.get("/get-tmdb/{titulo}/{pagina}")
async def get_tmdb(titulo: str, pagina: int, Authorize: AuthJWT = Depends()):
    try:
        # Verifica que el JWT es válido
        Authorize.jwt_required()
        
        async with httpx.AsyncClient() as client:
            resultados = await client.get(f"{URL_TMDB}/search/multi?{PREPARAMS_TMDB}&query={titulo}&page={pagina}")

        if resultados.status_code == 200:
            return resultados.json()
        else:
            raise HTTPException(status_code=resultados.status_code,detail=f"TMDb devolvió un error: {resultados.status_code}")

    except HTTPException as e:
        raise HTTPException(status_code=401, detail="No autorizado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error de servidor: {e}")
    
@app.get("/get-tmdb-movie/{id}")
async def get_tmdb_movie(id: int, Authorize: AuthJWT = Depends()):
    try:
        # Verifica que el JWT es válido
        Authorize.jwt_required()
        
        async with httpx.AsyncClient() as client:
            resultados = await client.get(f"{URL_TMDB}/movie/{id}?{PREPARAMS_TMDB}")

        if resultados.status_code == 200:
            return resultados.json()
        else:
            raise HTTPException(status_code=resultados.status_code,detail=f"TMDb devolvió un error: {resultados.status_code}")

    except HTTPException as e:
        raise HTTPException(status_code=401, detail="No autorizado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error de servidor: {e}")
    
@app.get("/get-tmdb-serie/{id}")
async def get_tmdb_movie(id: int, Authorize: AuthJWT = Depends()):
    try:
        # Verifica que el JWT es válido
        Authorize.jwt_required()
        
        async with httpx.AsyncClient() as client:
            resultados = await client.get(f"{URL_TMDB}/tv/{id}?{PREPARAMS_TMDB}")

        if resultados.status_code == 200:
            return resultados.json()
        else:
            raise HTTPException(status_code=resultados.status_code,detail=f"TMDb devolvió un error: {resultados.status_code}")

    except HTTPException as e:
        raise HTTPException(status_code=401, detail="No autorizado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error de servidor: {e}")
    
@app.get("/get-volume")
async def get_volume(Authorize: AuthJWT = Depends()):
    try:
        # Verifica que el JWT es válido
        Authorize.jwt_required()
        claims = Authorize.get_raw_jwt()
        user = claims.get("id")
        resultados = await db.get_volume(user)

        return resultados

    except HTTPException as e:
        raise HTTPException(status_code=401, detail="No autorizado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error de servidor: {e}")
    
@app.put("/update-volume")
async def update_volume(updateVolume: UpdateVolume, Authorize: AuthJWT = Depends()):
    try:
        # Verifica que el JWT es válido
        Authorize.jwt_required()
        claims = Authorize.get_raw_jwt()
        user = claims.get("id")
        resultados = await db.update_volume(user, updateVolume.volumen)

        return resultados

    except HTTPException as e:
        raise HTTPException(status_code=401, detail="No autorizado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error de servidor: {e}")
    
@app.get("/get-settings/{id}")
async def get_settings(id: int, capitulo: Optional[int] = None, Authorize: AuthJWT = Depends()):
    try:
        # Verifica que el JWT es válido
        Authorize.jwt_required()
        claims = Authorize.get_raw_jwt()
        user = claims.get("id")
        resultados = await db.get_settings(user, id, capitulo)

        return resultados

    except HTTPException as e:
        raise HTTPException(status_code=401, detail="No autorizado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error de servidor: {e}")
    
@app.post("/update-settings")
async def update_settings(updateSettings: UpdateSettings, Authorize: AuthJWT = Depends()):
    try:
        # Verifica que el JWT es válido
        Authorize.jwt_required()
        claims = Authorize.get_raw_jwt()
        user = claims.get("id")
        resultados = await db.update_settings(user, updateSettings.id, updateSettings.capitulo, updateSettings.tiempo, updateSettings.idioma, updateSettings.subs)

        return resultados

    except HTTPException as e:
        raise HTTPException(status_code=401, detail="No autorizado")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error de servidor: {e}")