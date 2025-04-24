import { apiGet } from "./api.js";

export async function getAll(){
    let contenido = await apiGet("http://localhost:8000/get-all");
    let a,img,h3,p,div,span;
    let main = document.querySelector("main > div");
    contenido.forEach(elemento => {
        a = document.createElement("a");
        img = document.createElement("img");
        h3 = document.createElement("h3");
        p = document.createElement("p");
        div = document.createElement("div");
        
        main.appendChild(a);
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