// Headers por defecto
const defaultHeaders = {
    "Content-Type": "application/json"
};

// Función para construir la URL con parámetros
function buildUrl(url, params) {
    if (!params || Object.keys(params).length === 0) return url;

    const queryString = new URLSearchParams(params).toString();
    return `${url}?${queryString}`;
}

// Función genérica para realizar solicitudes HTTP
async function httpRequest(method, url, params = {}, data = null) {
    try {
        const fullUrl = buildUrl(url, params);
        const options = {
            method,
            headers: defaultHeaders,
            credentials: "include" // Para enviar cookies en las solicitudes
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(fullUrl, options);

        // Verificar si la respuesta es exitosa
        if (!response.ok) {
            const errorData = await response.json();

            // Manejo específico de errores de autenticación
            if (response.status === 401 || response.status === 403) {
                window.location.href = "./login.html";
                return null;
            }

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

export async function apiPostArchivo(url, archivo, nombre) {
    const formData = new FormData();
    formData.append("file", archivo, nombre);

    const response = await fetch(url, {
        method: "POST",
        body: formData,
        headers: {
            "Authorization": "Bearer castmanu"
        }
    });

    if (!response.ok) {
        const errorText = await response.json();
        throw new Error(`Error ${response.status}: ${errorText}`);
    }

    return await response.json();
}