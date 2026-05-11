// js/pos.js

let products = [];
let cart = [];
let categoriaActual = 'Todos';
let textoBusqueda = '';
let clienteActual = 1;

document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');

    if (!userId || userRole !== 'merchant') {
        alert('Acceso denegado. Solo para tenderos.');
        window.location.href = 'login.html';
        return;
    }

    loadPosProducts(userId);
    setupEventListeners();
});

function setupEventListeners() {
    let btnClearCart = document.getElementById('btn-clear-cart');
    if (!btnClearCart) {
        const sweepIcon = document.querySelector('.delete_sweep');
        if (sweepIcon) btnClearCart = sweepIcon.closest('button');
    }
    if (btnClearCart) {
        btnClearCart.addEventListener('click', clearCart);
    }

    const buttons = document.querySelectorAll('button');
    const btnCheckout = Array.from(buttons).find(b => b.textContent.includes('COBRAR / CHARGE'));
    if (btnCheckout) {
        btnCheckout.addEventListener('click', processCheckout);
    }

    const searchInput = document.getElementById('pos-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            textoBusqueda = e.target.value;
            filtrarCatalogo();
        });
    }

    setupClientEvents();
}

function setupClientEvents() {
    const searchCliente = document.getElementById('pos-search-cliente');
    const dropdownClientes = document.getElementById('dropdown-clientes');
    
    if (searchCliente) {
        searchCliente.addEventListener('input', async (e) => {
            const q = e.target.value.trim();
            if (q.length < 2) {
                dropdownClientes.classList.add('hidden');
                return;
            }
            try {
                const res = await fetch(`http://localhost:3000/api/clientes/buscar?q=${encodeURIComponent(q)}`);
                const clientes = await res.json();
                
                if (clientes.length > 0) {
                    dropdownClientes.innerHTML = clientes.map(c => `
                        <div class="px-4 py-2 hover:bg-surface-container-low cursor-pointer border-b border-outline-variant/10" onclick="seleccionarCliente(${c.id_cliente}, '${c.nombre.replace(/'/g, "\\'")}')">
                            <p class="text-xs font-bold text-on-surface">${c.nombre}</p>
                            <p class="text-[10px] text-on-surface-variant">${c.email}</p>
                        </div>
                    `).join('');
                    dropdownClientes.classList.remove('hidden');
                } else {
                    dropdownClientes.innerHTML = '<div class="px-4 py-3 text-xs text-on-surface-variant font-medium flex items-center gap-2"><span class="material-symbols-outlined text-sm">info</span> Cliente no encontrado. Haz clic en el botón [+] para crearlo</div>';
                    dropdownClientes.classList.remove('hidden');
                }
            } catch (err) {
                console.error('Error buscando clientes:', err);
            }
        });

        document.addEventListener('click', (e) => {
            if (!searchCliente.contains(e.target) && dropdownClientes && !dropdownClientes.contains(e.target)) {
                dropdownClientes.classList.add('hidden');
            }
        });
    }

    const btnAddCliente = document.getElementById('btn-add-cliente');
    const modalCliente = document.getElementById('client-modal-overlay');
    const btnCloseModal = document.getElementById('btn-close-client-modal');
    const formCliente = document.getElementById('add-client-form');

    if (btnAddCliente && modalCliente) {
        btnAddCliente.addEventListener('click', () => modalCliente.classList.remove('hidden'));
        btnCloseModal.addEventListener('click', () => modalCliente.classList.add('hidden'));
        
        formCliente.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('new-client-name').value;
            const email = document.getElementById('new-client-email').value;
            
            try {
                const res = await fetch('http://localhost:3000/api/clientes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, email })
                });
                const data = await res.json();
                
                if (data.success) {
                    seleccionarCliente(data.cliente.id_cliente, data.cliente.nombre);
                    modalCliente.classList.add('hidden');
                    formCliente.reset();
                } else {
                    alert('Error creando cliente');
                }
            } catch (err) {
                console.error(err);
                alert('Error al crear cliente');
            }
        });
    }
}

