// Banco Municipal de Vivienda Vacía - Aibar/Oibar
// JavaScript Application

// Global variables
let map;
let markers = [];
let currentTab = 'mapa';
let isAdminLoggedIn = false;
let chart;

// Configuration and initial data
const CONFIG = {
    CENTRO_MAPA: [42.5639, -1.2103],
    ZOOM_INICIAL: 16,
    PASSWORD_ADMIN: 'aibar2025'
};

const ESTADOS_VIVIENDA = {
    habitada: { color: '#22c55e', nombre: 'Habitada' },
    vacia: { color: '#f59e0b', nombre: 'Vacía' },
    abandonada: { color: '#ef4444', nombre: 'Abandonada' },
    en_venta: { color: '#3b82f6', nombre: 'En Venta' },
    rehabilitacion: { color: '#8b5cf6', nombre: 'En Rehabilitación' }
};

// Initial data
const VIVIENDAS_INICIALES = [
    {
        id: 1,
        direccion: "Calle Mayor 17",
        estado: "vacia",
        descripcion: "Casa tradicional en casco histórico",
        propietario: "Casa Canturro",
        contacto: "",
        precio: "",
        lat: 42.5639,
        lng: -1.2103,
        superficie: "169 m²",
        año: "1900",
        tipo: "vivienda"
    },
    {
        id: 2,
        direccion: "Opaco 28",
        estado: "abandonada",
        descripcion: "Vivienda en estado de abandono",
        propietario: "Joaquin Ibero",
        contacto: "",
        precio: "",
        lat: 42.5642,
        lng: -1.2108,
        superficie: "240 m²",
        año: "1900",
        tipo: "vivienda"
    },
    {
        id: 3,
        direccion: "La Reja 9",
        estado: "en_venta",
        descripcion: "Casa en venta en buen estado",
        propietario: "Casa Longas",
        contacto: "",
        precio: "",
        lat: 42.5635,
        lng: -1.2098,
        superficie: "287 m²",
        año: "1900",
        tipo: "vivienda"
    }
];

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Initialize data if not exists
    if (!localStorage.getItem('viviendas')) {
        localStorage.setItem('viviendas', JSON.stringify(VIVIENDAS_INICIALES));
    }
    if (!localStorage.getItem('interesados')) {
        localStorage.setItem('interesados', JSON.stringify([]));
    }

    // Initialize components
    initializeNavigation();
    initializeMap();
    initializeForms();
    initializeAdmin();
    initializeModals();
    
    // Load initial data
    loadLegend();
    updateUI();
}

// Navigation System
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetTab = this.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });
}

function switchTab(tabName) {
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    currentTab = tabName;

    // Special handling for map tab
    if (tabName === 'mapa') {
        setTimeout(() => {
            if (map) {
                map.invalidateSize();
                loadMapMarkers();
            }
        }, 100);
    }

    // Special handling for admin tab
    if (tabName === 'admin' && isAdminLoggedIn) {
        loadAdminData();
    }
}

// Map System
function initializeMap() {
    map = L.map('map').setView(CONFIG.CENTRO_MAPA, CONFIG.ZOOM_INICIAL);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    loadMapMarkers();
    setupMapControls();
}

function loadMapMarkers() {
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    const viviendas = getViviendas();
    const filtroEstado = document.getElementById('filter-estado').value;

    viviendas.forEach(vivienda => {
        if (filtroEstado !== 'todos' && vivienda.estado !== filtroEstado) {
            return;
        }

        const estadoConfig = ESTADOS_VIVIENDA[vivienda.estado];
        
        const marker = L.circleMarker([vivienda.lat, vivienda.lng], {
            color: '#fff',
            weight: 2,
            fillColor: estadoConfig.color,
            fillOpacity: 0.8,
            radius: 8
        }).addTo(map);

        const popupContent = `
            <div>
                <h4>${vivienda.direccion}</h4>
                <p><strong>Estado:</strong> ${estadoConfig.nombre}</p>
                <p><strong>Propietario:</strong> ${vivienda.propietario}</p>
                <p><strong>Superficie:</strong> ${vivienda.superficie || 'No especificada'}</p>
                ${vivienda.descripcion ? `<p><strong>Descripción:</strong> ${vivienda.descripcion}</p>` : ''}
                <button onclick="mostrarDetalleVivienda(${vivienda.id})" class="btn btn--primary btn--sm" style="margin-top: 8px;">Ver detalles</button>
            </div>
        `;

        marker.bindPopup(popupContent);
        markers.push(marker);
    });
}

