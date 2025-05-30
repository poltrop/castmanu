import { login } from "../login.js";
import { tailwindConfig } from "../config.js";

if (localStorage.getItem("token")) window.location.href = "home.html";
document.addEventListener("DOMContentLoaded", async () => {
    tailwind.config = tailwindConfig; // Cargamos la configuración de Tailwind
    let loginForm = document.getElementById("loginForm");
    let messageContainer = document.getElementById("messageContainer");

    function showMessage(message, type) {
        messageContainer.innerText = message;
        messageContainer.classList.remove("text-red-400", "text-green-600");
        type == "error" ? messageContainer.classList.add("text-red-400"):messageContainer.classList.add("text-green-600");
    }

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        let username = document.getElementById("username").value.trim();
        let password = document.getElementById("password").value.trim();
        let captcha = grecaptcha.getResponse();
        if (username == "" || password == "") return;

        try {
            let response = await login(username, password, captcha);
            if (response.success) {
                localStorage.setItem("token", response.token);
                showMessage(response.message, "success");
                setTimeout(() => {
                    window.location.href = "home.html";
                }, 1000);
            } else {
                showMessage(response.message, "error");
            }
        } catch (error) {
            console.error("Error al iniciar sesión:", error.message);
            showMessage("Error al conectar con el servidor.", "error");
        }
    });

    let toggleButton = document.getElementById("password").nextElementSibling;

    toggleButton.addEventListener("click", () => {
        let input = toggleButton.previousElementSibling;
        let svg = toggleButton.querySelector("svg");

        if (!input || input.tagName != "INPUT") return;

        let isHidden = input.type == "password";
        input.type = isHidden ? "text" : "password";

        // Cambia el icono del ojo
        svg.innerHTML = isHidden
            ? `
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M13.875 18.825A10.05 10.05 0 0112 19
                c-4.478 0-8.269-2.944-9.543-7
                a9.956 9.956 0 012.178-3.217m1.49-1.318A9.953 9.953 0 0112 5
                c4.478 0 8.27 2.944 9.544 7
                a9.953 9.953 0 01-4.276 5.166M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18" />
            `
            : `
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path d="M2.458 12C3.732 7.943 7.523 5
                12 5s8.268 2.943 9.542 7
                c-1.274 4.057-5.065 7-9.542 7
                s-8.268-2.943-9.542-7z" />
            `;
    });
});
