import { apiPost } from "./api.js";

export async function registro(username, email, password) {
    const data = { username, email, password };
    try {
        const response = await apiPost("http://localhost:8000/register", data);
        return response;
    } catch (error) {
        console.error("Error en la solicitud de registro:", error.message);
        return { success: false, message: error.message };
    }
}
