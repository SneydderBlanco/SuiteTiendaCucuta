let currentRole = 'consumer';

window.toggleRole = function (role) {
    if (role === 'shopkeeper') {
        currentRole = 'merchant';
    } else {
        currentRole = 'consumer';
    }

    const consumerBtn = document.getElementById('toggle-consumer');
    const shopkeeperBtn = document.getElementById('toggle-shopkeeper');
    const shopkeeperFields = document.getElementById('shopkeeper-only-fields');
    const shopkeeperInvite = document.getElementById('shopkeeper-invite-field');
    const emailLabel = document.getElementById('email-label');

    const inputTienda = document.getElementById('reg-tienda');
    const inputCodigo = document.getElementById('reg-codigo');

    if (currentRole === 'consumer') {
        consumerBtn.classList.add('bg-surface-container-lowest', 'text-primary', 'shadow-sm');
        consumerBtn.classList.remove('text-on-surface-variant', 'hover:bg-surface-container-high');
        shopkeeperBtn.classList.remove('bg-surface-container-lowest', 'text-primary', 'shadow-sm');
        shopkeeperBtn.classList.add('text-on-surface-variant', 'hover:bg-surface-container-high');

        shopkeeperFields.classList.add('hidden');
        shopkeeperInvite.classList.add('hidden');
        emailLabel.innerText = "Correo Electrónico";
        inputTienda.required = false;
        inputCodigo.required = false;
    } else {
        shopkeeperBtn.classList.add('bg-surface-container-lowest', 'text-primary', 'shadow-sm');
        shopkeeperBtn.classList.remove('text-on-surface-variant', 'hover:bg-surface-container-high');
        consumerBtn.classList.remove('bg-surface-container-lowest', 'text-primary', 'shadow-sm');
        consumerBtn.classList.add('text-on-surface-variant', 'hover:bg-surface-container-high');

        shopkeeperFields.classList.remove('hidden');
        shopkeeperInvite.classList.remove('hidden');
        emailLabel.innerText = "Correo Corporativo";
        inputTienda.required = true;
        inputCodigo.required = true;
    }
}

document.addEventListener("DOMContentLoaded", () => {

    // Init state
    document.getElementById('reg-tienda').required = false;
    document.getElementById('reg-codigo').required = false;

    const form = document.getElementById('reg-form');

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nombre = document.getElementById("reg-nombre").value;
        const email = document.getElementById("reg-email").value;
        const password = document.getElementById("reg-password").value;

        let bodyPayload = {};

        if (currentRole === 'consumer') {
            bodyPayload = { role: 'consumer', nombre, email, password };
        } else if (currentRole === 'merchant') {
            const nombre_tienda = document.getElementById("reg-tienda").value;
            const codigo = document.getElementById("reg-codigo").value;
            bodyPayload = { role: 'merchant', nombre, nombre_tienda, email, password, codigo };
        }

        const submitBtn = document.querySelector("#reg-form button[type='submit']");
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = "<span>Procesando...</span>";

        try {
            const response = await API.registro(bodyPayload);
            const data = response.data;
            
            if (response.status === 200) {
                localStorage.setItem('userName', data.nombre || 'Usuario');
                localStorage.setItem('userRole', data.role);
                localStorage.setItem('userId', data.id);
                
                if (data.role === 'merchant') {
                    window.location.href = "dashboard-tendero.html";
                } else {
                    window.location.href = "index.html";
                }
            } else {
                Utils.showAlert(data.error || "Error al registrar la cuenta");
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        } catch (error) {
            Utils.showAlert("Error de conexión");
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
});
