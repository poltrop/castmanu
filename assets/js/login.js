import { apiPost } from "./api.js";
export async function login(username, password) {
    const data = { username, password };
    try {
        const response = await apiPost("http://localhost:8000/login", data);
        return response;
    } catch (error) {
        console.error("Error en la solicitud de inicio de sesión:", error.message);
        return { success: false };
    }
}