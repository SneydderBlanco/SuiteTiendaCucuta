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
    const navEliminadas = document.getElementById("nav-sa-eliminadas");
    const navLogout = document.getElementById("nav-sa-logout");
    const btnHeaderLogout = document.getElementById("btn-header-logout");

    const seccionKpis = document.getElementById("seccion-sa-kpis");
    const seccionMapa = document.getElementById("seccion-sa-mapa");
    const seccionTiendas = document.getElementById("seccion-sa-tiendas");
    const seccionEliminadas = document.getElementById("seccion-sa-eliminadas");

    const viewTitle = document.getElementById("sa-view-title");
    const viewSubtitle = document.getElementById("sa-view-subtitle");

    // 2. Referencias de Búsqueda, Mapa y Tabla CRUD
    const searchInput = document.getElementById("sa-search-input");
    const btnRefresh = document.getElementById("btn-sa-refresh");
    const btnCreateStore = document.getElementById("btn-sa-create-store");
    const btnResetMap = document.getElementById("btn-reset-map");
    const tiendasTbody = document.getElementById("sa-tiendas-tbody");
    const tableCountBadge = document.getElementById("sa-table-count");
    const mapCounterBadge = document.getElementById("sa-map-counter");
    const eliminadasTbody = document.getElementById("sa-eliminadas-tbody");
    const eliminadasCountBadge = document.getElementById("sa-eliminadas-count");
    const deletedNavBadge = document.getElementById("sa-deleted-nav-badge");

    // 3. Referencias de Modales (Crear, Editar Tienda, Congelar, Eliminar, Editar Producto)
    const createModal = document.getElementById("sa-create-store-modal");
    const createForm = document.getElementById("sa-create-store-form");
    const btnCloseCreateModal = document.getElementById("btn-close-create-store-modal");
    const btnCancelCreateModal = document.getElementById("btn-cancel-create-store");

    const editModal = document.getElementById("sa-edit-store-modal");
    const editForm = document.getElementById("sa-edit-store-form");
    const btnCloseEditModal = document.getElementById("btn-close-edit-store-modal");
    const btnCancelEditModal = document.getElementById("btn-cancel-edit-store");

    const freezeModal = document.getElementById("sa-freeze-store-modal");
    const freezeForm = document.getElementById("sa-freeze-store-form");
    const btnCloseFreezeModal = document.getElementById("btn-close-freeze-modal");
    const btnCancelFreezeModal = document.getElementById("btn-cancel-freeze-modal");

    const deleteModal = document.getElementById("sa-delete-store-modal");
    const deleteForm = document.getElementById("sa-delete-store-form");
    const btnCloseDeleteModal = document.getElementById("btn-close-delete-modal");
    const btnCancelDeleteModal = document.getElementById("btn-cancel-delete-modal");

    const editProdModal = document.getElementById("sa-edit-product-modal");
    const editProdForm = document.getElementById("sa-edit-product-form");
    const btnCloseEditProd = document.getElementById("btn-close-sa-edit-prod");
    const btnCancelEditProd = document.getElementById("btn-cancel-sa-edit-prod");

    // Mostrar nombre del SuperAdmin
    const storedName = localStorage.getItem("userName");
    const superAdminNameEl = document.getElementById("superadmin-name");
    if (storedName && superAdminNameEl) {
        superAdminNameEl.textContent = storedName;
    }

    // Estado en memoria
    let allStores = [];
    let currentModalProducts = [];
    let currentProductsStoreId = null;
    const cucutaCenter = [7.8939, -72.5078];
    let map = null;
    let markersLayer = null;

    // --- Inicializar Mapa Leaflet.js con Esri World Street Map ---
    function initSuperAdminMap() {
        const mapContainer = document.getElementById("sa-mapa-tiendas");
        if (!mapContainer || typeof L === "undefined") return;

        map = L.map("sa-mapa-tiendas", {
            zoomControl: false
        }).setView(cucutaCenter, 13);

        L.control.zoom({ position: "bottomright" }).addTo(map);

        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri'
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
        if (!map || !markersLayer) {
            initSuperAdminMap();
        }
        if (!map || !markersLayer) return;

        markersLayer.clearLayers();
        const storeList = Array.isArray(stores) ? stores : [];
        let renderedCount = 0;

        storeList.forEach((tienda) => {
            let lat = parseFloat(tienda.latitud);
            let lng = parseFloat(tienda.longitud);

            // Manejo de Coordenadas Nulas: asignar coordenadas de respaldo cerca del centro de Cúcuta
            if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) {
                lat = 7.8939 + (Math.random() * 0.02 - 0.01);
                lng = -72.5078 + (Math.random() * 0.02 - 0.01);
            }

            tienda.final_lat = lat;
            tienda.final_lng = lng;
            renderedCount++;

            const isFrozen = (tienda.estado_cuenta || "activo") === "congelado";
            const pinColor = isFrozen ? "#0284c7" : "#059669";
            const pinIconName = isFrozen ? "ac_unit" : "storefront";

            // Icono de pin (verde activa, azul hielo congelada)
            const markerIcon = L.divIcon({
                className: "custom-sa-marker",
                html: `
                    <div class="marker-pin-wrapper flex flex-col items-center justify-center">
                        <div class="relative flex items-center justify-center">
                            <div class="absolute w-9 h-9 rounded-full ${isFrozen ? "bg-sky-400/30" : "bg-emerald-500/30"} animate-pulse"></div>
                            <div class="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white" style="background-color: ${pinColor};">
                                <span class="material-symbols-outlined text-white text-[16px] select-none">${pinIconName}</span>
                            </div>
                        </div>
                        <div class="w-2.5 h-2.5 rotate-45 -mt-1.5 border-r border-b border-white shadow-md" style="background-color: ${pinColor};"></div>
                    </div>
                `,
                iconSize: [36, 42],
                iconAnchor: [18, 40],
                popupAnchor: [0, -38]
            });

            const marker = L.marker([lat, lng], { icon: markerIcon });
            const storeTitle = tienda.nombre_tienda || "Tienda Sin Nombre";
            const ownerName = tienda.nombre || "Propietario";
            const address = tienda.ubicacion || "Cúcuta, Norte de Santander";
            const totalProds = parseInt(tienda.total_productos, 10) || 0;

            marker.bindPopup(`
                <div style="min-width: 210px; padding: 2px;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:2px;">
                        <p style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: ${pinColor}; margin: 0;">
                            #TC-${tienda.id_tendero}
                        </p>
                        <span style="font-size:9px; font-weight:800; padding:2px 6px; border-radius:999px; background:${isFrozen ? '#e0f2fe' : '#ecfdf5'}; color:${isFrozen ? '#0369a1' : '#047857'};">
                            ${isFrozen ? 'CONGELADA' : 'ACTIVA'}
                        </span>
                    </div>
                    <h4 style="font-size: 14px; font-weight: 800; color: #1e293b; margin: 0 0 4px 0;">
                        ${storeTitle}
                    </h4>
                    <p style="font-size: 12px; color: #475569; margin: 0 0 2px 0;">
                        <strong>Dueño:</strong> ${ownerName}
                    </p>
                    <p style="font-size: 11px; color: #64748b; margin: 0 0 8px 0;">
                        📍 ${address}
                    </p>
                    <div style="display: flex; align-items: center; justify-content: space-between; gap:6px; border-top: 1px solid #e2e8f0; padding-top: 6px;">
                        <span style="font-size: 11px; font-weight: 700; color: #059669;">${totalProds} Productos</span>
                        <div style="display:flex; gap:4px;">
                            <a href="tienda.html?id=${tienda.id_tendero}" target="_blank" style="background: #0f172a; color: #fff; text-decoration:none; border-radius: 6px; padding: 3px 7px; font-size: 11px; font-weight: 700;">
                                Tienda
                            </a>
                            <button type="button" onclick="window.__openSaEditModal(${tienda.id_tendero})" style="background: #059669; color: #fff; border: none; border-radius: 6px; padding: 3px 7px; font-size: 11px; font-weight: 700; cursor: pointer;">
                                Editar
                            </button>
                        </div>
                    </div>
                </div>
            `);

            markersLayer.addLayer(marker);
        });

        if (mapCounterBadge) {
            mapCounterBadge.textContent = `${renderedCount} ${renderedCount === 1 ? "Tienda en el mapa" : "Tiendas en el mapa"}`;
        }
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
                    <td colspan="7" class="px-6 py-12 text-center text-slate-500 font-semibold">
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
                const isFrozen = (tienda.estado_cuenta || "activo") === "congelado";
                const motivoBloqueo = tienda.motivo_bloqueo || "Falta de pago de suscripción";
                const initials = nombreTienda
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w) => w[0].toUpperCase())
                    .join("") || "TC";

                const statusHtml = isFrozen
                    ? `<div class="inline-flex flex-col items-center gap-0.5">
                            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-100 border border-sky-300 text-sky-800 font-extrabold text-[11px]">
                                <span class="material-symbols-outlined text-[14px]">ac_unit</span>
                                CONGELADA
                            </span>
                            <span class="text-[10px] text-sky-700 max-w-[140px] truncate" title="${motivoBloqueo}">${motivoBloqueo}</span>
                       </div>`
                    : `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold text-[11px]">
                            <span class="material-symbols-outlined text-[14px]">check_circle</span>
                            ACTIVA
                       </span>`;

                return `
                    <tr class="hover:bg-slate-50 transition-colors ${isFrozen ? "bg-sky-50/40" : ""}" data-store-id="${id}">
                        <td class="px-6 py-4 font-mono text-xs font-bold ${isFrozen ? "text-sky-700" : "text-emerald-600"}">#TC-${id}</td>
                        <th scope="row" class="px-6 py-4 font-bold text-slate-800">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl ${isFrozen ? "bg-sky-100 border-sky-300 text-sky-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"} border font-black text-xs flex items-center justify-center shrink-0">
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
                            ${statusHtml}
                        </td>
                        <td class="px-6 py-4 text-center">
                            <span class="px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs">
                                ${totalProductos} Productos
                            </span>
                        </td>
                        <td class="px-6 py-4 text-right">
                            <div class="relative inline-block text-left" data-dropdown-container="${id}">
                                <button type="button" data-action="toggle-dropdown" data-id="${id}"
                                    aria-haspopup="true" aria-expanded="false"
                                    class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 text-xs font-bold transition-colors inline-flex items-center gap-1 active:scale-95">
                                    <span>Opciones</span>
                                    <span class="material-symbols-outlined text-[18px]">more_vert</span>
                                </button>
                                <div id="sa-dropdown-${id}"
                                    class="sa-row-dropdown absolute right-0 mt-2 w-56 bg-white border border-slate-200 shadow-xl rounded-xl hidden z-50 overflow-hidden">
                                    <a href="tienda.html?id=${id}" target="_blank"
                                        class="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors flex items-center gap-2 text-xs font-bold text-slate-700">
                                        <span class="material-symbols-outlined text-[18px] text-slate-600">open_in_new</span>
                                        <span>Acceder a la Tienda</span>
                                    </a>
                                    <button type="button" data-action="view-products" data-id="${id}"
                                        class="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors flex items-center gap-2 text-xs font-bold text-blue-600 border-t border-slate-100">
                                        <span class="material-symbols-outlined text-[18px] text-blue-600">inventory_2</span>
                                        <span>Ver / Editar Productos</span>
                                    </button>
                                    <button type="button" data-action="edit-store" data-id="${id}"
                                        class="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors flex items-center gap-2 text-xs font-bold text-emerald-600 border-t border-slate-100">
                                        <span class="material-symbols-outlined text-[18px] text-emerald-600">edit</span>
                                        <span>Editar Tienda</span>
                                    </button>
                                    <button type="button" data-action="toggle-freeze" data-id="${id}"
                                        class="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors flex items-center gap-2 text-xs font-bold ${isFrozen ? "text-emerald-700" : "text-sky-700"} border-t border-slate-100">
                                        <span class="material-symbols-outlined text-[18px]">${isFrozen ? "lock_open" : "ac_unit"}</span>
                                        <span>${isFrozen ? "Reactivar Tienda" : "Congelar (Sin pago)"}</span>
                                    </button>
                                    <button type="button" data-action="delete-store" data-id="${id}"
                                        class="w-full text-left px-4 py-2.5 hover:bg-red-50 transition-colors flex items-center gap-2 text-xs font-bold text-red-600 border-t border-slate-100">
                                        <span class="material-symbols-outlined text-[18px] text-red-600">delete</span>
                                        <span>Eliminar Tienda</span>
                                    </button>
                                </div>
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
        await loadDeletedStoresHistory();
    }

    // --- Cargar Historial de Tiendas Eliminadas ---
    async function loadDeletedStoresHistory() {
        if (!eliminadasTbody) return;
        const resp = await API.getAdminTiendasEliminadas();
        const historial = (resp && resp.data && Array.isArray(resp.data.historial)) ? resp.data.historial : [];

        if (eliminadasCountBadge) {
            eliminadasCountBadge.textContent = `${historial.length} ${historial.length === 1 ? "Registro" : "Registros"}`;
        }
        if (deletedNavBadge) {
            deletedNavBadge.textContent = String(historial.length);
        }

        if (historial.length === 0) {
            eliminadasTbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-10 text-center text-slate-400 font-medium text-xs">
                        Aún no se ha eliminado ninguna tienda. Cuando elimines una, su registro histórico quedará aquí.
                    </td>
                </tr>
            `;
            return;
        }

        eliminadasTbody.innerHTML = historial.map((h) => {
            const d = new Date(h.fecha_eliminacion);
            const fechaFmt = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
            const ventasFmt = typeof Utils !== "undefined" && Utils.formatCurrency
                ? Utils.formatCurrency(h.total_ventas_historicas || 0)
                : `$${Number(h.total_ventas_historicas || 0).toLocaleString("es-CO")}`;

            return `
                <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-5 py-3.5 font-mono text-xs font-bold text-slate-500">#TC-${h.id_tendero_original || "?"}</td>
                    <td class="px-5 py-3.5">
                        <span class="block font-bold text-slate-800 text-xs">${h.nombre_tienda || "Sin nombre"}</span>
                        <span class="text-[11px] text-slate-400">${h.ubicacion || "Sin dirección"}</span>
                    </td>
                    <td class="px-5 py-3.5">
                        <span class="block font-semibold text-slate-700 text-xs">${h.nombre_propietario || "---"}</span>
                        <span class="text-[11px] text-slate-400">${h.email || "---"}</span>
                    </td>
                    <td class="px-5 py-3.5 text-center">
                        <span class="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">${h.total_productos_eliminados || 0} prod.</span>
                        <span class="block text-[11px] font-bold text-emerald-700 mt-0.5">${ventasFmt}</span>
                    </td>
                    <td class="px-5 py-3.5 text-xs text-slate-600 max-w-[220px]">${h.motivo_eliminacion || "Eliminada por SuperAdmin"}</td>
                    <td class="px-5 py-3.5">
                        <span class="block text-xs font-semibold text-slate-700">${h.eliminado_por || "Super Administrador"}</span>
                        <span class="text-[11px] text-slate-400">${fechaFmt}</span>
                    </td>
                </tr>
            `;
        }).join("");
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

    // --- Modal Crear Nuevo Tendero / Tienda (POST /api/admin/tiendas) ---
    function openCreateModal() {
        if (!createModal) return;
        if (createForm) createForm.reset();
        createModal.classList.remove("hidden");
    }
    function closeCreateModal() {
        if (createModal) createModal.classList.add("hidden");
    }
    if (btnCreateStore) btnCreateStore.addEventListener("click", openCreateModal);
    if (btnCloseCreateModal) btnCloseCreateModal.addEventListener("click", closeCreateModal);
    if (btnCancelCreateModal) btnCancelCreateModal.addEventListener("click", closeCreateModal);
    if (createModal) {
        createModal.addEventListener("click", (e) => {
            if (e.target === createModal) closeCreateModal();
        });
    }
    if (createForm) {
        createForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const payload = {
                nombre_tienda: document.getElementById("sa-create-nombre-tienda").value.trim(),
                nombre: document.getElementById("sa-create-propietario").value.trim(),
                email: document.getElementById("sa-create-email").value.trim(),
                password: document.getElementById("sa-create-password").value,
                ubicacion: document.getElementById("sa-create-ubicacion").value.trim(),
                whatsapp: document.getElementById("sa-create-whatsapp").value.trim(),
                descripcion: document.getElementById("sa-create-descripcion").value.trim()
            };

            const btn = document.getElementById("btn-submit-create-store");
            const prev = btn.textContent;
            btn.disabled = true;
            btn.textContent = "Creando...";

            try {
                const resp = await API.createAdminTienda(payload);
                if (resp.status === 201 || resp.status === 200) {
                    closeCreateModal();
                    alert("¡Tendero y tienda creados exitosamente! Ya puede iniciar sesión con su correo y contraseña.");
                    await loadSuperAdminData();
                } else {
                    alert(resp.data?.error || "No se pudo crear el tendero.");
                }
            } catch (err) {
                alert("Error de red al crear el tendero.");
            } finally {
                btn.disabled = false;
                btn.textContent = prev;
            }
        });
    }

    // --- Modal Congelar / Reactivar Tienda (PUT /api/admin/tiendas/:id/estado) ---
    function openFreezeModal(storeId) {
        const store = allStores.find((s) => Number(s.id_tendero) === Number(storeId));
        if (!store || !freezeModal) return;

        const isFrozen = (store.estado_cuenta || "activo") === "congelado";
        const nextState = isFrozen ? "activo" : "congelado";

        document.getElementById("sa-freeze-id").value = store.id_tendero;
        document.getElementById("sa-freeze-target-state").value = nextState;

        const iconEl = document.getElementById("sa-freeze-icon");
        const titleEl = document.getElementById("sa-freeze-title");
        const descEl = document.getElementById("sa-freeze-desc");
        const reasonWrap = document.getElementById("sa-freeze-reason-wrap");
        const reasonInput = document.getElementById("sa-freeze-reason");
        const submitBtn = document.getElementById("btn-submit-freeze-modal");

        if (nextState === "congelado") {
            iconEl.textContent = "ac_unit";
            iconEl.className = "material-symbols-outlined text-sky-600";
            titleEl.textContent = `Congelar "${store.nombre_tienda}"`;
            descEl.textContent = "Al congelar esta tienda, el tendero NO podrá iniciar sesión en su panel y la tienda dejará de aparecer en el marketplace y mapa público hasta que sea reactivada.";
            reasonWrap.classList.remove("hidden");
            reasonInput.value = store.motivo_bloqueo || "Falta de pago de suscripción mensual";
            submitBtn.textContent = "Congelar Tienda";
            submitBtn.className = "px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md";
        } else {
            iconEl.textContent = "lock_open";
            iconEl.className = "material-symbols-outlined text-emerald-600";
            titleEl.textContent = `Reactivar "${store.nombre_tienda}"`;
            descEl.textContent = "Esta tienda volverá a estar ACTIVA: el tendero podrá iniciar sesión normalmente y su catálogo volverá a mostrarse en el marketplace y el mapa.";
            reasonWrap.classList.add("hidden");
            submitBtn.textContent = "Reactivar Tienda";
            submitBtn.className = "px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md";
        }

        freezeModal.classList.remove("hidden");
    }

    function closeFreezeModal() {
        if (freezeModal) freezeModal.classList.add("hidden");
    }
    if (btnCloseFreezeModal) btnCloseFreezeModal.addEventListener("click", closeFreezeModal);
    if (btnCancelFreezeModal) btnCancelFreezeModal.addEventListener("click", closeFreezeModal);
    if (freezeModal) {
        freezeModal.addEventListener("click", (e) => {
            if (e.target === freezeModal) closeFreezeModal();
        });
    }
    if (freezeForm) {
        freezeForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const id = document.getElementById("sa-freeze-id").value;
            const targetState = document.getElementById("sa-freeze-target-state").value;
            const motivo = document.getElementById("sa-freeze-reason").value.trim();
            const btn = document.getElementById("btn-submit-freeze-modal");
            const prev = btn.textContent;
            btn.disabled = true;
            btn.textContent = "Aplicando...";

            try {
                const resp = await API.updateAdminTiendaEstado(id, targetState, motivo);
                if (resp.status === 200) {
                    closeFreezeModal();
                    await loadSuperAdminData();
                } else {
                    alert(resp.data?.error || "No se pudo cambiar el estado de la tienda.");
                }
            } catch (err) {
                alert("Error de red al cambiar el estado de la tienda.");
            } finally {
                btn.disabled = false;
                btn.textContent = prev;
            }
        });
    }

    // --- Eliminar Tienda en Cascada con Motivo (Guarda en Historial) ---
    function openDeleteModal(storeId) {
        const store = allStores.find((s) => Number(s.id_tendero) === Number(storeId));
        if (!store || !deleteModal) return;
        const prodCount = parseInt(store.total_productos, 10) || 0;
        document.getElementById("sa-delete-id").value = store.id_tendero;
        document.getElementById("sa-delete-reason").value = "";
        document.getElementById("sa-delete-desc").textContent =
            `¿Estás seguro de eliminar permanentemente la tienda "${store.nombre_tienda}" (#TC-${store.id_tendero}) junto con sus ${prodCount} producto(s)?`;
        deleteModal.classList.remove("hidden");
    }

    function closeDeleteModal() {
        if (deleteModal) deleteModal.classList.add("hidden");
    }
    if (btnCloseDeleteModal) btnCloseDeleteModal.addEventListener("click", closeDeleteModal);
    if (btnCancelDeleteModal) btnCancelDeleteModal.addEventListener("click", closeDeleteModal);
    if (deleteModal) {
        deleteModal.addEventListener("click", (e) => {
            if (e.target === deleteModal) closeDeleteModal();
        });
    }
    if (deleteForm) {
        deleteForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const id = document.getElementById("sa-delete-id").value;
            const motivo = document.getElementById("sa-delete-reason").value.trim() || "Eliminada desde panel SuperAdmin";
            const eliminadoPor = localStorage.getItem("userName") || "Super Administrador";
            const btn = document.getElementById("btn-submit-delete-modal");
            const prev = btn.textContent;
            btn.disabled = true;
            btn.textContent = "Eliminando...";

            try {
                const resp = await API.deleteAdminTienda(id, {
                    motivo_eliminacion: motivo,
                    eliminado_por: eliminadoPor
                });
                if (resp.status === 200) {
                    closeDeleteModal();
                    await loadSuperAdminData();
                } else {
                    alert(resp.data?.error || "Error al eliminar la tienda.");
                }
            } catch (err) {
                alert("Error de conexión con el servidor al eliminar la tienda.");
            } finally {
                btn.disabled = false;
                btn.textContent = prev;
            }
        });
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
        currentProductsStoreId = storeId;
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
            currentModalProducts = productos;

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
                                <div class="flex flex-col gap-3 p-3.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-xs transition-all">
                                    <div class="flex items-center gap-3.5">
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
                                    <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                                        <button type="button" onclick="window.__openSaEditProduct(${p.id_producto})"
                                            class="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer">
                                            <span class="material-symbols-outlined text-[15px]">edit</span>
                                            Editar
                                        </button>
                                        <button type="button" onclick="window.__deleteSaProduct(${p.id_producto})"
                                            class="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer">
                                            <span class="material-symbols-outlined text-[15px]">delete</span>
                                            Eliminar
                                        </button>
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

    // --- Editar / Eliminar Producto desde SuperAdmin ---
    window.__openSaEditProduct = function(productId) {
        const prod = currentModalProducts.find((p) => Number(p.id_producto) === Number(productId));
        if (!prod || !editProdModal) return;

        document.getElementById("sa-prod-id").value = prod.id_producto;
        document.getElementById("sa-prod-store-id").value = currentProductsStoreId || prod.id_tendero;
        document.getElementById("sa-prod-nombre").value = prod.nombre || "";
        document.getElementById("sa-prod-marca").value = prod.marca || "";
        document.getElementById("sa-prod-categoria").value = prod.categoria || "";
        document.getElementById("sa-prod-unidad").value = prod.unidad_medida || "Unidad (Und)";
        document.getElementById("sa-prod-precio").value = prod.precio_venta ?? 0;
        document.getElementById("sa-prod-stock").value = prod.stock ?? 0;

        editProdModal.classList.remove("hidden");
    };

    window.__deleteSaProduct = async function(productId) {
        const prod = currentModalProducts.find((p) => Number(p.id_producto) === Number(productId));
        if (!confirm(`¿Seguro que deseas eliminar el producto "${prod?.nombre || productId}" de esta tienda?`)) return;
        const resp = await API.deleteAdminProducto(productId);
        if (resp.status === 200) {
            await openViewProductsModal(currentProductsStoreId);
            await loadSuperAdminData();
        } else {
            alert(resp.data?.error || "No se pudo eliminar el producto.");
        }
    };

    function closeEditProdModal() {
        if (editProdModal) editProdModal.classList.add("hidden");
    }
    if (btnCloseEditProd) btnCloseEditProd.addEventListener("click", closeEditProdModal);
    if (btnCancelEditProd) btnCancelEditProd.addEventListener("click", closeEditProdModal);
    if (editProdModal) {
        editProdModal.addEventListener("click", (e) => {
            if (e.target === editProdModal) closeEditProdModal();
        });
    }
    if (editProdForm) {
        editProdForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const prodId = document.getElementById("sa-prod-id").value;
            const storeId = document.getElementById("sa-prod-store-id").value;
            const payload = {
                nombre: document.getElementById("sa-prod-nombre").value.trim(),
                marca: document.getElementById("sa-prod-marca").value.trim(),
                categoria: document.getElementById("sa-prod-categoria").value.trim(),
                unidad_medida: document.getElementById("sa-prod-unidad").value.trim() || "Unidad (Und)",
                precio_venta: parseFloat(document.getElementById("sa-prod-precio").value),
                stock: parseInt(document.getElementById("sa-prod-stock").value, 10)
            };

            const btn = document.getElementById("btn-submit-sa-edit-prod");
            const prev = btn.textContent;
            btn.disabled = true;
            btn.textContent = "Guardando...";

            try {
                const resp = await API.updateAdminProducto(prodId, payload);
                if (resp.status === 200) {
                    closeEditProdModal();
                    await openViewProductsModal(storeId);
                    await loadSuperAdminData();
                } else {
                    alert(resp.data?.error || "Error al actualizar el producto.");
                }
            } catch (err) {
                alert("Error de red al actualizar el producto.");
            } finally {
                btn.disabled = false;
                btn.textContent = prev;
            }
        });
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

    // Helper para cerrar todos los menús desplegables abiertos de la tabla
    function closeAllRowDropdowns(exceptId = null) {
        const dropdowns = document.querySelectorAll(".sa-row-dropdown");
        dropdowns.forEach((menu) => {
            if (exceptId && menu.id === `sa-dropdown-${exceptId}`) return;
            menu.classList.add("hidden");
        });
    }

    // Delegación de eventos en la tabla
    if (tiendasTbody) {
        tiendasTbody.addEventListener("click", (e) => {
            const btn = e.target.closest("button[data-action]");
            if (!btn) return;
            const action = btn.getAttribute("data-action");
            const id = btn.getAttribute("data-id");

            if (action === "toggle-dropdown") {
                e.stopPropagation();
                closeAllRowDropdowns(id);
                const targetMenu = document.getElementById(`sa-dropdown-${id}`);
                if (targetMenu) {
                    targetMenu.classList.toggle("hidden");
                }
                return;
            }

            // Al seleccionar una opción del menú, cerrar todos los menús abiertos
            closeAllRowDropdowns();

            if (action === "view-products") {
                openViewProductsModal(id);
            } else if (action === "edit-store") {
                openEditModal(id);
            } else if (action === "toggle-freeze") {
                openFreezeModal(id);
            } else if (action === "delete-store") {
                openDeleteModal(id);
            }
        });
    }

    // Cerrar cualquier menú desplegable abierto si se hace clic fuera
    document.addEventListener("click", (e) => {
        if (!e.target.closest("[data-dropdown-container]")) {
            closeAllRowDropdowns();
        }
    });

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
            if (seccionEliminadas) seccionEliminadas.classList.remove("hidden");
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
            if (seccionEliminadas) seccionEliminadas.classList.add("hidden");
            if (viewTitle) viewTitle.textContent = "Gestión de Tiendas (CRUD)";
            if (viewSubtitle) {
                viewSubtitle.textContent = "Crea tenderos, accede a sus tiendas, edita sus productos, congela cuentas por suscripción o elimínalas con auditoría.";
            }
            toggleMobileSidebar(true);
        });
    }

    if (navEliminadas) {
        navEliminadas.addEventListener("click", (e) => {
            e.preventDefault();
            setActiveNav(navEliminadas);
            if (seccionKpis) seccionKpis.classList.add("hidden");
            if (seccionMapa) seccionMapa.classList.add("hidden");
            if (seccionTiendas) seccionTiendas.classList.add("hidden");
            if (seccionEliminadas) seccionEliminadas.classList.remove("hidden");
            if (viewTitle) viewTitle.textContent = "Historial de Tiendas Eliminadas";
            if (viewSubtitle) {
                viewSubtitle.textContent = "Auditoría histórica de todas las tiendas que estuvieron registradas y fueron dadas de baja.";
            }
            loadDeletedStoresHistory();
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
