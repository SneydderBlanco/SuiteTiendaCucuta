document.addEventListener("DOMContentLoaded", () => {
    const userName = localStorage.getItem("userName");
    const userRole = localStorage.getItem("userRole");
    const userId = localStorage.getItem("userId");

    // Seguridad Requerida
    if (!userName || userRole !== 'merchant' || !userId) {
        window.location.href = "login.html";
        return;
    }

    document.getElementById("tendero-name").textContent = userName;

    // Load API Resources
    loadProducts(userId);
    highlightCurrentDay();
    fetchStoreProfile();
    loadDashboard(userId);

    const navDashboard = document.getElementById("nav-dashboard");
    const navInventario = document.getElementById("nav-inventario");
    const navReportes = document.getElementById("nav-reportes");
    const navVentas = document.getElementById("nav-ventas");
    const navHistorial = document.getElementById("nav-historial");
    const navMiTienda = document.getElementById("nav-mi-tienda");
    const navVitrina = document.getElementById("nav-vitrina");
    const navConfiguracion = document.getElementById("nav-configuracion");
    
    const vistaDashboard = document.getElementById("vista-dashboard");
    const vistaInventario = document.getElementById("vista-inventario");
    const vistaReportes = document.getElementById("vista-reportes");
    const vistaVentas = document.getElementById("vista-ventas");
    const vistaHistorial = document.getElementById("vista-historial");
    const vistaMiTienda = document.getElementById("vista-mi-tienda");
    const vistaVitrina = document.getElementById("vista-vitrina");
    const vistaConfiguracion = document.getElementById("vista-configuracion");

    const activeClasses = ['text-[#006c49]', 'dark:text-[#10b981]', 'font-bold', 'border-r-4', 'border-[#006c49]', 'dark:border-[#10b981]', 'bg-[#10b981]/5', 'translate-x-1'];
    const inactiveClasses = ['text-[#3c4a42]', 'dark:text-gray-500'];

    function switchTabTo(activeNav, activeView) {
        const allNavs = [navDashboard, navInventario, navReportes, navVentas, navHistorial, navMiTienda, navVitrina, navConfiguracion];
        const allViews = [vistaDashboard, vistaInventario, vistaReportes, vistaVentas, vistaHistorial, vistaMiTienda, vistaVitrina, vistaConfiguracion];

        allNavs.forEach(nav => {
            if (!nav) return;
            if (nav === activeNav) {
                nav.classList.remove(...inactiveClasses);
                nav.classList.add(...activeClasses);
            } else {
                nav.classList.remove(...activeClasses);
                nav.classList.add(...inactiveClasses);
            }
        });

        allViews.forEach(view => {
            if (!view) return;
            if (view === activeView) {
                view.classList.remove("hidden");
                if (view.id === "vista-ventas") {
                    view.classList.add("flex");
                }
            } else {
                view.classList.add("hidden");
                if (view.id === "vista-ventas") {
                    view.classList.remove("flex");
                }
            }
        });
    }

    if (navDashboard && navInventario && navReportes && navVentas && navHistorial && navMiTienda) {
        navDashboard.addEventListener("click", () => switchTabTo(navDashboard, vistaDashboard));
        navInventario.addEventListener("click", () => switchTabTo(navInventario, vistaInventario));
        navReportes.addEventListener("click", () => {
            switchTabTo(navReportes, vistaReportes);
            loadReportes(userId);
        });
        navVentas.addEventListener("click", () => switchTabTo(navVentas, vistaVentas));
        navHistorial.addEventListener("click", () => {
            switchTabTo(navHistorial, vistaHistorial);
            if (typeof cargarHistorialVentas === 'function') {
                cargarHistorialVentas(userId);
            }
        });
        navMiTienda.addEventListener("click", () => {
            fetchStoreProfile();
            loadStorefront(userId);
            switchTabTo(navMiTienda, vistaMiTienda);
        });
        if (navVitrina) {
            navVitrina.addEventListener("click", () => {
                switchTabTo(navVitrina, vistaVitrina);
                loadVitrinaManager(userId);
            });
        }
        navConfiguracion.addEventListener("click", () => switchTabTo(navConfiguracion, vistaConfiguracion));

        // Quick Actions from Dashboard
        const btnDashNuevaVenta = document.getElementById("btn-dash-nueva-venta");
        const btnDashCargarInventario = document.getElementById("btn-dash-cargar-inventario");
        if (btnDashNuevaVenta) btnDashNuevaVenta.addEventListener("click", () => navVentas.click());
        if (btnDashCargarInventario) btnDashCargarInventario.addEventListener("click", () => navInventario.click());
    }

    // Chart Date Filter Logic
    const filtroFecha = document.getElementById("filtro-fecha-grafica");
    if (filtroFecha) {
        flatpickr("#filtro-fecha-grafica", {
            locale: "es",
            dateFormat: "Y-m-d",
            disableMobile: "true",
            onChange: async function(selectedDates, dateStr) {
                if (!dateStr) return;
                
                const dateObj = new Date(dateStr + 'T00:00:00');
                const day = dateObj.getDay();
                const diffToMonday = dateObj.getDate() - day + (day === 0 ? -6 : 1);
                const monday = new Date(dateObj.setDate(diffToMonday));
                
                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);
                
                const formatOptions = { day: '2-digit', month: '2-digit' };
                const strMonday = monday.toLocaleDateString('es-ES', formatOptions);
                const strSunday = sunday.toLocaleDateString('es-ES', formatOptions);
                
                const btnLabel = document.getElementById("btn-fecha-label");
                if (btnLabel) {
                    btnLabel.textContent = `Semana ${strMonday} al ${strSunday}`;
                }
                
                try {
                    const chartResp = await API.getReportesGrafico(userId, dateStr);
                    if (chartResp.status === 200) {
                        updateChartUI(chartResp.data);
                    }
                } catch(err) {
                    console.error("Error al actualizar la grafica:", err);
                }
            }
        });
    }

    // Modal Control Logic
    const btnAddProduct = document.getElementById('btn-add-product');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnCancelModal = document.getElementById('btn-cancel-modal');
    const modalOverlay = document.getElementById('modal-overlay');

    window.toggleModal = function() {
        modalOverlay.classList.toggle('hidden');
    }

    btnAddProduct.addEventListener('click', toggleModal);
    btnCloseModal.addEventListener('click', toggleModal);
    btnCancelModal.addEventListener('click', toggleModal);

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) toggleModal();
    });

    // Edit Modal Control Logic
    const editModalOverlay = document.getElementById('edit-modal-overlay');
    const btnCloseEditModal = document.getElementById('btn-close-edit-modal');
    const btnCancelEditModal = document.getElementById('btn-cancel-edit-modal');

    window.toggleEditModal = function() {
        editModalOverlay.classList.toggle('hidden');
    }

    if (btnCloseEditModal && btnCancelEditModal && editModalOverlay) {
        btnCloseEditModal.addEventListener('click', toggleEditModal);
        btnCancelEditModal.addEventListener('click', toggleEditModal);
        editModalOverlay.addEventListener('click', (e) => {
            if (e.target === editModalOverlay) toggleEditModal();
        });
    }

    // Dropdown toggling logic
    window.toggleDropdown = function(event, id) {
        event.stopPropagation();
        const dropdowns = document.querySelectorAll('[id^="dropdown-"]');
        dropdowns.forEach(dd => {
            if (dd.id !== `dropdown-${id}`) {
                dd.classList.add('hidden');
            }
        });
        const currentDropdown = document.getElementById(`dropdown-${id}`);
        if (currentDropdown) {
            currentDropdown.classList.toggle('hidden');
        }
    };

    // Close dropdowns when clicking outside
    window.addEventListener('click', () => {
        const dropdowns = document.querySelectorAll('[id^="dropdown-"]');
        dropdowns.forEach(dd => dd.classList.add('hidden'));
    });

    // Edit Product logic
    window.editProduct = function(id, nombre) {
        const product = window.loadedProducts.find(p => (p.id || p.id_producto) === id);
        if (!product) {
            Utils.showAlert("Error: Producto no encontrado en memoria");
            return;
        }

        // Fill modal fields
        document.getElementById('edit-prod-id').value = id;
        document.getElementById('edit-prod-nombre').value = product.nombre;
        document.getElementById('edit-prod-marca').value = product.marca || '';
        document.getElementById('edit-prod-categoria').value = product.categoria;
        document.getElementById('edit-prod-precio').value = product.precio_venta;
        document.getElementById('edit-prod-stock').value = product.stock;

        toggleEditModal();
    };

    // Delete Product logic
    window.deleteProduct = async function(id) {
        if (confirm("¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.")) {
            try {
                const resp = await API.deleteProducto(id);
                if (resp.status === 200) {
                    loadProducts(userId);
                } else {
                    const data = resp.data;
                    Utils.showAlert(data.error || "Fallo al eliminar producto");
                }
            } catch (error) {
                Utils.showAlert("Error de red intentando eliminar el producto");
            }
        }
    };

    // Form Submissions
    const form = document.getElementById("add-product-form");
    form.addEventListener("submit", async(e) => {
        e.preventDefault();
        
        const formData = new FormData();
        formData.append("id_tendero", userId);
        formData.append("nombre", document.getElementById("reg-prod-nombre").value);
        formData.append("marca", document.getElementById("reg-prod-marca").value);
        formData.append("categoria", document.getElementById("reg-prod-categoria").value);
        formData.append("precio_venta", document.getElementById("reg-prod-precio").value);
        formData.append("stock", document.getElementById("reg-prod-stock").value);
        
        const imageFile = document.getElementById("reg-prod-imagen").files[0];
        if (imageFile) {
            formData.append("imagen", imageFile);
        }

        const btnSubmit = document.querySelector("#add-product-form button[type='submit']");
        const initText = btnSubmit.innerHTML;
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = "Guardando...";

        try {
            const resp = await API.createProducto(formData);

            if(resp.status === 200) {
                form.reset();
                toggleModal();
                loadProducts(userId);
            } else {
                const data = resp.data;
                Utils.showAlert(data.error || "Fallo al crear producto en BD");
            }
        } catch(e) {
            Utils.showAlert("Error de red enviando producto al servidor");
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = initText;
        }
    });

    // Edit Product Form Submission
    const editForm = document.getElementById("edit-product-form");
    if (editForm) {
        editForm.addEventListener("submit", async(e) => {
            e.preventDefault();

            const precio = parseFloat(document.getElementById("edit-prod-precio").value);
            const stock = parseInt(document.getElementById("edit-prod-stock").value, 10);

            // Validations
            if (precio < 0) {
                Utils.showAlert("Error: El precio no puede ser negativo");
                return;
            }
            if (stock === 0) {
                if (!confirm("Advertencia: El stock está en cero. ¿Deseas guardar de todos modos?")) {
                    return;
                }
            }

            const formData = new FormData();
            formData.append("nombre", document.getElementById("edit-prod-nombre").value);
            formData.append("marca", document.getElementById("edit-prod-marca").value);
            formData.append("categoria", document.getElementById("edit-prod-categoria").value);
            formData.append("precio_venta", precio);
            formData.append("stock", stock);

            const imageFile = document.getElementById("edit-prod-imagen").files[0];
            if (imageFile) {
                formData.append("imagen", imageFile);
            }

            const id = document.getElementById("edit-prod-id").value;
            const btnSubmit = document.querySelector("#edit-product-form button[type='submit']");
            const initText = btnSubmit.innerHTML;
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = "Guardando...";

            try {
                const resp = await API.updateProducto(id, formData);

                if(resp.status === 200) {
                    toggleEditModal();
                    loadProducts(userId); // Refresh table
                } else {
                    const data = resp.data;
                    Utils.showAlert(data.error || "Fallo al actualizar producto en BD");
                }
            } catch(error) {
                Utils.showAlert("Error de red enviando actualización al servidor");
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = initText;
            }
        });
    }

});

