import { tailwindConfig } from "./config.js";

export function initHeader() {
    tailwind.config = tailwindConfig; // Cargamos la configuración de Tailwind
    let profileButton = document.getElementById("profileButton");
    let profileMenu = document.getElementById("profileMenu");
    let menuToggle = document.getElementById("menuToggle");
    let menu = document.getElementById("menu");
    toggleMenu(profileButton, profileMenu);
    toggleMenu(menuToggle, menu);
}

export function toggleMenu(button, menu, applyFiltersOnClose = false) {
    button.addEventListener("click", (event) => {
    
        menu.classList.toggle("hidden");

        // Si el menú se oculta y necesitamos aplicar filtros
        if (menu.classList.contains("hidden") && applyFiltersOnClose) {
            applyFilters();
        }
    });

    // Manejamos el clic fuera del menú para cerrarlo
    document.addEventListener("click", (event) => {
        if (!menu.contains(event.target) && event.target !== button) {
            menu.classList.add("hidden");

            // Si necesitamos aplicar filtros al cerrar el género
            if (applyFiltersOnClose) {
                applyFilters();
            }
        }
    });
}