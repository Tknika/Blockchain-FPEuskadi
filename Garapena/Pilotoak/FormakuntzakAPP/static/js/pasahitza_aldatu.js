document.addEventListener('DOMContentLoaded', function() {
    // Crear la ventana modal dinámicamente
    var modalHtml = `
        <div class="modal" id="pasahitzaModal" tabindex="-1" role="dialog">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Cambiar Contraseña</h5>
                        <button type="button" class="border border-0 btn btn-lg" data-dismiss="modal" aria-label="Close" onclick="closeModal()">
                            <i class="bi bi-x-square"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="cambiarContrasenaForm">
                            <div class="form-group">
                                <label for="current_password">Contraseña Actual</label>
                                <input type="password" class="form-control" id="current_password" name="current_password" required>
                            </div>
                            <div class="form-group">
                                <label for="new_password">Nueva Contraseña</label>
                                <input type="password" class="form-control" id="new_password" name="new_password" required>
                            </div>
                            <div class="form-group">
                                <label for="confirm_password">Confirmar Nueva Contraseña</label>
                                <input type="password" class="form-control" id="confirm_password" name="confirm_password" required>
                            </div>
                            <div class="text-center mt-4">
                                <button type="submit" class="btn btn-primary">Cambiar Contraseña</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Manejar el envío del formulario de cambio de contraseña
    document.getElementById('cambiarContrasenaForm').addEventListener('submit', function(event) {
        event.preventDefault();
        var formData = new FormData(this);
        fetch('/pasahitza_aldatu', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                alert('Contraseña actualizada correctamente');
                closeModal();
            } else {
                alert(data.message);
            }
        })
        .catch(error => console.error('Error:', error));
    });

    // Función para abrir la ventana modal
    window.pasahitzaAldatu = function() {
        document.getElementById('pasahitzaModal').style.display = 'block';
    };

    // Función para cerrar la ventana modal
    window.closeModal = function() {
        document.getElementById('pasahitzaModal').style.display = 'none';
    };
});