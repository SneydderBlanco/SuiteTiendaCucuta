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
