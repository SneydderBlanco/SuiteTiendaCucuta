// js/pos.js

let products = [];
let cart = [];
let categoriaActual = 'Todos';
let textoBusqueda = '';
let clienteActual = 1;
const posSelectedVariantByProduct = {};

// Placeholder estético SVG cuando el producto no tiene imagen o falla la carga
const POS_PRODUCT_PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300" fill="none">' +
    '<rect width="300" height="300" rx="24" fill="#F1F5F9"/>' +
    '<rect x="95" y="85" width="110" height="110" rx="18" fill="#E2E8F0" stroke="#94A3B8" stroke-width="6"/>' +
    '<circle cx="130" cy="120" r="10" fill="#94A3B8"/>' +
    '<path d="M105 175L135 145L158 168L175 150L195 175H105Z" fill="#94A3B8"/>' +
    '<text x="150" y="230" text-anchor="middle" fill="#64748B" font-family="Plus Jakarta Sans, sans-serif" font-size="14" font-weight="700">Sin imagen</text>' +
    '</svg>'
);

/**
 * Normaliza la URL de la imagen del producto para evitar íconos rotos en el POS.
 * Si empieza con /uploads/, le concatena la URL base del backend (API_URL).
 */
function resolvePosProductImage(imagenUrl) {
    if (!imagenUrl || typeof imagenUrl !== 'string' || !imagenUrl.trim()) {
        return POS_PRODUCT_PLACEHOLDER;
    }
    const raw = imagenUrl.trim();
    const baseApi = (window.API_URL || 'http://localhost:3000').replace(/\/+$/, '');

    if (raw.startsWith('/uploads/')) {
        return `${baseApi}${raw}`;
    }
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:image/')) {
        return raw;
    }
    if (raw.startsWith('/')) {
        return `${baseApi}${raw}`;
    }
    return `${baseApi}/uploads/${raw.replace(/^\/+/, '')}`;
}

/**
 * Extrae y normaliza el array de presentaciones (JSONB) de un producto.
 * Siempre retorna al menos 1 presentación con { unidad, precio, stock }.
 */
function parsePosPresentaciones(product) {
    let list = [];
    if (Array.isArray(product?.presentaciones)) {
        list = product.presentaciones;
    } else if (typeof product?.presentaciones === 'string' && product.presentaciones.trim().startsWith('[')) {
        try {
            const parsed = JSON.parse(product.presentaciones);
            if (Array.isArray(parsed)) list = parsed;
        } catch (_e) {
            list = [];
        }
    }

    const normalized = list
        .map(item => ({
            unidad: String(item?.unidad || item?.unidad_medida || item?.nombre || '').trim(),
            precio: parseFloat(item?.precio ?? item?.precio_venta ?? product?.precio_venta ?? 0) || 0,
            stock: parseInt(item?.stock ?? product?.stock ?? 0, 10) || 0
        }))
        .filter(item => item.unidad !== '');

    if (normalized.length === 0) {
        normalized.push({
            unidad: String(product?.unidad_medida || 'Unidad').trim() || 'Unidad',
            precio: parseFloat(product?.precio_venta) || 0,
            stock: parseInt(product?.stock, 10) || 0
        });
    }

    return normalized;
}

