
const express = require("express")
const router = express.Router()
const fs = require("fs")
const path = require("path")

//Ruta datos guardados
const dataPath = path.join(__dirname, "../data/data.json")//ruta de datos

//funciones
const leerReservas = () => {
    try {
        const data = fs.readFileSync(dataPath, "utf8")
        return JSON.parse(data)
    } catch (error) {
        console.error("Error lectura reservas")
        return []
    }
}

const guardarReservas = (reservas) => {
    fs.writeFileSync(dataPath, JSON.stringify(reservas, null, 2), "utf8")
}

//genera codigo unico de 1000 a 9999 | RES-1000
const generarCodigoReserva = (reservasExistentes) => {
    let codigo
    let existe = true

    while(existe) {
        codigo = "RES-" + Math.floor(1000 + Math.random() * 9000)
        existe = reservasExistentes.some(reserva => reserva.codigo == codigo)
    }

    return codigo 
}

//Rutas
//Lee las reservas
router.get("/reservas", (req, res) =>{
    try {
    const reservas = leerReservas()

    const mostrarTodas = req.query.todas === "true"

    const resultado = mostrarTodas
        ? reservas
        : reservas.filter(reserva => reserva.estado !== "Cancelada")

        res.status(200).json({
            exito: true,
            total: resultado.length,
            reservas: resultado
        })
    } catch (error) {
        res.status(500).json({
            exito: false,
            error: "Error obteniendo reservas"
        })
    }
})

//Crea las reservas
router.post("/reservas", (req, res) =>{
    const {codigo, nombre, telefono, fecha, hora, personas, mesa} = req.body

    //Valida que no falten campos
    if (!nombre || !telefono || !fecha || !hora || !personas ||!mesa) {
        return res.status(400).json({
            exito: false,
            error: "Todos los campos son obligatorios para la reserva"
        })
    }

    
    const numPersonas = parseInt(personas)
    const numMesa = parseInt(mesa)

    //Valida que personas y num mesa sea mayor a 0
    if (isNaN(numPersonas) || numPersonas <= 0){
        return res.status(400).json({
            exito: false,
            error: "El numero de personas debe ser un numero entero mayor a 0"
        })
    }

    if (isNaN(numMesa) || numMesa <= 0) {
        return res.status(400).json({
            exito: false,
            error: "El numero de mesa debe ser valido"
        })
    }

    const reservas = leerReservas()
    let codigoFinal = codigo

    if (codigoFinal) {
        const codigoExiste = reservas.some(res => res.codigo == codigoFinal)
        if (codigoExiste) {
            return res.status(400).json({
                exito: false,
                error: "El codigo de reserva ya existe"
            })
        }

    } else {
        codigoFinal = generarCodigoReserva(reservas)
    }

    const nuevaReserva = {
        id: Date.now(),
        codigo: codigoFinal,
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        fecha: fecha,
        hora: hora,
        personas: numPersonas,
        mesa: numMesa,
        estado: "Confirmada"
    }

    reservas.push(nuevaReserva)
    guardarReservas(reservas)

    res.status(201).json({
        exito: true,
        mensaje: "Reserva realizada correctamente",
        confirmacion: nuevaReserva
    })
})

router.delete("/reservas/:id", (req, res) => {
    const { id } = req.params
    const reservas = leerReservas()

    //Buscar indice por ID o Codigo
    const index = reservas.findIndex(r => r.id == id || r.codigo.toUpperCase() === id.toUpperCase())

    if (index === -1){
        return res.status(404).json({
            exito: false,
            error: "No se encontro ninguna reserva activa con el id/codigo"
        })
    }
    
    if (reservas[index].estado === "Cancelada"){
        return res.status(400).json({
            exito: false,
            error: "La reserva ya esta cancelada"
        })
    }

    reservas[index].estado = "Cancelada"
    reservas[index].fechaCancelacion = new Date().toISOString()

    guardarReservas(reservas)
    
    res.status(200).json({
        exito: true,
        mensaje: "La reserva ha sido cancelada correctamente",
        reserva: reservas[index]
    })
    
})

module.exports = router //se exporta para que server.js lo pueda usar