function highlightCurrentDay() {
    const currentDay = new Date().getDay(); // 0 is Sunday, 1 is Monday...
    const bars = document.querySelectorAll('.chart-bar');
    const labels = document.querySelectorAll('[data-day-label]');

    bars.forEach(bar => {
        const day = parseInt(bar.getAttribute('data-day'));
        if (day === currentDay) {
            bar.classList.remove('bg-primary-container/20');
            bar.classList.add('bg-primary');
        } else {
            bar.classList.remove('bg-primary');
            bar.classList.add('bg-primary-container/20');
        }
    });

    labels.forEach(label => {
        const day = parseInt(label.getAttribute('data-day-label'));
        if (day === currentDay) {
            label.classList.add('text-primary', 'scale-125');
            label.classList.remove('text-slate-400');
        } else {
            label.classList.remove('text-primary', 'scale-125');
            label.classList.add('text-slate-400');
        }
    });
}

async function loadProducts(tenderoId) {
    const tbody = document.getElementById("inventory-table-body");
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-sm text-slate-500 py-6">Construyendo inventario mediante API...</td></tr>';
    
    try {
        const resp = await API.getProductosTendero(tenderoId);
        if (resp.status === 200) {
            const productos = resp.data;
            window.loadedProducts = productos; // Store globally for edit modal
            tbody.innerHTML = "";
            if(productos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center font-bold text-slate-400 py-12">No hay productos registrados aún. ¡Añade tu primero!</td></tr>';
                return;
            }

            productos.forEach(p => {
                let stockContent = `<span class="text-sm font-bold text-on-surface">${p.stock} Unidades</span>`;
                if(p.stock < 15) {
                    stockContent = `
                        <span class="text-sm font-bold text-error">${p.stock} (Bajo Stock)</span>
                        <div class="w-24 h-1.5 bg-surface-container mt-1 rounded-full overflow-hidden">
                            <div class="bg-error w-1/4 h-full"></div>
                        </div>`;
                } else {
                    stockContent = `
                        <span class="text-sm font-bold text-on-surface">${p.stock} Unidades</span>
                        <div class="w-24 h-1.5 bg-surface-container mt-1 rounded-full overflow-hidden">
                            <div class="bg-primary w-3/4 h-full"></div>
                        </div>`;
                }

                tbody.innerHTML += `
<tr class="hover:bg-surface-container-low/30 transition-colors group">
    <td class="px-8 py-6 font-mono text-xs text-on-surface-variant">#LM-${p.id || p.id_producto || 'XX'}</td>
    <td class="px-8 py-6">
        <div class="flex items-center gap-3">
            ${p.imagen_url ? `<img src="${window.API_URL}${p.imagen_url}" alt="${p.nombre}" class="w-10 h-10 rounded-lg object-cover bg-white shrink-0"/>` : `<div class="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-on-surface-variant text-sm">image</span></div>`}
            <div>
                <span class="font-bold text-on-surface block leading-tight">${p.nombre}</span>
                <span class="text-[10px] text-slate-400 uppercase">(${p.marca || 'S/M'})</span>
            </div>
        </div>
    </td>
    <td class="px-8 py-6">
        <span class="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold uppercase">${p.categoria}</span>
    </td>
    <td class="px-8 py-6 text-right font-bold text-on-surface">${Utils.formatCurrency(p.precio_venta)}</td>
    <td class="px-8 py-6 text-center">
        <div class="flex flex-col items-center">
            ${stockContent}
        </div>
    </td>
    <td class="px-8 py-6 text-center">
        <div class="relative flex justify-center">
            <button class="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant hover:bg-[#10b981]/10 hover:text-[#006c49] transition-all duration-300" onclick="toggleDropdown(event, ${p.id || p.id_producto})">
                <span class="material-symbols-outlined text-xl">more_vert</span>
            </button>
            
            <div id="dropdown-${p.id || p.id_producto}" class="hidden absolute right-14 top-2 mt-2 w-44 bg-surface-container-lowest/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-outline-variant/20 z-10 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-200">
                <button onclick="editProduct(${p.id || p.id_producto}, '${p.nombre.replace(/'/g, "\\'")}')" class="w-full text-left px-5 py-3 text-sm font-bold text-on-surface hover:bg-[#10b981]/10 hover:text-[#006c49] transition-colors flex items-center gap-3">
                    <span class="material-symbols-outlined text-[18px]">edit</span> Editar
                </button>
                <button onclick="deleteProduct(${p.id || p.id_producto})" class="w-full text-left px-5 py-3 text-sm font-bold text-error hover:bg-error/10 transition-colors flex items-center gap-3 border-t border-outline-variant/10">
                    <span class="material-symbols-outlined text-[18px]">delete</span> Borrar
                </button>
            </div>
        </div>
    </td>
</tr>`;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-error">Error cargando inventario SQL.</td></tr>';
        }
    } catch(e) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-error">Error global de servidor API.</td></tr>';
    }
}

async function loadReportes(tenderoId) {
    try {
        // Load KPIs
        const kpisResp = await API.getReportesKpis(tenderoId);
        if (kpisResp.status === 200) {
            const data = kpisResp.data || {};
            document.getElementById('kpi-ventas-hoy').textContent = Utils.formatCurrency(data.ventas_hoy || 0);
            document.getElementById('kpi-ventas-mes').textContent = Utils.formatCurrency(data.ventas_mes || 0);
            document.getElementById('kpi-productos-vendidos').textContent = data.total_productos || 0;
            document.getElementById('kpi-pedidos-totales').textContent = data.total_pedidos || 0;
        }

        // Load Top Products
        const topResp = await API.getReportesTopProductos(tenderoId);
        if (topResp.status === 200) {
            const topList = document.getElementById('top-products-list');
            topList.innerHTML = '';
            if (!topResp.data || topResp.data.length === 0) {
                topList.innerHTML = '<p class="text-sm text-slate-500 text-center py-4 font-medium">No hay ventas registradas aún.</p>';
            } else {
                topResp.data.forEach((p, index) => {
                    const imgUrl = p.imagen_url ? (p.imagen_url.startsWith('http') ? p.imagen_url : `${window.API_URL}${p.imagen_url}`) : 'https://placehold.co/400x300/e2e8f0/475569?text=Sin+Imagen';
                    topList.innerHTML += `
                    <div class="flex items-center justify-between group py-1">
                        <div class="flex items-center gap-4">
                            <div class="relative">
                                <img src="${imgUrl}" alt="${p.nombre}" class="w-12 h-12 rounded-xl object-cover bg-surface-container shadow-sm group-hover:shadow-md transition-all"/>
                                <div class="absolute -top-2 -right-2 w-6 h-6 bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                    #${index + 1}
                                </div>
                            </div>
                            <div>
                                <h4 class="font-bold text-sm text-on-surface leading-tight">${p.nombre}</h4>
                                <p class="text-xs text-slate-500 uppercase font-medium mt-0.5 tracking-wider">${p.categoria}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <span class="block font-black text-on-surface text-lg leading-tight">${p.cantidad_vendida}</span>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unidades</span>
                        </div>
                    </div>`;
                });
            }
        }

        // Load Stock Alerts
        const alertsResp = await API.getReportesAlertasStock(tenderoId);
        if (alertsResp.status === 200) {
            const alertsList = document.getElementById('stock-alerts-list');
            alertsList.innerHTML = '';
            if (!alertsResp.data || alertsResp.data.length === 0) {
                alertsList.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-slate-500 font-medium py-8">¡Todo en orden! No hay productos con stock bajo.</td></tr>';
            } else {
                alertsResp.data.forEach(p => {
                    const row = document.createElement('tr');
                    row.className = "hover:bg-surface-container-low/30 transition-colors group";
                    row.innerHTML = `
                        <td class="px-6 py-4">
                            <div>
                                <span class="font-bold text-on-surface block text-sm">${p.nombre}</span>
                                <span class="text-[10px] text-slate-400 uppercase tracking-wider">${p.marca || 'S/M'}</span>
                            </div>
                        </td>
                        <td class="px-6 py-4">
                            <span class="px-3 py-1 bg-surface-container-low text-on-surface-variant rounded-full text-[10px] font-bold uppercase tracking-wider">${p.categoria}</span>
                        </td>
                        <td class="px-6 py-4 text-center">
                            <span class="font-black text-lg ${p.stock <= 5 ? 'text-error' : 'text-orange-500'}">${p.stock}</span>
                        </td>
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-1.5 ${p.stock <= 5 ? 'text-error' : 'text-orange-500'}">
                                <span class="material-symbols-outlined text-[16px]" data-icon="error">error</span>
                                <span class="text-[10px] font-bold uppercase tracking-wider mt-0.5">${p.stock <= 5 ? 'Crítico' : 'Atención'}</span>
                            </div>
                        </td>
                        <td class="px-6 py-4 text-right">
                            <button class="text-primary text-[10px] font-bold uppercase tracking-widest hover:underline" onclick="document.getElementById('nav-inventario').click()">
                                Reabastecer
                            </button>
                        </td>
                    `;
                    alertsList.appendChild(row);
                });
            }
        }

        // Load Chart Data
        const chartResp = await API.getReportesGrafico(tenderoId);
        if (chartResp.status === 200) {
            updateChartUI(chartResp.data);
        }

        // Inicializar en dashboard
        switchTabTo(navDashboard, vistaDashboard);
    } catch (e) {
        console.error("Error cargando reportes:", e);
    }
}

function updateChartUI(chartData) {
    chartData = chartData || []; 
    const totalsByDay = {};
    let maxTotal = 0;
    
    chartData.forEach(row => {
        let day = parseInt(row.dia_semana);
        if (day === 7) day = 0; // Convert Sunday from 7 to 0
        
        const total = parseFloat(row.total_recaudado) || 0;
        totalsByDay[day] = total;
        if (total > maxTotal) maxTotal = total;
    });

    if (maxTotal === 0) maxTotal = 1; 

    const bars = document.querySelectorAll('.chart-bar');
    bars.forEach(bar => {
        const day = parseInt(bar.getAttribute('data-day'));
        const dayTotal = totalsByDay[day] || 0;
        let heightPct = 0;
        
        if (dayTotal > 0) {
            heightPct = (dayTotal / maxTotal) * 100;
            if (heightPct < 5) heightPct = 5; 
        }
        
        bar.style.height = `${heightPct}%`;
        bar.title = `Total: ${Utils.formatCurrency(dayTotal)}`; 
    });
}

// --- MI TIENDA STOREFRONT LOGIC ---
let storefrontProducts = [];
let storefrontOffers = [];

function getActiveStorefrontOffer(productId) {
    if (!storefrontOffers || storefrontOffers.length === 0) return null;
    const offer = storefrontOffers.find(o => o.id_producto === productId);
    if (!offer) return null;

    // Validar expiración automática con la hora local
    const dateStr = offer.vigencia_fecha.split('T')[0];
    const timeStr = offer.vigencia_hora;
    const expDate = new Date(`${dateStr}T${timeStr}`);
    const now = new Date();

    if (now > expDate) {
        return null; // Expirada automáticamente
    }
    return offer;
}

async function loadStorefront(tenderoId) {
    const grid = document.getElementById("storefront-grid");
    grid.innerHTML = '<div class="col-span-full text-center py-12"><p class="text-slate-500 font-bold">Cargando vitrina...</p></div>';
    
    try {
        try {
            storefrontOffers = await API.getVitrina(tenderoId);
        } catch (err) {
            console.error("Error loading offers for storefront preview:", err);
            storefrontOffers = [];
        }

        const resp = await API.getProductosTendero(tenderoId);
        if (resp.status === 200) {
            storefrontProducts = resp.data;
            renderStorefrontGrid(storefrontProducts);
            setupStorefrontFilters();
        } else {
            grid.innerHTML = '<div class="col-span-full text-center py-12 text-error font-bold">Error cargando productos.</div>';
        }
    } catch(e) {
        grid.innerHTML = '<div class="col-span-full text-center py-12 text-error font-bold">Error de conexión.</div>';
    }
}

function renderStorefrontGrid(products) {
    const grid = document.getElementById("storefront-grid");
    grid.innerHTML = "";
    
    // Update product metric
    const metricProductos = document.getElementById("tienda-metric-productos");
    if(metricProductos) metricProductos.textContent = products.length;
    
    if(products.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-12 text-slate-500 font-medium">No hay productos disponibles.</div>';
        return;
    }

    products.forEach(p => {
        const idProd = p.id || p.id_producto;
        const imgUrl = p.imagen_url ? (p.imagen_url.startsWith('http') ? p.imagen_url : `${window.API_URL}${p.imagen_url}`) : 'https://placehold.co/400x400/e2e8f0/475569?text=Producto';
        
        const activeOffer = getActiveStorefrontOffer(idProd);
        
        let priceHTML = '';
        let discountBadge = '';
        if (activeOffer) {
            const original = parseFloat(p.precio_venta);
            const promo = parseFloat(activeOffer.precio_oferta);
            const descuentoPct = Math.round(((original - promo) / original) * 100);
            
            priceHTML = `
                <div class="flex items-baseline gap-2 mt-auto">
                    <span class="text-xs text-slate-400 line-through">${Utils.formatCurrency(original)}</span>
                    <span class="text-sm font-black text-emerald-600 tracking-tight">${Utils.formatCurrency(promo)}</span>
                </div>
            `;
            discountBadge = `
                <span class="absolute top-3 right-3 bg-red-600 text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded shadow-sm z-10">
                    -${descuentoPct}% OFF
                </span>
            `;
        } else {
            priceHTML = `
                <div class="mt-auto">
                    <span class="text-lg font-black text-emerald-600 tracking-tight">${Utils.formatCurrency(p.precio_venta)}</span>
                </div>
            `;
        }

        const card = document.createElement('div');
        card.className = "bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-outline-variant/10 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col relative";
        card.setAttribute('data-id', idProd);
        card.innerHTML = `
            <div class="aspect-square bg-surface-container overflow-hidden relative">
                <img src="${imgUrl}" alt="${p.nombre}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
                
                <div class="absolute top-3 left-3">
                    <span class="px-2.5 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider rounded-lg">${p.categoria}</span>
                </div>

                ${discountBadge}

                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>

                <button class="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-emerald-600 text-white opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 hover:bg-emerald-500 hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center shadow-lg shadow-emerald-600/30 z-10" title="Agregar al carrito">
                    <span class="material-symbols-outlined text-[22px]">add</span>
                </button>
            </div>
            <div class="p-4 flex flex-col flex-1">
                <div class="flex justify-between items-start gap-2 mb-1">
                    <h3 class="font-black text-on-surface text-base leading-tight line-clamp-2">${p.nombre}</h3>
                    <button class="text-slate-400 hover:text-red-500 transition-colors">
                        <span class="material-symbols-outlined text-[20px]">favorite_border</span>
                    </button>
                </div>
                <span class="text-xs text-slate-400 font-semibold mb-3">${p.marca || 'Sin marca'}</span>
                
                ${priceHTML}
            </div>
        `;
        grid.appendChild(card);
    });
}

function setupStorefrontFilters() {
    const searchInput = document.getElementById("storefront-search");
    const categoryBtns = document.querySelectorAll(".storefront-cat-btn");
    
    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        const activeBtn = document.querySelector(".storefront-cat-btn.active");
        const category = activeBtn ? activeBtn.getAttribute("data-cat") : "all";
        
        const filtered = storefrontProducts.filter(p => {
            const matchesSearch = p.nombre.toLowerCase().includes(searchTerm) || (p.marca && p.marca.toLowerCase().includes(searchTerm));
            const matchesCategory = category === "all" || p.categoria.toLowerCase() === category;
            return matchesSearch && matchesCategory;
        });
        
        renderStorefrontGrid(filtered);
    }
    
    searchInput.addEventListener("input", applyFilters);
    
    categoryBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            categoryBtns.forEach(b => {
                b.classList.remove("active", "bg-emerald-600", "text-white", "shadow-emerald-600/20");
                b.classList.add("bg-surface-container", "text-on-surface-variant");
            });
            
            btn.classList.add("active", "bg-emerald-600", "text-white", "shadow-emerald-600/20");
            btn.classList.remove("bg-surface-container", "text-on-surface-variant");
            
            applyFilters();
        });
    });
}

