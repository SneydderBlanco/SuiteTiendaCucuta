/**
 * superadmin.js
 * Controlador del Panel de SuperAdministrador (Tiendas Cúcuta)
 * Incluye Mapa Interactivo Leaflet.js (OpenStreetMap) y CRUD completo de tiendas (/api/admin/tiendas).
 */

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Referencias del DOM - Navegación y Layout
    const sidebar = document.getElementById("superadmin-sidebar");
    const sidebarBackdrop = document.getElementById("sidebar-backdrop");
    const btnMobileSidebar = document.getElementById("btn-mobile-sidebar");

    const navDashboard = document.getElementById("nav-sa-dashboard");
    const navTiendas = document.getElementById("nav-sa-tiendas");
    const navLogout = document.getElementById("nav-sa-logout");
    const btnHeaderLogout = document.getElementById("btn-header-logout");

    const seccionKpis = document.getElementById("seccion-sa-kpis");
    const seccionMapa = document.getElementById("seccion-sa-mapa");
    const seccionTiendas = document.getElementById("seccion-sa-tiendas");

    const viewTitle = document.getElementById("sa-view-title");
    const viewSubtitle = document.getElementById("sa-view-subtitle");

    // 2. Referencias de Búsqueda, Mapa y Tabla CRUD
    const searchInput = document.getElementById("sa-search-input");
    const btnRefresh = document.getElementById("btn-sa-refresh");
    const btnResetMap = document.getElementById("btn-reset-map");
    const tiendasTbody = document.getElementById("sa-tiendas-tbody");
    const tableCountBadge = document.getElementById("sa-table-count");
    const mapCounterBadge = document.getElementById("sa-map-counter");

    // 3. Referencias del Modal de Edición (PUT /api/admin/tiendas/:id)
    const editModal = document.getElementById("sa-edit-store-modal");
    const editForm = document.getElementById("sa-edit-store-form");
    const btnCloseEditModal = document.getElementById("btn-close-edit-store-modal");
    const btnCancelEditModal = document.getElementById("btn-cancel-edit-store");

    // Mostrar nombre del SuperAdmin
    const storedName = localStorage.getItem("userName");
    const superAdminNameEl = document.getElementById("superadmin-name");
    if (storedName && superAdminNameEl) {
        superAdminNameEl.textContent = storedName;
    }

    // Estado en memoria
    let allStores = [];
    const cucutaCenter = [7.8939, -72.5078];
    let map = null;
    let markersLayer = null;

    // --- Inicializar Mapa Leaflet.js con OpenStreetMap ---
    function initSuperAdminMap() {
        const mapContainer = document.getElementById("sa-mapa-tiendas");
        if (!mapContainer || typeof L === "undefined") return;

        map = L.map("sa-mapa-tiendas", {
            zoomControl: false
        }).setView(cucutaCenter, 13);

        L.control.zoom({ position: "bottomright" }).addTo(map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        markersLayer = L.layerGroup().addTo(map);

        setTimeout(() => {
            map.invalidateSize();
        }, 350);
    }

    if (btnResetMap) {
        btnResetMap.addEventListener("click", () => {
            if (map) {
                map.flyTo(cucutaCenter, 13, { duration: 0.8 });
            }
        });
    }

    // --- Renderizar Marcadores de Tiendas en el Mapa ---
    function renderStoreMarkers(stores) {
        if (!map || !markersLayer) return;
        markersLayer.clearLayers();

        if (mapCounterBadge) {
            mapCounterBadge.textContent = `${stores.length} Tiendas en el mapa`;
        }

        stores.forEach((tienda, idx) => {
            let lat = parseFloat(tienda.latitud);
            let lng = parseFloat(tienda.longitud);

            // Si la tienda no tiene coordenadas exactas aún, distribuir alrededor del centro de Cúcuta
            if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
                const angle = (idx * 137.5) * (Math.PI / 180);
                const distance = 0.006 + (idx % 5) * 0.0035;
                lat = cucutaCenter[0] + Math.sin(angle) * distance;
                lng = cucutaCenter[1] + Math.cos(angle) * distance;
            }

            const markerIcon = L.divIcon({
                className: "custom-sa-marker",
                html: `
                    <div style="
                        width: 34px;
                        height: 34px;
                        border-radius: 9999px;
                        background: linear-gradient(135deg, #059669, #047857);
                        border: 2.5px solid #ffffff;
                        box-shadow: 0 6px 14px rgba(5, 150, 105, 0.45);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #ffffff;
                    ">
                        <span class="material-symbols-outlined" style="font-size: 18px;">storefront</span>
                    </div>
                `,
                iconSize: [34, 34],
                iconAnchor: [17, 17],
                popupAnchor: [0, -18]
            });

            const marker = L.marker([lat, lng], { icon: markerIcon });
            const storeTitle = tienda.nombre_tienda || "Tienda Sin Nombre";
            const ownerName = tienda.nombre || "Propietario";
            const address = tienda.ubicacion || "Cúcuta, Norte de Santander";
            const totalProds = parseInt(tienda.total_productos, 10) || 0;

            marker.bindPopup(`
                <div style="min-width: 190px; padding: 2px;">
                    <p style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #059669; margin: 0 0 2px 0;">
                        #TC-${tienda.id_tendero}
                    </p>
                    <h4 style="font-size: 14px; font-weight: 800; color: #1e293b; margin: 0 0 4px 0;">
                        ${storeTitle}
                    </h4>
                    <p style="font-size: 12px; color: #475569; margin: 0 0 2px 0;">
                        <strong>Dueño:</strong> ${ownerName}
                    </p>
                    <p style="font-size: 11px; color: #64748b; margin: 0 0 8px 0;">
                        📍 ${address}
                    </p>
                    <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 6px;">
                        <span style="font-size: 11px; font-weight: 700; color: #059669;">${totalProds} Productos</span>
                        <button type="button" onclick="window.__openSaEditModal(${tienda.id_tendero})" style="background: #059669; color: #fff; border: none; border-radius: 6px; padding: 3px 8px; font-size: 11px; font-weight: 700; cursor: pointer;">
                            Editar
                        </button>
                    </div>
                </div>
            `);

            markersLayer.addLayer(marker);
        });
    }

    // --- Renderizar Tabla CRUD de Tiendas ---
    function renderStoresTable(stores) {
        if (!tiendasTbody) return;

        if (tableCountBadge) {
            tableCountBadge.textContent = `${stores.length} ${stores.length === 1 ? "Tienda" : "Tiendas"}`;
        }

        if (stores.length === 0) {
            tiendasTbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-12 text-center text-slate-500 font-semibold">
                        No se encontraron tiendas registradas con ese criterio.
                    </td>
                </tr>
            `;
            return;
        }

        tiendasTbody.innerHTML = stores
            .map((tienda) => {
                const id = tienda.id_tendero;
                const nombreTienda = tienda.nombre_tienda || "Sin nombre comercial";
                const propietario = tienda.nombre || "Sin propietario";
                const email = tienda.email || "Sin correo";
                const ubicacion = tienda.ubicacion || "Sin dirección registrada";
                const whatsapp = tienda.whatsapp || "Sin teléfono";
                const totalProductos = parseInt(tienda.total_productos, 10) || 0;
                const initials = nombreTienda
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w) => w[0].toUpperCase())
                    .join("") || "TC";

                return `
                    <tr class="hover:bg-slate-50 transition-colors" data-store-id="${id}">
                        <td class="px-6 py-4 font-mono text-xs font-bold text-emerald-600">#TC-${id}</td>
                        <th scope="row" class="px-6 py-4 font-bold text-slate-800">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-black text-xs flex items-center justify-center shrink-0">
                                    ${initials}
                                </div>
                                <div>
                                    <span class="block leading-tight text-slate-800">${nombreTienda}</span>
                                    <span class="text-[11px] font-medium text-slate-500 line-clamp-1">${tienda.descripcion || "Comercio local afiliado"}</span>
                                </div>
                            </div>
                        </th>
                        <td class="px-6 py-4">
                            <span class="block font-semibold text-slate-800">${propietario}</span>
                            <span class="text-xs text-slate-500">${email}</span>
                        </td>
                        <td class="px-6 py-4">
                            <span class="block text-xs font-medium text-slate-600">${ubicacion}</span>
                            <span class="text-[11px] text-slate-500">Tel: ${whatsapp}</span>
                        </td>
                        <td class="px-6 py-4 text-center">
                            <span class="px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs">
                                ${totalProductos} Productos
                            </span>
                        </td>
                        <td class="px-6 py-4 text-right">
                            <div class="inline-flex items-center justify-end gap-2">
                                <button type="button" data-action="view-products" data-id="${id}"
                                    class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all inline-flex items-center gap-1.5 active:scale-95">
                                    <span class="material-symbols-outlined text-[16px]">visibility</span>
                                    <span>Ver Productos</span>
                                </button>
                                <button type="button" data-action="edit-store" data-id="${id}"
                                    class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all inline-flex items-center gap-1.5 active:scale-95">
                                    <span class="material-symbols-outlined text-[16px]">edit</span>
                                    <span>Editar</span>
                                </button>
                                <button type="button" data-action="delete-store" data-id="${id}"
                                    class="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-all inline-flex items-center gap-1.5 active:scale-95">
                                    <span class="material-symbols-outlined text-[16px]">delete</span>
                                    <span>Eliminar</span>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            })
            .join("");
    }

    // --- Cargar Datos desde el Backend ---
    async function loadSuperAdminData() {
        const resp = await API.getAdminTiendas();
        allStores = (resp && Array.isArray(resp.tiendas)) ? resp.tiendas : [];
        const metricas = (resp && resp.metricas) ? resp.metricas : {};

        // Actualizar KPIs
        const elUsuarios = document.getElementById("kpi-total-usuarios");
        const elTiendas = document.getElementById("kpi-total-tiendas");
        const elActiva = document.getElementById("kpi-tienda-activa");
        const elPopular = document.getElementById("kpi-producto-popular");

        if (elUsuarios) elUsuarios.textContent = metricas.total_usuarios ?? (allStores.length + 6);
        if (elTiendas) elTiendas.textContent = metricas.total_tiendas ?? allStores.length;
        if (elActiva) {
            const topStore = metricas.tienda_mas_activa || allStores[0]?.nombre_tienda || "Variedades Torcoroma";
            elActiva.textContent = topStore;
            elActiva.title = topStore;
        }
        if (elPopular) {
            const topProd = metricas.producto_popular || "Panela Pulverizada";
            elPopular.textContent = topProd;
            elPopular.title = topProd;
        }

        renderStoreMarkers(allStores);
        applySearchFilter();
    }

    function applySearchFilter() {
        const query = (searchInput ? searchInput.value : "").trim().toLowerCase();
        if (!query) {
            renderStoresTable(allStores);
            return;
        }
        const filtered = allStores.filter((t) => {
            const name = (t.nombre_tienda || "").toLowerCase();
            const owner = (t.nombre || "").toLowerCase();
            const email = (t.email || "").toLowerCase();
            const loc = (t.ubicacion || "").toLowerCase();
            return name.includes(query) || owner.includes(query) || email.includes(query) || loc.includes(query);
        });
        renderStoresTable(filtered);
    }

    if (searchInput) {
        searchInput.addEventListener("input", applySearchFilter);
    }

    if (btnRefresh) {
        btnRefresh.addEventListener("click", async () => {
            const icon = btnRefresh.querySelector(".material-symbols-outlined");
            if (icon) icon.classList.add("animate-spin");
            await loadSuperAdminData();
            setTimeout(() => {
                if (icon) icon.classList.remove("animate-spin");
            }, 400);
        });
    }

    // --- Modal de Edición de Tienda (PUT /api/admin/tiendas/:id) ---
    function openEditModal(storeId) {
        const store = allStores.find((s) => Number(s.id_tendero) === Number(storeId));
        if (!store || !editModal) return;

        document.getElementById("sa-edit-id").value = store.id_tendero;
        document.getElementById("sa-edit-nombre-tienda").value = store.nombre_tienda || "";
        document.getElementById("sa-edit-propietario").value = store.nombre || "";
        document.getElementById("sa-edit-email").value = store.email || "";
        document.getElementById("sa-edit-ubicacion").value = store.ubicacion || "";
        document.getElementById("sa-edit-whatsapp").value = store.whatsapp || "";
        document.getElementById("sa-edit-descripcion").value = store.descripcion || "";

        editModal.classList.remove("hidden");
    }
    window.__openSaEditModal = openEditModal;

    function closeEditModal() {
        if (editModal) editModal.classList.add("hidden");
    }

    if (btnCloseEditModal) btnCloseEditModal.addEventListener("click", closeEditModal);
    if (btnCancelEditModal) btnCancelEditModal.addEventListener("click", closeEditModal);
    if (editModal) {
        editModal.addEventListener("click", (e) => {
            if (e.target === editModal) closeEditModal();
        });
    }

    if (editForm) {
        editForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const id = document.getElementById("sa-edit-id").value;
            const payload = {
                nombre_tienda: document.getElementById("sa-edit-nombre-tienda").value.trim(),
                nombre: document.getElementById("sa-edit-propietario").value.trim(),
                email: document.getElementById("sa-edit-email").value.trim(),
                ubicacion: document.getElementById("sa-edit-ubicacion").value.trim(),
                whatsapp: document.getElementById("sa-edit-whatsapp").value.trim(),
                descripcion: document.getElementById("sa-edit-descripcion").value.trim()
            };

            const submitBtn = document.getElementById("btn-submit-edit-store");
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = "Guardando...";

            try {
                const resp = await API.updateAdminTienda(id, payload);
                if (resp.status === 200) {
                    closeEditModal();
                    await loadSuperAdminData();
                } else {
                    alert(resp.data?.error || "No se pudo actualizar la tienda.");
                }
            } catch (err) {
                alert("Error de red al intentar actualizar la tienda.");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }

    // --- Eliminar Tienda en Cascada (DELETE /api/admin/tiendas/:id) ---
    async function handleDeleteStore(storeId) {
        const store = allStores.find((s) => Number(s.id_tendero) === Number(storeId));
        const storeName = store?.nombre_tienda || `#TC-${storeId}`;
        const prodCount = parseInt(store?.total_productos, 10) || 0;

        const confirmed = confirm(
            `¿Estás seguro de que deseas ELIMINAR la tienda "${storeName}"?\n\n⚠️ Esta acción eliminará en cascada la tienda y sus ${prodCount} productos asociados de la base de datos.`
        );
        if (!confirmed) return;

        try {
            const resp = await API.deleteAdminTienda(storeId);
            if (resp.status === 200) {
                await loadSuperAdminData();
            } else {
                alert(resp.data?.error || "Error al eliminar la tienda.");
            }
        } catch (err) {
            alert("Error de conexión con el servidor al eliminar la tienda.");
        }
    }

    // --- Modal de Ver Productos de Tienda (GET /api/admin/tiendas/:id/productos) ---
    const productsModal = document.getElementById("sa-view-products-modal");
    const productsContainer = document.getElementById("sa-products-container");
    const productsModalTitle = document.getElementById("sa-products-modal-title");
    const productsModalSubtitle = document.getElementById("sa-products-modal-subtitle");
    const productsModalCount = document.getElementById("sa-products-modal-count");
    const btnCloseProductsModal = document.getElementById("btn-close-products-modal");
    const btnAcceptProductsModal = document.getElementById("btn-accept-products-modal");

    const DEFAULT_BOX_SVG = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiB2aWV3Qm94PSIwIDAgMjAwIDIwMCIgZmlsbD0ibm9uZSI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIHJ4PSIyNCIgZmlsbD0iI2YxZjVmOSIvPjxwYXRoIGQ9Ik0xMDAgNTJMMTQ0IDc2VjEyNEwxMDAgMTQ4TDU2IDEyNFY3NkwxMDAgNTJaIiBzdHJva2U9IiMxMGI5ODEiIHN0cm9rZS13aWR0aD0iOCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBmaWxsPSIjZWNmZGY1Ii8+PHBhdGggZD0iTTU2IDc2TDEwMCAxMDBMMTQ0IDc2IiBzdHJva2U9IiMxMGI5ODEiIHN0cm9rZS13aWR0aD0iOCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTEwMCAxMDBWMTQ4IiBzdHJva2U9IiMxMGI5ODEiIHN0cm9rZS13aWR0aD0iOCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+";

    function resolveProdImg(item) {
        const raw = item && (item.imagen_url || item.imagen);
        if (!raw || typeof raw !== "string" || raw.trim() === "") return DEFAULT_BOX_SVG;
        if (raw.startsWith("http") || raw.startsWith("data:")) return raw;
        return `${window.API_URL}${raw.startsWith("/") ? "" : "/"}${raw}`;
    }

    async function openViewProductsModal(storeId) {
        if (!productsModal || !productsContainer) return;
        const store = allStores.find((s) => Number(s.id_tendero) === Number(storeId));
        const storeName = store?.nombre_tienda || `Tienda #TC-${storeId}`;

        if (productsModalTitle) productsModalTitle.textContent = `Productos de ${storeName}`;
        if (productsModalSubtitle) productsModalSubtitle.textContent = `Propietario: ${store?.nombre || "N/A"} • #TC-${storeId}`;
        if (productsModalCount) productsModalCount.textContent = "Cargando...";

        productsContainer.innerHTML = `
            <div class="py-12 text-center text-slate-500 font-medium text-sm">
                Consultando inventario de la tienda...
            </div>
        `;
        productsModal.classList.remove("hidden");

        try {
            const resp = await API.getAdminTiendaProductos(storeId);
            const productos = Array.isArray(resp.data) ? resp.data : [];

            if (productsModalCount) {
                productsModalCount.textContent = `${productos.length} ${productos.length === 1 ? "producto registrado" : "productos registrados"}`;
            }

            if (productos.length === 0) {
                productsContainer.innerHTML = `
                    <div class="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <span class="material-symbols-outlined text-4xl text-slate-400 mb-2 block">inventory_2</span>
                        <p class="text-sm font-bold text-slate-700">Esta tienda tiene 0 productos registrados</p>
                        <p class="text-xs text-slate-500 mt-1">El comerciante aún no ha cargado artículos en su inventario.</p>
                    </div>
                `;
                return;
            }

            productsContainer.innerHTML = `
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    ${productos
                        .map((p) => {
                            const imgUrl = resolveProdImg(p);
                            const precio = typeof Utils !== "undefined" && Utils.formatCurrency
                                ? Utils.formatCurrency(p.precio_venta)
                                : `$${Number(p.precio_venta || 0).toLocaleString("es-CO")}`;
                            const unidad = p.unidad_medida || "Unidad (Und)";
                            return `
                                <div class="flex items-center gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-xs transition-all">
                                    <img src="${imgUrl}" alt="${p.nombre || "Producto"}"
                                        onerror="this.onerror=null;this.src='${DEFAULT_BOX_SVG}';"
                                        class="w-14 h-14 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0" />
                                    <div class="min-w-0 flex-1">
                                        <h4 class="font-bold text-slate-800 text-sm truncate">${p.nombre || "Sin nombre"}</h4>
                                        <p class="text-[11px] text-slate-500 uppercase font-semibold truncate">
                                            ${p.marca || "S/M"} • ${p.categoria || "General"}
                                        </p>
                                        <div class="mt-1.5 flex items-center justify-between gap-2">
                                            <span class="text-sm font-black text-emerald-600">${precio}</span>
                                            <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                                                Stock: ${p.stock ?? 0} (${unidad})
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            `;
                        })
                        .join("")}
                </div>
            `;
        } catch (err) {
            productsContainer.innerHTML = `
                <div class="py-12 text-center text-red-600 font-semibold text-sm">
                    Error al cargar los productos de esta tienda.
                </div>
            `;
        }
    }

    function closeViewProductsModal() {
        if (productsModal) productsModal.classList.add("hidden");
    }

    if (btnCloseProductsModal) btnCloseProductsModal.addEventListener("click", closeViewProductsModal);
    if (btnAcceptProductsModal) btnAcceptProductsModal.addEventListener("click", closeViewProductsModal);
    if (productsModal) {
        productsModal.addEventListener("click", (e) => {
            if (e.target === productsModal) closeViewProductsModal();
        });
    }

    // Delegación de eventos en la tabla
    if (tiendasTbody) {
        tiendasTbody.addEventListener("click", (e) => {
            const btn = e.target.closest("button[data-action]");
            if (!btn) return;
            const action = btn.getAttribute("data-action");
            const id = btn.getAttribute("data-id");

            if (action === "view-products") {
                openViewProductsModal(id);
            } else if (action === "edit-store") {
                openEditModal(id);
            } else if (action === "delete-store") {
                handleDeleteStore(id);
            }
        });
    }

    // --- Menú Lateral Responsive (Móvil) ---
    function toggleMobileSidebar(forceClose = false) {
        if (!sidebar || !sidebarBackdrop) return;
        const isClosed = sidebar.classList.contains("-translate-x-full");
        if (forceClose || !isClosed) {
            sidebar.classList.add("-translate-x-full");
            sidebarBackdrop.classList.add("hidden");
        } else {
            sidebar.classList.remove("-translate-x-full");
            sidebarBackdrop.classList.remove("hidden");
        }
    }

    if (btnMobileSidebar) {
        btnMobileSidebar.addEventListener("click", () => toggleMobileSidebar(false));
    }
    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener("click", () => toggleMobileSidebar(true));
    }

    // --- Navegación entre vistas del Sidebar ---
    function setActiveNav(activeLink) {
        const allLinks = document.querySelectorAll(".sa-nav-link");
        allLinks.forEach((link) => {
            link.classList.remove("text-white", "font-bold", "bg-emerald-600", "shadow-md", "shadow-emerald-600/20");
            link.classList.add("text-slate-600", "hover:text-emerald-700", "hover:bg-emerald-50");
        });

        if (activeLink) {
            activeLink.classList.remove("text-slate-600", "hover:text-emerald-700", "hover:bg-emerald-50");
            activeLink.classList.add("text-white", "font-bold", "bg-emerald-600", "shadow-md", "shadow-emerald-600/20");
        }
    }

    if (navDashboard) {
        navDashboard.addEventListener("click", (e) => {
            e.preventDefault();
            setActiveNav(navDashboard);
            if (seccionKpis) seccionKpis.classList.remove("hidden");
            if (seccionMapa) seccionMapa.classList.remove("hidden");
            if (seccionTiendas) seccionTiendas.classList.remove("hidden");
            if (viewTitle) viewTitle.textContent = "Dashboard Global: Mapa y Métricas";
            if (viewSubtitle) {
                viewSubtitle.textContent = "Supervisión geoespacial y auditoría CRUD de todas las tiendas registradas en Cúcuta.";
            }
            if (map) {
                setTimeout(() => map.invalidateSize(), 200);
            }
            toggleMobileSidebar(true);
        });
    }

    if (navTiendas) {
        navTiendas.addEventListener("click", (e) => {
            e.preventDefault();
            setActiveNav(navTiendas);
            if (seccionKpis) seccionKpis.classList.add("hidden");
            if (seccionMapa) seccionMapa.classList.add("hidden");
            if (seccionTiendas) seccionTiendas.classList.remove("hidden");
            if (viewTitle) viewTitle.textContent = "Gestión de Tiendas (CRUD)";
            if (viewSubtitle) {
                viewSubtitle.textContent = "Edita la información de las tiendas registradas o elimínalas junto con su inventario en cascada.";
            }
            toggleMobileSidebar(true);
        });
    }

    // --- Cerrar Sesión ---
    function handleSuperAdminLogout(e) {
        if (e) e.preventDefault();
        if (typeof window.logout === "function") {
            window.logout();
        } else {
            localStorage.clear();
            window.location.href = "login.html";
        }
    }

    if (navLogout) navLogout.addEventListener("click", handleSuperAdminLogout);
    if (btnHeaderLogout) btnHeaderLogout.addEventListener("click", handleSuperAdminLogout);

    // Inicialización
    initSuperAdminMap();
    await loadSuperAdminData();
});
