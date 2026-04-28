const API_URL = "http://localhost:3000";

/**
 * Módulo Central de Peticiones al Servidor
 */
window.API = {
    login: async (email, password) => {
        const response = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        return { status: response.status, data: await response.json() };
    },

    registro: async (payload) => {
        const response = await fetch(`${API_URL}/api/registro`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        return { status: response.status, data: await response.json() };
    },

    getProductos: async () => {
        try {
            const response = await fetch(`${API_URL}/productos`);
            if (!response.ok) throw new Error("Error al conectar con el servidor");
            return await response.json();
        } catch (error) {
            console.error("Error en API:", error);
            return [];
        }
    },

    getProductosTendero: async (tenderoId) => {
        const response = await fetch(`${API_URL}/api/productos/${tenderoId}`);
        if (!response.ok) throw new Error("Fallo al obtener inventario del tendero");
        return { status: response.status, data: await response.json() };
    },

    createProducto: async (payload) => {
        const response = await fetch(`${API_URL}/api/productos`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload)
        });
        return { status: response.status, data: await response.json() };
    },

    validateEmail: async (email) => {
        const response = await fetch(`${API_URL}/api/verificar-correo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });
        try {
            return { status: response.status, data: await response.json() };
        } catch {
            return { status: 404, data: { error: "Error procesando validación." }};
        }
    },

    updatePassword: async (email, password) => {
        const response = await fetch(`${API_URL}/api/actualizar-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        try {
            return { status: response.status, data: await response.json() };
        } catch {
            return { status: 500, data: { error: "Error procesando actualización." }};
        }
    }
};