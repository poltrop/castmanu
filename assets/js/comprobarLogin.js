import { apiGet } from "./api.js";

export async function autorizado() {
    let respuesta = await apiGet("http://localhost:8000/check-auth");
    return respuesta;
}
