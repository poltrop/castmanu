import { apiGet, apiPost, apiPostArchivo } from "../api.js";
import { toggleMenu, initHeader } from "../header.js";
import { mapGenero, mapGeneroId } from "../mapGeneros.js";

document.addEventListener("DOMContentLoaded", async () => {
    initHeader();
    let type = document.getElementById("type");
    type.addEventListener("change", changeGenreList);
    let params = new URLSearchParams(window.location.search);
    let genreOptions = document.querySelectorAll(".genre-option");
    genreOptions.forEach(option => {option.addEventListener("click", () => selectGenero(option))});
    let botonSubir = document.getElementById("subir");
    botonSubir.addEventListener("click",subir);
    if (params.get("id")){
        let pelicula;
        if (params.get("tipo") == "Pelicula"){
            pelicula = await apiGet(`http://localhost:8000/get-tmdb-movie/${params.get("id")}`);
        }else{
            pelicula = await apiGet(`http://localhost:8000/get-tmdb-serie/${params.get("id")}`);
        }
        let titulo = pelicula.name || pelicula.title;
        let poster = !pelicula.poster_path ? null : `https://image.tmdb.org/t/p/w500${pelicula.poster_path}`;
        let tipo = params.get("tipo");
        let sinopsis = pelicula.overview;
        let genero, generos = [], generosIds = [];
        pelicula.genres.forEach(generoId => {
            genero = mapGenero(generoId.id);
            if (genero){
                generos.push(genero);
                generosIds.push(mapGeneroId(generoId.id));
            }
        });
        let tituloInput = document.getElementById("titulo");
        tituloInput.value = titulo;
        if (poster){
            let img = document.createElement("img");
            img.src = poster;
            img.alt = "Portada";
            let portadaInput = document.getElementById("portada");
            img.id = "portada";
            portadaInput.insertAdjacentElement("beforebegin",img);
            portadaInput.remove();
        }
        type.value = tipo;
        changeGenreList();
        let sinopsisInput = document.getElementById("sinopsis");
        sinopsisInput.value = sinopsis;
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
    }

    function changeGenreList(){
        let selected = type.value;
        let allLabels = document.querySelectorAll('.genre-container label');
        let movieGenres = document.querySelectorAll('.genre-container .movie-genre');
        let serieGenres = document.querySelectorAll('.genre-container .serie-genre');
        let labelCap = document.getElementById("labelCap");
        let capitulo = document.getElementById("capitulo");
        labelCap.classList.add("hidden");
        capitulo.classList.add("hidden");
        
        // Mostrar todos
        allLabels.forEach(label => label.classList.remove('hidden'));
        
        // Ocultar según el tipo seleccionado
        if (selected === "Pelicula") {
            serieGenres.forEach(label => label.classList.add('hidden'));
        } else if (selected === "Serie") {
            labelCap.classList.remove("hidden");
            capitulo.classList.remove("hidden");
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

    async function subir(){
        let titulo = document.getElementById("titulo").value.trim();
        let tipo = type.value;
        let sinopsis = document.getElementById("sinopsis").value;
        let poster = document.getElementById("portada");
        let capitulo = document.getElementById("capitulo").value;
        let selectedGenres = Array.from(document.querySelectorAll(".genre-checkbox:checked")).map(checkbox => checkbox.value);
        let archivo = document.getElementById("archivo");
        let errorMsg = document.getElementById("errorMsg");
        errorMsg.innerText="";
        if (!titulo){
            errorMsg.innerText += "No se ha especificado titulo\n";
        }

        if (tipo == "Serie" && !capitulo){
            errorMsg.innerText += "No se ha especificado capítulo para la serie\n";
        }

        if (!archivo.files.length > 0){
            errorMsg.innerText += "No se ha adjuntado ningún archivo para subir";
        }

        if (errorMsg.innerText)
            return

        let confirmacion = confirm("Estás seguro de que deseas subirlo así?");

        if(confirmacion){
            let loading = document.getElementById("loading-spinner");
            loading.classList.remove("hidden");
            let data ={
                title: titulo,
                type: tipo,
            }

            if(selectedGenres.length > 0){
                data.generos = selectedGenres;
            }

            if(sinopsis)
                data.sinopsis = sinopsis;

            let extraCap = "";
            if(capitulo){
                data.capitulo = capitulo;
                extraCap = `?capitulo=${capitulo}`;
            }


            let poster_format = null;
            if(poster.tagName == "INPUT" && poster.files.length > 0){
                poster_format = poster.files[0].name.split('.').pop().toLowerCase();
                await apiPostArchivo(`https://castmanu.ddns.net/uploadf/${titulo}`, poster.files[0], poster.files[0].name);
            }else if (poster.tagName == "IMG"){
                poster_format = poster.src;
            }

            if(poster_format)
                data.poster_format = poster_format;
            console.log(data);
            await apiPostArchivo(`https://castmanu.ddns.net/upload/${titulo}${extraCap}`, archivo.files[0], archivo.files[0].name);
            let resultadoDB = await apiPost('http://localhost:8000/add-film', data);
            console.log(resultadoDB);
            loading.classList.remove("hidden");
            //llamada para subir a servirdor tanto la foto (si se sube archivo) como el video||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
            //Una vez hecho todo, comprobamos que no devuelvan error, y con un settimeout redirigimos a la pagina watch para el video||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||
        }
    }
});