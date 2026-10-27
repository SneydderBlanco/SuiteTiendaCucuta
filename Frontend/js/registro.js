let currentRole = 'consumidor';
let pendingVerificationEmail = '';
let pendingRegistrationData = null;

window.toggleRole = function (role) {
    if (role === 'shopkeeper' || role === 'tendero' || role === 'merchant') {
        currentRole = 'tendero';
    } else {
        currentRole = 'consumidor';
    }

    const consumerBtn = document.getElementById('toggle-consumer');
    const shopkeeperBtn = document.getElementById('toggle-shopkeeper');
    const shopkeeperFields = document.getElementById('shopkeeper-only-fields');
    const shopkeeperInvite = document.getElementById('shopkeeper-invite-field');
    const emailLabel = document.getElementById('email-label');

    const inputTienda = document.getElementById('reg-tienda');
    const inputCodigo = document.getElementById('reg-codigo');

    if (currentRole === 'consumidor') {
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
    const btnCloseVerification = document.getElementById('btn-close-verification-modal');
    const btnCancelVerification = document.getElementById('btn-cancel-verification');
    const otpInputs = Array.from(document.querySelectorAll('.otp-digit-input'));

    function syncOtpToHiddenInput() {
        if (!verificationCodeInput || otpInputs.length === 0) return;
        const fullCode = otpInputs.map((inp) => inp.value.trim()).join('');
        verificationCodeInput.value = fullCode;
    }

    function clearOtpInputs() {
        otpInputs.forEach((inp) => {
            inp.value = '';
        });
        if (verificationCodeInput) {
            verificationCodeInput.value = '';
        }
    }

    // Configurar navegación interactiva de las 6 casillas OTP
    otpInputs.forEach((input, idx) => {
        input.addEventListener('input', (e) => {
            const cleanDigit = e.target.value.replace(/\D/g, '').slice(-1);
            e.target.value = cleanDigit;
            syncOtpToHiddenInput();

            if (cleanDigit && idx < otpInputs.length - 1) {
                otpInputs[idx + 1].focus();
                otpInputs[idx + 1].select();
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                if (!input.value && idx > 0) {
                    otpInputs[idx - 1].value = '';
                    syncOtpToHiddenInput();
                    otpInputs[idx - 1].focus();
                } else {
                    input.value = '';
                    syncOtpToHiddenInput();
                }
            } else if (e.key === 'ArrowLeft' && idx > 0) {
                e.preventDefault();
                otpInputs[idx - 1].focus();
            } else if (e.key === 'ArrowRight' && idx < otpInputs.length - 1) {
                e.preventDefault();
                otpInputs[idx + 1].focus();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                handleVerifyCode();
            }
        });

        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = (e.clipboardData || window.clipboardData).getData('text') || '';
            const digits = pastedData.replace(/\D/g, '').slice(0, 6).split('');
            if (digits.length === 0) return;

            digits.forEach((digit, i) => {
                if (otpInputs[i]) {
                    otpInputs[i].value = digit;
                }
            });
            syncOtpToHiddenInput();

            const nextFocusIndex = Math.min(digits.length, otpInputs.length - 1);
            if (otpInputs[nextFocusIndex]) {
                otpInputs[nextFocusIndex].focus();
            }
        });
    });

    function closeVerificationModal() {
        if (verificationModal) {
            verificationModal.classList.add('hidden');
        }
    }

    if (btnCloseVerification) {
        btnCloseVerification.addEventListener('click', closeVerificationModal);
    }
    if (btnCancelVerification) {
        btnCancelVerification.addEventListener('click', () => {
            closeVerificationModal();
            const emailInput = document.getElementById('reg-email');
            if (emailInput) emailInput.focus();
        });
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nombre = document.getElementById("reg-nombre").value.trim();
        const email = document.getElementById("reg-email").value.trim();
        const password = document.getElementById("reg-password").value;
        const nombreTienda = document.getElementById("reg-tienda") ? document.getElementById("reg-tienda").value.trim() : '';
        const codigoInvitacion = document.getElementById("reg-codigo") ? document.getElementById("reg-codigo").value.trim() : '';
        const rol = currentRole === 'tendero' ? 'tendero' : 'consumidor';

        let bodyPayload = {};

        if (rol === 'consumidor') {
            bodyPayload = {
                rol: 'consumidor',
                role: 'consumer',
                nombre,
                email,
                password,
                nombreTienda: '',
                codigoInvitacion: ''
            };
        } else if (rol === 'tendero') {
            bodyPayload = {
                rol: 'tendero',
                role: 'merchant',
                nombre,
                email,
                password,
                nombreTienda,
                nombre_tienda: nombreTienda,
                codigoInvitacion,
                codigo: codigoInvitacion
            };
        }

        const submitBtn = document.querySelector("#reg-form button[type='submit']");
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = "<span>Procesando...</span>";

        try {
            const response = await API.registro(bodyPayload);
            const data = response.data || {};

            if (response.status === 200 || response.status === 201) {
                if ((rol === 'tendero' || data.rol === 'tendero' || data.role === 'merchant') && data.requiresVerification === false) {
                    localStorage.setItem('userName', data.nombre || nombre || 'Usuario');
                    localStorage.setItem('userRole', data.role || 'merchant');
                    localStorage.setItem('userId', data.id);
                    window.location.href = "dashboard-tendero.html";
                    return;
                }

                // Abrir modal de verificación OTP tanto para Consumidor como para Tendero
                pendingVerificationEmail = email;
                pendingRegistrationData = {
                    id: data.id,
                    nombre: data.nombre || nombre || 'Usuario',
                    nombreTienda: data.nombreTienda || nombreTienda || '',
                    email: email,
                    rol: data.rol || rol,
                    role: data.role || (rol === 'tendero' ? 'merchant' : 'consumer')
                };

                if (verificationEmailDisplay) {
                    verificationEmailDisplay.textContent = pendingVerificationEmail;
                }
                clearOtpInputs();
                if (verificationModal) {
                    verificationModal.classList.remove('hidden');
                }
                if (otpInputs.length > 0) {
                    setTimeout(() => otpInputs[0].focus(), 100);
                } else if (verificationCodeInput) {
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
        syncOtpToHiddenInput();
        const codigo = verificationCodeInput ? verificationCodeInput.value.trim() : '';

        if (!codigo || codigo.length < 6) {
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'warning',
                    title: 'Código incompleto',
                    text: 'Por favor ingresa los 6 dígitos enviados a tu correo electrónico.',
                    confirmButtonColor: '#059669'
                });
            } else {
                Utils.showAlert("Por favor ingresa el código de 6 dígitos enviado a tu correo.");
            }
            return;
        }

        const originalBtnHtml = btnVerify ? btnVerify.innerHTML : 'Confirmar y Activar Cuenta';
        if (btnVerify) {
            btnVerify.disabled = true;
            btnVerify.innerHTML = '<span>Verificando código...</span>';
        }

        try {
            const apiUrlBase = (window.API_URL || 'http://localhost:3000').replace(/\/+$/, '');
            const response = await fetch(`${apiUrlBase}/api/auth/verificar-cliente`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: pendingVerificationEmail,
                    codigo: codigo,
                    rol: pendingRegistrationData?.rol || currentRole,
                    nombreTienda: pendingRegistrationData?.nombreTienda || ''
                })
            });

            const data = await response.json();

            if (response.ok && (response.status === 200 || response.status === 201)) {
                const userInfo = data.tendero || data.cliente || data.user || {};
                const finalName = data.nombre || userInfo.nombre || pendingRegistrationData?.nombre || 'Usuario';
                const finalId = data.id || userInfo.id_tendero || userInfo.id_cliente || userInfo.id || pendingRegistrationData?.id || '';
                const finalRol = data.rol || pendingRegistrationData?.rol || 'consumidor';
                const finalRole = data.role || (finalRol === 'tendero' ? 'merchant' : 'consumer');
                const finalNombreTienda = data.nombreTienda || userInfo.nombre_tienda || pendingRegistrationData?.nombreTienda || '';
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
                if (finalNombreTienda) {
                    localStorage.setItem('storeName', finalNombreTienda);
                }
                localStorage.setItem('user', JSON.stringify({
                    id: finalId,
                    nombre: finalName,
                    nombreTienda: finalNombreTienda,
                    email: pendingVerificationEmail,
                    rol: finalRol,
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

                if (finalRol === 'tendero' || finalRole === 'merchant') {
                    window.location.href = "dashboard-tendero.html";
                } else {
                    window.location.href = "index.html";
                }
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
