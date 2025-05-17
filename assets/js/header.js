import { apiGet } from "./api.js";
import { tailwindConfig } from "./config.js";

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

    if (home) {
        let filterToggle = document.getElementById("filterToggle");
        let filterMenu = document.getElementById("filterMenu");
        toggleMenu(filterToggle, filterMenu);
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
    const header = document.createElement("header");
    header.className = "bg-steel-blue sticky top-0 w-full h-16 p-4 shadow-lg flex items-center justify-between z-10";

    // Botón de sidebar (solo si home)
    if (home) {
        const sidebarToggle = document.createElement("button");
        sidebarToggle.id = "sidebarToggle";
        sidebarToggle.className = "bg-steel-blue px-4 py-2 rounded-md text-neon-cyan font-bold";
        sidebarToggle.textContent = "☰";
        header.appendChild(sidebarToggle);
    }

    // Logo
    const logo = document.createElement("a");
    logo.href = "home.html";
    logo.className = "text-neon-cyan text-xl font-bold sm:text-2xl me-2";
    logo.textContent = "ManuCast";
    header.appendChild(logo);

    // Extra elementos para home: búsqueda + filtros
    if (home) {
        const [searchWrapper, filterWrapper] = extraHome();
        header.appendChild(searchWrapper);
        header.appendChild(filterWrapper);
    }

    // Botón menú hamburguesa
    const menuToggle = document.createElement("button");
    menuToggle.id = "menuToggle";
    menuToggle.className = "lg:hidden bg-gray-blue/50 px-4 py-2 rounded-md text-midnight-blue font-bold";
    menuToggle.textContent = "☰";
    header.appendChild(menuToggle);

    // Menú de navegación
    const nav = document.createElement("nav");
    nav.id = "menu";
    nav.className = "hidden absolute top-16 right-4 bg-steel-blue p-4 rounded-md shadow-lg flex flex-col gap-2 lg:flex lg:relative lg:top-auto lg:right-auto lg:bg-transparent lg:p-0 lg:shadow-none lg:flex-row lg:gap-2";

    // Enlace Home
    const homeLink = document.createElement("a");
    homeLink.href = "home.html";
    homeLink.className = "text-center w-24 bg-neon-cyan px-4 py-2 mt-2 lg:mt-0 rounded-md text-midnight-blue font-bold hover:scale-105 transition";
    homeLink.textContent = "Home";
    nav.appendChild(homeLink);

    if (await serverAlive() && admin) {
        // Admin Dropdown
        const adminContainer = createDropdownMenu("adminButton", "Admin", [
            { href: "buscar.html", text: "Añadir", top: true },
            { href: "home.html?eliminar=true", text: "Eliminar" },
            { href: "home.html?editar=true", text: "Editar", bottom: true }
        ]);
        nav.appendChild(adminContainer);
        adminAdded = true;
    }

    // Profile Dropdown
    const profileContainer = createDropdownMenu("profileButton", "Perfil", [
        { href: "#", text: "Cambiar Contraseña", top: true },
        { href: "#", text: "Cerrar Sesión", bottom: true }
    ]);
    nav.appendChild(profileContainer);

    header.appendChild(nav);
    const target = document.getElementById("app") || document.body;
    target.prepend(header);
    return adminAdded;
}

function extraHome() {
    // 1. Div del input
    const searchWrapper = document.createElement("div");
    searchWrapper.className = "flex gap-4 w-1/2";

    const searchInput = document.createElement("input");
    searchInput.id = "searchInput";
    searchInput.type = "text";
    searchInput.placeholder = "Buscar...";
    searchInput.className = "w-full p-2 rounded-md bg-deep-black text-gray-blue focus:ring-2 focus:ring-neon-cyan";

    searchWrapper.appendChild(searchInput);

    // 2. Div de los botones
    const filterWrapper = document.createElement("div");
    filterWrapper.className = "relative flex items-center";

    const filterToggle = document.createElement("button");
    filterToggle.id = "filterToggle";
    filterToggle.className = "lg:hidden bg-gray-blue/50 px-4 py-2 rounded-md text-midnight-blue font-bold mx-2";
    filterToggle.textContent = "🔍";

    const filterMenu = document.createElement("div");
    filterMenu.id = "filterMenu";
    filterMenu.className = "hidden absolute mx-2 top-12 right-0 bg-steel-blue p-4 rounded-md shadow-lg lg:relative lg:top-auto lg:right-auto lg:bg-transparent lg:p-0 lg:shadow-none lg:flex lg:gap-2";

    const buscarButton = document.createElement("button");
    buscarButton.id = "buscarButton";
    buscarButton.className = "w-24 bg-neon-cyan px-4 py-2 mt-2 lg:mt-0 rounded-md text-midnight-blue font-bold hover:scale-105 transition";
    buscarButton.textContent = "Buscar";

    const cleanButton = document.createElement("button");
    cleanButton.id = "cleanButton";
    cleanButton.className = "w-24 bg-neon-cyan px-4 py-2 mt-2 lg:mt-0 rounded-md text-midnight-blue font-bold hover:scale-105 transition";
    cleanButton.textContent = "Limpiar";

    filterMenu.appendChild(buscarButton);
    filterMenu.appendChild(cleanButton);

    filterWrapper.appendChild(filterToggle);
    filterWrapper.appendChild(filterMenu);

    // ✅ Devolvemos los dos elementos separados, sin agrupar
    return [searchWrapper, filterWrapper];
}

function createDropdownMenu(buttonId, buttonText, links) {
    const container = document.createElement("div");
    container.className = "relative";

    const button = document.createElement("button");
    button.id = buttonId;
    button.className = "w-24 bg-gray-blue/50 px-4 py-2 rounded-md text-midnight-blue font-bold hover:scale-105 transition";
    button.textContent = buttonText;

    const menu = document.createElement("div");
    menu.id = `${buttonId.replace("Button", "Menu")}`;
    menu.className = "absolute right-0 mt-2 w-48 bg-steel-blue text-gray-blue rounded-xl shadow-lg hidden flex flex-col z-50 divide-y divide-gray-blue/30";

    links.forEach(({ href, text, top, bottom }) => {
        const link = document.createElement("a");
        link.href = href;
        link.textContent = text;
        link.className = "block px-4 py-3 font-semibold hover:bg-neon-cyan hover:text-midnight-blue transition" +
            (top ? " rounded-t-xl" : "") +
            (bottom ? " rounded-b-xl" : "");
        menu.appendChild(link);
    });

    container.appendChild(button);
    container.appendChild(menu);
    return container;
}

async function serverAlive() {
    return await apiGet("http://localhost:8000/alive");
}