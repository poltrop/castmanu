import { apiGet, apiPost, apiPostArchivo, apiDelete } from "../api.js";
import { toggleMenu, initHeader } from "../header.js";
import { mapGenero, mapGeneroId } from "../mapGeneros.js";

document.addEventListener("DOMContentLoaded", async () => {
    initHeader();
    let type = document.getElementById("type");
    type.addEventListener("change", changeGenreList);
    let params = new URLSearchParams(window.location.search);
    let genreOptions = document.querySelectorAll(".genre-option");
    genreOptions.forEach(option => {
        option._handler = () => selectGenero(option);
        option.addEventListener("click", option._handler);
    });
    let botonSubir = document.getElementById("subir");
    botonSubir.addEventListener("click",subir);
    let pelicula, titulo, poster, tipo, sinopsis, generos = [];
    if (params.get("id")){
        pelicula = await apiGet(`http://localhost:8000/get-film/${params.get("id")}`);
        titulo = pelicula.title;
        poster = !pelicula.poster ? "../assets/img/poster.jpg" : pelicula.poster;
        tipo = pelicula.type;
        sinopsis = pelicula.sinopsis;
        generos = pelicula.generos;
    } else if (params.get("idExt")){
        if (params.get("tipo") == "Pelicula"){
            pelicula = await apiGet(`http://localhost:8000/get-tmdb-movie/${params.get("idExt")}`);
        }else{
            pelicula = await apiGet(`http://localhost:8000/get-tmdb-serie/${params.get("idExt")}`);
        }
        titulo = pelicula.name || pelicula.title;
        poster = !pelicula.poster_path ? null : `https://image.tmdb.org/t/p/w500${pelicula.poster_path}`;
        tipo = params.get("tipo");
        sinopsis = pelicula.overview;
        let genero, generosIds = [];
        pelicula.genres.forEach(generoId => {
            genero = mapGenero(generoId.id);
            if (genero){
                generos.push(genero);
                generosIds.push(mapGeneroId(generoId.id));
            }
        });
    }
    if (params.get("id") || params.get("idExt")){
        genreOptions.forEach(option => {
            option.removeEventListener("click", option._handler);
            delete option._handler; // opcional, limpieza
        });
        let tituloInput = document.getElementById("titulo");
        tituloInput.value = titulo;
        tituloInput.disabled = true;
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
        type.disabled = true;
        changeGenreList();
        let sinopsisInput = document.getElementById("sinopsis");
        sinopsisInput.value = sinopsis;
        sinopsisInput.disabled = true;
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
            serieGenres.forEach(label => {
                label.classList.add('hidden');
                if (label.classList.contains("bg-neon-cyan"))
                    selectGenero(label);
            });
                
        } else if (selected === "Serie") {
            labelCap.classList.remove("hidden");
            capitulo.classList.remove("hidden");
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

        let { isConfirmed } = await Swal.fire({
            title: "Estás seguro de que deseas subirlo así?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Si',
            cancelButtonText: 'No',
            background: '#1B2A41',
            color: "#00A8E8",
        });

        if(isConfirmed){
            let loading = document.getElementById("loading-spinner");
            loading.classList.remove("hidden");
            if (params.get("id")){
                if (tipo != "Serie"){
                    errorMsg.innerText = "Solo se pueden añadir capitulos de series desde esta sección";
                    loading.classList.add("hidden");
                    return
                }

                let data ={
                    idSerie: params.get("id"),
                    capitulo: capitulo
                }

                let extraCap = `?capitulo=${capitulo}`;
                let resultadoCapitulo = await apiPost('http://localhost:8000/add-capitulo', data);
                if (!resultadoCapitulo.success){
                    errorMsg.innerText = resultadoCapitulo.message;
                    loading.classList.add("hidden");
                    return
                }
                
                let resultadoVideo = await apiPostArchivo(`https://castmanu.ddns.net/upload/${titulo}/${tipo}${extraCap}`, archivo.files[0], archivo.files[0].name);
                if (!resultadoVideo.success){
                    errorMsg.innerText = resultadoVideo.message;
                    await apiDelete(`http://localhost:8000/delete-film/${params.get("id")}${extraCap}`);
                    loading.classList.add("hidden");
                    return
                }
            } else {
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
                
                let poster_format = null;
                if(poster.tagName == "INPUT" && poster.files.length > 0){
                    poster_format = poster.files[0].name.split('.').pop().toLowerCase();
                }else if (poster.tagName == "IMG"){
                    poster_format = poster.src;
                }
                
                if(poster_format)
                    data.poster_format = poster_format;
                
                let resultadoDB = await apiPost('http://localhost:8000/add-film', data);
                
                if (!resultadoDB.success){
                    errorMsg.innerText = resultadoDB.message;
                    loading.classList.add("hidden");
                    return
                }

                if(capitulo){
                    data = {
                        idSerie: resultadoDB.id,
                        capitulo: capitulo
                    }
                    extraCap = `?capitulo=${capitulo}`;
                    let resultadoCapitulo = await apiPost('http://localhost:8000/add-capitulo', data);
                    if (!resultadoCapitulo.success){
                        errorMsg.innerText = resultadoCapitulo.message;
                        await apiDelete(`http://localhost:8000/delete-film/${resultadoDB.id}`);
                        loading.classList.add("hidden");
                        return
                    }
                }
                
                let resultadoVideo = await apiPostArchivo(`https://castmanu.ddns.net/upload/${titulo}/${tipo}${extraCap}`, archivo.files[0], archivo.files[0].name);
                if (!resultadoVideo.success){
                    errorMsg.innerText = resultadoVideo.message;
                    await apiDelete(`http://localhost:8000/delete-film/${resultadoDB.id}`);
                    loading.classList.add("hidden");
                    return
                }

                if(poster.tagName == "INPUT" && poster.files.length > 0){
                    let resultadoFoto = await apiPostArchivo(`https://castmanu.ddns.net/uploadf/${titulo}/${tipo}`, poster.files[0], poster.files[0].name);
                    if (!resultadoFoto.success){
                        errorMsg.innerText = resultadoFoto.message;
                        await apiDelete(`http://localhost:8000/delete-film/${resultadoDB.id}`);
                        loading.classList.add("hidden");
                        return
                    }
                }
            }

            loading.classList.add("hidden");
            errorMsg.classList.remove("text-red-400");
            errorMsg.classList.add("text-green-600");
            errorMsg.innerText = "Video añadido con éxito!";
            let idRedirect = params.get("id") || resultadoDB.id;
            if (capitulo){
                let { isConfirmed } = await Swal.fire({
                    title: 'Deseas subir otro capitulo?',
                    text: 'Puedes seguir subiendo o ir a ver el video ahora.',
                    icon: 'question',
                    showCancelButton: true,
                    allowOutsideClick: false,
                    confirmButtonText: 'Si',
                    cancelButtonText: 'No',
                    background: '#1B2A41',
                    color: "#00A8E8",
                });
                if (isConfirmed){
                    window.location.href = `rellenar.html?id=${idRedirect}`;
                    return;
                }
            }
            window.location.href = `watch.html?id=${idRedirect}`;
        }
    }
});