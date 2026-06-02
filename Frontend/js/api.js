// Determinar dinámicamente la URL del servidor API backend
const API_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : (localStorage.getItem("API_URL") || "https://tienda-cucuta-backend.onrender.com");

// Exponer globalmente para otros scripts (main.js, pos.js, dashboard.js, tienda.html)
window.API_URL = API_URL;

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

    getTiendas: async () => {
        try {
            const response = await fetch(`${API_URL}/api/tiendas`);
            if (!response.ok) throw new Error("Error al conectar con el servidor para obtener tiendas");
            return await response.json();
        } catch (error) {
            console.error("Error en API getTiendas:", error);
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
            body: payload
        });
        return { status: response.status, data: await response.json() };
    },

    deleteProducto: async (id) => {
        const response = await fetch(`${API_URL}/api/productos/${id}`, {
            method: "DELETE"
        });
        return { status: response.status, data: await response.json() };
    },

    updateProducto: async (id, payload) => {
        const response = await fetch(`${API_URL}/api/productos/${id}`, {
            method: "PUT",
            body: payload
        });
        return { status: response.status, data: await response.json() };
    },

    getReportesKpis: async (tenderoId) => {
        const response = await fetch(`${API_URL}/api/reportes/kpis/${tenderoId}`);
        if (!response.ok) throw new Error("Fallo al obtener KPIs");
        return { status: response.status, data: await response.json() };
    },

    getReportesTopProductos: async (tenderoId) => {
        const response = await fetch(`${API_URL}/api/reportes/top-productos/${tenderoId}`);
        if (!response.ok) throw new Error("Fallo al obtener top productos");
        return { status: response.status, data: await response.json() };
    },

    getReportesAlertasStock: async (tenderoId) => {
        const response = await fetch(`${API_URL}/api/reportes/alertas-stock/${tenderoId}`);
        if (!response.ok) throw new Error("Fallo al obtener alertas de stock");
        return { status: response.status, data: await response.json() };
    },

    getReportesGrafico: async (tenderoId, fecha) => {
        let url = `${API_URL}/api/reportes/semana/${tenderoId}`;
        if (fecha) url += `?fecha=${fecha}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Fallo al obtener datos del grafico");
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
    },

    procesarVenta: async (payload) => {
        try {
            const response = await fetch(`${API_URL}/api/ventas`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            return { status: response.status, data: await response.json() };
        } catch (error) {
            console.error("Error en API procesarVenta:", error);
            return { status: 500, data: { error: "Error de red" } };
        }
    },

    getDashboardData: async (tenderoId) => {
        try {
            const response = await fetch(`${API_URL}/api/dashboard/${tenderoId}`);
            if (!response.ok) throw new Error("Fallo al obtener datos del dashboard");
            return { status: response.status, data: await response.json() };
        } catch (error) {
            console.error("Error en API getDashboardData:", error);
            return { status: 500, data: { error: "Error de red" } };
        }
    },

    getStoreSettings: async (tenderoId) => {
        try {
            const response = await fetch(`${API_URL}/api/tienda/configurar/${tenderoId}`);
            if (!response.ok) throw new Error("Fallo al obtener configuración");
            return { status: response.status, data: await response.json() };
        } catch (error) {
            console.error("Error en API getStoreSettings:", error);
            return { status: 500, data: { error: "Error de red" } };
        }
    },

    updateStoreSettings: async (tenderoId, payload) => {
        try {
            const response = await fetch(`${API_URL}/api/tienda/configurar/${tenderoId}`, {
                method: "PUT",
                body: payload
            });
            return { status: response.status, data: await response.json() };
        } catch (error) {
            console.error("Error en API updateStoreSettings:", error);
            return { status: 500, data: { error: "Error de red" } };
        }
    }
};