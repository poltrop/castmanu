import { apiDelete, apiDeleteServer, apiPost, apiGet } from "../api.js";
import { autorizado } from "../comprobarLogin.js";
import { cleanFilters, filterGenre, filterType, searchText } from "../filters.js";
import { getAll } from "../getAll.js";
import { initHeader } from "../header.js";
import { getGenreType } from "../mapGeneros.js";

document.addEventListener("DOMContentLoaded", async () => {
    let user = await autorizado();
    await initHeader(user.admin == 1, true);
    // Parte de filtros DESPUES DE CARGAR TODO
    let cleanButton = document.getElementById("cleanButton");
    let searchInput = document.getElementById("searchInput");
    let typeFilterButtons = document.querySelectorAll('#typeFilters button');
    
    cleanButton.addEventListener("click",cleanFilters)
    searchInput.addEventListener("input",searchText);
    typeFilterButtons.forEach(button => {
        button.addEventListener('click', () => {
            let tipoSeleccionado = button.dataset.tipo;
            
            if (button.classList.contains("ring-2")) tipoSeleccionado = "Todo"; //Si ya estaba seleccionado, metiendo esto hace que se deseleccione
            
            typeFilterButtons.forEach(btn => {
                btn.classList.remove('ring-2', 'ring-white', 'ring-inset', 'bg-neon-cyan', 'text-midnight-blue');
            });
            
            if (tipoSeleccionado != "Todo") button.classList.add('ring-2', 'ring-white', 'ring-inset', 'bg-neon-cyan', 'text-midnight-blue');
            
            filterType(tipoSeleccionado);
        });
    });
    
    let params = new URLSearchParams(window.location.search);
    let isEliminar = params.get("eliminar");
    let isEditar = params.get("editar");
    
    let aside = document.querySelector("aside");
    let burger = document.getElementById("sidebarToggle");
    burger.addEventListener("click", () => {
        aside.classList.toggle("scale-x-0");
        if (aside.classList.contains("w-0")) {
            if (window.innerWidth < 768) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                aside.classList.add("h-screen");
            }
            aside.classList.remove("w-0", "md:w-0", "h-0");
            aside.classList.add("w-full", "md:w-64");
            
        } else {
            aside.classList.remove("w-full", "md:w-64");
            aside.classList.add("w-0", "md:w-0");
            setTimeout(() => {
                aside.classList.remove("h-screen");
                aside.classList.add("h-0");
            }, 300);
        }
    });
    
    // Ejecucion de funciones que rellenan cosas
    let generosUsados = await getAll();
    let genreFilters = document.getElementById('genreFilters');
    
    // Opción "Todos"
    let allGenresBtn = document.createElement('button');
    allGenresBtn.textContent = "Todos";
    allGenresBtn.className = "bg-deep-black px-4 py-2 rounded hover:bg-neon-cyan hover:text-midnight-blue transition";
    allGenresBtn.dataset.genero = "Todo";
    genreFilters.appendChild(allGenresBtn);
    
    // Crear botones de género
    generosUsados.forEach(g => {
        let btn = document.createElement('button');
        btn.textContent = g;
        btn.className = "bg-deep-black px-4 py-2 rounded hover:bg-neon-cyan hover:text-midnight-blue transition";
        btn.dataset.genero = g;
        if (getGenreType(g)) btn.classList.add(getGenreType(g));
        genreFilters.appendChild(btn);
    });

    let genreFilterButtons = document.querySelectorAll('#genreFilters button');
    genreFilterButtons.forEach(button => {
        button.addEventListener('click', () => {
            let generoSeleccionado = button.dataset.genero;
            let seleccionado = button.classList.contains("ring-2") ? false : true;
            
            genreFilterButtons.forEach(btn => {
                let generoActual = btn.dataset.genero;
                
                if (generoSeleccionado == "Todo") btn.classList.remove('ring-2', 'ring-white', 'ring-inset', 'bg-neon-cyan', 'text-midnight-blue');
                else {
                    if (generoActual == generoSeleccionado && seleccionado) {
                        btn.classList.add('ring-2', 'ring-white', 'ring-inset', 'bg-neon-cyan', 'text-midnight-blue');
                    } else if (generoActual == generoSeleccionado) {
                        btn.classList.remove('ring-2', 'ring-white', 'ring-inset', 'bg-neon-cyan', 'text-midnight-blue');
                    }
                }
            });
            
            filterGenre(generoSeleccionado);
        });
    });

    let main = document.querySelector('main');
    if (isEliminar) {
        let h1 = document.createElement('h1');
        h1.className = 'text-2xl md:text-3xl text-neon-cyan font-bold mb-6';
        h1.textContent = 'Selecciona un elemento para eliminar';

        let button = document.createElement('button');
        button.id = 'eliminar';
        button.className = 'mt-6 bg-neon-cyan text-midnight-blue px-6 py-2 rounded-md font-bold hover:scale-105 transition mb-8 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:text-gray-600 disabled:hover:scale-100';
        button.disabled = true;
        button.textContent = 'Eliminar';
        button.addEventListener("click", eliminar);

        main.appendChild(button);
        main.insertBefore(h1, main.firstChild);
    }
    
    if (isEditar) {
        let h1 = document.createElement('h1');
        h1.className = 'text-2xl md:text-3xl text-neon-cyan font-bold mb-6';
        h1.textContent = 'Selecciona un elemento para editar';

        let button = document.createElement('button');
        button.id = 'editar';
        button.className = 'mt-6 bg-neon-cyan text-midnight-blue px-6 py-2 rounded-md font-bold hover:scale-105 transition mb-8 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:text-gray-600 disabled:hover:scale-100';
        button.disabled = true;
        button.textContent = 'Editar';
        button.addEventListener("click", editar);

        main.appendChild(button);
        main.insertBefore(h1, main.firstChild);
    }

    async function eliminar(){
        let cards = document.getElementById("cards");
        let card = cards.querySelector('.selected');
        let title = card.querySelector("h3").innerText;
        let type = card.querySelector("p").innerText;

        let errorMsg = document.getElementById('errorMsg');
        if (!errorMsg) {
            errorMsg = document.createElement('div');
            errorMsg.id = 'errorMsg';
            errorMsg.className = 'text-red-400';
            let main = document.querySelector('main');
            main.appendChild(errorMsg);
        }

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
            let link;
            if (type == "Serie")
                link = `https://castmanu.ddns.net/videos/${type}/${title}/${card.querySelector("select").value}/master.m3u8`;
            else
                link = `https://castmanu.ddns.net/videos/${type}/${title}/master.m3u8`;
            let existe = await fetch(link, {
                method: 'GET',
              });
            if (!existe.ok){
                errorMsg.innerText = "El archivo aun no se ha subido y por tanto no se puede borrar. Inténtalo mas tarde";
                loading.classList.add("hidden");
                return
            }
            let resultadoDB = await apiDelete(`http://localhost:8000/delete-film/${card.id}${capitulo}`);
            
            if (!resultadoDB.success){
                errorMsg.innerText = resultadoDB.message;
                loading.classList.add("hidden");
                return
            }
            
            let resultadoVideo = await apiDeleteServer(`https://castmanu.ddns.net/delete/${title}/${type}${capitulo}`);
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
                        idExt: resultadoDB.datos.idExt,
                        extension: resultadoDB.datos.extension
                    };
                    await apiPost('http://localhost:8000/add-film', datos);
                    await Promise.all(
                        resultadoDB.datos.capitulos.map(capitulo => { //Permite que se añadan todos a la vez
                            let datos = {
                                idSerie: resultadoDB.datos.id,
                                capitulo: capitulo.capitulo,
                                extension: capitulo.extension
                            };
                            return apiPost('http://localhost:8000/add-capitulo', datos);
                        })
                    );
                } else {
                    datos = {
                        idSerie: resultadoDB.datos.idSerie,
                        capitulo: resultadoDB.datos.capitulo,
                        extension: resultadoDB.datos.extension
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

    function editar(){
        let cards = document.getElementById("cards");
        let card = cards.querySelector('.selected');
        let id = card.id;
        window.location.href = `rellenar.html?editar=true&id=${id}`;
    }
});
