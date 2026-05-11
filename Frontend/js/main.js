// Al cargar la página, ejecutar la carga de productos y verificar login
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

    const grid = document.getElementById("product-grid");

    // 1. Llamar al Backend
    const productos = await API.getProductos();

    // 2. Limpiar el mensaje de "Cargando"
    grid.innerHTML = "";

    if (productos.length === 0) {
        grid.innerHTML = "<p>No se encontraron productos disponibles en este momento.</p>";
        return;
    }

    // 3. Crear las tarjetas dinámicamente
    productos.forEach(prod => {
        const card = document.createElement("div");
        card.className = "group bg-white rounded-xl p-4 product-card shadow-sm border border-slate-100";

        const imgUrl = prod.imagen_url ? (prod.imagen_url.startsWith('http') ? prod.imagen_url : `http://localhost:3000${prod.imagen_url}`) : 'https://placehold.co/400x300/e2e8f0/475569?text=Sin+Imagen';

        card.innerHTML = `
            <div class="relative aspect-square overflow-hidden rounded-lg mb-6 bg-slate-100 flex items-center justify-center">
                <img src="${imgUrl}" alt="${prod.nombre}" class="object-cover w-full h-full">
                <div class="absolute top-3 left-3">
                    <span class="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full uppercase">
                        ${prod.marca || 'Local'}
                    </span>
                </div>
            </div>
            <div class="space-y-1 mb-6">
                <h3 class="text-xl font-bold text-slate-800 tracking-tight">${prod.nombre}</h3>
                <p class="text-slate-500 text-sm font-medium">Precio: ${Utils.formatCurrency(prod.precio_venta)}</p>
                <p class="text-emerald-600 text-xs font-bold uppercase">${prod.categoria || 'Local'}</p>
            </div>
            <button class="w-full py-3 px-4 rounded-lg border border-emerald-600 text-emerald-600 font-bold hover:bg-emerald-50 transition-colors">
                Ver Detalles
            </button>
        `;
        grid.appendChild(card);
    });
});