// CONFIGURACIÓN GLOBAL: Apuntando al backend real en Render
const API_URL = 'https://control-evaluacion-backend.onrender.com/api/estudiantes';
const NOTAS_URL = 'https://control-evaluacion-backend.onrender.com/api/notas';

// Sincronizar con el backend tan pronto cargue la interfaz
document.addEventListener('DOMContentLoaded', () => {
    mostrarSelectorDeRol();
    cargarDatosDesdeServidor();
});

// ==========================================
// 1. CONTROL DE ACCESO Y SELECCIÓN DE ROLES
// ==========================================

function mostrarSelectorDeRol() {
    const roleScreen = document.getElementById('role-selector-screen');
    const adminLogin = document.getElementById('admin-login-modal');
    const studentScreen = document.getElementById('student-portal-screen');
    const adminApp = document.getElementById('admin-app-container');

    if (roleScreen) roleScreen.style.display = 'flex';
    if (adminLogin) adminLogin.style.display = 'none';
    if (studentScreen) studentScreen.style.display = 'none';
    if (adminApp) adminApp.style.display = 'none';
}

// Abrir modal de Login Administrativo
function abrirLoginAdmin() {
    const roleScreen = document.getElementById('role-selector-screen');
    const adminLogin = document.getElementById('admin-login-modal');
    const errorMsg = document.getElementById('login-error');
    const formLogin = document.getElementById('form-admin-login');

    if (roleScreen) roleScreen.style.display = 'none';
    if (adminLogin) adminLogin.style.display = 'flex';
    if (errorMsg) errorMsg.style.display = 'none';
    if (formLogin) formLogin.reset();
}

// Volver al selector de roles inicial desde cualquier modal
function volverASeleccionRol() {
    mostrarSelectorDeRol();
}

// Validar credenciales de usuario y contraseña para Admin
function validarLoginAdmin(event) {
    event.preventDefault();
    
    const usuarioInput = document.getElementById('admin-user');
    const passInput = document.getElementById('admin-pass');
    const errorMsg = document.getElementById('login-error');

    const usuario = usuarioInput ? usuarioInput.value.trim() : '';
    const password = passInput ? passInput.value.trim() : '';

    // Credenciales por defecto
    if (usuario === 'ElPapu2500' && password === 'Arifureta25.') {
        const adminLogin = document.getElementById('admin-login-modal');
        const adminApp = document.getElementById('admin-app-container');

        if (adminLogin) adminLogin.style.display = 'none';
        if (adminApp) adminApp.style.display = 'flex';

        switchTab('dashboard');
    } else {
        if (errorMsg) errorMsg.style.display = 'block';
    }
}

function selectRole(role) {
    if (role === 'admin') {
        abrirLoginAdmin();
    } else if (role === 'student') {
        const roleScreen = document.getElementById('role-selector-screen');
        const studentScreen = document.getElementById('student-portal-screen');
        const adminApp = document.getElementById('admin-app-container');

        if (roleScreen) roleScreen.style.display = 'none';
        if (studentScreen) studentScreen.style.display = 'flex';
        if (adminApp) adminApp.style.display = 'none';
    }
}

function resetRoleSelection() {
    const cedulaInput = document.getElementById('student-cedula-input');
    const resultsContainer = document.getElementById('student-results-container');

    if (cedulaInput) cedulaInput.value = '';
    if (resultsContainer) resultsContainer.style.display = 'none';

    mostrarSelectorDeRol();
}