function setupMapControls() {
    // Filter control
    document.getElementById('filter-estado').addEventListener('change', loadMapMarkers);

    // Search control
    document.getElementById('btn-search').addEventListener('click', function() {
        const searchTerm = document.getElementById('search-address').value.toLowerCase();
        if (!searchTerm) return;

        const viviendas = getViviendas();
        const found = viviendas.find(v => v.direccion.toLowerCase().includes(searchTerm));

        if (found) {
            map.setView([found.lat, found.lng], 18);
            
            // Find and open the marker popup
            const marker = markers.find(m => {
                const pos = m.getLatLng();
                return Math.abs(pos.lat - found.lat) < 0.0001 && Math.abs(pos.lng - found.lng) < 0.0001;
            });
            
            if (marker) {
                marker.openPopup();
            }
        } else {
            alert('No se encontró ninguna vivienda con esa dirección');
        }
    });

    // Enter key support for search
    document.getElementById('search-address').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('btn-search').click();
        }
    });
}

function loadLegend() {
    const legendContainer = document.getElementById('legend-container');
    legendContainer.innerHTML = '';

    Object.entries(ESTADOS_VIVIENDA).forEach(([key, config]) => {
        const legendItem = document.createElement('li');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <div class="legend-color" style="background-color: ${config.color}"></div>
            <span>${config.nombre}</span>
        `;
        legendContainer.appendChild(legendItem);
    });
}

// Forms System
function initializeForms() {
    // Register property form
    document.getElementById('form-registrar-vivienda').addEventListener('submit', function(e) {
        e.preventDefault();
        registrarVivienda();
    });

    // Search property form
    document.getElementById('form-buscar-vivienda').addEventListener('submit', function(e) {
        e.preventDefault();
        registrarInteresado();
    });

    // Locate on map button
    document.getElementById('btn-ubicar-mapa').addEventListener('click', function() {
        if (currentTab !== 'mapa') {
            switchTab('mapa');
        }
        
        map.on('click', function(e) {
            document.getElementById('reg-lat').value = e.latlng.lat.toFixed(6);
            document.getElementById('reg-lng').value = e.latlng.lng.toFixed(6);
            
            // Add temporary marker
            const tempMarker = L.marker([e.latlng.lat, e.latlng.lng])
                .addTo(map)
                .bindPopup('Ubicación seleccionada')
                .openPopup();
                
            setTimeout(() => {
                map.removeLayer(tempMarker);
            }, 3000);
            
            map.off('click'); // Remove the click listener
            alert('Ubicación seleccionada. Puede volver al formulario.');
        });
        
        alert('Haga clic en el mapa para seleccionar la ubicación de la vivienda.');
    });

    // Search form changes trigger matches update
    ['buscar-estado', 'buscar-presupuesto', 'buscar-superficie-min'].forEach(id => {
        document.getElementById(id).addEventListener('change', updateMatches);
    });
}

function registrarVivienda() {
    const formData = {
        direccion: document.getElementById('reg-direccion').value,
        estado: document.getElementById('reg-estado').value,
        propietario: document.getElementById('reg-propietario').value,
        contacto: document.getElementById('reg-contacto').value,
        precio: document.getElementById('reg-precio').value,
        superficie: document.getElementById('reg-superficie').value,
        año: document.getElementById('reg-anio').value,
        descripcion: document.getElementById('reg-descripcion').value,
        lat: parseFloat(document.getElementById('reg-lat').value),
        lng: parseFloat(document.getElementById('reg-lng').value),
        tipo: 'vivienda'
    };

    // Validation
    if (!formData.direccion || !formData.estado || !formData.propietario || 
        isNaN(formData.lat) || isNaN(formData.lng)) {
        alert('Por favor, complete todos los campos obligatorios.');
        return;
    }

    const viviendas = getViviendas();
    const newId = Math.max(...viviendas.map(v => v.id), 0) + 1;
    
    const newVivienda = {
        id: newId,
        ...formData
    };

    viviendas.push(newVivienda);
    localStorage.setItem('viviendas', JSON.stringify(viviendas));

    // Reset form
    document.getElementById('form-registrar-vivienda').reset();
    
    // Update UI
    loadMapMarkers();
    
    alert('Vivienda registrada correctamente.');
}

function registrarInteresado() {
    const formData = {
        nombre: document.getElementById('buscar-nombre').value,
        contacto: document.getElementById('buscar-contacto').value,
        presupuesto: parseInt(document.getElementById('buscar-presupuesto').value) || null,
        estado_deseado: document.getElementById('buscar-estado').value,
        superficie_min: parseInt(document.getElementById('buscar-superficie-min').value) || null,
        comentarios: document.getElementById('buscar-comentarios').value,
        fecha_registro: new Date().toISOString()
    };

    // Validation
    if (!formData.nombre || !formData.contacto || !formData.estado_deseado) {
        alert('Por favor, complete todos los campos obligatorios.');
        return;
    }

    const interesados = getInteresados();
    const newId = Math.max(...interesados.map(i => i.id || 0), 0) + 1;
    
    const newInteresado = {
        id: newId,
        ...formData
    };

    interesados.push(newInteresado);
    localStorage.setItem('interesados', JSON.stringify(interesados));

    // Update matches
    updateMatches();
    
    alert('Su interés ha sido registrado correctamente. Revise las sugerencias de viviendas que aparecen abajo.');
}

function updateMatches() {
    const estadoDeseado = document.getElementById('buscar-estado').value;
    const presupuestoMax = parseInt(document.getElementById('buscar-presupuesto').value) || Infinity;
    const superficieMin = parseInt(document.getElementById('buscar-superficie-min').value) || 0;

    if (!estadoDeseado) {
        document.getElementById('matches-list').innerHTML = '<p class="no-matches">Complete el formulario para ver sugerencias de viviendas</p>';
        return;
    }

    const viviendas = getViviendas();
    const matches = viviendas.filter(vivienda => {
        // Filter by desired state
        if (estadoDeseado !== 'cualquiera' && vivienda.estado !== estadoDeseado) {
            return false;
        }

        // Filter by budget (if price is specified)
        if (vivienda.precio && presupuestoMax < Infinity) {
            const precio = parseInt(vivienda.precio.replace(/\D/g, ''));
            if (precio > presupuestoMax) {
                return false;
            }
        }

        // Filter by surface (if specified)
        if (vivienda.superficie && superficieMin > 0) {
            const superficie = parseInt(vivienda.superficie.replace(/\D/g, ''));
            if (superficie < superficieMin) {
                return false;
            }
        }

        return true;
    });

    const matchesContainer = document.getElementById('matches-list');
    
    if (matches.length === 0) {
        matchesContainer.innerHTML = '<p class="no-matches">No se encontraron viviendas que coincidan con sus criterios</p>';
        return;
    }

    matchesContainer.innerHTML = matches.map(vivienda => `
        <div class="match-card">
            <div class="match-estado estado-${vivienda.estado}">${ESTADOS_VIVIENDA[vivienda.estado].nombre}</div>
            <h4>${vivienda.direccion}</h4>
            <p><strong>Propietario:</strong> ${vivienda.propietario}</p>
            <p><strong>Superficie:</strong> ${vivienda.superficie || 'No especificada'}</p>
            ${vivienda.precio ? `<p><strong>Precio:</strong> ${vivienda.precio}</p>` : ''}
            <p>${vivienda.descripcion || 'Sin descripción'}</p>
            <button class="btn btn--primary btn--sm" onclick="mostrarDetalleVivienda(${vivienda.id})">Ver detalles</button>
        </div>
    `).join('');
}

// Admin System
function initializeAdmin() {
    // Login form
    document.getElementById('form-admin-login').addEventListener('submit', function(e) {
        e.preventDefault();
        const password = document.getElementById('admin-password').value;
        
        if (password === CONFIG.PASSWORD_ADMIN) {
            isAdminLoggedIn = true;
            document.getElementById('admin-login').style.display = 'none';
            document.getElementById('admin-panel').classList.remove('hidden');
            loadAdminData();
        } else {
            alert('Contraseña incorrecta');
        }
    });

    // Admin navigation
    document.querySelectorAll('[data-admin-tab]').forEach(btn => {
        btn.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-admin-tab');
            switchAdminTab(targetTab);
        });
    });

    // Admin buttons
    document.getElementById('btn-exportar-viviendas').addEventListener('click', () => exportarCSV('viviendas'));
    document.getElementById('btn-exportar-interesados').addEventListener('click', () => exportarCSV('interesados'));
    document.getElementById('btn-exportar-todo').addEventListener('click', () => exportarCSV('todo'));
    document.getElementById('btn-nueva-vivienda').addEventListener('click', () => abrirModalEditar());
    document.getElementById('btn-restablecer').addEventListener('click', restablecerDatos);
}

function switchAdminTab(tabName) {
    // Update navigation
    document.querySelectorAll('[data-admin-tab]').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-admin-tab="${tabName}"]`).classList.add('active');

    // Update content
    document.querySelectorAll('.admin-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`admin-${tabName}`).classList.add('active');

    // Load specific data
    if (tabName === 'estadisticas') {
        loadEstadisticas();
    }
}

function loadAdminData() {
    loadTablaViviendas();
    loadTablaInteresados();
    loadEstadisticas();
}

function loadTablaViviendas() {
    const viviendas = getViviendas();
    const tbody = document.querySelector('#tabla-viviendas tbody');
    
    tbody.innerHTML = viviendas.map(vivienda => `
        <tr>
            <td>${vivienda.id}</td>
            <td>${vivienda.direccion}</td>
            <td><span class="estado-badge estado-${vivienda.estado}">${ESTADOS_VIVIENDA[vivienda.estado].nombre}</span></td>
            <td>${vivienda.propietario}</td>
            <td>${vivienda.superficie || 'N/A'}</td>
            <td>
                <button class="btn btn--sm btn--secondary" onclick="abrirModalEditar(${vivienda.id})">Editar</button>
                <button class="btn btn--sm btn--danger" onclick="eliminarVivienda(${vivienda.id})">Eliminar</button>
            </td>
        </tr>
    `).join('');
}

function loadTablaInteresados() {
    const interesados = getInteresados();
    const tbody = document.querySelector('#tabla-interesados tbody');
    
    tbody.innerHTML = interesados.map(interesado => `
        <tr>
            <td>${interesado.id}</td>
            <td>${interesado.nombre}</td>
            <td>${interesado.contacto}</td>
            <td>${interesado.estado_deseado}</td>
            <td>${interesado.presupuesto ? '€' + interesado.presupuesto : 'N/A'}</td>
            <td>
                <button class="btn btn--sm btn--danger" onclick="eliminarInteresado(${interesado.id})">Eliminar</button>
            </td>
        </tr>
    `).join('');
}

function loadEstadisticas() {
    const viviendas = getViviendas();
    const interesados = getInteresados();

    // Update stats
    document.getElementById('stat-total-viviendas').textContent = viviendas.length;
    document.getElementById('stat-viviendas-vacias').textContent = viviendas.filter(v => v.estado === 'vacia').length;
    document.getElementById('stat-total-interesados').textContent = interesados.length;
    document.getElementById('stat-total-matches').textContent = calcularMatches();

    // Update chart
    updateChart();
}

function calcularMatches() {
    const viviendas = getViviendas();
    const interesados = getInteresados();
    
    let matches = 0;
    
    interesados.forEach(interesado => {
        const viviendasCompatibles = viviendas.filter(vivienda => {
            if (interesado.estado_deseado === 'cualquiera') return true;
            return vivienda.estado === interesado.estado_deseado;
        });
        matches += viviendasCompatibles.length;
    });
    
    return matches;
}

function updateChart() {
    const ctx = document.getElementById('chart-estados').getContext('2d');
    const viviendas = getViviendas();
    
    const estadosCount = {};
    Object.keys(ESTADOS_VIVIENDA).forEach(estado => {
        estadosCount[estado] = viviendas.filter(v => v.estado === estado).length;
    });

    const data = {
        labels: Object.values(ESTADOS_VIVIENDA).map(e => e.nombre),
        datasets: [{
            data: Object.values(estadosCount),
            backgroundColor: Object.values(ESTADOS_VIVIENDA).map(e => e.color),
            borderWidth: 2,
            borderColor: '#fff'
        }]
    };

    if (chart) {
        chart.destroy();
    }

    chart = new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Modal System
function initializeModals() {
    // Detail modal
    document.getElementById('btn-cerrar-modal').addEventListener('click', () => cerrarModal('modal-detalle'));
    document.getElementById('btn-cerrar').addEventListener('click', () => cerrarModal('modal-detalle'));

    // Edit modal
    document.getElementById('btn-cerrar-modal-editar').addEventListener('click', () => cerrarModal('modal-editar'));
    document.getElementById('btn-cancelar-editar').addEventListener('click', () => cerrarModal('modal-editar'));
    document.getElementById('btn-guardar-editar').addEventListener('click', guardarEdicionVivienda);
    document.getElementById('btn-eliminar').addEventListener('click', () => {
        const id = parseInt(document.getElementById('edit-id').value);
        mostrarConfirmacion('¿Está seguro que desea eliminar esta vivienda?', () => {
            eliminarVivienda(id);
            cerrarModal('modal-editar');
        });
    });

    // Confirmation modal
    document.getElementById('btn-cerrar-modal-confirmacion').addEventListener('click', () => cerrarModal('modal-confirmacion'));
    document.getElementById('btn-cancelar-confirmacion').addEventListener('click', () => cerrarModal('modal-confirmacion'));

    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                cerrarModal(this.id);
            }
        });
    });
}

