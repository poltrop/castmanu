import { getAll } from "../getAll.js";
import { toggleMenu, initHeader } from "../header.js";
import { renderPagination } from "../paginacion.js";

document.addEventListener("DOMContentLoaded", async () => {
    initHeader();
    let genreButton = document.getElementById("genreButton");
    let genreDropdown = document.getElementById("genreDropdown");
    let genreOptions = document.querySelectorAll(".genre-option");
    let filterToggle = document.getElementById("filterToggle");
    let filterMenu = document.getElementById("filterMenu");
    // Parte de filtros DESPUES DE CARGAR TODO
    let filterButton = document.getElementById("filterButton");
    let cleanButton = document.getElementById("cleanButton");
    let searchInput = document.getElementById("searchInput");
    let typeFilter = document.getElementById("typeFilter");

    toggleMenu(filterToggle, filterMenu);
    toggleMenu(genreButton, genreDropdown, true);
    filterButton.addEventListener("click",applyFilters)
    cleanButton.addEventListener("click",cleanFilters)
    typeFilter.addEventListener("change", changeGenreList);
    genreOptions.forEach(option => {option.addEventListener("click", () => selectGenero(option))});
    
    let params = new URLSearchParams(window.location.search);
    let titulo = params.get("titulo");
    let tipo = params.get("tipo");
    let generos = params.getAll("genero");

    if (titulo)
        searchInput.value = titulo;

    if (tipo)
        typeFilter.value = tipo;

    generos.forEach(generoSelect => {
        // Buscamos el input con ese valor
        let input = document.querySelector(`.genre-checkbox[value="${generoSelect}"]`);
        if (input) {
            // Subimos al label contenedor
            let label = input.closest("label");
            if (label) {
                selectGenero(label);
            }
        }
    });
    
    // Ejecucion de funciones que rellenan cosas
    getAll();

    function applyFilters() {
        console.log("filtrando");
        let searchText = searchInput.value.toLowerCase();
        //console.log(searchText);
        let selectedType = typeFilter.value.toLowerCase();
        let selectedGenres = Array.from(document.querySelectorAll(".genre-checkbox:checked")).map(checkbox => checkbox.value);
        
        if (!searchText && selectedType == "todo" && selectedGenres.length == 0)
            return

        let extras = [];
        if (searchText)
            extras.push(`titulo=${searchText}`);
        if (selectedType != "todo")
            extras.push(`tipo=${selectedType}`);
        if (selectedGenres.length > 0){
            selectedGenres.forEach(genero => {
                extras.push(`genero=${genero}`);
            });
        }

        let queryParams = extras.length > 0 ? "?" + extras.join("&") : "";

        window.location.href = `home.html${queryParams}`;
    }

    function cleanFilters(){
        window.location.href = "home.html";
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

    function selectGenero(option){
        let checkbox = option.querySelector(".genre-checkbox");
        checkbox.checked = !checkbox.checked;
        if (checkbox.checked) {
            option.classList.add("bg-neon-cyan", "text-midnight-blue", "rounded-full", "font-bold");
        } else {
            option.classList.remove("bg-neon-cyan", "text-midnight-blue", "rounded-full", "font-bold");
        } // Cambia el color al seleccionar
    }
});
