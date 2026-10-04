const API_RESERVAS = "/api/reservas";
const form = document.querySelector("#reservation-form");
const reservationsList = document.querySelector("#reservations-list");
const messageBox = document.querySelector("#message");
const showAllCheckbox = document.querySelector("#show-all");
const submitButton = document.querySelector("#submit-button");
const reservationsCount = document.querySelector("#reservations-count");
const fieldNames = ["nombre", "telefono", "fecha", "hora", "personas", "mesa"];
let messageTimeout;

document.addEventListener("DOMContentLoaded", () => {
	form.addEventListener("submit", crearReserva);
	form.addEventListener("reset", () => requestAnimationFrame(limpiarFormulario));
	showAllCheckbox.addEventListener("change", cargarReservas);
	cargarReservas();
});

// Carga las reservas activas o todas, según el filtro seleccionado.
async function cargarReservas() {
	reservationsList.replaceChildren(crearFilaVacia("Cargando reservas..."));
	reservationsCount.textContent = "";

	try {
		const query = showAllCheckbox.checked ? "?todas=true" : "";
		const response = await fetch(`${API_RESERVAS}${query}`);
		const data = await response.json();

		if (!response.ok || data.exito !== true) {
			throw new Error(data.error || data.mensaje || "No se pudieron cargar las reservas.");
		}

		renderizarReservas(Array.isArray(data.reservas) ? data.reservas : []);
	} catch (error) {
		reservationsList.replaceChildren(crearFilaVacia("No se pudieron cargar las reservas."));
		mostrarMensaje(error.message || "No fue posible conectar con el servidor.", "error");
	}
}

// Comprueba los campos del formulario y presenta errores junto a cada entrada.
function validarFormulario() {
	const valores = Object.fromEntries(new FormData(form).entries());
	const errores = {};
	const nombre = valores.nombre.trim();

	if (!nombre) {
		errores.nombre = "El nombre es obligatorio.";
	} else if (nombre.length < 3) {
		errores.nombre = "Escribe al menos 3 caracteres.";
	} else if (!/^[\p{L}\s]+$/u.test(nombre)) {
		errores.nombre = "Usa solo letras y espacios.";
	}

	if (!valores.telefono) {
		errores.telefono = "El teléfono es obligatorio.";
	} else if (!/^\d{7,15}$/.test(valores.telefono)) {
		errores.telefono = "Escribe entre 7 y 15 dígitos.";
	}

	const hoy = new Date();
	const fechaMinima = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
	if (!valores.fecha) {
		errores.fecha = "La fecha es obligatoria.";
	} else if (valores.fecha < fechaMinima) {
		errores.fecha = "La fecha no puede ser pasada.";
	}

	if (!valores.hora) {
		errores.hora = "La hora es obligatoria.";
	}

	for (const campo of ["personas", "mesa"]) {
		if (!valores[campo]) {
			errores[campo] = campo === "personas" ? "Indica el número de personas." : "Indica el número de mesa.";
		} else if (!/^\d+$/.test(valores[campo]) || Number(valores[campo]) <= 0) {
			errores[campo] = "Debe ser un número entero mayor que 0.";
		}
	}

	fieldNames.forEach((campo) => {
		const input = form.elements[campo];
		const errorElement = document.querySelector(`#${campo}-error`);
		input.setAttribute("aria-invalid", String(Boolean(errores[campo])));
		errorElement.textContent = errores[campo] || "";
	});

	return Object.keys(errores).length === 0;
}

