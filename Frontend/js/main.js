// Al cargar la página, ejecutar la carga de tiendas y verificar login
document.addEventListener("DOMContentLoaded", async () => {
    
    // Verificación de Autenticación
    const userName = localStorage.getItem("userName");
    const loginBtn = document.getElementById("login-btn");
    const userDropdown = document.getElementById("user-dropdown");
    
    if (userName && loginBtn) {
        loginBtn.innerHTML = `Hola, ${userName} <span class="material-symbols-outlined text-base ml-1 align-bottom">keyboard_arrow_down</span>`;
        loginBtn.href = "#"; // Desactiva redirigir al login si ya está activo
        
        // Logica para abrir/cerrar menú desplegable
        loginBtn.addEventListener("click", (e) => {
            e.preventDefault();
            userDropdown.classList.toggle("hidden");
            setTimeout(() => userDropdown.classList.toggle("opacity-0"), 10);
        });

        // Cerrar menú si el usuario clickea fuera de él
        document.addEventListener("click", (e) => {
            if (!loginBtn.contains(e.target) && userDropdown && !userDropdown.contains(e.target)) {
                userDropdown.classList.add("opacity-0");
                setTimeout(() => userDropdown.classList.add("hidden"), 200);
            }
        });
    }

    const grid = document.getElementById("tiendas-grid");
    const productosGrid = document.getElementById("productos-grid");
    const tiendasSection = document.getElementById("tiendas-section");
    const productosSection = document.getElementById("productos-section");
    const productosSubtitle = document.getElementById("productos-subtitle");
    const searchInput = document.getElementById("search-input");
    const searchBtn = document.getElementById("search-btn");
    const tabTiendas = document.getElementById("tab-tiendas");
    const tabProductos = document.getElementById("tab-productos");
    const btnVolverTiendas = document.getElementById("btn-volver-tiendas");

    let searchMode = "tiendas"; // 'tiendas' | 'productos'

    // 1. Llamar al Backend para obtener tiendas
    const tiendas = await API.getTiendas();

    // 2. Función para renderizar tiendas
    function renderTiendas(tiendasList) {
        if (!grid) return;
        grid.innerHTML = "";

        if (tiendasList.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full py-12 text-center text-slate-500">
                    <span class="material-symbols-outlined text-5xl mb-3 text-slate-300">search_off</span>
                    <p class="font-medium">No se encontraron tiendas que coincidan con tu búsqueda.</p>
                </div>
            `;
            return;
        }

        tiendasList.forEach(tienda => {
            const card = document.createElement("div");
            card.className = "group bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 flex flex-col cursor-pointer";
            card.addEventListener("click", () => {
                window.location.href = `tienda.html?id=${tienda.id_tendero}`;
            });

            // Formatear imágenes
            const fullLogoUrl = tienda.logo_url 
                ? (tienda.logo_url.startsWith('http') ? tienda.logo_url : `${window.API_URL}${tienda.logo_url}`)
                : null;

            const fullBannerUrl = tienda.banner_url
                ? (tienda.banner_url.startsWith('http') ? tienda.banner_url : `${window.API_URL}${tienda.banner_url}`)
                : null;

            card.innerHTML = `
                <!-- Banner Section -->
                <div class="h-32 w-full relative overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-700">
                    ${fullBannerUrl 
                        ? `<img src="${fullBannerUrl}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Banner ${tienda.nombre_tienda}">` 
                        : `<div class="absolute inset-0 bg-gradient-to-tr from-emerald-600/10 via-teal-700/20 to-cyan-500/10 backdrop-blur-[1px]"></div>`
                    }
                </div>
                
                <!-- Profile & Content Section -->
                <div class="px-6 pb-6 relative flex-1 flex flex-col">
                    <!-- Logo circular pisándolo -->
                    <div class="absolute -top-10 left-6 w-20 h-20 rounded-full border-4 border-white shadow-md bg-white overflow-hidden flex items-center justify-center">
                        ${fullLogoUrl
                            ? `<img src="${fullLogoUrl}" class="w-full h-full object-cover" alt="Logo ${tienda.nombre_tienda}" onerror="this.outerHTML='<span class=\'material-symbols-outlined text-emerald-600 text-3xl\'>storefront</span>'">`
                            : `<span class="material-symbols-outlined text-emerald-600 text-3xl">storefront</span>`
                        }
                    </div>
                    
                    <!-- Store Name and details -->
                    <div class="mt-12 flex-grow">
                        <h3 class="text-xl font-bold text-slate-800 group-hover:text-emerald-600 transition-colors tracking-tight flex items-center gap-1.5 font-headline">
                            ${tienda.nombre_tienda}
                            <span class="material-symbols-outlined text-emerald-500 text-lg fill-current">verified</span>
                        </h3>
                        
                        <p class="text-xs text-slate-400 font-semibold flex items-center gap-1 mt-1">
                            <span class="material-symbols-outlined text-[14px]">location_on</span>
                            ${tienda.ubicacion || 'Cúcuta, Colombia'}
                        </p>
                        
                        <p class="text-slate-600 text-sm mt-3 line-clamp-2 leading-relaxed">
                            ${tienda.descripcion || '¡Bienvenido a nuestra tienda! Explora nuestros productos de alta calidad y disfruta de la mejor atención.'}
                        </p>
                    </div>
                    
                    <!-- Card Action Footer -->
                    <div class="mt-5 pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
                        <span class="text-slate-400 font-medium">Por: ${tienda.nombre}</span>
                        <span class="text-emerald-600 hover:text-emerald-800 group-hover:text-emerald-700 hover:underline underline-offset-4 font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-all duration-200">
                            Visitar tienda
                            <span class="material-symbols-outlined text-xs">arrow_forward</span>
                        </span>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    // 2.1 Función para renderizar productos globales
    function renderProductosGlobal(productosList, query = "") {
        if (!productosGrid) return;
        productosGrid.innerHTML = "";

        if (productosSubtitle) {
            productosSubtitle.textContent = query
                ? `Mostrando ${productosList.length} resultado(s) para "${query}"`
                : `Mostrando ${productosList.length} producto(s) disponibles en nuestras tiendas aliadas`;
        }

        if (productosList.length === 0) {
            productosGrid.innerHTML = `
                <div class="col-span-full py-12 text-center text-slate-500">
                    <span class="material-symbols-outlined text-5xl mb-3 text-slate-300">inventory_2</span>
                    <p class="font-medium">No se encontraron productos que coincidan con "${query}".</p>
                </div>
            `;
            return;
        }

        productosList.forEach(prod => {
            const tiendaId = prod.id_tienda || prod.id_tendero;
            const card = document.createElement("div");
            card.className = "group bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 flex flex-col cursor-pointer";
            card.addEventListener("click", () => {
                window.location.href = `tienda.html?id=${tiendaId}`;
            });

            const imgUrl = prod.imagen_url
                ? (prod.imagen_url.startsWith('http') ? prod.imagen_url : `${window.API_URL}${prod.imagen_url}`)
                : 'https://placehold.co/300x300/e2e8f0/475569?text=Sin+Imagen';

            const precioFormateado = window.Utils && typeof Utils.formatCurrency === "function"
                ? Utils.formatCurrency(prod.precio_venta)
                : `$${Number(prod.precio_venta || 0).toLocaleString()}`;

            card.innerHTML = `
                <!-- Imagen del Producto -->
                <div class="aspect-square w-full bg-slate-50 relative overflow-hidden flex items-center justify-center">
                    <img src="${imgUrl}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="${prod.nombre}" onerror="this.src='https://placehold.co/300x300/e2e8f0/475569?text=Producto'">
                    <span class="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-[10px] font-black text-slate-700 uppercase tracking-widest px-3 py-1 rounded-full shadow-sm border border-slate-100">
                        ${prod.categoria || 'General'}
                    </span>
                </div>

                <!-- Contenido del Producto -->
                <div class="p-6 flex-1 flex flex-col justify-between">
                    <div>
                        <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">${prod.marca || 'Genérico'}</span>
                        <h3 class="text-lg font-bold text-slate-800 group-hover:text-emerald-600 transition-colors tracking-tight mt-0.5 line-clamp-2">
                            ${prod.nombre}
                        </h3>
                        <p class="text-xl font-extrabold text-emerald-600 mt-2">
                            ${precioFormateado}
                        </p>
                    </div>

                    <!-- Tienda que lo vende -->
                    <div class="mt-5 pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
                        <a href="tienda.html?id=${tiendaId}" onclick="event.stopPropagation();" class="flex items-center gap-1.5 text-slate-600 hover:text-emerald-700 font-bold truncate max-w-[65%] transition-colors">
                            <span class="material-symbols-outlined text-[16px] text-emerald-600 shrink-0">storefront</span>
                            <span class="truncate">${prod.nombre_tienda || 'Tienda Local'}</span>
                        </a>
                        <span class="text-emerald-600 hover:text-emerald-800 group-hover:text-emerald-700 hover:underline underline-offset-4 font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-all duration-200 shrink-0">
                            Ir a tienda
                            <span class="material-symbols-outlined text-xs">arrow_forward</span>
                        </span>
                    </div>
                </div>
            `;
            productosGrid.appendChild(card);
        });
    }

    // 2.2 Cambiar entre modo 'tiendas' y 'productos'
    function setSearchMode(mode) {
        searchMode = mode;
        const activeClasses = ["bg-emerald-600", "text-white", "shadow-md", "shadow-emerald-600/20"];
        const inactiveClasses = ["text-slate-600", "hover:text-emerald-700", "hover:bg-slate-50"];

        if (mode === "tiendas") {
            if (tabTiendas && tabProductos) {
                tabTiendas.classList.add(...activeClasses);
                tabTiendas.classList.remove(...inactiveClasses);
                tabProductos.classList.remove(...activeClasses);
                tabProductos.classList.add(...inactiveClasses);
            }
            if (searchInput) {
                searchInput.placeholder = "¿Qué tienda o negocio buscas hoy en Cúcuta?...";
            }
            if (productosSection) productosSection.classList.add("hidden");
            if (tiendasSection) tiendasSection.classList.remove("hidden");
            filterTiendas(searchInput ? searchInput.value : "");
        } else {
            if (tabTiendas && tabProductos) {
                tabProductos.classList.add(...activeClasses);
                tabProductos.classList.remove(...inactiveClasses);
                tabTiendas.classList.remove(...activeClasses);
                tabTiendas.classList.add(...inactiveClasses);
            }
            if (searchInput) {
                searchInput.placeholder = "¿Qué producto buscas hoy? (ej. arroz, panela, café...)";
            }
        }
    }

    function filterTiendas(rawQuery) {
        const query = (rawQuery || "").toLowerCase().trim();
        const filtered = tiendas.filter(tienda => {
            const nameMatch = tienda.nombre_tienda.toLowerCase().includes(query);
            const descMatch = (tienda.descripcion || '').toLowerCase().includes(query);
            const ownerMatch = tienda.nombre.toLowerCase().includes(query);
            const locMatch = (tienda.ubicacion || '').toLowerCase().includes(query);
            return nameMatch || descMatch || ownerMatch || locMatch;
        });
        renderTiendas(filtered);
    }

    async function ejecutarBusquedaProductos() {
        const query = searchInput ? searchInput.value.trim() : "";
        if (tiendasSection) tiendasSection.classList.add("hidden");
        if (productosSection) productosSection.classList.remove("hidden");

        if (productosGrid) {
            productosGrid.innerHTML = `
                <div class="col-span-full py-12 text-center text-slate-400">
                    <span class="material-symbols-outlined text-4xl animate-spin text-emerald-500 mb-2">sync</span>
                    <p class="text-sm font-semibold">Buscando productos en todas las tiendas...</p>
                </div>
            `;
        }

        const productos = await API.buscarProductosGlobal(query);
        renderProductosGlobal(productos, query);
    }

    // Eventos de los Tabs
    if (tabTiendas) {
        tabTiendas.addEventListener("click", () => setSearchMode("tiendas"));
    }
    if (tabProductos) {
        tabProductos.addEventListener("click", () => {
            setSearchMode("productos");
            ejecutarBusquedaProductos();
        });
    }
    if (btnVolverTiendas) {
        btnVolverTiendas.addEventListener("click", () => {
            if (searchInput) searchInput.value = "";
            setSearchMode("tiendas");
        });
    }

    // Inicializar renderizado
    renderTiendas(tiendas);

    // 3. Filtrado y Acción del Botón Buscar
    if (searchBtn) {
        searchBtn.addEventListener("click", () => {
            if (searchMode === "tiendas") {
                if (productosSection) productosSection.classList.add("hidden");
                if (tiendasSection) tiendasSection.classList.remove("hidden");
                filterTiendas(searchInput ? searchInput.value : "");
            } else {
                ejecutarBusquedaProductos();
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            if (searchMode === "tiendas") {
                filterTiendas(e.target.value);
            }
        });

        searchInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                if (searchMode === "tiendas") {
                    filterTiendas(searchInput.value);
                } else {
                    ejecutarBusquedaProductos();
                }
            }
        });
    }
});