document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');

    if (!userId || (userRole !== 'merchant' && userRole !== 'tendero')) {
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
                const tenderoId = localStorage.getItem("userId") || "1";
                const res = await fetch(`${window.API_URL}/api/clientes/buscar?q=${encodeURIComponent(q)}&id_tendero=${tenderoId}`);
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
                const tenderoId = localStorage.getItem("userId") || "1";
                const res = await fetch(`${window.API_URL}/api/clientes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, email, id_tendero: tenderoId })
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
        const targetId = merchantId || localStorage.getItem('userId');
        const response = await fetch(`${window.API_URL}/api/productos/${targetId}`);
        if (response.ok) {
            const data = await response.json();
            products = Array.isArray(data) ? data : [];
            renderCategories(products);
            filtrarCatalogo();
        } else {
            console.error('Error al cargar productos, status:', response.status);
        }
    } catch (error) {
        console.error('Error cargando productos:', error);
    }
}
window.loadPosProducts = loadPosProducts;

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
                              (p.marca && p.marca.toLowerCase().includes(textoNorm)) ||
                              (p.id_producto && p.id_producto.toString().includes(textoNorm));
        return coincideCategoria && coincideTexto;
    });
    renderProducts(filtrados);
}

/**
 * Actualiza dinámicamente el precio, stock y estado del botón '+ AGREGAR'
 * cuando el tendero cambia la presentación seleccionada en la tarjeta del POS.
 */
window.onPosVariantChange = function(productId, variantIdx) {
    const product = products.find(p => Number(p.id_producto) === Number(productId));
    if (!product) return;

    const presentaciones = parsePosPresentaciones(product);
    const idx = Math.max(0, Math.min(parseInt(variantIdx, 10) || 0, presentaciones.length - 1));
    posSelectedVariantByProduct[product.id_producto] = idx;

    const selectedPres = presentaciones[idx];

    const priceEl = document.getElementById(`pos-price-${product.id_producto}`);
    if (priceEl) {
        priceEl.textContent = Utils.formatCurrency(selectedPres.precio);
    }

    const stockEl = document.getElementById(`pos-stock-${product.id_producto}`);
    if (stockEl) {
        stockEl.textContent = `Stock: ${selectedPres.stock}`;
        stockEl.className = `text-[10px] px-2 py-0.5 rounded-full font-bold ${
            selectedPres.stock > 5
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                : selectedPres.stock > 0
                ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                : 'bg-red-50 text-red-700 border border-red-200/60'
        }`;
    }

    const addBtn = document.getElementById(`pos-add-btn-${product.id_producto}`);
    if (addBtn) {
        if (selectedPres.stock <= 0) {
            addBtn.disabled = true;
            addBtn.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            addBtn.disabled = false;
            addBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
};

function renderProducts(productsToRender) {
    const grid = document.getElementById('pos-products-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (productsToRender.length === 0) {
        grid.innerHTML = '<p class="text-on-surface-variant p-4 col-span-full text-center text-sm font-medium">No hay productos disponibles para esta búsqueda.</p>';
        return;
    }

    productsToRender.forEach(product => {
        const card = document.createElement('div');
        card.className = 'bg-surface-container-lowest p-3 rounded-2xl shadow-sm hover:shadow-md border border-slate-100 transition-all group relative overflow-hidden flex flex-col justify-between gap-2';

        // 1. Arreglo de Imágenes con soporte /uploads/ y placeholder seguro
        const imgUrl = resolvePosProductImage(product.imagen_url);

        // 2. Presentaciones múltiples (JSONB)
        const presentaciones = parsePosPresentaciones(product);
        const currentIdx = (posSelectedVariantByProduct[product.id_producto] !== undefined &&
                            posSelectedVariantByProduct[product.id_producto] < presentaciones.length)
            ? posSelectedVariantByProduct[product.id_producto]
            : 0;
        posSelectedVariantByProduct[product.id_producto] = currentIdx;

        const selectedPres = presentaciones[currentIdx];

        const variantSelectorHtml = presentaciones.length > 1
            ? `<div class="mt-1.5">
                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Presentación</label>
                <select id="pos-variant-select-${product.id_producto}"
                    onchange="window.onPosVariantChange(${product.id_producto}, this.value)"
                    class="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer transition-all">
                    ${presentaciones.map((pres, idx) => `<option value="${idx}" ${idx === currentIdx ? 'selected' : ''}>${pres.unidad}</option>`).join('')}
                </select>
               </div>`
            : `<div class="mt-1">
                <span class="inline-block text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">${selectedPres.unidad}</span>
               </div>`;

        const stockClass = selectedPres.stock > 5
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
            : selectedPres.stock > 0
            ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
            : 'bg-red-50 text-red-700 border border-red-200/60';

        card.innerHTML = `
            <div>
                <div class="h-28 w-full rounded-xl bg-slate-100 overflow-hidden mb-2">
                    <img src="${imgUrl}"
                        alt="${product.nombre}"
                        onerror="this.onerror=null;this.src='${POS_PRODUCT_PLACEHOLDER}';"
                        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                </div>
                <div class="flex flex-col">
                    <h3 class="font-bold text-sm text-on-surface leading-tight truncate" title="${product.nombre}">${product.nombre}</h3>
                    ${variantSelectorHtml}
                    <div class="flex items-center justify-between mt-2">
                        <span id="pos-price-${product.id_producto}" class="text-emerald-700 font-extrabold text-sm">${Utils.formatCurrency(selectedPres.precio)}</span>
                        <span id="pos-stock-${product.id_producto}" class="text-[10px] px-2 py-0.5 rounded-full font-bold ${stockClass}">Stock: ${selectedPres.stock}</span>
                    </div>
                </div>
            </div>
            <button id="pos-add-btn-${product.id_producto}"
                onclick="addToCart(${product.id_producto})"
                class="mt-1 w-full py-2 bg-primary hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all shadow-sm ${selectedPres.stock <= 0 ? 'opacity-50 cursor-not-allowed' : ''}"
                ${selectedPres.stock <= 0 ? 'disabled' : ''}>
                <span class="material-symbols-outlined text-sm">add</span> AGREGAR
            </button>
        `;
        grid.appendChild(card);
    });
}
window.renderSearchResults = renderProducts;

function addToCart(productId) {
    const product = products.find(p => Number(p.id_producto) === Number(productId));
    if (!product) return;

    const presentaciones = parsePosPresentaciones(product);
    const selectEl = document.getElementById(`pos-variant-select-${product.id_producto}`);
    const idx = selectEl
        ? (parseInt(selectEl.value, 10) || 0)
        : (posSelectedVariantByProduct[product.id_producto] || 0);

    const selectedPres = presentaciones[idx] || presentaciones[0];
    const cartKey = `${product.id_producto}__${selectedPres.unidad}`;

    const existingItem = cart.find(item => item.cartKey === cartKey);

    if (existingItem) {
        if (existingItem.quantity < selectedPres.stock) {
            existingItem.quantity += 1;
        } else {
            alert(`¡Stock insuficiente para ${product.nombre} (${selectedPres.unidad})! Solo quedan ${selectedPres.stock} disponibles.`);
            return;
        }
    } else {
        if (selectedPres.stock > 0) {
            cart.push({
                ...product,
                cartKey,
                presentacionIdx: idx,
                unidad: selectedPres.unidad,
                unidad_medida: selectedPres.unidad,
                precio_venta: selectedPres.precio,
                stock: selectedPres.stock,
                imagen_url: resolvePosProductImage(product.imagen_url),
                quantity: 1
            });
        } else {
            alert(`La presentación "${selectedPres.unidad}" no tiene stock disponible.`);
            return;
        }
    }

    updateCartUI();
}

function updateQuantity(cartKeyOrProductId, delta) {
    const keyStr = String(cartKeyOrProductId);
    const index = cart.findIndex(item => item.cartKey === keyStr || String(item.id_producto) === keyStr);
    if (index === -1) return;

    const item = cart[index];
    const newQuantity = item.quantity + delta;

    if (newQuantity <= 0) {
        cart.splice(index, 1);
    } else {
        const maxStock = parseInt(item.stock, 10) || 0;
        if (newQuantity > maxStock) {
            alert(`¡Stock insuficiente para ${item.nombre} (${item.unidad})! Solo quedan ${maxStock} disponibles.`);
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
        cartContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center py-10 text-center text-slate-400">
                <span class="material-symbols-outlined text-4xl mb-2 text-slate-300">receipt_long</span>
                <p class="text-xs font-semibold text-slate-500">El ticket de facturación está vacío</p>
                <p class="text-[11px] text-slate-400 mt-0.5">Selecciona productos del catálogo para agregarlos.</p>
            </div>
        `;
        updateTotals();
        return;
    }

    cart.forEach(item => {
        const div = document.createElement('div');
        div.className = 'p-2.5 bg-slate-50/90 hover:bg-slate-100/80 border border-slate-200/70 rounded-xl flex gap-3 transition-colors';

        const imgUrl = resolvePosProductImage(item.imagen_url);
        const unidadLabel = item.unidad || item.unidad_medida || 'Unidad';
        const escapedKey = String(item.cartKey || item.id_producto).replace(/'/g, "\\'");
        const nombreConPresentacion = `${item.nombre} - ${unidadLabel}`;

        div.innerHTML = `
            <!-- Imagen (Ligeramente más pequeña) -->
            <div class="w-10 h-10 rounded-lg overflow-hidden bg-white border border-slate-200/60 shrink-0 shadow-xs">
                <img src="${imgUrl}" alt="${item.nombre}" onerror="this.onerror=null;this.src='${POS_PRODUCT_PLACEHOLDER}';" class="w-full h-full object-cover"/>
            </div>
            
            <!-- Contenido Principal -->
            <div class="flex-1 flex flex-col min-w-0 justify-center">
                <!-- Fila 1: Nombre y Total -->
                <div class="flex justify-between items-start gap-2">
                    <p class="text-[11px] font-extrabold text-slate-800 leading-tight line-clamp-2" title="${nombreConPresentacion}">
                        ${item.nombre} <span class="text-emerald-700">- ${unidadLabel}</span>
                    </p>
                    <p class="text-xs font-black text-emerald-800 shrink-0 mt-0.5">
                        ${Utils.formatCurrency(item.precio_venta * item.quantity)}
                    </p>
                </div>
                
                <!-- Fila 2: Precio unitario y Controles de Cantidad -->
                <div class="flex justify-between items-end mt-1.5 gap-2">
                    <div class="flex flex-wrap items-center gap-1.5 min-w-0">
                        <span class="inline-block text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-1 py-0.5 rounded leading-none">${unidadLabel}</span>
                        <span class="text-[10px] font-semibold text-slate-500 truncate">${Utils.formatCurrency(item.precio_venta)} c/u</span>
                    </div>
                    
                    <!-- Botones de Cantidad (Más compactos) -->
                    <div class="flex items-center bg-white rounded-lg p-0.5 border border-slate-200 shadow-xs shrink-0">
                        <button type="button" onclick="updateQuantity('${escapedKey}', -1)" class="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-all font-bold">
                            <span class="material-symbols-outlined text-[14px]">remove</span>
                        </button>
                        <span class="w-6 text-center text-[11px] font-black text-slate-800">${item.quantity}</span>
                        <button type="button" onclick="updateQuantity('${escapedKey}', 1)" class="w-6 h-6 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-md transition-all font-bold">
                            <span class="material-symbols-outlined text-[14px]">add</span>
                        </button>
                    </div>
                </div>
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
            const unidadTxt = item.unidad ? ` - ${item.unidad}` : '';
            itemsContainer.innerHTML += `
                <div class="flex justify-between text-xs py-0.5">
                    <span>${item.nombre}${unidadTxt} x${item.quantity}</span>
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
            unidad: item.unidad || item.unidad_medida || 'Unidad',
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

        const response = await fetch(`${window.API_URL}/api/ventas/historial/${tenderoId}?${queryParams.toString()}`);
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
        const response = await fetch(`${window.API_URL}/api/ventas/${idVenta}/detalles`);
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
