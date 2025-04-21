import { tailwindConfig } from "../config.js";
import { getAll } from "../getAll.js";

document.addEventListener("DOMContentLoaded", async () => {
    tailwind.config = tailwindConfig; // Cargamos la configuración de Tailwind
    let genreButton = document.getElementById("genreButton");
    let genreDropdown = document.getElementById("genreDropdown");
    let genreOptions = document.querySelectorAll(".genre-option");
    let menuToggle = document.getElementById("menuToggle");
    let menu = document.getElementById("menu");
    let filterToggle = document.getElementById("filterToggle");
    let filterMenu = document.getElementById("filterMenu");
    let profileButton = document.getElementById("profileButton");
    let profileMenu = document.getElementById("profileMenu");
    // Parte de filtros DESPUES DE CARGAR TODO
    let searchInput = document.getElementById("searchInput");
    let typeFilter = document.getElementById("typeFilter");
    let movies = document.querySelectorAll(".movie-card");

    toggleMenu(menuToggle, menu);
    toggleMenu(filterToggle, filterMenu);
    toggleMenu(genreButton, genreDropdown, true);
    toggleMenu(profileButton, profileMenu);
    searchInput.addEventListener("input", applyFilters);
    typeFilter.addEventListener("change", applyFilters);
    typeFilter.addEventListener("change", changeGenreList);
    genreOptions.forEach(option => {
        option.addEventListener("click", () => {
            let checkbox = option.querySelector(".genre-checkbox");
            checkbox.checked = !checkbox.checked;
            if (checkbox.checked) {
                option.classList.add("bg-neon-cyan", "text-midnight-blue", "rounded-full", "font-bold");
            } else {
                option.classList.remove("bg-neon-cyan", "text-midnight-blue", "rounded-full", "font-bold");
            } // Cambia el color al seleccionar
        });
    });


    // Ejecucion de funciones que rellenan cosas
    //getAll();

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
        //console.log("filtrando");
        let searchText = searchInput.value.toLowerCase();
        //console.log(searchText);
        let selectedType = typeFilter.value.toLowerCase();
        let selectedGenres = Array.from(document.querySelectorAll(".genre-checkbox:checked"))
            .map(checkbox => checkbox.value);

        movies.forEach(movie => {
            let title = movie.querySelector("h3").textContent.toLowerCase();
            //console.log(title);
            let type = movie.querySelector(".movie-type").textContent.trim().toLowerCase();
            let movieGenres = Array.from(movie.querySelectorAll(".movie-genre"))
                .map(genre => genre.dataset.genero.toLowerCase()); // Usamos dataset
            //console.log(movieGenres)
            //console.log(selectedGenres)
            let matchesSearch = !searchText || title.includes(searchText);
            let matchesType = selectedType === "todo" || type.includes(selectedType);
            let matchesGenres = !selectedGenres.length || selectedGenres.every(genre => movieGenres.includes(genre));

            movie.classList.toggle("hidden", !(matchesSearch && matchesType && matchesGenres));
        });
    }

    function changeGenreList(){
        let selected = typeFilter.value;
        
        let allLabels = document.querySelectorAll('#genreDropdown label');
        let movieGenres = document.querySelectorAll('#genreDropdown .movie-genre');
        let serieGenres = document.querySelectorAll('#genreDropdown .serie-genre');
        
        // Mostrar todos
        allLabels.forEach(label => label.classList.remove('hidden'));

        // Ocultar según el tipo seleccionado
        if (selected === "pelicula") {
            serieGenres.forEach(label => label.classList.add('hidden'));
        } else if (selected === "serie") {
            movieGenres.forEach(label => label.classList.add('hidden'));
        }
    }
});