window.seleccionarCliente = function(id, nombre) {
    clienteActual = id;
    const lblCliente = document.getElementById('lbl-cliente-actual');
    if (lblCliente) {
        lblCliente.innerHTML = `Cliente / Facturar a: <span class="text-primary bg-primary/10 px-2 py-0.5 rounded-md ml-1 border border-primary/20">${nombre}</span>`;
    }
    document.getElementById('pos-search-cliente').value = '';
    document.getElementById('dropdown-clientes').classList.add('hidden');
};

async function loadPosProducts(merchantId) {
    try {
        const response = await fetch(`http://localhost:3000/api/productos/${merchantId}`);
        if (response.ok) {
            const data = await response.json();
            products = data;
            renderCategories(products);
            filtrarCatalogo();
        } else {
            console.error('Error al cargar productos, status:', response.status);
        }
    } catch (error) {
        console.error('Error cargando productos:', error);
    }
}

function renderCategories(productsToRender) {
    const categoriesContainer = document.getElementById('pos-categories-container');
    if (!categoriesContainer) return;

    // Obtener categorías únicas, filtrando nulos o vacíos
    const categoriasValidas = productsToRender.map(p => p.categoria).filter(c => c && c.trim() !== '');
    const categorias = ['Todos', ...new Set(categoriasValidas)];

    categoriesContainer.innerHTML = '';

    categorias.forEach(categoria => {
        const btn = document.createElement('button');
        const isActive = categoria === categoriaActual;
        
        btn.className = `whitespace-nowrap px-6 py-2.5 rounded-full text-xs font-bold transition-all ${
            isActive 
            ? 'bg-primary text-on-primary shadow-md shadow-primary/20' 
            : 'bg-white text-on-surface-variant border border-outline-variant/30 hover:border-primary/50 hover:text-primary'
        }`;
        
        // Capitalizar la primera letra
        btn.textContent = categoria.charAt(0).toUpperCase() + categoria.slice(1);
        
        btn.addEventListener('click', () => {
            categoriaActual = categoria;
            renderCategories(products); // Re-renderizar para actualizar clases activas
            filtrarCatalogo();
        });

        categoriesContainer.appendChild(btn);
    });
}

function filtrarCatalogo() {
    const filtrados = products.filter(p => {
        const coincideCategoria = categoriaActual === 'Todos' || p.categoria === categoriaActual;
        const textoNorm = textoBusqueda.toLowerCase().trim();
        const coincideTexto = textoNorm === '' || 
                              p.nombre.toLowerCase().includes(textoNorm) || 
                              (p.id_producto && p.id_producto.toString().includes(textoNorm));
        return coincideCategoria && coincideTexto;
    });
    renderProducts(filtrados);
}