// Consulta pública para el rol "Estudiante"
function fetchStudentGrades(event) {
    if (event) event.preventDefault();

    const cedulaInput = document.getElementById('student-cedula-input');
    const resultsContainer = document.getElementById('student-results-container');
    const resName = document.getElementById('res-student-name');
    const resCedula = document.getElementById('res-student-cedula');
    const tbody = document.getElementById('res-student-grades-body');

    if (!cedulaInput || !resultsContainer || !tbody) return;

    const cedula = cedulaInput.value.trim();

    if (!cedula) {
        alert("Por favor, ingrese su número de cédula.");
        return;
    }

    resultsContainer.style.display = 'block';
    if (resName) resName.innerText = "Buscando información...";
    if (resCedula) resCedula.innerText = cedula;
    tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #2563eb; padding: 1rem;">Consultando calificaciones en el sistema...</td></tr>`;

    // 1. Obtener la lista general para el nombre
    fetch(API_URL)
        .then(res => res.json())
        .then(estudiantes => {
            const estudiante = estudiantes.find(est => String(est.cedula).trim().toLowerCase() === cedula.toLowerCase());
            if (estudiante && resName) {
                resName.innerText = estudiante.nombres;
            } else if (resName) {
                resName.innerText = "Estudiante no registrado";
            }
        })
        .catch(() => {
            if (resName) resName.innerText = "Estudiante (Expediente)";
        });

    // 2. Consultar notas
    fetch(`${NOTAS_URL}/${encodeURIComponent(cedula)}`)
        .then(response => {
            if (!response.ok) throw new Error("No se pudo obtener información del estudiante.");
            return response.json();
        })
        .then(notas => {
            tbody.innerHTML = '';

            if (!Array.isArray(notas) || notas.length === 0) {
                tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #dc2626; padding: 1rem;">No se encontraron evaluaciones registradas para la cédula ${cedula}.</td></tr>`;
                return;
            }

            notas.forEach(n => {
                const tr = document.createElement('tr');
                const aprobado = parseFloat(n.nota) >= 12.0;
                const estadoSpan = aprobado 
                    ? `<span style="color: #16a34a; font-weight: bold; background: #dcfce7; padding: 4px 8px; border-radius: 4px;">Aprobado</span>`
                    : `<span style="color: #dc2626; font-weight: bold; background: #fee2e2; padding: 4px 8px; border-radius: 4px;">Reprobado</span>`;

                tr.innerHTML = `
                    <td>${n.materia}</td>
                    <td><strong>${parseFloat(n.nota).toFixed(1)}</strong></td>
                    <td>${estadoSpan}</td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(error => {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #dc2626; padding: 1rem;">${error.message}</td></tr>`;
        });
}

// ==========================================
// 2. LÓGICA GENERAL Y NAVEGACIÓN PANEL ADMIN
// ==========================================

function cargarDatosDesdeServidor(tabActual = 'dashboard') {
    fetch(API_URL)
        .then(response => response.json())
        .then(estudiantes => {
            window.baseDeDatosEstudiantes = estudiantes;

            const contador = document.getElementById('counter-total');
            if (contador) contador.innerText = estudiantes.length;

            poblarSelectores();
            renderizarListasDeSecciones();

            const yearDetailsPanel = document.getElementById('year-details-panel');
            if (tabActual === 'matricula' && yearDetailsPanel && yearDetailsPanel.style.display === 'block') {
                const titulo = document.getElementById('current-viewing-year').innerText;
                const match = titulo.match(/\d+/);
                if (match) {
                    showYearDetails(match[0]);
                }
            }
        })
        .catch(error => console.error("Error al sincronizar con el servidor Backend:", error));
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-menu a').forEach(link => link.classList.remove('active'));

    const targetTab = document.getElementById(`tab-${tabId}`);
    if (targetTab) targetTab.classList.add('active');

    const activeLink = Array.from(document.querySelectorAll('.nav-menu a')).find(link => link.getAttribute('onclick')?.includes(tabId));
    if (activeLink) activeLink.classList.add('active');

    cargarDatosDesdeServidor(tabId);

    if (tabId === 'notas') {
        // Resetear el selector de estudiantes al entrar a la pestaña de Cargar Notas
        const yearSelect = document.getElementById('select-year-grade');
        if (yearSelect) yearSelect.value = '';
        filtrarEstudiantesYMateriasPorAnio();
    }

    if (tabId !== 'matricula') {
        backToYearMenu();
    }
}

function saveStudent(event) {
    event.preventDefault();

    const nuevoEstudiante = {
        cedula: document.getElementById('cedula').value.trim(),
        nombres: document.getElementById('nombres').value.trim(),
        edad: document.getElementById('edad').value.trim(),
        correo: document.getElementById('correo').value.trim(),
        telefono: document.getElementById('telefono').value.trim() || null
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

function assignToYear(year) {
    const select = document.getElementById(`select-year-${year}`);
    if (!select) return;

    const cedulaSeleccionada = select.value;

    if (!cedulaSeleccionada) {
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

function renderizarListasDeSecciones() {
    const estudiantes = window.baseDeDatosEstudiantes || [];
    for (let i = 1; i <= 5; i++) {
        const lista = document.getElementById(`list-year-${i}`);
        if (!lista) continue;
        lista.innerHTML = '';

        const inscritos = estudiantes.filter(est => Number(est.anio_asignado) === i);
        inscritos.forEach(est => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${est.nombres}</span> <strong>${est.cedula}</strong>`;
            lista.appendChild(li);
        });
    }
}

let currentSelectedYear = null;

function showYearDetails(year) {
    currentSelectedYear = year;
    const yearMenuGrid = document.getElementById('year-menu-grid');
    const yearDetailsPanel = document.getElementById('year-details-panel');
    const studentGradesPanel = document.getElementById('student-grades-panel');

    if (yearMenuGrid) yearMenuGrid.style.display = 'none';
    if (yearDetailsPanel) yearDetailsPanel.style.display = 'block';
    if (studentGradesPanel) studentGradesPanel.style.display = 'none';

    document.getElementById('current-viewing-year').innerText = `Estudiantes Inscritos: ${year}° Año`;

    const estudiantes = window.baseDeDatosEstudiantes || [];
    const estudiantesDelAnio = estudiantes.filter(est => Number(est.anio_asignado) === parseInt(year));

    const tbody = document.getElementById('table-students-body');
    tbody.innerHTML = '';

    if (estudiantesDelAnio.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="no-data-msg" style="text-align: center; padding: 1rem;">No hay estudiantes inscritos en este año actualmente.</td></tr>`;
        return;
    }

    estudiantesDelAnio.forEach(est => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${est.cedula}</strong></td>
            <td>${est.nombres}</td>
            <td>${est.correo}</td>
            <td>
                <button class="btn-assign" onclick="verNotasEstudiante('${est.cedula}', '${est.nombres}')">Ver Notas</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function backToYearMenu() {
    const yearMenuGrid = document.getElementById('year-menu-grid');
    const yearDetailsPanel = document.getElementById('year-details-panel');
    const studentGradesPanel = document.getElementById('student-grades-panel');

    if (yearMenuGrid) yearMenuGrid.style.display = 'grid';
    if (yearDetailsPanel) yearDetailsPanel.style.display = 'none';
    if (studentGradesPanel) studentGradesPanel.style.display = 'none';
}

function backToStudentsTable() {
    const yearDetailsPanel = document.getElementById('year-details-panel');
    const studentGradesPanel = document.getElementById('student-grades-panel');

    if (yearDetailsPanel) yearDetailsPanel.style.display = 'block';
    if (studentGradesPanel) studentGradesPanel.style.display = 'none';
}

function verNotasEstudiante(cedula, nombres) {
    const yearDetailsPanel = document.getElementById('year-details-panel');
    const studentGradesPanel = document.getElementById('student-grades-panel');

    if (yearDetailsPanel) yearDetailsPanel.style.display = 'none';
    if (studentGradesPanel) studentGradesPanel.style.display = 'block';

    document.getElementById('current-student-name').innerText = `Boleta de: ${nombres}`;
    document.getElementById('current-student-id').innerText = `Cédula: ${cedula}`;

    const tbody = document.getElementById('table-grades-body');
    tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #2563eb; padding: 1rem;">Cargando notas...</td></tr>`;

    fetch(`${NOTAS_URL}/${encodeURIComponent(cedula)}`)
        .then(res => res.json())
        .then(notas => {
            tbody.innerHTML = '';
            if (!Array.isArray(notas) || notas.length === 0) {
                tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #64748b; padding: 1rem;">Sin notas registradas.</td></tr>`;
                return;
            }

            notas.forEach(n => {
                const tr = document.createElement('tr');
                const aprobado = parseFloat(n.nota) >= 12.0;
                const estadoSpan = aprobado 
                    ? `<span style="color: #16a34a; font-weight: bold; background: #dcfce7; padding: 4px 8px; border-radius: 4px;">Aprobado</span>`
                    : `<span style="color: #dc2626; font-weight: bold; background: #fee2e2; padding: 4px 8px; border-radius: 4px;">Reprobado</span>`;

                tr.innerHTML = `
                    <td>${n.materia}</td>
                    <td><strong>${parseFloat(n.nota).toFixed(1)}</strong></td>
                    <td>${estadoSpan}</td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(err => {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #dc2626; padding: 1rem;">Error al cargar las notas.</td></tr>`;
        });
}

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