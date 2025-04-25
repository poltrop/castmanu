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
    console.log(queryParams);

    let resultados = await apiGet(`http://localhost:8000/get-all/${currentPage}${queryParams}`);
    let total_paginas = resultados.total_paginas;
    renderPagination(currentPage, total_paginas, cards);
    let a,img,h3,p,div,span;
    resultados.peliculas.forEach(elemento => {
        a = document.createElement("a");
        img = document.createElement("img");
        h3 = document.createElement("h3");
        p = document.createElement("p");
        div = document.createElement("div");
        
        cards.appendChild(a);
        a.appendChild(img);
        a.appendChild(h3);
        a.appendChild(p);
        a.appendChild(div);
        
        a.classList.add("movie-card", "bg-steel-blue", "p-4", "rounded-lg", "shadow-lg", "flex", "flex-col", "items-center", "hover:scale-105", "transition");
        a.href = `watch.html?id=${elemento.id}`
        img.src = !elemento.poster ? "../assets/img/poster.jpg" : elemento.poster;
        img.alt = "Portada";
        img.classList.add("w-full", "rounded-md", "shadow-md");
        h3.classList.add("text-neon-cyan", "text-lg", "font-bold", "mt-2", "text-center");
        h3.innerText = elemento.title;
        p.classList.add("movie-type", "text-sm", "text-gray-blue", "text-center", "bg-neon-cyan/20", "px-2", "py-1", "rounded-md");
        p.innerText = elemento.type;
        div.classList.add("flex", "flex-wrap", "gap-2", "mt-2");
        elemento.genres.forEach(genero => {
            span = document.createElement("span");
            
            div.appendChild(span);
            
            span.classList.add("movie-genre", "bg-neon-cyan", "text-midnight-blue", "px-3", "py-1", "rounded-full", "text-xs", "font-bold");
            span.setAttribute("genero",genero);
            span.innerText = genero;
        });
    });
}