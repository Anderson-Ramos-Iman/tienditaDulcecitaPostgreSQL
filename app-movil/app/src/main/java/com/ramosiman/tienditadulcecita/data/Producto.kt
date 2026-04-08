package com.ramosiman.tienditadulcecita.data

import androidx.compose.runtime.Immutable
import com.google.gson.annotations.SerializedName

@Immutable
data class Categoria(
    val id: Int,
    val nombre: String,
    val icono: String?
)

@Immutable
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

@Immutable
data class ApiResponse<T>(
    val success: Boolean,
    val data: T
)