// --- DASHBOARD LOGIC ---
async function loadDashboard(tenderoId) {
    const resp = await API.getDashboardData(tenderoId);
    if (resp.status === 200 && resp.data && resp.data.data) {
        const { ingresos_hoy, ingresos_efectivo, ingresos_transferencia, facturas_hoy, clientes_hoy, alertas_stock, top_productos } = resp.data.data;
        
        // Actualizar KPIs
        const elIngresos = document.getElementById('dash-ingresos-hoy');
        const elEfectivo = document.getElementById('dash-efectivo-hoy');
        const elTransferencia = document.getElementById('dash-transferencia-hoy');
        const elFacturas = document.getElementById('dash-facturas-hoy');
        const elClientes = document.getElementById('dash-clientes-hoy');
        
        if (elIngresos) elIngresos.textContent = Utils.formatCurrency(ingresos_hoy || 0);
        if (elEfectivo) elEfectivo.textContent = Utils.formatCurrency(ingresos_efectivo || 0);
        if (elTransferencia) elTransferencia.textContent = Utils.formatCurrency(ingresos_transferencia || 0);
        if (elFacturas) elFacturas.textContent = facturas_hoy;
        if (elClientes) elClientes.textContent = clientes_hoy;
        
        // Actualizar tabla de Alertas de Stock
        const tbodyStock = document.getElementById('dash-alertas-stock');
        if (tbodyStock) {
            tbodyStock.innerHTML = '';
            if (alertas_stock.length === 0) {
                tbodyStock.innerHTML = '<tr><td colspan="3" class="px-6 py-4 text-center text-slate-500 font-medium">No hay productos con stock crítico.</td></tr>';
            } else {
                alertas_stock.forEach(prod => {
                    const statusClass = prod.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700';
                    const statusText = prod.stock === 0 ? 'Agotado' : 'Crítico';
                    
                    const tr = document.createElement('tr');
                    tr.className = 'hover:bg-surface-container/50 transition-colors';
                    tr.innerHTML = `
                        <td class="px-6 py-4">
                            <span class="font-bold text-on-surface">${prod.nombre}</span>
                        </td>
                        <td class="px-6 py-4">
                            <span class="text-sm font-bold text-slate-600">${prod.stock} unid.</span>
                        </td>
                        <td class="px-6 py-4">
                            <span class="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-lg ${statusClass}">${statusText}</span>
                        </td>
                    `;
                    tbodyStock.appendChild(tr);
                });
            }
        }

        // Actualizar Top 3 Productos
        const containerTop = document.getElementById('dash-top-productos');
        if (containerTop) {
            containerTop.innerHTML = '';
            if (!top_productos || top_productos.length === 0) {
                containerTop.innerHTML = '<div class="text-center py-8 text-slate-500 font-medium">Aún no hay ventas registradas hoy.</div>';
            } else {
                top_productos.forEach((prod, index) => {
                    const fullImgUrl = prod.imagen_url ? (prod.imagen_url.startsWith('http') ? prod.imagen_url : `${window.API_URL}${prod.imagen_url}`) : 'img/default-product.png';
                    
                    let medalIcon = '';
                    let medalColor = '';
                    if (index === 0) { medalIcon = 'workspace_premium'; medalColor = 'text-amber-500'; }
                    else if (index === 1) { medalIcon = 'military_tech'; medalColor = 'text-slate-400'; }
                    else if (index === 2) { medalIcon = 'military_tech'; medalColor = 'text-amber-700'; }

                    containerTop.innerHTML += `
                        <div class="flex items-center gap-4 bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/10 shadow-sm hover:shadow-md transition-shadow">
                            <div class="relative w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center overflow-hidden shrink-0">
                                <img src="${fullImgUrl}" class="object-cover w-full h-full" alt="${prod.nombre}" onerror="this.src='img/default-product.png'">
                            </div>
                            <div class="flex-1 min-w-0">
                                <h4 class="font-bold text-on-surface truncate text-sm">${prod.nombre}</h4>
                                <p class="text-xs text-slate-500 truncate">${prod.categoria || 'Sin categoría'}</p>
                            </div>
                            <div class="flex flex-col items-end shrink-0">
                                <div class="flex items-center gap-1">
                                    <span class="material-symbols-outlined text-[20px] ${medalColor}">${medalIcon}</span>
                                </div>
                                <span class="text-xs font-black text-slate-700 mt-1">${prod.total_vendido} vendidos</span>
                            </div>
                        </div>
                    `;
                });
            }
        }
    }
}

