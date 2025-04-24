export function renderPagination(currentPage, totalPages, top, bottom) {
    let paginationContainer = document.createElement("div");
    paginationContainer.classList.add("flex", "gap-2", "my-6", "justify-center");

    if (totalPages <= 1)
        return
    let maxVisible = 10;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = startPage + maxVisible - 1;

    if (endPage > totalPages) {
        endPage = totalPages;
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    // Botón anterior
    if (currentPage > 1) {
        let prevBtn = createPageButton("<", currentPage - 1);
        paginationContainer.appendChild(prevBtn);
    }

    // Primer página con "..."
    if (startPage > 1) {
        paginationContainer.appendChild(createPageButton(1, 1));
        let dots = document.createElement("span");
        dots.textContent = "...";
        dots.classList.add("text-gray-400", "mx-1");
        paginationContainer.appendChild(dots);
    }

    // Páginas visibles
    for (let i = startPage; i <= endPage; i++) {
        let pageBtn = createPageButton(i, i, i === currentPage);
        paginationContainer.appendChild(pageBtn);
    }

    // Última página con "..."
    if (endPage < totalPages) {
        let dots = document.createElement("span");
        dots.textContent = "...";
        dots.classList.add("text-gray-400", "mx-1");
        paginationContainer.appendChild(dots);
        paginationContainer.appendChild(createPageButton(totalPages, totalPages));
    }

    // Botón siguiente
    if (currentPage < totalPages) {
        let nextBtn = createPageButton(">", currentPage + 1);
        paginationContainer.appendChild(nextBtn);
    }
    let paginationContainerBottom = paginationContainer.cloneNode(true);
    paginationContainer.addEventListener("click",cambiarPagina);
    paginationContainerBottom.addEventListener("click",cambiarPagina);
    top.insertAdjacentElement("afterend", paginationContainer);
    bottom.insertAdjacentElement("afterend", paginationContainerBottom);
}

function createPageButton(text, pageNumber, isActive = false) {
    let button = document.createElement("button");
    button.textContent = text;
    button.classList.add("px-3", "py-1", "rounded", "border", "text-sm");

    if (isActive) {
        button.classList.add("bg-neon-cyan", "text-midnight-blue", "font-bold");
    } else {
        button.classList.add("hover:bg-gray-200", "transition");
    }

    button.setAttribute("page", pageNumber);

    return button;
}

function cambiarPagina(event){
    let button = event.target;
    if (button.tagName === "BUTTON") {
        let pageNumber = button.getAttribute("page");
        let url = new URL(window.location.href);
        url.searchParams.set('pagina', pageNumber); // Agrega o reemplaza el parámetro "nuevo"
        window.location.href = url.toString(); // Redirige con el nuevo query param
    }
}