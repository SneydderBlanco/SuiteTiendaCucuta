document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const errorMessage = document.getElementById("error-message");

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;
            const submitBtn = document.getElementById("submit-btn");
            const submitText = document.getElementById("submit-text");
            const submitIcon = document.getElementById("submit-icon");

            try {
                // Clear any previous error messages
                errorMessage.classList.add("hidden");
                errorMessage.textContent = "";

                // Cambiar estado a Verificando...
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.classList.add("opacity-80", "cursor-not-allowed");
                    submitText.textContent = "Verificando...";
                    submitIcon.textContent = "hourglass_empty";
                }

                const response = await API.login(email, password);
                const data = response.data;

                if (response.status === 200) {
                    // Login exitoso
                    localStorage.setItem('userName', data.nombre || 'Usuario');
                    localStorage.setItem('userRole', data.role);
                    localStorage.setItem('userId', data.id);
                    
                    // Smart Redirect
                    if (data.role === 'merchant') {
                        window.location.href = "dashboard-tendero.html";
                    } else {
                        window.location.href = "index.html";
                    }
                } else if (response.status === 401) {
                    errorMessage.textContent = "Usuario o contraseña incorrectos.";
                    errorMessage.classList.remove("hidden");
                    resetButton();
                } else {
                    // Mostrar error general
                    errorMessage.textContent = data.error || "Error inesperado. Inténtalo de nuevo.";
                    errorMessage.classList.remove("hidden");
                    resetButton();
                }
            } catch (error) {
                errorMessage.textContent = "Error al intentar conectarse al servidor.";
                errorMessage.classList.remove("hidden");
                resetButton();
            }

            function resetButton() {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.classList.remove("opacity-80", "cursor-not-allowed");
                    submitText.textContent = "Iniciar Sesión";
                    submitIcon.textContent = "arrow_forward";
                }
            }
        });
    }
});

// Función global para cerrar sesión (logout)
window.logout = function() {
    localStorage.removeItem("userName");
    localStorage.removeItem("userRole");
    // Redirige al login de inmediato
    window.location.href = "login.html";
};

// Password visibility toggle logic
const togglePasswordBtn = document.getElementById("toggle-password-btn");
if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener("click", () => {
        const p = document.getElementById("password");
        const icon = togglePasswordBtn.querySelector("span");
        if (p.type === "password") {
            p.type = "text";
            if (icon) icon.textContent = "visibility_off";
        } else {
            p.type = "password";
            if (icon) icon.textContent = "visibility";
        }
    });
}

// Global function to toggle modals
window.toggleModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.toggle('hidden');
        if (!modal.classList.contains('hidden')) {
            // Reset to step 1 when opening
            goToStep(1);
            document.getElementById("recovery-email").value = "";
            document.getElementById("new-pass").value = "";
            document.getElementById("confirm-pass").value = "";
        }
    }
};

window.goToStep = function(stepNumber) {
    const step1 = document.getElementById("recovery-step-1");
    const step2 = document.getElementById("recovery-step-2");
    if (stepNumber === 1) {
        step1.classList.remove('hidden');
        step2.classList.add('hidden');
    } else if (stepNumber === 2) {
        step1.classList.add('hidden');
        step2.classList.remove('hidden');
    }
};

// Password Recovery Logic
document.addEventListener("DOMContentLoaded", () => {
    const btnValidate = document.getElementById("btn-validate-account");
    const btnUpdate = document.getElementById("btn-update-password");
    let recoveryEmailTemp = "";

    if (btnValidate) {
        btnValidate.addEventListener("click", async () => {
            const emailInput = document.getElementById("recovery-email").value;
            if (!emailInput) {
                Utils.showAlert("Por favor, ingresa tu correo.");
                return;
            }
            
            const initText = btnValidate.innerHTML;
            btnValidate.disabled = true;
            btnValidate.innerHTML = "Validando...";

            try {
                const response = await API.validateEmail(emailInput);
                if (response.status === 200) {
                    recoveryEmailTemp = emailInput;
                    goToStep(2);
                } else {
                    Utils.showAlert(response.data.error || "No se pudo validar el correo.");
                }
            } catch (e) {
                Utils.showAlert("Error de conexión al servidor.");
            } finally {
                btnValidate.disabled = false;
                btnValidate.innerHTML = initText;
            }
        });
    }

    if (btnUpdate) {
        btnUpdate.addEventListener("click", async () => {
            const newPass = document.getElementById("new-pass").value;
            const confirmPass = document.getElementById("confirm-pass").value;

            if (!newPass || !confirmPass) {
                Utils.showAlert("Ambos campos son obligatorios.");
                return;
            }
            if (newPass !== confirmPass) {
                Utils.showAlert("Las contraseñas no coinciden.");
                return;
            }

            const initText = btnUpdate.innerHTML;
            btnUpdate.disabled = true;
            btnUpdate.innerHTML = "Actualizando...";

            try {
                const response = await API.updatePassword(recoveryEmailTemp, newPass);
                if (response.status === 200) {
                    Utils.showAlert("Contraseña actualizada con éxito. Ya puedes iniciar sesión.");
                    toggleModal('recovery-modal');
                } else {
                    Utils.showAlert(response.data.error || "Error al actualizar la contraseña.");
                }
            } catch (e) {
                Utils.showAlert("Error de conexión al servidor.");
            } finally {
                btnUpdate.disabled = false;
                btnUpdate.innerHTML = initText;
            }
        });
    }
});
