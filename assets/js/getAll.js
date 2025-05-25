import { apiGet } from "./api.js";
import { filterType } from "./filters.js";
import { mapGeneroInverso } from "./mapGeneros.js";

export async function getAll(){
    let cards = document.getElementById("cards");
    let params = new URLSearchParams(window.location.search);
    let titulo = params.get("titulo");
    let tipo = params.get("tipo");
    let generos = params.getAll("genero");
    let isEliminar = params.get("eliminar");
    let isEditar = params.get("editar");

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

    let resultados = await apiGet(`http://localhost:8000/get-all${queryParams}`);
    let generosUnicos = [...new Set(resultados.peliculas.flatMap(pelicula => pelicula.genres))];
    
    generosUnicos.forEach(genero => {
        CreateGenreCarrusel(genero);
    });
    
    if (resultados.peliculas.some(pelicula => pelicula.genres.length == 0)) {
        CreateGenreCarrusel("Sin Género");
        generosUnicos.push("Sin Género");
    } 
    
    let principal,img,h3,p,div,span;
    resultados.peliculas.forEach(elemento => {
        let selector = null;
        if (isEliminar){
            if (elemento.type == "Serie"){
                selector = document.createElement("select");
                selector.classList.add("mb-2", "p-2", "md:mb-0", "bg-deep-black", "text-center", "text-gray-blue", "rounded-md");
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
                    selected.classList.remove('ring-4', 'ring-neon-cyan', 'ring-inset', 'selected');
                else{
                    let eliminarButton = document.getElementById("eliminar");
                    eliminarButton.disabled = false;
                }
                // Seleccionar esta
                event.target.closest('.movie-card').classList.add('ring-4', 'ring-neon-cyan', 'ring-inset', 'selected');
            });
        } else if (isEditar) {
            principal = document.createElement("div");
            principal.id = elemento.id;
            principal.classList.add("cursor-pointer");
            principal.addEventListener('click', (event) => {
                let selected = cards.querySelector('.selected');
                if (selected)
                    selected.classList.remove('ring-4', 'ring-neon-cyan', 'ring-inset', 'selected');
                else{
                    let editarButton = document.getElementById("editar");
                    editarButton.disabled = false;
                }
                // Seleccionar esta
                event.target.closest('.movie-card').classList.add('ring-4', 'ring-neon-cyan', 'ring-inset', 'selected');
            });
        } else {
            principal = document.createElement("a");
            principal.href = `watch.html?id=${elemento.id}`
        }
        img = document.createElement("img");
        h3 = document.createElement("h3");
        p = document.createElement("p");
        div = document.createElement("div");
        
        principal.appendChild(img);
        principal.appendChild(h3);
        principal.appendChild(p);
        principal.appendChild(div);
        if (selector)
            principal.appendChild(selector);

        principal.querySelector("div").addEventListener('click', (event) => {
            event.stopPropagation();
            event.preventDefault();
            let generoContainer = event.target.closest('span');
            let generoSeleccionado = generoContainer.getAttribute("genero");

            let boton = document.querySelector(`button[data-genero="${generoSeleccionado}"]`);
            boton.click();
        });

        principal.querySelector("p").addEventListener('click', (event) => {
            event.stopPropagation();
            event.preventDefault();

            let tipoContainer = event.target.closest('p');
            let tipoSeleccionado = tipoContainer.innerText;
            
            if (tipoContainer.classList.contains("ring-2")) tipoSeleccionado = "Todo"; //Si ya estaba seleccionado, metiendo esto hace que se deseleccione

            let boton = document.querySelector(`button[data-tipo="${tipoSeleccionado}"]`);
            boton.click();
        });
        
        principal.classList.add("movie-card","bg-steel-blue","md:w-[350px]","w-[260px]","xl:w-[440px]","p-4","flex-shrink-0","rounded-lg","shadow-lg","flex","flex-col","items-center","hover:brightness-110","hover:saturate-125","transition");
        img.src = !elemento.poster ? "../assets/img/poster.jpg" : elemento.poster;
        img.alt = "Portada";
        img.className = "w-full md:h-[440px] h-[300px] xl:h-[600px] rounded-md shadow-md object-cover";
        h3.classList.add("text-neon-cyan", "text-lg", "font-bold", "mt-2", "text-center");
        h3.innerText = elemento.title;
        p.classList.add("movie-type", "text-sm", "text-gray-blue", "text-center", "bg-neon-cyan/20", "px-2", "py-1", "rounded-md", "cursor-pointer");
        p.innerText = elemento.type;
        if (tipo == elemento.type) p.classList.add('ring-2', 'ring-white');
        div.classList.add("flex", "flex-wrap", "gap-2", "my-2");

        elemento.genres.forEach(genero => {
            span = document.createElement("span");
            
            div.appendChild(span);
            
            span.classList.add("movie-genre", "bg-neon-cyan", "text-midnight-blue", "px-3", "py-1", "rounded-full", "text-xs", "font-bold", "cursor-pointer");
            if (generos.includes(genero)) span.classList.add('ring-2', 'ring-white');
            span.setAttribute("genero",genero);
            span.innerText = genero;
        });
        
        let clone;
        elemento.genres.forEach(genero => {
            clone = principal.cloneNode(true);
            clone.querySelector("div").addEventListener('click', (event) => {
                event.stopPropagation();
                event.preventDefault();
                let generoContainer = event.target.closest('span');
                let generoSeleccionado = generoContainer.getAttribute("genero");

                let boton = document.querySelector(`button[data-genero="${generoSeleccionado}"]`);
                boton.click();
            });

            
            clone.querySelector("p").addEventListener('click', (event) => {
                event.stopPropagation();
                event.preventDefault();
                let tipoContainer = event.target.closest('p');
                let tipoSeleccionado = tipoContainer.innerText;
                
                if (tipoContainer.classList.contains("ring-2")) tipoSeleccionado = "Todo"; //Si ya estaba seleccionado, metiendo esto hace que se deseleccione
                
                let boton = document.querySelector(`button[data-tipo="${tipoSeleccionado}"]`);
                boton.click();
            });

            if (isEliminar) {
                clone.addEventListener('click', (event) => {
                    let selected = cards.querySelector('.selected');
                    if (selected)
                        selected.classList.remove('ring-4', 'ring-neon-cyan', 'ring-inset', 'selected');
                    else{
                        let eliminarButton = document.getElementById("eliminar");
                        eliminarButton.disabled = false;
                    }
                    // Seleccionar esta
                    event.target.closest('.movie-card').classList.add('ring-4', 'ring-neon-cyan', 'ring-inset', 'selected');
                });

                if (clone.querySelector("p").innerText == "Serie") clone.querySelector("select").value = "";
            }

            if (isEditar) {
                clone.addEventListener('click', (event) => {
                    let selected = cards.querySelector('.selected');
                    if (selected)
                        selected.classList.remove('ring-4', 'ring-neon-cyan', 'ring-inset', 'selected');
                    else{
                        let editarButton = document.getElementById("editar");
                        editarButton.disabled = false;
                    }
                    // Seleccionar esta
                    event.target.closest('.movie-card').classList.add('ring-4', 'ring-neon-cyan', 'ring-inset', 'selected');
                });
            }

            document.getElementById(`genero-${genero}`).querySelector("div").appendChild(clone);
        });

        if (elemento.genres.length == 0) {
            document.getElementById(`genero-Sin Género`).querySelector("div").appendChild(principal);
        }
    });
    return generosUnicos;
}

function CreateGenreCarrusel (genero) {
    let divGenero = document.createElement("div");
    let h3 = document.createElement("h3");
    let div = document.createElement("div");

    cards.appendChild(divGenero);
    divGenero.appendChild(h3);
    divGenero.appendChild(div);

    divGenero.id = `genero-${genero}`;
    divGenero.className = "w-full";
    div.className = "flex gap-4 overflow-x-auto overflow-y-hidden";
    h3.innerText = genero;
    h3.className = "text-lg md:text-xl text-neon-cyan font-bold mb-6";
}