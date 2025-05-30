// Función para construir la URL con parámetros
function buildUrl(url, params) {
    if (!params || Object.keys(params).length === 0) return url;

    let queryString = new URLSearchParams(params).toString();
    return `${url}?${queryString}`;
}

function getDefaultHeaders() {
    let token = localStorage.getItem("token");

    let headers = {
        "Content-Type": "application/json"
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
}

// Función genérica para realizar solicitudes HTTP
async function httpRequest(method, url, params = {}, data = null) {
    try {
        let fullUrl = buildUrl(url, params);
        let options = {
            method,
            headers: getDefaultHeaders(),
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        let response = await fetch(fullUrl, options);

        // Verificar si la respuesta es exitosa
        if (!response.ok) {
            let errorData = await response.json();

            throw new Error(`Error ${response.status}: ${errorData.detail || response.statusText}`);
        }

        // Si la respuesta tiene contenido, devolverlo
        if (response.status !== 204) {
            return await response.json();
        }

        return null; // Para respuestas sin contenido (204 No Content)
    } catch (error) {
        console.error(`Error en ${method} ${url}:`, error.message);
        throw error;
    }
}

// Métodos específicos
export async function apiGet(url, params = {}) {
    return await httpRequest("GET", url, params);
}

export async function apiPost(url, data) {
    return await httpRequest("POST", url, {}, data);
}

export async function apiPut(url, data) {
    return await httpRequest("PUT", url, {}, data);
}

export async function apiDelete(url, params = {}) {
    return await httpRequest("DELETE", url, params);
}

export async function apiGetServer(url) {
    let response = await fetch(url, {
        method: "Get",
        headers: {
            "Authorization": "Bearer castmanu"
        }
    });

    if (!response.ok) {
        let errorText = await response.json();
        throw new Error(`Error ${response.status}: ${errorText}`);
    }

    return await response.json();
}

export async function apiPatchServer(url) {
    let response = await fetch(url, {
        method: "PATCH",
        headers: {
            "Authorization": "Bearer castmanu"
        }
    });

    if (!response.ok) {
        let errorText = await response.json();
        throw new Error(`Error ${response.status}: ${errorText}`);
    }

    return await response.json();
}

export async function apiPostServer(url, archivo, nombre) {
    let formData = new FormData();
    formData.append("file", archivo, nombre);

    let response = await fetch(url, {
        method: "POST",
        body: formData,
        headers: {
            "Authorization": "Bearer castmanu"
        }
    });

    if (!response.ok) {
        let errorText = await response.json();
        throw new Error(`Error ${response.status}: ${errorText}`);
    }

    return await response.json();
}

export async function apiDeleteServer(url) {
    let response = await fetch(url, {
        method: "DELETE",
        headers: {
            "Authorization": "Bearer castmanu"
        }
    });

    if (!response.ok) {
        let errorText = await response.json();
        throw new Error(`Error ${response.status}: ${errorText}`);
    }

    return await response.json();
}