function mostrarDetalleVivienda(id) {
    const vivienda = getViviendas().find(v => v.id === id);
    if (!vivienda) return;

    const modal = document.getElementById('modal-detalle');
    const modalBody = document.getElementById('modal-body');
    const modalTitulo = document.getElementById('modal-titulo');

    modalTitulo.textContent = vivienda.direccion;
    
    modalBody.innerHTML = `
        <div class="property-detail"><strong>Estado:</strong> ${ESTADOS_VIVIENDA[vivienda.estado].nombre}</div>
        <div class="property-detail"><strong>Propietario:</strong> ${vivienda.propietario}</div>
        <div class="property-detail"><strong>Superficie:</strong> ${vivienda.superficie || 'No especificada'}</div>
        <div class="property-detail"><strong>Año:</strong> ${vivienda.año || 'No especificado'}</div>
        ${vivienda.precio ? `<div class="property-detail"><strong>Precio:</strong> ${vivienda.precio}</div>` : ''}
        ${vivienda.descripcion ? `<div class="property-detail"><strong>Descripción:</strong> ${vivienda.descripcion}</div>` : ''}
        ${vivienda.contacto ? `
            <div class="contact-info">
                <h4>Información de contacto</h4>
                <p>${vivienda.contacto}</p>
            </div>
        ` : ''}
    `;

    abrirModal('modal-detalle');
}

