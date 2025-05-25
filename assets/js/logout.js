import { apiGet } from "./api.js";

export async function logout() {
    try {
        await apiGet("http://localhost:8000/logout");
        window.location.href = "login.html"
    } catch (error) {
        console.error("Error en la solicitud de cierre de sesión:", error.message);
        return { success: false };
    }
}