function renderProducts(productsToRender) {
    const grid = document.getElementById('pos-products-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (productsToRender.length === 0) {
        grid.innerHTML = '<p class="text-on-surface-variant p-4">No hay productos disponibles.</p>';
        return;
    }

    productsToRender.forEach(product => {
        const card = document.createElement('div');
        card.className = 'bg-surface-container-lowest p-3 rounded-2xl shadow-sm hover:shadow-md transition-all group relative overflow-hidden flex flex-col gap-2';
        
        // Determinar imagen o placeholder si no hay url
        const imgUrl = product.imagen_url ? (product.imagen_url.startsWith('http') ? product.imagen_url : `http://localhost:3000${product.imagen_url}`) : 'https://lh3.googleusercontent.com/aida-public/AB6AXuAr10KCyGCkqfP9WN4CmMVk2hmOhaT45pcS1KclTR4-VIoCSvDRF_W0zvTZg1fKrRj8n1Ap7U931BmbM1kBeW2r9Kfx0wgpohY0wvq80siQ9TZk-m83P_rJm5ChsitKgcFxSjwxsbcSQ9ys7vEEBAbGo3FL4SJ2IwO9XMEXJecPEyOMqmeMnTVzbNfKJAd_CusC6FCCVTqHIKGdsUGQY2gpjPacSMNEsT8N1kTm7cRdTKuM3IpbzuUj2Lvg_76ZLfzsvQEEBUsbjFpP';

        card.innerHTML = `
            <div class="h-28 w-full rounded-xl bg-slate-100 overflow-hidden">
                <img src="${imgUrl}" alt="${product.nombre}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
            </div>
            <div class="flex flex-col">
                <h3 class="font-bold text-sm text-on-surface leading-tight truncate" title="${product.nombre}">${product.nombre}</h3>
                <div class="flex items-center justify-between mt-1">
                    <span class="text-emerald-700 font-extrabold text-sm">${Utils.formatCurrency(product.precio_venta)}</span>
                    <span class="text-[10px] px-2 py-0.5 rounded-full ${product.stock > 5 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'} font-medium">Stock: ${product.stock}</span>
                </div>
            </div>
            <button onclick="addToCart(${product.id_producto})" class="mt-1 w-full py-2 bg-primary text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform ${product.stock <= 0 ? 'opacity-50 cursor-not-allowed' : ''}" ${product.stock <= 0 ? 'disabled' : ''}>
                <span class="material-symbols-outlined text-sm">add</span> AGREGAR
            </button>
        `;
        grid.appendChild(card);
    });
}

function addToCart(productId) {
    const product = products.find(p => p.id_producto === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id_producto === productId);

    if (existingItem) {
        if (existingItem.quantity < product.stock) {
            existingItem.quantity += 1;
        } else {
            alert(`¡Stock insuficiente! Solo quedan ${product.stock} unidades disponibles.`);
            return;
        }
    } else {
        if (product.stock > 0) {
            cart.push({ ...product, quantity: 1 });
        } else {
            alert('Producto sin stock.');
            return;
        }
    }

    updateCartUI();
}

function updateQuantity(productId, delta) {
    const index = cart.findIndex(item => item.id_producto === productId);
    if (index === -1) return;

    const item = cart[index];
    const newQuantity = item.quantity + delta;

    if (newQuantity <= 0) {
        cart.splice(index, 1);
    } else {
        const product = products.find(p => p.id_producto === productId);
        if (newQuantity > product.stock) {
            alert(`¡Stock insuficiente! Solo quedan ${product.stock} unidades disponibles.`);
            return;
        }
        item.quantity = newQuantity;
    }

    updateCartUI();
}

function clearCart() {
    if (cart.length === 0) return;
    if (confirm('¿Estás seguro de que deseas limpiar el carrito?')) {
        cart = [];
        updateCartUI();
    }
}

