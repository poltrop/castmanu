import { apiGet, apiPost, apiPostServer, apiDelete, apiPut, apiPatchServer } from "../api.js";
import { autorizado } from "../comprobarLogin.js";
import { initHeader } from "../header.js";
import { mapGenero, mapGeneroId } from "../mapGeneros.js";

document.addEventListener("DOMContentLoaded", async () => {
    initHeader();
    await autorizado();
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
        if (!pelicula) window.location.href = 'home.html';
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
        
        let tituloInput = document.getElementById("titulo");
        tituloInput.value = titulo;
        let portadaInput = document.getElementById("portada");
        if (poster){
            let img = document.createElement("img");
            img.src = poster;
            img.alt = "Portada";
            img.id = "portada";
            img.classList.add('w-full', 'max-w-[600px]', 'h-auto', 'object-cover');
            portadaInput.insertAdjacentElement("beforebegin",img);
            portadaInput.classList.remove("mb-4");
            portadaInput.classList.add("my-4");
            portadaInput.id = "portadaEditar";
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
        if (params.get("editar") != "true"){
            if (poster)
                portadaInput.remove();
            genreOptions.forEach(option => {
                option.removeEventListener("click", option._handler);
                delete option._handler; // opcional, limpieza
            });
            tituloInput.disabled = true;
            type.disabled = true;
            sinopsisInput.disabled = true;
        } else {
            let botonSubir = document.getElementById("subir");
            botonSubir.removeEventListener("click",subir);
            botonSubir.addEventListener("click",editar);
            botonSubir.innerText = "Editar";
            if (type.value == "Serie")
                type.disabled = true;
            else{
                let opcionSerie = type.querySelector('option[value="Serie"]');
                opcionSerie.remove();
            }
            let labelCap = document.getElementById("labelCap");
            let capitulo = document.getElementById("capitulo");
            let archivo = document.getElementById("archivo");
            let labelArchivo = archivo.previousElementSibling;
            labelCap.remove();
            capitulo.remove();
            archivo.remove();
            labelArchivo.remove();
            let opcionBusqueda = document.getElementById("opcionBusqueda");
            opcionBusqueda.remove();
        }
    }

    function changeGenreList(){
        let selected = type.value;
        let allLabels = document.querySelectorAll('.genre-container label');
        let movieGenres = document.querySelectorAll('.genre-container .movie-genre');
        let serieGenres = document.querySelectorAll('.genre-container .serie-genre');
        let labelCap = document.getElementById("labelCap");
        let capitulo = document.getElementById("capitulo");
        if (params.get("editar") != "true"){
            labelCap.classList.add("hidden");
            capitulo.classList.add("hidden");
        }
        
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
        let sinopsis = document.getElementById("sinopsis").value.trim();
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
            let resultadoDB;
            if (params.get("id")){
                if (tipo != "Serie"){
                    errorMsg.innerText = "Solo se pueden añadir capitulos de series desde esta sección";
                    loading.classList.add("hidden");
                    return
                }

                let data ={
                    idSerie: params.get("id"),
                    capitulo: capitulo,
                    extension: archivo.files[0].name.split('.').pop().toLowerCase()
                }

                let extraCap = `?capitulo=${capitulo}`;
                let resultadoCapitulo = await apiPost('http://localhost:8000/add-capitulo', data);
                if (!resultadoCapitulo.success){
                    errorMsg.innerText = resultadoCapitulo.message;
                    loading.classList.add("hidden");
                    return
                }
                
                let resultadoVideo = await apiPostServer(`https://castmanu.ddns.net/upload/${titulo}/${tipo}${extraCap}`, archivo.files[0], archivo.files[0].name);
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
                
                if (tipo != "Serie"){
                    data.extension = archivo.files[0].name.split('.').pop().toLowerCase();
                } 
    
                if(selectedGenres.length > 0){
                    data.generos = selectedGenres;
                }
    
                if(sinopsis)
                    data.sinopsis = sinopsis;
    
                let poster_format = null;
                if(poster.tagName == "INPUT" && poster.files.length > 0){
                    poster_format = poster.files[0].name.split('.').pop().toLowerCase();
                }else if (poster.tagName == "IMG"){
                    poster_format = poster.src;
                }
                
                if(poster_format)
                    data.poster_format = poster_format;
                
                resultadoDB = await apiPost('http://localhost:8000/add-film', data);
                
                if (!resultadoDB.success){
                    errorMsg.innerText = resultadoDB.message;
                    loading.classList.add("hidden");
                    return
                }
                
                let extraCap = "";
                if(capitulo){
                    data = {
                        idSerie: resultadoDB.id,
                        capitulo: capitulo,
                        extension: archivo.files[0].name.split('.').pop().toLowerCase()
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
                
                let resultadoVideo = await apiPostServer(`https://castmanu.ddns.net/upload/${titulo}/${tipo}${extraCap}`, archivo.files[0], archivo.files[0].name);
                if (!resultadoVideo.success){
                    errorMsg.innerText = resultadoVideo.message;
                    await apiDelete(`http://localhost:8000/delete-film/${resultadoDB.id}`);
                    loading.classList.add("hidden");
                    return
                }

                if(poster.tagName == "INPUT" && poster.files.length > 0){
                    let resultadoFoto = await apiPostServer(`https://castmanu.ddns.net/uploadf/${titulo}/${tipo}`, poster.files[0], poster.files[0].name);
                    if (!resultadoFoto.success){
                        errorMsg.innerText = resultadoFoto.message;
                        errorMsg.innerText += ". Se pondra la foto por defecto. Editalo para modificarlo";
                        let data = {
                            id: resultadoDB.id,
                            poster_format: "delete",
                        };
                        await apiPut(`http://localhost:8000/edit-film`, data);
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
                } else window.location.href = `watch.html?id=${idRedirect}&capitulo=${capitulo}`;
                return;
            }
            setTimeout(() => {
                window.location.href = `watch.html?id=${idRedirect}`;
            }, 1000);
        }
    }

    async function editar(){
        let tituloInput = document.getElementById("titulo");
        let portadaEditar = document.getElementById("portadaEditar");
        let type = document.getElementById("type");
        let selectedGenres = Array.from(document.querySelectorAll(".genre-checkbox:checked")).map(checkbox => checkbox.value);
        let sinopsisInput = document.getElementById("sinopsis");
        let cambioTitulo, cambioPortada, cambioTipo, cambioGeneros, cambioSinopsis;
        
        if (tituloInput.value.trim() && tituloInput.value != titulo)
            cambioTitulo = tituloInput.value.trim();
        
        if (portadaEditar.files.length > 0)
            cambioPortada = portadaEditar.files[0].name.split('.').pop().toLowerCase();
        
        if (type.value != tipo){
            if (tipo == "Serie"){ // Esto previene que si algun listillo quita el disabled no me la lie por detras
                errorMsg.innerText = "No puedes cambiar el tipo de serie a otra cosa";
                return;
            }
            cambioTipo = type.value;
        }
        
        if (!arraysIguales(selectedGenres, generos)){
            console.log(selectedGenres);
            console.log(generos);
            cambioGeneros = selectedGenres;
        }
        
        if (sinopsisInput.value.trim() && sinopsisInput.value != sinopsis)
            cambioSinopsis = sinopsisInput.value.trim();
        
        if (!cambioTitulo && !cambioPortada && !cambioTipo && !cambioGeneros && !cambioSinopsis) {
            errorMsg.innerText = "Debe haber al menos un cambio para editar";
            return;
        }
        
        errorMsg.innerText="";
        let { isConfirmed } = await Swal.fire({
            title: "Estás seguro de que deseas editarlo?",
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

            let data = {
                id: params.get("id")
            };

            if(cambioTitulo)
                data.title = cambioTitulo;

            if(cambioTipo)
                data.type = cambioTipo;

            if(cambioGeneros)
                data.generos = cambioGeneros;

            if(cambioSinopsis)
                data.sinopsis = cambioSinopsis;

            if(cambioPortada)
                data.poster_format = cambioPortada;

            let resultadoDB = await apiPut('http://localhost:8000/edit-film', data);
            if (!resultadoDB.success){
                errorMsg.innerText = resultadoDB.message;
                loading.classList.add("hidden");
                return;
            }

            if(cambioTitulo){
                let resultadoTitulo = await apiPatchServer(`https://castmanu.ddns.net/edit-titulo/${titulo}/${tipo}/${cambioTitulo}`);
                titulo = cambioTitulo;
                if (!resultadoTitulo.success){
                    errorMsg.innerText = resultadoTitulo.message;
                    loading.classList.add("hidden");
                    generos = selectedGenres.slice();
                    sinopsis = sinopsisInput.value.trim();
                    return;
                }
            }

            if(cambioTipo){
                let resultadoMover = await apiPatchServer(`https://castmanu.ddns.net/edit-tipo/${titulo}/${tipo}/${cambioTipo}`);
                tipo = cambioTipo;
                if (!resultadoMover.success){
                    errorMsg.innerText = resultadoMover.message;
                    loading.classList.add("hidden");
                    generos = selectedGenres.slice();
                    sinopsis = sinopsisInput.value.trim();
                    if(cambioTitulo)
                        titulo = tituloInput.value.trim();
                    return;
                }
            }

            if(cambioPortada){
                let resultadoPortada = await apiPostServer(`https://castmanu.ddns.net/uploadf/${titulo}/${tipo}`, portadaEditar.files[0], portadaEditar.files[0].name);
                if (!resultadoPortada.success){
                    errorMsg.innerText = resultadoPortada.message;
                    errorMsg.innerText += ". El resto de cambios han sido aplicados";
                    loading.classList.add("hidden");
                    generos = selectedGenres.slice();
                    sinopsis = sinopsisInput.value.trim();
                    if(cambioTitulo)
                        titulo = tituloInput.value.trim();
                    if(cambioTipo)
                        tipo = type.value;
                    return;
                }
            }

            loading.classList.add("hidden");
            errorMsg.classList.remove("text-red-400");
            errorMsg.classList.add("text-green-600");
            errorMsg.innerText = "Editado con éxito!";
            setTimeout(() => {
                window.location.href = `watch.html?id=${params.get("id")}`;
            }, 1000);
        }
    }

    function arraysIguales(a, b) {
        if (a.length !== b.length) return false;
        const sortedA = [...a].map(e => e.trim()).sort();
        const sortedB = [...b].map(e => e.trim()).sort();
        return sortedA.every((val, i) => val === sortedB[i]);
      }
});