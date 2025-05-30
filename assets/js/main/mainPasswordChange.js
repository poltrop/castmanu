import { apiPost } from "../api.js";
import { initHeader } from "../header.js";
import { jwt_decode } from "../jwt-decode.js";

if (!localStorage.getItem("token")) window.location.href = "login.html";
document.addEventListener("DOMContentLoaded", async () => {
    let decoded = jwt_decode(localStorage.getItem("token"));
    await initHeader(decoded.admin == 1);

    let boton = document.getElementById("changePasswordBtn");
    boton.addEventListener("click", cambiarPassword);

    async function cambiarPassword() {
        let actual = document.getElementById("currentPassword").value;
        let nueva = document.getElementById("newPassword").value.trim();
        let nuevaCheck = document.getElementById("newPasswordCheck").value.trim();
        let passwordMsg = document.getElementById("passwordMsg");

        passwordMsg.innerText = "";

        if (actual.trim().length == 0) {
            passwordMsg.innerText = "Debes introducir tu contraseña actual";
            return;
        }

        if (nueva.length < 6) {
            passwordMsg.innerText = "La nueva contraseña debe tener como mínimo 6 carácteres. No se pueden usar espacios";
            return;
        }

        if (nueva != nuevaCheck) {
            passwordMsg.innerText = "Las contraseñas deben coincidir";
            return;
        }

        let { isConfirmed } = await Swal.fire({
            title: 'Seguro que deseas cambiar la contraseña?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Si',
            cancelButtonText: 'No',
            background: '#1B2A41',
            color: "#00A8E8",
        });

        if (isConfirmed){

            let data = {
                currentPassword: actual,
                newPassword: nueva
            }

            let result = await apiPost("http://localhost:8000/change-password", data);
    
            if (result.success) {
                passwordMsg.classList.remove("text-red-400");
                passwordMsg.classList.add("text-green-600");
                passwordMsg.innerText = result.message;
                setTimeout(() => {
                    window.location.href = "home.html";
                }, 1000);
            } else {
                passwordMsg.innerText = result.message;
            }
        }
    }

    document.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            let activeElement = document.activeElement;

            if (activeElement.tagName === "INPUT" && activeElement.type === "password") {
                e.preventDefault();
                cambiarPassword();
            }
        }
    });

    let toggleButtons = document.querySelectorAll("div button");

    toggleButtons.forEach(button => {
        button.addEventListener("click", () => {
            let input = button.previousElementSibling;
            let svg = button.querySelector("svg");

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
});