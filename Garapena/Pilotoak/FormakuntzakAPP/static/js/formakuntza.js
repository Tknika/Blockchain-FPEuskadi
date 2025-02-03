document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('family').addEventListener('change', function() {
        var familia_id = this.value;
        if (familia_id) {
            fetch('/zikloak/' + familia_id)
                .then(response => response.json())
                .then(data => {
                    var cycleSelect = document.getElementById('cycle');
                    cycleSelect.innerHTML = '';
                    var option = document.createElement('option');
                    option.value = "";
                    option.textContent = "";
                    cycleSelect.appendChild(option);
                    data.forEach(function(ciclo) {
                        var option = document.createElement('option');
                        option.value = ciclo.id;
                        option.textContent = ciclo.izena;
                        cycleSelect.appendChild(option);
                    });
                })
                .catch(error => console.error('Error:', error));
        } else {
            document.getElementById('cycle').innerHTML = '';
        }
    });
});

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('form.ikasle-form').forEach(function(form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();
            var formData = new FormData(form);
            fetch('/ikaslea_aldatu/', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    alert('Alumno actualizado correctamente');
                } else {
                    alert('Error al actualizar el alumno');
                }
            })
            .catch(error => console.error('Error:', error));
        });
    });
});