// --- MAPA PICKER CONFIGURACIÓN (Leaflet) ---
let configMap = null;
let configMarker = null;

function initConfigMap() {
    if (configMap) {
        setTimeout(() => {
            configMap.invalidateSize();
            updateConfigMapMarker(window.currentStoreLat, window.currentStoreLng);
        }, 350);
        return;
    }

    setTimeout(() => {
        const initialLat = parseFloat(window.currentStoreLat) || 7.8939;
        const initialLng = parseFloat(window.currentStoreLng) || -72.5078;
        
        configMap = L.map('mapa-configuracion').setView([initialLat, initialLng], 14);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(configMap);

        if (window.currentStoreLat && window.currentStoreLng) {
            configMarker = L.marker([initialLat, initialLng], { draggable: true }).addTo(configMap);
            setupMarkerEvents(configMarker);
        }

        configMap.on('click', function(e) {
            const { lat, lng } = e.latlng;
            const inputLat = document.getElementById("input-latitud-tienda");
            const inputLng = document.getElementById("input-longitud-tienda");
            if (inputLat) inputLat.value = lat.toFixed(6);
            if (inputLng) inputLng.value = lng.toFixed(6);
            
            if (configMarker) {
                configMarker.setLatLng(e.latlng);
            } else {
                configMarker = L.marker(e.latlng, { draggable: true }).addTo(configMap);
                setupMarkerEvents(configMarker);
            }
        });

        // Sincronizar inputs manuales
        const inputLat = document.getElementById("input-latitud-tienda");
        const inputLng = document.getElementById("input-longitud-tienda");
        if (inputLat && inputLng) {
            inputLat.addEventListener("input", syncManualCoordinates);
            inputLng.addEventListener("input", syncManualCoordinates);
        }
    }, 350);
}

