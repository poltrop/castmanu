import { apiGet } from "../api.js";
import { toggleMenu, initHeader } from "../header.js";
import { mapGenero } from "../mapGeneros.js";
import { renderPagination } from "../paginacion.js";

document.addEventListener("DOMContentLoaded", async () => {
    initHeader();
    let botonBuscar = document.getElementById("buscarBtn");
    let botonSeleccionar = document.getElementById("seleccionarBtn");
    let interno = document.getElementById('interno');
    let params = new URLSearchParams(window.location.search);
    let internoValue = params.get("interno");
    if (!internoValue)
        interno.checked = false;
    else
        interno.checked = internoValue == "true";
    botonBuscar.addEventListener("click",buscar);
    botonSeleccionar.addEventListener("click",seleccion);
    interno.addEventListener("change",swapInterno);
    mostrarCards();
    
    function buscar(){
        let titulo = document.getElementById("tituloInput").value.trim().toLowerCase();
        let errorMsg = document.getElementById("errorMsg");
        errorMsg.innerText = "";
        if (!interno && !titulo){
            errorMsg.innerText = "Debes introducir un título para buscar o añadir capitulo";
            return;
        }
        let params = new URLSearchParams(window.location.search);
        params.set("titulo", titulo);
        params.delete("pagina");
        let queryParams = params.toString();
        window.location.href = `buscar.html${queryParams ? '?' + queryParams : ''}`;
    }
    
    async function mostrarCards(){
        let params = new URLSearchParams(window.location.search);
        let titulo = params.get("titulo");
        let currentPage = parseInt(params.get("pagina")) || 1; //Coge 1 por defecto si no encuentra el param
        let interno = params.get("interno") == "true"; //Comprueba si mirar series internas o externo
        if (!interno && !titulo)
            return;
        botonSeleccionar.classList.remove("hidden");
        let input = document.getElementById("tituloInput");
        input.value = titulo;
        let h1 = document.createElement("h1");
        h1.classList.add("text-2xl", "sm:text-3xl", "text-neon-cyan", "font-bold", "my-6");
        h1.innerText ="Selecciona lo que quieres subir";
        let errorMsg = document.getElementById("errorMsg");
        errorMsg.insertAdjacentElement("afterend",h1);
        let resultados = document.getElementById("resultados");
        if (interno){
            let queryTitulo = "";
            if (titulo)
                queryTitulo = `&titulo=${titulo}`;
            let busqueda = await apiGet(`http://localhost:8000/get-all/${currentPage}?tipo=Serie${queryTitulo}`); //llamada
            let totalPages = busqueda.total_paginas;
            renderPagination(currentPage, totalPages, resultados);
            if (busqueda.peliculas.length < 1){
                let div = document.createElement("div");
                input.insertAdjacentElement("afterend",div);
                
                div.classList.add("text-red-400");
                div.innerText = "No se han obtenido resultados para la búsqueda";
            }
            
            let div,img,h3,p,div2,span;
            busqueda.peliculas.forEach(serie => {
                div = document.createElement("div");
                img = document.createElement("img");
                h3 = document.createElement("h3");
                p = document.createElement("p");
                div2 = document.createElement("div");
                
                resultados.appendChild(div);
                div.appendChild(img);
                div.appendChild(h3);
                div.appendChild(p);
                div.appendChild(div2);
                
                div.classList.add("movie-card", "cursor-pointer", "bg-steel-blue", "p-4", "rounded-lg", "shadow-lg", "flex", "flex-col", "items-center", "hover:scale-105", "transition");
                div.id = serie.id;
                img.src = !serie.poster ? "../assets/img/poster.jpg" : serie.poster;
                img.alt = "Portada";
                img.classList.add("w-full", "rounded-md", "shadow-md");
                h3.classList.add("text-neon-cyan", "text-lg", "font-bold", "mt-2", "text-center");
                h3.innerText = serie.title;
                p.classList.add("movie-type", "text-sm", "text-gray-blue", "text-center", "bg-neon-cyan/20", "px-2", "py-1", "rounded-md");
                p.innerText = serie.type;
                div2.classList.add("flex", "flex-wrap", "gap-2", "mt-2");
                serie.genres.forEach(genero => {
                    span = document.createElement("span");
                    
                    div2.appendChild(span);
                    
                    span.classList.add("movie-genre", "bg-neon-cyan", "text-midnight-blue", "px-3", "py-1", "rounded-full", "text-xs", "font-bold");
                    span.setAttribute("genero",genero);
                    span.innerText = genero;
                });
    
                div.addEventListener('click', (event) => {
                    let selected = resultados.querySelector('.selected');
                    if (selected)
                        selected.classList.remove('ring-4', 'ring-neon-cyan', 'ring-offset-2', 'selected');
                    else{
                        botonSeleccionar.disabled = false;
                    }
    
              
                    // Seleccionar esta
                    event.target.closest('.movie-card').classList.add('ring-4', 'ring-neon-cyan', 'ring-offset-2', 'selected');
                });
            });

        } else {
            let busqueda = await apiGet(`http://localhost:8000/get-tmdb/${titulo}/${currentPage}`); //llamada
            let totalPages = busqueda.total_pages; // Lo actualizarás con la respuesta real de la API
            renderPagination(currentPage, totalPages, resultados);
            let div,img,h3,p,div2,span;
            console.log(busqueda)
            let resultadosFiltrados = busqueda.results.filter(item =>item.media_type === "movie" || item.media_type === "tv");
            if (resultadosFiltrados.length < 1){
                let div = document.createElement("div");
                input.insertAdjacentElement("afterend",div);
    
                div.classList.add("text-red-400");
                div.innerText = "No se han obtenido resultados para la búsqueda";
            }
    
            resultadosFiltrados.forEach(elemento => {
                div = document.createElement("div");
                img = document.createElement("img");
                h3 = document.createElement("h3");
                p = document.createElement("p");
                div2 = document.createElement("div");
                
                resultados.appendChild(div);
                div.appendChild(img);
                div.appendChild(h3);
                div.appendChild(p);
                div.appendChild(div2);
                
                div.classList.add("movie-card", "cursor-pointer", "bg-steel-blue", "p-4", "rounded-lg", "shadow-lg", "flex", "flex-col", "items-center", "hover:scale-105", "transition");
                div.id = elemento.id;
                img.src = !elemento.poster_path ? "../assets/img/poster.jpg" : `https://image.tmdb.org/t/p/w500${elemento.poster_path}`;
                img.alt = "Portada";
                img.classList.add("w-full", "rounded-md", "shadow-md");
                h3.classList.add("text-neon-cyan", "text-lg", "font-bold", "mt-2", "text-center");
                h3.innerText = elemento.name || elemento.title;
                p.classList.add("movie-type", "text-sm", "text-gray-blue", "text-center", "bg-neon-cyan/20", "px-2", "py-1", "rounded-md");
                p.innerText = media(elemento.media_type);
                div2.classList.add("flex", "flex-wrap", "gap-2", "mt-2");
                let genero;
                elemento.genre_ids.forEach(generoId => {
                    genero = mapGenero(generoId);
                    if (genero){
                        span = document.createElement("span");
                        div2.appendChild(span);
            
                        span.classList.add("movie-genre", "bg-neon-cyan", "text-midnight-blue", "px-3", "py-1", "rounded-full", "text-xs", "font-bold");
                        span.setAttribute("genero",genero);
                        span.innerText = genero;
                    }
                });
    
                div.addEventListener('click', (event) => {
                    let selected = resultados.querySelector('.selected');
                    if (selected)
                        selected.classList.remove('ring-4', 'ring-neon-cyan', 'ring-offset-2', 'selected');
                    else{
                        botonSeleccionar.disabled = false;
                    }
    
              
                    // Seleccionar esta
                    event.target.closest('.movie-card').classList.add('ring-4', 'ring-neon-cyan', 'ring-offset-2', 'selected');
                });
            });
        }
    }

    function media(media){
        switch (media) {
            case "movie":
                return "Pelicula";
        
            default:
                return "Serie";
        }
    }

    function seleccion(){
        let interno = document.getElementById('interno').checked;
        let selected = resultados.querySelector('.selected');
        let tipo = selected.querySelector("p").innerText;
        if (selected){
            if (interno)
                window.location.href = `rellenar.html?id=${selected.id}`;
            else
                window.location.href = `rellenar.html?idExt=${selected.id}&tipo=${tipo}`;
        }
    }

    function swapInterno(){
        let interno = document.getElementById('interno');
        let params = new URLSearchParams();
        params.set("interno", String(interno.checked));
        let queryParams = params.toString();
        window.location.href = `buscar.html${queryParams ? '?' + queryParams : ''}`;
    }
});