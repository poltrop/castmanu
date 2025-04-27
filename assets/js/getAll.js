import { apiGet } from "./api.js";
import { mapGeneroInverso } from "./mapGeneros.js";
import { renderPagination } from "./paginacion.js";

export async function getAll(){
    let cards = document.getElementById("cards");
    let params = new URLSearchParams(window.location.search);
    let currentPage = parseInt(params.get("pagina")) || 1;
    let titulo = params.get("titulo");
    let tipo = params.get("tipo");
    let generos = params.getAll("genero");
    let isEliminar = params.get("eliminar");

    let extras = [];
    if (titulo)
        extras.push(`titulo=${titulo}`);
    if (tipo)
        extras.push(`tipo=${tipo}`);
    if (generos.length > 0){
        generos.forEach(genero => {
            extras.push(`genero=${mapGeneroInverso(genero)}`);
        });
    }
    

    let queryParams = extras.length > 0 ? "?" + extras.join("&") : "";

    let resultados = await apiGet(`http://localhost:8000/get-all/${currentPage}${queryParams}`);
    let total_paginas = resultados.total_paginas;
    renderPagination(currentPage, total_paginas, cards);
    let principal,img,h3,p,div,span;
    resultados.peliculas.forEach(elemento => {
        let selector = null;
        if (isEliminar){
            console.log(elemento)
            if (elemento.type == "Serie"){
                selector = document.createElement("select");
                selector.classList.add("mb-2", "p-2", "lg:mb-0", "bg-deep-black", "text-center", "text-gray-blue", "rounded-md");
                // Creamos el selector base
                let opcion = document.createElement("option");
                opcion.value = '';
                opcion.textContent = '-- Selecciona un capítulo --';
                opcion.selected = true;
                opcion.disabled = true;
                selector.appendChild(opcion);
                // Opcion todos
                opcion = document.createElement("option");
                opcion.value = "TODOS";
                opcion.textContent = "TODOS";
                selector.appendChild(opcion);
                elemento.capitulos.forEach(capitulo => {
                    opcion = document.createElement("option");
                    opcion.value = capitulo;
                    opcion.textContent = capitulo;
                    selector.appendChild(opcion);
                });
            }
            principal = document.createElement("div");
            principal.id = elemento.id;
            principal.classList.add("cursor-pointer");
            principal.addEventListener('click', (event) => {
                let selected = cards.querySelector('.selected');
                if (selected)
                    selected.classList.remove('ring-4', 'ring-neon-cyan', 'ring-offset-2', 'selected');
                else{
                    let eliminarButton = document.getElementById("eliminar");
                    eliminarButton.disabled = false;
                }
                // Seleccionar esta
                event.target.closest('.movie-card').classList.add('ring-4', 'ring-neon-cyan', 'ring-offset-2', 'selected');
            });
        } else {
            principal = document.createElement("a");
            principal.href = `watch.html?id=${elemento.id}`
        }
        img = document.createElement("img");
        h3 = document.createElement("h3");
        p = document.createElement("p");
        div = document.createElement("div");
        
        cards.appendChild(principal);
        principal.appendChild(img);
        principal.appendChild(h3);
        principal.appendChild(p);
        principal.appendChild(div);
        if (selector)
            principal.appendChild(selector);
        
        principal.classList.add("movie-card", "bg-steel-blue", "p-4", "rounded-lg", "shadow-lg", "flex", "flex-col", "items-center", "hover:scale-105", "transition");
        img.src = !elemento.poster ? "../assets/img/poster.jpg" : elemento.poster;
        img.alt = "Portada";
        img.classList.add("w-full", "rounded-md", "shadow-md");
        h3.classList.add("text-neon-cyan", "text-lg", "font-bold", "mt-2", "text-center");
        h3.innerText = elemento.title;
        p.classList.add("movie-type", "text-sm", "text-gray-blue", "text-center", "bg-neon-cyan/20", "px-2", "py-1", "rounded-md");
        p.innerText = elemento.type;
        div.classList.add("flex", "flex-wrap", "gap-2", "my-2");
        elemento.genres.forEach(genero => {
            span = document.createElement("span");
            
            div.appendChild(span);
            
            span.classList.add("movie-genre", "bg-neon-cyan", "text-midnight-blue", "px-3", "py-1", "rounded-full", "text-xs", "font-bold");
            span.setAttribute("genero",genero);
            span.innerText = genero;
        });
    });
}