function setupMarkerEvents(marker) {
    marker.on('dragend', function(e) {
        const position = marker.getLatLng();
        const inputLat = document.getElementById("input-latitud-tienda");
        const inputLng = document.getElementById("input-longitud-tienda");
        if (inputLat) inputLat.value = position.lat.toFixed(6);
        if (inputLng) inputLng.value = position.lng.toFixed(6);
    });
}

function updateConfigMapMarker(lat, lng) {
    if (!configMap) return;
    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);
    
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        const latlng = [parsedLat, parsedLng];
        configMap.setView(latlng, 14);
        if (configMarker) {
            configMarker.setLatLng(latlng);
        } else {
            configMarker = L.marker(latlng, { draggable: true }).addTo(configMap);
            setupMarkerEvents(configMarker);
        }
    } else {
        if (configMarker) {
            configMap.removeLayer(configMarker);
            configMarker = null;
        }
    }
}

function syncManualCoordinates() {
    const lat = document.getElementById("input-latitud-tienda").value;
    const lng = document.getElementById("input-longitud-tienda").value;
    updateConfigMapMarker(lat, lng);
}

// --- PERFIL DE LA TIENDA Y CONFIGURACIÓN ---
window.fetchStoreProfile = async function() {
    const tenderoId = localStorage.getItem("userId");
    if (!tenderoId) return;

    try {
        const resp = await API.getStoreSettings(tenderoId);
        if (resp.status === 200 && resp.data && resp.data.data) {
            const storeData = resp.data.data;
            
            const inputNombre = document.getElementById("input-nombre-tienda");
            const inputDueno = document.getElementById("input-dueno-tienda");
            const inputDesc = document.getElementById("input-descripcion-tienda");
            const inputUbicacion = document.getElementById("input-ubicacion-tienda");
            const inputWhatsapp = document.getElementById("input-whatsapp-tienda");
            const inputLat = document.getElementById("input-latitud-tienda");
            const inputLng = document.getElementById("input-longitud-tienda");

            if(inputNombre) inputNombre.value = storeData.nombre_tienda || '';
            if(inputDueno) inputDueno.value = storeData.nombre || '';
            if(inputDesc) inputDesc.value = storeData.descripcion || '';
            if(inputUbicacion) inputUbicacion.value = storeData.ubicacion || '';
            if(inputWhatsapp) inputWhatsapp.value = storeData.whatsapp || '';
            if(inputLat) inputLat.value = storeData.latitud || '';
            if(inputLng) inputLng.value = storeData.longitud || '';
            
            // Guardar variables globales para la inicialización del mapa
            window.currentStoreLat = storeData.latitud;
            window.currentStoreLng = storeData.longitud;
            updateConfigMapMarker(storeData.latitud, storeData.longitud);

            updateStoreDOM(storeData);
        }
    } catch (error) {
        console.error("Error fetching store profile:", error);
    }
};

