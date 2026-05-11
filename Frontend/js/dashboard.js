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

    // Tab Navigation Logic
    const navInventario = document.getElementById("nav-inventario");
    const navReportes = document.getElementById("nav-reportes");
    const navVentas = document.getElementById("nav-ventas");
    const vistaInventario = document.getElementById("vista-inventario");
    const vistaReportes = document.getElementById("vista-reportes");
    const vistaVentas = document.getElementById("vista-ventas");

    const activeClasses = ['text-[#006c49]', 'dark:text-[#10b981]', 'font-bold', 'border-r-4', 'border-[#006c49]', 'dark:border-[#10b981]', 'bg-[#10b981]/5', 'translate-x-1'];
    const inactiveClasses = ['text-[#3c4a42]', 'dark:text-gray-500'];

    function switchTabTo(activeNav, activeView) {
        const allNavs = [navInventario, navReportes, navVentas];
        const allViews = [vistaInventario, vistaReportes, vistaVentas];

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

    if (navInventario && navReportes && navVentas) {
        navInventario.addEventListener("click", () => switchTabTo(navInventario, vistaInventario));
        navReportes.addEventListener("click", () => {
            switchTabTo(navReportes, vistaReportes);
            loadReportes(userId);
        });
        navVentas.addEventListener("click", () => switchTabTo(navVentas, vistaVentas));
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
            ${p.imagen_url ? `<img src="http://localhost:3000${p.imagen_url}" alt="${p.nombre}" class="w-10 h-10 rounded-lg object-cover bg-white shrink-0"/>` : `<div class="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-on-surface-variant text-sm">image</span></div>`}
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
                    const imgUrl = p.imagen_url ? (p.imagen_url.startsWith('http') ? p.imagen_url : `http://localhost:3000${p.imagen_url}`) : 'https://placehold.co/400x300/e2e8f0/475569?text=Sin+Imagen';
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
            const chartData = chartResp.data || []; 
            const totalsByDay = {};
            let maxTotal = 0;
            
            chartData.forEach(row => {
                let day = parseInt(row.dia_semana);
                if (day === 7) day = 0; // Convert Sunday from 7 to 0 (JS standard for our HTML data-day)
                
                const total = parseFloat(row.total_recaudado) || 0;
                totalsByDay[day] = total;
                if (total > maxTotal) maxTotal = total;
            });

            if (maxTotal === 0) maxTotal = 1; // Prevent division by zero

            const bars = document.querySelectorAll('.chart-bar');
            bars.forEach(bar => {
                const day = parseInt(bar.getAttribute('data-day'));
                const dayTotal = totalsByDay[day] || 0;
                let heightPct = 0;
                
                if (dayTotal > 0) {
                    heightPct = (dayTotal / maxTotal) * 100;
                    if (heightPct < 5) heightPct = 5; // Minimum visible height if there are sales
                }
                
                bar.style.height = `${heightPct}%`;
                bar.title = `Total: ${Utils.formatCurrency(dayTotal)}`; 
            });
        }
    } catch (e) {
        console.error("Error cargando reportes:", e);
    }
}
