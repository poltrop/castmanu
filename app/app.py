from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi_jwt_auth import AuthJWT
from fastapi_jwt_auth.exceptions import AuthJWTException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from datetime import timedelta
from database import Castmanu

app = FastAPI()
db = Castmanu()
ALGORITHM = "HS256"

# Configuración del JWT
class Settings(BaseModel):
    authjwt_secret_key: str = "secretcastmanu"
    authjwt_token_location: set = {"cookies"}
    authjwt_cookie_csrf_protect: bool = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500","https://www.castmanu.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        user_claims={"id": usuario["id"]}  # Información adicional
    )
    response = JSONResponse({"success": True})
    Authorize.set_access_cookies(access_token, response)
    return response

# Endpoint para verificar si el usuario está autenticado
@app.get("/check-auth")
async def check_auth(Authorize: AuthJWT = Depends()):
    try:
        Authorize.jwt_required()
        current_user = Authorize.get_jwt_subject()
        claims = Authorize.get_raw_jwt()
        return {
            "username": current_user,
            "id": claims.get("id")
        }
    except Exception:
        raise HTTPException(status_code=401, detail="No autorizado")

@app.post("/logout")
async def logout(Authorize: AuthJWT = Depends()):
    # Eliminar las cookies de acceso
    response = JSONResponse({"success": True, "message": "Logout exitoso"})
    Authorize.unset_jwt_cookies(response)  # Esto elimina las cookies del cliente
    return response

@app.post("/register")
async def register_user(request: RegisterRequest):
    result = await db.register(request.username, request.email, request.password)
    
    if "detail" in result:
        raise HTTPException(status_code=400, detail=result["detail"])
    
    return result