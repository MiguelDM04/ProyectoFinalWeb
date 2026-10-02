const express = require("express")
const path = require("path")
const apiRoutes = require("./routes/api")

const app = express()
const port = process.env.port || 3000

app.use(express.json())

app.use(express.static(path.join(__dirname, "../frontend")))

app.use("/api", apiRoutes)

app.use((req, res) => {
    res.status(404).json({
        exito: false,
        error: "Ruta no encontrada"
    })
})

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`)
})