// CONFIGURACIÓN GLOBAL: Apuntando al backend real en Render
const API_URL = 'https://control-evaluacion-backend.onrender.com/api/estudiantes';
const NOTAS_URL = 'https://control-evaluacion-backend.onrender.com/api/notas';

// Sincronizar con el backend tan pronto cargue la interfaz
document.addEventListener('DOMContentLoaded', () => {
    cargarDatosDesdeServidor();
});

// Consulta el estado de la base de datos MySQL
function cargarDatosDesdeServidor(tabActual = 'dashboard') {
    fetch(API_URL)
        .then(response => response.json())
        .then(estudiantes => {
            // Guardar en el objeto window para leerlo desde cualquier función
            window.baseDeDatosEstudiantes = estudiantes;

            // Actualizar el Dashboard
            const contador = document.getElementById('counter-total');
            if (contador) contador.innerText = estudiantes.length;

            // Refrescar las listas de asignación y desplegables
            poblarSelectores();
            renderizarListasDeSecciones();

            // Si el usuario está auditando una tabla, refrescarla en vivo
            if (tabActual === 'matricula' && document.getElementById('year-details-panel').style.display === 'block') {
                // Re-extrae el número de año que se estaba viendo
                const titulo = document.getElementById('current-viewing-year').innerText;
                const anio = titulo.match(/\d+/)[0];
                showYearDetails(anio);
            }
        })
        .catch(error => console.error("Error al sincronizar con el servidor Backend:", error));
}

// Navegación entre vistas principales
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-menu a').forEach(link => link.classList.remove('active'));
    
    document.getElementById(`tab-${tabId}`).classList.add('active');
    
    const activeLink = Array.from(document.querySelectorAll('.nav-menu a')).find(link => link.getAttribute('onclick').includes(tabId));
    if(activeLink) activeLink.classList.add('active');

    // Forzar lectura fresca del servidor cada vez que cambiamos de vista
    cargarDatosDesdeServidor(tabId);

    if(tabId !== 'matricula') {
        backToYearMenu();
    }
}

// Guardar estudiante mediante la API (POST)
function saveStudent(event) {
    event.preventDefault();

    const nuevoEstudiante = {
        cedula: document.getElementById('cedula').value,
        nombres: document.getElementById('nombres').value,
        edad: document.getElementById('edad').value,
        correo: document.getElementById('correo').value,
        telefono: document.getElementById('telefono').value || null
    };

    fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoEstudiante)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert("Error: " + data.error);
        } else {
            alert("Estudiante guardado exitosamente en MySQL.");
            document.getElementById('student-form').reset();
            switchTab('dashboard');
        }
    })
    .catch(error => alert("El servidor backend no responde."));
}

// Llena los elementos <select> con estudiantes que no tienen año asignado
function poblarSelectores() {
    const estudiantes = window.baseDeDatosEstudiantes || [];
    const disponibles = estudiantes.filter(est => est.anio_asignado === null);

    for (let i = 1; i <= 5; i++) {
        const select = document.getElementById(`select-year-${i}`);
        if (!select) continue;
        select.innerHTML = '<option value="">-- Seleccionar --</option>';

        disponibles.forEach(est => {
            const option = document.createElement('option');
            option.value = est.cedula;
            option.text = `${est.nombres} (${est.cedula})`;
            select.appendChild(option);
        });
    }
}

// Actualiza el año académico del estudiante en la base de datos (PUT)
function assignToYear(year) {
    const select = document.getElementById(`select-year-${year}`);
    const cedulaSeleccionada = select.value;

    if(!cedulaSeleccionada) {
        alert("Por favor, selecciona un estudiante de la lista desplegable.");
        return;
    }

    fetch(`${API_URL}/asignar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula: cedulaSeleccionada, year: year })
    })
    .then(response => response.json())
    .then(data => {
        alert("Estudiante asignado correctamente.");
        cargarDatosDesdeServidor('secciones');
    })
    .catch(error => console.error("Error en la operación de asignación:", error));
}

// Dibuja las listas rápidas debajo de las tarjetas de asignación
function renderizarListasDeSecciones() {
    const estudiantes = window.baseDeDatosEstudiantes || [];
    for (let i = 1; i <= 5; i++) {
        const lista = document.getElementById(`list-year-${i}`);
        if (!lista) continue;
        lista.innerHTML = '';

        const inscritos = estudiantes.filter(est => est.anio_asignado === i);
        inscritos.forEach(est => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${est.nombres}</span> <strong>${est.cedula}</strong>`;
            lista.appendChild(li);
        });
    }
}

let currentSelectedYear = null;

