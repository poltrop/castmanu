import { apiDelete, apiDeleteArchivo, apiPost } from "../api.js";
import { getAll } from "../getAll.js";
import { toggleMenu, initHeader } from "../header.js";

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
    let isEliminar = params.get("eliminar");

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

    if (isEliminar){
        let eliminarButton = document.getElementById("eliminar");
        eliminarButton.classList.remove("hidden");
        eliminarButton.addEventListener("click", eliminar);

        let eliminarTitulo = document.querySelector("main > h1");
        eliminarTitulo.classList.remove("hidden");
    }

    function applyFilters() {
        console.log("filtrando");
        let searchText = searchInput.value.toLowerCase();
        //console.log(searchText);
        let selectedType = typeFilter.value.toLowerCase();
        let selectedGenres = Array.from(document.querySelectorAll(".genre-checkbox:checked")).map(checkbox => checkbox.value);
        
        if (!searchText && selectedType == "todo" && selectedGenres.length == 0)
            return

        let urlParams = new URLSearchParams(window.location.search);
        if (searchText)
            urlParams.set("titulo", searchText);
        if (selectedType != "todo")
            urlParams.set("tipo", selectedType);
        if (selectedGenres.length > 0){
            selectedGenres.forEach(genero => {
                urlParams.set("genero", genero);
            });
        }

        let queryParams = urlParams.toString();

        window.location.href = `home.html${queryParams ? '?' + queryParams : ''}`;
    }

    function cleanFilters(){
        let urlParams = new URLSearchParams(window.location.search);
        urlParams.delete("titulo");
        urlParams.delete("tipo");
        urlParams.delete("genero");

        let queryParams = urlParams.toString();

        window.location.href = `home.html${queryParams ? '?' + queryParams : ''}`;
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
            serieGenres.forEach(label => {
                label.classList.add('hidden');
                if (label.classList.contains("bg-neon-cyan"))
                    selectGenero(label);
            });
        } else if (selected === "serie") {
            movieGenres.forEach(label => {
                label.classList.add('hidden');
                if (label.classList.contains("bg-neon-cyan"))
                    selectGenero(label);
            });
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

    async function eliminar(){
        let cards = document.getElementById("cards");
        let card = cards.querySelector('.selected');
        let title = card.querySelector("h3").innerText;
        let type = card.querySelector("p").innerText;
        let errorMsg = document.getElementById("errorMsg");
        errorMsg.innerText = "";
        let capitulo = "";
        if (type == "Serie"){
            capitulo = card.querySelector("select").value;
            if (!capitulo){
                errorMsg.innerText = "Si seleccionas una serie, debes seleccionar un capitulo en el selector";
                return;
            } else if (capitulo == "TODOS")
                capitulo = "";
            else
                capitulo = "?capitulo=" + capitulo;
        }
        let { isConfirmed } = await Swal.fire({
            title: 'Estás seguro de que deseas ELIMINAR el archivo o archivos seleccionados?',
            text: 'Esta acción no se podrá revertir',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Si',
            cancelButtonText: 'No',
            background: '#1B2A41',
            color: "#00A8E8",
        });

        if (isConfirmed){
            let loading = document.getElementById("loading-spinner");
            loading.classList.remove("hidden");
            let resultadoDB = await apiDelete(`http://localhost:8000/delete-film/${card.id}${capitulo}`);
            
            if (!resultadoDB.success){
                errorMsg.innerText = resultadoDB.message;
                loading.classList.add("hidden");
                return
            }
            
            let resultadoVideo = await apiDeleteArchivo(`https://castmanu.ddns.net/delete/${title}/${type}${capitulo}`);
            if (!resultadoVideo.success){
                let datos;
                if (resultadoDB.datos.borrado == "entero"){
                    datos = {
                        id: resultadoDB.datos.id,
                        title: resultadoDB.datos.title,
                        type: resultadoDB.datos.type,
                        sinopsis: resultadoDB.datos.sinopsis,
                        poster_format: resultadoDB.datos.poster,
                        generos: resultadoDB.datos.generos,
                        idExt: resultadoDB.datos.idExt
                    };
                    await apiPost('http://localhost:8000/add-film', datos);
                    resultadoDB.datos.capitulos.forEach(async capitulo => {
                        datos = {
                            idSerie: resultadoDB.datos.id,
                            capitulo: capitulo
                        };
                        await apiPost('http://localhost:8000/add-capitulo', datos);
                    });
                } else {
                    datos = {
                        idSerie: resultadoDB.datos.idSerie,
                        capitulo: resultadoDB.datos.capitulo
                    };
                    await apiPost('http://localhost:8000/add-capitulo', datos);
                }
                errorMsg.innerText = resultadoVideo.message;
                loading.classList.add("hidden");
                return
            }

            loading.classList.add("hidden");
            errorMsg.classList.remove("text-red-400");
            errorMsg.classList.add("text-green-600");
            errorMsg.innerText = "Eliminado con éxito!";
            let { isConfirmed } = await Swal.fire({
                title: 'Deseas eliminar otro archivo?',
                text: 'Si no serás redirigido a home',
                icon: 'question',
                showCancelButton: true,
                allowOutsideClick: false,
                confirmButtonText: 'Si',
                cancelButtonText: 'No',
                background: '#1B2A41',
                color: "#00A8E8",
            });
            if (isConfirmed){
                window.location.href = `home.html?eliminar=true`;
                return;
            }
            window.location.href = 'home.html';
        }
    }
});
