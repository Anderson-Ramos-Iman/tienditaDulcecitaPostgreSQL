package com.ramosiman.tienditadulcecita

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ramosiman.tienditadulcecita.data.Categoria
import com.ramosiman.tienditadulcecita.data.Producto
import com.ramosiman.tienditadulcecita.data.RetrofitClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class CatalogoUiState {
    object Loading : CatalogoUiState()
    data class Success(val productos: List<Producto>) : CatalogoUiState()
    data class Error(val message: String) : CatalogoUiState()
}

class CatalogoViewModel : ViewModel() {

    private val _uiState = MutableStateFlow<CatalogoUiState>(CatalogoUiState.Loading)
    val uiState: StateFlow<CatalogoUiState> = _uiState

    val searchQuery       = MutableStateFlow("")
    val soloConStock      = MutableStateFlow(false)
    val categorias        = MutableStateFlow<List<Categoria>>(emptyList())
    val activeCategoriaId = MutableStateFlow<Int?>(null)
    val currentPage       = MutableStateFlow(1)

    // 2 columns × 3 rows
    val pageSize = 6

    init {
        cargarProductos()
        cargarCategorias()
    }

    fun cargarProductos() {
        viewModelScope.launch {
            _uiState.value = CatalogoUiState.Loading
            try {
                val response = RetrofitClient.apiService.getProductos()
                val activos = response.data.filter { it.activo != 0 }
                _uiState.value = CatalogoUiState.Success(activos)
            } catch (e: Exception) {
                _uiState.value = CatalogoUiState.Error(e.message ?: "Error al conectar con el servidor")
            }
        }
    }

    fun cargarCategorias() {
        viewModelScope.launch {
            try {
                val response = RetrofitClient.apiService.getCategorias()
                categorias.value = response.data
            } catch (e: Exception) { /* silent */ }
        }
    }

    fun productosFiltrados(productos: List<Producto>): List<Producto> {
        val q     = searchQuery.value.trim().lowercase()
        val catId = activeCategoriaId.value
        return productos
            .filter { if (soloConStock.value) it.stock > 0 else true }
            .filter { if (q.isNotEmpty()) it.nombre.lowercase().contains(q) else true }
            .filter { if (catId != null) it.categorias.any { c -> c.id == catId } else true }
    }

    fun productosPagina(productos: List<Producto>): List<Producto> {
        val filtered = productosFiltrados(productos)
        val p = currentPage.value
        return filtered.drop((p - 1) * pageSize).take(pageSize)
    }

    fun totalPaginas(productos: List<Producto>): Int =
        maxOf(1, (productosFiltrados(productos).size + pageSize - 1) / pageSize)

    fun seleccionarCategoria(id: Int?) {
        activeCategoriaId.value = id
        currentPage.value = 1
    }

    fun irAPagina(page: Int) {
        currentPage.value = page
    }
}
