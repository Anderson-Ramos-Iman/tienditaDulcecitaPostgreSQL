package com.ramosiman.tienditadulcecita.data

import retrofit2.http.GET

interface ApiService {
    @GET("productos")
    suspend fun getProductos(): ApiResponse<List<Producto>>

    @GET("categorias")
    suspend fun getCategorias(): ApiResponse<List<Categoria>>
}