function updateCartUI() {
    const cartContainer = document.getElementById('cart-items-container') || document.getElementById('pos-cart-items');
    if (!cartContainer) return;

    cartContainer.innerHTML = '';

    if (cart.length === 0) {
        cartContainer.innerHTML = '<p class="text-on-surface-variant text-sm text-center py-4">El carrito está vacío.</p>';
        updateTotals();
        return;
    }

    cart.forEach(item => {
        const div = document.createElement('div');
        div.className = 'p-3 bg-surface-container-low rounded-xl flex items-center gap-3';
        
        const imgUrl = item.imagen_url ? (item.imagen_url.startsWith('http') ? item.imagen_url : `http://localhost:3000${item.imagen_url}`) : 'https://lh3.googleusercontent.com/aida-public/AB6AXuAr10KCyGCkqfP9WN4CmMVk2hmOhaT45pcS1KclTR4-VIoCSvDRF_W0zvTZg1fKrRj8n1Ap7U931BmbM1kBeW2r9Kfx0wgpohY0wvq80siQ9TZk-m83P_rJm5ChsitKgcFxSjwxsbcSQ9ys7vEEBAbGo3FL4SJ2IwO9XMEXJecPEyOMqmeMnTVzbNfKJAd_CusC6FCCVTqHIKGdsUGQY2gpjPacSMNEsT8N1kTm7cRdTKuM3IpbzuUj2Lvg_76ZLfzsvQEEBUsbjFpP';

        div.innerHTML = `
            <div class="w-12 h-12 rounded-lg overflow-hidden bg-white shrink-0">
                <img src="${imgUrl}" alt="${item.nombre}" class="w-full h-full object-cover"/>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-xs font-bold text-on-surface truncate">${item.nombre}</p>
                <p class="text-[10px] text-on-surface-variant">${Utils.formatCurrency(item.precio_venta)} c/u</p>
            </div>
            <div class="flex items-center bg-white rounded-lg p-1 border border-outline-variant/20 shadow-sm">
                <button onclick="updateQuantity(${item.id_producto}, -1)" class="w-7 h-7 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-md transition-all">
                    <span class="material-symbols-outlined text-base">remove</span>
                </button>
                <span class="w-8 text-center text-xs font-black">${item.quantity}</span>
                <button onclick="updateQuantity(${item.id_producto}, 1)" class="w-7 h-7 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-md transition-all">
                    <span class="material-symbols-outlined text-base">add</span>
                </button>
            </div>
            <div class="text-right ml-2 min-w-[70px]">
                <p class="text-sm font-black text-emerald-800">${Utils.formatCurrency(item.precio_venta * item.quantity)}</p>
            </div>
        `;
        cartContainer.appendChild(div);
    });

    updateTotals();
}

function updateTotals() {
    const subtotalEl = document.getElementById('subtotal-amount') || document.getElementById('pos-subtotal');
    const taxEl = document.getElementById('pos-tax'); // Opcional, lo dejamos igual o sin error si no existe
    const totalEl = document.getElementById('total-amount') || document.getElementById('pos-total');

    const subtotal = cart.reduce((sum, item) => sum + (item.precio_venta * item.quantity), 0);
    const tax = 0; // Se puede calcular el IVA aquí si es necesario (ej: subtotal * 0.19)
    const total = subtotal + tax;

    if (subtotalEl) subtotalEl.textContent = Utils.formatCurrency(subtotal);
    if (taxEl) taxEl.textContent = Utils.formatCurrency(tax);
    if (totalEl) totalEl.textContent = Utils.formatCurrency(total);
}

