let currentRole = 'consumer';
let pendingVerificationEmail = '';
let pendingRegistrationData = null;

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
};

document.addEventListener("DOMContentLoaded", () => {
    // Init state
    document.getElementById('reg-tienda').required = false;
    document.getElementById('reg-codigo').required = false;

    const form = document.getElementById('reg-form');
    const verificationModal = document.getElementById('verification-modal');
    const verificationCodeInput = document.getElementById('verification-code');
    const verificationEmailDisplay = document.getElementById('verification-email-display');
    const btnVerify = document.getElementById('btn-verify');

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nombre = document.getElementById("reg-nombre").value.trim();
        const email = document.getElementById("reg-email").value.trim();
        const password = document.getElementById("reg-password").value;

        let bodyPayload = {};

        if (currentRole === 'consumer') {
            bodyPayload = { role: 'consumer', nombre, email, password };
        } else if (currentRole === 'merchant') {
            const nombre_tienda = document.getElementById("reg-tienda").value.trim();
            const codigo = document.getElementById("reg-codigo").value.trim();
            bodyPayload = { role: 'merchant', nombre, nombre_tienda, email, password, codigo };
        }

        const submitBtn = document.querySelector("#reg-form button[type='submit']");
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = "<span>Procesando...</span>";

        try {
            const response = await API.registro(bodyPayload);
            const data = response.data || {};

            if (response.status === 200 || response.status === 201) {
                if (currentRole === 'merchant' && !data.requiresVerification) {
                    localStorage.setItem('userName', data.nombre || nombre || 'Usuario');
                    localStorage.setItem('userRole', data.role || 'merchant');
                    localStorage.setItem('userId', data.id);
                    window.location.href = "dashboard-tendero.html";
                    return;
                }

                // Flujo de Cliente: NO guardar sesión ni redirigir aún; abrir modal de verificación
                pendingVerificationEmail = email;
                pendingRegistrationData = {
                    id: data.id,
                    nombre: data.nombre || nombre || 'Usuario',
                    email: email,
                    role: data.role || 'consumer'
                };

                if (verificationEmailDisplay) {
                    verificationEmailDisplay.textContent = pendingVerificationEmail;
                }
                if (verificationCodeInput) {
                    verificationCodeInput.value = '';
                }
                if (verificationModal) {
                    verificationModal.classList.remove('hidden');
                }
                if (verificationCodeInput) {
                    setTimeout(() => verificationCodeInput.focus(), 100);
                }

                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            } else {
                const errorMsg = data.error || "Error al registrar la cuenta";
                if (verificationModal) {
                    verificationModal.classList.add('hidden');
                }
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Atención',
                        text: errorMsg,
                        confirmButtonColor: '#059669',
                        confirmButtonText: 'Entendido'
                    });
                } else {
                    Utils.showAlert(errorMsg);
                }
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                return;
            }
        } catch (error) {
            if (verificationModal) {
                verificationModal.classList.add('hidden');
            }
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'warning',
                    title: 'Error de conexión',
                    text: 'No se pudo conectar con el servidor. Inténtalo nuevamente.',
                    confirmButtonColor: '#059669'
                });
            } else {
                Utils.showAlert("Error de conexión");
            }
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });

    async function handleVerifyCode() {
        const codigo = verificationCodeInput ? verificationCodeInput.value.trim() : '';

        if (!codigo || codigo.length < 6) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'warning',
                    title: 'Código incompleto',
                    text: 'Por favor ingresa el código de 6 dígitos enviado a tu correo.',
                    confirmButtonColor: '#059669'
                });
            } else {
                Utils.showAlert("Por favor ingresa el código de 6 dígitos enviado a tu correo.");
            }
            return;
        }

        const originalBtnHtml = btnVerify ? btnVerify.innerHTML : 'Verificar';
        if (btnVerify) {
            btnVerify.disabled = true;
            btnVerify.innerHTML = '<span>Verificando...</span>';
        }

        try {
            const apiUrlBase = (window.API_URL || 'http://localhost:3000').replace(/\/+$/, '');
            const response = await fetch(`${apiUrlBase}/api/auth/verificar-cliente`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: pendingVerificationEmail,
                    codigo: codigo
                })
            });

            const data = await response.json();

            if (response.ok && (response.status === 200 || response.status === 201)) {
                const clienteInfo = data.cliente || data.user || {};
                const finalName = data.nombre || clienteInfo.nombre || pendingRegistrationData?.nombre || 'Usuario';
                const finalId = data.id || clienteInfo.id_cliente || clienteInfo.id || pendingRegistrationData?.id || '';
                const finalRole = data.role || 'consumer';
                const finalToken = data.token || '';

                // Guardar datos de sesión en localStorage tras verificar exitosamente
                if (finalToken) {
                    localStorage.setItem('token', finalToken);
                }
                localStorage.setItem('userName', finalName);
                localStorage.setItem('userRole', finalRole);
                if (finalId) {
                    localStorage.setItem('userId', finalId);
                }
                localStorage.setItem('user', JSON.stringify({
                    id: finalId,
                    nombre: finalName,
                    email: pendingVerificationEmail,
                    role: finalRole,
                    verificado: true
                }));

                if (verificationModal) {
                    verificationModal.classList.add('hidden');
                }

                if (typeof Swal !== 'undefined') {
                    await Swal.fire({
                        icon: 'success',
                        title: '¡Cuenta verificada!',
                        text: data.message || 'Tu correo ha sido confirmado exitosamente. Bienvenido a Tiendas Cúcuta.',
                        confirmButtonColor: '#059669',
                        confirmButtonText: 'Continuar'
                    });
                } else {
                    Utils.showAlert(data.message || "¡Cuenta verificada exitosamente!");
                }

                window.location.href = "index.html";
            } else {
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'error',
                        title: 'Código inválido',
                        text: data.error || 'El código ingresado no es válido. Inténtalo de nuevo.',
                        confirmButtonColor: '#059669'
                    });
                } else {
                    Utils.showAlert(data.error || "Código de verificación incorrecto.");
                }
                if (btnVerify) {
                    btnVerify.disabled = false;
                    btnVerify.innerHTML = originalBtnHtml;
                }
            }
        } catch (error) {
            console.error("Error verificando código:", error);
            Utils.showAlert("Error de conexión al verificar el código.");
            if (btnVerify) {
                btnVerify.disabled = false;
                btnVerify.innerHTML = originalBtnHtml;
            }
        }
    }

    if (btnVerify) {
        btnVerify.addEventListener("click", handleVerifyCode);
    }

    if (verificationCodeInput) {
        verificationCodeInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                handleVerifyCode();
            }
        });
    }
});