function abrirModalEditar(id = null) {
    const modal = document.getElementById('modal-editar');
    const titulo = document.getElementById('modal-editar-titulo');
    
    if (id) {
        // Edit existing
        const vivienda = getViviendas().find(v => v.id === id);
        if (!vivienda) return;

        titulo.textContent = 'Editar Vivienda';
        
        // Fill form
        document.getElementById('edit-id').value = vivienda.id;
        document.getElementById('edit-direccion').value = vivienda.direccion;
        document.getElementById('edit-estado').value = vivienda.estado;
        document.getElementById('edit-propietario').value = vivienda.propietario;
        document.getElementById('edit-contacto').value = vivienda.contacto || '';
        document.getElementById('edit-precio').value = vivienda.precio || '';
        document.getElementById('edit-superficie').value = vivienda.superficie || '';
        document.getElementById('edit-anio').value = vivienda.año || '';
        document.getElementById('edit-tipo').value = vivienda.tipo || '';
        document.getElementById('edit-descripcion').value = vivienda.descripcion || '';
        document.getElementById('edit-lat').value = vivienda.lat;
        document.getElementById('edit-lng').value = vivienda.lng;
    } else {
        // New property
        titulo.textContent = 'Nueva Vivienda';
        
        // Clear form
        document.getElementById('form-editar-vivienda').reset();
        document.getElementById('edit-id').value = '';
        
        // Set default coordinates
        document.getElementById('edit-lat').value = CONFIG.CENTRO_MAPA[0];
        document.getElementById('edit-lng').value = CONFIG.CENTRO_MAPA[1];
    }

    abrirModal('modal-editar');
}

