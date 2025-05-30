import { apiPost } from "./api.js";
export async function login(username, password) {
    let data = { username, password };
    try {
        let response = await apiPost("http://localhost:8000/login", data);
        return response;
    } catch (error) {
        return { success: false, message: "Error en la solicitud de inicio de sesión"};
    }
}