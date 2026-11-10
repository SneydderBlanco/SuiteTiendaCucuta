/**
 * Utilidades Centralizadas de la Suite TiendaCúcuta
 */

window.Utils = {
    /**
     * Formatea un número o string a formato de moneda (COP)
     * @param {string|number} amount Cantidad a formatear
     * @returns {string} Cantidad formateada, ej: "10,000 COP"
     */
    formatCurrency: function(amount) {
        if (amount == null || isNaN(amount)) return "0 COP";
        return parseFloat(amount).toLocaleString() + " COP";
    },

    /**
     * Muestra una alerta en pantalla (Por ahora usa el alert nativo)
     * @param {string} message Mensaje a mostrar
     */
    showAlert: function(message) {
        alert(message);
    }
};

/**
 * Gestor Global de Estado de Carga y Transiciones entre Páginas (PageLoader / AuthContext bridge)
 */
(function initGlobalPageTransitions() {
    function ensureLoaderElement() {
        let loader = document.getElementById("global-page-loader");
        if (!loader && document.body) {
            loader = document.createElement("div");
            loader.id = "global-page-loader";
            loader.className = "fixed inset-0 z-[100] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center transition-opacity duration-300 opacity-0 pointer-events-none hidden";
            loader.innerHTML = `
                <div class="relative flex items-center justify-center">
                    <div class="w-12 h-12 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin"></div>
                    <span class="material-symbols-outlined text-emerald-600 text-lg absolute">storefront</span>
                </div>
                <p id="global-page-loader-text" class="mt-3 text-xs font-extrabold uppercase tracking-widest text-emerald-700 animate-pulse">Cargando...</p>
            `;
            document.body.prepend(loader);
        }
        return loader;
    }

    const PageLoader = {
        loading: true,
        show: function(message) {
            this.loading = true;
            const loader = ensureLoaderElement();
            if (!loader) return;
            const textEl = loader.querySelector("#global-page-loader-text");
            if (textEl && message) textEl.textContent = message;
            loader.classList.remove("hidden", "pointer-events-none", "opacity-0");
            loader.classList.add("opacity-100");
        },
        hide: function() {
            this.loading = false;
            const loader = document.getElementById("global-page-loader");
            if (!loader) return;
            loader.classList.remove("opacity-100");
            loader.classList.add("opacity-0", "pointer-events-none");
            setTimeout(() => {
                if (!this.loading) {
                    loader.classList.add("hidden");
                }
            }, 300);
        },
        setLoading: function(isLoading, message) {
            if (isLoading) {
                this.show(message);
            } else {
                this.hide();
            }
        }
    };

    window.PageLoader = PageLoader;
    // Bridge compatible con estado global de carga (AuthContext)
    window.AuthContext = window.AuthContext || {
        loading: false,
        setLoading: (val, msg) => PageLoader.setLoading(val, msg)
    };

    document.addEventListener("DOMContentLoaded", () => {
        ensureLoaderElement();

        // Interceptar clics en enlaces de navegación interna para transición suave
        document.addEventListener("click", (e) => {
            const link = e.target.closest("a[href]");
            if (!link) return;
            const href = link.getAttribute("href");
            if (
                !href ||
                href.startsWith("#") ||
                href.startsWith("javascript:") ||
                href.startsWith("mailto:") ||
                href.startsWith("tel:") ||
                link.target === "_blank" ||
                e.ctrlKey ||
                e.metaKey ||
                e.shiftKey
            ) {
                return;
            }
            PageLoader.show("Cargando vista...");
        });

        // Si la página no retiene explícitamente el loader mediante hidratación asíncrona, ocultarlo tras renderizar
        if (!document.body.hasAttribute("data-manual-loader")) {
            requestAnimationFrame(() => {
                PageLoader.hide();
            });
        }
    });

    // Mostrar loader justo antes de cambiar/descargar la página
    window.addEventListener("beforeunload", () => {
        PageLoader.show("Cargando...");
    });

    // Asegurar que al volver atrás con bfcache el loader no quede bloqueando la vista
    window.addEventListener("pageshow", (event) => {
        if (event.persisted) {
            PageLoader.hide();
        }
    });
})();