function guardarEdicionVivienda() {
    const id = document.getElementById('edit-id').value;
    const formData = {
        direccion: document.getElementById('edit-direccion').value,
        estado: document.getElementById('edit-estado').value,
        propietario: document.getElementById('edit-propietario').value,
        contacto: document.getElementById('edit-contacto').value,
        precio: document.getElementById('edit-precio').value,
        superficie: document.getElementById('edit-superficie').value,
        año: document.getElementById('edit-anio').value,
        tipo: document.getElementById('edit-tipo').value,
        descripcion: document.getElementById('edit-descripcion').value,
        lat: parseFloat(document.getElementById('edit-lat').value),
        lng: parseFloat(document.getElementById('edit-lng').value)
    };

    // Validation
    if (!formData.direccion || !formData.estado || !formData.propietario || 
        isNaN(formData.lat) || isNaN(formData.lng)) {
        alert('Por favor, complete todos los campos obligatorios.');
        return;
    }

    const viviendas = getViviendas();

    if (id) {
        // Edit existing
        const index = viviendas.findIndex(v => v.id === parseInt(id));
        if (index !== -1) {
            viviendas[index] = { ...viviendas[index], ...formData };
        }
    } else {
        // Add new
        const newId = Math.max(...viviendas.map(v => v.id), 0) + 1;
        viviendas.push({ id: newId, ...formData });
    }

    localStorage.setItem('viviendas', JSON.stringify(viviendas));
    
    // Update UI
    loadAdminData();
    loadMapMarkers();
    
    cerrarModal('modal-editar');
    alert('Vivienda guardada correctamente.');
}

