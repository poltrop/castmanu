import { login } from "../login.js";
import { tailwindConfig } from "../config.js";

document.addEventListener("DOMContentLoaded", () => {
    tailwind.config = tailwindConfig; // Cargamos la configuración de Tailwind
    const genreButton = document.getElementById("genreButton");
    const genreDropdown = document.getElementById("genreDropdown");
    const genreOptions = document.querySelectorAll(".genre-option");
    const menuToggle = document.getElementById("menuToggle");
    const menu = document.getElementById("menu");
    const filterToggle = document.getElementById("filterToggle");
    const filterMenu = document.getElementById("filterMenu");
    const profileButton = document.getElementById("profileButton");
    const profileMenu = document.getElementById("profileMenu");
    // Parte de filtros DESPUES DE CARGAR TODO
    const searchInput = document.getElementById("searchInput");
    const typeFilter = document.getElementById("typeFilter");
    const movies = document.querySelectorAll(".movie-card");

    toggleMenu(menuToggle, menu);
    toggleMenu(filterToggle, filterMenu);
    toggleMenu(genreButton, genreDropdown, true);
    toggleMenu(profileButton, profileMenu);
    searchInput.addEventListener("input", applyFilters);
    typeFilter.addEventListener("change", applyFilters);
    genreOptions.forEach(option => {
        option.addEventListener("click", () => {
            const checkbox = option.querySelector(".genre-checkbox");
            checkbox.checked = !checkbox.checked;
            if (checkbox.checked) {
                option.classList.add("bg-neon-cyan", "text-midnight-blue", "rounded-full", "font-bold");
            } else {
                option.classList.remove("bg-neon-cyan", "text-midnight-blue", "rounded-full", "font-bold");
            } // Cambia el color al seleccionar
        });
    });

    function toggleMenu(button, menu, applyFiltersOnClose = false) {
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

    function applyFilters() {
        console.log("filtrando");
        const searchText = searchInput.value.toLowerCase();
        console.log(searchText);
        const selectedType = typeFilter.value;
        const selectedGenres = Array.from(document.querySelectorAll(".genre-checkbox:checked"))
            .map(checkbox => checkbox.value);

        movies.forEach(movie => {
            const title = movie.querySelector("h3").textContent.toLowerCase();
            console.log(title);
            const type = movie.querySelector(".movie-type").textContent.trim();
            const movieGenres = Array.from(movie.querySelectorAll(".movie-genre"))
                .map(genre => genre.dataset.genero.toLowerCase()); // Usamos dataset
            console.log(movieGenres)
            console.log(selectedGenres)
            const matchesSearch = !searchText || title.includes(searchText);
            const matchesType = selectedType === "all" || type.includes(selectedType);
            const matchesGenres = !selectedGenres.length || selectedGenres.every(genre => movieGenres.includes(genre));

            movie.classList.toggle("hidden", !(matchesSearch && matchesType && matchesGenres));
        });
    }
});
