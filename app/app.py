from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi_jwt_auth import AuthJWT
from fastapi_jwt_auth.exceptions import AuthJWTException
from pydantic import BaseModel
from datetime import timedelta

app = FastAPI()

# Configuración del JWT
class Settings(BaseModel):
    authjwt_secret_key: str = "castmanu"
    authjwt_token_location: set = {"cookies"}
    authjwt_cookie_csrf_protect: bool = False

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

# Datos de usuario "simulados" (en la práctica vendrían de una base de datos)
fake_db = {
    "admin": {
        "password": "12345678",
        "email": "admin@manucast.com",
        "role": "admin"
    },
    "user": {
        "password": "password",
        "email": "user@manucast.com",
        "role": "user"
    }
}

# Endpoint de Login
@app.post("/login")
def login(user: User, Authorize: AuthJWT = Depends()):
    # Verificación de usuario en la "base de datos"
    db_user = fake_db.get(user.username)
    if not db_user or db_user["password"] != user.password:
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    # Crear el token de acceso con más información en el payload
    access_token = Authorize.create_access_token(
        subject=user.username,
        expires_time=timedelta(days=30),
        user_claims={"email": db_user["email"], "role": db_user["role"]}  # Información adicional
    )
    response = JSONResponse({"success": True})
    Authorize.set_access_cookies(access_token, response)
    return response

# Endpoint para verificar si el usuario está autenticado
@app.get("/check-auth")
def check_auth(Authorize: AuthJWT = Depends()):
    try:
        Authorize.jwt_required()
        current_user = Authorize.get_jwt_subject()
        claims = Authorize.get_raw_jwt()
        return {
            "username": current_user,
            "email": claims.get("email"),
            "role": claims.get("role")
        }
    except Exception:
        raise HTTPException(status_code=401, detail="No autorizado")