function eliminarVivienda(id) {
    const viviendas = getViviendas();
    const filteredViviendas = viviendas.filter(v => v.id !== id);
    
    localStorage.setItem('viviendas', JSON.stringify(filteredViviendas));
    
    // Update UI
    loadAdminData();
    loadMapMarkers();
    
    alert('Vivienda eliminada correctamente.');
}

function eliminarInteresado(id) {
    const interesados = getInteresados();
    const filteredInteresados = interesados.filter(i => i.id !== id);
    
    localStorage.setItem('interesados', JSON.stringify(filteredInteresados));
    
    // Update UI
    loadAdminData();
    
    alert('Interesado eliminado correctamente.');
}

function abrirModal(modalId) {
    document.getElementById(modalId).classList.add('show');
    document.body.style.overflow = 'hidden';
}

function cerrarModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
    document.body.style.overflow = '';
}

function mostrarConfirmacion(mensaje, callback) {
    document.getElementById('modal-confirmacion-mensaje').textContent = mensaje;
    
    const btnConfirmar = document.getElementById('btn-confirmar');
    const newBtn = btnConfirmar.cloneNode(true);
    btnConfirmar.parentNode.replaceChild(newBtn, btnConfirmar);
    
    newBtn.addEventListener('click', function() {
        callback();
        cerrarModal('modal-confirmacion');
    });
    
    abrirModal('modal-confirmacion');
}

// Data Management
function getViviendas() {
    return JSON.parse(localStorage.getItem('viviendas') || '[]');
}

