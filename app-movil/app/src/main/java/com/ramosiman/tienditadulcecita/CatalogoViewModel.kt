package com.ramosiman.tienditadulcecita

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
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

    val searchQuery = MutableStateFlow("")
    val soloConStock = MutableStateFlow(false)

    init { cargarProductos() }

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

    fun productosFiltrados(productos: List<Producto>): List<Producto> {
        val q = searchQuery.value.trim().lowercase()
        return productos
            .filter { if (soloConStock.value) it.stock > 0 else true }
            .filter { if (q.isNotEmpty()) it.nombre.lowercase().contains(q) else true }
    }
}
