// js/pos.js

let products = [];
let cart = [];
let categoriaActual = 'Todos';
let textoBusqueda = '';

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
}

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
            alert('No hay suficiente stock disponible.');
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
            alert('No hay suficiente stock disponible.');
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

    const modal = document.getElementById('billing-modal');
    if (!modal) {
        alert('Error: Modal de factura no encontrado en el DOM.');
        return;
    }

    // Calcular totales
    const subtotal = cart.reduce((sum, item) => sum + (item.precio_venta * item.quantity), 0);
    const tax = 0; // Opcional IVA
    const total = subtotal + tax;

    // Inyectar ítems del carrito en el ticket
    const itemsContainer = modal.querySelector('.space-y-2.border-t.border-b');
    if (itemsContainer) {
        itemsContainer.innerHTML = '';
        cart.forEach(item => {
            itemsContainer.innerHTML += `
                <div class="flex justify-between text-xs">
                    <span class="text-on-surface-variant">${item.quantity}x ${item.nombre}</span>
                    <span class="font-bold">${Utils.formatCurrency(item.precio_venta * item.quantity)}</span>
                </div>
            `;
        });
    }

    // Actualizar subtotales y total
    const totalsContainer = modal.querySelector('.space-y-1');
    if (totalsContainer) {
        totalsContainer.innerHTML = `
            <div class="flex justify-between text-xs font-medium">
                <span>Subtotal:</span>
                <span>${Utils.formatCurrency(subtotal)}</span>
            </div>
            <div class="flex justify-between text-xs font-medium">
                <span>IVA (0%):</span>
                <span>${Utils.formatCurrency(tax)}</span>
            </div>
            <div class="flex justify-between items-end mt-4 pt-4 border-t-2 border-dashed border-emerald-200">
                <span class="font-black text-emerald-900">TOTAL:</span>
                <span class="text-3xl font-black text-emerald-600">${Utils.formatCurrency(total)}</span>
            </div>
        `;
    }

    // Asignar eventos de pago y cierre
    const modalButtons = modal.querySelectorAll('button');
    modalButtons.forEach(btn => {
        const text = btn.textContent.trim().toUpperCase();
        // Remove previous listeners
        const btnClone = btn.cloneNode(true);
        btn.parentNode.replaceChild(btnClone, btn);
        
        if (text.includes('EFECTIVO')) {
            btnClone.addEventListener('click', () => processVentaReal('efectivo', btnClone));
        } else if (text.includes('TARJETA')) {
            btnClone.addEventListener('click', () => processVentaReal('tarjeta', btnClone));
        } else if (text.includes('TRANSFERENCIA')) {
            btnClone.addEventListener('click', () => processVentaReal('transferencia', btnClone));
        } else if (text.includes('CANCELAR OPERACIÓN') || text.includes('CLOSE')) {
            btnClone.addEventListener('click', () => modal.classList.add('hidden'));
        } else if (btnClone.querySelector('.material-symbols-outlined') && btnClone.querySelector('.material-symbols-outlined').textContent.trim() === 'close') {
            btnClone.addEventListener('click', () => modal.classList.add('hidden'));
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
    const idClienteSeleccionado = document.getElementById('selector-cliente')?.value || 'consumidor';

    const payload = {
        id_tienda: merchantId ? parseInt(merchantId) : 1,
        id_cliente: idClienteSeleccionado === 'consumidor' ? null : 1, // Lógica simple temporal para cliente
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
            alert('Venta procesada exitosamente.');
            document.getElementById('billing-modal').classList.add('hidden');
            cart = [];
            updateCartUI();
            
            // Recargar inventario actual y reportes
            loadPosProducts(merchantId); 
            if (typeof loadReportes === 'function') {
                loadReportes(merchantId);
            }
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

