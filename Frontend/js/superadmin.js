/**
 * superadmin.js
 * Controlador base para el Panel de SuperAdministrador (Tiendas Cúcuta)
 * Preparado con Event Listeners para futura integración con endpoints del Backend.
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Referencias del DOM - Navegación y Layout
    const sidebar = document.getElementById("superadmin-sidebar");
    const sidebarBackdrop = document.getElementById("sidebar-backdrop");
    const btnMobileSidebar = document.getElementById("btn-mobile-sidebar");

    const navDashboard = document.getElementById("nav-sa-dashboard");
    const navTiendas = document.getElementById("nav-sa-tiendas");
    const navUsuarios = document.getElementById("nav-sa-usuarios");
    const navLogout = document.getElementById("nav-sa-logout");
    const btnHeaderLogout = document.getElementById("btn-header-logout");

    const seccionKpis = document.getElementById("seccion-sa-kpis");
    const seccionTiendas = document.getElementById("seccion-sa-tiendas");
    const seccionUsuarios = document.getElementById("seccion-sa-usuarios");

    const viewTitle = document.getElementById("sa-view-title");
    const viewSubtitle = document.getElementById("sa-view-subtitle");

    // 2. Referencias de Búsqueda, Filtro y Tabla
    const searchInput = document.getElementById("sa-search-input");
    const filterEstado = document.getElementById("sa-filter-estado");
    const btnRefresh = document.getElementById("btn-sa-refresh");
    const tiendasTbody = document.getElementById("sa-tiendas-tbody");

    // 3. Referencias del Modal de Detalles
    const storeModal = document.getElementById("sa-store-modal");
    const btnCloseModal = document.getElementById("btn-close-sa-modal");
    const btnAcceptModal = document.getElementById("btn-accept-sa-modal");

    // Mostrar nombre del usuario si existe en localStorage
    const storedName = localStorage.getItem("userName");
    const superAdminNameEl = document.getElementById("superadmin-name");
    if (storedName && superAdminNameEl) {
        superAdminNameEl.textContent = storedName;
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
            link.classList.remove("text-white", "font-bold", "bg-indigo-600", "shadow-lg", "shadow-indigo-600/25");
            link.classList.add("text-slate-400", "hover:text-white", "hover:bg-slate-800/80");
        });

        if (activeLink) {
            activeLink.classList.remove("text-slate-400", "hover:text-white", "hover:bg-slate-800/80");
            activeLink.classList.add("text-white", "font-bold", "bg-indigo-600", "shadow-lg", "shadow-indigo-600/25");
        }
    }

    if (navDashboard) {
        navDashboard.addEventListener("click", (e) => {
            e.preventDefault();
            setActiveNav(navDashboard);
            if (seccionKpis) seccionKpis.classList.remove("hidden");
            if (seccionTiendas) seccionTiendas.classList.remove("hidden");
            if (seccionUsuarios) seccionUsuarios.classList.add("hidden");
            if (viewTitle) viewTitle.textContent = "Resumen Ejecutivo de la Plataforma";
            if (viewSubtitle) {
                viewSubtitle.textContent = "Monitoreo en tiempo real de comercios registrados, usuarios activos y rendimiento comercial en Cúcuta.";
            }
            toggleMobileSidebar(true);
        });
    }

    if (navTiendas) {
        navTiendas.addEventListener("click", (e) => {
            e.preventDefault();
            setActiveNav(navTiendas);
            if (seccionKpis) seccionKpis.classList.add("hidden");
            if (seccionTiendas) seccionTiendas.classList.remove("hidden");
            if (seccionUsuarios) seccionUsuarios.classList.add("hidden");
            if (viewTitle) viewTitle.textContent = "Gestión de Tiendas";
            if (viewSubtitle) {
                viewSubtitle.textContent = "Administra, audita o da de baja los establecimientos comerciales registrados.";
            }
            toggleMobileSidebar(true);
        });
    }

    if (navUsuarios) {
        navUsuarios.addEventListener("click", (e) => {
            e.preventDefault();
            setActiveNav(navUsuarios);
            if (seccionKpis) seccionKpis.classList.add("hidden");
            if (seccionTiendas) seccionTiendas.classList.add("hidden");
            if (seccionUsuarios) seccionUsuarios.classList.remove("hidden");
            if (viewTitle) viewTitle.textContent = "Gestión de Usuarios";
            if (viewSubtitle) {
                viewSubtitle.textContent = "Supervisión de cuentas de tenderos y compradores activos en Tiendas Cúcuta.";
            }
            toggleMobileSidebar(true);
        });
    }

    // --- Filtrado local de la tabla de tiendas (Búsqueda + Estado) ---
    function filterStoresTable() {
        if (!tiendasTbody) return;
        const query = (searchInput ? searchInput.value : "").trim().toLowerCase();
        const selectedStatus = filterEstado ? filterEstado.value : "all";

        const rows = tiendasTbody.querySelectorAll("tr[data-store-id]");
        rows.forEach((row) => {
            const textContent = row.textContent.toLowerCase();
            const rowStatus = row.getAttribute("data-status") || "";

            const matchesQuery = !query || textContent.includes(query);
            const matchesStatus = selectedStatus === "all" || rowStatus === selectedStatus;

            row.classList.toggle("hidden", !(matchesQuery && matchesStatus));
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", filterStoresTable);
    }
    if (filterEstado) {
        filterEstado.addEventListener("change", filterStoresTable);
    }

    // --- Botón Actualizar Datos (Preparado para fetch al Backend) ---
    if (btnRefresh) {
        btnRefresh.addEventListener("click", async () => {
            const icon = btnRefresh.querySelector(".material-symbols-outlined");
            if (icon) icon.classList.add("animate-spin");
            // TODO: Conectar con GET /api/superadmin/metricas y GET /api/superadmin/tiendas
            setTimeout(() => {
                if (icon) icon.classList.remove("animate-spin");
            }, 500);
        });
    }

    // --- Delegación de Eventos en Tabla de Tiendas (Ver Detalles / Eliminar) ---
    if (tiendasTbody) {
        tiendasTbody.addEventListener("click", (e) => {
            const actionBtn = e.target.closest("button[data-action]");
            if (!actionBtn) return;

            const action = actionBtn.getAttribute("data-action");
            const storeId = actionBtn.getAttribute("data-id");
            const storeName = actionBtn.getAttribute("data-name");
            const row = actionBtn.closest("tr");

            if (action === "view-store") {
                openStoreDetailsModal(storeId, storeName, row);
            } else if (action === "delete-store") {
                handleDeleteStore(storeId, storeName, row);
            }
        });
    }

    function openStoreDetailsModal(storeId, storeName, row) {
        if (!storeModal) return;
        const cells = row ? row.querySelectorAll("td") : [];
        const owner = cells[1] ? cells[1].textContent.trim() : "N/A";
        const products = cells[2] ? cells[2].textContent.trim() : "0 Productos";
        const status = row ? (row.getAttribute("data-status") || "Activa") : "Activa";

        document.getElementById("sa-modal-store-name").textContent = storeName || "Detalles de Tienda";
        document.getElementById("sa-modal-store-id").textContent = `#TC-${storeId}`;
        document.getElementById("sa-modal-store-owner").textContent = owner;
        document.getElementById("sa-modal-store-products").textContent = products;
        document.getElementById("sa-modal-store-status").textContent = status;

        storeModal.classList.remove("hidden");
    }

    function closeStoreDetailsModal() {
        if (storeModal) storeModal.classList.add("hidden");
    }

    if (btnCloseModal) btnCloseModal.addEventListener("click", closeStoreDetailsModal);
    if (btnAcceptModal) btnAcceptModal.addEventListener("click", closeStoreDetailsModal);
    if (storeModal) {
        storeModal.addEventListener("click", (e) => {
            if (e.target === storeModal) closeStoreDetailsModal();
        });
    }

    function handleDeleteStore(storeId, storeName, row) {
        const confirmed = confirm(
            `¿Estás seguro de que deseas eliminar la tienda "${storeName}" (#TC-${storeId})?\n\nEsta acción está preparada para conectarse con DELETE /api/superadmin/tiendas/${storeId}.`
        );
        if (confirmed && row) {
            row.remove();
            const kpiTiendas = document.getElementById("kpi-total-tiendas");
            if (kpiTiendas) {
                const currentCount = parseInt(kpiTiendas.textContent, 10);
                if (!isNaN(currentCount) && currentCount > 0) {
                    kpiTiendas.textContent = String(currentCount - 1);
                }
            }
        }
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
});