// Envía una reserva nueva; el servidor genera el código automáticamente.
async function crearReserva(event) {
	event.preventDefault();
	if (!validarFormulario()) {
		const primerError = form.querySelector('[aria-invalid="true"]');
		primerError?.focus();
		return;
	}

	const reserva = Object.fromEntries(new FormData(form).entries());
	reserva.personas = Number(reserva.personas);
	reserva.mesa = Number(reserva.mesa);

	submitButton.disabled = true;
	submitButton.textContent = "Enviando...";

	try {
		const response = await fetch(API_RESERVAS, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(reserva)
		});
		const data = await response.json();

		if (!response.ok || data.exito !== true) {
			throw new Error(data.error || data.mensaje || "No se pudo crear la reserva.");
		}

		mostrarMensaje(data.mensaje || "Reserva realizada correctamente.", "success");
		form.reset();
		await cargarReservas();
	} catch (error) {
		mostrarMensaje(error.message || "No fue posible conectar con el servidor.", "error");
	} finally {
		submitButton.disabled = false;
		submitButton.textContent = "Reservar";
	}
}

// Cancela una reserva usando el código que reconoce la API.
async function cancelarReserva(codigo) {
	const button = [...document.querySelectorAll(".cancel-button")]
		.find((item) => item.dataset.codigo === codigo);
	if (button) button.disabled = true;

	try {
		const response = await fetch(`${API_RESERVAS}/${encodeURIComponent(codigo)}`, { method: "DELETE" });
		const data = await response.json();

		if (!response.ok || data.exito !== true) {
			throw new Error(data.error || data.mensaje || "No se pudo cancelar la reserva.");
		}

		mostrarMensaje(data.mensaje || "La reserva ha sido cancelada.", "success");
		await cargarReservas();
	} catch (error) {
		if (button) button.disabled = false;
		mostrarMensaje(error.message || "No fue posible conectar con el servidor.", "error");
	}
}

// Renderiza los datos con nodos de texto para evitar insertar HTML de la API.
function renderizarReservas(reservas) {
	reservationsList.replaceChildren();
	reservationsCount.textContent = `${reservas.length} ${reservas.length === 1 ? "reserva" : "reservas"}`;

	if (reservas.length === 0) {
		reservationsList.append(crearFilaVacia("No hay reservas para mostrar."));
		return;
	}

	reservas.forEach((reserva) => {
		const row = document.createElement("tr");
		const values = [
			reserva.codigo,
			reserva.nombre,
			reserva.telefono,
			reserva.fecha,
			reserva.hora,
			reserva.personas,
			reserva.mesa
		];

		values.forEach((value) => {
			const cell = document.createElement("td");
			cell.textContent = value ?? "-";
			row.append(cell);
		});

		const statusCell = document.createElement("td");
		const status = document.createElement("span");
		status.className = `status${reserva.estado === "Cancelada" ? " status-cancelled" : ""}`;
		status.textContent = reserva.estado || "-";
		statusCell.append(status);
		row.append(statusCell);

		const actionCell = document.createElement("td");
		if (reserva.estado !== "Cancelada") {
			const cancelButton = document.createElement("button");
			cancelButton.type = "button";
			cancelButton.className = "cancel-button";
			cancelButton.textContent = "Cancelar";
			cancelButton.dataset.codigo = reserva.codigo;
			cancelButton.addEventListener("click", () => cancelarReserva(reserva.codigo));
			actionCell.append(cancelButton);
		}
		row.append(actionCell);
		reservationsList.append(row);
	});
}

function crearFilaVacia(texto) {
	const row = document.createElement("tr");
	const cell = document.createElement("td");
	cell.className = "table-empty";
	cell.colSpan = 9;
	cell.textContent = texto;
	row.append(cell);
	return row;
}

// Muestra mensajes temporales de respuesta o de conexión.
function mostrarMensaje(texto, tipo) {
	clearTimeout(messageTimeout);
	messageBox.textContent = texto;
	messageBox.className = `message message-${tipo}`;
	messageBox.hidden = false;
	messageTimeout = setTimeout(() => {
		messageBox.hidden = true;
		messageBox.textContent = "";
	}, 5000);
}

function limpiarFormulario() {
	fieldNames.forEach((campo) => {
		form.elements[campo].removeAttribute("aria-invalid");
		document.querySelector(`#${campo}-error`).textContent = "";
	});
}