function getInteresados() {
    return JSON.parse(localStorage.getItem('interesados') || '[]');
}

function exportarCSV(tipo) {
    let data, filename, headers;

    if (tipo === 'viviendas') {
        data = getViviendas();
        filename = 'viviendas_aibar.csv';
        headers = ['ID', 'Dirección', 'Estado', 'Propietario', 'Contacto', 'Precio', 'Superficie', 'Año', 'Descripción', 'Latitud', 'Longitud'];
    } else if (tipo === 'interesados') {
        data = getInteresados();
        filename = 'interesados_aibar.csv';
        headers = ['ID', 'Nombre', 'Contacto', 'Estado Deseado', 'Presupuesto', 'Superficie Mín.', 'Comentarios', 'Fecha Registro'];
    } else if (tipo === 'todo') {
        const viviendas = getViviendas();
        const interesados = getInteresados();
        
        let csvContent = 'VIVIENDAS\n';
        csvContent += 'ID,Dirección,Estado,Propietario,Contacto,Precio,Superficie,Año,Descripción,Latitud,Longitud\n';
        viviendas.forEach(v => {
            csvContent += `${v.id},"${v.direccion}","${ESTADOS_VIVIENDA[v.estado].nombre}","${v.propietario}","${v.contacto || ''}","${v.precio || ''}","${v.superficie || ''}","${v.año || ''}","${v.descripcion || ''}",${v.lat},${v.lng}\n`;
        });
        
        csvContent += '\n\nINTERESADOS\n';
        csvContent += 'ID,Nombre,Contacto,Estado Deseado,Presupuesto,Superficie Mín.,Comentarios,Fecha Registro\n';
        interesados.forEach(i => {
            csvContent += `${i.id},"${i.nombre}","${i.contacto}","${i.estado_deseado}","${i.presupuesto || ''}","${i.superficie_min || ''}","${i.comentarios || ''}","${i.fecha_registro || ''}"\n`;
        });
        
        downloadCSV(csvContent, 'datos_completos_aibar.csv');
        return;
    }

    const csvContent = convertToCSV(data, headers);
    downloadCSV(csvContent, filename);
}

function convertToCSV(data, headers) {
    const csvRows = [];
    csvRows.push(headers.join(','));

    data.forEach(row => {
        const values = headers.map(header => {
            const key = header.toLowerCase().replace(/\s+/g, '_').replace(/\./g, '');
            let value = '';
            
            switch(key) {
                case 'id': value = row.id; break;
                case 'dirección': value = row.direccion; break;
                case 'estado': value = ESTADOS_VIVIENDA[row.estado]?.nombre || row.estado; break;
                case 'propietario': value = row.propietario; break;
                case 'contacto': value = row.contacto || ''; break;
                case 'precio': value = row.precio || ''; break;
                case 'superficie': value = row.superficie || ''; break;
                case 'año': value = row.año || ''; break;
                case 'descripción': value = row.descripcion || ''; break;
                case 'latitud': value = row.lat; break;
                case 'longitud': value = row.lng; break;
                case 'nombre': value = row.nombre; break;
                case 'estado_deseado': value = row.estado_deseado; break;
                case 'presupuesto': value = row.presupuesto || ''; break;
                case 'superficie_mín': value = row.superficie_min || ''; break;
                case 'comentarios': value = row.comentarios || ''; break;
                case 'fecha_registro': value = row.fecha_registro || ''; break;
                default: value = '';
            }
            
            return `"${value}"`;
        });
        csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
}

function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function restablecerDatos() {
    mostrarConfirmacion(
        '¿Está seguro que desea restablecer todos los datos? Esta acción no se puede deshacer.',
        function() {
            localStorage.setItem('viviendas', JSON.stringify(VIVIENDAS_INICIALES));
            localStorage.setItem('interesados', JSON.stringify([]));
            
            // Update UI
            loadAdminData();
            loadMapMarkers();
            
            alert('Datos restablecidos correctamente.');
        }
    );
}

function updateUI() {
    loadMapMarkers();
    if (isAdminLoggedIn) {
        loadAdminData();
    }
}