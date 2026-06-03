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
    const searchInput = document.getElementById("search-input");

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
                <div class="h-32 w-full relative overflow-hidden bg-gradient-to-r from-emerald-500 to-teal-600">
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
                        <span class="text-emerald-600 font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                            Visitar tienda
                            <span class="material-symbols-outlined text-xs">arrow_forward</span>
                        </span>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    // Inicializar renderizado
    renderTiendas(tiendas);

    // 3. Filtrado reactivo en tiempo real
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase().trim();
            const filtered = tiendas.filter(tienda => {
                const nameMatch = tienda.nombre_tienda.toLowerCase().includes(query);
                const descMatch = (tienda.descripcion || '').toLowerCase().includes(query);
                const ownerMatch = tienda.nombre.toLowerCase().includes(query);
                const locMatch = (tienda.ubicacion || '').toLowerCase().includes(query);
                return nameMatch || descMatch || ownerMatch || locMatch;
            });
            renderTiendas(filtered);
        });
    }
});