// Alias para compatibilidad
window.loadStoreSettings = async function(tenderoId) {
    await window.fetchStoreProfile();
};

function updateStoreDOM(settings) {
    // 1. Nombre de la tienda
    const nombreTienda = settings.nombre_tienda || 'Mi Tienda';
    document.querySelectorAll('.nombre-tienda-dinamico').forEach(el => el.textContent = nombreTienda);

    // 2. Nombre del dueño (tendero)
    const nombreDueno = settings.nombre || 'Dueño de Tienda';
    const tenderoNameEl = document.getElementById("tendero-name");
    if (tenderoNameEl) tenderoNameEl.textContent = nombreDueno;
    localStorage.setItem("userName", nombreDueno);
    document.querySelectorAll('.dueno-tienda-dinamico').forEach(el => el.textContent = nombreDueno);

    // 3. Descripción / Bio / Lema
    const descripcion = settings.descripcion || 'Todo lo que necesitas, a la vuelta de tu casa.';
    document.querySelectorAll('.bio-tienda-dinamico').forEach(el => el.textContent = descripcion);

    // 4. Ubicación / Dirección
    const ubicacion = settings.ubicacion || 'Sin ubicación registrada';
    document.querySelectorAll('.ubicacion-tienda-dinamico').forEach(el => el.textContent = ubicacion);

    // 5. Logo de la tienda
    if (settings.logo_url) {
        const fullUrl = settings.logo_url.startsWith('http') ? settings.logo_url : `${window.API_URL}${settings.logo_url}`;
        document.querySelectorAll('.logo-tienda-dinamico').forEach(el => el.src = fullUrl);
        const preview = document.getElementById("preview-store-logo");
        if (preview) {
            preview.src = fullUrl;
            preview.classList.remove("hidden");
        }
    }

    // 6. Contador Clientes
    if (settings.totalClientes !== undefined) {
        const clientMetric = document.getElementById("contador-clientes-real");
        if (clientMetric) clientMetric.textContent = settings.totalClientes;
        const clientSettingsMetric = document.getElementById("contador-clientes-settings");
        if (clientSettingsMetric) clientSettingsMetric.textContent = settings.totalClientes;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const btnEditStore = document.getElementById("btn-edit-store");
    const btnCloseStoreSettings = document.getElementById("btn-close-store-settings");
    const storeSettingsPanel = document.getElementById("store-settings-panel");
    const storeSettingsOverlay = document.getElementById("store-settings-overlay");
    const btnSaveStoreSettings = document.getElementById("btn-save-store-settings");

    function toggleStoreSettings() {
        if (!storeSettingsPanel || !storeSettingsOverlay) return;
        
        const isOpen = !storeSettingsPanel.classList.contains("translate-x-full");
        
        if (isOpen) {
            storeSettingsPanel.classList.add("translate-x-full");
            storeSettingsOverlay.classList.remove("opacity-100");
            storeSettingsOverlay.classList.add("opacity-0");
            setTimeout(() => {
                storeSettingsOverlay.classList.add("hidden");
            }, 300);
        } else {
            storeSettingsOverlay.classList.remove("hidden");
            setTimeout(() => {
                storeSettingsOverlay.classList.remove("opacity-0");
                storeSettingsOverlay.classList.add("opacity-100");
                storeSettingsPanel.classList.remove("translate-x-full");
                // Inicializar mapa selector al abrir configuración
                initConfigMap();
            }, 10);
        }
    }

    async function saveStoreSettings() {
        const tenderoId = localStorage.getItem("userId");
        if (!tenderoId) return;

        const originalText = btnSaveStoreSettings.innerHTML;
        btnSaveStoreSettings.innerHTML = '<span class="material-symbols-outlined animate-spin text-[18px]">sync</span> Guardando...';
        btnSaveStoreSettings.disabled = true;

        const fileInput = document.getElementById("input-logo-tienda");
        const formData = new FormData();
        formData.append("nombre_tienda", document.getElementById("input-nombre-tienda").value);
        formData.append("nombre", document.getElementById("input-dueno-tienda").value);
        formData.append("descripcion", document.getElementById("input-descripcion-tienda").value);
        formData.append("ubicacion", document.getElementById("input-ubicacion-tienda").value);
        
        const rawWhatsapp = document.getElementById("input-whatsapp-tienda") ? document.getElementById("input-whatsapp-tienda").value : "";
        const cleanWhatsapp = rawWhatsapp.replace(/\D/g, "");
        formData.append("whatsapp", cleanWhatsapp);
        
        const latVal = document.getElementById("input-latitud-tienda").value;
        const lngVal = document.getElementById("input-longitud-tienda").value;
        formData.append("latitud", latVal);
        formData.append("longitud", lngVal);
        
        if (fileInput.files[0]) {
            formData.append("logo", fileInput.files[0]);
        }

        const resp = await API.updateStoreSettings(tenderoId, formData);
        
        btnSaveStoreSettings.innerHTML = originalText;
        btnSaveStoreSettings.disabled = false;

        if (resp.status === 200 && resp.data && resp.data.success) {
            updateStoreDOM(resp.data.data);
            toggleStoreSettings();
            alert('Configuración actualizada correctamente');
        } else {
            alert('Error al guardar configuración');
        }
    }

    // Image preview logic
    const fileInput = document.getElementById("input-logo-tienda");
    if (fileInput) {
        fileInput.addEventListener("change", function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const preview = document.getElementById("preview-store-logo");
                    preview.src = e.target.result;
                    preview.classList.remove("hidden");
                }
                reader.readAsDataURL(this.files[0]);
            }
        });
    }

    if (btnEditStore) btnEditStore.addEventListener("click", toggleStoreSettings);
    if (btnCloseStoreSettings) btnCloseStoreSettings.addEventListener("click", toggleStoreSettings);
    if (storeSettingsOverlay) storeSettingsOverlay.addEventListener("click", toggleStoreSettings);
    if (btnSaveStoreSettings) btnSaveStoreSettings.addEventListener("click", saveStoreSettings);

    // PDF Download Logic
    const btnDownloadPdf = document.getElementById("btn-download-pdf");
    if (btnDownloadPdf) {
        btnDownloadPdf.addEventListener("click", () => {
            const reportsContainer = document.getElementById("vista-reportes");
            if (!reportsContainer) return;
            
            const originalText = btnDownloadPdf.innerHTML;
            btnDownloadPdf.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm" style="animation: spin 1s linear infinite;">sync</span> Generando...';
            btnDownloadPdf.disabled = true;

            const dateStr = new Date().toISOString().split('T')[0];
            const opt = {
                margin:       [0.5, 0.5, 0.5, 0.5],
                filename:     `Reporte_Semanal_DavenStore_${dateStr}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#f8f9fa' },
                jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
            };

            html2pdf().set(opt).from(reportsContainer).save().then(() => {
                btnDownloadPdf.innerHTML = originalText;
                btnDownloadPdf.disabled = false;
            }).catch(err => {
                console.error("Error generando PDF", err);
                btnDownloadPdf.innerHTML = originalText;
                btnDownloadPdf.disabled = false;
                alert("Ocurrió un error al generar el PDF.");
            });
        });
    }

    // Inventory Search Logic
    const inputBusquedaInventario = document.getElementById("input-busqueda-inventario");
    const btnActualizarTabla = document.getElementById("btn-actualizar-tabla");
    const tablaInventarioBody = document.getElementById("inventory-table-body");

    if (inputBusquedaInventario && tablaInventarioBody) {
        inputBusquedaInventario.addEventListener("input", (e) => {
            const term = e.target.value.toLowerCase().trim();
            const rows = tablaInventarioBody.querySelectorAll("tr");
            
            rows.forEach(row => {
                if (row.children.length > 1) { // Skip empty states if any
                    // Assuming columns: 0: ID, 1: Nombre, 2: Categoría, 3: Precio, 4: Stock, 5: Acciones
                    // Let's just combine the text content of the whole row for robust filtering
                    const rowText = row.textContent.toLowerCase();
                    
                    if (rowText.includes(term)) {
                        row.style.display = "";
                    } else {
                        row.style.display = "none";
                    }
                }
            });
        });
    }

    if (btnActualizarTabla) {
        btnActualizarTabla.addEventListener("click", () => {
            const userId = localStorage.getItem("userId");
            if (inputBusquedaInventario) inputBusquedaInventario.value = '';
            if (userId) loadProducts(userId);
        });
    }

    // --- CONFIGURATION LOGIC ---
    const formCambioPassword = document.getElementById("form-cambio-password");
    if (formCambioPassword) {
        formCambioPassword.addEventListener("submit", (e) => {
            e.preventDefault();
            console.log("Cambio de contraseña solicitado");
            // Implementar lógica de API aquí
        });
    }

    const btnSaveBilling = document.getElementById("btn-save-billing");
    if (btnSaveBilling) {
        btnSaveBilling.addEventListener("click", () => {
            console.log("Guardando ajustes de facturación");
            // Implementar lógica de API aquí
        });
    }

    const btnExportBackup = document.getElementById("btn-export-backup");
    if (btnExportBackup) {
        btnExportBackup.addEventListener("click", () => {
            console.log("Exportando base de datos");
            // Implementar lógica de API aquí
        });
    }
});

// ==========================================
// --- LÓGICA DE VITRINA DIGITAL ---
// ==========================================
let currentOffersCount = 0;

    async function loadVitrinaManager(tenderoId) {
        const selectProducto = document.getElementById("vitrina-select-producto");
        const grid = document.getElementById("vitrina-activa-grid");
        const contador = document.getElementById("vitrina-contador-ofertas");

        if (!selectProducto || !grid) return;

        // 1. Cargar productos en el dropdown
        selectProducto.innerHTML = '<option value="">Cargando productos...</option>';
        let products = [];
        try {
            const resp = await API.getProductosTendero(tenderoId);
            if (resp.status === 200) {
                products = resp.data;
                selectProducto.innerHTML = '<option value="">Selecciona un producto...</option>';
                products.forEach(p => {
                    const opt = document.createElement("option");
                    opt.value = p.id_producto;
                    opt.textContent = `${p.nombre} (${p.marca || 'Sin marca'}) - Regular: ${Utils.formatCurrency(p.precio_venta)}`;
                    selectProducto.appendChild(opt);
                });
            } else {
                selectProducto.innerHTML = '<option value="">Error al cargar productos</option>';
            }
        } catch (e) {
            console.error("Error al cargar productos en vitrina:", e);
            selectProducto.innerHTML = '<option value="">Error de conexión</option>';
        }

        // 2. Cargar ofertas actuales
        let ofertas = [];
        try {
            ofertas = await API.getVitrina(tenderoId);
            currentOffersCount = ofertas.length;
            if (contador) {
                contador.textContent = `Ofertas: ${currentOffersCount} / 5`;
                if (currentOffersCount >= 5) {
                    contador.className = "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 font-extrabold px-3 py-1.5 rounded-full text-xs border border-red-100/50 animate-pulse";
                } else {
                    contador.className = "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold px-3 py-1.5 rounded-full text-xs border border-emerald-100/50";
                }
            }

            renderVitrinaGrid(ofertas, tenderoId);
        } catch (e) {
            console.error("Error al cargar ofertas:", e);
            grid.innerHTML = '<div class="col-span-full text-center py-12 text-red-500 font-bold">Error de conexión al cargar ofertas.</div>';
        }

        // 3. Clonar y re-enlazar botón guardar para evitar múltiples binds
        const btnGuardar = document.getElementById("vitrina-btn-guardar");
        if (btnGuardar) {
            const newBtnGuardar = btnGuardar.cloneNode(true);
            btnGuardar.parentNode.replaceChild(newBtnGuardar, btnGuardar);
            
            newBtnGuardar.addEventListener("click", async () => {
                const idProducto = selectProducto.value;
                const precioOferta = document.getElementById("vitrina-input-precio").value;
                const hora = document.getElementById("vitrina-input-hora").value;
                const fecha = document.getElementById("vitrina-input-fecha").value;

                if (!idProducto || !precioOferta || !hora || !fecha) {
                    Utils.showAlert("Todos los campos son obligatorios.");
                    return;
                }

                if (currentOffersCount >= 5) {
                    Utils.showAlert("Límite alcanzado. Debes eliminar una oferta existente para habilitar un nuevo espacio.");
                    return;
                }

                // Validar precio de oferta menor
                const selectedProd = products.find(p => p.id_producto == idProducto);
                if (selectedProd) {
                    const originalPrice = parseFloat(selectedProd.precio_venta);
                    const offerPrice = parseFloat(precioOferta);
                    if (offerPrice >= originalPrice) {
                        Utils.showAlert(`El precio de oferta debe ser estrictamente menor al precio regular del producto (${Utils.formatCurrency(originalPrice)}).`);
                        return;
                    }
                }

                // Payload
                const payload = {
                    id_tendero: parseInt(tenderoId, 10),
                    id_producto: parseInt(idProducto, 10),
                    precio_oferta: parseFloat(precioOferta),
                    vigencia_fecha: fecha,
                    vigencia_hora: hora
                };

                const saveResp = await API.saveOferta(payload);
                if (saveResp.status === 200) {
                    Utils.showAlert("¡Oferta guardada correctamente y publicada en tu vitrina!");
                    document.getElementById("form-vitrina-oferta").reset();
                    loadVitrinaManager(tenderoId);
                } else {
                    Utils.showAlert(saveResp.data.error || "Error al publicar la oferta.");
                }
            });
        }
    }

    function renderVitrinaGrid(ofertasList, tenderoId) {
        const grid = document.getElementById("vitrina-activa-grid");
        if (!grid) return;

        grid.innerHTML = "";

        if (ofertasList.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full py-12 text-center text-slate-400 bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-slate-200">
                    <span class="material-symbols-outlined text-4xl mb-2 text-slate-300">campaign</span>
                    <p class="text-xs font-semibold">No tienes ofertas programadas en este momento.</p>
                </div>
            `;
            return;
        }

        ofertasList.forEach(o => {
            const card = document.createElement("div");
            card.className = "group bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col";
            
            const imgUrl = o.imagen_url 
                ? (o.imagen_url.startsWith('http') ? o.imagen_url : `${window.API_URL}${o.imagen_url}`) 
                : 'https://placehold.co/300x300/e2e8f0/475569?text=Sin+Imagen';

            // Formatear fecha de vigencia a algo legible (dd/mm/aaaa)
            let fechaLegible = o.vigencia_fecha;
            if (o.vigencia_fecha) {
                const dateParts = o.vigencia_fecha.split('T')[0].split('-');
                if (dateParts.length === 3) {
                    fechaLegible = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
                }
            }

            const horaLegible = o.vigencia_hora ? o.vigencia_hora.substring(0, 5) : '';

            // Calcular porcentaje de descuento
            const original = parseFloat(o.precio_venta);
            const promo = parseFloat(o.precio_oferta);
            const descuentoPct = Math.round(((original - promo) / original) * 100);

            card.innerHTML = `
                <!-- Image & Discount Badge -->
                <div class="aspect-video w-full bg-slate-50 relative overflow-hidden flex items-center justify-center border-b border-slate-100 dark:border-slate-800">
                    <img src="${imgUrl}" class="object-cover w-full h-full group-hover:scale-102 transition-transform duration-500" alt="${o.nombre}">
                    <span class="absolute top-3 left-3 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-sm">
                        -${descuentoPct}% OFF
                    </span>
                    <span class="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-[8px] font-bold text-slate-700 px-2 py-1 rounded border border-slate-100 flex items-center gap-0.5">
                        <span class="material-symbols-outlined text-[10px] text-emerald-600">schedule</span>
                        Expira: ${fechaLegible} ${horaLegible}
                    </span>
                </div>
                
                <!-- Details -->
                <div class="p-4 flex-grow flex flex-col justify-between">
                    <div>
                        <span class="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">${o.marca || 'Genérico'}</span>
                        <h4 class="font-bold text-xs text-slate-800 dark:text-slate-100 tracking-tight mt-0.5 truncate">${o.nombre}</h4>
                        
                        <div class="mt-2.5 flex items-baseline gap-2">
                            <span class="text-xs text-slate-400 line-through">${Utils.formatCurrency(o.precio_venta)}</span>
                            <span class="text-sm font-extrabold text-emerald-600">${Utils.formatCurrency(o.precio_oferta)}</span>
                        </div>
                    </div>

                    <!-- Delete Button -->
                    <button class="mt-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-xl font-bold text-[11px] transition-all flex items-center justify-center gap-1 w-full" onclick="event.stopPropagation();">
                        <span class="material-symbols-outlined text-sm">delete</span>
                        Eliminar Oferta
                    </button>
                </div>
            `;

            const btnEliminar = card.querySelector("button");
            btnEliminar.addEventListener("click", async () => {
                if (!confirm(`¿Estás seguro de que deseas eliminar la oferta para "${o.nombre}" de la vitrina digital?`)) return;
                const delResp = await API.deleteOferta(o.id_oferta);
                if (delResp.status === 200) {
                    Utils.showAlert("Oferta eliminada correctamente.");
                    loadVitrinaManager(tenderoId);
                } else {
                    Utils.showAlert("Error al eliminar la oferta.");
                }
            });

            grid.appendChild(card);
        });
    }
