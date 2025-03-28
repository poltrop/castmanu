import { login } from "../login.js";
import { tailwindConfig } from "../config.js";

document.addEventListener("DOMContentLoaded", () => {
    tailwind.config = tailwindConfig; // Cargamos la configuración de Tailwind
    const loginForm = document.getElementById("loginForm");
    const messageContainer = document.getElementById("messageContainer");

    function showMessage(message, type) {
        messageContainer.innerText = message;
        messageContainer.classList.remove("text-red-400", "text-green-600");
        type == "error" ? messageContainer.classList.add("text-red-400"):messageContainer.classList.add("text-green-600");
    }

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value.trim();

        try {
            const response = await login(username, password);
            if (response.success) {
                showMessage("¡Inicio de sesión exitoso!", "success");
                setTimeout(() => {
                    window.location.href = "/dashboard.html";
                }, 500);
            } else {
                showMessage("Usuario o contraseña incorrectos.", "error");
            }
        } catch (error) {
            console.error("Error al iniciar sesión:", error.message);
            showMessage("Error al conectar con el servidor.", "error");
        }
    });
});
