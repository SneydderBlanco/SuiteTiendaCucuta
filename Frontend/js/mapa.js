// Al cargar la página, ejecutar la carga de tiendas, verificar login e inicializar el mapa
document.addEventListener("DOMContentLoaded", async () => {
    
    // ==========================================
    // 1. Verificación de Autenticación & Navbar Sync
    // ==========================================
    const userName = localStorage.getItem("userName");
    const loginBtn = document.getElementById("login-btn");
    const userDropdown = document.getElementById("user-dropdown");
    
    if (userName && loginBtn) {
        loginBtn.innerHTML = `Hola, ${userName} <span class="material-symbols-outlined text-base ml-1 align-bottom">keyboard_arrow_down</span>`;
        loginBtn.href = "#"; // Desactiva redirigir al login
        
        // Lógica para abrir/cerrar menú desplegable
        loginBtn.addEventListener("click", (e) => {
            e.preventDefault();
            userDropdown.classList.toggle("hidden");
            setTimeout(() => userDropdown.classList.toggle("opacity-0"), 10);
        });

        // Cerrar menú si el usuario hace clic fuera de él
        document.addEventListener("click", (e) => {
            if (!loginBtn.contains(e.target) && userDropdown && !userDropdown.contains(e.target)) {
                userDropdown.classList.add("opacity-0");
                setTimeout(() => userDropdown.classList.add("hidden"), 200);
            }
        });
    }

    // ==========================================
    // 2. Inicialización de Leaflet.js
    // ==========================================
    const cucutaCenter = [7.8939, -72.5078];
    const map = L.map('mapa-interactivo-cucuta', {
        zoomControl: false // Lo posicionaremos en un lugar más cómodo
    }).setView(cucutaCenter, 13);

    // Añadir control de zoom en una posición más limpia (abajo a la derecha)
    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);

    // Tile Layer: CartoDB Positron (Premium aesthetic, light and clean)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // ==========================================
    // 3. Estructuras de Datos Globales del Mapa
    // ==========================================
    let tiendas = [];
    const markersMap = {};      // Map para guardar referencias de marcadores: { id_tendero: marker }
    const listItemsMap = {};    // Map para guardar referencias de elementos DOM de la lista
    let activeMarkerId = null;  // Guardar ID del marcador actualmente destacado

    // Elementos del DOM
    const storesListContainer = document.getElementById("map-stores-list");
    const searchInput = document.getElementById("map-search-input");
    const detallesPlaceholder = document.getElementById("detalles-placeholder");
    const detallesContenido = document.getElementById("detalles-contenido");

    // ==========================================
    // 4. Carga de Tiendas desde el Backend
    // ==========================================
    try {
        tiendas = await API.getTiendas();
        renderMapContent(tiendas);
    } catch (error) {
        console.error("Error al cargar tiendas en el mapa:", error);
        if (storesListContainer) {
            storesListContainer.innerHTML = `
                <div class="py-12 text-center text-red-500">
                    <span class="material-symbols-outlined text-4xl mb-2">error</span>
                    <p class="text-xs font-bold">Error al conectar con la red. Inténtalo de nuevo.</p>
                </div>
            `;
        }
    }

    // ==========================================
    // 5. Renderizado de Contenido y Marcadores
    // ==========================================
    function renderMapContent(tiendasList) {
        if (!storesListContainer) return;
        storesListContainer.innerHTML = "";

        // Limpiar marcadores existentes del mapa
        Object.values(markersMap).forEach(marker => map.removeLayer(marker));
        // Resetear diccionarios
        Object.keys(markersMap).forEach(key => delete markersMap[key]);
        Object.keys(listItemsMap).forEach(key => delete listItemsMap[key]);

        if (tiendasList.length === 0) {
            storesListContainer.innerHTML = `
                <div class="py-12 text-center text-slate-400">
                    <span class="material-symbols-outlined text-4xl mb-2 text-slate-300">search_off</span>
                    <p class="text-xs font-semibold">No se encontraron tiendas locales.</p>
                </div>
            `;
            return;
        }

        tiendasList.forEach(tienda => {
            const id = tienda.id_tendero;
            
            // 5.1 Construir Coordenadas con Offset si son inválidas
            let lat = parseFloat(tienda.latitud);
            let lng = parseFloat(tienda.longitud);

            if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
                // Generar posición aleatoria sutil para evitar solapamientos en el centro de Cúcuta
                const angle = Math.random() * Math.PI * 2;
                const distance = 0.008 + Math.random() * 0.012; // Radio de ~800m a ~2km
                lat = cucutaCenter[0] + Math.sin(angle) * distance;
                lng = cucutaCenter[1] + Math.cos(angle) * distance;
            }

            // Guardar coordenadas finales en el objeto tienda por si acaso se usan en enlaces
            tienda.final_lat = lat;
            tienda.final_lng = lng;

            // 5.2 Crear Marcador en el Mapa con Estilo Premium de DRAVEN (Esmeralda)
            const markerHtml = `
                <div class="marker-pin-wrapper flex flex-col items-center justify-center">
                    <div class="relative flex items-center justify-center">
                        <!-- Ripple pulse effect -->
                        <div class="absolute w-8 h-8 rounded-full bg-emerald-500/30 animate-pulse"></div>
                        <!-- Core pin container -->
                        <div class="core-pin w-7 h-7 rounded-full bg-emerald-600 border-2 border-white shadow-lg flex items-center justify-center">
                            <span class="material-symbols-outlined text-white text-[14px] select-none">storefront</span>
                        </div>
                    </div>
                    <!-- Triangulito inferior del pin -->
                    <div class="pin-triangle w-2.5 h-2.5 bg-emerald-600 rotate-45 -mt-1.5 border-r border-b border-white shadow-md"></div>
                </div>
            `;

            const customIcon = L.divIcon({
                className: 'custom-leaflet-marker',
                html: markerHtml,
                iconSize: [32, 36],
                iconAnchor: [16, 36],
                popupAnchor: [0, -36]
            });

            // Popup básico de Leaflet
            const popupContent = `
                <div class="p-1 font-body text-slate-800">
                    <h4 class="font-bold text-sm text-emerald-800">${tienda.nombre_tienda}</h4>
                    <p class="text-[10px] text-slate-500 font-semibold mb-1">${tienda.ubicacion || 'Cúcuta, Colombia'}</p>
                    <p class="text-[11px] text-slate-600 leading-tight line-clamp-2">${tienda.descripcion || 'Sin descripción.'}</p>
                </div>
            `;

            const marker = L.marker([lat, lng], { icon: customIcon })
                .bindPopup(popupContent, { closeButton: false, offset: L.point(0, -5) })
                .addTo(map);

            // Almacenar marcador
            markersMap[id] = marker;

            // 5.3 Crear Elemento DOM en la Lista Lateral Izquierda
            const item = document.createElement("div");
            item.className = "group bg-white hover:bg-emerald-50/40 p-4.5 rounded-2xl border border-slate-100 hover:border-emerald-100 transition-all duration-300 flex gap-3 cursor-pointer relative overflow-hidden select-none";
            
            const logoUrl = tienda.logo_url 
                ? (tienda.logo_url.startsWith('http') ? tienda.logo_url : `${window.API_URL}${tienda.logo_url}`)
                : null;

            item.innerHTML = `
                <!-- Logo -->
                <div class="w-12 h-12 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden">
                    ${logoUrl
                        ? `<img src="${logoUrl}" class="w-full h-full object-cover" alt="${tienda.nombre_tienda}" onerror="this.outerHTML='<span class=\'material-symbols-outlined text-emerald-600 text-2xl\'>storefront</span>'">`
                        : `<span class="material-symbols-outlined text-emerald-600 text-2xl">storefront</span>`
                    }
                </div>
                <!-- Content -->
                <div class="flex-grow min-w-0">
                    <h3 class="font-bold text-sm text-slate-800 group-hover:text-emerald-700 transition-colors truncate">
                        ${tienda.nombre_tienda}
                    </h3>
                    <p class="text-[10px] text-slate-400 font-semibold truncate flex items-center gap-0.5 mt-0.5">
                        <span class="material-symbols-outlined text-[12px]">location_on</span>
                        ${tienda.ubicacion || 'Cúcuta'}
                    </p>
                    <p class="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-snug">
                        ${tienda.descripcion || '¡Visítanos para conocer nuestras ofertas y productos!'}
                    </p>
                </div>
                <!-- Indicador de hover lateral -->
                <div class="absolute left-0 top-0 bottom-0 w-1 bg-emerald-600 scale-y-0 group-hover:scale-y-100 transition-transform origin-center"></div>
            `;

            storesListContainer.appendChild(item);
            listItemsMap[id] = item;

            // ==========================================
            // 6. Configuración de Eventos Interactivos
            // ==========================================

            // EVENTO: Clic en el elemento de la lista izquierda
            item.addEventListener("click", () => {
                seleccionarTienda(tienda);
            });

            // EVENTO: Mouse Enter en la lista lateral (Rebote y destaque visual)
            item.addEventListener("mouseenter", () => {
                destacarMarcador(id, true);
            });

            // EVENTO: Mouse Leave en la lista lateral (Remover destaque)
            item.addEventListener("mouseleave", () => {
                destacarMarcador(id, false);
            });

            // EVENTOS DE MARCADOR EN MAPA
            marker.on("click", () => {
                seleccionarTienda(tienda);
            });

            marker.on("mouseover", () => {
                destacarMarcador(id, true);
            });

            marker.on("mouseout", () => {
                destacarMarcador(id, false);
            });
        });
    }

    // ==========================================
    // 7. Funciones de Control de UI y Estados
    // ==========================================

    // Destacar marcador con bounce y visual highlight
    function destacarMarcador(id, activar) {
        const marker = markersMap[id];
        if (!marker || !marker._icon) return;

        if (activar) {
            // Añadir clase de animación
            marker._icon.classList.add("marker-active-bounce");
            marker.openPopup();
            
            // Highlight sutil de la lista lateral también si no es la seleccionada activa
            const listItem = listItemsMap[id];
            if (listItem && id !== activeMarkerId) {
                listItem.classList.add("bg-emerald-50/20", "border-emerald-100");
            }
        } else {
            // Evitar apagar el marcador si es el que está seleccionado actualmente en pantalla
            if (id === activeMarkerId) return;

            marker._icon.classList.remove("marker-active-bounce");
            
            // Cerrar popup si no está seleccionado activamente
            marker.closePopup();

            const listItem = listItemsMap[id];
            if (listItem) {
                listItem.classList.remove("bg-emerald-50/20", "border-emerald-100");
            }
        }
    }

    // Seleccionar una tienda (llenar Ficha de Detalle, enfocar en mapa)
    function seleccionarTienda(tienda) {
        const id = tienda.id_tendero;
        
        // 1. Quitar rebote del marcador activo anterior
        if (activeMarkerId && activeMarkerId !== id) {
            const prevMarker = markersMap[activeMarkerId];
            if (prevMarker && prevMarker._icon) {
                prevMarker._icon.classList.remove("marker-active-bounce");
                prevMarker.closePopup();
            }
            const prevListItem = listItemsMap[activeMarkerId];
            if (prevListItem) {
                prevListItem.classList.remove("bg-emerald-50/40", "border-emerald-200", "ring-1", "ring-emerald-100");
            }
        }

        // 2. Establecer nuevo id activo
        activeMarkerId = id;

        // 3. Destacar el nuevo marcador
        const marker = markersMap[id];
        if (marker) {
            if (marker._icon) {
                marker._icon.classList.add("marker-active-bounce");
            }
            marker.openPopup();
            
            // Centrar y hacer zoom suave en el mapa
            map.setView(marker.getLatLng(), 15, {
                animate: true,
                duration: 1.0
            });
        }

        // Estilo seleccionado en el item de la lista lateral
        const listItem = listItemsMap[id];
        if (listItem) {
            listItem.classList.add("bg-emerald-50/40", "border-emerald-200", "ring-1", "ring-emerald-100");
            listItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // 4. Mostrar Ficha de Detalles (Derecha)
        if (detallesPlaceholder) detallesPlaceholder.classList.add("hidden");
        if (detallesContenido) detallesContenido.classList.remove("hidden");

        // 4.1 Banner de la Tienda
        const bannerContainer = document.getElementById("tienda-detalle-banner");
        if (bannerContainer) {
            const bannerUrl = tienda.banner_url
                ? (tienda.banner_url.startsWith('http') ? tienda.banner_url : `${window.API_URL}${tienda.banner_url}`)
                : null;
            
            if (bannerUrl) {
                bannerContainer.innerHTML = `<img src="${bannerUrl}" class="w-full h-full object-cover" alt="Banner ${tienda.nombre_tienda}">`;
            } else {
                bannerContainer.innerHTML = `<div class="absolute inset-0 bg-gradient-to-tr from-emerald-600 via-teal-700 to-emerald-500 opacity-90"></div>`;
            }
        }

        // 4.2 Logo de la Tienda
        const logoImg = document.getElementById("tienda-detalle-logo");
        if (logoImg) {
            const logoUrl = tienda.logo_url 
                ? (tienda.logo_url.startsWith('http') ? tienda.logo_url : `${window.API_URL}${tienda.logo_url}`)
                : null;

            if (logoUrl) {
                logoImg.src = logoUrl;
                logoImg.classList.remove("hidden");
                // Asegurar que si falla la carga vuelva al fallback
                logoImg.onerror = () => {
                    logoImg.parentNode.innerHTML = `<span class="material-symbols-outlined text-emerald-600 text-3xl">storefront</span>`;
                };
            } else {
                logoImg.parentNode.innerHTML = `<span class="material-symbols-outlined text-emerald-600 text-3xl">storefront</span>`;
            }
        }

        // 4.3 Campos de Texto
        const txtNombre = document.getElementById("tienda-detalle-nombre");
        if (txtNombre) txtNombre.innerHTML = `${tienda.nombre_tienda} <span class="material-symbols-outlined text-emerald-500 text-lg fill-current">verified</span>`;

        const txtDueno = document.getElementById("tienda-detalle-dueno");
        if (txtDueno) txtDueno.textContent = `Por: ${tienda.nombre}`;

        const txtDireccion = document.getElementById("tienda-detalle-direccion");
        if (txtDireccion) {
            txtDireccion.innerHTML = `
                <span class="material-symbols-outlined text-[14px]">location_on</span>
                ${tienda.ubicacion || 'Cúcuta, Colombia'}
            `;
        }

        const txtDescripcion = document.getElementById("tienda-detalle-descripcion");
        if (txtDescripcion) txtDescripcion.textContent = tienda.descripcion || 'Esta tienda aún no ha agregado una descripción comercial.';

        // 4.4 Botones de Redirección
        const btnVisitar = document.getElementById("tienda-detalle-btn-visitar");
        if (btnVisitar) {
            btnVisitar.href = `tienda.html?id=${tienda.id_tendero}`;
        }

        const btnMapa = document.getElementById("tienda-detalle-btn-mapa");
        if (btnMapa) {
            btnMapa.href = `https://www.google.com/maps/dir/?api=1&destination=${tienda.final_lat},${tienda.final_lng}`;
        }
    }

    // ==========================================
    // 8. Filtrado en Tiempo Real (Buscador)
    // ==========================================
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase().trim();
            
            tiendas.forEach(tienda => {
                const id = tienda.id_tendero;
                const marker = markersMap[id];
                const listItem = listItemsMap[id];

                const nameMatch = tienda.nombre_tienda.toLowerCase().includes(query);
                const descMatch = (tienda.descripcion || '').toLowerCase().includes(query);
                const locMatch = (tienda.ubicacion || '').toLowerCase().includes(query);
                const ownerMatch = tienda.nombre.toLowerCase().includes(query);

                const isMatch = nameMatch || descMatch || locMatch || ownerMatch;

                if (isMatch) {
                    // Mostrar elemento lateral
                    if (listItem) listItem.classList.remove("hidden");
                    // Añadir marcador de vuelta si no estaba
                    if (marker && !map.hasLayer(marker)) marker.addTo(map);
                } else {
                    // Ocultar elemento lateral
                    if (listItem) listItem.classList.add("hidden");
                    // Quitar del mapa
                    if (marker) {
                        marker.closePopup();
                        map.removeLayer(marker);
                    }
                    // Si la tienda oculta era la seleccionada activa, resetear detalle a placeholder
                    if (id === activeMarkerId) {
                        activeMarkerId = null;
                        if (detallesPlaceholder) detallesPlaceholder.classList.remove("hidden");
                        if (detallesContenido) detallesContenido.classList.add("hidden");
                    }
                }
            });
        });
    }
});
