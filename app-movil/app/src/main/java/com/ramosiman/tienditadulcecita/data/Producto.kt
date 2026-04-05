package com.ramosiman.tienditadulcecita.data

import com.google.gson.annotations.SerializedName

data class Categoria(
    val id: Int,
    val nombre: String,
    val icono: String?
)

data class Producto(
    val id: Int,
    val nombre: String,
    @SerializedName("precio_base") val precioBase: Double,
    val stock: Int,
    @SerializedName("imagen_url") val imagenUrl: String?,
    @SerializedName("tipo_venta") val tipoVenta: String,
    val activo: Int,
    val categorias: List<Categoria> = emptyList()
)

data class ApiResponse<T>(
    val success: Boolean,
    val data: T
)
