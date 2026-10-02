
const express = require("express")
const router = express.Router()
const fs = require("fs")
const path = require("path")

const dataPath = path.join(__dirname, "../data/data.json")//ruta de datos

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

//genera codigo de 1000 a 9999 .floor los hace numeros enteros | RES-1000
const generarCodigoReserva = () => {
    return "RES-" + Math.floor(1000 + Math.random() * 9000)
}