function processCheckout() {
    if (cart.length === 0) {
        alert('El carrito está vacío.');
        return;
    }

    const modal = document.getElementById('modal-factura');
    if (!modal) {
        alert('Error: Modal de factura no encontrado en el DOM.');
        return;
    }

    // Cabecera
    const ticketIdStr = `TKT-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const elTicketId = document.getElementById('ticket-id');
    if (elTicketId) elTicketId.textContent = ticketIdStr;
    
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const elTicketDate = document.getElementById('ticket-date');
    if (elTicketDate) elTicketDate.textContent = dateStr;
    
    const elTicketCashier = document.getElementById('ticket-cashier');
    if (elTicketCashier) elTicketCashier.textContent = 'Caja Principal';
    
    // Extraer nombre del cliente del UI
    const lblNode = document.getElementById('lbl-cliente-actual');
    let clienteName = 'Consumidor Final';
    if (lblNode && lblNode.querySelector('span')) {
        clienteName = lblNode.querySelector('span').textContent;
    } else if (lblNode) {
        clienteName = lblNode.textContent.replace('Cliente / Facturar a:', '').trim();
    }
    const elTicketCustomer = document.getElementById('ticket-customer');
    if (elTicketCustomer) elTicketCustomer.textContent = clienteName;

    // Items
    const itemsContainer = document.getElementById('ticket-items');
    if (itemsContainer) {
        itemsContainer.innerHTML = '';
        cart.forEach(item => {
            itemsContainer.innerHTML += `
                <div class="flex justify-between">
                    <span>${item.nombre} x${item.quantity}</span>
                    <span class="font-bold">${Utils.formatCurrency(item.precio_venta * item.quantity)}</span>
                </div>
            `;
        });
    }

    // Totales
    const subtotal = cart.reduce((sum, item) => sum + (item.precio_venta * item.quantity), 0);
    const tax = 0; // Opcional IVA
    const total = subtotal + tax;

    const elSubtotal = document.getElementById('ticket-subtotal');
    if (elSubtotal) elSubtotal.textContent = Utils.formatCurrency(subtotal);
    
    const elTax = document.getElementById('ticket-tax');
    if (elTax) elTax.textContent = Utils.formatCurrency(tax);
    
    const elTotal = document.getElementById('ticket-total');
    if (elTotal) elTotal.textContent = Utils.formatCurrency(total);

    // Configurar eventos de cierre y pago
    const paymentContainer = modal.querySelector('.space-y-3.pt-2') || modal.querySelector('.payment-btn')?.parentElement;
    if (paymentContainer) paymentContainer.classList.remove('hidden');

    const closeBtn = modal.querySelector('.close-modal-btn');
    if (closeBtn) {
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        newCloseBtn.textContent = '✕ CANCELAR OPERACIÓN';
        newCloseBtn.addEventListener('click', () => modal.classList.add('hidden'));
    }

    const paymentBtns = modal.querySelectorAll('.payment-btn');
    paymentBtns.forEach(btn => {
        const text = btn.textContent.trim().toUpperCase();
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        if (text.includes('EFECTIVO')) {
            newBtn.addEventListener('click', () => processVentaReal('efectivo', newBtn));
        } else if (text.includes('TARJETA') || text.includes('NEQUI')) {
            newBtn.addEventListener('click', () => processVentaReal('tarjeta', newBtn));
        }
    });

    // Abrir modal
    modal.classList.remove('hidden');
}

async function processVentaReal(metodoPago, buttonEl) {
    const originalText = buttonEl.innerHTML;
    buttonEl.innerHTML = 'Procesando...';
    buttonEl.disabled = true;

    const merchantId = localStorage.getItem('userId');
    const total = cart.reduce((sum, item) => sum + (item.precio_venta * item.quantity), 0);

    const payload = {
        id_tienda: merchantId ? parseInt(merchantId) : 1,
        id_cliente: clienteActual,
        tipo_pago: metodoPago,
        total: total,
        items: cart.map(item => ({
            id_producto: item.id_producto,
            cantidad: item.quantity,
            precio_unitario: item.precio_venta
        }))
    };

    try {
        const response = await API.procesarVenta(payload);

        if (response.status === 200 && response.data.success) {
            alert('Venta registrada con éxito');
            document.getElementById('modal-factura').classList.add('hidden');
            cart = [];
            updateCartUI();
            
            // Reset de Cliente
            clienteActual = 1;
            const lblCliente = document.getElementById('pos-customer-label');
            if (lblCliente) {
                lblCliente.innerHTML = `Cliente / Facturar a: <span class="text-primary bg-primary/10 px-2 py-0.5 rounded-md ml-1 border border-primary/20">Consumidor Final</span>`;
            }
            const posSearchCliente = document.getElementById('pos-search-cliente');
            if (posSearchCliente) {
                posSearchCliente.value = '';
            }
            
            // Recargar inventario actual y reportes
            setTimeout(() => {
                loadPosProducts(merchantId); 
                if (typeof loadReportes === 'function') {
                    loadReportes(merchantId);
                }
            }, 300);
        } else {
            alert('Error al procesar la venta: ' + (response.data.error || 'Desconocido'));
        }
    } catch (error) {
        console.error('Checkout error:', error);
        alert('Error en el proceso de cobro.');
    } finally {
        buttonEl.innerHTML = originalText;
        buttonEl.disabled = false;
    }
}

let historyState = {
    page: 1,
    limit: 10,
    q: '',
    fechaInicio: '',
    fechaFin: ''
};
let historyDebounceTimer = null;

window.cargarHistorialVentas = async function(tenderoId = null) {
    if (!tenderoId) tenderoId = localStorage.getItem('userId');
    const tbody = document.getElementById('tabla-historial-ventas');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-slate-500">Cargando historial...</td></tr>';

    try {
        const queryParams = new URLSearchParams({
            page: historyState.page,
            limit: historyState.limit
        });
        if (historyState.q) queryParams.append('q', historyState.q);
        if (historyState.fechaInicio) queryParams.append('fechaInicio', historyState.fechaInicio);
        if (historyState.fechaFin) queryParams.append('fechaFin', historyState.fechaFin);

        const response = await fetch(`http://localhost:3000/api/ventas/historial/${tenderoId}?${queryParams.toString()}`);
        if (response.ok) {
            const result = await response.json();
            const ventas = result.data || [];
            const pagination = result.pagination || { totalPages: 1, currentPage: 1 };
            
            if (ventas.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-slate-500">No hay transacciones registradas aún.</td></tr>';
                updateHistoryPagination(pagination);
                return;
            }

            tbody.innerHTML = '';
            ventas.forEach(v => {
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-surface-container-low/30 transition-colors group';
                
                const d = new Date(v.fecha);
                const fechaFormat = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                
                const nombreCliente = v.nombre_cliente || 'Consumidor Final';
                
                tr.innerHTML = `
                    <td class="px-6 py-4 font-mono text-xs text-on-surface-variant font-bold">#TKT-${v.id_venta}</td>
                    <td class="px-6 py-4 text-xs text-on-surface">${fechaFormat}</td>
                    <td class="px-6 py-4 text-xs font-bold text-emerald-800">${nombreCliente}</td>
                    <td class="px-6 py-4 text-xs uppercase text-slate-500 font-medium">${v.tipo_pago}</td>
                    <td class="px-6 py-4 text-sm font-black text-emerald-700 text-right">${Utils.formatCurrency(v.total)}</td>
                    <td class="px-6 py-4 text-center">
                        <button class="text-primary text-[10px] font-bold uppercase tracking-widest hover:underline" onclick="verDetalleFactura(${v.id_venta})">
                            Detalles
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            updateHistoryPagination(pagination);
        } else {
            console.error('Error fetching historial:', response.status);
            tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-error">Error al cargar el historial.</td></tr>';
        }
    } catch (error) {
        console.error('Error cargando historial de ventas:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-center text-error">Error de red cargando el historial.</td></tr>';
    }
}

function updateHistoryPagination(pagination) {
    const info = document.getElementById('historial-page-info');
    const btnPrev = document.getElementById('historial-btn-prev');
    const btnNext = document.getElementById('historial-btn-next');

    if (info) info.textContent = `Página ${pagination.currentPage} de ${pagination.totalPages}`;
    
    if (btnPrev) {
        btnPrev.disabled = pagination.currentPage <= 1;
        btnPrev.onclick = () => { historyState.page--; cargarHistorialVentas(); };
    }
    
    if (btnNext) {
        btnNext.disabled = pagination.currentPage >= pagination.totalPages;
        btnNext.onclick = () => { historyState.page++; cargarHistorialVentas(); };
    }
}

// Setup Event Listeners for Filters
document.addEventListener('DOMContentLoaded', () => {
    const inputSearch = document.getElementById('historial-search');
    const inputFrom = document.getElementById('historial-date-from');
    const inputTo = document.getElementById('historial-date-to');
    const btnClear = document.getElementById('historial-btn-clear');

    if (inputSearch) {
        inputSearch.addEventListener('input', (e) => {
            clearTimeout(historyDebounceTimer);
            historyDebounceTimer = setTimeout(() => {
                historyState.q = e.target.value;
                historyState.page = 1;
                cargarHistorialVentas();
            }, 400);
        });
    }

    if (inputFrom) {
        inputFrom.addEventListener('change', (e) => {
            historyState.fechaInicio = e.target.value;
            historyState.page = 1;
            cargarHistorialVentas();
        });
    }

    if (inputTo) {
        inputTo.addEventListener('change', (e) => {
            historyState.fechaFin = e.target.value;
            historyState.page = 1;
            cargarHistorialVentas();
        });
    }

    if (btnClear) {
        btnClear.addEventListener('click', () => {
            if (inputSearch) inputSearch.value = '';
            if (inputFrom) inputFrom.value = '';
            if (inputTo) inputTo.value = '';
            historyState = {
                page: 1,
                limit: 10,
                q: '',
                fechaInicio: '',
                fechaFin: ''
            };
            cargarHistorialVentas();
        });
    }
});

window.verDetalleFactura = async function(idVenta) {
    try {
        const response = await fetch(`http://localhost:3000/api/ventas/${idVenta}/detalles`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();

        if (data.success && data.venta) {
            const modal = document.getElementById('modal-factura');
            if (!modal) return;

            const elTicketId = document.getElementById('ticket-id');
            if (elTicketId) elTicketId.textContent = `TKT-${data.venta.id_venta.toString().padStart(4, '0')}`;
            
            const elTicketDate = document.getElementById('ticket-date');
            if (elTicketDate) {
                const d = new Date(data.venta.fecha);
                elTicketDate.textContent = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
            }
            
            const elTicketCashier = document.getElementById('ticket-cashier');
            if (elTicketCashier) elTicketCashier.textContent = 'Caja Principal';
            
            const elTicketCustomer = document.getElementById('ticket-customer');
            if (elTicketCustomer) elTicketCustomer.textContent = data.venta.nombre_cliente || 'Consumidor Final';

            const itemsContainer = document.getElementById('ticket-items');
            if (itemsContainer) {
                itemsContainer.innerHTML = '';
                data.items.forEach(item => {
                    itemsContainer.innerHTML += `
                        <div class="flex justify-between">
                            <span>${item.nombre} x${item.cantidad}</span>
                            <span class="font-bold">${Utils.formatCurrency(item.precio_unitario_en_momento * item.cantidad)}</span>
                        </div>
                    `;
                });
            }

            const subtotal = data.venta.total;
            const tax = 0;

            const elSubtotal = document.getElementById('ticket-subtotal');
            if (elSubtotal) elSubtotal.textContent = Utils.formatCurrency(subtotal);
            
            const elTax = document.getElementById('ticket-tax');
            if (elTax) elTax.textContent = Utils.formatCurrency(tax);
            
            const elTotal = document.getElementById('ticket-total');
            if (elTotal) elTotal.textContent = Utils.formatCurrency(subtotal + tax);

            const paymentContainer = modal.querySelector('.space-y-3.pt-2') || modal.querySelector('.payment-btn')?.parentElement;
            if (paymentContainer) paymentContainer.classList.add('hidden');

            const closeBtn = modal.querySelector('.close-modal-btn');
            if (closeBtn) {
                const newCloseBtn = closeBtn.cloneNode(true);
                closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
                newCloseBtn.textContent = '✕ CERRAR TICKET';
                newCloseBtn.addEventListener('click', () => modal.classList.add('hidden'));
            }

            modal.classList.remove('hidden');
        } else {
            alert('No se pudieron cargar los detalles de la venta.');
        }
    } catch (error) {
        console.error('Error fetching details:', error);
        alert('Error obteniendo detalles de la venta.');
    }
};

window.imprimirTicket = function() {
    window.print();
};
