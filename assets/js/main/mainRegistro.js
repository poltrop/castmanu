// assets/js/mainRegister.js
import { registro } from "../registro.js";
import { tailwindConfig } from "../config.js";

document.addEventListener("DOMContentLoaded", () => {
    tailwind.config = tailwindConfig; // Cargamos la configuración de Tailwind
    const registerForm = document.getElementById("registerForm");
    const usernameError = document.getElementById("usernameError");
    const emailError = document.getElementById("emailError");
    const passwordError = document.getElementById("passwordError");
    const confirmPasswordError = document.getElementById("confirmPasswordError");
    const successMessage = document.getElementById("successMessage");

    function showError(element, message) {
        element.textContent = message;
        element.classList.remove("hidden");
    }

    function hideError(element) {
        element.textContent = "";
        element.classList.add("hidden");
    }

    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.classList.remove("hidden");
    }

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        // Limpiar mensajes previos
        hideError(usernameError);
        hideError(emailError);
        hideError(passwordError);
        hideError(confirmPasswordError);
        successMessage.classList.add("hidden");

        const username = document.getElementById("username").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();
        const confirmPassword = document.getElementById("confirmPassword").value.trim();
        let hayError = false;

        // Verificaciones básicas
        if (!username) {
            showError(usernameError, "El nombre de usuario es obligatorio.");
            hayError = true;
        }
        if (/^\d+$/.test(username)) {
            showError(usernameError, "El nombre de usuario no puede contener solo números.");
            hayError = true;
        }
        if (!email) {
            showError(emailError, "El correo electrónico es obligatorio.");
            hayError = true;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showError(emailError, "El formato del correo electrónico no es válido.");
            hayError = true;
        }
        if (!password) {
            showError(passwordError, "La contraseña es obligatoria.");
            hayError = true;
        }
        if (password.length < 8) {
            showError(passwordError, "La contraseña debe tener al menos 8 caracteres.");
            hayError = true;
        }
        if (password !== confirmPassword) {
            showError(confirmPasswordError, "Las contraseñas no coinciden.");
            hayError = true;
        }
        if (hayError){
            return;
        }

        try {
            const response = await registro(username, email, password);
            if (response.success) {
                showSuccess("¡Registro exitoso! Redirigiendo al login...");
                setTimeout(() => {
                    window.location.href = "../login.html";
                }, 500);
            } else {
                showError(usernameError, `Error al registrar: ${response.message || "Desconocido"}`);
            }
        } catch (error) {
            console.error("Error en el registro:", error.message);
            showError(usernameError, "Error al conectar con el servidor.");
        }
    });
});
