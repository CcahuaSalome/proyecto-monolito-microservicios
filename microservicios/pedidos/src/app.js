const express = require('express');
const pool = require('./db');

const app = express();

// Validar que el usuario y el producto existan
async function validarReferencias(usuarioId, productoId) {
    const [usuario, producto] = await Promise.all([
        fetch(`${process.env.USUARIOS_URL}/usuarios/${usuarioId}`),
        fetch(`${process.env.PRODUCTOS_URL}/productos/${productoId}`)
    ]);

    if (usuario.status === 404 || producto.status === 404) {
        return false;
    }

    if (!usuario.ok || !producto.ok) {
        throw new Error('Error al consultar Usuarios o Productos');
    }

    return true;
}

app.use(express.json());

// Verificar el estado del servicio
app.get('/health', (req, res) => {
    res.json({
        estado: 'ok',
        servicio: 'pedidos'
    });
});

// Consultar todos los pedidos
app.get('/pedidos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM pedidos');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Error al consultar pedidos'
        });
    }
});
// Crear un pedido validando usuario y producto
app.post('/pedidos', async (req, res) => {
    const { usuario_id, producto_id, cantidad } = req.body;

    if (
        !Number.isInteger(Number(usuario_id)) ||
        Number(usuario_id) <= 0 ||
        !Number.isInteger(Number(producto_id)) ||
        Number(producto_id) <= 0 ||
        !Number.isInteger(Number(cantidad)) ||
        Number(cantidad) <= 0
    ) {
        return res.status(400).json({
            error: 'Usuario, producto y cantidad válida son obligatorios'
        });
    }

    try {
        const referenciasValidas = await validarReferencias(
            usuario_id,
            producto_id
        );

        if (!referenciasValidas) {
            return res.status(400).json({
                error: 'El usuario o producto no existe'
            });
        }

        const result = await pool.query(
            `INSERT INTO pedidos (usuario_id, producto_id, cantidad)
             VALUES ($1, $2, $3) RETURNING *`,
            [usuario_id, producto_id, cantidad]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Error al crear pedido o validar referencias'
        });
    }
});

// Actualizar un pedido validando usuario y producto
app.put('/pedidos/:id', async (req, res) => {
    const { usuario_id, producto_id, cantidad } = req.body;

    if (
        !Number.isInteger(Number(usuario_id)) ||
        Number(usuario_id) <= 0 ||
        !Number.isInteger(Number(producto_id)) ||
        Number(producto_id) <= 0 ||
        !Number.isInteger(Number(cantidad)) ||
        Number(cantidad) <= 0
    ) {
        return res.status(400).json({
            error: 'Usuario, producto y cantidad válida son obligatorios'
        });
    }

    try {
        const referenciasValidas = await validarReferencias(
            usuario_id,
            producto_id
        );

        if (!referenciasValidas) {
            return res.status(400).json({
                error: 'El usuario o producto no existe'
            });
        }

        const result = await pool.query(
            `UPDATE pedidos
             SET usuario_id = $1, producto_id = $2, cantidad = $3
             WHERE id = $4 RETURNING *`,
            [usuario_id, producto_id, cantidad, req.params.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                error: 'Pedido no encontrado'
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Error al actualizar pedido o validar referencias'
        });
    }
});

// Eliminar un pedido
app.delete('/pedidos/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM pedidos WHERE id = $1 RETURNING *',
            [req.params.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                error: 'Pedido no encontrado'
            });
        }

        res.json({
            mensaje: 'Pedido eliminado',
            pedido: result.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar pedido' });
    }
});

module.exports = app;