// Muestra los estudiantes correspondientes al año elegido
function showYearDetails(year) {
    currentSelectedYear = year;
    document.getElementById('year-menu-grid').style.display = 'none';
    document.getElementById('year-details-panel').style.display = 'block';
    document.getElementById('student-grades-panel').style.display = 'none';
    document.getElementById('current-viewing-year').innerText = `Estudiantes Inscritos: ${year}° Año`;

    const estudiantes = window.baseDeDatosEstudiantes || [];
    const estudiantesDelAnio = estudiantes.filter(est => est.anio_asignado === parseInt(year));
    
    const tbody = document.getElementById('table-students-body');
    tbody.innerHTML = '';

    if(estudiantesDelAnio.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="no-data-msg">No hay estudiantes inscritos en este año actualmente.</td></tr>`;
        return;
    }

    estudiantesDelAnio.forEach(est => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${est.cedula}</strong></td>
            <td>${est.nombres}</td>
            <td>${est.correo}</td>
            <td>
                <button class="btn-assign" style="padding: 6px 12px; font-size: 0.85rem;" onclick="viewStudentGrades('${est.cedula}', '${est.nombres}')">
                    <i class='bx bx-search-alt'></i> Ver Notas
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Visualizar calificaciones del estudiante desde la URL de Render
function viewStudentGrades(cedula, nombres) {
    document.getElementById('year-details-panel').style.display = 'none';
    document.getElementById('student-grades-panel').style.display = 'block';
    
    document.getElementById('current-student-name').innerText = `Resumen Académico: ${nombres}`;
    document.getElementById('current-student-id').innerText = `Cédula de Identidad: ${cedula}`;

    fetch(`${NOTAS_URL}/${cedula}`)
        .then(response => response.json())
        .then(notas => {
            const tbody = document.getElementById('table-grades-body');
            tbody.innerHTML = '';

            if (notas.length === 0) {
                tbody.innerHTML = `<tr><td colspan="3" class="no-data-msg">El estudiante no registra evaluaciones cargadas en este período.</td></tr>`;
                return;
            }

            notas.forEach(n => {
                const fila = document.createElement('tr');
                
                // CONDICIÓN: 12 o más aprueba, menor a 12 reprueba
                const aprobado = parseFloat(n.nota) >= 12.0; 
                
                const estadoSpan = aprobado 
                    ? `<span style="color: #16a34a; font-weight: bold; background: #dcfce7; padding: 4px 8px; border-radius: 4px;">Aprobado</span>`
                    : `<span style="color: #dc2626; font-weight: bold; background: #fee2e2; padding: 4px 8px; border-radius: 4px;">Reprobado</span>`;

                fila.innerHTML = `
                    <td>${n.materia}</td>
                    <td><strong>${parseFloat(n.nota).toFixed(1)}</strong></td>
                    <td>${estadoSpan}</td>
                `;
                tbody.appendChild(fila);
            });
        })
        .catch(error => console.error("Error al obtener calificaciones:", error));
}

// Navegación de regreso en los paneles
function backToStudentsTable() {
    document.getElementById('student-grades-panel').style.display = 'none';
    document.getElementById('year-details-panel').style.display = 'block';
    if(currentSelectedYear) showYearDetails(currentSelectedYear);
}

function backToYearMenu() {
    const menuGrid = document.getElementById('year-menu-grid');
    const detailsPanel = document.getElementById('year-details-panel');
    if (menuGrid && detailsPanel) {
        menuGrid.style.display = 'grid';
        detailsPanel.style.display = 'none';
    }
}

// Resetea el formulario de notas al entrar a la pestaña
function poblarSelectorNotas() {
    const selectAnio = document.getElementById('select-year-grade');
    const selectEstudiante = document.getElementById('select-student-grade');
    
    if (selectAnio) selectAnio.value = "";
    if (selectEstudiante) {
        selectEstudiante.innerHTML = '<option value="">-- Selecciona primero un año --</option>';
        selectEstudiante.disabled = true;
    }
}

// Se ejecuta cuando cambias el año en la pestaña de Cargar Notas
function filtrarEstudiantesPorAnio() {
    const anioSeleccionado = document.getElementById('select-year-grade').value;
    const selectEstudiante = document.getElementById('select-student-grade');
    
    if (!selectEstudiante) return;

    if (!anioSeleccionado) {
        selectEstudiante.innerHTML = '<option value="">-- Selecciona primero un año --</option>';
        selectEstudiante.disabled = true;
        return;
    }

    const estudiantes = window.baseDeDatosEstudiantes || [];
    const estudiantesDelAnio = estudiantes.filter(est => est.anio_asignado === parseInt(anioSeleccionado));

    selectEstudiante.innerHTML = '<option value="">-- Seleccionar Estudiante --</option>';

    if (estudiantesDelAnio.length === 0) {
        selectEstudiante.innerHTML = '<option value="">No hay estudiantes inscritos en este año</option>';
        selectEstudiante.disabled = true;
        return;
    }

    selectEstudiante.disabled = false;
    estudiantesDelAnio.forEach(est => {
        const option = document.createElement('option');
        option.value = est.cedula;
        option.text = `${est.nombres} (${est.cedula})`;
        selectEstudiante.appendChild(option);
    });
}

// Envía la calificación registrada al servidor backend en Render (POST)
function saveGrade(event) {
    event.preventDefault();

    const nuevaNota = {
        cedula: document.getElementById('select-student-grade').value,
        materia: document.getElementById('materia').value,
        nota: document.getElementById('nota').value
    };

    fetch(NOTAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaNota)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert("Error: " + data.error);
        } else {
            alert("Calificación registrada con éxito en MySQL.");
            document.getElementById('notes-form').reset();
            switchTab('dashboard');
        }
    })
    .catch(error => alert("No se pudo conectar con el servidor backend."));
}