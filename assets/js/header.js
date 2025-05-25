import { apiGet } from "./api.js";
import { tailwindConfig } from "./config.js";
import { logout } from "./logout.js";

export async function initHeader(admin, home = false) {
    tailwind.config = tailwindConfig; // Cargamos la configuración de Tailwind
    let adminAdded = await constructHeader(admin, home);
    let profileButton = document.getElementById("profileButton");
    let profileMenu = document.getElementById("profileMenu");
    let menuToggle = document.getElementById("menuToggle");
    let menu = document.getElementById("menu");
    toggleMenu(profileButton, profileMenu);
    toggleMenu(menuToggle, menu);

    if (adminAdded) {
        let adminButton = document.getElementById("adminButton");
        let adminMenu = document.getElementById("adminMenu");
        toggleMenu(adminButton, adminMenu);
    }
}

function toggleMenu(button, menu) {
    button.addEventListener("click", (event) => {
        menu.classList.toggle("hidden");
    });

    // Manejamos el clic fuera del menú para cerrarlo
    document.addEventListener("click", (event) => {
        if (!menu.contains(event.target) && event.target !== button) {
            menu.classList.add("hidden");
        }
    });
}

async function constructHeader(admin, home) {
    let adminAdded = false;
    let header = document.createElement("header");
    header.className = "bg-steel-blue sticky top-0 w-full h-16 p-4 shadow-lg flex items-center justify-between z-10";

    // Botón de sidebar (solo si home)
    if (home) {
        let sidebarToggle = document.createElement("button");
        sidebarToggle.id = "sidebarToggle";
        sidebarToggle.className = "bg-steel-blue px-4 py-2 rounded-md text-neon-cyan font-bold";
        sidebarToggle.textContent = "☰";
        header.appendChild(sidebarToggle);
    }

    // Logo
    let logo = document.createElement("a");
    logo.href = "home.html";
    logo.className = "text-neon-cyan text-xl font-bold md:text-2xl me-2";
    logo.textContent = "ManuCast";
    header.appendChild(logo);

    // Extra elementos para home: búsqueda + filtros
    if (home) {
        let searchWrapper = extraHome();
        header.appendChild(searchWrapper);
    }

    // Botón menú hamburguesa
    let menuToggle = document.createElement("button");
    menuToggle.id = "menuToggle";
    menuToggle.className = "md:hidden bg-gray-blue/50 px-4 py-2 rounded-md text-midnight-blue font-bold ms-2";
    menuToggle.textContent = "☰";
    header.appendChild(menuToggle);

    // Menú de navegación
    let nav = document.createElement("nav");
    nav.id = "menu";
    nav.className = "hidden absolute top-16 right-4 bg-steel-blue p-4 rounded-md shadow-lg flex flex-col gap-2 md:flex md:relative md:top-auto md:right-auto md:bg-transparent md:p-0 md:shadow-none md:flex-row md:gap-2";

    // Enlace Home
    let homeLink = document.createElement("a");
    homeLink.href = "home.html";
    homeLink.className = "text-center w-24 bg-neon-cyan px-4 py-2 mt-2 md:mt-0 rounded-md text-midnight-blue font-bold hover:scale-105 transition";
    homeLink.textContent = "Home";
    nav.appendChild(homeLink);

    if (await serverAlive() && admin) {
        // Admin Dropdown
        let adminContainer = createDropdownMenu("adminButton", "Admin", [
            { href: "buscar.html", text: "Añadir", top: true },
            { href: "home.html?eliminar=true", text: "Eliminar" },
            { href: "home.html?editar=true", text: "Editar", bottom: true }
        ]);
        nav.appendChild(adminContainer);
        adminAdded = true;
    }

    // Profile Dropdown
    let profileContainer = createDropdownMenu("profileButton", "Perfil", [
        { href: "passwordChange.html", text: "Cambiar Contraseña", top: true },
        { text: "Cerrar Sesión", bottom: true }
    ]);
    
    nav.appendChild(profileContainer);

    header.appendChild(nav);
    let target = document.getElementById("app") || document.body;
    target.prepend(header);
    return adminAdded;
}

function extraHome() {
    // 1. Div del input
    let searchWrapper = document.createElement("div");
    searchWrapper.className = "flex gap-4 w-1/2";

    let searchInput = document.createElement("input");
    searchInput.id = "searchInput";
    searchInput.type = "text";
    searchInput.placeholder = "Buscar...";
    searchInput.className = "w-full me-2 p-2 rounded-md bg-deep-black text-gray-blue focus:ring-2 focus:ring-neon-cyan";

    searchWrapper.appendChild(searchInput);

    return searchWrapper;
}

function createDropdownMenu(buttonId, buttonText, links) {
    let container = document.createElement("div");
    container.className = "relative";

    let button = document.createElement("button");
    button.id = buttonId;
    button.className = "w-24 bg-gray-blue/50 px-4 py-2 rounded-md text-midnight-blue font-bold hover:scale-105 transition";
    button.textContent = buttonText;

    let menu = document.createElement("div");
    menu.id = `${buttonId.replace("Button", "Menu")}`;
    menu.className = "absolute right-0 mt-2 w-48 bg-steel-blue text-gray-blue rounded-xl shadow-lg hidden flex flex-col z-50 divide-y divide-gray-blue/30";

    links.forEach(({ href, text, top, bottom }) => {
        let link;
        if (text == "Cerrar Sesión"){
            link = document.createElement("button");
            link.textContent = text;
            link.className = "block px-4 py-3 font-semibold hover:bg-neon-cyan hover:text-midnight-blue transition" +
                (top ? " rounded-t-xl" : "") +
                (bottom ? " rounded-b-xl" : "");
            link.addEventListener('click', logout);
        } else {
            link = document.createElement("a");
            link.href = href;
            link.textContent = text;
            link.className = "block px-4 py-3 font-semibold hover:bg-neon-cyan hover:text-midnight-blue transition" +
                (top ? " rounded-t-xl" : "") +
                (bottom ? " rounded-b-xl" : "");
        }
        menu.appendChild(link);
    });

    container.appendChild(button);
    container.appendChild(menu);
    return container;
}

async function serverAlive() {
    return await apiGet("http://localhost:8000/alive");
}