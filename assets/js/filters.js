let filtros = {
  texto: '',
  tipo: 'Todo',
  generosSeleccionados: []
};

export function searchText() {
    let searchInput = document.getElementById("searchInput");
    filtros.texto = searchInput.value.trim().toLowerCase();

    mostrarCards();
}

export function filterType(type) {
    filtros.tipo = type;

    let movieCards = document.querySelectorAll(".movie-card");

    if (type == "Todo") {
        movieCards.forEach(card => {
            let tipoContainer = card.querySelector("p");
            tipoContainer.classList.remove('ring-2', 'ring-white');
        });
    } else {
        movieCards.forEach(card => {
            let tipoContainer = card.querySelector("p");
            let tipo = tipoContainer?.textContent || "";
    
            if (tipo == type) {
                tipoContainer.classList.add('ring-2', 'ring-white');
            } else {
                tipoContainer.classList.remove('ring-2', 'ring-white');
            }
        });
    }

    mostrarCards();
}

export function filterGenre(genre) {
    if (filtros.generosSeleccionados.includes(genre)) filtros.generosSeleccionados.splice(filtros.generosSeleccionados.indexOf(genre), 1);
    else filtros.generosSeleccionados.push(genre);
    
    let movieCards = document.querySelectorAll(".movie-card");

    if (genre === "Todo") {
        filtros.generosSeleccionados = [];
        movieCards.forEach(card => {
            let generoSpans = card.querySelectorAll("div span");
            generoSpans.forEach(span => {
                span.classList.remove('ring-2', 'ring-white');
            });
        });
    } else {
        movieCards.forEach(card => {
            let generoSpans = card.querySelectorAll("div span");
            generoSpans.forEach(span => {
                let genero = span.getAttribute("genero");
    
                if (genero == genre && filtros.generosSeleccionados.includes(genero)) {
                    span.classList.add('ring-2', 'ring-white');
                } else if (genero == genre) {
                    span.classList.remove('ring-2', 'ring-white');
                }
            });
        });
    }

    mostrarCards();
}

export function cleanFilters() {
    filtros = {
        texto: '',
        tipo: 'Todo',
        generosSeleccionados: []
    }

    let searchInput = document.getElementById("searchInput");
    let tipoTodosButton = document.getElementById("typeFilters").firstElementChild;
    let generoTodosButton = document.getElementById("genreFilters").firstElementChild;

    searchInput.value = "";
    tipoTodosButton.click();
    generoTodosButton.click();
}

function mostrarCards() {
    let genreSections = document.querySelectorAll("#cards > div"); // todos los divs de género

    genreSections.forEach(section => {
        let movieCards = section.querySelectorAll(".movie-card");
        let genreTitle = section.querySelector("h3");

        let anyVisible = false;

        movieCards.forEach(card => {
            let titulo = card.querySelector("h3")?.textContent.trim().toLowerCase() || "";
            let tipo = card.querySelector("p")?.textContent || "";
            let generoSpans = card.querySelectorAll("div span");
            let generosDeLaCard = Array.from(generoSpans).map(span => span.getAttribute("genero"));

            let cumpleTexto = titulo.includes(filtros.texto);
            let cumpleTipo = (filtros.tipo === "Todo") || (tipo === filtros.tipo);
            let cumpleGeneros = filtros.generosSeleccionados.every(genero => generosDeLaCard.includes(genero));

            if (cumpleTexto && cumpleTipo && cumpleGeneros) {
                card.style.display = "";
                anyVisible = true;
            }
            else {
                card.style.display = "none";
            }
        });

        if (anyVisible) {
            genreTitle.style.display = "";
            section.style.display = "";
        } else {
            genreTitle.style.display = "none";
            section.style.display = "none";
        }
    });
}