// Determinar dinámicamente la URL del servidor API backend (sin barras finales duplicadas)
const RAW_API_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : (localStorage.getItem("API_URL") || "https://tienda-cucuta-backend.onrender.com");

const API_URL = String(RAW_API_URL).trim().replace(/\/+$/, "");

// Helper para construir rutas limpias sin dobles barras (ej. https://dominio.com/api/admin/tiendas)
function buildApiUrl(endpoint) {
    const cleanEndpoint = String(endpoint || "").trim().replace(/^\/+/, "");
    return `${API_URL}/${cleanEndpoint}`;
}

// Exponer globalmente para otros scripts (main.js, pos.js, dashboard.js, tienda.html)
window.API_URL = API_URL;

/**
 * Módulo Central de Peticiones al Servidor
 */
window.API = {
    login: async (email, password) => {
        const response = await fetch(buildApiUrl("/login"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        return { status: response.status, data: await response.json() };
    },

    registro: async (payload) => {
        const response = await fetch(buildApiUrl("/api/registro"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        return { status: response.status, data: await response.json() };
    },

    getProductos: async () => {
        try {
            const response = await fetch(buildApiUrl("/productos"));
            if (!response.ok) throw new Error("Error al conectar con el servidor");
            return await response.json();
        } catch (error) {
            console.error("Error en API:", error);
            return [];
        }
    },

    getTiendas: async () => {
        try {
            const response = await fetch(buildApiUrl("/api/tiendas"));
            if (!response.ok) throw new Error("Error al conectar con el servidor para obtener tiendas");
            return await response.json();
        } catch (error) {
            console.error("Error en API getTiendas:", error);
            return [];
        }
    },

    buscarProductosGlobal: async (query = "") => {
        try {
            const response = await fetch(buildApiUrl(`/api/productos/buscar?q=${encodeURIComponent(query)}`));
            if (!response.ok) throw new Error("Error al buscar productos globalmente");
            return await response.json();
        } catch (error) {
            console.error("Error en API buscarProductosGlobal:", error);
            return [];
        }
    },

    getProductosTendero: async (tenderoId) => {
        const response = await fetch(buildApiUrl(`/api/productos/${encodeURIComponent(tenderoId)}`));
        if (!response.ok) throw new Error("Fallo al obtener inventario del tendero");
        return { status: response.status, data: await response.json() };
    },

    createProducto: async (formData) => {
        const response = await fetch(buildApiUrl("/api/productos"), {
            method: "POST",
            body: formData
        });
        return { status: response.status, data: await response.json() };
    },

    deleteProducto: async (id) => {
        const response = await fetch(buildApiUrl(`/api/productos/${encodeURIComponent(id)}`), {
            method: "DELETE"
        });
        return { status: response.status, data: await response.json() };
    },

    updateProducto: async (id, formData) => {
        const response = await fetch(buildApiUrl(`/api/productos/${encodeURIComponent(id)}`), {
            method: "PUT",
            body: formData
        });
        return { status: response.status, data: await response.json() };
    },

    getReportesKpis: async (tenderoId) => {
        const response = await fetch(buildApiUrl(`/api/reportes/kpis/${encodeURIComponent(tenderoId)}`));
        if (!response.ok) throw new Error("Fallo al obtener KPIs");
        return { status: response.status, data: await response.json() };
    },

    getReportesTopProductos: async (tenderoId) => {
        const response = await fetch(buildApiUrl(`/api/reportes/top-productos/${encodeURIComponent(tenderoId)}`));
        if (!response.ok) throw new Error("Fallo al obtener top productos");
        return { status: response.status, data: await response.json() };
    },

    getReportesAlertasStock: async (tenderoId) => {
        const response = await fetch(buildApiUrl(`/api/reportes/alertas-stock/${encodeURIComponent(tenderoId)}`));
        if (!response.ok) throw new Error("Fallo al obtener alertas de stock");
        return { status: response.status, data: await response.json() };
    },

    getReportesGrafico: async (tenderoId, fecha) => {
        let endpoint = `/api/reportes/semana/${encodeURIComponent(tenderoId)}`;
        if (fecha) endpoint += `?fecha=${encodeURIComponent(fecha)}`;
        const response = await fetch(buildApiUrl(endpoint));
        if (!response.ok) throw new Error("Fallo al obtener datos del grafico");
        return { status: response.status, data: await response.json() };
    },

    validateEmail: async (email) => {
        const response = await fetch(buildApiUrl("/api/verificar-correo"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });
        try {
            return { status: response.status, data: await response.json() };
        } catch {
            return { status: 404, data: { error: "Error procesando validación." } };
        }
    },

    updatePassword: async (email, password) => {
        const response = await fetch(buildApiUrl("/api/actualizar-password"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        try {
            return { status: response.status, data: await response.json() };
        } catch {
            return { status: 500, data: { error: "Error procesando actualización." } };
        }
    },

    procesarVenta: async (payload) => {
        try {
            const response = await fetch(buildApiUrl("/api/ventas"), {
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
            const response = await fetch(buildApiUrl(`/api/dashboard/${encodeURIComponent(tenderoId)}`));
            if (!response.ok) throw new Error("Fallo al obtener datos del dashboard");
            return { status: response.status, data: await response.json() };
        } catch (error) {
            console.error("Error en API getDashboardData:", error);
            return { status: 500, data: { error: "Error de red" } };
        }
    },

    getStoreSettings: async (tenderoId) => {
        try {
            const response = await fetch(buildApiUrl(`/api/tienda/configurar/${encodeURIComponent(tenderoId)}`));
            if (!response.ok) throw new Error("Fallo al obtener configuración");
            return { status: response.status, data: await response.json() };
        } catch (error) {
            console.error("Error en API getStoreSettings:", error);
            return { status: 500, data: { error: "Error de red" } };
        }
    },

    updateStoreSettings: async (tenderoId, formData) => {
        try {
            const response = await fetch(buildApiUrl(`/api/tienda/configurar/${encodeURIComponent(tenderoId)}`), {
                method: "PUT",
                body: formData
            });
            return { status: response.status, data: await response.json() };
        } catch (error) {
            console.error("Error en API updateStoreSettings:", error);
            return { status: 500, data: { error: "Error de red" } };
        }
    },

    getVitrina: async (tenderoId) => {
        try {
            const response = await fetch(buildApiUrl(`/api/vitrina/${encodeURIComponent(tenderoId)}`));
            if (!response.ok) throw new Error("Fallo al obtener vitrina");
            return await response.json();
        } catch (error) {
            console.error("Error en API getVitrina:", error);
            return [];
        }
    },

    saveOferta: async (payload) => {
        try {
            const response = await fetch(buildApiUrl("/api/vitrina"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            return { status: response.status, data: await response.json() };
        } catch (error) {
            console.error("Error en API saveOferta:", error);
            return { status: 500, data: { error: "Error de red" } };
        }
    },

    deleteOferta: async (ofertaId) => {
        try {
            const response = await fetch(buildApiUrl(`/api/vitrina/${encodeURIComponent(ofertaId)}`), {
                method: "DELETE"
            });
            return { status: response.status, data: await response.json() };
        } catch (error) {
            console.error("Error en API deleteOferta:", error);
            return { status: 500, data: { error: "Error de red" } };
        }
    },

    getAdminTiendas: async () => {
        const url = buildApiUrl("/api/admin/tiendas");
        try {
            const response = await fetch(url, {
                method: "GET",
                headers: { "Accept": "application/json" }
            });
            if (response.ok) {
                return await response.json();
            }
            const fallbackTiendas = await window.API.getTiendas();
            const allProds = await window.API.buscarProductosGlobal("").catch(() => []);
            const countsByStore = {};
            if (Array.isArray(allProds)) {
                allProds.forEach((p) => {
                    const tid = p.id_tendero || p.id_tienda;
                    if (tid != null) countsByStore[tid] = (countsByStore[tid] || 0) + 1;
                });
            }
            const enrichedTiendas = fallbackTiendas
                .filter((t) => (t.rol || "tendero").toLowerCase() !== "superadmin" && t.nombre_tienda !== "Administración Central")
                .map((t) => ({
                    ...t,
                    total_productos: t.total_productos != null ? parseInt(t.total_productos, 10) : (countsByStore[t.id_tendero] || 0)
                }));
            const sortedFallback = [...enrichedTiendas].sort((a, b) => (parseInt(b.total_productos, 10) || 0) - (parseInt(a.total_productos, 10) || 0));
            return {
                success: true,
                tiendas: enrichedTiendas,
                metricas: {
                    total_usuarios: enrichedTiendas.length + 6,
                    total_tiendas: enrichedTiendas.length,
                    tienda_mas_activa: sortedFallback[0]?.nombre_tienda || "Variedades Torcoroma",
                    producto_popular: allProds[0]?.nombre || "Panela Pulverizada"
                }
            };
        } catch (error) {
            console.error("Error en API getAdminTiendas:", error);
            return { success: false, tiendas: [], metricas: {} };
        }
    },

    getAdminTiendaProductos: async (id) => {
        const targetId = encodeURIComponent(id);
        const url = buildApiUrl(`/api/admin/tiendas/${targetId}/productos`);
        try {
            let response = await fetch(url, {
                method: "GET",
                headers: { "Accept": "application/json" }
            });
            if (response.status === 404) {
                response = await fetch(buildApiUrl(`/api/productos/${targetId}`), {
                    method: "GET",
                    headers: { "Accept": "application/json" }
                });
            }
            const isJson = (response.headers.get("content-type") || "").includes("application/json");
            const data = isJson ? await response.json() : [];
            return { status: response.status, data: Array.isArray(data) ? data : (data.productos || []) };
        } catch (error) {
            console.error("Error en API getAdminTiendaProductos:", error);
            return { status: 500, data: [] };
        }
    },

    updateAdminTienda: async (id, payload) => {
        const targetId = encodeURIComponent(id);
        const url = buildApiUrl(`/api/admin/tiendas/${targetId}`);
        const response = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(payload)
        });
        const isJson = (response.headers.get("content-type") || "").includes("application/json");
        const data = isJson ? await response.json() : { error: `Error HTTP ${response.status}` };
        return { status: response.status, data };
    },

    deleteAdminTienda: async (id) => {
        const targetId = encodeURIComponent(id);
        const url = buildApiUrl(`/api/admin/tiendas/${targetId}`);
        const response = await fetch(url, {
            method: "DELETE",
            headers: { "Content-Type": "application/json", "Accept": "application/json" }
        });
        const isJson = (response.headers.get("content-type") || "").includes("application/json");
        const data = isJson ? await response.json() : { error: `Error HTTP ${response.status}` };
        return { status: response.status, data };
    },

    deleteOfertaLegacy: async (ofertaId) => {
        try {
            const response = await fetch(buildApiUrl(`/api/vitrina/${encodeURIComponent(ofertaId)}`), {
                method: "DELETE"
            });
            return { status: response.status, data: await response.json() };
        } catch (error) {
            console.error("Error en API deleteOferta:", error);
            return { status: 500, data: { error: "Error de red" } };
        }
    }
};
