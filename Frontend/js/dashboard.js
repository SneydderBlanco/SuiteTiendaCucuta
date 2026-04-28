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

    // Form Submissions
    const form = document.getElementById("add-product-form");
    form.addEventListener("submit", async(e) => {
        e.preventDefault();
        
        const payload = {
            id_tendero: userId,
            nombre: document.getElementById("reg-prod-nombre").value,
            marca: document.getElementById("reg-prod-marca").value,
            categoria: document.getElementById("reg-prod-categoria").value,
            precio_venta: document.getElementById("reg-prod-precio").value,
            stock: document.getElementById("reg-prod-stock").value
        };

        const btnSubmit = document.querySelector("#add-product-form button[type='submit']");
        const initText = btnSubmit.innerHTML;
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = "Guardando...";

        try {
            const resp = await API.createProducto(payload);

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

});

async function loadProducts(tenderoId) {
    const tbody = document.getElementById("inventory-table-body");
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-sm text-slate-500 py-6">Construyendo inventario mediante API...</td></tr>';
    
    try {
        const resp = await API.getProductosTendero(tenderoId);
        if (resp.status === 200) {
            const productos = resp.data;
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
            <span class="font-bold text-on-surface">${p.nombre}</span>
            <span class="text-xs text-slate-400">(${p.marca || 'S/M'})</span>
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
        <div class="flex items-center justify-center gap-2">
            <button class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-error/10 hover:text-error transition-all" onclick="Utils.showAlert('Funcionalidad Desactivada. Requiere Delete Method')">
                <span class="material-symbols-outlined text-lg" data-icon="delete">delete</span>
            </button>
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
